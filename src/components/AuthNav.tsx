"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/types";

export function AuthNav({ viewer }: { viewer: PublicUser | null }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
    router.refresh();
  }

  if (!viewer) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-surface"
      >
        Войти
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {viewer.role === "superadmin" ? (
        <Link
          href="/users"
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-surface"
        >
          Пользователи
        </Link>
      ) : null}
      <span className="hidden max-w-28 truncate text-sm text-muted sm:inline">{viewer.username}</span>
      <button
        type="button"
        onClick={() => void logout()}
        className="min-h-11 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
      >
        Выйти
      </button>
    </div>
  );
}
