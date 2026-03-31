# Cloud Fix Plan — TDD Implementation Plan

## Scope anchor
Derived from approved `requirements.md`, `design.md`, and `context.md` for `cloud-fix-plan`.

## Test strategy

### Unit tests (fail first, then implement)

1. **`src/game/logic/clouds.ts` initialization + deterministic stepping**
   - `initializeCloudState(seed, config, cameraFrame)`
     - same seed/config/frame => identical cloud array (id, lane, x/y/z, styleVariant)
     - different seeds => at least one entity differs
     - all coordinates finite; ids unique and stable
   - `stepCloudState(prev, config, cameraFrame, dt)`
     - same initial state + same steps => identical trajectories (tolerance `<=1e-4`)
     - zero drift => `x` unchanged except on recycle
     - non-zero drift => monotonic `x` delta consistent with configured drift sign/magnitude

2. **Lifecycle threshold semantics**
   - recycle does **not** happen before crossing effective despawn threshold
   - recycle happens exactly after threshold crossing and increments `recycleCount`
   - recycled `y` lands in spawn-above-camera band
   - spawn/despawn invalid ordering is sanitized into valid ordering/min separation
   - tight-but-valid thresholds can recycle quickly without per-frame thrash caused by invalid config

3. **Lane policy invariants**
   - mixed front/back lanes present when cloud count supports both
   - lane assignment deterministic across identical runs
   - recycled entities preserve configured lane policy guarantees

4. **Debug config clamping (`src/game/debugConfig.ts`)**
   - new controls are clamped to declared bounds
   - count/density min/max semantics enforced
   - spawn/despawn controls sanitized to non-inverted effective values
   - zero drift explicitly allowed

5. **Public state mapping (`src/game/Game.ts` + `src/game/types.ts`)**
   - test-mode state includes per-cloud diagnostics (`id`, `x/y/z`, `lane`, `recycleCount`)
   - shape is backward-compatible with existing `distractions.visuals` fields

### Integration tests

1. **Game runtime wiring**
   - cloud DOM pool size follows effective cloud count (including runtime debug changes)
   - cloud update cadence remains compatible with distraction/performance throttling
   - toggling clouds off/on via debug still gates cloud rendering path correctly

2. **Simulation-to-render adapter**
   - lane/depth state maps to expected classes/style vars for front/back layering
   - rounded-lobe variant classes map deterministically from cloud styleVariant

3. **Live debug updates**
   - applying debug values during paused deterministic stepping changes cloud behavior on next step (not before step)

### E2E scenario (Playwright, deterministic harness)

**Scenario: “Cloud lifecycle + controls under ascent and adversarial thresholds”**
1. Launch game in `?test=1&debug=1` with deterministic seed.
2. Set cloud controls to mixed lanes, moderate count, visible drift, valid spawn/despawn gap.
3. Perform scripted placements/steps to force camera ascent.
4. Assert from `getState()`:
   - cloud diagnostics exist and include lane + recycleCount
   - screen/world progression changes consistently with ascent
   - no recycle before despawn crossing
5. Continue stepping until at least one recycle event; assert spawn-above band and recycleCount increment.
6. Adversarial path: set inverted/tight thresholds + zero drift via debug UI/API, step once.
7. Assert sanitized effective behavior:
   - no invalid NaN/Infinity state
   - deterministic stationary-X (except recycle)
   - no invalid every-frame thrash from unsanitized controls
8. Confirm core gameplay smoke assertions in `tests/e2e/gameplay.spec.ts` remain green.

## Implementation steps (TDD order)

### Step 1: Build pure cloud simulation contracts + deterministic init/step skeleton
- **Files**: `src/game/logic/clouds.ts`, `tests/unit/clouds.test.ts`
- **Implement**:
  - cloud state/config/entity types
  - deterministic seeded initialization and no-op/skeleton step function
- **Tests passing after step**:
  - deterministic init replay
  - finite/unique invariant tests
- **Demo outcome**: unit tests prove pure deterministic cloud state creation independent of Game/DOM.

### Step 2: Add lifecycle threshold + recycle semantics in pure logic
- **Files**: `src/game/logic/clouds.ts`, `tests/unit/clouds.test.ts`
- **Implement**:
  - camera-relative despawn checks
  - recycle-in-place into spawn-above band
  - recycle metadata increment
