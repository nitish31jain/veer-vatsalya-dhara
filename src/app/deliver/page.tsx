import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/session";
import { activeBalances } from "@/lib/admin-queries";
import { formatDate, todayIST } from "@/lib/format";
import { adminUndoTodayAction, staffMarkDeliveryAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { getT } from "@/i18n/server";

export default async function DeliverPage({ searchParams }: PageProps<"/deliver">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const today = todayIST();
  const { t, locale } = await getT();

  const [houses, balances, todays] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.name)),
    activeBalances(),
    db.select().from(schema.deliveries).where(eq(schema.deliveries.deliveryDate, today)),
  ]);
  const deliveredBy = new Map(todays.map((d) => [d.userId, d]));

  const rows = houses
    // Every customer with active tokens is on the list automatically.
    .filter((h) => (balances.get(h.id) ?? 0) > 0 || deliveredBy.has(h.id))
    .filter(
      (h) =>
        !q ||
        h.name.toLowerCase().includes(q) ||
        (h.address ?? "").toLowerCase().includes(q) ||
        (h.whatsapp ?? "").includes(q),
    );
  const done = rows.filter((h) => deliveredBy.has(h.id)).length;

  return (
    <>
      <ErrorBanner error={sp.error} />
      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-semibold">{formatDate(today, locale)}</h1>
          <p className="text-sm font-medium text-gray-600">{t.deliver.progress(done, rows.length)}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-brand-600" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder={t.deliver.searchPlaceholder} className="input" />
          <button className="btn-secondary">{t.common.search}</button>
        </form>
      </section>

      {rows.length === 0 && (
        <p className="card text-sm text-gray-600">
          {q ? t.deliver.noMatch : t.deliver.noCustomers}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((h) => {
          const delivery = deliveredBy.get(h.id);
          const balance = balances.get(h.id) ?? 0;
          return (
            <li key={h.id} className={`card ${delivery ? "bg-brand-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-sm text-gray-600">{h.address || t.deliver.noAddress}</p>
                  {h.whatsapp && (
                    <a href={`tel:+91${h.whatsapp}`} className="text-sm text-brand-700">
                      📞 +91 {h.whatsapp}
                    </a>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold ${balance <= 2 ? "text-amber-600" : ""}`}>{balance}</p>
                  <p className="text-xs text-gray-500">{t.common.tokens}</p>
                </div>
              </div>

              {delivery ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-700">
                    {t.deliver.delivered(delivery.packets)}
                    {staff.isAdmin && (
                      <span className="block text-xs font-normal text-gray-500">{t.deliver.by(delivery.markedBy)}</span>
                    )}
                  </span>
                  {staff.isAdmin && (
                    <form action={adminUndoTodayAction}>
                      <input type="hidden" name="deliveryId" value={delivery.id} />
                      <input type="hidden" name="q" value={q} />
                      <SubmitButton className="btn-secondary min-h-9 text-sm">{t.common.undo}</SubmitButton>
                    </form>
                  )}
                </div>
              ) : balance === 0 ? (
                <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
                  {t.deliver.noTokens}
                </p>
              ) : (
                <form action={staffMarkDeliveryAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="userId" value={h.id} />
                  <input type="hidden" name="q" value={q} />
                  <select name="packets" defaultValue="1" className="input w-28" aria-label={t.common.packetsLabel}>
                    {Array.from({ length: Math.min(balance, 6) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {t.common.packetsShort(n)}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="btn-primary flex-1">{t.common.markDelivered}</SubmitButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
