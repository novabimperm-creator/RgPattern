"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseFile, MedicalCase, PublicUser } from "@/lib/types";
import { permissionsFor } from "@/lib/types";
import { formatDateTime } from "@/lib/files";
import { isOrganSystemId, organSystemById, ORGAN_SYSTEMS } from "@/lib/systems";
import { AuthNav } from "./AuthNav";
import { ConfirmDialog } from "./ConfirmDialog";
import { FileGallery } from "./FileGallery";
import { ArrowLeftIcon, TrashIcon } from "./Icons";

type CaseDetailProps = {
  initialCase: MedicalCase;
  viewer: PublicUser | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type CaseForm = {
  system: string;
  diagnosis: string;
  description: string;
  comments: string;
};

function formFromCase(item: MedicalCase): CaseForm {
  return {
    system: item.system,
    diagnosis: item.diagnosis,
    description: item.description,
    comments: item.comments,
  };
}

function formsEqual(a: CaseForm, b: CaseForm) {
  return (
    a.system === b.system &&
    a.diagnosis === b.diagnosis &&
    a.description === b.description &&
    a.comments === b.comments
  );
}

export function CaseDetail({ initialCase, viewer }: CaseDetailProps) {
  const router = useRouter();
  const [item, setItem] = useState<MedicalCase>(initialCase);
  const [form, setForm] = useState<CaseForm>(() => formFromCase(initialCase));
  const [savedForm, setSavedForm] = useState<CaseForm>(() => formFromCase(initialCase));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const caseId = initialCase.id;
  const { canEdit, canDelete } = permissionsFor(viewer);
  const dirty = canEdit && !formsEqual(form, savedForm);
  const saving = saveState === "saving";

  const persist = useCallback(async () => {
    if (!canEdit || saving) return false;
    if (!isOrganSystemId(form.system)) {
      setSaveState("error");
      return false;
    }
    setSaveState("saving");
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("save failed");
      const payload = (await response.json()) as MedicalCase;
      setItem((current) => ({
        ...current,
        system: payload.system,
        diagnosis: payload.diagnosis,
        description: payload.description,
        comments: payload.comments,
        updatedAt: payload.updatedAt,
      }));
      setSavedForm(form);
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [canEdit, caseId, form, saving]);

  function patchForm(patch: Partial<CaseForm>) {
    if (!canEdit) return;
    setForm((current) => ({ ...current, ...patch }));
    setSaveState((current) => (current === "saving" ? current : "idle"));
  }

  function leave() {
    router.push("/");
    router.refresh();
  }

  function requestLeave() {
    if (dirty || saving) {
      setConfirmLeave(true);
      return;
    }
    leave();
  }

  const onFilesChanged = useCallback((files: CaseFile[]) => {
    setItem((current) => ({ ...current, files }));
  }, []);

  useEffect(() => {
    if (!dirty && !saving) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  useEffect(() => {
    if (!canEdit) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (dirty && !saving) void persist();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, dirty, persist, saving]);

  async function removeCase() {
    const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/");
      router.refresh();
    }
  }

  const selectedSystem = organSystemById(form.system);
  const systemMissing = !isOrganSystemId(form.system);
  const saveLabel =
    saveState === "saving"
      ? "Сохранение…"
      : dirty
        ? "Есть несохранённые изменения"
        : saveState === "saved"
          ? "Сохранено"
          : saveState === "error"
            ? systemMissing
              ? "Выберите систему"
              : "Ошибка сохранения"
            : `Обновлён ${formatDateTime(item.updatedAt)}`;
  const saveDisabled = !dirty || saving;

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={requestLeave}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-surface"
            aria-label="Назад к списку"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {form.diagnosis.trim() || "Новый случай"}
            </p>
            <p className="truncate text-xs text-muted">
              {selectedSystem ? `${selectedSystem.label} · ` : ""}
              {canEdit ? saveLabel : `Обновлён ${formatDateTime(item.updatedAt)}`}
            </p>
          </div>
          {canEdit ? (
            <SaveButton disabled={saveDisabled} saving={saving} onClick={() => void persist()} compact />
          ) : null}
          <AuthNav viewer={viewer} />
          {canDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Удалить</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-3 py-5 sm:px-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <FileGallery
          caseId={item.id}
          files={item.files}
          canEdit={canEdit}
          canDelete={canDelete}
          onChanged={onFilesChanged}
        />

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Система
              {canEdit ? <span className="text-danger"> *</span> : null}
            </span>
            {canEdit ? (
              <select
                value={form.system}
                required
                onChange={(event) => patchForm({ system: event.target.value })}
                className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 text-base outline-none ring-accent/30 focus:border-accent focus:ring-4"
              >
                <option value="" disabled>
                  Выберите систему органов
                </option>
                {ORGAN_SYSTEMS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-2 rounded-xl border border-line bg-bg px-3 py-3 text-base">
                {selectedSystem?.label || "Не указана"}
              </p>
            )}
            {canEdit && !selectedSystem ? (
              <p className="mt-2 text-sm text-danger">Обязательное поле — без системы случай не сохранится.</p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Заключение</span>
            <input
              value={form.diagnosis}
              onChange={(event) => patchForm({ diagnosis: event.target.value })}
              readOnly={!canEdit}
              placeholder="Например, перелом лучевой кости"
              className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 text-base outline-none ring-accent/30 focus:border-accent focus:ring-4 read-only:focus:border-line read-only:focus:ring-0"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Описание</span>
            <textarea
              value={form.description}
              onChange={(event) => patchForm({ description: event.target.value })}
              readOnly={!canEdit}
              placeholder="Клиническая картина, область исследования, особенности снимков"
              rows={6}
              className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 text-base leading-7 outline-none ring-accent/30 focus:border-accent focus:ring-4 read-only:focus:border-line read-only:focus:ring-0"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Заметки</span>
            <textarea
              value={form.comments}
              onChange={(event) => patchForm({ comments: event.target.value })}
              readOnly={!canEdit}
              placeholder="Динамика, вопросы коллегам"
              rows={8}
              className="mt-2 min-h-40 w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 text-base leading-7 outline-none ring-accent/30 focus:border-accent focus:ring-4 read-only:focus:border-line read-only:focus:ring-0"
            />
          </label>

          {canEdit ? (
            <SaveButton disabled={saveDisabled} saving={saving} onClick={() => void persist()} />
          ) : null}
        </section>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить случай?"
        message="Будут удалены система, заключение, описание, заметки и все прикреплённые файлы."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeCase()}
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Уйти без сохранения?"
        message="Изменения в системе, заключении, описании и заметках будут потеряны."
        confirmLabel="Уйти"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={leave}
      />
    </div>
  );
}

function SaveButton({
  disabled,
  saving,
  onClick,
  compact = false,
}: {
  disabled: boolean;
  saving: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        compact
          ? "inline-flex min-h-11 shrink-0 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 sm:px-4"
          : "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 sm:w-auto"
      }
    >
      {saving ? "Сохранение…" : "Сохранить"}
    </button>
  );
}
