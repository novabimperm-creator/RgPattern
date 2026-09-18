import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getSession, isDenied, requireApiRole } from "@/lib/auth";
import { contentDisposition } from "@/lib/files";
import { deleteFile, filePath, getFileRecord } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getFileRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const viewingImage = record.isImage && !download;
  if (!viewingImage) {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация, чтобы скачать файл" }, { status: 401 });
    }
  }

  try {
    const data = await fs.readFile(filePath(id));
    const disposition = contentDisposition(
      record.originalName,
      download || !record.isImage ? "attachment" : "inline",
    );

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Length": String(record.size),
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл не найден на диске" }, { status: 404 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;
  const { id } = await context.params;
  const updated = await deleteFile(id);
  if (!updated) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
