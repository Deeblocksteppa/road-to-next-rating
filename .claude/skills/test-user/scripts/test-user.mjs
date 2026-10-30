// Temporary test users for checking signed-in and paid screens.
// Run from the repo root:
//   node --env-file=.env.local .claude/skills/test-user/scripts/test-user.mjs <create|link|status|cleanup|list|anon|anon-cleanup> [email|id]
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const require = createRequire(`${process.cwd()}/`);
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");

const PREFIX = "rtnr-test+";
const TABLES = ["assessments", "diagnoses", "plans", "drill_sessions"];
const ORIGIN = process.env.TEST_USER_ORIGIN ?? "http://localhost:3000";
// Anonymous rows a test run created, by id. Gitignored; emptied by anon-cleanup.
const LEDGER = new URL("../anon-ledger.json", import.meta.url);
const ANON_TABLES = ["plans", "diagnoses", "assessments"];
const UUID = /^[0-9a-f-]{36}$/i;

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
  const isId = UUID.test(target);
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

function readLedger() {
  if (!existsSync(LEDGER)) return { assessments: [], diagnoses: [], plans: [] };
  return JSON.parse(readFileSync(LEDGER, "utf8"));
}

/** Each recorded anonymous row as it stands now: owner, created_at, and the plan's re-test date. */
async function anonReport(ledger) {
  const counts = {};
  for (const table of ANON_TABLES) {
    const ids = ledger[table];
    if (!ids.length) {
      counts[table] = 0;
      continue;
    }
    const cols = table === "plans" ? "id, user_id, created_at, retest_date" : "id, user_id, created_at";
    const { data, error } = await db.from(table).select(cols).in("id", ids);
    if (error) fail(error.message);
    counts[table] = data.length;
    for (const row of data) {
      const owner = row.user_id ? `claimed by ${row.user_id}` : "unclaimed";
      console.log(`${table.padEnd(11)} ${row.id} ${owner} created ${row.created_at}${row.retest_date ? ` retest ${row.retest_date}` : ""}`);
    }
  }
  console.log(`anon rows still present: ${JSON.stringify(counts)}`);
  return counts;
}

/** Deletes recorded rows that are still unclaimed. Rows claimed by a test user go with that user; anything else is refused. */
async function anonCleanup() {
  const ledger = readLedger();
  const testIds = new Set((await allTestUsers()).map((u) => u.id));
  for (const table of ANON_TABLES) {
    if (!ledger[table].length) continue;
    const { data, error } = await db.from(table).select("id, user_id").in("id", ledger[table]);
    if (error) fail(error.message);
    const foreign = data.filter((r) => r.user_id && !testIds.has(r.user_id));
    if (foreign.length) fail(`${table} ${foreign.map((r) => r.id).join(", ")} belong to a real account. Not deleting.`);
    const unclaimed = data.filter((r) => !r.user_id).map((r) => r.id);
    if (!unclaimed.length) continue;
    const { error: delError } = await db.from(table).delete().in("id", unclaimed).is("user_id", null);
    if (delError) fail(delError.message);
    console.log(`✓ deleted ${unclaimed.length} unclaimed ${table}: ${unclaimed.join(", ")}`);
  }
  const counts = await anonReport(ledger);
  if (Object.values(counts).every((n) => n === 0)) rmSync(LEDGER, { force: true });
}

const [command, target, ...rest] = process.argv.slice(2);

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
    let id = user?.id ?? (UUID.test(target) ? target : null);
    if (!id) {
      // Deleted and known only by email: auth no longer maps it to an id. A
      // profile still under that email would be a leftover, so look for one.
      const { data: profile, error } = await db.from("profiles").select("id").eq("email", target).maybeSingle();
      if (error) fail(error.message);
      id = profile?.id ?? null;
    }
    if (id) {
      await report(id, user?.email ?? target, await stripeIds(id));
    } else {
      console.log(`user:     ${target}`);
      console.log("auth:     not found");
      console.log("rows:     no profile under this email (pass the user id to count rows by user_id)");
    }
    if (existsSync(LEDGER)) await anonReport(readLedger());
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
    if (existsSync(LEDGER)) await anonCleanup();
    break;
  }
  case "anon": {
    // The ids the browser saved: rtnr:assessment_id, rtnr:diagnosis_id, rtnr:plan_id.
    const ids = [target, ...rest].filter(Boolean);
    if (ids.length !== 3 || !ids.every((id) => /^[0-9a-f-]{36}$/i.test(id))) fail("Pass the assessment, diagnosis and plan ids, in that order.");
    const ledger = readLedger();
    ANON_TABLES.slice().reverse().forEach((table, i) => {
      if (!ledger[table].includes(ids[i])) ledger[table].push(ids[i]);
    });
    writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
    console.log("✓ recorded");
    await anonReport(ledger);
    break;
  }
  case "anon-cleanup": {
    if (!existsSync(LEDGER)) {
      console.log("No anonymous rows recorded.");
      break;
    }
    await anonCleanup();
    break;
  }
  case "list": {
    const users = await allTestUsers();
    console.log(users.length ? users.map((u) => `${u.email} ${u.id} created ${u.created_at}`).join("\n") : "No test users left.");
    break;
  }
  default:
    fail("Usage: test-user.mjs <create|link|status|cleanup|list|anon|anon-cleanup> [email|id]");
}
