// frontend/src/kimi.js

export async function tanyaKimi(pertanyaan) {
  // Ambil API Key dari file .env yang tadi kita buat
  const apiKey = process.env.REACT_APP_KIMI_API_KEY;
  
  if (!apiKey) {
    return "Error: API Key belum masuk! Pastikan file .env sudah dibuat dan server sudah di-restart.";
  }

  try {
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k", // Model standar Kimi
        messages: [
          { role: "system", content: "Kamu adalah UI/UX Designer profesional. Jawab dalam bahasa Indonesia yang singkat dan berikan contoh kode CSS/HTML jika diminta." },
          { role: "user", content: pertanyaan }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    // Kalau ada error dari API Kimi
    if (data.error) return `Error dari Kimi: ${data.error.message}`;
    
    // Kembalikan jawaban teks dari Kimi
    return data.choices[0].message.content;

  } catch (error) {
    return `Koneksi gagal: ${error.message}`;
  }
}
