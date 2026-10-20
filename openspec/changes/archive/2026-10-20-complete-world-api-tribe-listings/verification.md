## Scope

Read-only verification performed on 2026-10-20 against `https://world-api-stillness.live.pub.evefrontier.com` and `https://evedataco.re`. No remote service was modified.

## Service behavior

- `limit` is accepted up to 1000; `limit=1001` and above answer HTTP 400 `{"message":"invalid pagination parameters"}`.
- A request omitting `limit` returns 100 of 167 records, ordered by ascending id, cut between id `98000620` and id `98000621`.
- `metadata.total` reports `min(records, limit + 1)`: `limit=10` reports 11, `limit=100` reports 101, `limit=500` reports 167. It cannot be used to detect truncation.
- `offset` discards two records per unit. `offset=1` returned 165 of the remaining 166 records and dropped both `1000044` and `1000045`; `offset=2` dropped four. Offset paging is unsafe and is not used.
- `/v2/tribes` returns 167 records containing 166 unique ids. `1000167` appears twice: `NPC Corp 1000167` in id order, and `Clonebank 86` appended after the final record.
- `/v2/ships` holds 11 records and was unaffected by the truncation, but shares the boundary and the fix.

## Endpoint provenance

The configured host matches upstream `main` at `3a7f367`, and the file's history contains no other base URL. Of the alternative hosts named anywhere in the repository, none resolves: `world-api-stillness.live.tech.evefrontier.com`, `world-api.evefrontier.com`, and `world-api-utopia.uat.pub.evefrontier.com`. The configured host carries a tribe created 2026-10-18, so it is live and current.

## Consumer results

Both consumers were executed against the live service, before and after the change.

| Measure | Before | After |
| --- | --- | --- |
| List of Tribe options | 100 | 166 |
| Simulation tribe options | 100 | 166 |
| Ids from the independent index reachable | 1 of 38 | 38 of 38 |
| Option values repeated | none observed (duplicate fell past the cut) | none |
| Name conflicts against the independent index | 1 | 0 |

`1000167` now resolves to `Clonebank 86` (`CO86`) rather than `NPC Corp 1000167` (`C086`). The two consumers produce identical id sets. The 128 ids the application holds beyond the independent index are NPC corps and pre-cycle tribes that the service lists and the index does not.

## Repository checks

- `bun run lint` — passes; one pre-existing `react-hooks(exhaustive-deps)` warning in `src/hooks/useGraphTransfer.ts`, untouched by this change.
- `bun run typecheck` — passes.
- `bunx vitest run` — 119 files passed, 1 skipped; 935 tests passed, 1 skipped.
- `bunx playwright test` — 68 passed, 22 skipped. The built-app World API spec asserted the collection URL in three places;
  all three now resolve it through the shared URL builder rather than restating it, so a changed page size cannot break them again.
- `bun run test:security` was not run here: this Windows checkout hits documented platform-only failures in that suite caused by CRLF fixtures, unrelated to this change.
