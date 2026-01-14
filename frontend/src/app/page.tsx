"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type EncuestaRow = {
  id: string;
  tipo: "satisfaccion" | "mamografia";
  servicio: string;
  fecha: string;
  operator_name: string | null;
  payload: Record<string, unknown>;
  pdf_drive_path?: string | null;
};

type Periodo = "mensual" | "trimestral" | "semestral" | "anual";

const periodLabels: Record<Periodo, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildPdfLink = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://drive.google.com/file/d/${value}/view`;
};

const getPeriodKey = (dateValue: string, period: Periodo) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (period === "mensual") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  if (period === "trimestral") {
    const quarter = Math.ceil(month / 3);
    return `${year}-T${quarter}`;
  }
  if (period === "semestral") {
    const half = month <= 6 ? 1 : 2;
    return `${year}-S${half}`;
  }
  return `${year}`;
};

const buildDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export default function HomePage() {
  const [encuestas, setEncuestas] = useState<EncuestaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tipo, setTipo] = useState<"satisfaccion" | "mamografia">(
    "satisfaccion",
  );
  const [servicio, setServicio] = useState("all");
  const [periodo, setPeriodo] = useState<Periodo>("mensual");
  const [startDate, setStartDate] = useState(buildDateRange().start);
  const [endDate, setEndDate] = useState(buildDateRange().end);
  const [lastSync, setLastSync] = useState<string>("");
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          setEncuestas([]);
          setIsLoading(false);
          return;
        }
        const params = new URLSearchParams({
          tipo,
          servicio,
          start: `${startDate}T00:00:00`,
          end: `${endDate}T23:59:59`,
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/encuestas?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Error al cargar encuestas");
        }
        setEncuestas(payload.data ?? []);
        setLastSync(new Date().toISOString());
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [tipo, servicio, startDate, endDate]);

  const serviciosDisponibles = useMemo(() => {
    const set = new Set<string>();
    encuestas.forEach((row) => {
      if (row.servicio) {
        set.add(row.servicio);
      }
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [encuestas]);

  const totalEncuestas = encuestas.length;
  const tipoLabel =
    tipo === "satisfaccion" ? "Satisfaccion" : "Mamografia";

  const periodKeys = useMemo(() => {
    const set = new Set<string>();
    encuestas.forEach((row) => set.add(getPeriodKey(row.fecha, periodo)));
    return Array.from(set).sort();
  }, [encuestas, periodo]);

  const countsByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    encuestas.forEach((row) => {
      const key = getPeriodKey(row.fecha, periodo);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [encuestas, periodo]);

  const countsByService = useMemo(() => {
    const map = new Map<string, number>();
    encuestas.forEach((row) => {
      const key = row.servicio || "Sin servicio";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [encuestas]);

  const servicePeriodMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();
    encuestas.forEach((row) => {
      const serviceKey = row.servicio || "Sin servicio";
      const periodKey = getPeriodKey(row.fecha, periodo);
      if (!matrix.has(serviceKey)) {
        matrix.set(serviceKey, new Map());
      }
      const inner = matrix.get(serviceKey)!;
      inner.set(periodKey, (inner.get(periodKey) ?? 0) + 1);
    });
    return matrix;
  }, [encuestas, periodo]);

  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await supabase.auth.getSession();
      setIsAuthed(Boolean(session.data.session));
      setIsAuthChecked(true);
    };
    checkSession();
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthed(Boolean(session));
        setIsAuthChecked(true);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthChecked && !isAuthed) {
      router.replace("/login");
    }
  }, [isAuthChecked, isAuthed, router]);

  const handleDownload = async () => {
    setDownloadError("");
    setIsDownloading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setDownloadError("Sesion no valida.");
        return;
      }
      const params = new URLSearchParams({
        tipo,
        servicio,
        start: `${startDate}T00:00:00`,
        end: `${endDate}T23:59:59`,
      });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/download?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Error al descargar ZIP.");
      }
      const blob = await response.blob();
      const fileName = `encuestas_${tipo}_${startDate}_${endDate}.zip`;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError((error as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 lg:px-14">
      <div className="mx-auto flex w-full flex-col gap-8">
        <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)]">
          <div className="absolute -right-16 -top-10 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />
          <div className="absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-emerald-50 blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                  CENDIDTER S.A.S
                </span>
                <h1 className="text-balance font-[var(--font-display)] text-4xl font-semibold text-slate-900 sm:text-5xl">
                  Panel de Encuestas
                </h1>
              </div>
              {isAuthed && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  {isSigningOut ? "Cerrando..." : "Cerrar sesion"}
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Total filtrado: {totalEncuestas}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Tipo: {tipoLabel}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Servicio: {servicio === "all" ? "Todos" : servicio}
              </span>
              {lastSync && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  Actualizado: {formatDateTime(lastSync)}
                </span>
              )}
              {!isAuthed && (
                <Link
                  href="/login"
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Iniciar sesion
                </Link>
              )}
            </div>
          </div>
        </header>

        {isAuthed && (
          <>
            <section className="grid gap-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Filtros principales
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Tipo de encuesta
                    <select
                      value={tipo}
                      onChange={(event) =>
                        setTipo(
                          event.target.value as "satisfaccion" | "mamografia",
                        )
                      }
                      className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="satisfaccion">
                        Encuestas de Satisfaccion
                      </option>
                      <option value="mamografia">
                        Encuestas de Mamografia
                      </option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Servicio
                    <select
                      value={servicio}
                      onChange={(event) => setServicio(event.target.value)}
                      className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                    >
                      {serviciosDisponibles.map((item) => (
                        <option key={item} value={item}>
                          {item === "all" ? "Todos los servicios" : item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Desde
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Hasta
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Agrupaciones y periodos
                </h2>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(periodLabels) as Periodo[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPeriodo(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        periodo === item
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/60"
                          : "border border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {periodLabels[item]}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm text-white">
                  Se muestran conteos por{" "}
                  {periodLabels[periodo].toLowerCase()} para el rango
                  seleccionado.
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      {isDownloading ? "Descargando..." : "Descargar PDFs"}
                    </span>
                  </button>
                  {downloadError && (
                    <span className="rounded-full bg-red-50 px-3 py-2 text-xs text-red-600">
                      {downloadError}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Conteo por {periodLabels[periodo]}
                  </h2>
                  <span className="text-sm text-slate-500">
                    {periodKeys.length} periodos
                  </span>
                </div>
                <div className="mt-4 grid gap-4">
                  {periodKeys.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No hay datos para el rango seleccionado.
                    </p>
                  )}
                  {periodKeys.map((key) => {
                    const value = countsByPeriod.get(key) ?? 0;
                    const ratio = totalEncuestas ? value / totalEncuestas : 0;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">
                            {key}
                          </span>
                          <span>{value} encuestas</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-emerald-50">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ranking por servicio
                </h2>
                <div className="mt-4 space-y-4">
                  {countsByService.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Aun no hay datos para mostrar.
                    </p>
                  )}
                  {countsByService.map(([name, value]) => {
                    const ratio = totalEncuestas ? value / totalEncuestas : 0;
                    return (
                      <div
                        key={name}
                        className="rounded-2xl bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">
                            {name}
                          </span>
                          <span>{value}</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-emerald-50">
                          <div
                            className="h-2 rounded-full bg-amber-400"
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Conteos por servicio y periodo
                </h2>
                <span className="text-sm text-slate-500">
                  {periodLabels[periodo]}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Servicio</th>
                      {periodKeys.map((key) => (
                        <th key={key} className="px-3 py-2">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(servicePeriodMatrix.entries()).map(
                      ([serviceName, values]) => (
                        <tr
                          key={serviceName}
                          className="rounded-2xl bg-white shadow-sm"
                        >
                          <td className="px-3 py-3 font-semibold text-slate-900">
                            {serviceName}
                          </td>
                          {periodKeys.map((key) => (
                            <td key={key} className="px-3 py-3 text-slate-600">
                              {values.get(key) ?? 0}
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Tabla de encuestas
                </h2>
                <span className="text-sm text-slate-500">
                  {isLoading ? "Cargando..." : `${encuestas.length} registros`}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Servicio</th>
                  <th className="px-3 py-2">Operador</th>
                  <th className="px-3 py-2">PDF</th>
                      {tipo === "satisfaccion" ? (
                        <>
                          <th className="px-3 py-2">Nombres</th>
                          <th className="px-3 py-2">Apellidos</th>
                          <th className="px-3 py-2">Identificacion</th>
                          <th className="px-3 py-2">Edad</th>
                          <th className="px-3 py-2">EPS</th>
                          <th className="px-3 py-2">Sexo</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">Identificacion</th>
                          <th className="px-3 py-2">Edad</th>
                          <th className="px-3 py-2">EPS</th>
                          <th className="px-3 py-2">Tipo</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="uppercase">
                    {encuestas.map((row) => {
                      const payload = row.payload || {};
                      return (
                        <tr
                      key={row.id}
                      className="rounded-2xl bg-white shadow-sm"
                    >
                      <td className="px-3 py-3 text-slate-600">
                        {formatDate(row.fecha)}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {row.servicio || "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {row.operator_name || "N/A"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {buildPdfLink(row.pdf_drive_path) ? (
                          <div className="inline-flex items-center gap-3">
                            <a
                              href={buildPdfLink(row.pdf_drive_path)!}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-emerald-600 hover:text-emerald-700"
                              aria-label="Ver PDF"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </a>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `PDF: ${buildPdfLink(row.pdf_drive_path)}`,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-green-600 hover:text-green-700"
                              aria-label="Enviar por WhatsApp"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12.04 2C6.54 2 2.07 6.47 2.07 11.97c0 1.95.52 3.85 1.5 5.52L2 22l4.66-1.53a9.9 9.9 0 0 0 5.38 1.58h.01c5.5 0 9.97-4.47 9.97-9.97S17.54 2 12.04 2Zm0 18.2h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-2.77.91.93-2.7-.2-.31a8.19 8.19 0 1 1 6.55 3.43Zm4.5-5.53c-.25-.12-1.46-.72-1.69-.8-.23-.08-.4-.12-.57.12-.17.25-.66.8-.81.96-.15.17-.3.18-.55.06-.25-.12-1.05-.39-2-.84-.75-.36-1.26-.8-1.4-1.05-.15-.25-.02-.38.1-.5.12-.12.25-.3.38-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.38-.78-1.9-.2-.48-.4-.41-.57-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.45 1.03 2.62c.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.44.52.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.66-1.18.2-.58.2-1.07.14-1.18-.06-.12-.23-.18-.48-.31Z" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                          {tipo === "satisfaccion" ? (
                            <>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.nombres as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.apellidos as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.identificacion as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.edad as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.eps as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.sexo as string) ?? ""}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.nombre as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.id as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.edad as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.eps as string) ?? ""}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {(payload.tipoMamografia as string) ?? ""}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
