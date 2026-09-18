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
  "На Railway нет постоянного диска (Volume). Случаи, снимки, суперадмин и пользователи лежат в контейнере и стираются при каждом деплое. Volume не в Settings: откройте проект на компьютере, нажмите Ctrl+K (на Mac ⌘K), найдите Create Volume. Либо правый клик по пустому месту на схеме проекта. Подключите том к сервису сайта, точка монтирования /app/data. С телефона этот пункт часто не виден. После диска создайте суперадмина заново и загрузите архив.";

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
