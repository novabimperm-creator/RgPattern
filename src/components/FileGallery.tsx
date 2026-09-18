"use client";

import { useRef, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { fileUrl, formatBytes } from "@/lib/files";
import { ConfirmDialog } from "./ConfirmDialog";
import { DownloadIcon, FileIcon, PlusIcon, TrashIcon } from "./Icons";
import { Lightbox } from "./Lightbox";

type FileGalleryProps = {
  caseId: string;
  files: CaseFile[];
  onChanged: (files: CaseFile[]) => void;
};

export function FileGallery({ caseId, files, onChanged }: FileGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CaseFile | null>(null);

  const images = files.filter((file) => file.isImage);
  const others = files.filter((file) => !file.isImage);

  async function uploadFiles(list: FileList | File[]) {
    const selected = Array.from(list).filter((file) => file.size > 0);
    if (selected.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      selected.forEach((file) => body.append("files", file));
      const response = await fetch(`/api/cases/${caseId}/files`, {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить файлы");
      }
      onChanged(payload.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файлы");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const file = pendingDelete;
    setPendingDelete(null);
    const response = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Не удалось удалить файл");
      return;
    }
    onChanged(payload.files);
  }

  function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Снимки и файлы</h2>
          <p className="mt-1 text-sm text-muted">
            Изображения открываются на сайте, остальные форматы можно скачать.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          Добавить
        </button>
      </div>

      <input
        id="case-files"
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
        }}
      />

      <label
        htmlFor="case-files"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition ${
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50"
        }`}
      >
        <p className="text-sm font-medium text-ink">
          {uploading ? "Загрузка…" : "Перетащите файлы сюда"}
        </p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
          JPEG, PNG, WebP, DICOM, PDF и другие форматы. На телефоне можно выбрать фото из галереи.
        </p>
      </label>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {images.map((file, index) => (
            <figure
              key={file.id}
              className="group relative overflow-hidden rounded-2xl bg-film shadow-sm"
            >
              <button
                type="button"
                className="block aspect-[4/3] w-full"
                onClick={() => setLightboxIndex(index)}
                aria-label={`Открыть ${file.originalName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(file.id)}
                  alt={file.originalName}
                  className="h-full w-full object-contain bg-film"
                />
              </button>
              <figcaption className="flex items-center justify-between gap-2 bg-film/90 px-2 py-2 text-xs text-white">
                <span className="min-w-0 truncate">{file.originalName}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <a
                    href={fileUrl(file.id, true)}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-white/10"
                    aria-label={`Скачать ${file.originalName}`}
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(file)}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-white/10"
                    aria-label={`Удалить ${file.originalName}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          Снимков пока нет — добавьте изображения, чтобы смотреть их здесь.
        </div>
      )}

      {others.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Файлы для скачивания</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {others.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-3 py-3">
                <FileIcon className="h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.originalName}</p>
                  <p className="text-xs text-muted">{formatBytes(file.size)}</p>
                </div>
                <a
                  href={fileUrl(file.id, true)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-bg"
                  aria-label={`Скачать ${file.originalName}`}
                >
                  <DownloadIcon className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPendingDelete(file)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"
                  aria-label={`Удалить ${file.originalName}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lightboxIndex != null ? (
        <Lightbox
          files={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        title="Удалить файл?"
        message={
          pendingDelete
            ? `Файл «${pendingDelete.originalName}» будет удалён без возможности восстановления.`
            : ""
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
