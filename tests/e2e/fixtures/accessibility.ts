import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoAccessibilityViolations(
  page: Page,
  options: {
    readonly include?: readonly string[];
  } = {},
): Promise<void> {
  let builder = new AxeBuilder({ page });

  for (const selector of options.include ?? []) {
    builder = builder.include(selector);
  }

  const results = await builder.analyze();
  const violationSummary = results.violations
    .map((violation) => {
      const nodeSummaries = violation.nodes
        .map((node) => `${node.html}\n${node.failureSummary ?? ""}`.trim())
        .join("\n\n");

      return `${violation.id} (${violation.impact ?? "unknown"})\n${nodeSummaries}`.trim();
    })
    .join("\n\n");

  expect(results.violations, violationSummary).toEqual([]);
}