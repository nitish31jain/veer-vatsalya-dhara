import { getLocale } from "@/i18n/server";
import { setLocaleAction } from "@/i18n/actions";

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
] as const;

export async function LanguageSwitch() {
  const locale = await getLocale();
  return (
    <form action={setLocaleAction} className="flex rounded-full bg-gray-100 p-0.5 text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          name="locale"
          value={o.value}
          aria-pressed={locale === o.value}
          className={`rounded-full px-2.5 py-1 ${
            locale === o.value ? "bg-white font-semibold text-brand-700 shadow-sm" : "text-gray-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </form>
  );
}
