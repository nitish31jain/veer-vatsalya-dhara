import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";

/** TEST_MODE=true charges ₹1 per packet and offers test-only plans (e.g. Daily). */
export function isTestMode() {
  return process.env.TEST_MODE === "true";
}

export function effectivePricePaise(plan: Plan) {
  return isTestMode() ? plan.tokens * 100 : plan.pricePaise;
}

export function isPlanPurchasable(plan: Plan) {
  return plan.active && (!plan.testOnly || isTestMode());
}

export async function purchasablePlans() {
  const plans = await db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.active, true))
    .orderBy(asc(schema.plans.sortOrder));
  return plans.filter(isPlanPurchasable);
}
