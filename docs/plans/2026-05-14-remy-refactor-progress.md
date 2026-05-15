# Remy refactor progress checkpoint — 2026-05-14

## Scope
Continue the animation/render/character placement refactor by shrinking `src/game/Game.ts` without changing runtime behavior.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in this slice
Extracted the remaining shared ledge/top-fallback placement orchestration out of `Game.ts` into a focused controller module.

### What moved
- Added `src/game/characters/characterPlacementController.ts`
  - `buildCharacterLedgePlacementContext(...)`
  - `buildCharacterTopFallbackPlacementContext(...)`
  - `attachCharacterViewToPlacement(...)`
  - `createCharacterSpatialAnchorContext(...)`
- Rewired `src/game/Game.ts` to use the controller for:
  - primary/secondary ledge placement
  - top-fallback placement
  - spatial debug anchor context generation
- Added `tests/unit/characterPlacementController.test.ts`

## Why this slice matters
Before this change, `Game.ts` still owned the last chunk of character-specific placement orchestration even after the lower-level math/runtime helpers had already been extracted. This slice makes `Game.ts` consume a higher-level placement API instead of rebuilding the same context inline.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve the existing dual-character lane logic.
- Preserve the existing shared target-height behavior for the current ledge placement path.
- Keep spatial debug snapshots driven by the same ledge/fallback inputs, now assembled through the controller.

## Verification run
Passed locally on this branch:
- `npm run check`
- `npm test -- tests/unit/characterPlacementController.test.ts tests/unit/characterPlacementMath.test.ts tests/unit/characterPlacementRuntime.test.ts tests/unit/characterView.test.ts`
- `npm run build`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`

## Current state after verification
- Build: passing
- Typecheck: passing
- Targeted placement/unit coverage: passing
- Manual live test: not run yet

## Best next slice
Smallest next safe refactor candidate:
- extract the async character-loading orchestration from `Game.ts#loadRemyCharacter()` into a dedicated loader/coordinator module,
- while keeping model selection, generation guards, and fallback animation binding behavior unchanged.

That next slice should stay behavior-preserving and continue reducing `Game.ts` ownership without touching rendering decisions.

## Resume notes for future sessions
1. Start on branch `refactor/remy-model-configs-phase2`.
2. Read this file first.
3. Then inspect `src/game/Game.ts` and locate `loadRemyCharacter()` as the next likely extraction target.
4. Re-run the same verification commands after the next slice before expanding test scope.
