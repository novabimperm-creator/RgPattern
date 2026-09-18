"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MedicalCase } from "@/lib/types";
import { fileUrl, formatDate, pluralRu } from "@/lib/files";
import { caseMatchesQuery, matchingTextFields } from "@/lib/search";
import { CloseIcon, ImageIcon, PlusIcon, SearchIcon } from "./Icons";

const FIELD_LABEL: Record<"diagnosis" | "description" | "comments", string> = {
  diagnosis: "диагнозу",
  description: "описанию",
  comments: "комментариям",
};

export function CaseList({ initialCases }: { initialCases: MedicalCase[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(
    () => initialCases.filter((item) => caseMatchesQuery(item, query)),
    [initialCases, query],
  );

  async function createCase() {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/cases", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось создать случай");
      router.push(`/cases/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать случай");
      setCreating(false);
    }
  }

  const searching = query.trim().length > 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                RgPattern
              </p>
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                Архив рентгена, КТ и МРТ
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void createCase()}
              disabled={creating}
              className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:opacity-60 md:inline-flex"
            >
              <PlusIcon className="h-5 w-5" />
              {creating ? "Создание…" : "Добавить случай"}
            </button>
          </div>

          <div>
            <label htmlFor="case-search" className="mb-1.5 block text-sm font-medium text-ink">
              Поиск по всем текстовым полям
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                id="case-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Диагноз, описание, комментарии"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-line bg-surface py-2.5 pl-11 pr-12 text-base outline-none ring-accent/30 focus:border-accent focus:ring-4 [&::-webkit-search-cancel-button]:hidden"
              />
              {searching ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-bg hover:text-ink"
                  aria-label="Очистить поиск"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {searching
                ? `Найдено ${pluralRu(filtered.length, "случай", "случая", "случаев")}`
                : "Ищет сразу по диагнозу, описанию и комментариям"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-28 pt-5 sm:px-4 md:pb-10">
        {error ? (
          <p className="mb-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState hasCases={initialCases.length > 0} onCreate={() => void createCase()} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <CaseCard
                  item={item}
                  query={query}
                  onOpen={() => router.push(`/cases/${item.id}`)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <button
        type="button"
        onClick={() => void createCase()}
        disabled={creating}
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 hover:bg-accent-hover md:hidden"
        aria-label="Добавить случай"
      >
        <PlusIcon className="h-7 w-7" />
      </button>
    </div>
  );
}

function CaseCard({
  item,
  query,
  onOpen,
}: {
  item: MedicalCase;
  query: string;
  onOpen: () => void;
}) {
  const cover = item.files.find((file) => file.isImage);
  const imageCount = item.files.filter((file) => file.isImage).length;
  const otherCount = item.files.length - imageCount;
  const matched = matchingTextFields(item, query);
  const onlyComments = matched.length === 1 && matched[0] === "comments";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] bg-film">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(cover.id)}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-film-muted">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-base font-semibold leading-6">
          {item.diagnosis.trim() || "Новый случай"}
        </h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {item.description.trim() || "Описание пока не заполнено"}
        </p>
        {onlyComments ? (
          <p className="text-xs font-medium text-accent">Совпадение в комментариях</p>
        ) : matched.length > 0 ? (
          <p className="text-xs text-muted">
            Совпадение по {matched.map((field) => FIELD_LABEL[field]).join(", ")}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted">
          <span>{formatDate(item.createdAt)}</span>
          <span>
            {item.files.length === 0
              ? "нет файлов"
              : [
                  imageCount ? pluralRu(imageCount, "фото", "фото", "фото") : "",
                  otherCount ? pluralRu(otherCount, "файл", "файла", "файлов") : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ hasCases, onCreate }: { hasCases: boolean; onCreate: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <SearchIcon className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold">
        {hasCases ? "Ничего не найдено" : "Пока нет случаев"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {hasCases
          ? "Попробуйте другой запрос — поиск идёт по диагнозу, описанию и комментариям."
          : "Нажмите «+», чтобы создать первый случай и прикрепить снимки рентгена, КТ или МРТ."}
      </p>
      {hasCases ? null : (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white"
        >
          <PlusIcon className="h-5 w-5" />
          Добавить случай
        </button>
      )}
    </div>
  );
}
