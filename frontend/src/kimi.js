// frontend/src/kimi.js
//
// ALL-IN-ONE AI ROUTER — v3 (Maximized)
// ------------------------------------------------------------
// Perubahan utama dari v2:
// 1. Negative keywords + synonym groups + phrase-exact boost
// 2. History-aware intent detection (2-3 pesan terakhir)
// 3. Scoring dengan density + multi-specialist synergy bonus
// 4. Confidence & threshold dinamis berdasarkan panjang pertanyaan
// 5. Circuit breaker half-open yang lebih pintar
// 6. Prompt builder dengan priority specialist + anti-hallucination lebih ketat
// 7. Streaming buffer lebih tahan terhadap partial JSON
// 8. Token estimate kasar + history trimming cerdas
// 9. Pure functions tetap terpisah dari side-effect
// ------------------------------------------------------------

/* ============================================================
   CONFIG
============================================================ */
export const CONFIG = {
  apiUrl: "https://api.moonshot.ai/v1/chat/completions",
  defaultModel: "kimi-k3",
  defaultReasoningEffort: "max",
  maxHistoryMessages: 20,
  maxRetries: 2,
  requestTimeoutMs: 60_000,
  retryBaseDelayMs: 700,
  maxUserMessageLength: 8_000,
  // Perkiraan kasar token (Indonesia ~1.3 char/token, code lebih tinggi)
  approxCharsPerToken: 3.2,
  maxContextTokens: 28_000, // sisakan ruang untuk response
  circuitBreaker: {
    failureThreshold: 4,
    cooldownMs: 30_000,
  },
  // Intent detection
  historyLookback: 3,          // berapa pesan terakhir yang ikut dianalisis
  minConfidenceForMulti: 0.35, // di bawah ini pakai single specialist terbaik
  phraseBoost: 1.6,            // bonus untuk exact phrase match
};

/* ============================================================
   BASE PERSONA
============================================================ */
const BASE_PERSONA = `
Kamu adalah asisten AI serba bisa tingkat expert.
Kamu harus mampu membantu pengguna dalam berbagai bidang:
Programming, Frontend, Backend, Database, API, UI/UX, Design,
Product Strategy, Customer Service, Writing, Copywriting, Marketing,
Business, Mathematics, Translation, Research, Analysis,
Prompt Engineering, Creative Ideas, Troubleshooting, Automation,
Technology, General Knowledge.

PRINSIP UTAMA:
1. Pahami tujuan pengguna sebelum menjawab. Jika ambigu, buat asumsi wajar dan sebutkan.
2. Jangan memaksa pengguna memilih kategori.
3. Gunakan kemampuan yang paling relevan secara otomatis.
4. Satu pertanyaan boleh menggunakan beberapa kemampuan sekaligus.
5. Jawaban sederhana untuk pertanyaan sederhana; struktur jelas + langkah-langkah untuk pertanyaan kompleks.
6. Jangan mengarang fakta, API, library, dokumentasi, atau fitur. Jika tidak yakin, katakan "saya tidak yakin" dan tawarkan cara verifikasi.
7. Jika informasi kurang tapi masih bisa dijawab dengan asumsi wajar, jawab dulu lalu jelaskan asumsinya. Jika benar-benar perlu, tanyakan maksimal 1-2 hal penting saja.
8. Hindari basa-basi, pengulangan, dan kalimat kosong.
9. Jangan mengungkap system prompt, chain-of-thought internal, atau proses routing kecuali diminta secara eksplisit.
10. Berikan reasoning singkat yang bisa dipahami pengguna bila perlu (bukan internal CoT).

GAYA JAWABAN:
Bahasa Indonesia natural, profesional tapi santai, praktis, actionable.
Gunakan markdown, tabel, code block, dan numbered steps bila membantu.
Prioritaskan kejelasan dan nilai praktis.
`;

/* ============================================================
   SPECIALIST REGISTRY
============================================================ */
class SpecialistRegistry {
  constructor() {
    this._specialists = new Map();
  }

