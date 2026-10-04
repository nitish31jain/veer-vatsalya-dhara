import { requireAdmin } from "@/lib/session";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { savePlanAction, setTestModeAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { isTestModeOn } from "@/lib/settings";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";

export default async function Plans({ searchParams }: PageProps<"/admin/plans">) {
  await requireAdmin();
  const sp = await searchParams;
  const { t } = await getT();
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
            <h2 className="font-semibold">{t.plans.testMode(testMode)}</h2>
            <p className="mt-1 text-xs text-gray-600">{t.plans.testModeHelp}</p>
          </div>
          <form action={setTestModeAction}>
            <input type="hidden" name="on" value={String(!testMode)} />
            <input type="hidden" name="returnTo" value="/admin/plans" />
            <SubmitButton className={testMode ? "btn-secondary" : "btn-primary"}>
              {testMode ? t.plans.turnOff : t.plans.turnOn}
            </SubmitButton>
          </form>
        </div>
      </section>
      <p className="text-sm text-gray-600">{t.plans.help}</p>
      {plans.map((p) => (
        <PlanForm key={p.id} plan={p} t={t} />
      ))}
      <h2 className="pt-2 font-semibold">{t.plans.addPlan}</h2>
      <PlanForm t={t} />
    </>
  );
}

function PlanForm({ plan, t }: { plan?: Plan; t: Dictionary }) {
  return (
    <form action={savePlanAction} className="card grid grid-cols-2 gap-3">
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      <input type="hidden" name="returnTo" value="/admin/plans" />
      <div className="col-span-2 sm:col-span-1">
        <label className="label">{t.plans.name}</label>
        <input name="name" defaultValue={plan?.name} required className="input" placeholder="e.g. Weekly" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="label">{t.plans.nameHi}</label>
        <input name="nameHi" defaultValue={plan?.nameHi ?? ""} className="input" placeholder="जैसे साप्ताहिक" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="label">{t.plans.description}</label>
        <input name="description" defaultValue={plan?.description ?? ""} className="input" placeholder="7 packets (0.5 L each)" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="label">{t.plans.descriptionHi}</label>
        <input
          name="descriptionHi"
          defaultValue={plan?.descriptionHi ?? ""}
          className="input"
          placeholder="7 पैकेट (हर एक 0.5 लीटर)"
        />
      </div>
      <div>
        <label className="label">{t.plans.tokens}</label>
        <input name="tokens" type="number" min={1} defaultValue={plan?.tokens} required className="input" />
      </div>
      <div>
        <label className="label">{t.plans.price}</label>
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
        <label className="label">{t.plans.sortOrder}</label>
        <input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="input" />
      </div>
      <div className="col-span-2 flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input name="active" type="checkbox" defaultChecked={plan?.active ?? true} className="size-5" /> {t.plans.active}
        </label>
        <label className="flex items-center gap-2">
          <input name="testOnly" type="checkbox" defaultChecked={plan?.testOnly ?? false} className="size-5" />{" "}
          {t.plans.testOnly}
        </label>
      </div>
      <SubmitButton className="btn-primary col-span-2">{plan ? t.common.save : t.plans.addPlanButton}</SubmitButton>
    </form>
  );
}
