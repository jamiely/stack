# Remy refactor progress checkpoint — 2026-05-16

## Scope
Continue the character/render refactor by shrinking `src/game/Game.ts` without changing runtime behavior.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in this slice
Extracted the remaining character/animation selection assembly out of `Game.ts#loadRemyCharacter()` into a focused pure helper.

### What moved
- Added `src/game/characters/characterSelection.ts`
  - `buildNextRemyCharacterSelection(...)`
  - owns seeded selection-random derivation for character/animation choice
  - owns character rotation advancement for primary/secondary slots
  - owns non-repeating first-choice animation selection and fallback candidate ordering
- Rewired `src/game/Game.ts` so `loadRemyCharacter()` now:
  - still owns load gating, generation guards, game-state writes, debug-panel sync, clip playback, and placement refresh
  - delegates character-selection candidate assembly to the new helper
- Added `tests/unit/characterSelection.test.ts`
  - verifies primary/secondary rotation advancement
  - verifies deterministic seeded animation-candidate ordering
  - verifies safe empty-asset fallback behavior

## Why this slice matters
Before this change, `loadRemyCharacter()` still mixed pure selection policy with the remaining runtime orchestration. Moving the rotation/seed/candidate-order logic into a pure helper makes that behavior easier to unit test and reduces the amount of game-runtime state that has to be inspected when debugging character-choice issues.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve seeded deterministic selection behavior.
- Preserve non-repeating animation first-choice behavior.
- Preserve dual-character rotation order and branch-local load/placement behavior.

## Verification run
Passed locally on this branch after the selection-helper extraction:
- `npm run check`
- `npm test -- tests/unit/characterSelection.test.ts tests/unit/characterLoadCoordinator.test.ts tests/unit/characterPlacementController.test.ts tests/unit/remy.test.ts`
- `npm test`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterSelection.ts`
- `tests/unit/characterSelection.test.ts`

## Current state after verification
- Typecheck: passing
- Full unit suite: passing
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice
Smallest next safe refactor candidate:
- extract the active-character debug-panel config sync/reset plumbing out of `Game.ts` into a dedicated helper/controller,
- while leaving DOM ownership in `Game.ts` and preserving current model-lab/debug behavior.

A second viable option after that would be to narrow the remaining clip-playback setup (`playRemyClip` / fallback wiring) into a focused animation-bridge helper if `loadRemyCharacter()` still feels too runtime-heavy.

## Resume notes for future sessions
1. Start on branch `refactor/remy-model-configs-phase2`.
2. Read this file first, then the 2026-05-15 and 2026-05-14 checkpoints for prior slices.
3. The branch now contains placement-controller, load-coordinator, and selection-helper extractions, all locally verified.
4. Before calling anything ready for Jamie to test live, land in a way that produces a GitHub Pages build and send that testable link.
