# Remy refactor progress checkpoint — 2026-06-19 (runtime-reset slice)

## Scope
Continue the behavior-preserving Remy/runtime refactor on branch `refactor/remy-model-configs-phase2` after the 2026-06-14 secondary-load-metadata slice, without waiting for manual testing.

## Current branch
- `refactor/remy-model-configs-phase2`

## Historical starting point resumed
This slice resumes from:
- `docs/plans/2026-06-14-remy-secondary-load-metadata-refactor-progress.md`

The immediately prior checkpoint identified Remy refresh/reset runtime state as the smallest likely remaining seam. `Game.ts` still manually cleared the same loaded-character handles, mixer handles, active character ids, anchor state, loading flags, and refresh flags in multiple reset paths.

## Completed in this slice
Extracted loaded-character runtime reset state construction into `src/game/characters/characterLoadRuntimeState.ts`, then rewired `Game.ts` to apply that shared reset state from one local helper.

### What moved
- Added `createResetCharacterRuntimeState(...)` to `src/game/characters/characterLoadRuntimeState.ts`
  - increments the load generation to invalidate stale async loads
  - clears loading/refresh/appearance-refresh flags
  - clears primary/secondary views and animation mixers
  - clears active primary/secondary character ids
  - clears anchor and tentacle-suppression state
- Added `Game.resetRemyRuntimeHandles()` as the single Game-local assignment bridge for the reset state.
- Rewired both `resetWorld()` and `refreshRemyCharacterSelection()` to use the shared reset path.
- Removed duplicated Remy runtime clear assignments from `resetWorld()` and `refreshRemyCharacterSelection()`.
- Extended `tests/unit/characterLoadRuntimeState.test.ts` to pin the reset-state contract.

## Why this slice matters
`Game.ts` still owns scene teardown/release policy (`disposeAll()` for full world reset, `release()` for character refresh), but the loaded-character runtime reset invariants now live with the loaded-runtime-state helper instead of being duplicated across Game reset paths. This keeps stale-load invalidation and active character handle clearing consistent without moving broader world reset behavior out of `Game.ts`.

## Behavior intent
- No gameplay or visual behavior change intended.
- Preserve stale async load invalidation by incrementing `remyLoadGeneration` on both reset paths.
- Preserve full-world reset using `characterAnimationManager.disposeAll()`.
- Preserve character refresh using `characterAnimationManager.release()` followed by `spawnLedgeCharacter()`.
- Keep scene/group teardown and world reset ownership in `Game.ts`.

## Verification run
Passed locally on this branch after the runtime-reset extraction:
- `npm test -- tests/unit/characterLoadRuntimeState.test.ts`
- `npm run check`
- `npm test -- tests/unit/characterLoadRuntimeState.test.ts tests/unit/characterPlayback.test.ts tests/unit/characterSelection.test.ts tests/unit/characterAnimationManager.test.ts`
- `npm run build`
- `npm test`
- `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 LD_LIBRARY_PATH=/home/hermes/.local/playwright-libs/extracted/usr/lib/x86_64-linux-gnu npm run test:e2e`

## Files changed in this slice
- `src/game/Game.ts`
- `src/game/characters/characterLoadRuntimeState.ts`
- `tests/unit/characterLoadRuntimeState.test.ts`
- `docs/plans/2026-06-19-remy-runtime-reset-refactor-progress.md`

## Current state after verification
- Typecheck: passing
- Targeted loaded-runtime-state coverage: passing
- Adjacent character runtime/selection/animation-manager coverage: passing
- Full unit suite: passing (`265 passed`)
- Build: passing
- Playwright E2E: passing (`30 passed`, `1 skipped`)
- Manual live test: not run in this slice
- Public deploy/test link: not available yet because this branch work is still not on `main`

## Best next slice after this
Smallest remaining likely refactor candidate:
- Inspect `loadRemyCharacter()` for remaining loaded-character runtime write-back and stale-generation guard plumbing. If there is a narrow seam, extract the post-load state-application assignment bridge or async load outcome handling while keeping actual async orchestration, scene placement, and error reporting in `Game.ts`.

## Resume notes for future sessions
1. Stay on branch `refactor/remy-model-configs-phase2` unless landing to `main` is the explicit goal.
2. Read this file first, then the 2026-06-14 secondary-load-metadata checkpoint.
3. Continue behavior-preserving slices unless the user asks for a live/manual validation pass.
4. Re-run the same verification ladder after the next slice before pushing.
