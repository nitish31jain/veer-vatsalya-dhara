import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDateTime } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  delivery: "Delivery",
  admin: "Admin",
  customer: "You",
  system: "",
};

/** Audit trail of every token change on a customer's account. */
export async function ActivityLog({ userId, limit = 20 }: { userId: string; limit?: number }) {
  const entries = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.userId, userId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);

  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">Token activity</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ul className="divide-y text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                {e.description}
                <span className="block text-xs text-gray-500">
                  {formatDateTime(e.createdAt)} · {e.actorName}
                  {ROLE_LABEL[e.actorRole] ? ` (${ROLE_LABEL[e.actorRole]})` : ""}
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
