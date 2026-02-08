/**
 * List waitlist signups from Amplify/AppSync (DynamoDB).
 *
 * Requires apps/studio-web/amplify_outputs.json (e.g. from get-amplify-outputs.sh).
 * Uses API key auth so it can run without a logged-in user.
 *
 * Usage:
 *   cd apps/studio-web && npm run list-waitlist
 *   cd apps/studio-web && npx tsx scripts/list-waitlist.ts --limit 50
 *   cd apps/studio-web && npx tsx scripts/list-waitlist.ts --csv > signups.csv
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
// @ts-expect-error path to generated config
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs, { ssr: false });

const client = generateClient<any>({ authMode: "apiKey" });

const DEFAULT_LIMIT = 100;

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit =
    limitIdx >= 0 && args[limitIdx + 1]
      ? Math.max(1, parseInt(args[limitIdx + 1], 10) || DEFAULT_LIMIT)
      : DEFAULT_LIMIT;
  const csv = args.includes("--csv");

  const { data: signups, errors } = await client.models.WaitlistSignup.list({
    limit,
    sortDirection: "DESC",
  });

  if (errors?.length) {
    console.error("Errors:", errors);
    process.exit(1);
  }

  const list = signups ?? [];

  if (csv) {
    const header = "email,name,persona,wantsUpdates,source,createdAt";
    const rows = list.map(
      (s) =>
        [
          s.email ?? "",
          (s.name ?? "").replace(/"/g, '""'),
          s.persona ?? "",
          s.wantsUpdates === true ? "yes" : "no",
          s.source ?? "",
          s.createdAt ?? "",
        ].join(",")
    );
    console.log(header);
    rows.forEach((r) => console.log(r));
    return;
  }

  console.log(`Waitlist signups (${list.length} recent):\n`);
  list.forEach((s, i) => {
    console.log(
      `${i + 1}. ${s.email ?? "(no email)"} | ${s.name ?? "-"} | ${s.persona ?? "-"} | updates: ${s.wantsUpdates ?? false} | ${s.source ?? "-"} | ${s.createdAt ?? "-"}`
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
