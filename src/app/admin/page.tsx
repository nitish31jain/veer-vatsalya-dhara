import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBalances } from "@/lib/admin-queries";
import { formatDate, todayIST } from "@/lib/format";
import { markAllAction, markDeliveryAction, undoDeliveryAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { getT } from "@/i18n/server";

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function DailyDeliveries({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayIST();
  const { t, locale } = await getT();
  const day = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const returnTo = `/admin?date=${day}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const [users, balances, dayDeliveries] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.name)),
    activeBalances(),
    db.select().from(schema.deliveries).where(eq(schema.deliveries.deliveryDate, day)),
  ]);
  const deliveredBy = new Map(dayDeliveries.map((d) => [d.userId, d]));

  const rows = users
    .filter((u) => (balances.get(u.id) ?? 0) > 0 || deliveredBy.has(u.id))
    .filter(
      (u) =>
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.whatsapp ?? "").includes(q) ||
        (u.address ?? "").toLowerCase().includes(q),
    );
  const pending = rows.filter((u) => !deliveredBy.has(u.id));
  const totalPackets = dayDeliveries.reduce((s, d) => s + d.packets, 0);

  return (
    <>
      <ErrorBanner error={sp.error} />

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/admin?date=${shiftDay(day, -1)}`} className="btn-secondary px-3" aria-label={t.admin.previousDay}>
            ‹
          </Link>
          <div className="text-center">
            <p className="font-semibold">{formatDate(day, locale)}</p>
            <p className="text-xs text-gray-500">{day === today ? t.common.today : "\u00a0"}</p>
          </div>
          <Link href={`/admin?date=${shiftDay(day, 1)}`} className="btn-secondary px-3" aria-label={t.admin.nextDay}>
            ›
          </Link>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="date" value={day} />
          <input name="q" defaultValue={q} placeholder={t.admin.dailySearchPlaceholder} className="input" />
          <button className="btn-secondary">{t.common.search}</button>
        </form>
        <p className="text-sm font-medium text-gray-600">
          {t.admin.summary(dayDeliveries.length, totalPackets, pending.length)}
        </p>
        {pending.length > 0 && (
          <form action={markAllAction}>
            <input type="hidden" name="date" value={day} />
            <input type="hidden" name="returnTo" value={returnTo} />
            {pending.map((u) => (
              <input key={u.id} type="hidden" name="userId" value={u.id} />
            ))}
            <SubmitButton className="btn-primary w-full">{t.admin.markAll(pending.length)}</SubmitButton>
          </form>
        )}
      </section>

      {rows.length === 0 && <p className="card text-sm text-gray-500">{t.admin.noActiveCustomers}</p>}

      <ul className="space-y-2">
        {rows.map((u) => {
          const delivery = deliveredBy.get(u.id);
          const balance = balances.get(u.id) ?? 0;
          return (
            <li key={u.id} className={`card ${delivery ? "bg-brand-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">
                    {u.name}
                  </Link>
                  {u.whatsapp && (
                    <a
                      href={`https://wa.me/91${u.whatsapp}`}
                      className="block text-sm text-brand-700"
                      target="_blank"
                      rel="noreferrer"
                    >
                      +91 {u.whatsapp}
                    </a>
                  )}
                  {u.address && <p className="truncate text-xs text-gray-500">{u.address}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold ${balance <= 2 ? "text-amber-600" : ""}`}>{balance}</p>
                  <p className="text-xs text-gray-500">{t.common.tokensLeft}</p>
                </div>
              </div>

              {delivery ? (
                <form action={undoDeliveryAction} className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-700">
                    {t.deliver.delivered(delivery.packets)}
                    <span className="block text-xs font-normal text-gray-500">{t.deliver.by(delivery.markedBy)}</span>
                  </span>
                  <input type="hidden" name="deliveryId" value={delivery.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton className="btn-secondary min-h-9 text-sm">{t.common.undo}</SubmitButton>
                </form>
              ) : (
                <form action={markDeliveryAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="date" value={day} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <select name="packets" defaultValue="1" className="input w-28" aria-label={t.common.packetsLabel}>
                    {Array.from({ length: Math.min(Math.max(balance, 1), 6) }, (_, i) => i + 1).map((n) => (
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