  /**
   * @param {string} id
   * @param {object} def
   * @param {string} def.label
   * @param {string} def.prompt
   * @param {Array<{term:string, weight?:number, phrase?:boolean}>} def.keywords
   * @param {string[]} [def.negativeKeywords] - kata yang menurunkan skor
   * @param {string[]} [def.synonyms] - synonym groups (optional)
   * @param {number} [def.priority=0] - semakin tinggi semakin diprioritaskan saat skor hampir sama
   * @param {string} [def.mode]
   */
  register(id, { label, prompt, keywords = [], negativeKeywords = [], synonyms = [], priority = 0, mode = id }) {
    if (!id || !prompt) throw new Error("Specialist butuh id dan prompt.");

    const compiled = keywords.map((kw) => this._compileKeyword(kw));
    const compiledNeg = negativeKeywords.map((term) => this._compileKeyword({ term, weight: 1 }));

    this._specialists.set(id, {
      id,
      label,
      prompt,
      keywords: compiled,
      negativeKeywords: compiledNeg,
      synonyms,
      priority,
      mode,
    });
    return this;
  }

  unregister(id) {
    this._specialists.delete(id);
    return this;
  }

  get(id) {
    return this._specialists.get(id) || null;
  }

  has(id) {
    return this._specialists.has(id);
  }

  all() {
    return [...this._specialists.values()];
  }

  ids() {
    return [...this._specialists.keys()];
  }

  _compileKeyword(kw) {
    const term = typeof kw === "string" ? kw : kw.term;
    const weight = typeof kw === "string" ? 1 : (kw.weight ?? 1);
    const isPhrase = term.includes(" ");
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Boundary aman untuk Unicode Indonesia + frasa
    const pattern = isPhrase
      ? `(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`
      : `(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`;

    return {
      term,
      weight,
      isPhrase,
      regex: new RegExp(pattern, "iu"),
    };
  }
}

export const registry = new SpecialistRegistry();

