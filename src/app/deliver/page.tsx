import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/session";
import { activeBalances } from "@/lib/admin-queries";
import { formatDate, todayIST } from "@/lib/format";
import { staffMarkDeliveryAction, staffUndoDeliveryAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function DeliverPage({ searchParams }: PageProps<"/deliver">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const today = todayIST();

  const [houses, balances, todays] = await Promise.all([
    staff.isAdmin
      ? db.select().from(schema.users).orderBy(asc(schema.users.name))
      : db
          .select()
          .from(schema.users)
          .where(eq(schema.users.assignedStaffId, staff.staffId!))
          .orderBy(asc(schema.users.name)),
    activeBalances(),
    db.select().from(schema.deliveries).where(eq(schema.deliveries.deliveryDate, today)),
  ]);
  const deliveredBy = new Map(todays.map((d) => [d.userId, d]));

  const rows = houses
    // Admins see every house with tokens; delivery staff see all their assigned houses.
    .filter((h) => !staff.isAdmin || (balances.get(h.id) ?? 0) > 0 || deliveredBy.has(h.id))
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
          <h1 className="font-semibold">{formatDate(today)}</h1>
          <p className="text-sm text-gray-600">
            <b>{done}</b> of {rows.length} delivered
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-brand-600" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or address" className="input" />
          <button className="btn-secondary">Search</button>
        </form>
      </section>

      {houses.length === 0 && !staff.isAdmin && (
        <p className="card text-sm text-gray-600">No houses are assigned to you yet. Please ask the admin.</p>
      )}

      <ul className="space-y-2">
        {rows.map((h) => {
          const delivery = deliveredBy.get(h.id);
          const balance = balances.get(h.id) ?? 0;
          const canUndo = delivery && (staff.isAdmin || delivery.markedBy === staff.actor.email);
          return (
            <li key={h.id} className={`card ${delivery ? "bg-brand-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-sm text-gray-600">{h.address || "No address on file"}</p>
                  {h.whatsapp && (
                    <a href={`tel:+91${h.whatsapp}`} className="text-sm text-brand-700">
                      📞 +91 {h.whatsapp}
                    </a>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold ${balance <= 2 ? "text-amber-600" : ""}`}>{balance}</p>
                  <p className="text-xs text-gray-500">tokens</p>
                </div>
              </div>

              {delivery ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-700">
                    ✓ Delivered {delivery.packets} packet{delivery.packets > 1 ? "s" : ""}
                  </span>
                  {canUndo && (
                    <form action={staffUndoDeliveryAction}>
                      <input type="hidden" name="deliveryId" value={delivery.id} />
                      <input type="hidden" name="q" value={q} />
                      <SubmitButton className="btn-secondary min-h-9 text-sm" pendingText="Undoing…">
                        Undo
                      </SubmitButton>
                    </form>
                  )}
                </div>
              ) : balance === 0 ? (
                <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
                  No tokens left — do not deliver. Customer needs to buy tokens.
                </p>
              ) : (
                <form action={staffMarkDeliveryAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="userId" value={h.id} />
                  <input type="hidden" name="q" value={q} />
                  <select name="packets" defaultValue="1" className="input w-24" aria-label="Packets">
                    {Array.from({ length: Math.min(balance, 6) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} pkt
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="btn-primary flex-1" pendingText="Saving…">
                    Mark delivered
                  </SubmitButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
