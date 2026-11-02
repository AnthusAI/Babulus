import { resolve } from "path";
import { readBaselineRecord, verifyBaseline, writeBaselineRecord } from "../src/baseline.js";

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) {
    return undefined;
  }
  return args[idx + 1];
};

const hasFlag = (flag: string) => args.includes(flag);

const recordPath = getArg("--record") ?? getArg("-r");
if (!recordPath) {
  console.error("Usage: tsx scripts/verify-baseline.ts --record <path> [--root <path>] [--write]");
  process.exit(2);
}

const baseDir = getArg("--root");
const shouldWrite = hasFlag("--write");

const record = readBaselineRecord(recordPath);
const result = verifyBaseline(record, { baseDir, update: shouldWrite });

if (shouldWrite && result.updatedRecord) {
  writeBaselineRecord(recordPath, result.updatedRecord);
  console.error(`Updated baseline record at ${recordPath}`);
}

if (!result.ok) {
  if (result.missing.length) {
    console.error("Missing artifacts:");
    for (const artifact of result.missing) {
      console.error(`- ${artifact.path}`);
    }
  }
  if (result.mismatched.length) {
    console.error("Mismatched artifacts:");
    for (const mismatch of result.mismatched) {
      console.error(
        `- ${mismatch.artifact.path}: expected ${mismatch.expected} got ${mismatch.actual}`,
      );
    }
  }
  process.exit(1);
}

const resolvedBase = baseDir ? resolve(baseDir) : process.cwd();
console.error(`Baseline verified (${record.artifacts.length} artifacts) under ${resolvedBase}`);
