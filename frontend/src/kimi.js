// frontend/src/kimi.js
//
// Utilitas serbaguna untuk memanggil Kimi (Moonshot API) dari sisi SaaS
// developer: bisa dipakai untuk brainstorming desain UI/UX, review/ide kode
// frontend, strategi produk SaaS, sampai ide prompt gambar/ilustrasi.
//
// Cara pakai singkat:
//   import { tanyaKimi, getRandomQuestion, CATEGORIES } from "./kimi";
//   const jawaban = await tanyaKimi("pertanyaanmu", "design");
//   const idePertanyaan = getRandomQuestion("gambar");

/* ------------------------------------------------------------------ */
/*  Kategori & system prompt per peran                                 */
/* ------------------------------------------------------------------ */

export const CATEGORIES = {
  design: {
    label: "UI/UX Desain",
    systemPrompt:
      "Kamu adalah UI/UX Designer profesional untuk produk SaaS. Jawab dalam " +
      "Bahasa Indonesia yang singkat, praktis, dan langsung bisa dipakai. " +
      "Kalau relevan, sertakan contoh kode CSS/HTML/Tailwind serta kode hex warna.",
  },
  code: {
    label: "Kode Frontend",
    systemPrompt:
      "Kamu adalah Senior Frontend Developer (React) untuk produk SaaS. " +
      "Jawab dalam Bahasa Indonesia yang ringkas, beri contoh kode React/JS " +
      "yang benar dan siap tempel, serta jelaskan alasan singkatnya.",
  },
  saas: {
    label: "Strategi Produk SaaS",
    systemPrompt:
      "Kamu adalah SaaS Product Strategist/Growth Advisor berpengalaman. " +
      "Jawab dalam Bahasa Indonesia, fokus pada saran yang actionable untuk " +
      "produk SaaS kecil-menengah: onboarding, pricing, retensi, dan fitur.",
  },
  gambar: {
    label: "Ide Gambar/Ilustrasi",
    systemPrompt:
      "Kamu adalah Art Director yang membantu menyusun ide visual untuk " +
      "produk SaaS. Jawab dalam Bahasa Indonesia. Kamu TIDAK bisa membuat " +
      "gambar langsung, jadi berikan deskripsi/ide visual yang jelas dan " +
      "juga contoh prompt (dalam Bahasa Inggris, satu baris) yang bisa " +
      "ditempel ke tool image generator seperti Midjourney/DALL·E.",
  },
  random: {
    label: "Ide Acak",
    systemPrompt:
      "Kamu adalah asisten kreatif serba bisa untuk developer SaaS solo. " +
      "Jawab dalam Bahasa Indonesia, singkat, dan berikan sudut pandang " +
      "yang segar/tidak biasa.",
  },
};

/* ------------------------------------------------------------------ */
/*  Bank pertanyaan random per kategori (buat tombol "Kejutkan aku")   */
/* ------------------------------------------------------------------ */

const RANDOM_QUESTIONS = {
  design: [
    "Berikan palet warna hex code modern untuk dashboard SaaS bertema penyimpanan data rahasia.",
    "Saran font pairing (judul + body) yang cocok untuk landing page SaaS B2B.",
    "Bagaimana cara mendesain empty state yang ramah untuk fitur baru yang belum ada datanya?",
    "Rancangkan struktur spacing/grid yang konsisten untuk dashboard admin.",
    "Bagaimana membuat form panjang terasa lebih ringan secara visual?",
  ],
  code: [
    "Bagaimana cara membuat komponen modal reusable di React yang bisa dipakai berkali-kali?",
    "Contoh pola custom hook untuk debounce input pencarian di React.",
    "Bagaimana cara terbaik menangani loading & error state secara konsisten di banyak komponen?",
    "Berikan contoh cara lazy-load gambar di React tanpa library tambahan.",
    "Bagaimana strategi menata folder project React yang scalable untuk SaaS?",
  ],
  saas: [
    "Ide fitur onboarding sederhana yang meningkatkan aktivasi user baru.",
    "Bagaimana menyusun tiga tingkat paket harga (pricing tier) yang masuk akal untuk SaaS kecil?",
    "Ide email re-engagement untuk user yang sudah seminggu tidak login.",
    "Metrik apa yang paling penting dipantau di bulan pertama peluncuran SaaS?",
    "Ide fitur 'quick win' yang murah dibangun tapi berdampak besar ke retensi.",
  ],
  gambar: [
    "Ide ilustrasi hero section untuk landing page SaaS bertema keamanan data.",
    "Ide ikon set minimalis untuk fitur chat, notifikasi, dan pengaturan.",
    "Ide ilustrasi empty state untuk halaman 'belum ada transaksi'.",
    "Ide gaya visual (mood) untuk SaaS yang menyasar pengguna kreatif/desainer.",
    "Ide background pattern lembut untuk halaman login SaaS.",
  ],
  random: [
    "Kalau produk SaaS ini adalah sebuah kota, kota seperti apa dia dan kenapa?",
    "Satu fitur 'nyeleneh' apa yang bisa jadi pembeda unik dari kompetitor?",
    "Kalau harus menjelaskan produk ini ke anak SD, bagaimana caranya?",
    "Nama codename yang catchy untuk rilis fitur besar berikutnya?",
    "Satu kebiasaan kecil developer solo yang bisa menghemat banyak waktu?",
  ],
};

export const getRandomQuestion = (category = "random") => {
  const list = RANDOM_QUESTIONS[category] || RANDOM_QUESTIONS.random;
  return list[Math.floor(Math.random() * list.length)];
};

/* ------------------------------------------------------------------ */
/*  Pemanggil utama ke Kimi (Moonshot API)                             */
/* ------------------------------------------------------------------ */

/**
 * tanyaKimi
 * @param {string} pertanyaan - pertanyaan/instruksi untuk Kimi
 * @param {string} category - salah satu key dari CATEGORIES ("design",
 *   "code", "saas", "gambar", "random"). Default: "design".
 * @param {object} [options] - opsi tambahan (opsional)
 * @param {number} [options.temperature=0.7]
 * @param {string} [options.model="moonshot-v1-8k"]
 * @returns {Promise<string>} jawaban teks dari Kimi (atau pesan error)
 */
export async function tanyaKimi(pertanyaan, category = "design", options = {}) {
  const apiKey = process.env.REACT_APP_KIMI_API_KEY;

  if (!apiKey) {
    return "Error: API Key belum masuk! Pastikan file .env sudah dibuat dan server sudah di-restart.";
  }
  if (!pertanyaan || !pertanyaan.trim()) {
    return "Error: Pertanyaan tidak boleh kosong.";
  }

  const preset = CATEGORIES[category] || CATEGORIES.design;
  const { temperature = 0.7, model = "moonshot-v1-8k" } = options;

  try {
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: preset.systemPrompt },
          { role: "user", content: pertanyaan },
        ],
        temperature,
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
