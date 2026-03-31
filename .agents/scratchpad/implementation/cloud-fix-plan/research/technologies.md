# Technologies

## Runtime stack
- TypeScript + Vite app (`package.json:scripts`, `package.json:devDependencies`).
- Three.js scene rendering for world geometry (`package.json:dependencies`, usage throughout `src/game/Game.ts`).
- DOM/CSS overlay layer for distraction actors including clouds (`src/game/Game.ts:610-645`, `src/styles.css:124-145`).

## Determinism/testing infrastructure already available
- Seeded PRNG helper (`src/game/logic/random.ts:3-16`).
- Test-mode URL options with fixed-step simulation cadence and optional seed (`src/game/logic/runtime.ts:7-24`).
- Guarded browser test API with `startGame`, `applyDebugConfig`, `stepSimulation`, and `getState` (`src/game/Game.ts:2359-2461`).

## Test frameworks
- Unit tests use Vitest (`package.json:scripts`, `tests/unit/*.test.ts`).
- End-to-end tests use Playwright with deterministic test-mode interactions (`package.json:scripts`, `tests/e2e/clouds.spec.ts:9-105`, `tests/e2e/gameplay.spec.ts:1009-1132`).

## Implication for cloud-fix implementation
- New cloud simulation logic should live in `src/game/logic/` (pure module + unit-tested), then be adapted in `Game` for DOM rendering to match existing architecture split between deterministic logic and visual adapters (`src/game/logic/distractions.ts:66-170`, `src/game/Game.ts:1549-1651`).
