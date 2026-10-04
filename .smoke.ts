import "dotenv/config";
import { eq } from "drizzle-orm";
import { encode } from "next-auth/jwt";
import { db, schema } from "./src/db";
import { setTestMode } from "./src/lib/settings";

const B = process.env.SMOKE_BASE ?? "http://localhost:3000";
const NAME = B.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token";
const cookie = async (uid: string, email: string) =>
  `${NAME}=${await encode({ token: { sub: uid, userId: uid, email, name: "x" }, secret: process.env.AUTH_SECRET!, salt: NAME })}`;

async function main() {
  const [owner] = await db.select().from(schema.users).where(eq(schema.users.email, "veervatsalyadhara@gmail.com"));
  const [tmpAdmin] = await db.insert(schema.staff).values({ email: "zz-admin-smoke@example.com", name: "Tmp Admin", role: "admin", addedBy: "smoke" }).returning();
  const S = {
    owner: await cookie(owner.id, owner.email),
    teamAdmin: await cookie(owner.id, tmpAdmin.email),
    delivery: await cookie(owner.id, "nitish31jain@gmail.com"),
    customer: await cookie(owner.id, "plain-customer@example.com"),
  };
  const run = async (who: keyof typeof S, path: string, look: string[] = []) => {
    const r = await fetch(B + path, { headers: { cookie: S[who] }, redirect: "manual" });
    const body = r.status === 200 ? await r.text() : "";
    const found = look.map((t) => `${body.includes(t) ? "✓" : "✗"}${t}`);
    console.log(`${who.padEnd(9)} ${path.padEnd(14)} ${r.status} ${(r.headers.get("location") ?? "").replace(B, "")} ${found.join("  ")}`);
  };
  try {
    await run("delivery", "/");
    await run("delivery", "/dashboard");
    await run("delivery", "/profile");
    await run("delivery", "/admin");
    await run("delivery", "/deliver", ["Mark delivered", ">Undo<", ">Admin<", ">Home<"]);
    await run("customer", "/deliver");
    await run("customer", "/admin");
    await run("teamAdmin", "/admin/team", ["Tmp Admin", "This is you"]);
    await run("teamAdmin", "/deliver", ["Mark delivered", ">Home<"]);
    await run("owner", "/admin", [">Home<", ">Team<"]);
    await run("owner", "/admin/plans", ["Test mode: <!-- -->OFF"]);
    await run("owner", "/dashboard", ["total milk tokens", "Active token packs", "₹420", "₹1,800"]);
    await setTestMode(true, "smoke");
    console.log("-- test mode ON --");
    await run("owner", "/dashboard", ["₹7", "₹30", "Test mode is on"]);
    await run("customer", "/dashboard", ["₹420", "₹1,800", "Test mode is on"]);
  } finally {
    await setTestMode(false, "smoke");
    await db.delete(schema.settings);
    await db.delete(schema.staff).where(eq(schema.staff.id, tmpAdmin.id));
    console.log("cleanup done; settings rows:", (await db.select().from(schema.settings)).length);
  }
}
main().then(() => process.exit(0));
