import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface WorkflowStep {
  readonly name: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly run?: string;
}

interface IntegrityWorkflow {
  readonly jobs: { readonly check: { readonly steps: readonly WorkflowStep[] } };
}

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

  it("passes summary context as data and never interpolates Actions expressions into shell source", async () => {
    const workflow = await readFile(workflowPath, "utf-8");
    const { jobs } = parse(workflow) as IntegrityWorkflow;
    for (const step of jobs.check.steps) {
      if (step.run !== undefined) expect(step.run).not.toContain("${{");
    }

    const summary = jobs.check.steps.find((step) => step.name === "Write job summary");
    expect(summary?.env).toEqual({
      SUMMARY_EVENT: "${{ github.event_name }}",
      SUMMARY_REF: "${{ github.ref }}",
      SUMMARY_RUN_ID: "${{ github.run_id }}",
      CHECK_OUTCOME: "${{ steps.check.outcome }}",
    });
    expect(summary?.run).toContain('"$SUMMARY_EVENT" "$SUMMARY_REF" "$SUMMARY_RUN_ID"');
    expect(summary?.run).toContain('if [ "$CHECK_OUTCOME" = "success" ]; then');
    expect(summary?.run).toContain('>> "$GITHUB_STEP_SUMMARY"');
    expect(summary?.run).toContain("printf");
    expect(workflow).toContain("group: world-pkg-integrity-${{ github.workflow }}-${{ github.ref }}");
    expect(workflow).toContain("if: always()");
  });

  it.each(["success", "failure", "skipped"])("renders hostile context literally with a %s outcome", async (outcome) => {
    const { jobs } = parse(await readFile(workflowPath, "utf-8")) as IntegrityWorkflow;
    const summary = jobs.check.steps.find((step) => step.name === "Write job summary");
    const directory = await mkdtemp(resolvePath(tmpdir(), "world-summary-"));
    const summaryPath = resolvePath(directory, "job summary.md");
    const ref = "refs/heads/$(printf injected)`printf injected`;%s";
    try {
      execFileSync("bash", ["-e", "-u", "-c", summary?.run ?? ""], {
        env: {
          ...process.env,
          GITHUB_STEP_SUMMARY: summaryPath,
          SUMMARY_EVENT: "workflow_dispatch",
          SUMMARY_REF: ref,
          SUMMARY_RUN_ID: "42",
          CHECK_OUTCOME: outcome,
        },
      });
      const output = await readFile(summaryPath, "utf-8");
      expect(output).toContain(`**Trigger:** workflow_dispatch\n**Ref:** ${ref}\n**Run:** 42\n`);
      expect(output).toContain(outcome === "success"
        ? "**Status:** ✓ All targets verified"
        : "**Status:** ✗ Drift or verification failure detected");
      if (outcome !== "success") expect(output).toContain("docs/WORLD-PACKAGE-REFERENCE-RUNBOOK.md");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
