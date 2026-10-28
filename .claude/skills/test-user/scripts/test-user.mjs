// Temporary test users for checking signed-in and paid screens.
// Run from the repo root:
//   node --env-file=.env.local .claude/skills/test-user/scripts/test-user.mjs <create|link|status|cleanup|list> [email|id]
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/`);
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");

const PREFIX = "rtnr-test+";
const TABLES = ["assessments", "diagnoses", "plans", "drill_sessions"];
const ORIGIN = process.env.TEST_USER_ORIGIN ?? "http://localhost:3000";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) fail("STRIPE_SECRET_KEY is not a test key. Refusing to touch Stripe.");
  return new Stripe(key);
}

async function allTestUsers() {
  const found = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(error.message);
    found.push(...data.users.filter((u) => u.email?.startsWith(PREFIX)));
    if (data.users.length < 200) return found;
  }
}

/** Accepts an email or a user id. Only ever resolves test users. */
async function resolve(target) {
  if (!target) fail("Pass the test user's email or id.");
  const user = (await allTestUsers()).find((u) => u.email === target || u.id === target);
  // A deleted test user can still be checked by email or id; anything else is refused.
  const isId = /^[0-9a-f-]{36}$/i.test(target);
  if (!user && !target.startsWith(PREFIX) && !isId) fail(`${target} is not a ${PREFIX} test user.`);
  return user ?? null;
}

async function rowCounts(userId) {
  const counts = {};
  const { count: profiles } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("id", userId);
  counts.profiles = profiles ?? 0;
  for (const table of TABLES) {
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    counts[table] = error ? `error: ${error.message}` : count ?? 0;
  }
  return counts;
}

async function stripeIds(userId) {
  const { data } = await db
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  return { customer: data?.stripe_customer_id ?? null, subscription: data?.stripe_subscription_id ?? null };
}

async function subscriptionStatuses({ customer, subscription }) {
  if (!customer && !subscription) return "none";
  const s = stripe();
  const subs = customer
    ? (await s.subscriptions.list({ customer, status: "all", limit: 20 })).data
    : [await s.subscriptions.retrieve(subscription)];
  return subs.length ? subs.map((sub) => `${sub.id} ${sub.status}`).join(", ") : "none";
}

async function report(userId, email, ids) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  console.log(`user:     ${email ?? userId}`);
  console.log(`auth:     ${error || !data?.user ? "not found" : `exists (${data.user.id})`}`);
  console.log(`rows:     ${JSON.stringify(await rowCounts(userId))}`);
  console.log(`customer: ${ids.customer ?? "none"} (test-mode customer records are not deleted)`);
  console.log(`stripe:   ${await subscriptionStatuses(ids)}`);
}

const [command, target] = process.argv.slice(2);

switch (command) {
  case "create": {
    const email = `${PREFIX}${Date.now()}@example.com`;
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error) fail(error.message);
    console.log(`✓ created ${email} (${data.user.id})`);
    break;
  }
  case "link": {
    const user = await resolve(target);
    if (!user) fail(`No test user ${target}.`);
    const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: user.email });
    if (error) fail(error.message);
    console.log(`${ORIGIN}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`);
    break;
  }
  case "status": {
    const user = await resolve(target);
    const id = user?.id ?? target;
    await report(id, user?.email, await stripeIds(id));
    break;
  }
  case "cleanup": {
    const user = await resolve(target);
    if (!user) fail(`No test user ${target}. Run \`list\` to see what is left.`);
    const ids = await stripeIds(user.id);
    if (ids.customer || ids.subscription) {
      const s = stripe();
      const subs = ids.customer
        ? (await s.subscriptions.list({ customer: ids.customer, status: "all", limit: 20 })).data
        : [await s.subscriptions.retrieve(ids.subscription)];
      for (const sub of subs) {
        if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
        await s.subscriptions.cancel(sub.id);
        console.log(`✓ cancelled ${sub.id}`);
      }
    }
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) fail(error.message);
    console.log(`✓ deleted ${user.email}\n`);
    await report(user.id, user.email, ids);
    break;
  }
  case "list": {
    const users = await allTestUsers();
    console.log(users.length ? users.map((u) => `${u.email} ${u.id} created ${u.created_at}`).join("\n") : "No test users left.");
    break;
  }
  default:
    fail("Usage: test-user.mjs <create|link|status|cleanup|list> [email|id]");
}
