import { expect, type Page } from "@playwright/test";

interface AxeViolationNode {
  readonly html: string;
  readonly failureSummary?: string | null;
}

interface AxeViolation {
  readonly id: string;
  readonly impact?: string | null;
  readonly nodes: readonly AxeViolationNode[];
}

interface AxeResults {
  readonly violations: readonly AxeViolation[];
}

interface AxeBuilderLike {
  include(selector: string): AxeBuilderLike;
  analyze(): Promise<AxeResults>;
}

type AxeBuilderConstructor = new (input: { readonly page: Page }) => AxeBuilderLike;

async function createAxeBuilder(page: Page): Promise<AxeBuilderLike> {
  const moduleName = "@axe-core/playwright";
  const module = await import(moduleName) as { default: AxeBuilderConstructor };
  return new module.default({ page });
}

export async function expectNoAccessibilityViolations(
  page: Page,
  options: {
    readonly include?: readonly string[];
  } = {},
): Promise<void> {
  let builder = await createAxeBuilder(page);

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