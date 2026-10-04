import { requireAdmin } from "@/lib/session";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUserById } from "@/auth";
import { getBalance } from "@/lib/tokens";
import { TOKEN_VALIDITY_DAYS, formatDate, rupees } from "@/lib/format";
import { getT } from "@/i18n/server";
import { grantTokensAction } from "../../actions";
import { ActivityLog } from "@/components/ActivityLog";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function CustomerDetail({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getUserById(id);
  if (!user) notFound();

  const [{ balance }, batches, deliveries, orders] = await Promise.all([
    getBalance(id),
    db.select().from(schema.tokenBatches).where(eq(schema.tokenBatches.userId, id)).orderBy(desc(schema.tokenBatches.purchasedAt)),
    db.select().from(schema.deliveries).where(eq(schema.deliveries.userId, id)).orderBy(desc(schema.deliveries.deliveryDate)).limit(60),
    db.select().from(schema.orders).where(eq(schema.orders.userId, id)).orderBy(desc(schema.orders.createdAt)).limit(30),
  ]);
  const now = new Date();

  return (
    <>
      <ErrorBanner error={sp.error} />
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{user.name}</h1>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            {user.whatsapp && (
              <a href={`https://wa.me/91${user.whatsapp}`} target="_blank" rel="noreferrer" className="text-sm text-brand-700">
                WhatsApp +91 {user.whatsapp}
              </a>
            )}
            {user.address && <p className="mt-1 text-sm text-gray-600">{user.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{balance}</p>
            <p className="text-xs text-gray-500">{t.admin.activeTokens}</p>
          </div>
        </div>
      </section>

      <ActivityLog userId={user.id} limit={50} />

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.admin.addTokensTitle}</h2>
        <p className="mb-3 text-xs text-gray-500">{t.admin.addTokensHelp(TOKEN_VALIDITY_DAYS)}</p>
        <form action={grantTokensAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="returnTo" value={`/admin/customers/${user.id}`} />
          <input name="tokens" type="number" min={1} max={1000} required placeholder={t.admin.tokensPlaceholder} className="input w-28" />
          <input name="note" placeholder={t.admin.notePlaceholder} className="input min-w-0 flex-1" />
          <SubmitButton className="btn-primary w-full sm:w-auto">{t.common.add}</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.admin.tokenPacks}</h2>
        <ul className="divide-y text-sm">
          {batches.map((b) => {
            const expired = b.expiresAt <= now;
            return (
              <li key={b.id} className={`flex justify-between py-2 ${expired ? "text-gray-400" : ""}`}>
                <span>
                  {t.admin.packLeft(b.tokensRemaining, b.tokensTotal)}
                  <span className="block text-xs">
                    {b.source === "manual" ? t.admin.manual(b.note ?? "") : t.admin.purchased} ·{" "}
                    {formatDate(b.purchasedAt, locale)}
                  </span>
                </span>
                <span className="text-right">
                  {expired ? t.admin.expired : t.admin.expires} {formatDate(b.expiresAt, locale)}
                </span>
              </li>
            );
          })}
          {batches.length === 0 && <li className="py-2 text-gray-500">{t.common.none}</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.admin.deliveries}</h2>
        <ul className="divide-y text-sm">
          {deliveries.map((d) => (
            <li key={d.id} className="flex justify-between py-2">
              <span>{formatDate(d.deliveryDate, locale)}</span>
              <span>{t.common.packetsShort(d.packets)}</span>
            </li>
          ))}
          {deliveries.length === 0 && <li className="py-2 text-gray-500">{t.common.none}</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.admin.orders}</h2>
        <ul className="divide-y text-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex justify-between py-2">
              <span>
                {o.planName} · {rupees(o.amountPaise)}
                <span className="block text-xs text-gray-500">
                  {o.id} · {formatDate(o.createdAt, locale)}
                </span>
              </span>
              <span className="text-xs">{o.status}</span>
            </li>
          ))}
          {orders.length === 0 && <li className="py-2 text-gray-500">{t.common.none}</li>}
        </ul>
      </section>
    </>
  );
}
