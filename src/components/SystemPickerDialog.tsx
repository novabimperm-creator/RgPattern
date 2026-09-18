"use client";

import { useEffect, useState } from "react";
import { ORGAN_SYSTEMS, type OrganSystemId } from "@/lib/systems";

type SystemPickerDialogProps = {
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (system: OrganSystemId) => void;
};

export function SystemPickerDialog({
  pending = false,
  onCancel,
  onConfirm,
}: SystemPickerDialogProps) {
  const [selected, setSelected] = useState<OrganSystemId | "">("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-picker-title"
        className="flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col rounded-2xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="system-picker-title" className="text-lg font-semibold text-ink">
            Система органов
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Обязательное поле. Выберите систему, к которой относится случай.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {ORGAN_SYSTEMS.map((item) => {
            const active = selected === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-bg hover:border-accent/40"
                }`}
              >
                <p className="font-semibold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">{item.organs}</p>
                <p className="mt-1 text-sm leading-5 text-muted">{item.description}</p>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!selected || pending}
            onClick={() => {
              if (selected) onConfirm(selected);
            }}
            className="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Создание…" : "Создать случай"}
          </button>
        </div>
      </div>
    </div>
  );
}
