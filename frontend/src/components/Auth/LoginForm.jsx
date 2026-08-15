import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
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
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 mb-4 dark:bg-white">
          <Shield className="h-7 w-7 text-white dark:text-slate-900" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Masuk ke {APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Akses vault Anda dengan aman</p>
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
            className="absolute right-3 top-[2.1rem] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Lupa password?
          </button>
        </div>

        <Button type="submit" className="w-full" loading={loading} disabled={!email || !password}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum punya akun?{" "}
        <button onClick={onToggleMode} className="font-semibold text-slate-900 hover:underline dark:text-white">
          Daftar sekarang
        </button>
      </p>
    </div>
  );
};
