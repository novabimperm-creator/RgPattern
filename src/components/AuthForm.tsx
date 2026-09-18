"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthFormProps = {
  configured: boolean;
  storageWarning?: string | null;
};

export function AuthForm({ configured, storageWarning }: AuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const wipeBlocked = Boolean(storageWarning) && !configured;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || wipeBlocked) return;
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
          username,
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
        {configured ? "Вход" : wipeBlocked ? "Логины тоже удалились" : "Создание суперадмина"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {configured
          ? "Смотреть снимки можно без входа. Добавлять, изменять и скачивать — только после авторизации."
          : wipeBlocked
            ? "Старые логин и пароль не подойдут: суперадмин и пользователи хранились в том же каталоге, что и снимки, и исчезли вместе с архивом. Сначала подключите Volume — и только потом создавайте суперадмина заново."
            : "Первый пользователь станет суперадмином: сможет удалять случаи и регистрировать коллег."}
      </p>
      {storageWarning ? (
        <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm leading-6 text-danger">
          {storageWarning}
        </p>
      ) : null}

      {wipeBlocked ? null : (
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5">
        <label className="block">
          <span className="text-sm font-semibold">Логин</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoFocus
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3 outline-none ring-accent/30 focus:border-accent focus:ring-4"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
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
          {pending ? "Проверка…" : configured ? "Войти" : "Создать суперадмина"}
        </button>
      </form>
      )}
      <Link href="/" className="mt-5 text-center text-sm text-muted hover:text-ink">
        К архиву без входа
      </Link>
    </main>
  );
}
