# Final fix wave report

## 2026-09-04

Status: complete

- Daily tasks now derive their day key from the local calendar via `toDayKey`.
- Goal replacement inserts and collects replacement IDs before deleting stale
  rows, preserving existing goals when insertion fails.
- Community profile reads use the limited `community_profiles` view; the broad
  authenticated profile-read policy was removed.
- The README documents Expo Go magic-link redirect URL setup and LAN-IP
  changes.

Verification:

- `cd apps/mobile && npm test -- --runInBand` — 12 suites, 47 tests passed.
- `cd apps/mobile && npx tsc --noEmit` — passed.
- IDE diagnostics on changed TypeScript files — no errors.
