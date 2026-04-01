# Existing Patterns — improve-fireworks-visual

## Fireworks baseline integration points
- Fireworks is currently only a distraction channel signal in deterministic distraction state (`active.fireworks` + pulse signal), not a standalone lifecycle simulation (`src/game/logic/distractions.ts:11`, `src/game/logic/distractions.ts:94`, `src/game/logic/distractions.ts:158`).
- Current render path is DOM overlay pulse visuals (`.distraction-fireworks` with one burst span), positioned in screen percentages instead of world coordinates (`src/game/Game.ts:629`, `src/game/Game.ts:631`, `src/game/Game.ts:1502`, `src/styles.css:203`, `src/styles.css:211`).
- Test surface currently exposes only `distractions.visuals.fireworksOpacity` for fireworks (no per-shell/per-particle telemetry yet) (`src/game/Game.ts:2397`, `src/game/Game.ts:2440`, `src/game/types.ts:164`).

## Deterministic simulation pattern to mirror
- New simulation-heavy distractions are implemented as separate pure logic modules with typed state + init/step APIs, then adapted in `Game.ts` (cloud precedent) (`src/game/logic/clouds.ts:18`, `src/game/logic/clouds.ts:60`, `src/game/logic/clouds.ts:100`, `src/game/Game.ts:1562`).
- Determinism is seed-driven via shared seeded RNG helper and fixed-step stepping in tests (`src/game/logic/random.ts:1`, `src/game/logic/clouds.ts:60`, `src/game/Game.ts:2374`).
- Paused test mode keeps render adapters callable but blocks simulation mutation unless stepped (`src/game/Game.ts:878`, `src/game/Game.ts:882`, `tests/e2e/clouds.spec.ts:245`).

## Runtime debug control + launch action patterns
- Numeric runtime controls are centralized in `DEBUG_RANGES` + `clampDebugConfig`, with strict type coverage through `DebugConfig` and unit clamping assertions (`src/game/Game.ts:164`, `src/game/debugConfig.ts:68`, `src/game/types.ts:32`, `tests/unit/debugConfig.test.ts:5`).
- Per-channel debug launch buttons are generated from channel metadata and routed through forced timer records; forced activation merges into effective snapshot via `getEffectiveDistractionSnapshot` (`src/game/Game.ts:730`, `src/game/Game.ts:742`, `src/game/Game.ts:1196`, `src/game/Game.ts:1230`, `src/game/logic/runtime.ts:27`).

## Testing patterns to reuse for fireworks overhaul
- Unit tests for deterministic logic use repeated fixed-step runs and cross-seed assertions (clouds/distractions precedent) (`tests/unit/clouds.test.ts:56`, `tests/unit/clouds.test.ts:87`, `tests/unit/distractions.test.ts:61`).
- E2E tests in paused deterministic mode rely on `applyDebugConfig` + `stepSimulation` boundaries to assert exact lifecycle progression and state snapshots (`tests/e2e/clouds.spec.ts:245`, `tests/e2e/clouds.spec.ts:322`, `tests/e2e/gameplay.spec.ts:142`).
- Existing debug launch e2e coverage already validates on-demand distraction forcing; fireworks can extend this rather than introducing a separate harness style (`tests/e2e/gameplay.spec.ts:568`).
