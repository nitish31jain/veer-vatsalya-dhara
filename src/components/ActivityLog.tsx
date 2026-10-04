import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, formatDateTime, rupees } from "@/lib/format";
import { getT } from "@/i18n/server";

/** Audit trail of every token change on a customer's account, in the chosen language. */
export async function ActivityLog({ userId, limit = 20 }: { userId: string; limit?: number }) {
  const { t, locale } = await getT();
  const entries = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.userId, userId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);

  const describe = (e: (typeof entries)[number]) => {
    const m = e.meta;
    if (!m) return e.description; // entries written before translations existed
    const date = m.day ? formatDate(m.day, locale) : "";
    switch (e.action) {
      case "purchase":
        return t.activity.purchase(
          (locale === "hi" && m.planNameHi) || m.planName || "",
          m.tokens ?? e.tokensDelta,
          rupees(m.amountPaise ?? 0),
        );
      case "grant":
        return t.activity.grant(m.tokens ?? e.tokensDelta, m.note ?? "");
      case "delivery":
        return t.activity.delivery(m.packets ?? -e.tokensDelta, date);
      case "delivery_undo":
        return t.activity.deliveryUndo(m.packets ?? e.tokensDelta, date);
      default:
        return e.description;
    }
  };
  const actorName = (e: (typeof entries)[number]) => (e.actorRole === "system" ? t.activity.onlinePayment : e.actorName);

  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">{t.activity.title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">{t.activity.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                {describe(e)}
                <span className="block text-xs text-gray-500">
                  {formatDateTime(e.createdAt, locale)} · {actorName(e)}
                  {t.activity.roles[e.actorRole] ? ` (${t.activity.roles[e.actorRole]})` : ""}
                </span>
              </span>
              <span className={`shrink-0 font-semibold ${e.tokensDelta < 0 ? "text-red-700" : "text-green-700"}`}>
                {e.tokensDelta > 0 ? "+" : ""}
                {e.tokensDelta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
