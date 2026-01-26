"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }
    router.push("/");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden premium-gradient-bg px-6">
      {/* Ambient Background Elements */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl animate-float" />
      <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-emerald-200">
              <img src="/logoApp.png" alt="Logo" className="h-auto w-full object-contain" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">
              CENDIDTER S.A.S
            </span>
            <h1 className="mt-4 font-[var(--font-display)] text-3xl font-bold text-slate-900">
              Bienvenido
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Correo Institucional</label>
              <input
                type="email"
                required
                placeholder="usuario@cendidter.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border-none bg-white/60 px-5 py-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border-none bg-white/60 px-5 py-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <div className="animate-shake rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600 ring-1 ring-red-100">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative mt-2 overflow-hidden rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Iniciando...
                  </>
                ) : "Iniciar Sesión"}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            &copy; 2026 Cendidter S.A.S. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </main>
  );
}
