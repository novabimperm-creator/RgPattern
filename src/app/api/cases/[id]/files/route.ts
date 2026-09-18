import { NextResponse } from "next/server";
import { isDenied, requireApiRole } from "@/lib/auth";
import { addFiles, getCase } from "@/lib/store";
import { MAX_FILE_SIZE } from "@/lib/files";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(request, "user");
  if (isDenied(auth)) return auth;
  if (!allowRequest(`upload:${clientIp(request)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много загрузок. Подождите немного." },
      { status: 429 },
    );
  }
  const { id } = await context.params;
  const current = await getCase(id);
  if (!current) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }

  const formData = await request.formData();
  const entries = [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ].filter((value): value is File => value instanceof File && value.size > 0);

  if (entries.length === 0) {
    return NextResponse.json({ error: "Файлы не выбраны" }, { status: 400 });
  }

  const oversized = entries.find((file) => file.size > MAX_FILE_SIZE);
  if (oversized) {
    return NextResponse.json(
      { error: `Файл «${oversized.name}» слишком большой (лимит 200 МБ).` },
      { status: 413 },
    );
  }

  const uploads = await Promise.all(
    entries.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    })),
  );

  try {
    const updated = await addFiles(id, uploads);
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить файлы";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
