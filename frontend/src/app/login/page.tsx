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
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-emerald-100 bg-white p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
            CENDIDTER S.A.S
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-3xl text-slate-900">
            Iniciar sesion
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Accede con tu cuenta institucional.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-600">
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Contrasena
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
            />
          </label>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
