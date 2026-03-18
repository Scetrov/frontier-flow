/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "@zktx.io/sui-move-builder/lite" {
	export interface BuildSuccessResult {
		readonly modules: readonly string[];
		readonly dependencies?: readonly string[];
		readonly warnings?: string;
	}

	export interface BuildErrorResult {
		readonly error: string;
	}

	export type BuildResult = BuildSuccessResult | BuildErrorResult;

	export function initMoveCompiler(): Promise<void>;

	export function buildMovePackage(input: {
		readonly files: Readonly<Record<string, string>>;
		readonly silenceWarnings: boolean;
		readonly network: string;
	}): Promise<BuildResult>;
}
