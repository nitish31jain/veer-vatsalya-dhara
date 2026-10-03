import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { addStaffAction, setStaffActiveAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function StaffPage({ searchParams }: PageProps<"/admin/staff">) {
  await requireAdmin();
  const sp = await searchParams;
  const [members, houseCounts] = await Promise.all([
    db.select().from(schema.staff).orderBy(asc(schema.staff.name)),
    db
      .select({ staffId: schema.users.assignedStaffId, n: count() })
      .from(schema.users)
      .groupBy(schema.users.assignedStaffId),
  ]);
  const housesFor = new Map(houseCounts.map((h) => [h.staffId, h.n]));

  return (
    <>
      <ErrorBanner error={sp.error} />
      <section className="card">
        <h1 className="font-semibold">Add a delivery person</h1>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          They sign in with Google using this email and can only mark deliveries for the houses you assign to them, for
          today’s date.
        </p>
        <form action={addStaffAction} className="space-y-3">
          <input type="hidden" name="returnTo" value="/admin/staff" />
          <input name="name" required placeholder="Name" className="input" />
          <input name="email" type="email" required placeholder="Google email (e.g. ramesh@gmail.com)" className="input" />
          <SubmitButton className="btn-primary w-full">Authorise</SubmitButton>
        </form>
      </section>

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className={`card ${m.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {m.name} {!m.active && <span className="text-xs text-red-700">(access removed)</span>}
                </p>
                <p className="truncate text-sm text-gray-500">{m.email}</p>
                <p className="text-xs text-gray-500">{housesFor.get(m.id) ?? 0} houses assigned</p>
              </div>
              <form action={setStaffActiveAction}>
                <input type="hidden" name="staffId" value={m.id} />
                <input type="hidden" name="active" value={String(!m.active)} />
                <input type="hidden" name="returnTo" value="/admin/staff" />
                <SubmitButton className="btn-secondary min-h-9 text-sm">
                  {m.active ? "Remove access" : "Restore access"}
                </SubmitButton>
              </form>
            </div>
            <Link href={`/admin/staff/${m.id}`} className="btn-secondary mt-3 w-full text-sm">
              Assign houses
            </Link>
          </li>
        ))}
        {members.length === 0 && <li className="card text-sm text-gray-500">No delivery staff yet.</li>}
      </ul>
    </>
  );
}
