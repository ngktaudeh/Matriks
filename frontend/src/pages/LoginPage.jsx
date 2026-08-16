import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LoginForm } from "../components/Auth/LoginForm";
import { SignupForm } from "../components/Auth/SignupForm";
import { PasswordReset } from "../components/Auth/PasswordReset";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  React.useEffect(() => {
    const type = searchParams.get("type");
    if (type === "recovery") {
      toast.info("Silakan buat password baru Anda");
    }
  }, [searchParams]);

  const handleLogin = async (email, password) => {
    const { error } = await signIn(email, password);
    if (!error) {
      toast.success("Berhasil masuk!");
      navigate("/");
    }
  };

  const handleSignup = async (email, password) => {
    const { error } = await signUp(email, password);
    if (!error) {
      toast.success("Pendaftaran berhasil! Periksa email untuk verifikasi.");
      setMode("login");
    }
  };

  const handleReset = async (email) => {
    const { error } = await resetPassword(email);
    if (!error) {
      toast.success("Link reset password telah dikirim");
      return { error: null };
    }
    return { error };
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-indigo-500/15 blur-[90px]" />
        <div className="absolute bottom-20 left-10 h-[200px] w-[200px] rounded-full bg-fuchsia-500/10 blur-[70px]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
        {mode === "login" && (
          <LoginForm
            onSubmit={handleLogin}
            onToggleMode={() => setMode("signup")}
            onForgotPassword={() => setMode("reset")}
            loading={loading}
            error={error}
          />
        )}
        {mode === "signup" && (
          <SignupForm
            onSubmit={handleSignup}
            onToggleMode={() => setMode("login")}
            loading={loading}
            error={error}
          />
        )}
        {mode === "reset" && (
          <PasswordReset
            onSubmit={handleReset}
            onBack={() => setMode("login")}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  );
};
