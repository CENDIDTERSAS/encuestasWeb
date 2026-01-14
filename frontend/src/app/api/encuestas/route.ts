import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const servicio = searchParams.get("servicio");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let query = supabaseServer
    .from("encuestas")
    .select("id,tipo,servicio,fecha,operator_name,payload")
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
