import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="mt-2 text-muted">Проверьте адрес или вернитесь к списку случаев.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-white"
      >
        К архиву
      </Link>
    </main>
  );
}
