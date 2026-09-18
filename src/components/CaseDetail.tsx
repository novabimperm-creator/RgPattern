"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseFile, MedicalCase } from "@/lib/types";
import { formatDateTime } from "@/lib/files";
import { ConfirmDialog } from "./ConfirmDialog";
import { FileGallery } from "./FileGallery";
import { ArrowLeftIcon, TrashIcon } from "./Icons";

type CaseDetailProps = {
  initialCase: MedicalCase;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function CaseDetail({ initialCase }: CaseDetailProps) {
  const router = useRouter();
  const [item, setItem] = useState<MedicalCase>(initialCase);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const draft = useRef({
    diagnosis: initialCase.diagnosis,
    description: initialCase.description,
    comments: initialCase.comments,
  });
  const caseId = initialCase.id;

  const persist = useCallback(async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.current),
      });
      if (!response.ok) throw new Error("save failed");
      const payload = (await response.json()) as MedicalCase;
      setItem((current) => ({
        ...current,
        diagnosis: payload.diagnosis,
        description: payload.description,
        comments: payload.comments,
        updatedAt: payload.updatedAt,
      }));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [caseId]);

  function scheduleSave(patch: Partial<typeof draft.current>) {
    draft.current = { ...draft.current, ...patch };
    setItem((current) => ({ ...current, ...patch }));
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  async function removeCase() {
    const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/");
      router.refresh();
    }
  }

  function onFilesChanged(files: CaseFile[]) {
    setItem((current) => ({ ...current, files }));
  }

  const saveLabel =
    saveState === "saving"
      ? "Сохранение…"
      : saveState === "saved"
        ? "Сохранено"
        : saveState === "error"
          ? "Ошибка сохранения"
          : `Обновлён ${formatDateTime(item.updatedAt)}`;

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-surface"
            aria-label="Назад к списку"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {item.diagnosis.trim() || "Новый случай"}
            </p>
            <p className="truncate text-xs text-muted">{saveLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Удалить</span>
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-3 py-5 sm:px-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <FileGallery caseId={item.id} files={item.files} onChanged={onFilesChanged} />

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Диагноз</span>
            <input
              value={item.diagnosis}
              onChange={(event) => scheduleSave({ diagnosis: event.target.value })}
              onBlur={() => void persist()}
              placeholder="Например, перелом лучевой кости"
              className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 text-base outline-none ring-accent/30 focus:border-accent focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Описание</span>
            <textarea
              value={item.description}
              onChange={(event) => scheduleSave({ description: event.target.value })}
              onBlur={() => void persist()}
              placeholder="Клиническая картина, область исследования, особенности снимков"
              rows={6}
              className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 text-base leading-7 outline-none ring-accent/30 focus:border-accent focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Комментарии</span>
            <textarea
              value={item.comments}
              onChange={(event) => scheduleSave({ comments: event.target.value })}
              onBlur={() => void persist()}
              placeholder="Заметки, динамика, вопросы коллегам"
              rows={8}
              className="mt-2 min-h-40 w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 text-base leading-7 outline-none ring-accent/30 focus:border-accent focus:ring-4"
            />
          </label>
        </section>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить случай?"
        message="Будут удалены диагноз, описание, комментарии и все прикреплённые файлы."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeCase()}
      />
    </div>
  );
}