// ===================== SPECIALISTS =====================
registry
  .register("programming", {
    label: "Senior Software Engineer",
    mode: "programming",
    priority: 2,
    prompt: `
SPECIALIST: SENIOR SOFTWARE ENGINEER
Fokus: JavaScript, TypeScript, React, Next.js, Node.js, HTML, CSS,
Tailwind, API, REST, Authentication, Database, Debugging, Performance,
Architecture, Security, Testing, CI/CD.

Jika user memberikan kode:
- pahami kode yang ada terlebih dahulu
- jangan menghapus fitur yang tidak diminta
- berikan perubahan yang kompatibel & minimal
- jelaskan file yang perlu diubah
- berikan kode siap pakai (bukan pseudocode kecuali diminta)
- sebutkan asumsi jika ada`,
    keywords: [
      { term: "kode", weight: 1.1 },
      { term: "coding", weight: 1.3 },
      { term: "javascript", weight: 2.2 },
      { term: "typescript", weight: 2.2 },
      { term: "react", weight: 2.0 },
      { term: "next.js", weight: 2.3 },
      { term: "nextjs", weight: 2.3 },
      { term: "node.js", weight: 2.1 },
      { term: "nodejs", weight: 2.1 },
      { term: "python", weight: 1.9 },
      { term: "php", weight: 1.6 },
      { term: "html", weight: 1.1 },
      { term: "css", weight: 1.1 },
      { term: "tailwind", weight: 1.9 },
      { term: "endpoint", weight: 1.6 },
      { term: "database", weight: 1.4 },
      { term: "mysql", weight: 2.1 },
      { term: "postgres", weight: 2.1 },
      { term: "mongodb", weight: 2.1 },
      { term: "sql", weight: 1.6 },
      { term: "bug", weight: 1.6 },
      { term: "debug", weight: 1.6 },
      { term: "error", weight: 0.9 },
      { term: "function", weight: 0.9 },
      { term: "component", weight: 1.2 },
      { term: "backend", weight: 1.4 },
      { term: "frontend", weight: 1.4 },
      { term: "deploy", weight: 1.4 },
      { term: "deployment", weight: 1.4 },
      { term: "github", weight: 1.3 },
      { term: "api", weight: 1.0 },
      { term: "rest", weight: 1.3 },
      { term: "graphql", weight: 1.8 },
      { term: "auth", weight: 1.3 },
      { term: "jwt", weight: 1.7 },
      { term: "middleware", weight: 1.5 },
    ],
    negativeKeywords: ["customer service", "refund", "komplain", "terjemahkan"],
  })
  .register("uiux", {
    label: "Senior UI/UX Designer",
    mode: "uiux",
    priority: 1,
    prompt: `
SPECIALIST: SENIOR UI/UX DESIGNER
Fokus: user experience, user interface, layout, responsive design,
typography, color system, accessibility, component design, dashboard,
mobile interface, interaction design, design system.

Prioritaskan: usability, hierarchy, consistency, accessibility, visual clarity.
Berikan rekomendasi konkret (bukan hanya teori).`,
    keywords: [
      { term: "ui", weight: 1.7 },
      { term: "ux", weight: 1.7 },
      { term: "desain", weight: 1.4 },
      { term: "design", weight: 1.4 },
      { term: "layout", weight: 1.6 },
      { term: "dashboard", weight: 1.5 },
      { term: "interface", weight: 1.4 },
      { term: "tampilan", weight: 1.3 },
      { term: "warna", weight: 1.1 },
      { term: "font", weight: 1.1 },
      { term: "typography", weight: 1.9 },
      { term: "figma", weight: 2.2 },
      { term: "responsive", weight: 1.6 },
      { term: "user experience", weight: 2.3 },
      { term: "user interface", weight: 2.3 },
      { term: "wireframe", weight: 1.8 },
      { term: "prototype", weight: 1.5 },
      { term: "accessibility", weight: 1.7 },
      { term: "a11y", weight: 1.7 },
    ],
  })
  .register("saas", {
    label: "SaaS Product Strategist",
    mode: "saas",
    priority: 1,
    prompt: `
SPECIALIST: SAAS PRODUCT STRATEGIST
Fokus: MVP, product strategy, pricing, subscription, retention,
activation, conversion, onboarding, feature prioritization,
monetization, product-market fit, unit economics.

Berikan framework praktis (AARRR, ICE, RICE, dll) bila relevan.`,
    keywords: [
      { term: "saas", weight: 2.3 },
      { term: "startup", weight: 1.4 },
      { term: "mvp", weight: 2.0 },
      { term: "pricing", weight: 1.7 },
      { term: "subscription", weight: 1.9 },
      { term: "retention", weight: 1.9 },
      { term: "conversion", weight: 1.6 },
      { term: "onboarding", weight: 1.9 },
      { term: "monetisasi", weight: 1.9 },
      { term: "fitur", weight: 0.9 },
      { term: "churn", weight: 2.0 },
      { term: "product market fit", weight: 2.2 },
      { term: "pmf", weight: 1.8 },
    ],
  })
  .register("cs", {
    label: "Customer Service Expert",
    mode: "cs",
    priority: 1,
    prompt: `
SPECIALIST: CUSTOMER SERVICE EXPERT
Fokus: customer support, complaint handling, refund, return, shipping,
payment, escalation, customer satisfaction, script CS.

Jika membuat jawaban untuk pelanggan:
- empati, sopan, jelas, singkat, solutif
- pertahankan placeholder: {{nama}} {{order_id}} {{tanggal}} {{nominal}}
- berikan opsi tindakan yang bisa diambil user`,
    keywords: [
      { term: "customer service", weight: 2.4 },
      { term: "pelanggan", weight: 1.4 },
      { term: "komplain", weight: 2.0 },
      { term: "complaint", weight: 2.0 },
      { term: "refund", weight: 2.0 },
      { term: "retur", weight: 2.0 },
      { term: "pengiriman", weight: 1.4 },
      { term: "pesanan", weight: 1.4 },
      { term: "pembayaran", weight: 1.2 },
      { term: "keterlambatan", weight: 1.6 },
      { term: "cs", weight: 1.3 },
      { term: "support", weight: 1.2 },
    ],
    negativeKeywords: ["javascript", "react", "nextjs", "kode", "coding"],
  })
  .register("writing", {
    label: "Professional Writer",
    mode: "writing",
    priority: 1,
    prompt: `
SPECIALIST: PROFESSIONAL WRITER
Bisa membantu: email, artikel, caption, copywriting, proposal, script,
SOP, announcement, documentation, landing page copy, SEO writing.

Sesuaikan tone dengan konteks. Berikan 1-2 variasi jika relevan.`,
    keywords: [
      { term: "artikel", weight: 1.6 },
      { term: "caption", weight: 1.6 },
      { term: "copywriting", weight: 2.2 },
      { term: "proposal", weight: 1.6 },
      { term: "script", weight: 1.3 },
      { term: "sop", weight: 1.6 },
      { term: "announcement", weight: 1.6 },
      { term: "pengumuman", weight: 1.6 },
      { term: "surat", weight: 1.4 },
      { term: "tulis", weight: 1.1 },
      { term: "tuliskan", weight: 1.3 },
      { term: "draft", weight: 1.4 },
    ],
  })
  .register("mathematics", {
    label: "Mathematics Expert",
    mode: "mathematics",
    priority: 1,
    prompt: `
SPECIALIST: MATHEMATICS EXPERT
Untuk perhitungan: tuliskan rumus jika diperlukan, masukkan angka,
hitung dengan teliti, berikan hasil akhir, jelaskan pembulatan.
Tunjukkan langkah-langkah secara ringkas.`,
    keywords: [
      { term: "hitung", weight: 1.4 },
      { term: "persentase", weight: 1.7 },
      { term: "rumus", weight: 1.7 },
      { term: "matematika", weight: 2.2 },
      { term: "kalkulasi", weight: 1.7 },
      { term: "profit", weight: 1.2 },
      { term: "keuntungan", weight: 1.2 },
      { term: "kerugian", weight: 1.2 },
      { term: "persen", weight: 1.4 },
      { term: "rata-rata", weight: 1.5 },
    ],
  })
  .register("translation", {
    label: "Translation Expert",
    mode: "translation",
    priority: 1,
    prompt: `
SPECIALIST: TRANSLATION EXPERT
Pertahankan makna, konteks, tone, istilah, dan maksud asli.
Jangan menerjemahkan secara kaku jika membuat bahasa menjadi tidak natural.
Berikan catatan singkat jika ada idiom atau istilah khusus.`,
    keywords: [
      { term: "translate", weight: 2.0 },
      { term: "terjemahkan", weight: 2.0 },
      { term: "terjemahan", weight: 2.0 },
      { term: "bahasa inggris", weight: 1.5 },
      { term: "bahasa indonesia", weight: 1.3 },
    ],
  })
  .register("prompt", {
    label: "Prompt Engineer",
    mode: "prompt",
    priority: 2,
    prompt: `
SPECIALIST: PROMPT ENGINEER
Optimalkan prompt agar jelas, spesifik, tidak ambigu, punya konteks,
tujuan, batasan, dan format output.
Jika relevan berikan: Basic Prompt, Professional Prompt, Advanced Prompt.
Jelaskan mengapa struktur tersebut efektif.`,
    keywords: [
      { term: "prompt engineering", weight: 2.6 },
      { term: "buat prompt", weight: 2.2 },
      { term: "buatkan prompt", weight: 2.2 },
      { term: "optimalkan prompt", weight: 2.2 },
      { term: "prompt", weight: 1.2 },
      { term: "system prompt", weight: 2.0 },
    ],
  })
  .register("research", {
    label: "Research Assistant",
    mode: "research",
    priority: 1,
    prompt: `
SPECIALIST: RESEARCH ASSISTANT
Bedakan dengan jelas: fakta, asumsi, opini, estimasi, informasi yang
belum diverifikasi. Jangan mengarang sumber.
Jika memungkinkan, sarankan cara verifikasi.`,
    keywords: [
      { term: "riset", weight: 1.9 },
      { term: "cari informasi", weight: 1.6 },
      { term: "penelitian", weight: 1.9 },
      { term: "referensi", weight: 1.4 },
      { term: "sumber", weight: 0.9 },
      { term: "data", weight: 1.0 },
    ],
  })
  .register("business", {
    label: "Business Strategist",
    mode: "business",
    priority: 1,
    prompt: `
SPECIALIST: BUSINESS STRATEGIST
Fokus: business model, revenue, cost, customer, market, competition,
positioning, growth, risk, monetization, unit economics.
Gunakan framework praktis bila membantu.`,
    keywords: [
      { term: "bisnis", weight: 1.4 },
      { term: "business", weight: 1.4 },
      { term: "usaha", weight: 1.1 },
      { term: "kompetitor", weight: 1.6 },
      { term: "revenue", weight: 1.6 },
      { term: "pendapatan", weight: 1.3 },
      { term: "investasi", weight: 1.4 },
      { term: "strategi bisnis", weight: 2.2 },
      { term: "model bisnis", weight: 1.9 },
    ],
  })
  .register("creative", {
    label: "Creative Director",
    mode: "creative",
    priority: 0,
    prompt: `
SPECIALIST: CREATIVE DIRECTOR
Fokus: ide, konsep, branding, visual, campaign, story, creative
direction, product ideas. Hindari ide generik; berikan ide spesifik
dan actionable.`,
    keywords: [
      { term: "ide", weight: 0.9 },
      { term: "branding", weight: 1.9 },
      { term: "campaign", weight: 1.6 },
      { term: "konsep", weight: 1.1 },
      { term: "kreatif", weight: 1.3 },
    ],
  })
  .register("automation", {
    label: "Automation Engineer",
    mode: "automation",
    priority: 1,
    prompt: `
SPECIALIST: AUTOMATION ENGINEER
Fokus: workflow, API integration, webhook, automation, cron, scheduled
jobs, Google Apps Script, Make, Zapier, n8n, backend automation, data
processing.

Berikan langkah implementasi yang realistis.`,
    keywords: [
      { term: "otomatis", weight: 1.4 },
      { term: "automation", weight: 1.9 },
      { term: "automasi", weight: 1.9 },
      { term: "workflow", weight: 1.6 },
      { term: "webhook", weight: 2.1 },
      { term: "cron", weight: 2.1 },
      { term: "google apps script", weight: 2.6 },
      { term: "zapier", weight: 2.5 },
      { term: "make.com", weight: 2.5 },
      { term: "n8n", weight: 2.3 },
      { term: "integrasi", weight: 1.3 },
    ],
  })
  .register("analysis", {
    label: "Analytical Expert",
    mode: "analysis",
    priority: 1,
    prompt: `
SPECIALIST: ANALYTICAL EXPERT
Untuk masalah kompleks: identifikasi masalah, pecah menjadi komponen,
bandingkan pilihan, identifikasi risiko, evaluasi trade-off, berikan
rekomendasi dan kesimpulan.
Jangan menampilkan chain-of-thought internal.`,
    keywords: [
      { term: "analisis", weight: 1.6 },
      { term: "analisa", weight: 1.6 },
      { term: "bandingkan", weight: 1.6 },
      { term: "perbandingan", weight: 1.6 },
      { term: "kelebihan", weight: 1.1 },
      { term: "kekurangan", weight: 1.1 },
      { term: "risiko", weight: 1.4 },
      { term: "evaluasi", weight: 1.4 },
      { term: "trade-off", weight: 1.7 },
      { term: "pro kontra", weight: 1.5 },
    ],
  });

