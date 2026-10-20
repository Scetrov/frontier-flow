## Context

`buildWorldApiUrl` set `limit` only when a caller passed one, and neither consumer did. World API answers such a request with its default page of 100 records in ascending id order.

Read-only probes of `/v2/tribes` on 2026-10-20 established the service's behavior:

| Request | Records returned | `metadata` |
| --- | --- | --- |
| no `limit` | 100 | `{total: 101, limit: 100}` |
| `limit=100` | 100 | `{total: 101, limit: 100}` |
| `limit=167` | 167 | `{total: 167, limit: 167}` |
| `limit=1000` | 167 | `{total: 167, limit: 1000}` |
| `limit=1001` | HTTP 400 | `invalid pagination parameters` |

`metadata.total` is therefore not a count but a capped probe: it reports `min(records, limit + 1)`. A consumer that trusts it cannot detect its own truncation, which is why the defect survived the endpoint migration in `restore-world-api-connectivity`.

## Goals / Non-Goals

- Goal: every consumer receives the complete collection without opting in.
- Goal: a future truncation is observable rather than silent.
- Goal: duplicate identifiers cannot produce duplicate option values.
- Non-goal: changing the base URL, CSP, option mapping, or persisted selections.
- Non-goal: a general paging facility. The service cannot support one correctly today.

## Decisions

### Default the page size in URL construction, not at the call sites

The default belongs in `buildWorldApiUrl` because both consumers and any future one resolve their URL through it. Setting it per call site would leave the same omission available to the next caller. `input.limit ?? WORLD_API_MAX_PAGE_SIZE` keeps an explicit `limit`, including `limit: 0`, which existing coverage relies on.

### Request a single large page instead of paging on offset

`offset` is unsafe on this service: it discards two records per unit rather than one.

| Request | Records returned | Records lost |
| --- | --- | --- |
| `limit=1000&offset=0` | 167 | none |
| `limit=1000&offset=1` | 165 | `1000044` and `1000045` |
| `limit=1000&offset=2` | 163 | four |

A paging loop built on that parameter would delete tribes from the result, which is worse than the truncation it would be trying to fix. One request at the accepted ceiling of 1000 retrieves the whole collection, and `WORLD_API_MAX_PAGE_SIZE` carries the ceiling and the reason. The option keeps a doc comment warning against offset paging.

### Collapse repeated identifiers, keeping first position and last value

`/v2/tribes` returns `1000167` twice: `NPC Corp 1000167` (`nameShort` `C086`, `taxRate` 0) in id order, and `Clonebank 86` (`nameShort` `CO86`, `taxRate` 0.11) appended after the final record. The resolved record is the later one, so last value wins; keeping the first position leaves the rest of the collection in service order. Collapsing also keeps option values unique, which the editor's `key={option.value}` depends on — previously masked only because the second record fell beyond the truncation point.

Records without a usable `id` pass through untouched, so malformed entries keep reaching the option mappers that already reject them.

### Report truncation rather than fail on it

A partial collection is more useful than an error, so truncation warns instead of throwing. Threading a warning into both consumers' error surfaces would change the editor's failure semantics, which this change deliberately leaves alone. `console.warn` matches existing practice in `deployGradeCompiler` and `WalletStatus`, and the rule `total > limit` fires exactly when the service admits more records exist.

## Risks / Trade-offs

- A collection beyond 1000 records cannot be retrieved in one request and offset paging is unusable, so the warning is the only mitigation. At 167 tribes growing by tens per cycle this is years away, and it surfaces loudly if it arrives.
- `console.warn` is not visible to users. Accepted: the condition is a service or integration regression for maintainers, not a user-actionable error.
- Every consumer now transfers the full collection. At 167 records of roughly 22 KB this is immaterial, and the option cache keeps it to one request per collection per session.
