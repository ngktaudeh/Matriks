import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

/*
 * Highlighter Suite — diadaptasi dari landing page "Highlight Lapak99 (Eid Edition)"
 * Struktur & cara kerja dipertahankan sama persis, hanya tema diubah ke Line Togel (neon).
 */

const SCRIPTS = [
  {
    id: "LAPAK1",
    emoji: "🎨",
    title: "Highlighter Pro",
    desc: "Dashboard melayang, mewarnai keyword penting (Depo/WD), dan Auto-Response template.",
    glow: "var(--neon-red)",
    btnStyle: { background: "linear-gradient(135deg, #ff2a5f, #ff003c)" },
  },
  {
    id: "LAPAK2",
    emoji: "📑",
    title: "Duplicate Checker",
    desc: "Mendeteksi pesan spam atau duplikat dari agent secara otomatis dengan warna merah.",
    glow: "var(--neon-cyan)",
    btnStyle: { background: "linear-gradient(135deg, #00f0ff, #0284c7)", color: "#001a1d" },
  },
  {
    id: "LAPAK3",
    emoji: "⏱️",
    title: "UI & SLA Tracker",
    desc: "Indikator SLA sidebar, notifikasi toast, dan Tracker Pengecekan (2/4 menit) otomatis.",
    glow: "var(--neon-gold)",
    btnStyle: { background: "linear-gradient(135deg, #ffd700, #ff8800)", color: "#1a1400" },
  },
];

const CONFIG_ITEMS = [
  {
    title: "1. Allow User Scripts",
    desc: "Wajib ON agar script bisa membaca perubahan di halaman LiveChat.",
  },
  {
    title: "2. Allow in Incognito",
    desc: "Wajib ON jika Anda sering bekerja menggunakan tab Incognito.",
  },
  {
    title: "3. Allow access to file URLs",
    desc: "Memungkinkan script melakukan update otomatis secara instan.",
  },
];

const CHANGELOG = [
  {
    date: "UPDATE 2026",
    header: "V2.2 - The Security & Utility Update",
    latest: true,
    items: [
      "Smart Auto-Scroll ✨: Tambahan tombol roket mini 🚀 (warna emas) untuk kembali ke atas dashboard secara instan.",
      "Data Vault (Export/Import): Fitur pencadangan data kini tersedia. Simpan semua kata kunci & template ke file .json sebagai backup permanen.",
      "Anti-Reset Storage: Sistem penyimpanan diperkuat menggunakan GM_Storage. Restart PC, shutdown, atau Clear Cache browser TIDAK akan menghapus settingan Anda.",
      "Disaster Recovery: Jika Anda mengganti PC atau terjadi error fatal, cukup gunakan fitur Import menggunakan file backup.",
    ],
  },
  {
    date: "JANUARI 22, 2026",
    header: "V2.1 - The Control Update",
    latest: false,
    items: [
      "SLA Notification Toggles: Ditambahkan kontrol ON/OFF untuk notifikasi 2 & 3 menit langsung dari dashboard.",
      "UI Optimization: Panel SLA dipindahkan ke posisi teratas dashboard untuk akses lebih cepat.",
      "Instant Sync: Notifikasi kini langsung hilang saat dimatikan via toggle tanpa perlu refresh.",
    ],
  },
];

