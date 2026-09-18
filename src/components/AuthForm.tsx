"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AuthFormProps = {
  configured: boolean;
};

export function AuthForm({ configured }: AuthFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (!configured && password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: configured ? "login" : "setup",
          password,
          website,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось войти");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">RgPattern</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {configured ? "Вход в архив" : "Задайте пароль архива"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {configured
          ? "Доступ нужен, чтобы боты и посторонние не добавляли случаи и не видели снимки."
          : "Придумайте пароль — без него нельзя ни смотреть архив, ни создавать случаи. Не короче 8 символов."}
      </p>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5">
        <label className="block">
          <span className="text-sm font-semibold">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            autoFocus
            autoComplete={configured ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 outline-none ring-accent/30 focus:border-accent focus:ring-4"
          />
        </label>
        {configured ? null : (
          <label className="block">
            <span className="text-sm font-semibold">Повтор пароля</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 outline-none ring-accent/30 focus:border-accent focus:ring-4"
            />
          </label>
        )}
        <label className="absolute -left-[10000px] h-0 w-0 overflow-hidden opacity-0">
          Не заполняйте
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Проверка…" : configured ? "Войти" : "Сохранить пароль"}
        </button>
      </form>
    </main>
  );
}
