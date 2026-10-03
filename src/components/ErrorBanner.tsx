export function ErrorBanner({ error }: { error?: string | string[] }) {
  if (typeof error !== "string") return null;
  return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{error}</div>;
}
