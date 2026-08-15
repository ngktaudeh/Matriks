import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Shield, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { APP_NAME } from "../../lib/constants";
import { isStrongPassword } from "../../utils/validators";
import { useInviteCode } from "../../hooks/useInviteCode";

export const SignupForm = ({ onSubmit, onToggleMode, loading, error }) => {
  const { code: inviteCode, loading: codeLoading } = useInviteCode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = isStrongPassword(password);
  const strengthLabels = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (accessCode !== inviteCode) {
      alert("Kode akses tidak valid. Hubungi admin untuk mendapatkan kode.");
      return;
    }
    if (password !== confirmPassword) return;
    onSubmit(email, password);
  };

  const isValid = email && password && confirmPassword && password === confirmPassword && agreed && accessCode && !codeLoading;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 mb-4 dark:bg-white">
          <Shield className="h-7 w-7 text-white dark:text-slate-900" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Akun {APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Akses vault pribadi — by invitation only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          icon={Mail}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            icon={Lock}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[2.1rem] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {password && (
          <div className="space-y-1.5">
            <div className="flex gap-1 h-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${i < strength ? strengthColors[strength - 1] : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kekuatan: <span className="font-medium">{strengthLabels[strength - 1] || "Sangat Lemah"}</span>
            </p>
          </div>
        )}

        <Input
          label="Konfirmasi Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ulangi password"
          icon={Lock}
          error={confirmPassword && password !== confirmPassword ? "Password tidak cocok" : ""}
          required
        />

        {/* KODE AKSES — BARU */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <Input
            label="Kode Akses"
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Masukkan kode undangan"
            icon={KeyRound}
            className="border-amber-300 focus:border-amber-500 dark:border-amber-700"
            required
          />
          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
            Pendaftaran hanya untuk yang memiliki kode undangan. Hubungi admin untuk kode akses.
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Saya setuju dengan{" "}
            <button type="button" className="font-medium text-slate-900 hover:underline dark:text-white">Syarat & Ketentuan</button>
          </span>
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading} disabled={!isValid}>
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Daftar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Sudah punya akun?{" "}
        <button onClick={onToggleMode} className="font-semibold text-slate-900 hover:underline dark:text-white">
          Masuk
        </button>
      </p>
    </div>
  );
};
