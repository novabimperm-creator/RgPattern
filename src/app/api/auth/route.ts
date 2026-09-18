import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  checkPassword,
  clearSessionCookie,
  hasValidSession,
  isAuthConfigured,
  isSecureRequest,
  sessionCookieValue,
  setupPassword,
} from "@/lib/auth";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: await isAuthConfigured(),
    authenticated: await hasValidSession(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";

  if (action === "logout") {
    const response = NextResponse.json({ ok: true });
    return clearSessionCookie(response);
  }

  const ip = clientIp(request);
  if (!allowRequest(`auth:${ip}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Подождите несколько минут." },
      { status: 429 },
    );
  }

  if (honeypot) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const secure = isSecureRequest(request);

  if (action === "setup") {
    if (await isAuthConfigured()) {
      return NextResponse.json({ error: "Пароль уже задан" }, { status: 400 });
    }
    if (password.trim().length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не короче 8 символов" }, { status: 400 });
    }
    const created = await setupPassword(password);
    if (!created) {
      return NextResponse.json({ error: "Не удалось сохранить пароль" }, { status: 400 });
    }
    const token = await sessionCookieValue();
    const response = NextResponse.json({ ok: true }, { status: 201 });
    if (token) attachSessionCookie(response, token, secure);
    return response;
  }

  if (action === "login") {
    if (!(await isAuthConfigured())) {
      return NextResponse.json({ error: "Сначала задайте пароль" }, { status: 400 });
    }
    if (!(await checkPassword(password))) {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
    }
    const token = await sessionCookieValue();
    const response = NextResponse.json({ ok: true });
    if (token) attachSessionCookie(response, token, secure);
    return response;
  }

  return NextResponse.json({ error: "Неизвестный запрос" }, { status: 400 });
}
