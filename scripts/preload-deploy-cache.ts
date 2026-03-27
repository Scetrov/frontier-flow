import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

import { loadMoveBuilderLite, moveBuilderLiteWasmUrl, verifyMoveBuilderLiteIntegrity } from "../src/compiler/moveBuilderLite";

interface CacheSnapshotConfig {
  readonly sourceVersionTag: string;
  readonly repositoryUrl: string;
  readonly subdirectory: string;
  readonly outputPath: string;
  readonly targets: readonly string[];
}

interface CacheManifest {
  readonly snapshots: readonly CacheSnapshotConfig[];
}

interface ProjectDependencySnapshot {
  readonly sourceVersionTag: string;
  readonly resolvedAt: number;
  readonly resolvedDependencies: {
    readonly files: string;
    readonly dependencies: string;
    readonly lockfileDependencies: string;
  };
}

function parseManifest(value: unknown): CacheManifest {
  if (typeof value !== "object" || value === null || !Array.isArray((value as CacheManifest).snapshots)) {
    throw new Error("Deploy cache manifest must include a snapshots array.");
  }

  const snapshots = (value as CacheManifest).snapshots.map((snapshot) => {
    if (
      typeof snapshot !== "object"
      || snapshot === null
      || typeof snapshot.sourceVersionTag !== "string"
      || typeof snapshot.repositoryUrl !== "string"
      || typeof snapshot.subdirectory !== "string"
      || typeof snapshot.outputPath !== "string"
      || !Array.isArray(snapshot.targets)
      || !snapshot.targets.every((target) => typeof target === "string")
    ) {
      throw new Error("Each deploy cache snapshot entry must define sourceVersionTag, repositoryUrl, subdirectory, outputPath, and targets.");
    }

    return snapshot;
  });

  return { snapshots };
}

function createSyntheticFiles(sourceVersionTag: string, repositoryUrl: string, subdirectory: string): Record<string, string> {
  return {
    "Move.toml": [
      "[package]",
      'name = "starter_contract"',
      'edition = "2024.beta"',
      "",
      "[dependencies]",
      `world = { git = "${repositoryUrl}", rev = "${sourceVersionTag}", subdir = "${subdirectory}" }`,
      "",
      "[addresses]",
      'builder_extensions = "0x0"',
      'starter_contract = "0x0"',
      'world = "0x0"',
      "",
    ].join("\n"),
    "sources/starter_contract.move": "module builder_extensions::starter_contract {}\n",
  };
}

async function loadManifest(manifestPath: string): Promise<CacheManifest> {
  const raw = await readFile(manifestPath, "utf8");
  return parseManifest(JSON.parse(raw) as unknown);
}

async function main(): Promise<void> {
  const manifestPath = resolvePath(process.cwd(), process.argv[2] ?? "scripts/deploy-cache-packages.json");
  const manifest = await loadManifest(manifestPath);
  const compilerModule = await loadMoveBuilderLite();

  await verifyMoveBuilderLiteIntegrity();
  await compilerModule.initMoveCompiler({ wasm: moveBuilderLiteWasmUrl });

  for (const snapshot of manifest.snapshots) {
    const files = createSyntheticFiles(snapshot.sourceVersionTag, snapshot.repositoryUrl, snapshot.subdirectory);
    const resolvedDependencies = await compilerModule.resolveDependencies({
      files,
      wasm: moveBuilderLiteWasmUrl,
      rootGit: {
        git: snapshot.repositoryUrl,
        rev: snapshot.sourceVersionTag,
        subdir: snapshot.subdirectory,
      },
      network: "testnet",
      silenceWarnings: false,
    });

    const output: ProjectDependencySnapshot = {
      sourceVersionTag: snapshot.sourceVersionTag,
      resolvedAt: Date.now(),
      resolvedDependencies: {
        files: "{}",
        dependencies: resolvedDependencies.dependencies,
        lockfileDependencies: resolvedDependencies.lockfileDependencies,
      },
    };

    const outputPath = resolvePath(process.cwd(), snapshot.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(`Pre-cached ${snapshot.sourceVersionTag} for ${snapshot.targets.join(", ")} -> ${snapshot.outputPath}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});