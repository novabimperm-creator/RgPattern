"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { PublicUser, Role } from "@/lib/types";

export function UsersManager({ initialUsers }: { initialUsers: PublicUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось создать пользователя");
      setUsers((current) => [...current, payload]);
      setUsername("");
      setPassword("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать пользователя");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/80 bg-bg/85">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4">
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            ← К архиву
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Пользователи</h1>
          <p className="mt-1 text-sm text-muted">
            Новых пользователей регистрирует только суперадмин. Обычный пользователь может добавлять и
            изменять случаи и скачивать файлы, но не удалять их.
          </p>
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-3 rounded-2xl border border-line bg-surface p-4"
        >
          <h2 className="text-base font-semibold">Зарегистрировать</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Логин</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none ring-accent/30 focus:border-accent focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none ring-accent/30 focus:border-accent focus:ring-4"
              />
            </label>
          </div>
          <label className="block max-w-xs">
            <span className="text-sm font-medium">Роль</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none ring-accent/30 focus:border-accent focus:ring-4"
            >
              <option value="user">Пользователь</option>
              <option value="superadmin">Суперадмин</option>
            </select>
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Сохранение…" : "Создать пользователя"}
          </button>
        </form>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-base font-semibold">Резервная копия</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Скачайте случаи, снимки и учётные записи одним файлом. Делайте копию после больших загрузок —
            git push на Railway без Volume стирает архив.
          </p>
          <a
            href="/api/backup"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Скачать архив (tar.gz)
          </a>
        </section>

        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted">
                  {user.role === "superadmin" ? "суперадмин" : "пользователь"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
