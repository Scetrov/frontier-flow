import type * as MoveBuilderLiteModule from "@zktx.io/sui-move-builder/lite";

export type BuildMovePackageFn = typeof MoveBuilderLiteModule.buildMovePackage;
export type FetchPackageFromGitHubFn = typeof MoveBuilderLiteModule.fetchPackageFromGitHub;
export type GetSuiMoveVersionFn = typeof MoveBuilderLiteModule.getSuiMoveVersion;
export type InitMoveCompilerFn = typeof MoveBuilderLiteModule.initMoveCompiler;
export type ResolveDependenciesFn = typeof MoveBuilderLiteModule.resolveDependencies;

interface MoveBuilderLiteRawWasmModule {
  readonly default: (options?: { readonly module_or_path?: string | URL | BufferSource }) => Promise<unknown>;
}

const MOVE_BUILDER_LITE_WASM_SHA256 = "710212f879fef4feb0bf6932a8ecece1323ca3b675b07691df927977492105a0";
const MOVE_BUILDER_VERBOSE_LOG_PREFIXES = [
  "[Compile]",
  "[V3 Files]",
  "[V4 Files]",
  "[V4 Load]",
  "[Lockfile]",
] as const;

let moveBuilderLitePromise: Promise<typeof MoveBuilderLiteModule> | null = null;
let moveBuilderLiteIntegrityPromise: Promise<void> | null = null;
let moveBuilderLiteRawWasmPromise: Promise<MoveBuilderLiteRawWasmModule> | null = null;
let moveBuilderLiteRawWasmInitialisationPromise: Promise<void> | null = null;
let moveBuilderConsoleLogPatchDepth = 0;
let originalMoveBuilderConsoleLog: ((...args: unknown[]) => void) | null = null;

export const moveBuilderLiteWasmUrl = new URL(
  "../../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm_bg.wasm",
  import.meta.url,
).href;

function toHexDigest(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function isMoveBuilderDebugEnabled(): boolean {
  if (import.meta.env.VITE_DEBUG === "true") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("DEBUG") === "true";
}

function isMoveBuilderVerboseLog(args: readonly unknown[]): boolean {
  const firstArgument = args[0];

  return typeof firstArgument === "string"
    && MOVE_BUILDER_VERBOSE_LOG_PREFIXES.some((prefix) => firstArgument.startsWith(prefix));
}

async function withMoveBuilderLogFilter<T>(operation: () => Promise<T>): Promise<T> {
  if (isMoveBuilderDebugEnabled()) {
    return operation();
  }

  if (moveBuilderConsoleLogPatchDepth === 0) {
    originalMoveBuilderConsoleLog = console.log as unknown as (...args: unknown[]) => void;
    console.log = (...args: unknown[]) => {
      if (isMoveBuilderVerboseLog(args)) {
        return;
      }

      originalMoveBuilderConsoleLog?.(...args);
    };
  }

  moveBuilderConsoleLogPatchDepth += 1;

  try {
    return await operation();
  } finally {
    moveBuilderConsoleLogPatchDepth -= 1;

    if (moveBuilderConsoleLogPatchDepth === 0 && originalMoveBuilderConsoleLog !== null) {
      console.log = originalMoveBuilderConsoleLog;
      originalMoveBuilderConsoleLog = null;
    }
  }
}

function wrapMoveBuilderLiteModule(module: typeof MoveBuilderLiteModule): typeof MoveBuilderLiteModule {
  return {
    ...module,
    buildMovePackage: async (input) => withMoveBuilderLogFilter(() => module.buildMovePackage(input)),
    // Note: don't wrap `fetchPackageFromGitHub` since its typing is not
    // reliably available and wrapping can cause unsafe any[] spread errors
    // under strict lint rules. Use the original implementation directly.
    fetchPackageFromGitHub: module.fetchPackageFromGitHub,
    resolveDependencies: async (input) => withMoveBuilderLogFilter(() => module.resolveDependencies(input)),
  };
}

export async function loadMoveBuilderLite(): Promise<typeof MoveBuilderLiteModule> {
  if (moveBuilderLitePromise === null) {
    moveBuilderLitePromise = (import("@zktx.io/sui-move-builder/lite") as Promise<typeof MoveBuilderLiteModule>)
      .then((module) => wrapMoveBuilderLiteModule(module));
  }

  return moveBuilderLitePromise;
}

async function loadMoveBuilderLiteRawWasm(): Promise<MoveBuilderLiteRawWasmModule> {
  if (moveBuilderLiteRawWasmPromise === null) {
    moveBuilderLiteRawWasmPromise = import("../../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm.js") as Promise<MoveBuilderLiteRawWasmModule>;
  }

  return moveBuilderLiteRawWasmPromise;
}

export async function prewarmMoveBuilderLiteWasm(wasm: string | URL = moveBuilderLiteWasmUrl): Promise<void> {
  if (moveBuilderLiteRawWasmInitialisationPromise === null) {
    moveBuilderLiteRawWasmInitialisationPromise = loadMoveBuilderLiteRawWasm().then(async (module) => {
      await module.default({ module_or_path: wasm });
    }).catch((error: unknown) => {
      moveBuilderLiteRawWasmInitialisationPromise = null;
      throw error;
    });
  }

  await moveBuilderLiteRawWasmInitialisationPromise;
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
  if (originalMoveBuilderConsoleLog !== null) {
    console.log = originalMoveBuilderConsoleLog;
  }

  moveBuilderLitePromise = null;
  moveBuilderLiteIntegrityPromise = null;
  moveBuilderLiteRawWasmPromise = null;
  moveBuilderLiteRawWasmInitialisationPromise = null;
  moveBuilderConsoleLogPatchDepth = 0;
  originalMoveBuilderConsoleLog = null;
}