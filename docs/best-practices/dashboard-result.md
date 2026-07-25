# Best Practices dashboard result

- **Project:** <https://www.bestpractices.dev/en/projects/13753>
- **Automation refresh observed:** `2026-07-25T21:57:29Z`
- **Automation source:** [`.bestpractices.json`](../../.bestpractices.json) on the default branch (merged in [#66](https://github.com/Scetrov/frontier-flow/pull/66))
- **Live export:** <https://www.bestpractices.dev/projects/13753.json>
- **Live state:** `in_progress`, 76%; `achieved_passing_at: None`.

## Automation result

The live export matches every proposed status in `.bestpractices.json` except the computed `achieve_passing` and `achieve_silver` indicators, which remain `Unmet`. All 43 fields classified as required for Passing in the assessment inventory are now `Met` or `N/A` in the live export.

The project nevertheless remains `in_progress`; this document does not claim that it has achieved Passing. That remaining discrepancy is a dashboard criteria/classification issue, not a failure to ingest the committed automation file.

## Live status counts

`0`: 1, `?`: 142, `Met`: 42, `N/A`: 9, `Unmet`: 2.
