import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { saveStaffHousesAction } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function StaffHouses({ params }: PageProps<"/admin/staff/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
  if (!member) notFound();

  const [customers, members] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.name)),
    db.select().from(schema.staff),
  ]);
  const staffName = new Map(members.map((m) => [m.id, m.name]));

  return (
    <form action={saveStaffHousesAction} className="space-y-3">
      <input type="hidden" name="staffId" value={member.id} />
      <input type="hidden" name="returnTo" value="/admin/staff" />
      <section className="card">
        <h1 className="font-semibold">Houses for {member.name}</h1>
        <p className="mt-1 text-xs text-gray-500">
          Tick the houses {member.name} delivers to. Ticking a house assigned to someone else moves it to {member.name}.
        </p>
      </section>
      <ul className="card divide-y p-0">
        {customers.map((c) => {
          const other = c.assignedStaffId && c.assignedStaffId !== member.id ? staffName.get(c.assignedStaffId) : null;
          return (
            <li key={c.id}>
              <label className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  name="userId"
                  value={c.id}
                  defaultChecked={c.assignedStaffId === member.id}
                  className="mt-1 size-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-gray-500">{c.address || "No address"}</span>
                  {other && <span className="block text-xs text-amber-700">Currently: {other}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 bg-[#f7f6f2] py-3">
        <SubmitButton className="btn-primary w-full">Save houses</SubmitButton>
      </div>
    </form>
  );
}
