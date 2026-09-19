"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PublicUser } from "@/lib/types";

type ResetPasswordDialogProps = {
  user: PublicUser;
  pending?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
};

export function ResetPasswordDialog({
  user,
  pending = false,
  error = "",
  onCancel,
  onConfirm,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password.trim() !== confirm.trim()) {
      setLocalError("Пароли не совпадают");
      return;
    }
    setLocalError("");
    onConfirm(password);
  }

  const message = localError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void onSubmit(event)}
      >
        <h2 id="reset-password-title" className="text-lg font-semibold text-ink">
          Новый пароль для {user.username}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Задайте пароль вместо утерянного. Пользователь войдёт с ним сразу после сброса.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Новый пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setLocalError("");
              setPassword(event.target.value);
            }}
            minLength={8}
            required
            autoFocus
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none ring-accent/30 focus:border-accent focus:ring-4"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-medium">Повтор пароля</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => {
              setLocalError("");
              setConfirm(event.target.value);
            }}
            minLength={8}
            required
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none ring-accent/30 focus:border-accent focus:ring-4"
          />
        </label>
        {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Сохранение…" : "Сбросить пароль"}
          </button>
        </div>
      </form>
    </div>
  );
}
