import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const TEST_MODE = "test_mode";

/** When on, admins (only) are charged ₹1 per packet and can see "Test only" plans. */
export async function isTestModeOn() {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, TEST_MODE));
  return row?.value === "on";
}

export async function setTestMode(on: boolean, updatedBy: string) {
  const value = on ? "on" : "off";
  await db
    .insert(schema.settings)
    .values({ key: TEST_MODE, value, updatedBy })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedBy, updatedAt: new Date() } });
}
