export const TOKEN_VALIDITY_DAYS = 45;
export const TZ = "Asia/Kolkata";

export function rupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export type Locale = "en" | "hi";
const intlLocale = (l: Locale) => (l === "hi" ? "hi-IN" : "en-IN");

export function formatDate(d: Date | string, locale: Locale = "en") {
  return new Date(d).toLocaleDateString(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Start of a YYYY-MM-DD day in IST, as a Date. */
export function istDayStart(day: string) {
  return new Date(`${day}T00:00:00+05:30`);
}

export function daysUntil(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function formatDateTime(d: Date | string, locale: Locale = "en") {
  return new Date(d).toLocaleString(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
}
