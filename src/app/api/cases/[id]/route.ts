import { NextResponse } from "next/server";
import { isDenied, requireApiRole } from "@/lib/auth";
import { deleteCase, getCase, updateCase } from "@/lib/store";
import { parseOrganSystem } from "@/lib/systems";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const item = await getCase(id);
  if (!item) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(request, "user");
  if (isDenied(auth)) return auth;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.system !== undefined && !parseOrganSystem(body.system)) {
    return NextResponse.json({ error: "Выберите систему органов" }, { status: 400 });
  }
  try {
    const updated = await updateCase(id, {
      system: typeof body.system === "string" ? body.system : undefined,
      diagnosis: typeof body.diagnosis === "string" ? body.diagnosis : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      comments: typeof body.comments === "string" ? body.comments : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить случай";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;
  const { id } = await context.params;
  const ok = await deleteCase(id);
  if (!ok) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
