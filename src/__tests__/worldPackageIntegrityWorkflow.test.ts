import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolvePath(import.meta.dirname, "..", "..", ".github/workflows/world-package-integrity.yml");

describe("world package integrity workflow", () => {
  it("runs as a read-only blocking weekly and manually-dispatchable validation", async () => {
    const workflow = await readFile(workflowPath, "utf-8");

    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("bun run check:world-package-references");
    expect(workflow).not.toContain("continue-on-error");
    expect(workflow).toMatch(/actions\/checkout@[a-f0-9]{40}/);
    expect(workflow).toMatch(/oven-sh\/setup-bun@[a-f0-9]{40}/);
  });
});
