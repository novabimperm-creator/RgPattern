import path from "path";

export const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
);
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "cases.json");
export const AUTH_PATH = path.join(DATA_DIR, "auth.json");
