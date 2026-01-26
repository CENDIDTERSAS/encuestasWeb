"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type CronogramaItem = {
    id: string;
    numero_serie: string;
    contrato_id: string;
    cantidad_visitas: number;
    visitas_realizadas: number;
    created_at: string;
    equipos_biomedicos?: {
        nombre: string;
        marca: string;
        modelo: string;
    };
    contratos_biomedicos?: {
        entidad: string;
        numero_contrato: string;
    };
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

export default function CronogramaPage() {
    const [items, setItems] = useState<CronogramaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const session = await supabase.auth.getSession();
            if (!session.data.session) router.replace("/login");
            else {
                setIsAuthed(true);
                fetchCronograma();
            }
        };
        checkSession();
    }, [router]);

    const fetchCronograma = async () => {
        setIsLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const response = await fetch(`${API_BASE}/api/cronograma`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            setItems(payload.data ?? []);
        } catch (error) {
            console.error("Error al cargar cronograma:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthed) return null;

    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Progreso Anual</h2>
                    <p className="text-sm text-slate-500">Control de visitas programadas por equipo</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {items.length > 0 ? (
                        items.map((item) => {
                            const prog = item.cantidad_visitas > 0 ? item.visitas_realizadas / item.cantidad_visitas : 0;
                            const isDone = prog >= 1;

                            return (
                                <div key={item.id} className="rounded-3xl border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md">
                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex flex-1 items-center gap-4">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="m9 16 2 2 4-4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{item.equipos_biomedicos?.nombre || "Equipo Desconocido"}</h3>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">S/N: {item.numero_serie} — {item.contratos_biomedicos?.entidad || "Sin Contrato"}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 text-right">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visitas</span>
                                                <span className="text-lg font-black text-slate-900">{item.visitas_realizadas} / {item.cantidad_visitas}</span>
                                            </div>
                                            <div className="h-2.5 w-48 rounded-full bg-slate-200 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(100, prog * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2rem] border border-dashed border-slate-300">
                            <div className="rounded-full bg-slate-100 p-6 text-slate-400">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></svg>
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-900">Cronograma vacío</h3>
                            <p className="text-slate-500">No hay equipos vinculados a contratos actualmente.</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
