import { requireAdmin } from "@/lib/session";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { savePlanAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function Plans({ searchParams }: PageProps<"/admin/plans">) {
  await requireAdmin();
  const sp = await searchParams;
  const plans = await db.select().from(schema.plans).orderBy(asc(schema.plans.sortOrder));
  return (
    <>
      <ErrorBanner error={sp.error} />
      <p className="text-sm text-gray-600">
        Price changes apply to new purchases only. Untick “Active” to hide a plan from customers.
      </p>
      {plans.map((p) => (
        <PlanForm key={p.id} plan={p} />
      ))}
      <h2 className="pt-2 font-semibold">Add a plan</h2>
      <PlanForm />
    </>
  );
}

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <form action={savePlanAction} className="card grid grid-cols-2 gap-3">
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      <input type="hidden" name="returnTo" value="/admin/plans" />
      <div className="col-span-2">
        <label className="label">Name</label>
        <input name="name" defaultValue={plan?.name} required className="input" placeholder="e.g. Weekly" />
      </div>
      <div className="col-span-2">
        <label className="label">Description</label>
        <input name="description" defaultValue={plan?.description ?? ""} className="input" placeholder="7 packets (0.5 L each)" />
      </div>
      <div>
        <label className="label">Tokens</label>
        <input name="tokens" type="number" min={1} defaultValue={plan?.tokens} required className="input" />
      </div>
      <div>
        <label className="label">Price (₹)</label>
        <input
          name="priceRupees"
          type="number"
          min={1}
          step="0.01"
          defaultValue={plan ? plan.pricePaise / 100 : undefined}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label">Sort order</label>
        <input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="input" />
      </div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input name="active" type="checkbox" defaultChecked={plan?.active ?? true} className="size-5" /> Active
      </label>
      <SubmitButton className="btn-primary col-span-2">{plan ? "Save" : "Add plan"}</SubmitButton>
    </form>
  );
}
