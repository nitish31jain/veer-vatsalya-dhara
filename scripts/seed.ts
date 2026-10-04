// Inserts starter plans if none exist. Edit prices later from /admin/plans.
import "dotenv/config";
import { db, schema } from "../src/db";

async function main() {
  const existing = await db.select().from(schema.plans).limit(1);
  if (existing.length) {
    console.log("Plans already exist, skipping.");
    return;
  }
  await db.insert(schema.plans).values([
    { name: "Weekly", nameHi: "साप्ताहिक", description: "7 packets (0.5 L each)", descriptionHi: "7 पैकेट (हर एक 0.5 लीटर)", tokens: 7, pricePaise: 7 * 6000, sortOrder: 1 },
    { name: "Monthly", nameHi: "मासिक", description: "30 packets (0.5 L each)", descriptionHi: "30 पैकेट (हर एक 0.5 लीटर)", tokens: 30, pricePaise: 30 * 6000, sortOrder: 2 },
  ]);
  console.log("Seeded plans.");
}

main().then(() => process.exit(0));