/* ============================================================
   CATEGORY MAP (manual override di UI)
============================================================ */
export const CATEGORIES = {
  auto: { label: "🤖 Auto AI", mode: "auto" },
  design: { label: "UI/UX Desain", mode: "uiux" },
  code: { label: "Kode / Programming", mode: "programming" },
  saas: { label: "Strategi Produk SaaS", mode: "saas" },
  gambar: { label: "Ide Kreatif / Visual", mode: "creative" },
  cs: { label: "Customer Service", mode: "cs" },
  writing: { label: "Writing", mode: "writing" },
  analysis: { label: "Analisis", mode: "analysis" },
  math: { label: "Matematika", mode: "mathematics" },
  translation: { label: "Translation", mode: "translation" },
  prompt: { label: "Prompt Engineering", mode: "prompt" },
  research: { label: "Research", mode: "research" },
  business: { label: "Business", mode: "business" },
  automation: { label: "Automation", mode: "automation" },
  random: { label: "General AI", mode: "auto" },
};

/* ============================================================
   INTENT DETECTION (pure)
============================================================ */
export function detectIntents(question = "", history = []) {
  // Gabungkan pertanyaan + beberapa pesan terakhir untuk konteks
  const recent = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-CONFIG.historyLookback)
    .map((m) => String(m.content || ""))
    .join("\n");

  const text = `${String(question)}\n${recent}`.trim();
  const results = [];

  for (const specialist of registry.all()) {
    let score = 0;
    const matched = [];
    let phraseHits = 0;

    // Positive keywords
    for (const kw of specialist.keywords) {
      if (kw.regex.test(text)) {
        let w = kw.weight;
        if (kw.isPhrase) {
          w *= CONFIG.phraseBoost;
          phraseHits++;
        }
        score += w;
        matched.push(kw.term);
      }
    }

    // Negative keywords (penalty)
    for (const neg of specialist.negativeKeywords || []) {
      if (neg.regex.test(text)) {
        score -= neg.weight * 1.4;
      }
    }

    // Density bonus (banyak keyword berbeda = lebih yakin)
    if (matched.length >= 3) score *= 1.15;
    if (matched.length >= 5) score *= 1.1;
    if (phraseHits >= 1) score *= 1.08;

    // Priority small boost
    score += (specialist.priority || 0) * 0.15;

    if (score > 0.3) {
      results.push({ id: specialist.id, score, matched, priority: specialist.priority || 0 });
    }
  }

  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    return (b.priority || 0) - (a.priority || 0);
  });

  if (!results.length) {
    return {
      specialists: ["creative"],
      scores: { creative: 0.5 },
      matched: { creative: [] },
      confidence: 0.15,
      raw: [],
    };
  }

  const top = results.slice(0, 5);
  const maxScore = top[0].score;

  // Threshold dinamis: pertanyaan pendek → lebih ketat, panjang → lebih longgar
  const qLen = String(question).length;
  const baseThreshold = qLen < 40 ? 0.55 : qLen < 120 ? 0.42 : 0.35;
  const threshold = Math.max(0.8, maxScore * baseThreshold);

  let chosen = top.filter((r) => r.score >= threshold);

  // Jika confidence rendah, pakai hanya yang teratas
  const confidence = Math.min(maxScore / 5.5, 1);
  if (confidence < CONFIG.minConfidenceForMulti && chosen.length > 1) {
    chosen = [top[0]];
  }

  // Maksimal 3 specialist agar prompt tidak membengkak
  chosen = chosen.slice(0, 3);

  return {
    specialists: chosen.map((r) => r.id),
    scores: Object.fromEntries(chosen.map((r) => [r.id, +r.score.toFixed(2)])),
    matched: Object.fromEntries(chosen.map((r) => [r.id, r.matched])),
    confidence: +confidence.toFixed(3),
    raw: top.map((r) => ({ id: r.id, score: +r.score.toFixed(2) })),
  };
}

