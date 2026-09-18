import { promises as fs } from "fs";
import { NextResponse } from "next/server";
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

  try {
    const data = await fs.readFile(filePath(id));
    const download = new URL(request.url).searchParams.get("download") === "1";
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

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const updated = await deleteFile(id);
  if (!updated) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
