import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "./rate-limit";

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");
export const SESSION_COOKIE = "rgpattern_session";
const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 32;

type AuthFile = {
  passwordHash: string;
  sessionSecret: string;
};

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

async function readAuth(): Promise<AuthFile | null> {
  try {
    const raw = await fs.readFile(AUTH_PATH, "utf8");
    const parsed = JSON.parse(raw) as AuthFile;
    if (!parsed.passwordHash || !parsed.sessionSecret) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeAuth(file: AuthFile) {
  await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
  const tmp = `${AUTH_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file, null, 2), "utf8");
  await fs.rename(tmp, AUTH_PATH);
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function createToken(secret: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

function tokenValid(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAt, nonce, mac] = parts;
  if (!expiresAt || !nonce || !mac) return false;
  const payload = `${expiresAt}.${nonce}`;
  if (!equal(mac, sign(payload, secret))) return false;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  return true;
}

export async function isAuthConfigured(): Promise<boolean> {
  return (await readAuth()) != null;
}

export async function setupPassword(password: string): Promise<boolean> {
  const trimmed = password.trim();
  if (trimmed.length < 8) return false;
  return enqueue(async () => {
    if (await readAuth()) return false;
    await writeAuth({
      passwordHash: hashPassword(trimmed),
      sessionSecret: randomBytes(32).toString("hex"),
    });
    return true;
  });
}

export async function checkPassword(password: string): Promise<boolean> {
  const auth = await readAuth();
  if (!auth) return false;
  return verifyPassword(password.trim(), auth.passwordHash);
}

export async function hasValidSession(): Promise<boolean> {
  const auth = await readAuth();
  if (!auth) return false;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return tokenValid(token, auth.sessionSecret);
}

export async function sessionCookieValue(): Promise<string | null> {
  const auth = await readAuth();
  if (!auth) return null;
  return createToken(auth.sessionSecret);
}

export async function requirePageAuth() {
  if (!(await isAuthConfigured()) || !(await hasValidSession())) {
    redirect("/login");
  }
}

export async function requireApiSession(request?: Request): Promise<NextResponse | null> {
  if (request && ["POST", "PATCH", "DELETE"].includes(request.method) && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  }
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  return null;
}

export function attachSessionCookie(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
