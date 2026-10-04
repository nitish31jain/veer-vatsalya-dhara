import { requireAdmin } from "@/lib/session";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { savePlanAction, setTestModeAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { isTestModeOn } from "@/lib/settings";

export default async function Plans({ searchParams }: PageProps<"/admin/plans">) {
  await requireAdmin();
  const sp = await searchParams;
  const [plans, testMode] = await Promise.all([
    db.select().from(schema.plans).orderBy(asc(schema.plans.sortOrder)),
    isTestModeOn(),
  ]);
  return (
    <>
      <ErrorBanner error={sp.error} />
      <section className={`card ${testMode ? "ring-2 ring-amber-400" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Test mode: {testMode ? "ON" : "OFF"}</h2>
            <p className="mt-1 text-xs text-gray-600">
              When on, <b>admins</b> pay ₹1 per packet on every plan (and see “Test only” plans), so you can test
              real payments cheaply. Customers always pay the normal price.
            </p>
          </div>
          <form action={setTestModeAction}>
            <input type="hidden" name="on" value={String(!testMode)} />
            <input type="hidden" name="returnTo" value="/admin/plans" />
            <SubmitButton className={testMode ? "btn-secondary" : "btn-primary"}>
              {testMode ? "Turn off" : "Turn on"}
            </SubmitButton>
          </form>
        </div>
      </section>
      <p className="text-sm text-gray-600">
        Price changes apply to new purchases only. Untick “Active” to hide a plan from customers. “Test only” plans
        are shown only to admins while test mode is on.
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
      <div className="col-span-2">
        <label className="label">Sort order</label>
        <input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="input" />
      </div>
      <div className="col-span-2 flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input name="active" type="checkbox" defaultChecked={plan?.active ?? true} className="size-5" /> Active
        </label>
        <label className="flex items-center gap-2">
          <input name="testOnly" type="checkbox" defaultChecked={plan?.testOnly ?? false} className="size-5" /> Test only
        </label>
      </div>
      <SubmitButton className="btn-primary col-span-2">{plan ? "Save" : "Add plan"}</SubmitButton>
    </form>
  );
}
