import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Readable, PassThrough } from "stream";
import archiver from "archiver";
import { requireAuth } from "@/lib/auth";
import { getDriveClient } from "@/lib/drive";

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

const buildFileName = (payload: Record<string, unknown>) => {
  const rawPath = (payload.pdfPath as string) ?? "";
  if (rawPath) {
    const parts = rawPath.split(/[\\/]/);
    const name = parts[parts.length - 1];
    if (name) return name;
  }
  const identificacion = (payload.identificacion ||
    payload.id ||
    "sin_id") as string;
  const servicio = (payload.servicio ||
    payload.tipoMamografia ||
    "sin_servicio") as string;
  const fecha = (payload.fechaHora as string) ?? "";
  return `${identificacion}_${servicio}_${fecha || "sin_fecha"}.pdf`
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "_");
};

const toReadableStream = (data: unknown) => {
  if (data instanceof Readable) {
    return data;
  }
  const maybeWebStream = data as { getReader?: () => any };
  if (maybeWebStream && typeof maybeWebStream.getReader === "function") {
    const reader = maybeWebStream.getReader();
    const iterator = async function* () {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    };
    return Readable.from(iterator());
  }
  return Readable.from(data as AsyncIterable<Uint8Array>);
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
  const servicio = searchParams.get("servicio");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let query = auth.dataClient
    .from("encuestas")
    .select("id,fecha,servicio,tipo,pdf_drive_path,payload")
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
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }

  const rows = (data ?? []).filter(
    (row) => row.pdf_drive_path && row.pdf_drive_path.length > 0,
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No hay PDFs disponibles para descargar." },
      { status: 404, headers },
    );
  }

  const drive = getDriveClient();
  const archive = archiver("zip", { zlib: { level: 9 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  for (const row of rows) {
    const fileId = row.pdf_drive_path as string;
    const fileName = buildFileName(row.payload as Record<string, unknown>);
    try {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" },
      );
      const dataStream = toReadableStream(response.data);
      archive.append(dataStream, {
        name: fileName,
      });
    } catch (err) {
      archive.append(
        `No se pudo descargar el archivo ${fileId}.`,
        { name: `errores/${fileId}.txt` },
      );
    }
  }

  archive.finalize();

  const stream = Readable.toWeb(passThrough) as ReadableStream;
  const fileLabel = `encuestas_${tipo ?? "todas"}_${Date.now()}.zip`;

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileLabel}"`,
    },
  });
}
