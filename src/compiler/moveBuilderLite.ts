import type * as MoveBuilderLiteModule from "@zktx.io/sui-move-builder/lite";

let moveBuilderLitePromise: Promise<typeof MoveBuilderLiteModule> | null = null;

export async function loadMoveBuilderLite(): Promise<typeof MoveBuilderLiteModule> {
  if (moveBuilderLitePromise === null) {
    moveBuilderLitePromise = import("@zktx.io/sui-move-builder/lite") as Promise<typeof MoveBuilderLiteModule>;
  }

  return moveBuilderLitePromise;
}

export function resetMoveBuilderLiteForTests(): void {
  moveBuilderLitePromise = null;
}