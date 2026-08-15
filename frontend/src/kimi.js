// frontend/src/kimi.js
//
// Asisten Kimi (Moonshot API) untuk Bank Jawaban CS
// - Multi-turn (riwayat percakapan dikirim ke API)
// - reasoning_effort: "max" (mendekati mode premium Kimi.ai)
// - System prompt lebih kuat + spesialisasi per kategori

/* ------------------------------------------------------------------ */
/* Kategori & system prompt */
/* ------------------------------------------------------------------ */

const BASE_PERSONA = `Kamu adalah Kimi, asisten AI yang cerdas, ramah, dan sangat praktis.
Jawab dalam Bahasa Indonesia yang jelas, natural, dan mudah dipraktekkan.
- Utamakan jawaban yang actionable (bisa langsung dipakai).
- Jika soal rumit, pikirkan langkah demi langkah secara ringkas, lalu berikan kesimpulan yang tegas.
- Jika informasi kurang, tanyakan 1–2 hal penting saja.
- Hindari basa-basi berlebih dan pengulangan.
- Jika diminta kode, berikan kode yang siap pakai dan jelaskan singkat kenapa.
- Jika diminta jawaban CS/chat pelanggan, utamakan nada empati, sopan, dan solutif.`;

export const CATEGORIES = {
design: {
label: "UI/UX Desain",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: UI/UX Designer untuk produk SaaS.
Fokus pada kejelasan, konsistensi, dan kemudahan pakai.
Jika relevan, sertakan contoh Tailwind/CSS singkat dan kode hex warna.`,
},
code: {
label: "Kode Frontend",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: Senior Frontend Developer (React).
Berikan contoh kode React/JavaScript yang benar, ringkas, dan siap tempel.
Jelaskan alasan teknis secara singkat.`,
},
saas: {
label: "Strategi Produk SaaS",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: SaaS Product Strategist.
Fokus pada saran praktis untuk produk kecil–menengah: onboarding, pricing, retensi, positioning, dan prioritas fitur.`,
},
gambar: {
label: "Ide Gambar/Ilustrasi",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: Art Director untuk produk SaaS.
Kamu TIDAK membuat gambar langsung.
Berikan deskripsi visual yang jelas + 1 prompt bahasa Inggris (satu baris) siap tempel ke Midjourney/DALL·E.`,
},
cs: {
label: "Jawaban CS",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: Spesialis Customer Service.
Tugasmu menulis / memperbaiki jawaban untuk pelanggan.
Utamakan empati, kejelasan, dan solusi.
Jika cocok, siapkan versi singkat yang siap copy-paste.
Hormati placeholder seperti {{nama}}, {{order_id}}, dll — jangan dihapus kecuali diminta.`,
},
random: {
label: "Ide Acak",
systemPrompt:
BASE_PERSONA +
`\n\nPeran tambahan: asisten kreatif untuk developer/solo founder.
Berikan sudut pandang segar, konkret, dan bisa dicoba hari ini.`,
},
};

/* ------------------------------------------------------------------ */
/* Bank pertanyaan random */
/* ------------------------------------------------------------------ */

const RANDOM_QUESTIONS = {
design: [
"Saran layout dashboard yang tidak terasa ramai untuk user non-teknis?",
"Palette warna modern untuk SaaS B2B yang terasa percaya diri tapi tidak kaku?",
"Cara membuat empty state yang mendorong user melakukan aksi pertama?",
"Contoh hierarki tipografi yang rapi untuk halaman pengaturan?",
"Ide micro-interaction kecil yang terasa premium tanpa mengganggu?",
],
code: [
"Pola state management sederhana di React untuk form multi-step?",
"Cara menampilkan loading skeleton yang tidak bikin layout loncat?",
"Contoh komponen SearchInput yang reusable dan accessible?",
"Best practice menyimpan draft form ke localStorage tanpa ribet?",
"Cara rapi handle error API di UI agar user tidak bingung?",
],
saas: [
"Metrik apa yang paling penting dipantau di 30 hari pertama setelah launch?",
"Ide onboarding 3 langkah agar user langsung merasakan value?",
"Strategi pricing sederhana untuk produk vault/template jawaban CS?",
"Cara meningkatkan retensi user yang hanya datang saat ada komplain?",
"Fitur 'quick win' murah dibangun tapi berdampak ke retensi?",
],
gambar: [
"Ide ilustrasi hero untuk landing page bank jawaban CS?",
"Ide ikon set minimalis: chat, template, favorit, pengaturan?",
"Ide empty state visual untuk 'belum ada jawaban tersimpan'?",
"Mood visual untuk SaaS yang menyasar tim customer support?",
"Prompt gambar untuk background lembut halaman login SaaS?",
],
cs: [
"Tulis balasan empati untuk pelanggan yang paketnya terlambat 3 hari.",
"Buat jawaban singkat untuk pertanyaan cara cek status pengiriman.",
"Perbaiki jawaban CS ini agar lebih sopan dan solutif: 'Barang sedang diproses.'",
"Buat template refund dengan placeholder {{nama}} dan {{order_id}}.",
"Versi lebih singkat dari jawaban komplain kualitas barang.",
],
random: [
"Kalau produk ini adalah sebuah kota, kota seperti apa dan kenapa?",
"Satu fitur 'nyeleneh' yang bisa jadi pembeda dari kompetitor?",
"Kalau harus menjelaskan produk ini ke anak SD, bagaimana caranya?",
"Codename catchy untuk rilis fitur besar berikutnya?",
"Kebiasaan kecil developer solo yang bisa menghemat banyak waktu?",
],
};

export const getRandomQuestion = (category = "random") => {
const list = RANDOM_QUESTIONS[category] || RANDOM_QUESTIONS.random;
return list[Math.floor(Math.random() * list.length)];
};

/* ------------------------------------------------------------------ */
/* Pemanggil utama */
/* ------------------------------------------------------------------ */

/**
* tanyaKimi
*
* @param {string} pertanyaan - pesan user terbaru
* @param {string} [category="cs"] - key dari CATEGORIES
* @param {object} [options]
* @param {Array<{role: string, content: string}>} [options.history] - riwayat sebelumnya (tanpa pesan terbaru)
* @param {string} [options.model="kimi-k3"]
* @param {string} [options.reasoning_effort="max"] - "low" | "high" | "max"
* @returns {Promise<string>}
*/
export async function tanyaKimi(pertanyaan, category = "cs", options = {}) {
const apiKey = process.env.REACT_APP_KIMI_API_KEY;

if (!apiKey) {
return "Error: API Key belum masuk! Pastikan environment variable REACT_APP_KIMI_API_KEY sudah di-set dan app sudah di-redeploy.";
}
if (!pertanyaan || !pertanyaan.trim()) {
return "Error: Pertanyaan tidak boleh kosong.";
}

const preset = CATEGORIES[category] || CATEGORIES.cs;
const {
history = [],
model = "kimi-k3",
reasoning_effort = "max",
} = options;

// Ambil beberapa pesan terakhir saja agar tidak terlalu boros token
const MAX_HISTORY = 12;
const trimmedHistory = (Array.isArray(history) ? history : [])
.filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
.slice(-MAX_HISTORY)
.map((m) => ({ role: m.role, content: String(m.content) }));

const messages = [
{ role: "system", content: preset.systemPrompt },
...trimmedHistory,
{ role: "user", content: pertanyaan.trim() },
];

try {
const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${apiKey}`,
},
body: JSON.stringify({
model,
messages,
reasoning_effort,
// temperature untuk kimi-k3 fixed 1; tidak perlu dikirim
}),
});

const data = await response.json();

if (!response.ok || data.error) {
return `Error dari Kimi: ${data?.error?.message || response.statusText}`;
}

return data?.choices?.[0]?.message?.content || "Kimi tidak memberikan jawaban.";
} catch (error) {
return `Koneksi gagal: ${error.message}`;
}
}
