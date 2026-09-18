import { NextResponse } from "next/server";
import { isDenied, listPublicUsers, registerUser, requireApiRole } from "@/lib/auth";
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
