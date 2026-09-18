import { NextResponse } from "next/server";
import { DATA_DIR } from "./paths";

export type PersistenceStatus = {
  persistent: boolean;
  platform: "railway" | "other";
  dataDir: string;
  volumeMountPath: string | null;
  message: string | null;
};

export const RAILWAY_VOLUME_MESSAGE =
  "На Railway нет постоянного диска (Volume). Случаи, снимки и пользователи лежат в контейнере и удаляются при каждом деплое после обновления в GitHub. В сервисе Railway: Settings → Volumes → New Volume, точка монтирования /app/data. Откат деплоя и сам GitHub эти файлы не возвращают — после подключения диска нужно заново создать суперадмина и загрузить архив.";

function onRailway(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

export function getPersistenceStatus(): PersistenceStatus {
  const volumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() || null;
  const railway = onRailway();

  if (railway && !volumeMountPath) {
    return {
      persistent: false,
      platform: "railway",
      dataDir: DATA_DIR,
      volumeMountPath,
      message: RAILWAY_VOLUME_MESSAGE,
    };
  }

  return {
    persistent: true,
    platform: railway ? "railway" : "other",
    dataDir: DATA_DIR,
    volumeMountPath,
    message: null,
  };
}

export function rejectIfEphemeral(): NextResponse | null {
  const status = getPersistenceStatus();
  if (status.persistent) return null;
  return NextResponse.json(
    { error: status.message ?? "Нет постоянного диска для архива" },
    { status: 503 },
  );
}
