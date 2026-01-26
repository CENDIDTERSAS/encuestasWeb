"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EquiposLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const tabs = [
        { name: "Listado de Equipos", href: "/equipos", icon: "🔧" },
        { name: "Cronograma Anual", href: "/equipos/cronograma", icon: "📅" },
        { name: "Contratos Vigentes", href: "/equipos/contratos", icon: "📑" },
    ];

    return (
        <main className="min-h-screen px-4 pb-20 pt-10 sm:px-8 lg:px-14 premium-gradient-bg">
            <div className="flex w-full flex-col gap-8">
                <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
                                <img src="/logoApp.png" alt="Logo" className="h-auto w-full object-contain" />
                            </div>
                            <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-hover hover:bg-slate-200">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </Link>
                            <div>
                                <h1 className="font-[var(--font-display)] text-3xl font-bold text-slate-900">Módulo de Equipos</h1>
                                <p className="text-sm text-slate-500">Gestión técnica y administrativa de activos</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
                        {tabs.map((tab) => {
                            const isActive = pathname === tab.href;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                        : "bg-white/50 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:shadow-md"
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.name}
                                </Link>
                            );
                        })}
                    </div>
                </header>

                {children}
            </div>
        </main>
    );
}
