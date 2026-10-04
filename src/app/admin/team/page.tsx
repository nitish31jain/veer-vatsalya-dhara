import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { ownerEmails } from "@/lib/access";
import { addTeamMemberAction, updateTeamMemberAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

const RETURN = "/admin/team";

export default async function TeamPage({ searchParams }: PageProps<"/admin/team">) {
  const { actor } = await requireAdmin();
  const sp = await searchParams;
  const members = await db.select().from(schema.staff).orderBy(asc(schema.staff.role), asc(schema.staff.name));

  return (
    <>
      <ErrorBanner error={sp.error} />
      <section className="card">
        <h1 className="font-semibold">Add a team member</h1>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          They sign in with Google using this email. <b>Delivery staff</b> only see today’s delivery list.{" "}
          <b>Admins</b> get the full admin console and can also mark deliveries.
        </p>
        <form action={addTeamMemberAction} className="space-y-3">
          <input type="hidden" name="returnTo" value={RETURN} />
          <input name="name" required placeholder="Name" className="input" />
          <input name="email" type="email" required placeholder="Google email (e.g. ramesh@gmail.com)" className="input" />
          <select name="role" defaultValue="delivery" className="input" aria-label="Role">
            <option value="delivery">Delivery staff</option>
            <option value="admin">Admin</option>
          </select>
          <SubmitButton className="btn-primary w-full">Give access</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Owners</h2>
        <p className="mb-2 text-xs text-gray-500">Always admins. Changed only in Vercel settings (ADMIN_EMAILS).</p>
        <ul className="divide-y text-sm">
          {ownerEmails().map((e) => (
            <li key={e} className="py-2">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <ul className="space-y-2">
        {members.map((m) => {
          const isSelf = m.email === actor.email;
          return (
            <li key={m.id} className={`card ${m.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.name}{" "}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        m.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {m.role === "admin" ? "Admin" : "Delivery"}
                    </span>
                  </p>
                  <p className="truncate text-sm text-gray-500">{m.email}</p>
                  {!m.active && <p className="text-xs text-red-700">Access removed</p>}
                </div>
              </div>
              {isSelf ? (
                <p className="mt-3 text-xs text-gray-500">This is you.</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <form action={updateTeamMemberAction} className="flex-1">
                    <input type="hidden" name="staffId" value={m.id} />
                    <input type="hidden" name="role" value={m.role === "admin" ? "delivery" : "admin"} />
                    <input type="hidden" name="returnTo" value={RETURN} />
                    <SubmitButton className="btn-secondary min-h-9 w-full text-sm">
                      {m.role === "admin" ? "Make delivery only" : "Make admin"}
                    </SubmitButton>
                  </form>
                  <form action={updateTeamMemberAction} className="flex-1">
                    <input type="hidden" name="staffId" value={m.id} />
                    <input type="hidden" name="active" value={String(!m.active)} />
                    <input type="hidden" name="returnTo" value={RETURN} />
                    <SubmitButton className="btn-secondary min-h-9 w-full text-sm">
                      {m.active ? "Remove access" : "Restore access"}
                    </SubmitButton>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
