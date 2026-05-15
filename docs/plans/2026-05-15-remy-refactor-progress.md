# Remy refactor progress checkpoint — 2026-05-15

## Scope
Continue the animation/render/character placement refactor by shrinking `src/game/Game.ts` without changing runtime behavior.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in the latest slice
Extracted the remaining async character-loading orchestration out of `Game.ts` into a focused coordinator module.

### What moved
- Added `src/game/characters/characterLoadCoordinator.ts`
  - `loadCharacterCoordinatorResult(...)`
  - owns the primary/secondary model load sequence
  - owns animation-target assembly and resolved-clip lookup
  - preserves the existing "warn and continue" behavior if the secondary model fails to load
- Rewired `src/game/Game.ts` so `loadRemyCharacter()` now:
  - still owns selection state, generation guards, debug-panel sync, live game-state writes, and placement refresh
  - delegates the asset/animation orchestration to the coordinator
- Added `tests/unit/characterLoadCoordinator.test.ts`
  - verifies per-character preparation config wiring
  - verifies null-return behavior when the primary setup cannot be built
  - verifies secondary-load failure warning + fallback to primary-only binding

## Previously completed branch-local slice still not landed
The branch also contains the prior placement extraction work from 2026-05-14:
- `src/game/characters/characterPlacementController.ts`
- `tests/unit/characterPlacementController.test.ts`
- `docs/plans/2026-05-14-remy-refactor-progress.md`

## Why this slice matters
Before this change, `Game.ts#loadRemyCharacter()` still directly owned the longest async model/animation loading path even after lower-level asset-loader and model-prep helpers already existed. This slice moves that orchestration into one dedicated seam so future character-load bugs can be debugged without reopening the full game runtime file.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve character rotation order, animation reroll order, dual-character selection behavior, stale-load generation guards, and fallback clip binding.
- Preserve the current debug-panel remy-config synchronization behavior in `Game.ts`.

## Verification run
Passed locally on this branch after the coordinator extraction:
- `npm run check`
- `npm test -- tests/unit/characterLoadCoordinator.test.ts tests/unit/characterPlacementController.test.ts tests/unit/characterAssetLoader.test.ts tests/unit/characterAnimationGameRouting.test.ts`
- `npm test`
- `npm run build`

## Files changed in this latest slice
- `src/game/Game.ts`
- `src/game/characters/characterLoadCoordinator.ts`
- `tests/unit/characterLoadCoordinator.test.ts`
- `README.md`
- `docs/features.md`

## Current state after verification
- Typecheck: passing
- Full unit suite: passing
- Build: passing
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is not on `main`

## Best next slice
Smallest next safe refactor candidate:
- extract the remaining debug-panel remy-config input synchronization / reset plumbing out of `Game.ts` into a narrow helper, or
- extract the character-selection candidate assembly (rotation + non-repeating animation choice) into a pure selector helper if the goal is to keep shrinking `loadRemyCharacter()` behavior-preservingly.

The first option is probably the better next slice if the priority is reducing `Game.ts` UI/debug ownership. The second is better if the priority is making selection behavior easier to unit test independently.

## Resume notes for future sessions
1. Start on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then `docs/plans/2026-05-14-remy-refactor-progress.md` if you need the prior slice context.
3. The branch is ahead of origin and contains both the placement-controller and load-coordinator extractions, but neither has been manually live-tested or deployed yet.
4. Before calling anything ready for Jamie to test, push/land in a way that produces a GitHub Pages build, then send the testable link.
