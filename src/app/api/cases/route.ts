import { NextResponse } from "next/server";
import { isDenied, requireApiRole } from "@/lib/auth";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { createCase, listCases } from "@/lib/store";
import { parseOrganSystem } from "@/lib/systems";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cases = await listCases();
  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const auth = await requireApiRole(request, "user");
  if (isDenied(auth)) return auth;
  if (!allowRequest(`create:${clientIp(request)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много новых случаев. Подождите немного." },
      { status: 429 },
    );
  }
  let body: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const system = parseOrganSystem(body.system);
  if (!system) {
    return NextResponse.json({ error: "Выберите систему органов" }, { status: 400 });
  }
  try {
    const created = await createCase({
      system,
      diagnosis: typeof body.diagnosis === "string" ? body.diagnosis : "",
      description: typeof body.description === "string" ? body.description : "",
      comments: typeof body.comments === "string" ? body.comments : "",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать случай";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
