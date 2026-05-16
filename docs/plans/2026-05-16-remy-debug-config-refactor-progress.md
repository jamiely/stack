# Remy refactor progress checkpoint — 2026-05-16 (debug-config sync slice)

## Scope
Continue the character/render refactor by shrinking `src/game/Game.ts` without changing runtime behavior.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in this slice
Extracted the active-character Remy debug-config sync/reset plumbing out of `Game.ts` into a focused helper module.

### What moved
- Added `src/game/characters/characterDebugControls.ts`
  - `resolveBaseRemyDebugConfig(...)`
  - `resolveStoredRemyDebugConfig(...)`
  - `applyRemyDebugConfigPatch(...)`
  - `syncRemyDebugInputValues(...)`
  - `syncRemyDebugValueLabels(...)`
- Rewired `src/game/Game.ts` so it now:
  - still owns DOM creation and event wiring for the debug panel
  - delegates active-character config resolution, patch application, and slider/label sync to the helper
  - reuses the helper for load-time character debug sync, reset behavior, secondary placement config lookup, and spatial debug snapshots
- Added `tests/unit/characterDebugControls.test.ts`
  - verifies stored-config fallback behavior
  - verifies patch application + per-character persistence
  - verifies slider/value-label synchronization formatting

## Why this slice matters
Before this change, `Game.ts` still owned the repetitive per-character debug-config fallback logic plus the slider/value-label synchronization loops. Moving that logic into a focused helper reduces UI/debug ownership in the monolith while keeping DOM creation local and preserving the current model-lab/debug surface.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve per-character stored placement-tuning overrides.
- Preserve reset-to-base behavior for the active character.
- Preserve debug slider/value-label synchronization and model-lab placement behavior.

## Verification run
Passed locally on this branch after the debug-config helper extraction:
- `npm run check`
- `npm test -- tests/unit/characterDebugControls.test.ts tests/unit/characterSelection.test.ts tests/unit/characterLoadCoordinator.test.ts tests/unit/characterPlacementController.test.ts`
- `npm test`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterDebugControls.ts`
- `tests/unit/characterDebugControls.test.ts`

## Current state after verification
- Typecheck: passing
- Full unit suite: passing
- Build: passing
- Playwright E2E: passing
- Ready to land to `main` for live test verification

## Best next slice after landing
Smallest remaining safe refactor candidate:
- extract the clip-playback setup / fallback animation bridge (`playRemyClip` and fallback wiring) into a focused helper while keeping mixer ownership and live scene state in `Game.ts`.
