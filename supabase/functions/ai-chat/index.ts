/**
 * Supabase Edge Function — AI Chat Proxy
 *
 * Menyembunyikan API key Kimi/Moonshot di server-side.
 * Deploy:
 *   supabase functions deploy ai-chat --no-verify-jwt  (atau dengan JWT + cek auth)
 *
 * Secrets:
 *   supabase secrets set KIMI_API_KEY=sk-...
 *   supabase secrets set AI_MODEL=kimi-k3   (opsional)
 *
 * Frontend: set REACT_APP_AI_PROXY_URL=https://YOUR_PROJECT.supabase.co/functions/v1/ai-chat
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("KIMI_API_KEY") || "";
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "KIMI_API_KEY secret not configured" }),
      {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  }

  // Optional: require Authorization header (Supabase JWT)
  // const auth = req.headers.get("Authorization");
  // if (!auth) return new Response("Unauthorized", { status: 401, headers: CORS });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const model =
    (body.model as string) || Deno.env.get("AI_MODEL") || "kimi-k3";
  const messages = body.messages;
  const stream = body.stream !== false;
  const temperature =
    typeof body.temperature === "number" ? body.temperature : 0.6;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Hard limit history size
  const safeMessages = messages.slice(-24);

  const upstream = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: safeMessages,
      stream,
      temperature,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(
      JSON.stringify({
        error: "Upstream AI error",
        status: upstream.status,
        detail: errText.slice(0, 500),
      }),
      {
        status: upstream.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  }

  // Stream proxy
  if (stream && upstream.body) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