export const HighlighterSuite = ({ onClose }) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Mousemove effect untuk orbs (dipertahankan dari sumber)
  useEffect(() => {
    const handler = (e) => {
      const orbs = document.querySelectorAll(".hs-orb");
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      orbs.forEach((orb, idx) => {
        const speed = (idx + 1) * 20;
        orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="relative flex-1 overflow-y-auto">
      {/* Orbs dekoratif */}
      <div className="hs-orb orb top-20 left-10 h-40 w-40 bg-[#ff2a5f]/30" />
      <div className="hs-orb orb top-40 right-10 h-56 w-56 bg-[#00f0ff]/20" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
        <div className="relative rounded-[2.5rem] border border-[#ff2a5f]/25 bg-white/[0.04] p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-10">
          {/* ===== HEADER ===== */}
          <header className="mb-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#ff2a5f] bg-white/10 text-5xl shadow-[0_0_20px_rgba(255,42,95,0.5)]">
                🎯
              </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff2a5f] bg-black/40 px-5 py-2 text-sm text-white backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff2a5f] shadow-[0_0_10px_#ff2a5f] animate-pulse" />
              System Updated: Line Togel Edition
            </div>

            <div className="mb-4 inline-block rounded-full border border-[#ff2a5f] bg-[#ff2a5f]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#ff2a5f] shadow-[0_0_15px_rgba(255,42,95,0.3)]">
              ✨ Internal Team Only ✨
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-white via-[#ff7a9e] to-[#ff2a5f] bg-clip-text text-transparent">
                Highlight
              </span>{" "}
              <span className="bg-gradient-to-r from-[#ff2a5f] via-[#ffd700] to-[#00f0ff] bg-clip-text text-transparent">
                Line Togel
              </span>
            </h1>
            <p className="mt-3 text-base text-white/90">
              Kumpulan tools premium untuk optimasi kerja LiveChat.
              <br />
              <span className="text-[#ffd700]">⚡ Berjalan otomatis di dashboard Anda ⚡</span>
            </p>
          </header>

          {/* ===== SCRIPT GRID ===== */}
          <section className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SCRIPTS.map((s) => (
              <div key={s.id} className="group relative rounded-[2rem] transition-transform duration-300 hover:-translate-y-2.5">
                <div
                  className="absolute inset-0 rounded-[inherit] opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-50"
                  style={{ background: s.glow }}
                />
                <div className="relative flex h-full flex-col items-center rounded-[inherit] border border-white/10 bg-white/[0.06] p-8 text-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <div className="mb-4 text-5xl" style={{ filter: `drop-shadow(0 0 8px ${s.glow})` }}>
                    {s.emoji}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-white">{s.title}</h3>
                  <p className="mb-7 text-sm text-white/85">{s.desc}</p>
                  <a
                    href={`${process.env.PUBLIC_URL || ""}/${s.id}.user.js`}
                    className="mt-auto inline-block rounded-full px-6 py-3 font-semibold text-[#0a0a0e] shadow-[0_5px_15px_rgba(255,42,95,0.4)] transition-all hover:scale-[1.02]"
                    style={s.btnStyle}
                  >
                    Pasang Sekarang
                  </a>
                </div>
              </div>
            ))}
          </section>

          {/* ===== KONFIGURASI ===== */}
          <section className="mb-12 rounded-[2rem] border border-[#ff2a5f]/30 bg-black/40 p-8 text-center backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="text-3xl animate-pulse">⚠️</span>
              <h2 className="font-display text-2xl font-bold bg-gradient-to-r from-[#ff2a5f] to-[#ff8800] bg-clip-text text-transparent">
                PENTING: Konfigurasi Kelola Ekstensi
              </h2>
            </div>
            <p className="mb-6 text-white/90">
              Agar script berjalan 100% lancar, Anda <b>WAJIB</b> mengaktifkan ijin berikut di pengaturan Tampermonkey Anda:
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {CONFIG_ITEMS.map((c) => (
                <div key={c.title} className="flex flex-col items-center gap-3 rounded-2xl border border-[#ff2a5f]/25 bg-black/50 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff2a5f]/15">
                    <div className="relative h-6 w-10 rounded-full bg-[#ff2a5f] shadow-[0_0_15px_#ff2a5f]">
                      <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-1 text-base text-white">{c.title}</h4>
                    <p className="mx-auto max-w-[200px] text-sm text-white/80">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border-l-4 border-[#ff2a5f] bg-[#ff2a5f]/15 p-5 text-left text-white">
              <p>
                <strong>Cara ke Pengaturan:</strong> Klik kanan icon Tampermonkey &gt; Pilih{" "}
                <strong>Kelola Ekstensi</strong> (Manage Extension) &gt; Scroll ke bawah dan{" "}
                <strong>Centang Semua Biru</strong> seperti gambar di bawah.
              </p>
            </div>
          </section>

          {/* ===== TUTORIAL ===== */}
          <section className="mb-12">
            <h2 className="mb-6 text-center font-display text-2xl font-bold bg-gradient-to-r from-white to-[#ffd700] bg-clip-text text-transparent">
              Langkah Penting Update Otomatis
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex flex-1 basis-[200px] items-center gap-4 rounded-[2rem] border border-[#ff2a5f]/25 bg-black/40 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ff2a5f] bg-[#ff2a5f]/20 text-lg font-extrabold text-[#ff2a5f]">!</div>
                <p className="text-white">Setelah klik pasang, pastikan Anda <strong>me-refresh</strong> halaman LiveChat agar fitur berjalan.</p>
              </div>
              <div className="flex flex-1 basis-[200px] items-center gap-4 rounded-[2rem] border border-[#ffd700]/25 bg-black/40 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffd700] bg-[#ffd700]/20 text-lg font-extrabold text-[#ffd700]">↻</div>
                <p className="text-white">Fitur <strong>Update Otomatis</strong> aktif. Jika ada perbaikan, script Anda akan terupdate sendiri.</p>
              </div>
            </div>
          </section>

          {/* ===== FOOTER ===== */}
          <footer className="border-t border-[#ff2a5f]/20 pt-8 text-center text-sm text-white/90">
            © 2026 Highlight Line Togel Internal Team. ⚡ Selamat Bekerja ⚡
          </footer>
        </div>
      </div>

      {/* ===== TOMBOL MENGAMBANG ===== */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full border border-[#ff2a5f] bg-black/50 px-6 py-3 font-semibold text-white shadow-[0_0_20px_rgba(255,42,95,0.3)] backdrop-blur-xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,42,95,0.5)]"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff2a5f] shadow-[0_0_10px_#ff2a5f] animate-pulse" />
        Updates
      </button>

      {/* ===== MODAL CHANGELOG ===== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-h-[80vh] w-[90%] max-w-[600px] overflow-y-auto rounded-[2rem] border border-[#ff2a5f]/40 bg-black/70 p-8 text-white shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-6 top-5 text-3xl leading-none text-[#ff2a5f] transition hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-7 w-7" />
            </button>

            <h2 className="mb-6 text-center font-display text-3xl font-bold bg-gradient-to-r from-[#ff2a5f] via-[#ffd700] to-[#00f0ff] bg-clip-text text-transparent">
              Update Hub
            </h2>

            {CHANGELOG.map((log, i) => (
              <div
                key={i}
                className={`mb-8 border-b border-[#ff2a5f]/15 pb-4 ${
                  log.latest ? "border-l-[3px] border-l-[#ff2a5f] pl-4" : ""
                }`}
              >
                <div className="mb-1 text-xs font-semibold tracking-widest text-[#ff2a5f]">
                  {log.date}
                </div>
                <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                  {log.header}
                  {log.latest && (
                    <span className="rounded-full bg-[#ff2a5f] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0e]">
                      Latest
                    </span>
                  )}
                </div>
                <ul className="list-none">
                  {log.items.map((item, j) => (
                    <li key={j} className="relative mb-2 pl-5 text-sm text-white/90">
                      <span className="absolute left-0 text-[#ffd700]">▹</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="mt-5 rounded-2xl border-l-4 border-[#ffd700] bg-[#ffd700]/10 p-4 text-left text-white">
              <p className="mb-2 text-[11px]">
                💡 <b>Cara Pakai Backup:</b> Menuju <b>Settings (icon ⚙️)</b> di Dashboard &gt; Klik{" "}
                <b>EXPORT</b> untuk simpan data ke PC. Klik <b>IMPORT</b> untuk mengembalikan data.
              </p>
              <p className="text-[11px]">
                🛡️ <b>Aman:</b> Sekalipun Anda restart PC atau hapus history, data tetap ada! Selalu lakukan Export
                setelah menambah banyak kata kunci baru sebagai tindakan jaga-jaga.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
