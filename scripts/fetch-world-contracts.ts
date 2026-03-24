import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const WORLD_CONTRACTS_REPOSITORY_URL = "https://github.com/evefrontier/world-contracts.git";
const WORLD_CONTRACTS_VERSION = "v0.0.14";
const WORLD_CONTRACTS_COMMIT = "78854fed4a21bd4a2e39c38b257ca95f2d6d09d3";

const repositoryRoot = resolve(import.meta.dir, "..");
const vendorDirectory = join(repositoryRoot, "vendor");
const checkoutDirectory = join(vendorDirectory, "world-contracts");

function runGit(args: readonly string[], cwd = repositoryRoot): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter((value) => value.trim().length > 0).join("\n").trim();
    throw new Error(details.length > 0 ? details : `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function ensureCleanCheckout(): void {
  if (!existsSync(join(checkoutDirectory, ".git"))) {
    throw new Error(`Expected ${checkoutDirectory} to be a git checkout.`);
  }

  const status = runGit(["status", "--porcelain"], checkoutDirectory);
  if (status.length > 0) {
    throw new Error(
      "vendor/world-contracts has local changes. Clean or remove that checkout before fetching the pinned version.",
    );
  }
}

function ensureCheckoutExists(): void {
  if (existsSync(checkoutDirectory)) {
    ensureCleanCheckout();
    return;
  }

  mkdirSync(vendorDirectory, { recursive: true });
  runGit(["clone", WORLD_CONTRACTS_REPOSITORY_URL, checkoutDirectory]);
}

function checkoutPinnedVersion(): void {
  runGit(["fetch", "--tags", "origin"], checkoutDirectory);
  runGit(["checkout", "--detach", WORLD_CONTRACTS_COMMIT], checkoutDirectory);
}

function main(): void {
  ensureCheckoutExists();
  checkoutPinnedVersion();

  const resolvedCommit = runGit(["rev-parse", "HEAD"], checkoutDirectory);
  if (resolvedCommit !== WORLD_CONTRACTS_COMMIT) {
    throw new Error(
      `Pinned checkout mismatch. Expected ${WORLD_CONTRACTS_COMMIT}, received ${resolvedCommit}.`,
    );
  }

  console.log(
    `Prepared vendor/world-contracts at ${WORLD_CONTRACTS_VERSION} (${WORLD_CONTRACTS_COMMIT}).`,
  );
}

main();