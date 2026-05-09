/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __PROJECT_PACKAGES__: {
	readonly dependencies: readonly {
		readonly name: string;
		readonly version: string;
	}[];
	readonly devDependencies: readonly {
		readonly name: string;
		readonly version: string;
	}[];
	readonly totalCount: number;
};

interface ImportMetaEnv {
	readonly VITE_DEBUG?: string;
	readonly VITE_GITHUB_AUTH_CALLBACK_PATH?: string;
	readonly VITE_GITHUB_CLIENT_ID?: string;
	readonly VITE_WALRUS_UPLOAD_RELAY_URL?: string;
	readonly VITE_WALRUS_UPLOAD_RELAY_TIP_MAX?: string;
}

declare module "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url" {
	const src: string;
	export default src;
}

declare module "@zktx.io/sui-move-builder" {
	export interface MovePackageFetchLocalContext {
		readonly dependencyName: string;
		readonly parentPackageName: string;
		readonly parentSource?: {
			readonly type: string;
			readonly git?: string;
			readonly rev?: string;
			readonly subdir?: string;
			readonly local?: string;
		};
		readonly network: "mainnet" | "testnet" | "devnet";
	}

	export class MovePackageFetcher {
		fetchLocal?: (localPath: string, context: MovePackageFetchLocalContext) => Promise<Record<string, string>>;
		fetch(gitUrl: string, rev: string, subdir?: string): Promise<Record<string, string>>;
		fetchFile(gitUrl: string, rev: string, path: string): Promise<string | null>;
		getResolvedSha(gitUrl: string, rev: string): string | undefined;
	}

	export class GitHubMovePackageFetcher extends MovePackageFetcher {
		constructor(token?: string);
	}

	export interface MovePackageResolvedDependencies {
		readonly files: string;
		readonly dependencies: string;
		readonly lockfileDependencies: string;
	}

	export type MovePackageProgressEvent =
		| { readonly type: "resolve_start" }
		| { readonly type: "resolve_dep"; readonly name: string; readonly source: string; readonly current: number; readonly total: number }
		| { readonly type: "resolve_complete"; readonly count: number }
		| { readonly type: "compile_start" }
		| { readonly type: "compile_complete" }
		| { readonly type: "lockfile_generate" }
		| { readonly type: "fetch_failed" & Record<string, unknown> }
		| { readonly type: "stage_trace" & Record<string, unknown> };

	export interface MovePackageDumpSuccess {
		readonly modules: readonly string[];
		readonly dependencies: readonly string[];
		readonly digest: readonly number[];
		readonly moveLock: string;
		readonly environment: string;
		readonly warnings?: string;
		readonly intent: "dump";
	}

	export interface MovePackageFailure {
		readonly error: string;
		readonly category?: string;
		readonly code?: string;
	}

	export type MovePackageResult = MovePackageDumpSuccess | MovePackageFailure;

	export interface MovePackageInput {
		readonly files: Record<string, string>;
		readonly wasm?: string | URL | BufferSource;
		readonly rootGit?: { readonly git: string; readonly rev: string; readonly subdir?: string };
		readonly githubToken?: string;
		readonly fetcher?: MovePackageFetcher;
		readonly ansiColor?: boolean;
		readonly network?: "mainnet" | "testnet" | "devnet";
		readonly resolvedDependencies?: MovePackageResolvedDependencies;
		readonly silenceWarnings?: boolean;
		readonly testMode?: boolean;
		readonly lintFlag?: string;
		readonly stripMetadata?: boolean;
		readonly onProgress?: (event: MovePackageProgressEvent) => void;
	}

	export function initMovePackageBuilder(options?: {
		readonly wasm?: string | URL | BufferSource;
	}): Promise<void>;

	export function dumpMovePackage(input: MovePackageInput): Promise<MovePackageResult>;

	export function resolveMovePackageDependencies(input: Omit<MovePackageInput, "resolvedDependencies">): Promise<MovePackageResolvedDependencies>;

	export function fetchMovePackageFromGitHub(
		url: string,
		options?: {
			readonly fetcher?: unknown;
			readonly githubToken?: string;
			readonly includeLock?: boolean;
		},
	): Promise<Readonly<Record<string, string>>>;

	export function getPinnedSuiMoveVersion(options?: { readonly wasm?: string | URL }): Promise<string>;
}
