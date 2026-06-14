# Remy refactor progress checkpoint — 2026-06-14 (ledge-metadata slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor on branch `refactor/remy-model-configs-phase2` after the 2026-06-14 placement-attachment slice.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
This slice resumes from:
- `docs/plans/2026-05-23-remy-top-fallback-context-refactor-progress.md`
- `docs/plans/2026-06-14-remy-placement-attachment-refactor-progress.md`

The immediately prior slice centralized primary/secondary placement attachment. The next repeated seam was raw ledge metadata normalization before resolving placement context.

## Completed in this slice
Extracted raw ledge `userData` metric normalization into `src/game/characters/characterPlacementController.ts`.

### What moved
- Added `CharacterLedgePlacementMetadata` and `resolveCharacterLedgePlacementFromMetadata(...)` to `src/game/characters/characterPlacementController.ts`
  - normalizes optional `ledgeHeight`, `ledgeDepth`, `usableWidth`, and `widthRatio` values
  - preserves the existing `faceId ?? null` behavior
  - delegates to `resolveCharacterLedgePlacement(...)` after normalization
- Rewired `src/game/Game.ts` so both:
  - `placeRemyOnTopLedge()`
  - `getRemySpatialAnchorContext()`
  use the metadata resolver instead of repeating `ledgeMesh.userData` type checks inline
- Extended `tests/unit/characterPlacementController.test.ts`
  - verifies explicit raw ledge metadata passes through to resolved placement
  - verifies missing/non-numeric raw metadata falls back to existing placement defaults

## Why this slice matters
Before this change, `Game.ts` still knew every raw `ledgeMesh.userData` field required for Remy placement and repeated the same numeric guards in both live placement and spatial-debug context creation. Moving that normalization into the placement controller keeps `Game.ts` focused on choosing which anchor to use, while the placement controller owns how raw ledge metadata becomes a resolved character placement.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve explicit ledge metric passthrough.
- Preserve fallback ledge height/depth defaults.
- Preserve dual-character width-ratio decision input.
- Preserve spatial-debug context using the same resolved placement inputs as live ledge attachment.

## Verification run
Passed locally on this branch after the ledge-metadata extraction:
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
- `docs/plans/2026-06-14-remy-ledge-metadata-refactor-progress.md`

## Current state after verification
- Typecheck: passing
- Targeted placement/unit coverage: passing
- Full unit suite: passing (`261 passed`)
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- inspect the remaining Remy state-reset and refresh-pending paths around `refreshRemyCharacterSelection()`, `clearRemyCharacter()`, and the model-lab force-fallback path; if there is duplicated pure state assembly, extract it without moving anchor/scene side effects.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the 2026-06-14 placement-attachment checkpoint.
3. Inspect `Game.ts` for the next repeated Remy-only pure-prep seam; avoid moving gameplay side effects or scene lifecycle ownership in the same slice.
4. Re-run the same verification ladder after the next slice before widening scope.
