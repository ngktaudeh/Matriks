import React, { useState } from "react";
import { RefreshCw, Copy, Check, KeyRound } from "lucide-react";
import { Button } from "../UI/Button";
import { Modal } from "../UI/Modal";

/* Cara kerja diambil dari Password Generator (tanpa simbol) yang diberikan.
   - Hanya huruf besar, huruf kecil, dan angka (tidak ada simbol).
   - Base text opsional → transformasi "leet" (a→4, e→3, o→0, s→5, t→7, dst).
   - Panjang 8–32, indikator kekuatan password. */

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
};

const LEET_MAP = {
  a: ["4", "A"], b: ["8", "B"], c: ["C", "c"], d: ["D", "d"], e: ["3", "E"],
  f: ["F", "f"], g: ["6", "9", "G"], h: ["H", "h"], i: ["1", "I"], j: ["J", "j"],
  k: ["K", "k"], l: ["1", "L"], m: ["M", "m"], n: ["N", "n"], o: ["0", "O"],
  p: ["P", "p"], q: ["Q", "q"], r: ["R", "r"], s: ["5", "S"], t: ["7", "T"],
  u: ["U", "u"], v: ["V", "v"], w: ["W", "w"], x: ["X", "x"], y: ["Y", "y"],
  z: ["2", "Z"],
};

const STRENGTH_LEVELS = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];
const STRENGTH_COLORS = ["#ff4757", "#ff6b81", "#ffa502", "#2ed573", "#00ff9d"];

const OPTIONS = [
  ["uppercase", "Huruf Besar (A-Z)"],
  ["lowercase", "Huruf Kecil (a-z)"],
  ["numbers", "Angka (0-9)"],
];

export const GeneratorModal = ({ isOpen, onClose }) => {
  const [baseText, setBaseText] = useState("");
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ uppercase: true, lowercase: true, numbers: true });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const applyLeetTransform = (text) => {
    let out = "";
    for (const ch of text) {
      const map = LEET_MAP[ch.toLowerCase()];
      if (map) {
        out += map[Math.floor(Math.random() * map.length)];
      } else if (/[A-Za-z0-9]/.test(ch)) {
        out += ch;
      }
      // Simbol & spasi diabaikan.
    }
    return out;
  };

  const strengthOf = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    return Math.min(5, score);
  };

  const generate = () => {
    let charset = "";
    if (options.uppercase) charset += CHAR_SETS.uppercase;
    if (options.lowercase) charset += CHAR_SETS.lowercase;
    if (options.numbers) charset += CHAR_SETS.numbers;

    if (!charset) {
      setError("Aktifkan minimal satu jenis karakter (huruf besar, huruf kecil, atau angka).");
      setPassword("");
      setCopied(false);
      return;
    }

    const len = parseInt(length, 10);
    let pw = "";
    const trimmed = baseText.trim();

    if (trimmed) {
      pw = applyLeetTransform(trimmed);
      if (pw.length > len) pw = pw.substring(0, len);
      while (pw.length < len) pw += charset[Math.floor(Math.random() * charset.length)];
      pw = pw.substring(0, len);
    } else {
      const selected = [];
      if (options.uppercase) selected.push("uppercase");
      if (options.lowercase) selected.push("lowercase");
      if (options.numbers) selected.push("numbers");
      for (const t of selected) pw += CHAR_SETS[t][Math.floor(Math.random() * CHAR_SETS[t].length)];
      for (let i = pw.length; i < len; i++) pw += charset[Math.floor(Math.random() * charset.length)];
      pw = pw.split("").sort(() => Math.random() - 0.5).join("");
    }

    // Final cleanup: hanya alfanumerik.
    pw = pw.replace(/[^A-Za-z0-9]/g, "");
    while (pw.length < len) pw += charset[Math.floor(Math.random() * charset.length)];
    if (pw.length > len) pw = pw.substring(0, len);

    setPassword(pw);
    setError("");
    setCopied(false);
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = password;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = strengthOf(password);

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Tutup
      </Button>
      <Button onClick={generate}>
        <RefreshCw className="w-4 h-4 mr-1.5" />
        Generate
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generator" footer={footer}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Teks Dasar (Opsional)
          </label>
          <input
            type="text"
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Ketik teks dasar di sini…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Panjang Password</label>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{length}</span>
          </div>
          <input
            type="range"
            min="8"
            max="32"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-slate-900 dark:accent-white"
          />
        </div>

        <div className="space-y-2">
          {OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
              className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                options[key]
                  ? "border-slate-900 bg-slate-900/5 text-slate-900 dark:border-white dark:bg-white/10 dark:text-white"
                  : "border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span>{label}</span>
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  options[key] ? "bg-slate-900 dark:bg-white" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all dark:bg-slate-900 ${
                    options[key] ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>

        <div>
          <div
            className={`flex min-h-[64px] items-center justify-center break-all rounded-lg border px-4 py-3 text-center font-mono text-lg tracking-wider transition-colors ${
              error
                ? "border-red-400/40 text-red-500"
                : password
                ? "border-emerald-400/30 text-emerald-500"
                : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
            }`}
          >
            {error || password || "Password akan muncul di sini"}
          </div>

          {password && !error && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Kekuatan Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: STRENGTH_COLORS[strength - 1] }}>
                    {STRENGTH_LEVELS[strength - 1] || "--"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyPassword}>
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Tersalin" : "Salin"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: i <= strength ? STRENGTH_COLORS[strength - 1] : "rgba(148,163,184,0.3)",
                      boxShadow: i <= strength ? `0 0 8px ${STRENGTH_COLORS[strength - 1]}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