- **Tests passing after step**:
  - no pre-threshold recycle
  - post-threshold recycle + spawn band correctness
  - deterministic replay across fixed steps
- **Demo outcome**: fixed-step simulation shows predictable threshold-gated recycle behavior.

### Step 3: Implement lane policy + horizontal drift + config sanitization helpers
- **Files**: `src/game/logic/clouds.ts`, `tests/unit/clouds.test.ts`
- **Implement**:
  - deterministic front/back assignment and lane-depth metadata
  - horizontal drift application
  - sanitize helpers for threshold ordering/min gap
- **Tests passing after step**:
  - lane-mix invariants init/recycle
  - drift + zero-drift semantics
  - tight/inverted threshold sanitization behavior
- **Demo outcome**: simulation snapshots show mixed lanes and expected drift without vertical ambient drift hacks.

### Step 4: Integrate cloud simulation into Game runtime and retire legacy cloud path
- **Files**: `src/game/Game.ts`, `src/game/logic/clouds.ts`, `tests/unit/clouds.test.ts` (or integration-focused unit tests)
- **Implement**:
  - replace legacy mixed cloud update path with simulation state consumption
  - keep deterministic update cadence aligned with existing performance/distraction loop
  - remove obsolete interval respawn logic/constants
- **Tests passing after step**:
  - cloud channel toggle regression checks
  - runtime mapping baseline checks (transforms from simulation state)
- **Demo outcome**: game runs with cloud layer fully driven by new logic, no legacy respawn behavior.

### Step 5: Add cloud debug controls + clamp behavior + live application
- **Files**: `src/game/debugConfig.ts`, `src/game/Game.ts`, `src/game/types.ts`, `tests/unit/debugConfig.test.ts`, `tests/e2e/clouds.spec.ts`
- **Implement**:
  - controls for count/density, drift speed, spawn-above band, despawn-below threshold (and lane controls if included)
  - clamping + sanitization in config pipeline
  - ensure live updates apply on deterministic step
- **Tests passing after step**:
  - debug clamp/sanitize unit cases
  - e2e live-control effect checks
- **Demo outcome**: `?debug` exposes cloud controls that alter behavior immediately after next simulation step.

### Step 6: Implement rounded-lobe cloud render adapter/style
- **Files**: `src/game/Game.ts`, `src/styles.css`, `tests/e2e/clouds.spec.ts`
- **Implement**:
  - DOM structure/classes/style vars for rounded-lobe cloud variants
  - lane-aware subtle visual differentiation (front/back) without changing simulation semantics
- **Tests passing after step**:
  - e2e assertions for rendered cloud node presence + variant/layer classes
- **Demo outcome**: in-browser clouds render as smooth rounded-lobe silhouettes with lane layering.

### Step 7: Expose per-cloud diagnostics in test API + finalize deterministic acceptance coverage
- **Files**: `src/game/types.ts`, `src/game/Game.ts`, `tests/unit/clouds.test.ts`, `tests/e2e/clouds.spec.ts`, `tests/e2e/gameplay.spec.ts`
- **Implement**:
  - test-mode diagnostics payload for per-cloud state
  - complete acceptance assertions for deterministic trajectory/lifecycle/lane mix
  - preserve existing gameplay/performance smoke checks
- **Tests passing after step**:
  - full cloud unit suite
  - updated cloud e2e scenario (including adversarial threshold path)
  - core gameplay e2e smoke
- **Demo outcome**: `window.__towerStackerTestApi.getState()` supports deterministic cloud assertions and all cloud acceptance gates pass.

### Step 8: Documentation sync + final verification gate
- **Files**: `docs/features.md`, `README.md` (if control surface/workflow text changed)
- **Implement**:
  - document new cloud behavior, controls, and diagnostics/testing expectations
- **Tests passing after step**:
  - `npm run test:unit`
  - `npm run test:e2e`
- **Demo outcome**: docs match shipped behavior and test gates remain green.

## Exit criteria for handoff
- Plan provides executable failing-first test list for unit/integration/e2e.
- Each step is atomic, demoable, and directly mapped to target files.
- Final step includes mandatory docs + regression verification gates.