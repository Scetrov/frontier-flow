import type * as MoveBuilderLiteModule from "@zktx.io/sui-move-builder/lite";

export type BuildMovePackageFn = typeof MoveBuilderLiteModule.buildMovePackage;
export type FetchPackageFromGitHubFn = typeof MoveBuilderLiteModule.fetchPackageFromGitHub;
export type GetSuiMoveVersionFn = typeof MoveBuilderLiteModule.getSuiMoveVersion;
export type InitMoveCompilerFn = typeof MoveBuilderLiteModule.initMoveCompiler;
export type ResolveDependenciesFn = typeof MoveBuilderLiteModule.resolveDependencies;

const MOVE_BUILDER_LITE_WASM_SHA256 = "710212f879fef4feb0bf6932a8ecece1323ca3b675b07691df927977492105a0";

let moveBuilderLitePromise: Promise<typeof MoveBuilderLiteModule> | null = null;
let moveBuilderLiteIntegrityPromise: Promise<void> | null = null;

export const moveBuilderLiteWasmUrl = new URL(
  "../../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm_bg.wasm",
  import.meta.url,
).href;

function toHexDigest(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function loadMoveBuilderLite(): Promise<typeof MoveBuilderLiteModule> {
  if (moveBuilderLitePromise === null) {
    moveBuilderLitePromise = import("@zktx.io/sui-move-builder/lite") as Promise<typeof MoveBuilderLiteModule>;
  }

  return moveBuilderLitePromise;
}

export async function verifyMoveBuilderLiteIntegrity(): Promise<void> {
  if (moveBuilderLiteIntegrityPromise === null) {
    moveBuilderLiteIntegrityPromise = (async () => {
      const response = await fetch(moveBuilderLiteWasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch bundled Move compiler WASM for verification: ${String(response.status)} ${response.statusText}`.trim());
      }

      const buffer = await response.arrayBuffer();
      const digestBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
      const digest = toHexDigest(digestBuffer);

      if (digest !== MOVE_BUILDER_LITE_WASM_SHA256) {
        throw new Error(`Bundled Move compiler checksum mismatch: expected ${MOVE_BUILDER_LITE_WASM_SHA256}, received ${digest}`);
      }
    })().catch((error: unknown) => {
      moveBuilderLiteIntegrityPromise = null;
      throw error;
    });
  }

  await moveBuilderLiteIntegrityPromise;
}

export function resetMoveBuilderLiteForTests(): void {
  moveBuilderLitePromise = null;
  moveBuilderLiteIntegrityPromise = null;
}