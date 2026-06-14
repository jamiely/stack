# Remy refactor progress checkpoint — 2026-06-14 (placement-attachment slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor on branch `refactor/remy-model-configs-phase2` after the May 23 ledge-anchor and top-fallback context slices.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
This slice resumes from:
- `docs/plans/2026-05-23-remy-ledge-anchor-context-refactor-progress.md`
- `docs/plans/2026-05-23-remy-top-fallback-context-refactor-progress.md`

The immediately prior slice centralized top-fallback context assembly. The next remaining duplication seam was the primary/secondary character attachment flow: both ledge placement and top-fallback placement still made `Game.ts` choose lane offsets, call the single-view attachment helper, and detach the secondary view when the resolved placement had no second lane.

## Completed in this slice
Extracted resolved primary/secondary attachment handling into `src/game/characters/characterPlacementController.ts`.

### What moved
- Added `attachCharacterViewsToResolvedPlacement(...)` to `src/game/characters/characterPlacementController.ts`
  - attaches the primary character with lane 0 from the resolved placement context
  - attaches the secondary character only when the caller enables secondary placement, a secondary view exists, and a second lane exists
  - detaches the secondary view when the resolved placement is single-lane or fallback-only
- Rewired `src/game/Game.ts` so both:
  - `placeRemyOnTopLedge()`
  - `placeRemyAtTopFallback()`
  now use the shared resolved-placement attachment helper instead of repeating lane-offset and secondary-detach plumbing inline
- Extended `tests/unit/characterPlacementController.test.ts`
  - verifies primary and secondary views attach through the shared helper with the expected lane offsets
  - verifies fallback/single-lane placement detaches an already-attached secondary view

## Why this slice matters
`Game.ts` still needs to own anchor eligibility, slab/mesh lookup, tentacle suppression, refresh decisions, and the choice of active character configs. It no longer needs to own the repeated mechanics of applying resolved placement lanes to one or two character views. Keeping that in the placement controller makes the live ledge and top-fallback paths use the same secondary-detach policy.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve dual Remy lane offsets on eligible ledges.
- Preserve top-fallback placement as primary-only.
- Preserve secondary-character detachment whenever the resolved placement has no second lane.
- Preserve spatial debug refresh timing in `Game.ts`.

## Verification run
Passed locally on this branch after the placement-attachment extraction:
- `npm test -- tests/unit/characterPlacementController.test.ts`
- `npm run check`
- `npm test -- tests/unit/characterPlacementController.test.ts tests/unit/characterPlacementMath.test.ts tests/unit/characterPlacementRuntime.test.ts tests/unit/characterView.test.ts`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`
- `npm test`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`
- `docs/plans/2026-06-14-remy-placement-attachment-refactor-progress.md`

## Current state after verification
- Typecheck: passing
- Targeted placement/unit coverage: passing
- Full unit suite: passing (`259 passed`)
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- extract a pure raw-ledge-metadata adapter so `Game.ts` does not need to read every `ledgeMesh.userData` field in both live ledge placement and spatial-debug context creation before calling `resolveCharacterLedgePlacement(...)`.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the May 23 top-fallback checkpoint for immediate lineage.
3. Inspect the repeated `resolveCharacterLedgePlacement(...)` option assembly in `placeRemyOnTopLedge()` and `getRemySpatialAnchorContext()`.
4. Keep anchor lookup, tentacle suppression, and refresh side effects in `Game.ts`; move only raw ledge metadata normalization if taking the next slice.
5. Re-run the same verification ladder after the next slice before widening scope.
