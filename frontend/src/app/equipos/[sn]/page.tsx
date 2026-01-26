"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Equipo = {
    id: string;
    nombre: string;
    marca: string;
    modelo: string;
    numero_serie: string;
    ubicacion: string;
    clase_riesgo: string;
    registro_invima?: string;
    imagen_url?: string;
    contrato_activo: boolean;
    contrato_entidad?: string;
    created_at: string;
};

type Mantenimiento = {
    id: string;
    numero_serie: string;
    visita_numero: number;
    descripcion: string;
    observaciones?: Record<string, any>;
    pdf_url?: string;
    created_at: string;
};

const resolveApiBase = () => {
    const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw.replace(/\/+$/, "");
    }
    return `https://${raw.replace(/^\/+/, "")}`.replace(/\/+$/, "");
};

const API_BASE = resolveApiBase();

export default function DetalleEquipoPage({ params }: { params: Promise<{ sn: string }> }) {
    const { sn } = use(params);
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const session = await supabase.auth.getSession();
            if (!session.data.session) router.replace("/login");
            else {
                setIsAuthed(true);
                fetchData();
            }
        };
        checkSession();
    }, [router, sn]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const [equipoRes, maintRes] = await Promise.all([
                fetch(`${API_BASE}/api/equipos?sn=${sn}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/api/mantenimientos?sn=${sn}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ]);

            const equipoData = await equipoRes.json();
            const maintData = await maintRes.json();

            setEquipo(equipoData.data);
            setMantenimientos(maintData.data ?? []);
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthed) return null;

    return (
        <main className="min-h-screen px-4 pb-20 pt-10 sm:px-8 lg:px-14 premium-gradient-bg">
            <div className="flex w-full flex-col gap-10">
                <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Link href="/equipos" className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-hover hover:bg-slate-200">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </Link>
                            <div>
                                <h1 className="font-[var(--font-display)] text-3xl font-bold text-slate-900">{equipo?.nombre || "Cargando..."}</h1>
                                <p className="text-sm font-medium text-slate-500">Hoja de Vida de Equipo Biomédico</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => window.print()} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50">
                                Imprimir Hoja
                            </button>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : equipo ? (
                    <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
                        {/* Sidebar: Info Técnica */}
                        <aside className="flex flex-col gap-8">
                            <div className="rounded-[2rem] border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-md">
                                <div className="mb-8 aspect-square w-full overflow-hidden rounded-3xl bg-slate-100 flex items-center justify-center group">
                                    {equipo.imagen_url ? (
                                        <img src={equipo.imagen_url} alt={equipo.nombre} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <svg className="text-slate-300" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-slate-900">Información Técnica</h2>
                                    <div className="grid grid-cols-2 gap-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Marca</p>
                                            <p className="text-sm font-bold text-slate-700">{equipo.marca}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modelo</p>
                                            <p className="text-sm font-bold text-slate-700">{equipo.modelo}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">S/N</p>
                                            <p className="text-sm font-bold text-slate-700">{equipo.sn}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Riesgo</p>
                                            <p className="text-sm font-bold text-blue-600">{equipo.clase_riesgo}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ubicación</p>
                                            <p className="text-sm font-bold text-slate-700">{equipo.ubicacion}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">INVIMA</p>
                                            <p className="text-sm font-bold text-slate-700">{equipo.registro_invima || "No registrado"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {equipo.contrato_activo && (
                                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/50 p-6 ring-1 ring-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Contrato Activo</p>
                                            <p className="text-sm font-semibold text-emerald-600">{equipo.contrato_entidad}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </aside>

                        {/* Main: Historial de Mantenimientos */}
                        <section className="flex flex-col gap-8">
                            <div className="rounded-[2rem] border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-md">
                                <div className="mb-8 flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-slate-900">Historial de Mantenimientos</h2>
                                    <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-500">
                                        {mantenimientos.length} Registros
                                    </span>
                                </div>

                                {mantenimientos.length > 0 ? (
                                    <div className="relative space-y-8 before:absolute before:left-6 before:top-2 before:h-full before:w-0.5 before:bg-slate-100">
                                        {mantenimientos.map((m) => (
                                            <div key={m.id} className="relative pl-12">
                                                <div className="absolute left-4 top-2 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                                                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md">
                                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                            Visita #{m.visita_numero} — {new Date(m.created_at).toLocaleDateString("es-CO")}
                                                        </span>
                                                        {m.pdf_url && (
                                                            <a
                                                                href={m.pdf_url}
                                                                target="_blank"
                                                                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M9 15h6" /><path d="M9 11h6" /></svg>
                                                                Ver Reporte PDF
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-700 leading-relaxed font-medium">{m.descripcion}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="rounded-full bg-slate-50 p-6 text-slate-300">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                        </div>
                                        <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Sin mantenimientos registrados</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="rounded-[2rem] border border-red-100 bg-red-50 p-10 text-center">
                        <h2 className="text-xl font-bold text-red-600">Equipo no encontrado</h2>
                        <p className="text-red-500">El número de serie solicitado no coincide con ningún activo en nuestra base de datos.</p>
                        <Link href="/equipos" className="mt-6 inline-block font-bold text-red-700 underline underline-offset-4">Regresar al listado</Link>
                    </div>
                )}
            </div>
        </main>
    );
}