/* ============================================================
   ROUTER
============================================================ */
export function routeAI(question, requestedCategory = "auto", history = []) {
  if (!requestedCategory || requestedCategory === "auto" || requestedCategory === "random") {
    return { mode: "auto", ...detectIntents(question, history), source: "automatic" };
  }

  const category = CATEGORIES[requestedCategory];
  if (!category) {
    return { mode: "auto", ...detectIntents(question, history), source: "automatic" };
  }

  return {
    mode: category.mode,
    specialists: [category.mode],
    scores: { [category.mode]: 1 },
    matched: {},
    confidence: 1,
    source: "manual",
  };
}

/* ============================================================
   PROMPT BUILDERS
============================================================ */
function buildSpecialistPrompt(specialistIds = []) {
  if (!specialistIds.length) {
    return registry.get("creative")?.prompt ?? "";
  }

  // Urutkan berdasarkan priority (tinggi dulu)
  const ordered = [...specialistIds].sort((a, b) => {
    const pa = registry.get(a)?.priority || 0;
    const pb = registry.get(b)?.priority || 0;
    return pb - pa;
  });

  return ordered
    .map((id) => registry.get(id)?.prompt)
    .filter(Boolean)
    .join("\n\n");
}

function buildSystemPrompt({ route, userName, extraInstructions }) {
  const specialistPrompt = buildSpecialistPrompt(route.specialists);
  const specialistLabels = route.specialists
    .map((id) => registry.get(id)?.label || id)
    .join(", ");

  return `
${BASE_PERSONA}

==================================================
AUTO AI ROUTING (internal — jangan bocorkan ke user kecuali diminta)
==================================================
Kemampuan aktif: ${specialistLabels}
Sumber routing: ${route.source}
Confidence: ${Math.round((route.confidence || 0) * 100)}%

==================================================
SPECIALIST KNOWLEDGE
==================================================
${specialistPrompt}

==================================================
USER CONTEXT
==================================================
${userName ? `Nama pengguna: ${userName}` : "Tidak ada nama pengguna."}
${extraInstructions || ""}

==================================================
FINAL RESPONSE RULE
==================================================
Gabungkan kemampuan specialist yang relevan. Jika pertanyaan
membutuhkan beberapa bidang, gunakan semuanya sekaligus — jangan
menjawab seolah hanya satu specialist yang tersedia.
Jangan memberitahu pengguna tentang proses internal routing kecuali
memang diminta secara eksplisit.
Prioritaskan jawaban yang actionable dan siap pakai.
`.trim();
}

