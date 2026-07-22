## 1. Assessment baseline and triage

- [x] 1.1 Fetch `https://www.bestpractices.dev/projects/13753.json`, record its retrieval date, status counts, and all legacy Badge/OSPS fields in a committed assessment inventory.
- [x] 1.2 Identify the current Passing threshold and classify every field as required for Passing, optional, obsolete, or requiring dashboard clarification.
- [x] 1.3 Build an evidence matrix for all Passing-relevant fields with current status, proposed disposition, exact evidence URL, rationale, and a missing-control note where evidence is insufficient.

## 2. Evidence-backed repository updates

- [x] 2.1 Add the omitted, already-supported project-description, interaction, and contribution-requirements answers to `.bestpractices.json` with precise public evidence URLs.
- [x] 2.2 Add every other Passing-relevant answer that the evidence matrix supports, including required legacy Badge and OSPS fields, without bulk-marking unsupported criteria.
- [x] 2.3 Implement or document missing repository controls that block a Passing-relevant criterion, then add its answer only after verifying the linked public evidence.
- [x] 2.4 Keep unsupported, inapplicable, externally unverifiable, and optional criteria as `?` or `Unmet` with a recorded disposition and remediation path.

## 3. Dashboard review and attestation

- [ ] 3.1 Refresh project 13753 from the default branch, review every dashboard proposal against the assessment inventory, and correct any unsupported proposal.
- [ ] 3.2 Attest supported answers in the Best Practices dashboard and record the project URL, refresh date, score/status, and unresolved Passing blockers.
- [ ] 3.3 Repeat evidence updates and dashboard refreshes until the dashboard reports Passing, or document the specific external or implementation blockers that prevent it.

## 4. Maintainer procedure and verification

- [x] 4.1 Update repository governance documentation with the export-fetch, field-triage, evidence-matrix, dashboard-review, and regression-recovery procedure.
- [x] 4.2 Add validation that `.bestpractices.json` entries used for `Met` claims have matching, reachable evidence URLs and inventory records.
- [ ] 4.3 Verify the committed inventory, evidence file, public links, and dashboard result are mutually consistent; remove the README badge if the dashboard does not report Passing.
