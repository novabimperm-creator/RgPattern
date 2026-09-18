"use client";

import { useCallback, useEffect, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { fileUrl } from "@/lib/files";
import { ChevronIcon, CloseIcon, DownloadIcon } from "./Icons";

type LightboxProps = {
  files: CaseFile[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function Lightbox({ files, index, onClose, onIndexChange }: LightboxProps) {
  const current = files[index];
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (files.length === 0) return;
      const next = (index + delta + files.length) % files.length;
      onIndexChange(next);
    },
    [files.length, index, onIndexChange],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр снимка"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current.originalName}</p>
          <p className="text-xs text-film-muted">
            {index + 1} из {files.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={fileUrl(current.id, true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
            aria-label="Скачать снимок"
            onClick={(event) => event.stopPropagation()}
          >
            <DownloadIcon className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
            aria-label="Закрыть"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart == null) return;
          const delta = event.changedTouches[0].clientX - touchStart;
          if (Math.abs(delta) > 50) go(delta > 0 ? -1 : 1);
          setTouchStart(null);
        }}
      >
        {files.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-2 hidden min-h-12 min-w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
              aria-label="Предыдущий снимок"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
            >
              <ChevronIcon direction="left" className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="absolute right-2 hidden min-h-12 min-w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
              aria-label="Следующий снимок"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
            >
              <ChevronIcon direction="right" className="h-6 w-6" />
            </button>
          </>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(current.id)}
          alt={current.originalName}
          className="h-[min(80dvh,920px)] w-auto max-w-[min(100%,1200px)] object-contain select-none"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}
