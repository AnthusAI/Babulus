import { AssetHashType, DockerImage } from "aws-cdk-lib";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The cli-login release the broker, the approval pages and the `babulus` command all run. One constant feeds every
 * bundle below, and a test asserts it equals the pin in packages/speech/pyproject.toml, so a broker and a CLI from
 * different releases can never ship together.
 */
export const CLI_LOGIN_VERSION = "0.4.0";

export const cliLoginRequirement = (): string => `cli-login==${CLI_LOGIN_VERSION}`;

export type PipRunner = (python: string, args: string[]) => void;

const runPip: PipRunner = (python, args) => {
  execFileSync(python, args, { stdio: "inherit" });
};

const here = path.dirname(fileURLToPath(import.meta.url));
/** apps/studio-web: the folder the Amplify backend lives in. */
export const studioRoot = path.resolve(here, "../..");

/** Install exactly the pinned cli-login wheel (pure Python, no dependencies) into a Lambda bundle directory. */
export function installCliLogin(outputDir: string, run: PipRunner = runPip, environment: Record<string, string | undefined> = process.env): void {
  const python = (environment.BABULUS_PIP_PYTHON ?? "python3").trim();
  const extra = (environment.BABULUS_PIP_EXTRA_ARGS ?? "").trim().split(/\s+/).filter(Boolean);
  run(python, [
    "-m", "pip", "install",
    "--target", outputDir,
    "--no-cache-dir",
    "--no-deps",
    "--platform", "manylinux2014_aarch64",
    "--implementation", "cp",
    "--python-version", "3.12",
    "--only-binary=:all:",
    "--ignore-requires-python",
    ...extra,
    cliLoginRequirement(),
  ]);
}

const PAGES_HANDLER = path.join(studioRoot, "amplify/functions/cli-login-pages/handler.py");

export function bundleCliLoginBroker(outputDir: string, run?: PipRunner): void {
  installCliLogin(outputDir, run);
}

export function bundleCliLoginPages(outputDir: string, run?: PipRunner): void {
  installCliLogin(outputDir, run);
  fs.copyFileSync(PAGES_HANDLER, path.join(outputDir, "handler.py"));
}

function localAsset(name: string, extraHash: string, bundle: (outputDir: string) => void): Code {
  return Code.fromAsset(studioRoot, {
    assetHashType: AssetHashType.CUSTOM,
    assetHash: `${name}:${cliLoginRequirement()}:${extraHash}`.replace(/[^a-zA-Z0-9._:=,-]/g, "_"),
    bundling: {
      image: Runtime.PYTHON_3_12.bundlingImage ?? DockerImage.fromRegistry("public.ecr.aws/sam/build-python3.12"),
      local: {
        tryBundle(outputDir: string): boolean {
          bundle(outputDir);
          return true;
        },
      },
      command: ["bash", "-c", "echo 'cli-login bundling runs locally (pip on the build host).' >&2; exit 1"],
    },
  });
}

/** The broker's code: the pinned wheel alone. Handler `cli_login.broker.handler.lambda_handler`. */
export const cliLoginBrokerCode = (): Code => localAsset("cli-login-broker", "wheel", (dir) => bundleCliLoginBroker(dir));

/** The approval pages function's code: the same pinned wheel plus this repository's thin handler. Handler `handler.handler`. */
export const cliLoginPagesCode = (): Code =>
  localAsset("cli-login-pages", createHash("sha256").update(fs.readFileSync(PAGES_HANDLER)).digest("hex").slice(0, 16), (dir) => bundleCliLoginPages(dir));
