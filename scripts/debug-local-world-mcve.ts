/**
 * MCVE: compile extension with world source as local dependency using published-at.
 * No resolveDependencies — directly embed world source files and compile.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { initMoveCompiler, buildMovePackage, getSuiMoveVersion } from "@zktx.io/sui-move-builder/lite";

const WASM_URL = new URL(
  "../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm_bg.wasm",
  import.meta.url,
).href;

const WORLD_PKG_ID = process.argv[2] ?? "0x9b6131aad4d311e0cb0675253bd988b8738228555ba51529dc2c9d11f83e7ac2";

// Minimal turret extension source
const EXTENSION_SOURCE = `module builder_extensions::hello_turret {
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
        let result: vector<ReturnTargetPriorityList> = vector[];
        turret::destroy_online_receipt(receipt, TurretAuth {});
        sui::bcs::to_bytes(&result)
    }
}
`;

// Read world source from the vendor directory
function loadVendorWorldSource(): Record<string, string> {
  const vendorBase = "vendor/world-contracts/contracts/world";
  const files: Record<string, string> = {};

  function scanDir(dirPath: string, prefix: string): void {
    const { readdirSync, statSync } = require("node:fs");
    const { join } = require("node:path");
    for (const entry of readdirSync(dirPath)) {
      const fullPath = join(dirPath, entry);
      const relativePath = `${prefix}${entry}`;
      if (statSync(fullPath).isDirectory()) {
        scanDir(fullPath, `${relativePath}/`);
      } else if (entry.endsWith(".move") || entry === "Move.toml") {
        files[relativePath] = readFileSync(fullPath, "utf-8");
      }
    }
  }

  if (!existsSync(vendorBase)) {
    throw new Error(`Vendor world contracts not found at ${vendorBase}. Run: bun run fetch:world-contracts`);
  }
  scanDir(vendorBase, "");
  return files;
}

async function main(): Promise<void> {
  console.log("=== Local World Source MCVE ===");
  console.log(`world package id: ${WORLD_PKG_ID}`);

  await initMoveCompiler({ wasm: WASM_URL });
  const version = await getSuiMoveVersion({ wasm: WASM_URL });
  console.log(`compiler version: ${version}`);

  // Load world source files from vendor directory
  const worldSourceFiles = loadVendorWorldSource();
  console.log(`loaded ${Object.keys(worldSourceFiles).length} world source files`);

  // Create the world dep Move.toml with published-at
  const worldMoveToml = [
    "[package]",
    'name = "world"',
    'edition = "2024.beta"',
    `published-at = "${WORLD_PKG_ID}"`,
    "",
    "[addresses]",
    `world = "${WORLD_PKG_ID}"`,
    "",
  ].join("\n");

  // Build file map: extension source + inline world dep
  const files: Record<string, string> = {
    "Move.toml": [
      "[package]",
      'name = "hello_turret"',
      'edition = "2024.beta"',
      "",
      "[addresses]",
      'builder_extensions = "0x0"',
      `world = "${WORLD_PKG_ID}"`,
      "",
      "[dependencies]",
      'world = { local = "deps/world" }',
      "",
    ].join("\n"),
    "sources/hello_turret.move": EXTENSION_SOURCE,
    "deps/world/Move.toml": worldMoveToml,
  };

  // Add world source files under deps/world/
  for (const [path, content] of Object.entries(worldSourceFiles)) {
    if (path === "Move.toml") continue; // Use our custom one
    if (/^tests\//.test(path)) continue; // Skip tests
    files[`deps/world/${path}`] = content;
  }

  // Patch access_control.move
  const accessControlKey = Object.keys(files).find(k => /access_control\.move$/i.test(k));
  if (accessControlKey) {
    const unsupported = /let is_character =[\s\S]*?assert!\(!is_character, ECharacterTransfer\);/;
    if (unsupported.test(files[accessControlKey])) {
      files[accessControlKey] = files[accessControlKey].replace(
        unsupported,
        "let is_character = false;\n    assert!(!is_character, ECharacterTransfer);",
      );
      console.log("patched access_control.move");
    }
  }

  console.log(`\ntotal files in build: ${Object.keys(files).length}`);
  console.log(`Move.toml:\n${files["Move.toml"]}`);
  console.log(`deps/world/Move.toml:\n${files["deps/world/Move.toml"]}`);

  // Build
  console.log("\n--- Build ---");
  const result = await buildMovePackage({
    files,
    wasm: WASM_URL,
    network: "testnet",
    silenceWarnings: false,
    onProgress: (event) => {
      console.log(`  progress: ${JSON.stringify(event)}`);
    },
  });

  if ("error" in result) {
    console.error(`\nBUILD FAILED:\n${result.error}`);
    return;
  }

  console.log(`\nBUILD SUCCEEDED!`);
  console.log(`modules: ${result.modules.length}`);
  console.log(`dependencies: ${JSON.stringify(result.dependencies)}`);
  console.log(`digest: ${JSON.stringify(result.digest)}`);

  // The builder compiled all deps (world modules + extension module).
  // We need to strip the world modules — only publish the extension.
  // Compile a standalone world package to identify its module bytecodes.
  console.log("\n--- Identify world modules to strip ---");
  const worldOnlyFiles: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    if (k.startsWith("deps/world/")) {
      worldOnlyFiles[k.replace("deps/world/", "")] = v;
    }
  }
  // Override Move.toml addresses for standalone world compile
  worldOnlyFiles["Move.toml"] = [
    "[package]",
    'name = "world"',
    'edition = "2024.beta"',
    "",
    "[addresses]",
    `world = "${WORLD_PKG_ID}"`,
    "",
  ].join("\n");

  const worldOnlyResult = await buildMovePackage({
    files: worldOnlyFiles,
    wasm: WASM_URL,
    network: "testnet",
    silenceWarnings: true,
  });

  if ("error" in worldOnlyResult) {
    console.log("world-only compile failed (expected for local shim), using simple module count filtering");
    // Fall back: assume the LAST module is the extension
    console.log(`using last module of ${result.modules.length} as extension module`);
  } else {
    const worldModuleSet = new Set(worldOnlyResult.modules);
    const extensionModules = result.modules.filter((m: string) => !worldModuleSet.has(m));
    console.log(`world modules: ${worldOnlyResult.modules.length}, extension modules: ${extensionModules.length}`);
    result.modules.length = 0;
    result.modules.push(...extensionModules);
  }

  console.log(`filtered modules to publish: ${result.modules.length}`);

  // Check if world is in dependencies
  const hasWorldDep = result.dependencies.some((d: string) => d.includes("9b6131"));
  console.log(`world package in dependencies: ${hasWorldDep}`);

  if (!hasWorldDep) {
    console.log("\nworld package NOT in compiler dependencies — adding manually for publish");
  }

  // Publish
  console.log("\n--- Publish to localnet ---");
  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const { Transaction } = await import("@mysten/sui/transactions");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { getFaucetHost, requestSuiFromFaucetV2 } = await import("@mysten/sui/faucet");

  const client = new SuiJsonRpcClient({ url: "http://localhost:9000", network: "localnet" });

  function decodeBase64(value: string): Uint8Array {
    return Uint8Array.from(globalThis.atob(value), (c) => c.charCodeAt(0));
  }

  const modules = result.modules.map((m: string) => Array.from(decodeBase64(m)));
  const publishDeps = [...new Set([...result.dependencies, WORLD_PKG_ID])];

  const signer = new Ed25519Keypair();
  const signerAddress = signer.getPublicKey().toSuiAddress();
  console.log(`signer: ${signerAddress}`);

  await requestSuiFromFaucetV2({ host: getFaucetHost("localnet"), recipient: signerAddress });

  const tx = new Transaction();
  const [upgradeCap] = tx.publish({ modules, dependencies: publishDeps });
  tx.transferObjects([upgradeCap], signerAddress);
  tx.setSenderIfNotSet(signerAddress);

  console.log(`publish deps: ${JSON.stringify(publishDeps)}`);
  console.log("executing...");
  const txResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true, showObjectChanges: true },
  });

  const pub = txResult.objectChanges?.find((c) => c.type === "published");
  const pkgId = pub && "packageId" in pub ? pub.packageId : undefined;
  console.log(`\n=== RESULT ===`);
  console.log(`digest: ${txResult.digest}`);
  console.log(`status: ${txResult.effects?.status.status ?? "unknown"}`);
  console.log(`package id: ${pkgId ?? "NOT FOUND"}`);
}

await main();
