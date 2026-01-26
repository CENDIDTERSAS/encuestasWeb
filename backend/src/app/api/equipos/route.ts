import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";

const getCorsHeaders = (origin: string | null) => {
    const allowed = process.env.ALLOWED_ORIGIN ?? "*";
    const allowOrigin = allowed === "*" ? "*" : origin ?? allowed;
    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
    };
};

export async function OPTIONS(request: NextRequest) {
    const headers = getCorsHeaders(request.headers.get("origin"));
    return NextResponse.json({}, { status: 200, headers });
}

export async function GET(request: NextRequest) {
    const headers = getCorsHeaders(request.headers.get("origin"));
    const auth = await requireAuth(request);
    if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: 401, headers });
    }

    const { searchParams } = new URL(request.url);
    const sn = searchParams.get("sn");

    if (sn) {
        const { data, error } = await supabaseService
            .from("equipos_biomedicos")
            .select("*")
            .eq("numero_serie", sn)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500, headers });
        }

        return NextResponse.json({ data: data ?? null }, { headers });
    }

    const { data, error } = await supabaseService
        .from("equipos_biomedicos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers });
    }

    return NextResponse.json({ data: data ?? [] }, { headers });
}
