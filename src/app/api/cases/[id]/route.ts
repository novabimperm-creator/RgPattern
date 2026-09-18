import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { deleteCase, getCase, updateCase } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = await requireApiSession(request);
  if (denied) return denied;
  const { id } = await context.params;
  const item = await getCase(id);
  if (!item) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireApiSession(request);
  if (denied) return denied;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updated = await updateCase(id, {
    diagnosis: typeof body.diagnosis === "string" ? body.diagnosis : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    comments: typeof body.comments === "string" ? body.comments : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = await requireApiSession(request);
  if (denied) return denied;
  const { id } = await context.params;
  const ok = await deleteCase(id);
  if (!ok) {
    return NextResponse.json({ error: "Случай не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
