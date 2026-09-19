import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_PATH, DATA_DIR, isFsNotFound } from "./paths";
import type { PublicUser, Role } from "./types";
import { isAllowedOrigin } from "./rate-limit";

export const SESSION_COOKIE = "rgpattern_session";
const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 32;

export type StoredUser = PublicUser & {
  passwordHash: string;
  createdAt: string;
};

type AuthFile = {
  users: StoredUser[];
  sessionSecret: string;
};

type LegacyAuthFile = {
  passwordHash?: string;
  sessionSecret?: string;
  users?: StoredUser[];
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

export function validUsername(username: string): boolean {
  return /^[a-zA-Zа-яА-ЯёЁ0-9._-]{2,32}$/.test(username.trim());
}

function publicUser(user: StoredUser): PublicUser {
  return { id: user.id, username: user.username, role: user.role };
}

function asAuthFile(value: LegacyAuthFile | null): AuthFile | null {
  if (!value || !Array.isArray(value.users) || value.users.length === 0) return null;
  if (typeof value.sessionSecret !== "string" || !value.sessionSecret) return null;
  return { users: value.users, sessionSecret: value.sessionSecret };
}

async function readRaw(): Promise<LegacyAuthFile | null> {
  try {
    const raw = await fs.readFile(AUTH_PATH, "utf8");
    return JSON.parse(raw) as LegacyAuthFile;
  } catch (error) {
    if (isFsNotFound(error)) return null;
    throw error;
  }
}

async function writeAuth(file: AuthFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${AUTH_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file, null, 2), "utf8");
  await fs.rename(tmp, AUTH_PATH);
}

async function readAuth(): Promise<AuthFile | null> {
  const parsed = await readRaw();
  const current = asAuthFile(parsed);
  if (current) return current;
  if (parsed?.passwordHash && parsed.sessionSecret) {
    const legacyHash = parsed.passwordHash;
    const legacySecret = parsed.sessionSecret;
    return enqueue(async () => {
      const existing = asAuthFile(await readRaw());
      if (existing) return existing;
      const migrated: AuthFile = {
        sessionSecret: legacySecret,
        users: [
          {
            id: crypto.randomUUID(),
            username: "admin",
            role: "superadmin",
            passwordHash: legacyHash,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await writeAuth(migrated);
      return migrated;
    });
  }
  return null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function createToken(userId: string, secret: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}.${userId}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

function parseToken(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [expiresAt, userId, nonce, mac] = parts;
  if (!expiresAt || !userId || !nonce || !mac) return null;
  const payload = `${expiresAt}.${userId}.${nonce}`;
  if (!equal(mac, sign(payload, secret))) return null;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return userId;
}

export async function isAuthConfigured(): Promise<boolean> {
  const auth = await readAuth();
  return Boolean(auth && auth.users.length > 0);
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  const auth = await readAuth();
  return (auth?.users ?? []).map(publicUser);
}

export async function setupSuperadmin(username: string, password: string): Promise<PublicUser | null> {
  if (!validUsername(username) || password.trim().length < 8) return null;
  return enqueue(async () => {
    const current = await readAuth();
    if (current && current.users.length > 0) return null;
    const user: StoredUser = {
      id: crypto.randomUUID(),
      username: username.trim(),
      role: "superadmin",
      passwordHash: hashPassword(password.trim()),
      createdAt: new Date().toISOString(),
    };
    await writeAuth({
      sessionSecret: randomBytes(32).toString("hex"),
      users: [user],
    });
    return publicUser(user);
  });
}

export async function registerUser(
  username: string,
  password: string,
  role: Role,
): Promise<PublicUser | { error: string }> {
  if (!validUsername(username)) {
    return { error: "Логин: 2–32 символа, буквы, цифры, точка, _ или -" };
  }
  if (password.trim().length < 8) {
    return { error: "Пароль должен быть не короче 8 символов" };
  }
  if (role !== "user" && role !== "superadmin") {
    return { error: "Некорректная роль" };
  }
  return enqueue(async () => {
    const auth = await readAuth();
    if (!auth) return { error: "Сначала создайте суперадмина" };
    const name = username.trim();
    if (auth.users.some((user) => user.username.toLowerCase() === name.toLowerCase())) {
      return { error: "Такой пользователь уже есть" };
    }
    const user: StoredUser = {
      id: crypto.randomUUID(),
      username: name,
      role,
      passwordHash: hashPassword(password.trim()),
      createdAt: new Date().toISOString(),
    };
    auth.users.push(user);
    await writeAuth(auth);
    return publicUser(user);
  });
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<PublicUser | { error: string }> {
  if (password.trim().length < 8) {
    return { error: "Пароль должен быть не короче 8 символов" };
  }
  return enqueue(async () => {
    const auth = await readAuth();
    if (!auth) return { error: "Сначала создайте суперадмина" };
    const user = auth.users.find((entry) => entry.id === userId);
    if (!user) return { error: "Пользователь не найден" };
    user.passwordHash = hashPassword(password.trim());
    await writeAuth(auth);
    return publicUser(user);
  });
}

export async function findUserByCredentials(
  username: string,
  password: string,
): Promise<PublicUser | null> {
  const auth = await readAuth();
  if (!auth) return null;
  const user = auth.users.find(
    (entry) => entry.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!user || !verifyPassword(password.trim(), user.passwordHash)) return null;
  return publicUser(user);
}

export async function getSession(): Promise<PublicUser | null> {
  const auth = await readAuth();
  if (!auth) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = parseToken(token, auth.sessionSecret);
  if (!userId) return null;
  const user = auth.users.find((entry) => entry.id === userId);
  return user ? publicUser(user) : null;
}

export async function sessionCookieFor(userId: string): Promise<string | null> {
  const auth = await readAuth();
  if (!auth) return null;
  return createToken(userId, auth.sessionSecret);
}

function roleAllows(role: Role, min: Role): boolean {
  if (min === "user") return role === "user" || role === "superadmin";
  return role === "superadmin";
}

export async function requireApiRole(
  request: Request,
  minRole: Role,
): Promise<{ user: PublicUser } | NextResponse> {
  if (["POST", "PATCH", "DELETE"].includes(request.method) && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  }
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!roleAllows(user.role, minRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  return { user };
}

export function isDenied(
  result: { user: PublicUser } | NextResponse,
): result is NextResponse {
  return !("user" in result);
}

export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
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