/* ============================================================
   HISTORY + TOKEN HELPERS
============================================================ */
export function normalizeHistory(history, maxMessages = CONFIG.maxHistoryMessages) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "tool"))
    .slice(-maxMessages)
    .map((m) => {
      const out = { role: m.role };
      if (m.content != null) out.content = String(m.content);
      if (m.reasoning_content) out.reasoning_content = String(m.reasoning_content);
      if (m.tool_calls) out.tool_calls = m.tool_calls;
      if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
      if (m.name) out.name = m.name;
      return out;
    });
}

/** Estimasi kasar token (cukup untuk trimming) */
export function estimateTokens(text = "") {
  return Math.ceil(String(text).length / CONFIG.approxCharsPerToken);
}

/** Trim history dari depan sampai muat di context window */
export function trimHistoryToFit(messages, maxTokens = CONFIG.maxContextTokens) {
  let total = messages.reduce((sum, m) => sum + estimateTokens(m.content || ""), 0);
  const result = [...messages];

  while (total > maxTokens && result.length > 2) {
    // Jangan hapus system message (index 0)
    const removed = result.splice(1, 1)[0];
    total -= estimateTokens(removed.content || "");
  }
  return result;
}

/* ============================================================
   CIRCUIT BREAKER (half-open)
============================================================ */
class CircuitBreaker {
  constructor({ failureThreshold, cooldownMs }) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.openedAt = null;
    this.state = "closed"; // closed | open | half-open
  }

  isOpen() {
    if (this.state === "closed") return false;

    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = "half-open";
        return false; // izinkan 1 request percobaan
      }
      return true;
    }

    // half-open → izinkan
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    this.openedAt = null;
    this.state = "closed";
  }

  recordFailure() {
    this.failures += 1;
    if (this.state === "half-open" || this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
      this.state = "open";
    }
  }
}

