import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LoginForm } from "../components/Auth/LoginForm";
import { SignupForm } from "../components/Auth/SignupForm";
import { PasswordReset } from "../components/Auth/PasswordReset";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  // Handle recovery token from URL
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
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
