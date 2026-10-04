import { cookies } from "next/headers";
import type { Locale } from "@/lib/format";
import { en, hi } from "./dictionaries";

export const LOCALE_COOKIE = "lang";

/** The visitor's chosen language, remembered per device in a cookie. English by default. */
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get(LOCALE_COOKIE)?.value === "hi" ? "hi" : "en";
}

export async function getT() {
  const locale = await getLocale();
  return { t: locale === "hi" ? hi : en, locale };
}

/** Plan name/description in the current language, falling back to English. */
export function planText(plan: { name: string; nameHi?: string | null; description?: string | null; descriptionHi?: string | null }, locale: Locale) {
  return {
    name: (locale === "hi" && plan.nameHi) || plan.name,
    description: (locale === "hi" && plan.descriptionHi) || plan.description,
  };
}
