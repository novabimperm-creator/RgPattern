import path from "path";

function envPath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(/* turbopackIgnore: true */ trimmed) : undefined;
}

/** Railway volume first, then DATA_DIR, then ./data for local dev. */
export const DATA_DIR =
  envPath(process.env.RAILWAY_VOLUME_MOUNT_PATH) ??
  envPath(process.env.DATA_DIR) ??
  path.join(process.cwd(), "data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "cases.json");
export const AUTH_PATH = path.join(DATA_DIR, "auth.json");

export function isFsNotFound(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "ENOENT",
  );
}
