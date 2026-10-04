import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";

/** Test pricing applies when test mode is on AND the buyer is an admin. */
export function effectivePricePaise(plan: Plan, testPricing: boolean) {
  return testPricing ? plan.tokens * 100 : plan.pricePaise;
}

export function isPlanPurchasable(plan: Plan, testPricing: boolean) {
  return plan.active && (!plan.testOnly || testPricing);
}

export async function purchasablePlans(testPricing: boolean) {
  const plans = await db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.active, true))
    .orderBy(asc(schema.plans.sortOrder));
  return plans.filter((p) => isPlanPurchasable(p, testPricing));
}
