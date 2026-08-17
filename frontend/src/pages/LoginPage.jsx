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
      <div className="orb top-0 left-1/4 h-80 w-80 bg-[#ff2a5f]/40" />
      <div className="orb bottom-10 right-10 h-64 w-64 bg-[#00f0ff]/20" style={{ animationDelay: "2s" }} />
      <div className="orb top-1/3 right-1/4 h-48 w-48 bg-[#ffd700]/20" style={{ animationDelay: "4s" }} />

      <div className="relative w-full max-w-md float-card glass shimmer p-8">
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
