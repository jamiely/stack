# Remy refactor progress checkpoint — 2026-06-14 (secondary-load-metadata slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor on branch `refactor/remy-model-configs-phase2` after the 2026-06-14 ledge-metadata slice, without waiting for manual testing.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
This slice resumes from:
- `docs/plans/2026-06-14-remy-placement-attachment-refactor-progress.md`
- `docs/plans/2026-06-14-remy-ledge-metadata-refactor-progress.md`

The immediately prior slice moved raw ledge metadata normalization for placement context into the placement controller. One remaining raw metadata read stayed in `Game.ts`: secondary Remy load eligibility still inspected `ledgeMesh.userData.widthRatio` directly before calling the dual-character policy.

## Completed in this slice
Extracted secondary-character load eligibility metadata handling into `src/game/characters/characterPlacementController.ts`.

### What moved
- Added `ShouldUseDualCharacterLedgeMetadataOptions` and `shouldUseDualCharacterLedgeMetadata(...)` to `src/game/characters/characterPlacementController.ts`
  - returns `false` when no ledge metadata exists
  - normalizes non-numeric `widthRatio` to `0`
  - delegates the final decision to the existing dual-character policy callback
- Rewired `src/game/Game.ts` so `shouldLoadSecondaryRemyCharacter()` no longer directly reads or type-checks `ledgeMesh.userData.widthRatio`
- Extended `tests/unit/characterPlacementController.test.ts`
  - verifies numeric width-ratio metadata is forwarded to the dual-character policy
  - verifies missing metadata stays single-character without invoking the policy
  - verifies non-numeric width-ratio metadata falls back to `0`

## Why this slice matters
`Game.ts` now asks whether the selected ledge metadata supports secondary Remy loading, but the placement controller owns how raw ledge metadata feeds the dual-character policy. This keeps metadata guard/default behavior together with the existing placement-context metadata resolver.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve no-anchor behavior as single-character loading.
- Preserve non-numeric width-ratio behavior as width ratio `0`.
- Preserve existing dual-character policy (`shouldSpawnDualRemyCharacters`) as the source of truth.

## Verification run
Passed locally on this branch after the secondary-load-metadata extraction:
- `npm test -- tests/unit/characterPlacementController.test.ts`
- `npm run check`
- `npm test -- tests/unit/characterPlacementController.test.ts tests/unit/characterPlacementMath.test.ts tests/unit/characterPlacementRuntime.test.ts tests/unit/characterView.test.ts tests/unit/characterSelection.test.ts`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`
- `npm test`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`
- `docs/plans/2026-06-14-remy-secondary-load-metadata-refactor-progress.md`

## Current state after verification
- Typecheck: passing
- Targeted placement/selection-adjacent coverage: passing
- Full unit suite: passing (`264 passed`)
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: intentionally not run; user requested continuing without manual testing
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- inspect Remy refresh/reset runtime state around `refreshRemyCharacterSelection()` and `resetWorld()`; if the same character-runtime field reset appears in multiple places, extract a small local helper or character-runtime helper without moving scene teardown ownership or game-wide reset behavior.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the 2026-06-14 ledge-metadata checkpoint.
3. Keep continuing without manual testing unless the user asks for live/manual validation.
4. Re-run the same verification ladder after the next slice before pushing.
