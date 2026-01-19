import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const serviceClient = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

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

  const { data: perfil } = await serviceClient
    .from("usuarios")
    .select("rol")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const isAdmin = (perfil?.rol ?? "").toString().toLowerCase() === "admin";

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const servicio = searchParams.get("servicio");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const baseClient = isAdmin ? serviceClient : auth.dataClient;
  let query = baseClient
    .from("encuestas")
    .select("id,tipo,servicio,fecha,operator_name,payload,pdf_drive_path")
    .order("fecha", { ascending: false });

  if (tipo) {
    query = query.eq("tipo", tipo);
  }
  if (servicio && servicio !== "all") {
    query = query.eq("servicio", servicio);
  }
  if (start) {
    query = query.gte("fecha", start);
  }
  if (end) {
    query = query.lte("fecha", end);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers },
    );
  }

  return NextResponse.json({ data: data ?? [] }, { headers });
}
