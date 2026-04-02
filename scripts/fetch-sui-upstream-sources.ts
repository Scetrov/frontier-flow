import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SUI_REPOSITORY_URL = "https://github.com/MystenLabs/sui.git";
const SUI_REPOSITORY_OWNER = "MystenLabs";
const SUI_REPOSITORY_NAME = "sui";
const SUI_FRAMEWORK_COMMIT = "04dd28d5c5d92bff685ddfecb86f8acce18ce6df";
const SUI_FRAMEWORK_PATH = "crates/sui-framework/packages";

const repositoryRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mirrorRoot = join(
  repositoryRoot,
  "public",
  "upstream-sources",
  SUI_REPOSITORY_OWNER,
  SUI_REPOSITORY_NAME,
  SUI_FRAMEWORK_COMMIT,
);

function runGit(args: readonly string[], cwd: string): string {
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

async function prepareSparseCheckout(tempCheckoutRoot: string): Promise<void> {
  runGit(["init"], tempCheckoutRoot);
  runGit(["remote", "add", "origin", SUI_REPOSITORY_URL], tempCheckoutRoot);
  runGit(["config", "core.sparseCheckout", "true"], tempCheckoutRoot);
  await mkdir(join(tempCheckoutRoot, ".git", "info"), { recursive: true });
  await writeFile(join(tempCheckoutRoot, ".git", "info", "sparse-checkout"), `${SUI_FRAMEWORK_PATH}\n`, "utf8");
  runGit(["fetch", "--depth", "1", "--filter=blob:none", "origin", SUI_FRAMEWORK_COMMIT], tempCheckoutRoot);
  runGit(["checkout", "--detach", "FETCH_HEAD"], tempCheckoutRoot);
}

async function main(): Promise<void> {
  const tempCheckoutRoot = await mkdtemp(join(tmpdir(), "frontier-flow-sui-upstream-"));

  try {
    await prepareSparseCheckout(tempCheckoutRoot);

    const resolvedCommit = runGit(["rev-parse", "HEAD"], tempCheckoutRoot);
    if (resolvedCommit !== SUI_FRAMEWORK_COMMIT) {
      throw new Error(`Pinned checkout mismatch. Expected ${SUI_FRAMEWORK_COMMIT}, received ${resolvedCommit}.`);
    }

    await rm(mirrorRoot, { recursive: true, force: true });
    await mkdir(mirrorRoot, { recursive: true });
    await cp(join(tempCheckoutRoot, SUI_FRAMEWORK_PATH), join(mirrorRoot, SUI_FRAMEWORK_PATH), {
      recursive: true,
    });

    console.log(
      `Mirrored ${SUI_REPOSITORY_OWNER}/${SUI_REPOSITORY_NAME}@${SUI_FRAMEWORK_COMMIT} ${SUI_FRAMEWORK_PATH} -> ${mirrorRoot}.`,
    );
  } finally {
    await rm(tempCheckoutRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});