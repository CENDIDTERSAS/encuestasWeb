import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";

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
  const tipo = searchParams.get("tipo");

  let query = auth.dataClient.from("encuestas").select("servicio");
  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers },
    );
  }

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const value = (row as { servicio?: string | null }).servicio;
    if (value) {
      seen.add(value);
    }
  }

  return NextResponse.json(
    { data: Array.from(seen).sort((a, b) => a.localeCompare(b)) },
    { headers },
  );
}
