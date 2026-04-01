# Technologies — improve-fireworks-visual

## Runtime/render stack
- Three.js is the rendering dependency; world-space fireworks should integrate into existing scene/camera flow instead of DOM-only overlays (`package.json:16`, `src/game/Game.ts:1`, `src/game/Game.ts:897`).
- Existing distraction overlay combines DOM actors over the WebGL canvas; fireworks currently live only in this DOM layer, which is the replacement target (`src/game/Game.ts:610`, `src/game/Game.ts:629`, `src/styles.css:203`).

## Deterministic game/runtime infrastructure
- Test mode supports fixed-step deterministic stepping, pausing, and seed injection via query params and `window.__towerStackerTestApi` (`src/game/logic/runtime.ts:7`, `src/game/logic/runtime.ts:15`, `src/game/Game.ts:2363`, `src/game/types.ts:223`).
- Debug config flow is strongly typed through `DebugConfig`, centralized defaults, and sanitization before use (`src/game/types.ts:32`, `src/game/debugConfig.ts:4`, `src/game/debugConfig.ts:68`, `src/game/Game.ts:2191`).

## Automated testing toolchain
- Unit tests run with Vitest; coverage is available via V8 provider (`package.json:10`, `package.json:12`, `package.json:22`).
- End-to-end coverage runs with Playwright and already exercises deterministic debug/test-mode interactions used by distraction systems (`package.json:13`, `tests/e2e/gameplay.spec.ts:142`, `tests/e2e/clouds.spec.ts:245`).
