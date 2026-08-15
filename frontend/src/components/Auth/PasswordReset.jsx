import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";

export const PasswordReset = ({ onSubmit, onBack, loading, error }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(email);
    if (!result.error) setSent(true);
  };

  if (sent) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Periksa Email Anda</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Kami telah mengirimkan link reset password ke <strong>{email}</strong>.<br />
          Link berlaku selama 1 jam.
        </p>
        <Button variant="ghost" className="mt-6" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali ke login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Masukkan email Anda dan kami akan kirimkan link reset
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

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading} disabled={!email}>
          <Send className="w-4 h-4 mr-1.5" />
          Kirim Link Reset
        </Button>
      </form>
    </div>
  );
};
