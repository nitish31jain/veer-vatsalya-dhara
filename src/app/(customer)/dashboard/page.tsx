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

export default async function Dashboard() {
  const { user, access } = await requireUser();
  const now = new Date();
  const testPricing = access.isAdmin && (await isTestModeOn());

  const [{ balance, nextExpiry }, plans, batches, recentDeliveries, recentOrders] = await Promise.all([
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
  ]);

  const expiringSoon = nextExpiry && daysUntil(nextExpiry) <= 7;

  return (
    <>
      <section className="rounded-2xl bg-brand-600 p-5 text-white shadow-sm">
        <p className="text-sm opacity-90">Your total milk tokens</p>
        <p className="mt-1 text-5xl font-bold">{balance}</p>
        <p className="text-sm opacity-90">
          = {balance * 0.5} litres ({balance} × 0.5 L packets)
        </p>
        {nextExpiry && (
          <p className={`mt-3 text-sm ${expiringSoon ? "font-semibold text-amber-200" : "opacity-90"}`}>
            {expiringSoon ? "⚠️ " : ""}
            {batches
              .filter((b) => b.expiresAt.getTime() === nextExpiry.getTime())
              .reduce((n, b) => n + b.tokensRemaining, 0)}{" "}
            of these expire on {formatDate(nextExpiry)} ({daysUntil(nextExpiry)} days left)
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Buy tokens</h2>
        {plans.length === 0 ? (
          <p className="card text-sm text-gray-500">No plans available right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={p.id} className="card flex flex-col gap-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <span className="text-lg font-bold text-brand-700">{rupees(effectivePricePaise(p, testPricing))}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {p.description || `${p.tokens} packets of 0.5 L`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {p.tokens} tokens · {rupees(Math.round(effectivePricePaise(p, testPricing) / p.tokens))}/packet · valid{" "}
                    {TOKEN_VALIDITY_DAYS} days
                  </p>
                </div>
                <BuyButton planId={p.id} label={`Buy ${p.name}`} />
              </div>
            ))}
          </div>
        )}
      </section>


      <section className="card">
        <h2 className="mb-2 font-semibold">Recent deliveries</h2>
        {recentDeliveries.length === 0 ? (
          <p className="text-sm text-gray-500">No deliveries yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {recentDeliveries.map((d) => (
              <li key={d.id} className="flex justify-between py-2">
                <span>{formatDate(d.deliveryDate)}</span>
                <span className="text-gray-600">
                  {d.packets} packet{d.packets > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActivityLog userId={user.id} />

      {recentOrders.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Recent payments</h2>
          <ul className="divide-y text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>
                  {o.planName} · {rupees(o.amountPaise)}
                  <span className="block text-xs text-gray-500">{formatDate(o.createdAt)}</span>
                </span>
                {o.status === "PENDING" ? (
                  <Link href={`/payment/return?order_id=${o.id}`} className="text-xs text-brand-700 underline">
                    Check status
                  </Link>
                ) : (
                  <StatusBadge status={o.status} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? "bg-gray-100"}`}>
      {status === "PAID" ? "Paid" : "Failed"}
    </span>
  );
}
