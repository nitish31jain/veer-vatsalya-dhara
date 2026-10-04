import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBalances } from "@/lib/admin-queries";
import { ownerEmails } from "@/lib/access";
import { getT } from "@/i18n/server";

export default async function Customers({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const sp = await searchParams;
  const { t } = await getT();
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [users, balances] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.name)),
    activeBalances(),
  ]);
  const owners = ownerEmails();
  const rows = users.filter(
    (u) =>
      // Owners (ADMIN_EMAILS) run the business and aren't customers.
      !owners.includes(u.email.toLowerCase()) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.whatsapp ?? "").includes(q)),
  );

  return (
    <>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t.admin.customersSearchPlaceholder} className="input" />
        <button className="btn-secondary">{t.common.search}</button>
      </form>
      <p className="text-sm text-gray-500">{t.admin.customerCount(rows.length)}</p>
      <ul className="card divide-y p-0">
        {rows.map((u) => (
          <li key={u.id}>
            <Link
              href={`/admin/customers/${u.id}`}
              className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{u.name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {u.whatsapp ? `+91 ${u.whatsapp}` : t.admin.noWhatsapp} · {u.email}
                </span>
              </span>
              <span className="shrink-0 font-semibold">{balances.get(u.id) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
