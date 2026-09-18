import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { createCase, listCases } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireApiSession(request);
  if (denied) return denied;
  const cases = await listCases();
  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const denied = await requireApiSession(request);
  if (denied) return denied;
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
  const created = await createCase({
    diagnosis: typeof body.diagnosis === "string" ? body.diagnosis : "",
    description: typeof body.description === "string" ? body.description : "",
    comments: typeof body.comments === "string" ? body.comments : "",
  });
  return NextResponse.json(created, { status: 201 });
}
