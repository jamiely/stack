# Remy refactor progress checkpoint — 2026-05-17 (load-runtime-state slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor by shrinking `src/game/Game.ts` in another narrow slice.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in this slice
Extracted the load-result application block out of `Game.ts#loadRemyCharacter()` into a focused runtime-state helper.

### What moved
- Added `src/game/characters/characterLoadRuntimeState.ts`
  - `prepareLoadedCharacterRuntimeState(...)`
  - owns the narrow bridge from `CharacterLoadCoordinatorResult` to next runtime state:
    - primary/secondary view handles
    - active primary/secondary character ids
    - stored-debug-config lookup for the selected primary character
    - playback-mixer preparation via the existing playback helper
- Rewired `src/game/Game.ts` so `loadRemyCharacter()` now:
  - still owns load gating, generation guards, async error handling, debug-surface sync, and final placement refresh
  - delegates the load-result application assembly to the new helper before writing fields back onto the game instance
- Added `tests/unit/characterLoadRuntimeState.test.ts`
  - verifies active-id/view wiring
  - verifies stored debug-config reuse
  - verifies secondary-id clearing when no secondary setup exists
  - verifies playback-mixer preparation is forwarded through the helper

## Why this slice matters
Before this change, `loadRemyCharacter()` still mixed async orchestration with the bookkeeping that turns a finished coordinator result into live runtime state. Moving that block into a focused helper leaves `Game.ts` responsible for runtime sequencing while making the state-assembly path easier to unit test and reason about.

## Behavior intent
- No gameplay or visible animation behavior change intended.
- Preserve stored per-character placement tuning for the active primary character.
- Preserve primary/secondary mixer assignment behavior.
- Preserve the rule that secondary character state only becomes active when a secondary setup actually loaded.

## Verification run
Passed locally on this branch after the load-runtime-state extraction:
- `npm run check`
- `npm test -- tests/unit/characterLoadRuntimeState.test.ts tests/unit/characterLoadCoordinator.test.ts tests/unit/characterPlayback.test.ts tests/unit/characterDebugControls.test.ts tests/unit/characterSelection.test.ts`
- `npm test`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterLoadRuntimeState.ts`
- `tests/unit/characterLoadRuntimeState.test.ts`

## Current state after verification
- Typecheck: passing
- Full unit suite: passing
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run yet
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- extract the ledge-anchor placement-context assembly inside `placeRemyOnTopLedge()` into a focused helper while keeping anchor selection, tentacle suppression, and live attachment decisions inside `Game.ts`.
