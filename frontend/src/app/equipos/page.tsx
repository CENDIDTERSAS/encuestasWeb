"use client";

import { useEffect, useState } from "react";
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
    ciudad: string;
    clase_riesgo: string;
    estado: string;
    imagen_url?: string;
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

export default function EquiposPage() {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAuthed, setIsAuthed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const session = await supabase.auth.getSession();
            if (!session.data.session) {
                router.replace("/login");
            } else {
                setIsAuthed(true);
                fetchEquipos();
            }
        };
        checkSession();
    }, [router]);

    const fetchEquipos = async () => {
        setIsLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const response = await fetch(`${API_BASE}/api/equipos`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            setEquipos(payload.data ?? []);
        } catch (error) {
            console.error("Error al cargar equipos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEquipos = equipos.filter((e) =>
        Object.values(e).some((v) =>
            String(v).toLowerCase().includes(search.toLowerCase())
        )
    );

    if (!isAuthed) return null;

    const getStatusColor = (estado: string) => {
        switch (estado?.toLowerCase()) {
            case 'optimo': return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
            case 'pendiente': return 'bg-amber-100 text-amber-700 ring-amber-200';
            case 'fuera_de_servicio': return 'bg-red-100 text-red-700 ring-red-200';
            default: return 'bg-slate-100 text-slate-700 ring-slate-200';
        }
    };

    const getStatusLabel = (estado: string) => {
        switch (estado?.toLowerCase()) {
            case 'optimo': return 'Óptimo';
            case 'pendiente': return 'Pendiente';
            case 'fuera_de_servicio': return 'Fuera de Servicio';
            default: return estado || 'Desconocido';
        }
    };

    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, serie, marca, ciudad o ubicación..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border-none bg-white/60 px-12 py-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 backdrop-blur-md transition-all focus:ring-2 focus:ring-emerald-500"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100/50 bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    <th className="px-8 py-5">Equipo</th>
                                    <th className="px-6 py-5 text-center">Semaforización</th>
                                    <th className="px-6 py-5">S/N</th>
                                    <th className="px-6 py-5">Marca / Modelo</th>
                                    <th className="px-6 py-5">Ubicación / Ciudad</th>
                                    <th className="px-6 py-5 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEquipos.map((equipo) => (
                                    <tr key={equipo.id} className="group border-b border-slate-50 transition-colors hover:bg-white/50">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                                                    {equipo.imagen_url ? (
                                                        <img src={equipo.imagen_url} alt={equipo.nombre} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 line-clamp-1">{equipo.nombre}</p>
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Clase {equipo.clase_riesgo}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase ring-1 ${getStatusColor(equipo.estado)}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${equipo.estado === 'optimo' ? 'bg-emerald-500' : equipo.estado === 'pendiente' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                                                {getStatusLabel(equipo.estado)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{equipo.numero_serie}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700">{equipo.marca}</div>
                                            <div className="text-xs text-slate-400 font-medium">{equipo.modelo}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-700">{equipo.ubicacion}</div>
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                                {equipo.ciudad}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <Link
                                                href={`/equipos/${equipo.numero_serie}`}
                                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200"
                                            >
                                                Ver Detalles
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isLoading && filteredEquipos.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="rounded-full bg-slate-50 p-8 text-slate-300">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">No se encontraron equipos</h3>
                        <p className="mt-2 text-slate-500 text-lg font-medium">Refina tu búsqueda o intenta con otros términos.</p>
                    </div>
                </div>
            )}
        </section>
    );
}
