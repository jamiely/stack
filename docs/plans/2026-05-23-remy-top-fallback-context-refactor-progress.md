# Remy refactor progress checkpoint — 2026-05-23 (top-fallback-context slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor on top of the earlier May 23 ledge-anchor-context slice by shrinking `src/game/Game.ts` in another narrow step.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
This slice resumes from:
- `docs/plans/2026-05-14-remy-refactor-progress.md`
- `docs/plans/2026-05-17-remy-load-runtime-state-refactor-progress.md`
- `docs/plans/2026-05-23-remy-ledge-anchor-context-refactor-progress.md`

The immediately prior slice extracted shared ledge-anchor context assembly. The next remaining duplication seam was top-fallback context assembly used by both live placement and spatial-debug code.

## Completed in this slice
Extracted the top-fallback placement-context assembly out of `Game.ts` into the placement controller so both fallback attachment and fallback spatial-debug context go through the same helper.

### What moved
- Added `resolveCharacterTopFallbackPlacement(...)` to `src/game/characters/characterPlacementController.ts`
  - wraps raw top-slab metadata into the shared `CharacterPlacementContext`
  - keeps top-fallback placement defaults centralized with the rest of the placement-controller API
- Rewired `src/game/Game.ts` so both:
  - `placeRemyAtTopFallback()`
  - `getRemySpatialAnchorContext()` when `forceTopFallback` is enabled
  now consume the shared helper instead of rebuilding the same fallback context inline
- Extended `tests/unit/characterPlacementController.test.ts`
  - verifies raw top-slab fallback metadata resolves into the expected centered fallback context

## Why this slice matters
Before this change, `Game.ts` still duplicated the same top-slab fallback context assembly in the live placement path and the model-lab/spatial-debug path. Moving that assembly into the placement controller keeps `Game.ts` focused on fallback eligibility, scene attachment, and refresh sequencing while making fallback context ownership consistent with the ledge path.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve forced top-fallback behavior in model-lab mode.
- Preserve centered fallback placement on the top slab.
- Preserve fallback spatial-debug snapshots using the same placement context as live fallback attachment.

## Verification run
Passed locally on this branch after the top-fallback-context extraction:
- `npm test -- tests/unit/characterPlacementController.test.ts tests/unit/characterPlacementMath.test.ts tests/unit/characterPlacementRuntime.test.ts tests/unit/characterView.test.ts`
- `npm run check`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`

## Current state after verification
- Typecheck: passing
- Targeted placement/unit coverage: passing
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- extract the remaining fallback attachment sequencing seam so `Game.ts` only coordinates slab presence checks and side effects while the controller/preparation layer owns more of the pure fallback placement inputs.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the earlier May 23 ledge-anchor-context checkpoint for immediate lineage.
3. Inspect `placeRemyAtTopFallback()` for any remaining pure prep/attachment split that can move without changing behavior.
4. Re-run the same verification ladder after the next slice before widening test scope.
