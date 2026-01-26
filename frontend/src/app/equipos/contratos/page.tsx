"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Contrato = {
    id: string;
    numero_contrato: string;
    entidad: string;
    nit: string;
    fecha_inicio: string;
    fecha_terminacion: string;
    observaciones?: string;
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

export default function ContratosPage() {
    const [contratos, setContratos] = useState<Contrato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const [expandedNit, setExpandedNit] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const session = await supabase.auth.getSession();
            if (!session.data.session) router.replace("/login");
            else {
                setIsAuthed(true);
                fetchContratos();
            }
        };
        checkSession();
    }, [router]);

    const fetchContratos = async () => {
        setIsLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const response = await fetch(`${API_BASE}/api/contratos`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            setContratos(payload.data ?? []);
        } catch (error) {
            console.error("Error al cargar contratos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Agrupar contratos por NIT
    const groupedContratos = useMemo(() => {
        const groups: Record<string, Contrato[]> = {};
        contratos.forEach((c) => {
            const nit = c.nit || "SIN-NIT";
            if (!groups[nit]) groups[nit] = [];
            groups[nit].push(c);
        });

        // Ordenar cada grupo por fecha de terminación descendente
        Object.keys(groups).forEach(nit => {
            groups[nit].sort((a, b) => new Date(b.fecha_terminacion).getTime() - new Date(a.fecha_terminacion).getTime());
        });

        return groups;
    }, [contratos]);

    if (!isAuthed) return null;

    return (
        <section className="flex flex-col gap-8 pb-10">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Gestión de Contratos</h2>
                <p className="text-sm text-slate-500">Historial administrativo agrupado por NIT de entidad</p>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {Object.keys(groupedContratos).length > 0 ? (
                        Object.entries(groupedContratos).map(([nit, items]) => {
                            const latest = items[0];
                            const isExpired = new Date(latest.fecha_terminacion).getTime() < new Date().getTime();
                            const isExpiringSoon = !isExpired && (new Date(latest.fecha_terminacion).getTime() - new Date().getTime() < 1000 * 60 * 60 * 24 * 30);

                            return (
                                <div key={nit} className="overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 shadow-sm backdrop-blur-md transition-all">
                                    {/* Header de Entidad */}
                                    <div className="flex flex-wrap items-center justify-between gap-6 p-8 border-b border-slate-100/50 bg-white/40">
                                        <div className="flex items-center gap-5">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">{latest.entidad}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">NIT: {nit}</span>
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'bg-slate-200 text-slate-600' :
                                                            isExpiringSoon ? 'bg-red-100 text-red-600 animate-pulse' :
                                                                'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {isExpired ? 'Finalizado' : isExpiringSoon ? 'Próximo a Vencer' : 'Vigente'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                                                        {items.length} {items.length === 1 ? 'Contrato' : 'Contratos en total'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setExpandedNit(expandedNit === nit ? null : nit)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95"
                                        >
                                            {expandedNit === nit ? "Cerrar Historial" : "Ver Historial"}
                                            <svg className={`transition-transform duration-300 ${expandedNit === nit ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                    </div>

                                    {/* Grid de Contratos (Historial) */}
                                    <div className={`grid transition-all duration-500 ease-in-out ${expandedNit === nit ? 'max-h-[2000px] opacity-100 p-8' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                            {items.map((c, idx) => (
                                                <div key={c.id} className={`group relative rounded-3xl p-6 ring-1 transition-all ${idx === 0 ? 'bg-white shadow-md ring-blue-200' : 'bg-slate-50 shadow-sm ring-slate-100'}`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${idx === 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                            {idx === 0 ? '🎯 Contrato Vigente' : `📄 Registro #${items.length - idx}`}
                                                        </span>
                                                        <span className="font-mono text-xs font-bold text-slate-500">#{c.numero_contrato}</span>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inicio</p>
                                                                <p className="text-sm font-bold text-slate-800">{new Date(c.fecha_inicio).toLocaleDateString("es-CO")}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fin</p>
                                                                <p className="text-sm font-bold text-slate-800">{new Date(c.fecha_terminacion).toLocaleDateString("es-CO")}</p>
                                                            </div>
                                                        </div>

                                                        {c.observaciones && (
                                                            <div className="rounded-xl bg-white/50 p-3 text-xs italic text-slate-600 leading-relaxed border border-slate-100">
                                                                “{c.observaciones}”
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer pequeño si está colapsado */}
                                    {expandedNit !== nit && (
                                        <div className="px-8 py-3 bg-slate-50/30 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                            Última actualización: {new Date(latest.created_at).toLocaleDateString("es-CO")}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200">
                            <div className="rounded-full bg-slate-100 p-8 text-slate-300">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
                            </div>
                            <h3 className="mt-6 text-2xl font-bold text-slate-900">No se encontraron contratos</h3>
                            <p className="mt-2 text-slate-500">Los registros de contratos aparecerán aquí una vez creados desde la App.</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
