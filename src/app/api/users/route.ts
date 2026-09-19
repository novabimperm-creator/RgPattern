import { NextResponse } from "next/server";
import { isDenied, listPublicUsers, registerUser, requireApiRole, resetUserPassword } from "@/lib/auth";
import { rejectIfEphemeral } from "@/lib/persistence";
import type { Role } from "@/lib/types";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;
  return NextResponse.json(await listPublicUsers());
}

export async function POST(request: Request) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;
  const ephemeral = rejectIfEphemeral();
  if (ephemeral) return ephemeral;
  if (!allowRequest(`register:${clientIp(request)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много регистраций. Подождите немного." },
      { status: 429 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role: Role = body.role === "superadmin" ? "superadmin" : "user";
  const result = await registerUser(username, password, role);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiRole(request, "superadmin");
  if (isDenied(auth)) return auth;
  const ephemeral = rejectIfEphemeral();
  if (ephemeral) return ephemeral;
  if (!allowRequest(`reset-password:${clientIp(request)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много сбросов пароля. Подождите немного." },
      { status: 429 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const password = typeof body.password === "string" ? body.password : "";
  const result = await resetUserPassword(id, password);
  if ("error" in result) {
    const status = result.error === "Пользователь не найден" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
