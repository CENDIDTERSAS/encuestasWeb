import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDriveClient } from "@/lib/drive";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getCorsHeaders = (origin: string | null) => {
  const allowed = process.env.ALLOWED_ORIGIN ?? "*";
  const allowOrigin = allowed === "*" ? "*" : origin ?? allowed;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
  };
};

const extractFileName = (payload: Record<string, unknown>) => {
  const rawPath = (payload.pdfPath as string) ?? "";
  if (rawPath) {
    const parts = rawPath.split(/[\\/]/);
    return parts[parts.length - 1] ?? "";
  }
  return "";
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

  const { data: roleRow, error: roleError } = await auth.dataClient
    .from("usuarios")
    .select("rol")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (roleError || (roleRow?.rol ?? "") !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403, headers });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "200");

  const { data, error } = await supabaseService
    .from("encuestas")
    .select("id,pdf_drive_path,payload,pdf_local_path")
    .is("pdf_drive_path", null)
    .limit(Number.isFinite(limit) ? limit : 200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ updated: 0, missing: 0 }, { headers });
  }

  const drive = getDriveClient();
  let updated = 0;
  const missing: string[] = [];

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const fileName = extractFileName(payload);
    if (!fileName) {
      missing.push(row.id);
      continue;
    }

    const { data: fileList } = await drive.files.list({
      q: `name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`,
      spaces: "drive",
      fields: "files(id,name)",
      pageSize: 1,
    });

    const fileId = fileList.files?.[0]?.id;
    if (!fileId) {
      missing.push(row.id);
      continue;
    }

    await supabaseService
      .from("encuestas")
      .update({ pdf_drive_path: fileId })
      .eq("id", row.id);
    updated += 1;
  }

  return NextResponse.json({ updated, missing: missing.length }, { headers });
}
