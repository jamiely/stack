# Remy refactor progress checkpoint — 2026-05-23 (ledge-anchor-context slice)

## Scope
Resume the behavior-preserving Remy/runtime refactor from the May 14 session lineage by shrinking `src/game/Game.ts` in another narrow slice.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
The May 14 checkpoint (`docs/plans/2026-05-14-remy-refactor-progress.md`) extracted shared placement orchestration and identified `loadRemyCharacter()` as the next safe target.
Subsequent slices on this same branch already landed:
- 2026-05-16 playback helper extraction
- 2026-05-17 load-runtime-state extraction

This slice resumes from the latest documented next step after those follow-ups.

## Completed in this slice
Extracted the repeated ledge-anchor placement-context assembly out of `Game.ts` into a focused helper inside `src/game/characters/characterPlacementController.ts`.

### What moved
- Added `resolveCharacterLedgePlacement(...)` to `src/game/characters/characterPlacementController.ts`
  - normalizes raw ledge metadata into a shared `CharacterPlacementContext`
  - applies default ledge height/depth fallbacks
  - computes the dual-character decision alongside the context build
- Rewired `src/game/Game.ts` so both:
  - `placeRemyOnTopLedge()`
  - `getRemySpatialAnchorContext()`
  now consume the shared helper instead of rebuilding the same ledge metadata inline
- Extended `tests/unit/characterPlacementController.test.ts`
  - verifies default metric fallback behavior
  - verifies explicit ledge metric passthrough
  - verifies dual-lane decision forwarding

## Why this slice matters
Before this change, `Game.ts` still duplicated the same ledge user-data parsing and placement-context assembly in both live placement and spatial-debug code paths. Moving that assembly into the placement controller reduces monolith ownership while keeping anchor selection, tentacle suppression, and attachment sequencing inside `Game.ts`.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve anchor selection and anchor visibility rules.
- Preserve tentacle suppression behavior.
- Preserve the same dual-character spawn decision logic.
- Preserve spatial debug snapshots using the same effective ledge context as live placement.

## Verification run
Passed locally on this branch after the ledge-anchor-context extraction:
- `npm run check`
- `npm test -- tests/unit/characterPlacementController.test.ts tests/unit/characterPlacementMath.test.ts tests/unit/characterPlacementRuntime.test.ts tests/unit/characterView.test.ts`
- `npm run build`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`

## Current state after verification
- Typecheck: passing
- Targeted placement/unit coverage: passing
- Build: passing
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- extract the top-fallback placement / spatial-debug context assembly into a focused helper so `Game.ts` only owns fallback eligibility, scene attachment, and refresh sequencing.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the 2026-05-17 checkpoint for the immediate prior slice.
3. Inspect `placeRemyAtTopFallback()` and `getRemySpatialAnchorContext()` for the remaining top-fallback duplication seam.
4. Re-run the same verification commands after the next slice before widening scope.