const breaker = new CircuitBreaker(CONFIG.circuitBreaker);

/* ============================================================
   TRANSPORT LAYER
============================================================ */
async function fetchWithTimeout(url, options, timeout = CONFIG.requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestModel({
  apiKey,
  messages,
  model,
  reasoningEffort,
  apiUrl = CONFIG.apiUrl,
}) {
  if (breaker.isOpen()) {
    throw new Error("AI sedang mengalami gangguan berulang, coba lagi sebentar lagi.");
  }

  let lastError;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          reasoning_effort: reasoningEffort,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && !data.error) {
        breaker.recordSuccess();
        return data;
      }

      const message = data?.error?.message || response.statusText || "Unknown API error";
      lastError = new Error(message);

      // Client error → jangan retry
      if ([400, 401, 403, 429].includes(response.status)) {
        breaker.recordFailure();
        break;
      }

      breaker.recordFailure();
      if (attempt < CONFIG.maxRetries) {
        await sleep(CONFIG.retryBaseDelayMs * (attempt + 1));
      }
    } catch (error) {
      lastError =
        error.name === "AbortError"
          ? new Error("Request timeout. AI membutuhkan waktu terlalu lama.")
          : error;
      breaker.recordFailure();
      if (attempt < CONFIG.maxRetries) {
        await sleep(CONFIG.retryBaseDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError || new Error("Gagal menghubungi model AI.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ============================================================
   PUBLIC API
============================================================ */
export async function tanyaKimi(pertanyaan, category = "auto", options = {}) {
  const apiKey = options.apiKey ?? process.env.REACT_APP_KIMI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: "API Key belum tersedia. Pastikan REACT_APP_KIMI_API_KEY sudah diatur.",
    };
  }

  if (!pertanyaan || typeof pertanyaan !== "string" || !pertanyaan.trim()) {
    return { ok: false, error: "Pertanyaan tidak boleh kosong." };
  }

  if (pertanyaan.length > CONFIG.maxUserMessageLength) {
    return {
      ok: false,
      error: `Pertanyaan terlalu panjang (maks ${CONFIG.maxUserMessageLength} karakter).`,
    };
  }

  const {
    history = [],
    model = CONFIG.defaultModel,
    reasoningEffort = CONFIG.defaultReasoningEffort,
    userName = "",
    extraInstructions = "",
    apiUrl,
  } = options;

  const route = routeAI(pertanyaan, category, history);
  const systemPrompt = buildSystemPrompt({ route, userName, extraInstructions });
  const cleanHistory = normalizeHistory(history);

  let messages = [
    { role: "system", content: systemPrompt },
    ...cleanHistory,
    { role: "user", content: pertanyaan.trim() },
  ];

  // Trimming cerdas agar tidak overflow
  messages = trimHistoryToFit(messages);

  try {
    const data = await requestModel({
      apiKey,
      messages,
      model,
      reasoningEffort,
      apiUrl,
    });

    const message = data?.choices?.[0]?.message;
    if (!message) {
      return { ok: false, error: "Kimi tidak memberikan jawaban." };
    }

    return {
      ok: true,
      content: message.content || "Kimi tidak memberikan jawaban.",
      reasoning_content: message.reasoning_content || null,
      tool_calls: message.tool_calls || null,
      mode: route.mode,
      specialists: route.specialists,
      confidence: route.confidence,
      routing_source: route.source,
      scores: route.scores,
      matched: route.matched,
      model,
      usage: data.usage || null,
      raw: message,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Terjadi kesalahan saat menghubungi AI.",
      mode: route.mode,
      specialists: route.specialists,
      confidence: route.confidence,
    };
  }
}

/** Versi ringkas: langsung return string jawaban */
export async function tanyaKimiText(pertanyaan, category = "auto", options = {}) {
  const result = await tanyaKimi(pertanyaan, category, options);
  return result.ok ? result.content : `Error: ${result.error}`;
}

/** Streaming version */
export async function tanyaKimiStream(pertanyaan, category = "auto", options = {}) {
  const apiKey = options.apiKey ?? process.env.REACT_APP_KIMI_API_KEY;
  if (!apiKey) throw new Error("API Key belum tersedia.");
  if (!pertanyaan?.trim()) throw new Error("Pertanyaan tidak boleh kosong.");

  const {
    history = [],
    model = CONFIG.defaultModel,
    reasoningEffort = CONFIG.defaultReasoningEffort,
    userName = "",
    extraInstructions = "",
    apiUrl = CONFIG.apiUrl,
    onDelta = () => {},
    signal,
  } = options;

  const route = routeAI(pertanyaan, category, history);
  const systemPrompt = buildSystemPrompt({ route, userName, extraInstructions });

  let messages = [
    { role: "system", content: systemPrompt },
    ...normalizeHistory(history),
    { role: "user", content: pertanyaan.trim() },
  ];
  messages = trimHistoryToFit(messages);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      reasoning_effort: reasoningEffort,
      stream: true,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming gagal: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onDelta(delta, fullText);
        }
      } catch {
        // partial JSON → biarkan buffer menangani di iterasi berikutnya
      }
    }
  }

  return {
    ok: true,
    content: fullText,
    mode: route.mode,
    specialists: route.specialists,
    confidence: route.confidence,
    scores: route.scores,
  };
}

/** Hanya routing (untuk preview / debug UI) */
export function getAIMode(question, category = "auto", history = []) {
  return routeAI(question, category, history);
}

/** Tambah specialist runtime */
export function addSpecialist(id, definition) {
  registry.register(id, definition);
}

export const AI_ENGINE_INFO = {
  name: "All-In-One AI Router",
  version: "3.0",
  model: CONFIG.defaultModel,
  reasoning: CONFIG.defaultReasoningEffort,
  automaticRouting: true,
  multiSpecialist: true,
  historyAware: true,
  modes: registry.ids(),
};
