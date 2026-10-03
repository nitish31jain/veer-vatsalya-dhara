import { requireAdmin } from "@/lib/session";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUserById } from "@/auth";
import { getBalance } from "@/lib/tokens";
import { formatDate, rupees } from "@/lib/format";
import { assignCustomerAction, grantTokensAction } from "../../actions";
import { ActivityLog } from "@/components/ActivityLog";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function CustomerDetail({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getUserById(id);
  if (!user) notFound();

  const [{ balance }, batches, deliveries, orders, staffMembers] = await Promise.all([
    getBalance(id),
    db.select().from(schema.tokenBatches).where(eq(schema.tokenBatches.userId, id)).orderBy(desc(schema.tokenBatches.purchasedAt)),
    db.select().from(schema.deliveries).where(eq(schema.deliveries.userId, id)).orderBy(desc(schema.deliveries.deliveryDate)).limit(60),
    db.select().from(schema.orders).where(eq(schema.orders.userId, id)).orderBy(desc(schema.orders.createdAt)).limit(30),
    db.select().from(schema.staff).orderBy(asc(schema.staff.name)),
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
            <p className="text-xs text-gray-500">active tokens</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Delivery person</h2>
        <form action={assignCustomerAction} className="flex gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="returnTo" value={`/admin/customers/${user.id}`} />
          <select name="staffId" defaultValue={user.assignedStaffId ?? ""} className="input">
            <option value="">Not assigned (only admin can mark)</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.active && m.id !== user.assignedStaffId}>
                {m.name}
                {m.active ? "" : " (access removed)"}
              </option>
            ))}
          </select>
          <SubmitButton className="btn-secondary">Save</SubmitButton>
        </form>
      </section>

      <ActivityLog userId={user.id} limit={50} />

      <section className="card">
        <h2 className="mb-2 font-semibold">Add tokens manually</h2>
        <p className="mb-3 text-xs text-gray-500">For cash/UPI payments received outside the app. Valid 45 days from today.</p>
        <form action={grantTokensAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="returnTo" value={`/admin/customers/${user.id}`} />
          <input name="tokens" type="number" min={1} max={1000} required placeholder="Tokens" className="input w-28" />
          <input name="note" placeholder="Note (e.g. cash paid)" className="input min-w-0 flex-1" />
          <SubmitButton className="btn-primary w-full sm:w-auto">Add</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Token packs</h2>
        <ul className="divide-y text-sm">
          {batches.map((b) => {
            const expired = b.expiresAt <= now;
            return (
              <li key={b.id} className={`flex justify-between py-2 ${expired ? "text-gray-400" : ""}`}>
                <span>
                  {b.tokensRemaining}/{b.tokensTotal} left
                  <span className="block text-xs">
                    {b.source === "manual" ? `Manual: ${b.note}` : "Purchased"} · {formatDate(b.purchasedAt)}
                  </span>
                </span>
                <span className="text-right">
                  {expired ? "Expired" : "Expires"} {formatDate(b.expiresAt)}
                </span>
              </li>
            );
          })}
          {batches.length === 0 && <li className="py-2 text-gray-500">None</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Deliveries</h2>
        <ul className="divide-y text-sm">
          {deliveries.map((d) => (
            <li key={d.id} className="flex justify-between py-2">
              <span>{formatDate(d.deliveryDate)}</span>
              <span>{d.packets} pkt</span>
            </li>
          ))}
          {deliveries.length === 0 && <li className="py-2 text-gray-500">None</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Orders</h2>
        <ul className="divide-y text-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex justify-between py-2">
              <span>
                {o.planName} · {rupees(o.amountPaise)}
                <span className="block text-xs text-gray-500">
                  {o.id} · {formatDate(o.createdAt)}
                </span>
              </span>
              <span className="text-xs">{o.status}</span>
            </li>
          ))}
          {orders.length === 0 && <li className="py-2 text-gray-500">None</li>}
        </ul>
      </section>
    </>
  );
}
