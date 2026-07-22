## Context

Project 13753's public export (`https://www.bestpractices.dev/projects/13753.json`) currently has 196 status fields: 13 `Met`, 2 `Unmet`, and 180 `?`. The existing root `.bestpractices.json` contains a small, deliberately conservative evidence seed. It omits criteria that already have public evidence and does not cover the project's legacy Badge and OSPS assessment fields systematically.

The Best Practices dashboard is the authoritative record of attested answers. Repository JSON can supply proposals, but a dashboard maintainer must refresh, review, and save them; a committed file alone neither makes an attestation nor guarantees a passing result.

## Goals / Non-Goals

**Goals:**
- Establish a reproducible inventory of every live assessment field and its starting status.
- Assess every criterion against current public repository evidence, adding `Met` only with a precise committed or public URL/justification.
- Treat unsupported, inapplicable, and unverifiable criteria truthfully as `?` or `Unmet`; make the remaining work visible and actionable.
- Refresh and manually review project 13753 after each evidence batch, then record the dashboard result.
- Reach the dashboard's passing state without claiming compliance before it is actually reported.

**Non-Goals:**
- Fabricating controls, URLs, test results, governance activity, or historical metrics.
- Treating a passing badge image, an automated proposal, or a repository JSON file as proof that the dashboard is attested.
- Implementing every optional Silver, Gold, or OSPS control solely to increase a percentage.

## Decisions

### Use the live project JSON as the assessment baseline

Fetch `https://www.bestpractices.dev/projects/13753.json` at the start of implementation and record its retrieval date, status counts, and field inventory in a committed audit document. This prevents the repository from optimizing against an assumed or stale rubric. The live export is preferred to manually transcribing the dashboard UI because it exposes both legacy and OSPS field names and current values.

### Maintain an evidence matrix before editing answers

For every candidate field, create a reviewable matrix that records: criterion ID/name, current status, proposed status, exact evidence URL, rationale, and disposition (`supported`, `needs implementation`, `not applicable`, or `unknown`). Add an answer to `.bestpractices.json` only when the matrix provides evidence that can be independently checked. This is preferred to bulk-marking apparently related criteria, which can produce misleading attestations.

### Separate repository-remediable controls from dashboard/manual work

Implement missing repository artifacts, configuration, or tests in focused commits. Dashboard refresh, proposal review, and final attestation remain explicit maintainer tasks with recorded output. Criteria that depend on external settings (for example organization-wide 2FA) require public/verifiable evidence or remain unanswered.

### Optimize for Passing, preserve truthfulness

Prioritize required Passing criteria that the project can honestly satisfy. Record unmet mandatory criteria with remediation tasks and do not add the README badge or change `achieve_passing_status` to `Met` until the dashboard confirms it. Silver/Gold and optional OSPS work is tracked separately unless it is needed to clear a Passing blocker.

## Risks / Trade-offs

- [Dashboard criteria or field names change after retrieval] → Record the export date and re-fetch before final attestation.
- [Repository evidence is insufficient for a claimed control] → Keep the field `?` or `Unmet` and create a remediation task instead of inferring compliance.
- [External settings cannot be publicly verified] → Require a maintainer-provided verification record; do not encode a claim in the evidence file without it.
- [A large assessment obscures priority] → Classify criteria by Passing requirement, evidence availability, and implementation cost before making changes.
- [Dashboard import is not automatic] → Include refresh/save/review and a recorded result as blocking implementation tasks.

## Migration Plan

1. Capture the live export and build the initial evidence matrix.
2. Add supported evidence entries and repository artifacts in small, reviewable batches.
3. Refresh project 13753, review each proposal, and correct unsupported mappings.
4. Address remaining Passing blockers, repeat the refresh, and record the result.
5. If a regression occurs, revert the unsupported evidence entry, refresh the dashboard, and preserve the audit record explaining the correction.

## Open Questions

- Which legacy and OSPS fields are actually mandatory for project 13753's current Passing threshold?
- Which organization or repository settings can be independently evidenced through GitHub's public APIs versus requiring an administrator attestation?
- Is the current 19% score a dashboard display metric independent of the legacy Passing level, and which fields contribute to it?
