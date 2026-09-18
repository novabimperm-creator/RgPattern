import { promises as fs } from "fs";
import path from "path";
import type { CaseFile, Database, MedicalCase } from "./types";
import { isPreviewableImage, MAX_FILE_SIZE } from "./files";
import { DB_PATH, UPLOADS_DIR } from "./paths";

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureDirs() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function readDb(): Promise<Database> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || !Array.isArray(parsed.cases)) {
      return { cases: [] };
    }
    return parsed;
  } catch {
    return { cases: [] };
  }
}

async function writeDb(db: Database) {
  await ensureDirs();
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

function nowIso() {
  return new Date().toISOString();
}

function sortCases(cases: MedicalCase[]) {
  return [...cases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function listCases(): Promise<MedicalCase[]> {
  const db = await readDb();
  return sortCases(db.cases);
}

export async function getCase(id: string): Promise<MedicalCase | null> {
  const db = await readDb();
  return db.cases.find((item) => item.id === id) ?? null;
}

export async function createCase(
  input: Partial<Pick<MedicalCase, "diagnosis" | "description" | "comments">> = {},
): Promise<MedicalCase> {
  return enqueue(async () => {
    const db = await readDb();
    const timestamp = nowIso();
    const created: MedicalCase = {
      id: crypto.randomUUID(),
      diagnosis: input.diagnosis?.trim() ?? "",
      description: input.description ?? "",
      comments: input.comments ?? "",
      createdAt: timestamp,
      updatedAt: timestamp,
      files: [],
    };
    db.cases.push(created);
    await writeDb(db);
    return created;
  });
}

export async function updateCase(
  id: string,
  patch: Partial<Pick<MedicalCase, "diagnosis" | "description" | "comments">>,
): Promise<MedicalCase | null> {
  return enqueue(async () => {
    const db = await readDb();
    const current = db.cases.find((item) => item.id === id);
    if (!current) return null;
    if (patch.diagnosis !== undefined) current.diagnosis = patch.diagnosis;
    if (patch.description !== undefined) current.description = patch.description;
    if (patch.comments !== undefined) current.comments = patch.comments;
    current.updatedAt = nowIso();
    await writeDb(db);
    return current;
  });
}

export async function deleteCase(id: string): Promise<boolean> {
  return enqueue(async () => {
    const db = await readDb();
    const current = db.cases.find((item) => item.id === id);
    if (!current) return false;
    await Promise.all(
      current.files.map(async (file) => {
        await fs.unlink(path.join(UPLOADS_DIR, file.id)).catch(() => undefined);
      }),
    );
    db.cases = db.cases.filter((item) => item.id !== id);
    await writeDb(db);
    return true;
  });
}

export async function addFiles(
  caseId: string,
  uploads: { name: string; type: string; size: number; data: Buffer }[],
): Promise<MedicalCase | null> {
  return enqueue(async () => {
    const db = await readDb();
    const current = db.cases.find((item) => item.id === caseId);
    if (!current) return null;

    for (const upload of uploads) {
      if (upload.size > MAX_FILE_SIZE) {
        throw new Error(`Файл «${upload.name}» слишком большой (лимит 200 МБ).`);
      }
      const file: CaseFile = {
        id: crypto.randomUUID(),
        caseId,
        originalName: upload.name || "file",
        mimeType: upload.type || "application/octet-stream",
        size: upload.size,
        isImage: isPreviewableImage(upload.type, upload.name),
        createdAt: nowIso(),
      };
      await fs.writeFile(path.join(UPLOADS_DIR, file.id), upload.data);
      current.files.push(file);
    }

    current.updatedAt = nowIso();
    await writeDb(db);
    return current;
  });
}

export async function deleteFile(fileId: string): Promise<MedicalCase | null> {
  return enqueue(async () => {
    const db = await readDb();
    const current = db.cases.find((item) => item.files.some((file) => file.id === fileId));
    if (!current) return null;
    current.files = current.files.filter((file) => file.id !== fileId);
    current.updatedAt = nowIso();
    await fs.unlink(path.join(UPLOADS_DIR, fileId)).catch(() => undefined);
    await writeDb(db);
    return current;
  });
}

export async function getFileRecord(fileId: string): Promise<CaseFile | null> {
  const db = await readDb();
  for (const item of db.cases) {
    const file = item.files.find((entry) => entry.id === fileId);
    if (file) return file;
  }
  return null;
}

export function filePath(fileId: string) {
  return path.join(UPLOADS_DIR, fileId);
}
