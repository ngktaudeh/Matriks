import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Copy } from "lucide-react";
import { Button } from "../UI/Button";

const PASARAN = ["4D", "3D", "2D", "Colok Bebas", "Colok Jitu", "Shio"];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const generate = (pasaran) => {
  const r = () => Math.floor(Math.random() * 10);
  const digits = (n) => Array.from({ length: n }, r).join("");
  switch (pasaran) {
    case "4D":
      return { angka: digits(4), detail: `4 Angka — kombinasi ${digits(4)}` };
    case "3D":
      return { angka: digits(3), detail: `3 Angka — kombinasi ${digits(3)}` };
    case "2D":
      return { angka: digits(2), detail: `2 Angka — kombinasi ${digits(2)}` };
    case "Colok Bebas":
      return { angka: digits(2), detail: "Pilih 1 angka bebas posisi" };
    case "Colok Jitu":
      return { angka: digits(3), detail: "Posisi tepat (AS/Kop/Kepala/Ekor)" };
    case "Shio":
      return { angka: (Math.floor(Math.random() * 12) + 1).toString(), detail: "12 shio keberuntungan" };
    default:
      return { angka: digits(4), detail: "" };
  }
};

export const PrediksiTogel = ({ onClose }) => {
  const [active, setActive] = useState("4D");
  const [result, setResult] = useState(null);

  const runGenerate = (p = active) => {
    setActive(p);
    setResult(generate(p));
    toast.success(`Prediksi ${p} dibuat`);
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${active}: ${result.angka}`);
      toast.success("Prediksi disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,215,0,0.4)] bg-[rgba(255,215,0,0.12)] text-[#ffd700]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold text-white">Prediksi Togel</h1>
          <p className="text-xs text-white/50">Generator angka prediksi untuk referensi</p>
        </div>
      </div>

      <div className="float-card glass rounded-2xl p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {PASARAN.map((p) => (
            <button
              key={p}
              onClick={() => runGenerate(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                active === p
                  ? "bg-gradient-to-r from-[#ff2a5f] to-[#ff003c] text-white shadow-[0_0_18px_rgba(255,42,95,0.45)]"
                  : "border border-white/15 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {result ? (
          <div className="text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
              {active} · {result.detail}
            </div>
            <div className="mx-auto flex max-w-md items-center justify-center gap-2">
              {result.angka.split("").map((d, i) => (
                <span
                  key={i}
                  className="flex h-16 w-14 items-center justify-center rounded-2xl border border-[rgba(255,215,0,0.5)] bg-[rgba(255,215,0,0.08)] font-display text-3xl font-extrabold text-[#ffd700] shadow-[0_0_24px_rgba(255,215,0,0.35)]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-white/40">
            <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
            Pilih pasaran untuk melihat prediksi
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => runGenerate(active)}>
            <RefreshCw className="h-4 w-4" /> Acak Ulang
          </Button>
          <Button variant="outline" onClick={copyResult} disabled={!result}>
            <Copy className="h-4 w-4" /> Salin
          </Button>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-white/35">
        Angka bersifat acak untuk hiburan / referensi saja, bukan jaminan hasil.
      </p>
    </div>
  );
};
