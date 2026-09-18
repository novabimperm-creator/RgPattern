import { getPersistenceStatus } from "@/lib/persistence";

export function PersistenceNotice() {
  const status = getPersistenceStatus();
  if (status.persistent || !status.message) return null;

  return (
    <div className="border-b border-danger/30 bg-danger-soft px-3 py-3 text-sm text-danger">
      <div className="mx-auto max-w-6xl">
        <p className="font-semibold">Архив не сохранится при обновлении сайта</p>
        <p className="mt-1 leading-6">{status.message}</p>
      </div>
    </div>
  );
}
