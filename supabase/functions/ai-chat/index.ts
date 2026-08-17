/**
 * Supabase Edge Function — AI Chat Proxy
 *
 * Menyembunyikan API key Kimi/Moonshot di server-side.
 * Deploy:
 *   supabase functions deploy ai-chat --no-verify-jwt  (atau dengan JWT + cek auth)
 *
 * Secrets:
 *   supabase secrets set KIMI_API_KEY=***
 *   supabase secrets set AI_MODEL=kimi-k3            (opsional, default kimi-k3)
 *   supabase secrets set ENABLE_WEB_SEARCH=true      (opsional, default true)
 *   supabase secrets set ALLOWED_ORIGINS=https://matriks-rouge.vercel.app   (opsional, comma-separated)
 *
 * Frontend: set REACT_APP_AI_PROXY_URL=https://YOUR_PROJECT.supabase.co/functions/v1/ai-chat
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- Config ----------
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REQUIRE_JWT = Deno.env.get("REQUIRE_JWT") !== "false"; // default: wajib auth
const ENABLE_WEB_SEARCH = Deno.env.get("ENABLE_WEB_SEARCH") !== "false"; // default: aktif
const MAX_TOOL_ROUNDS = 4; // batas loop tool-calling agar tidak infinite loop / biaya membengkak
const MAX_MESSAGES = 24;
const MAX_TOKENS = 40000; // estimasi kasar; di bawah limit model 256K

// ---------- Helpers ----------
const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(String(text).length / 3.5);
};

// Estimasi token untuk konten pesan (bisa string atau array part, mis. gambar).
const contentTokens = (content) => {
  if (typeof content === "string") return estimateTokens(content);
  if (Array.isArray(content)) {
    return content.reduce((sum, part) => {
      if (typeof part?.text === "string") return sum + estimateTokens(part.text);
      if (part?.type === "image_url") {
        // Base64 gambar tidak dihitung penuh; beri bobot kasar per gambar.
        return sum + 1000;
      }
      return sum;
    }, 0);
  }
  return 0;
};

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

// ---------- Rate limiting (in-memory, per-user) ----------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20; // max 20 request/menit per user
const rateBuckets = new Map(); // key -> { count, resetAt }

const rateLimit = (key) => {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || b.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Lazy cleanup: hapus bucket kadaluarsa sesekali agar tidak bocor memori.
    if (rateBuckets.size > 1000) {
      for (const [k, v] of rateBuckets) {
        if (v.resetAt <= now) rateBuckets.delete(k);
      }
    }
    return true;
  }
  if (b.count >= RATE_MAX) return false;
  b.count++;
  return true;
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  // ---------- CORS ----------
  const corsHeaders = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
      corsHeaders["Vary"] = "Origin";
    } else {
      corsHeaders["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
    }
  } else {
    corsHeaders["Access-Control-Allow-Origin"] = "*";
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ---------- Auth (JWT) ----------
  if (REQUIRE_JWT) {
    const auth = req.headers.get("authorization") || "";
    const apikey = req.headers.get("apikey") || "";
    if (!auth.startsWith("Bearer ") || !apikey) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }
    const token = auth.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !supabaseAnon) {
      return json({ error: "Server auth not configured" }, 500, corsHeaders);
    }
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }
    // Rate limit per user (proteksi billing dari abuse).
    if (!rateLimit(user.id)) {
      return json({ error: "Rate limit exceeded" }, 429, corsHeaders);
    }
  } else {
    // Tanpa JWT (mode dev) — rate limit per IP sebagai proteksi dasar.
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(ip)) {
      return json({ error: "Rate limit exceeded" }, 429, corsHeaders);
    }
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const apiKey = Deno.env.get("KIMI_API_KEY") || "";
  if (!apiKey) {
    return json({ error: "KIMI_API_KEY secret not configured" }, 500, corsHeaders);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const model = (body.model as string) || Deno.env.get("AI_MODEL") || "kimi-k3";
  const messages = body.messages;
  const stream = body.stream !== false;

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages required" }, 400, corsHeaders);
  }

  // ---------- Token-aware truncation ----------
  // Selalu pertahankan pesan terakhir (pesan user terbaru). Sisanya dipangkas
  // dari belakang berdasarkan estimasi token agar tidak overflow konteks.
  const last = messages[messages.length - 1];
  const rest = messages.slice(0, -1);
  let acc = contentTokens(last?.content);
  const kept = [last];
  for (let i = rest.length - 1; i >= 0; i--) {
    const m = rest[i];
    const t = contentTokens(m?.content);
    if (acc + t > MAX_TOKENS || kept.length >= MAX_MESSAGES) break;
    kept.unshift(m);
    acc += t;
  }

  // kimi-k3 hanya mengizinkan temperature = 1 (fixed). Mengirim nilai lain
  // (atau temperature sama sekali) → error 400 "invalid temperature".
  // Catatan: ada laporan bug di kimi-k3 pada langkah echo tool-result untuk
  // $web_search ("tokenization failed" / HTTP 400), sedangkan kimi-k2.6 normal.
  // Model dibaca dari env var AI_MODEL supaya gampang di-switch tanpa ubah code
  // kalau bug itu muncul (mis. set AI_MODEL=kimi-k2.6).
  const isKimiK3 = model === "kimi-k3" || model.startsWith("kimi-k3");

  // Helper untuk memanggil Moonshot API (non-stream maupun stream).
  const callMoonshot = (msgs, tools, useStream) => {
    const payload: Record<string, unknown> = {
      model,
      messages: msgs,
      stream: useStream,
    };
    if (!isKimiK3) {
      payload.temperature =
        typeof body.temperature === "number" ? body.temperature : 0.6;
    }
    if (tools) {
      payload.tools = tools;
    }
    return fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  };

  // ---------- Alur web search (2 fase) ----------
  if (ENABLE_WEB_SEARCH) {
    const tools = [
      { type: "builtin_function", function: { name: "$web_search" } },
    ];
    const working = kept.slice(); // salinan pesan yang bisa dimutasi untuk relay tool-call

    // Fase 1 — resolve tool-call (non-stream).
    // Kimi mengeksekusi $web_search di server mereka; kita hanya relay hasil
    // arguments sebagai role:"tool" dan memanggil ulang sampai tidak ada
    // tool_calls lagi, atau mencapai MAX_TOOL_ROUNDS.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await callMoonshot(working, tools, false);
      if (!res.ok) {
        const errText = await res.text();
        return json(
          {
            error: "Upstream AI error",
            status: res.status,
            detail: errText.slice(0, 500),
          },
          res.status,
          corsHeaders
        );
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const reason = data.choices?.[0]?.finish_reason;

      if (
        reason === "tool_calls" &&
        Array.isArray(msg?.tool_calls) &&
        msg.tool_calls.length > 0
      ) {
        // Relay: echo balik tool-call sebagai pesan assistant + pesan tool.
        working.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: msg.tool_calls,
        });
        for (const tc of msg.tool_calls) {
          working.push({
            role: "tool",
            content: tc.function?.arguments ?? "",
            tool_call_id: tc.id,
          });
        }
        continue;
      }

      // Tidak ada tool_calls lagi → resolve selesai.
      break;
    }

    // Fase 2 — stream jawaban final ke client (seperti implementasi lama,
    // tanpa tools agar model langsung menjawab dari hasil tool-result yang
    // sudah di-relay di atas).
    const finalRes = await callMoonshot(working, null, true);
    if (!finalRes.ok) {
      const errText = await finalRes.text();
      return json(
        {
          error: "Upstream AI error",
          status: finalRes.status,
          detail: errText.slice(0, 500),
        },
        finalRes.status,
        corsHeaders
      );
    }

    return new Response(finalRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ---------- Tanpa web search (perilaku lama) ----------
  const payload: Record<string, unknown> = {
    model,
    messages: kept,
    stream,
  };
  if (!isKimiK3) {
    payload.temperature =
      typeof body.temperature === "number" ? body.temperature : 0.6;
  }

  const upstream = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return json(
      {
        error: "Upstream AI error",
        status: upstream.status,
        detail: errText.slice(0, 500),
      },
      upstream.status,
      corsHeaders
    );
  }

  // Stream proxy
  if (stream && upstream.body) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const data = await upstream.json();
  return json(data, 200, corsHeaders);
});
