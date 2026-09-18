import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { isDenied, requireApiRole } from "@/lib/auth";
import { DATA_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;

  await fs.mkdir(DATA_DIR, { recursive: true });

  const child = spawn("tar", ["-C", DATA_DIR, "-czf", "-", "."], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!child.stdout) {
    return NextResponse.json({ error: "Не удалось создать архив" }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const stream = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="rgpattern-${date}.tar.gz"`,
      "Cache-Control": "no-store",
    },
  });
}
