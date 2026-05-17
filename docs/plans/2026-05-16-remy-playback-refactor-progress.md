# Remy refactor progress checkpoint — 2026-05-16 (playback helper slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor by shrinking `src/game/Game.ts` in another narrow slice.

## Current branch
- `refactor/remy-model-configs-phase2`

## Completed in this slice
Extracted the clip-playback setup / fallback bridge out of `Game.ts` into a focused playback helper.

### What moved
- Added `src/game/characters/characterPlayback.ts`
  - `resolveCharacterPlaybackClips(...)`
  - `createCharacterPlaybackMixers(...)`
- Rewired `src/game/Game.ts` so `loadRemyCharacter()` now delegates playback clip fallback + mixer creation to the helper and only stores the resulting primary/secondary mixers.
- Removed the inlined `playRemyFallbackClip(...)` and `playRemyClip(...)` methods from `Game.ts`.
- Added `tests/unit/characterPlayback.test.ts`
  - verifies resolved clip usage
  - verifies fallback clip selection wiring
  - verifies null clips skip mixer creation

## Why this slice matters
Before this change, `Game.ts` still owned the fallback-vs-resolved animation bridge plus the mixer/action setup loop. Moving that logic into a narrow helper reduces animation playback ownership in the monolith while keeping runtime mixer state and scene orchestration inside `Game.ts`.

## Behavior intent
- No gameplay or visible animation behavior change intended.
- Preserve resolved-clip priority when retargeted clips are available.
- Preserve fallback clip usage when retargeted clips are unavailable.
- Preserve ping-pong looping and per-role mixer assignment.

## Verification run
Passed locally on this branch after the playback helper extraction:
- `npm run check`
- `npm test -- tests/unit/characterPlayback.test.ts tests/unit/characterLoadCoordinator.test.ts tests/unit/animationClipResolver.test.ts tests/unit/characterSelection.test.ts tests/unit/characterDebugControls.test.ts`
- `npm test`
- `npm run build`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterPlayback.ts`
- `tests/unit/characterPlayback.test.ts`

## Best next slice after landing
Smallest remaining likely refactor candidate:
- extract the load-result application block inside `loadRemyCharacter()` (active ids, debug-config sync, mixer assignment) into a focused helper that prepares the next runtime state without owning live scene placement.
