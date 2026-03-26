/**
 * Minimal standalone MCVE that directly calls the WASM builder functions
 * to isolate whether the issue is in the WASM builder or the application wrapper.
 *
 * Caches resolved dependencies to .resolved-deps-cache.json to avoid GitHub rate limits.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { initMoveCompiler, buildMovePackage, resolveDependencies, getSuiMoveVersion } from "@zktx.io/sui-move-builder/lite";

const WASM_URL = new URL(
  "../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm_bg.wasm",
  import.meta.url,
).href;

const WORLD_GIT = "https://github.com/evefrontier/world-contracts.git";
const WORLD_REV = "v0.0.18";
const WORLD_SUBDIR = "contracts/world";
const WORLD_PKG_ID = process.argv[2] ?? "0x9b6131aad4d311e0cb0675253bd988b8738228555ba51529dc2c9d11f83e7ac2";

const EXTENSION_MOVE_TOML = `[package]
name = "test_extension"
edition = "2024.beta"

[addresses]
test_extension = "0x0"
world = "${WORLD_PKG_ID}"

[dependencies]
world = { git = "${WORLD_GIT}", rev = "${WORLD_REV}", subdir = "${WORLD_SUBDIR}" }
`;

const EXTENSION_SOURCE = `module test_extension::hello {
    use world::turret::{Self, OnlineReceipt, ReturnTargetPriorityList, Turret};
    use world::character::Character;
    use sui::object;

    public struct TurretAuth has drop {}

    public fun get_target_priority_list(
        turret: &Turret,
        _owner_character: &Character,
        _target_candidate_list: vector<u8>,
        receipt: OnlineReceipt,
    ): vector<u8> {
        assert!(turret::turret_id(&receipt) == object::id(turret), 0);
        turret::destroy_online_receipt(receipt, TurretAuth {});
        vector::empty()
    }
}
`;

async function main(): Promise<void> {
  console.log("=== WASM Builder Direct MCVE ===");
  console.log(`world package id: ${WORLD_PKG_ID}`);
  console.log(`wasm url: ${WASM_URL}`);

  // Step 1: Init
  console.log("\n--- Step 1: Init compiler ---");
  await initMoveCompiler({ wasm: WASM_URL });
  const version = await getSuiMoveVersion({ wasm: WASM_URL });
  console.log(`compiler version: ${version}`);

  // Step 2: Create files
  const files: Record<string, string> = {
    "Move.toml": EXTENSION_MOVE_TOML,
    "sources/hello.move": EXTENSION_SOURCE,
  };
  const rootGit = { git: WORLD_GIT, rev: WORLD_REV, subdir: WORLD_SUBDIR };

  // Step 3: Resolve dependencies (with disk cache)
  console.log("\n--- Step 3: Resolve dependencies ---");
  const CACHE_FILE = ".resolved-deps-cache.json";
  let resolvedDeps: Awaited<ReturnType<typeof resolveDependencies>>;

  if (existsSync(CACHE_FILE)) {
    console.log("  (using cached resolved dependencies from disk)");
    resolvedDeps = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } else {
    resolvedDeps = await resolveDependencies({
      files,
      wasm: WASM_URL,
      rootGit,
      network: "testnet",
      silenceWarnings: false,
      onProgress: (event) => {
        console.log(`  resolve progress: ${JSON.stringify(event)}`);
      },
    });
    // Cache to disk
    writeFileSync(CACHE_FILE, JSON.stringify(resolvedDeps, null, 2));
    console.log(`  (saved resolved deps to ${CACHE_FILE})`);
  }

  console.log(`resolved dependencies type: ${typeof resolvedDeps.dependencies}`);
  const depData = JSON.parse(resolvedDeps.dependencies) as unknown[];
  console.log(`resolved packages: ${depData.length}`);
  for (const pkg of depData) {
    const p = pkg as { name?: string; files?: Record<string, string> };
    const fileKeys = p.files ? Object.keys(p.files) : [];
    const moveToml = p.files && fileKeys.find(k => /Move\.toml$/i.test(k));
    console.log(`  package: ${p.name ?? "?"} files=${fileKeys.length}`);
    if (moveToml && p.files) {
      console.log(`    Move.toml:\n${p.files[moveToml]}`);
    }
  }

  // Step 4: Patch world Move.toml with published-at and strip test files
  console.log("\n--- Step 4: Patch world published address & sanitize ---");
  const patchedPackages = depData.map((pkg) => {
    const p = pkg as { name?: string; files?: Record<string, string> };
    if (p.name?.toLowerCase() !== "world" || !p.files) return pkg;

    const nextFiles = { ...p.files };

    // Strip test files (same as sanitizeResolvedDependencies in deployGradeCompiler)
    for (const filePath of Object.keys(nextFiles)) {
      if (/^dependencies\/world\/tests\//i.test(filePath)) {
        delete nextFiles[filePath];
      }
    }

    // Patch access_control.move: replace unsupported datatype_string() check
    const accessControlPath = Object.keys(nextFiles).find(fp => /access_control\.move$/i.test(fp));
    if (accessControlPath) {
      const src = nextFiles[accessControlPath];
      const unsupportedCheck = /let is_character =[\s\S]*?assert!\(!is_character, ECharacterTransfer\);/;
      if (unsupportedCheck.test(src)) {
        nextFiles[accessControlPath] = src.replace(
          unsupportedCheck,
          "let is_character = false;\n    assert!(!is_character, ECharacterTransfer);",
        );
        console.log("patched access_control.move (unsupported character transfer check)");
      }
    }

    const moveTomlPath = Object.keys(nextFiles).find(k => /Move\.toml$/i.test(k));
    if (!moveTomlPath) return { ...pkg, files: nextFiles };
    let content = nextFiles[moveTomlPath];
    // Add published-at
    if (!/published-at/.test(content)) {
      content = content.replace(
        /(\[package\][^\[]*?)((?=\n\[)|\n*$)/s,
        (_, section, rest) => `${section.trimEnd()}\npublished-at = "${WORLD_PKG_ID}"\n${rest}`,
      );
    }
    // Set world/World addresses
    content = content.replace(/^(world\s*=\s*")0x0+(")/m, `$1${WORLD_PKG_ID}$2`);
    content = content.replace(/^(World\s*=\s*")0x0+(")/m, `$1${WORLD_PKG_ID}$2`);
    nextFiles[moveTomlPath] = content;
    console.log(`patched World Move.toml:\n${content}`);
    console.log(`World files after sanitize: ${Object.keys(nextFiles).length}`);
    return { ...pkg, files: nextFiles };
  });
  const patchedResolvedDeps = { ...resolvedDeps, dependencies: JSON.stringify(patchedPackages) };

  // Step 5: Build with resolved deps
  console.log("\n--- Step 5: Build package ---");
  const buildResult = await buildMovePackage({
    files,
    wasm: WASM_URL,
    rootGit,
    network: "testnet",
    silenceWarnings: false,
    resolvedDependencies: patchedResolvedDeps,
    onProgress: (event) => {
      console.log(`  build progress: ${JSON.stringify(event)}`);
    },
  });

  if ("error" in buildResult) {
    console.error(`\nBUILD FAILED:\n${buildResult.error}`);
    return;
  }

  console.log(`\nBUILD SUCCEEDED!`);
  console.log(`modules: ${buildResult.modules.length}`);
  console.log(`dependencies: ${JSON.stringify(buildResult.dependencies)}`);
  console.log(`digest: ${JSON.stringify(buildResult.digest)}`);

  // Step 6: Publish to localnet
  console.log("\n--- Step 6: Publish to localnet ---");
  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const { Transaction } = await import("@mysten/sui/transactions");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { getFaucetHost, requestSuiFromFaucetV2 } = await import("@mysten/sui/faucet");

  const RPC_URL = "http://localhost:9000";
  const client = new SuiJsonRpcClient({ url: RPC_URL, network: "localnet" });

  function decodeBase64(value: string): Uint8Array {
    const binary = globalThis.atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }

  const modules = buildResult.modules.map((m: string) => Array.from(decodeBase64(m)));
  const publishDependencies = [
    ...buildResult.dependencies,
    ...(buildResult.dependencies.includes(WORLD_PKG_ID) ? [] : [WORLD_PKG_ID]),
  ];

  console.log(`publish dependencies: ${JSON.stringify(publishDependencies)}`);

  const signer = new Ed25519Keypair();
  const signerAddress = signer.getPublicKey().toSuiAddress();
  console.log(`signer: ${signerAddress}`);

  console.log("requesting faucet funds...");
  await requestSuiFromFaucetV2({ host: getFaucetHost("localnet"), recipient: signerAddress });

  const transaction = new Transaction();
  const [upgradeCap] = transaction.publish({
    modules,
    dependencies: publishDependencies,
  });
  transaction.transferObjects([upgradeCap], signerAddress);
  transaction.setSenderIfNotSet(signerAddress);

  console.log("signing and executing publish transaction...");
  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    options: { showEffects: true, showObjectChanges: true },
  });

  const publishedChange = result.objectChanges?.find((c) => c.type === "published");
  const packageId = publishedChange && "packageId" in publishedChange ? publishedChange.packageId : undefined;
  console.log(`\n=== PUBLISH RESULT ===`);
  console.log(`digest: ${result.digest}`);
  console.log(`status: ${result.effects?.status.status ?? "unknown"}`);
  console.log(`package id: ${packageId ?? "NOT FOUND"}`);
}

await main();
