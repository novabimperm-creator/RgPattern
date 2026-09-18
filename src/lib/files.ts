const IMAGE_MIME =
  /^(image\/(jpeg|pjpeg|png|x-png|gif|webp|bmp|svg\+xml|tiff|x-icon|vnd\.microsoft\.icon|avif|heic|heif))$/i;

const IMAGE_EXT =
  /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|ico|avif|heic|heif)$/i;

const NON_PREVIEWABLE = /(dicom|\.dcm$|\.nii(\.gz)?$|\.nrrd$)/i;

export const MAX_FILE_SIZE = 200 * 1024 * 1024;

export function isPreviewableImage(mimeType: string, originalName: string): boolean {
  if (NON_PREVIEWABLE.test(mimeType) || NON_PREVIEWABLE.test(originalName)) {
    return false;
  }
  return IMAGE_MIME.test(mimeType) || IMAGE_EXT.test(originalName);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
  return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function fileUrl(id: string, download = false): string {
  return download ? `/api/files/${id}?download=1` : `/api/files/${id}`;
}

export function contentDisposition(filename: string, kind: "inline" | "attachment"): string {
  const fallback = filename.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${kind}; filename="${fallback || "file"}"; filename*=UTF-8''${encoded}`;
}
