import Link from "next/link";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { getBalance } from "@/lib/tokens";
import { daysUntil, formatDate, rupees, TOKEN_VALIDITY_DAYS } from "@/lib/format";
import { BuyButton } from "@/components/BuyButton";
import { ActivityLog } from "@/components/ActivityLog";
import { effectivePricePaise, purchasablePlans } from "@/lib/plans";
import { isTestModeOn } from "@/lib/settings";
import { getT, planText } from "@/i18n/server";

export default async function Dashboard() {
  const { user, access } = await requireUser();
  const now = new Date();
  const testPricing = access.isAdmin && (await isTestModeOn());
  const { t, locale } = await getT();

  const [{ balance, nextExpiry }, plans, batches, recentDeliveries, recentOrders, allPlans] = await Promise.all([
    getBalance(user.id),
    purchasablePlans(testPricing),
    db
      .select()
      .from(schema.tokenBatches)
      .where(
        and(
          eq(schema.tokenBatches.userId, user.id),
          gt(schema.tokenBatches.tokensRemaining, 0),
          gt(schema.tokenBatches.expiresAt, now),
        ),
      )
      .orderBy(asc(schema.tokenBatches.expiresAt)),
    db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.userId, user.id))
      .orderBy(desc(schema.deliveries.deliveryDate))
      .limit(10),
    db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, user.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(5),
    db.select().from(schema.plans),
  ]);
  // Orders keep the English plan name; show the plan's current name in the chosen language.
  const planById = new Map(allPlans.map((p) => [p.id, p]));
  const orderPlanName = (o: (typeof recentOrders)[number]) => {
    const plan = o.planId ? planById.get(o.planId) : undefined;
    return plan ? planText(plan, locale).name : o.planName;
  };

  const expiringSoon = nextExpiry && daysUntil(nextExpiry) <= 7;

  return (
    <>
      <section className="rounded-2xl bg-brand-600 p-5 text-white shadow-sm">
        <p className="text-sm opacity-90">{t.dashboard.totalTokens}</p>
        <p className="mt-1 text-5xl font-bold">{balance}</p>
        <p className="text-sm opacity-90">{t.dashboard.litres(balance)}</p>
        {nextExpiry && (
          <p className={`mt-3 text-sm ${expiringSoon ? "font-semibold text-amber-200" : "opacity-90"}`}>
            {expiringSoon ? "⚠️ " : ""}
            {t.dashboard.expiring(
              batches
                .filter((b) => b.expiresAt.getTime() === nextExpiry.getTime())
                .reduce((n, b) => n + b.tokensRemaining, 0),
              formatDate(nextExpiry, locale),
              daysUntil(nextExpiry),
            )}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t.dashboard.buyTokens}</h2>
        {plans.length === 0 ? (
          <p className="card text-sm text-gray-500">{t.dashboard.noPlans}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const text = planText(p, locale);
              return (
                <div key={p.id} className="card flex flex-col gap-3">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-semibold">{text.name}</h3>
                      <span className="text-lg font-bold text-brand-700">
                        {rupees(effectivePricePaise(p, testPricing))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {text.description || t.dashboard.planDefaultDescription(p.tokens)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t.dashboard.planMeta(
                        p.tokens,
                        rupees(Math.round(effectivePricePaise(p, testPricing) / p.tokens)),
                        TOKEN_VALIDITY_DAYS,
                      )}
                    </p>
                  </div>
                  <BuyButton
                    planId={p.id}
                    label={t.dashboard.buy(text.name)}
                    openingText={t.dashboard.openingPayment}
                    errorText={t.dashboard.somethingWrong}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.dashboard.recentDeliveries}</h2>
        {recentDeliveries.length === 0 ? (
          <p className="text-sm text-gray-500">{t.dashboard.noDeliveries}</p>
        ) : (
          <ul className="divide-y text-sm">
            {recentDeliveries.map((d) => (
              <li key={d.id} className="flex justify-between py-2">
                <span>{formatDate(d.deliveryDate, locale)}</span>
                <span className="text-gray-600">{t.common.packets(d.packets)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActivityLog userId={user.id} />

      {recentOrders.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">{t.dashboard.recentPayments}</h2>
          <ul className="divide-y text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>
                  {orderPlanName(o)} · {rupees(o.amountPaise)}
                  <span className="block text-xs text-gray-500">{formatDate(o.createdAt, locale)}</span>
                </span>
                {o.status === "PENDING" ? (
                  <Link href={`/payment/return?order_id=${o.id}`} className="text-xs text-brand-700 underline">
                    {t.dashboard.checkStatus}
                  </Link>
                ) : (
                  <StatusBadge status={o.status} label={o.status === "PAID" ? t.dashboard.paid : t.dashboard.failed} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? "bg-gray-100"}`}>{label}</span>;
}
