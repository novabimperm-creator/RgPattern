import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  findUserByCredentials,
  getSession,
  isAuthConfigured,
  sessionCookieFor,
  setupSuperadmin,
} from "@/lib/auth";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: await isAuthConfigured(),
    user: await getSession(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";

  if (action === "logout") {
    return clearSessionCookie(NextResponse.json({ ok: true }));
  }

  const ip = clientIp(request);
  if (!allowRequest(`auth:${ip}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Подождите несколько минут." },
      { status: 429 },
    );
  }

  if (honeypot) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const secure = new URL(request.url).protocol === "https:";

  if (action === "setup") {
    if (await isAuthConfigured()) {
      return NextResponse.json({ error: "Суперадмин уже создан" }, { status: 400 });
    }
    const user = await setupSuperadmin(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Задайте логин (2–32 символа) и пароль не короче 8 символов" },
        { status: 400 },
      );
    }
    const token = await sessionCookieFor(user.id);
    const response = NextResponse.json({ ok: true, user }, { status: 201 });
    if (token) attachSessionCookie(response, token, secure);
    return response;
  }

  if (action === "login") {
    const user = await findUserByCredentials(username, password);
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const token = await sessionCookieFor(user.id);
    const response = NextResponse.json({ ok: true, user });
    if (token) attachSessionCookie(response, token, secure);
    return response;
  }

  return NextResponse.json({ error: "Неизвестный запрос" }, { status: 400 });
}
