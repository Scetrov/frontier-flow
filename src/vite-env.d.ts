/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
	readonly VITE_WALRUS_UPLOAD_RELAY_URL?: string;
	readonly VITE_WALRUS_UPLOAD_RELAY_TIP_MAX?: string;
}

declare module "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url" {
	const src: string;
	export default src;
}

declare module "@zktx.io/sui-move-builder/lite" {
	export interface ResolvedDependencies {
		readonly files: string;
		readonly dependencies: string;
		readonly lockfileDependencies: string;
	}

	export interface BuildRootGit {
		readonly git: string;
		readonly rev: string;
		readonly subdir?: string;
	}

	export type BuildProgressEvent =
		| { readonly type: "resolve_start" }
		| {
			readonly type: "resolve_dep";
			readonly name: string;
			readonly source: string;
			readonly current: number;
			readonly total: number;
		}
		| { readonly type: "resolve_complete"; readonly count: number }
		| { readonly type: "compile_start" }
		| { readonly type: "compile_complete" }
		| { readonly type: "lockfile_generate" };

	export interface BuildSuccessResult {
		readonly modules: readonly string[];
		readonly dependencies: readonly string[];
		readonly digest: readonly number[];
		readonly moveLock?: string;
		readonly environment?: string;
		readonly publishedToml?: string;
		readonly warnings?: string;
	}

	export interface BuildErrorResult {
		readonly error: string;
	}

	export type BuildResult = BuildSuccessResult | BuildErrorResult;

	export function initMoveCompiler(options?: {
		readonly wasm?: string | URL | BufferSource;
	}): Promise<void>;

	export function buildMovePackage(input: {
		readonly files: Record<string, string>;
		readonly wasm?: string | URL | BufferSource;
		readonly rootGit?: BuildRootGit;
		readonly githubToken?: string;
		readonly ansiColor?: boolean;
		readonly network?: "mainnet" | "testnet" | "devnet";
		readonly resolvedDependencies?: ResolvedDependencies;
		readonly silenceWarnings?: boolean;
		readonly testMode?: boolean;
		readonly lintFlag?: string;
		readonly stripMetadata?: boolean;
		readonly onProgress?: (event: BuildProgressEvent) => void;
	}): Promise<BuildResult>;

	export function resolveDependencies(input: {
		readonly files: Record<string, string>;
		readonly wasm?: string | URL | BufferSource;
		readonly rootGit?: BuildRootGit;
		readonly githubToken?: string;
		readonly ansiColor?: boolean;
		readonly network?: "mainnet" | "testnet" | "devnet";
		readonly silenceWarnings?: boolean;
		readonly testMode?: boolean;
		readonly lintFlag?: string;
		readonly stripMetadata?: boolean;
		readonly onProgress?: (event: BuildProgressEvent) => void;
	}): Promise<ResolvedDependencies>;

	export function fetchPackageFromGitHub(
		url: string,
		options?: {
			readonly fetcher?: unknown;
			readonly githubToken?: string;
			readonly includeLock?: boolean;
		},
	): Promise<Readonly<Record<string, string>>>;

	export function getSuiMoveVersion(options?: { readonly wasm?: string | URL }): Promise<string>;
}
