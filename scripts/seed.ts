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
    { name: "Weekly", description: "7 packets (0.5 L each)", tokens: 7, pricePaise: 7 * 6000, sortOrder: 1 },
    { name: "Monthly", description: "30 packets (0.5 L each)", tokens: 30, pricePaise: 30 * 6000, sortOrder: 2 },
  ]);
  console.log("Seeded plans.");
}

main().then(() => process.exit(0));
