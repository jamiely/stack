# Technologies

## Runtime/game stack in scope
- TypeScript + Vite ESM app with scripts for `build`, `test:unit`, `coverage`, and `test:e2e` (`package.json:6-14`).
- Rendering/runtime is Three.js, with character loading via `GLTFLoader` + `DRACOLoader` and animation retargeting via `retargetClip` (`src/game/Game.ts:29-31`, `src/game/Game.ts:2664-2668`, `src/game/Game.ts:2998-3003`).

## Deterministic harness infrastructure already available
- Test mode options (`?test`, `?paused`, `?step`, `?seed`) are centralized in runtime parsing helpers (`src/game/logic/runtime.ts:4-23`).
- Browser test API exposes deterministic stepping, state reads, and scripted actions from `Game.createTestApi()` (`src/game/Game.ts:3845-3878`, `src/game/types.ts:260-270`).

## Test frameworks and quality gates
- Unit tests run under Vitest (`environment: node`) and only include `tests/unit/**/*.test.ts` (`vitest.config.ts:4-6`).
- Coverage is enforced at 90% thresholds and currently includes `src/game/logic/**/*.ts`, `src/game/debugConfig.ts`, and `src/game/FeedbackManager.ts` (`vitest.config.ts:7-16`).
- End-to-end tests run with Playwright against a Vite dev server and include retries in CI (`playwright.config.ts:6-16`).

## Implementation implications for Step 1
- If `CharacterAnimationManager` is placed outside current coverage include globs (for example `src/game/CharacterAnimationManager.ts`), coverage accounting will not include it unless config is updated; placing it under `src/game/logic/` automatically aligns with existing coverage gates (`vitest.config.ts:10`).
- Since `Game` has private Remy internals (`updateRemyAnimation`, `loadRemyCharacter`, `detachRemyCharacter`, etc.), Step 1 bridge wiring should use callback/dependency injection from within `Game` rather than cross-file direct private access (`src/game/Game.ts:2548`, `src/game/Game.ts:2644`, `src/game/Game.ts:3426`).
