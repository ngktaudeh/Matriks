import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Highlighter } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { APP_NAME } from "../../lib/constants";

export const LoginForm = ({ onSubmit, onToggleMode, onForgotPassword, loading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-5 inline-flex">
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-[#ff2a5f] via-[#ff003c] to-[#ffd700] opacity-70 blur-lg" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-lg shadow-[#ff2a5f]/40">
            <Highlighter className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-wide text-white">
          Masuk ke <span className="bg-gradient-to-r from-[#ff7a9e] to-[#ff2a5f] bg-clip-text text-transparent">{APP_NAME}</span>
        </h1>
        <p className="mt-1.5 text-sm text-white/50">
          Akses dashboard VIP Anda dengan aman
        </p>
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
            placeholder="••••••••"
            icon={Lock}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[2.1rem] text-white/40 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[#ff2a5f]/40 bg-[#ff2a5f]/10 p-3 text-sm text-[#ff7a9e]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium text-[#ff7a9e] hover:text-[#ff2a5f]"
          >
            Lupa password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full btn-neon text-white shadow-lg shadow-[#ff2a5f]/30 hover:brightness-110"
          loading={loading}
          disabled={!email || !password}
        >
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Belum punya akun?{" "}
        <button
          onClick={onToggleMode}
          className="font-semibold text-[#ff7a9e] hover:underline"
        >
          Daftar sekarang
        </button>
      </p>
    </div>
  );
};
