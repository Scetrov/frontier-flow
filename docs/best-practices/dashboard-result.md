# Best Practices dashboard result

- **Project:** <https://www.bestpractices.dev/en/projects/13753>
- **Refresh and attestation:** 2026-07-22T22:09:07Z
- **Merged evidence PR:** [#62](https://github.com/Scetrov/frontier-flow/pull/62)
- **Result:** `in_progress` (not Passing)
- **Score:** 40%
- **Live export:** <https://www.bestpractices.dev/projects/13753.json>

The maintainer refreshed the default branch and attested the 14 supported dashboard proposals. The export changed from 13 to 27 `Met` fields; it still contains 166 `?`, 2 `Unmet`, and one `0` field. The dashboard has no `achieved_passing_at` value, so this document does not claim Passing.

## Remaining Passing blockers

The following Passing-required fields remain unclaimed in the [evidence matrix](./evidence-matrix.json). They are grouped by the specific evidence or control still needed:

| Fields | Blocker and remediation |
| --- | --- |
| `documentation_interface` | Publish user-facing reference documentation for Frontier Flow's external inputs and outputs, or obtain a dashboard-approved N/A justification. |
| `know_secure_design`, `know_common_errors` | A primary developer must provide publicly verifiable secure-development knowledge evidence or an approved dashboard attestation. |
| `crypto_published`, `crypto_floss`, `crypto_keylength`, `crypto_working`, `crypto_password_storage`, `crypto_random` | Complete and publish a crypto/data-flow review that identifies whether the application implements each control; add precise evidence or an allowed N/A justification. |
| `delivery_unsigned` | Verify and document that no downloadable hash is retrieved over HTTP without signature verification. |
| `release_notes_vulns`, `vulnerabilities_fixed_60_days`, `vulnerability_report_response` | Obtain release and vulnerability-response history sufficient for the dashboard's time-bound criteria, or an allowed N/A determination. |
| `report_responses` | Review the last 2–12 months of public issue activity and record evidence that a majority of reports were acknowledged. |
| `tests_are_added` | Link a recent major-change pull request that includes its automated tests. |
| `warnings_fixed`, `static_analysis_fixed`, `dynamic_analysis_fixed` | Retain public CI, CodeQL, and applicable dynamic-analysis evidence showing confirmed medium-or-higher findings and warnings are fixed in a timely manner. |
| `no_leaked_credentials` | Obtain publicly verifiable secret-scanning evidence or dashboard guidance for this repository-level control. |
| `maintained` | The export retains `maintained_status: 0`; obtain dashboard clarification on its evaluation and the evidence needed to change it. |

Optional, obsolete, and OSPS fields remain at their exported values under the dispositions in the assessment inventory. They are not being asserted to increase the score.
