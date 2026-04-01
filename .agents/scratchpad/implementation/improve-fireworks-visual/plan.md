# Implementation Plan — improve-fireworks-visual

## Test Strategy (TDD-first)

### Unit tests (new `tests/unit/fireworks.test.ts`)
Target module: `src/game/logic/fireworks.ts`

1. **Config sanitization + clamps**
   - `sanitizeFireworksConfig` enforces numeric ranges and min/max relationships.
   - Edge case: adversarial config (negative lifetimes, inverted interval bounds, tiny cap) normalizes safely.
2. **Deterministic initialization/stepping**
   - Same seed + same fixed-step sequence => identical shell/particle snapshots + telemetry.
   - Different seed => varied spawn positions and burst patterns.
3. **Launch cadence + gating**
   - Enabled and level-eligible state launches with intervals in 0.8s–2.4s.
   - No starvation gap >3.0s over 20s.
   - Disabled/below-threshold yields zero launches.
4. **Shell arc + apex/primary semantics**
   - Shell travel-to-apex within 0.45s–1.10s and >=6 ticks before burst.
   - Exactly one primary burst per shell, apex-aligned within ±1 tick.
5. **Secondary emission semantics**
   - Secondary starts 0.05s–0.35s after primary.
   - Secondary particles show downward velocity trend by mid-life.
6. **Lifecycle cleanup windows**
   - Primary completion, secondary completion, and full cleanup satisfy required windows.
   - Expired entities are removed from active state (no ghosts).
7. **Particle cap + degradation order**
   - Active particles never exceed `maxActiveParticles` under stress.
   - Secondary drops/reduction happen before primary reduction.

### Integration tests

1. **Debug-config wiring + clamping (`tests/unit/debugConfig.test.ts`)**
   - Add fireworks debug keys/ranges and verify `clampDebugConfig` sanitization relationships.
2. **Game-loop integration + paused-step semantics (`tests/e2e/fireworks.spec.ts`)**
   - In paused deterministic mode, applying debug config does not mutate fireworks state until `stepSimulation`.
   - After one step, new config influences lifecycle values.
3. **Public test-state observability (`tests/e2e/fireworks.spec.ts`)**
   - `getState().distractions.fireworks` exposes scoped lifecycle diagnostics (launch/apex/burst/active/cap counters) for assertions.
4. **Render adapter coverage (`tests/e2e/fireworks.spec.ts`)**
   - Fireworks visual nodes/metadata reflect simulation IDs/stages.
   - Expired particles no longer appear in DOM/render snapshot.
5. **Regression surface (`tests/e2e/gameplay.spec.ts`)**
   - Existing debug launch button contract continues to include fireworks launch action.

### E2E manual validation scenario (Playwright harness)
File: `tests/e2e/fireworks.spec.ts` (single end-to-end scenario with adversarial branch)

1. Open `/?debug&test&paused=1&seed=42`, start game, keep paused.
2. Set fireworks start level to 0, enable fireworks, tune default interval/shell/burst params.
3. Step simulation in small batches and assert staged lifecycle progression:
   - launch appears,
   - shell arc ticks accumulate,
   - primary burst occurs once,
   - secondary appears after delay,
   - full cleanup by <=3.2s from launch.
4. Adversarial branch: set very low `maxActiveParticles` + high burst counts, step 30s deterministic time.
5. Assert cap never exceeded, secondary-drop counters increment first, and no runaway active count.

---

## Numbered Implementation Steps

### Step 1: Add deterministic fireworks logic module skeleton + config sanitization
- **Files**: `src/game/logic/fireworks.ts` (new), `tests/unit/fireworks.test.ts` (new)
- **Tests first**:
  - `sanitizeFireworksConfig clamps adversarial inputs`
  - `initializeFireworksState is deterministic for same seed`
  - `stepFireworksState is deterministic from same snapshot`
- **Implementation**:
  - Define typed config/state/snapshot models and seeded RNG usage.
  - Implement sanitize helpers + deterministic initialize/step skeleton (no full burst behavior yet).
- **Success criteria**:
  - New unit tests pass and module is importable without Game wiring.
- **Demo**:
  - Deterministic state replay in unit tests with sanitized config bounds.

### Step 2: Implement launch scheduler + shell arc/apex + single primary burst
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`
- **Tests first**:
  - cadence window + no-starvation + gating-zero tests
  - arc duration and >=6 pre-burst ticks
  - exactly one primary burst at apex ±1 tick
- **Implementation**:
  - Add launch cooldown sampling, world-space behind-stack spawn sampler.
  - Add shell physics integration and apex event handling.
  - Emit one primary burst and retire shell.
- **Success criteria**:
  - Lifecycle reaches primary burst deterministically and acceptance timing windows hold.
- **Demo**:
  - Unit simulation log shows repeated launches and one primary burst per shell.

### Step 3: Implement delayed secondary emissions + fade/expiry/cleanup
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`
- **Tests first**:
  - secondary delay window and downward mid-life trend
  - primary/secondary completion windows + full cleanup <=3.2s
  - expired entities removed from active arrays
- **Implementation**:
  - Add secondary scheduling queue and emission behavior.
  - Integrate particle lifetime/alpha updates and cleanup bookkeeping.
- **Success criteria**:
  - Full lifecycle (`launch -> primary -> secondary -> cleanup`) passes deterministic unit assertions.
- **Demo**:
  - Unit step replay confirms no ghost entities after cleanup deadline.

### Step 4: Add cap guardrails + degradation order telemetry
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`
- **Tests first**:
  - hard cap non-regression under stress
  - degradation order preferring secondary density drops before primary
- **Implementation**:
  - Enforce `maxActiveParticles` hard cap.
  - Add staged degradation policy and counters (`droppedSecondary`, `droppedPrimary`, etc.).
- **Success criteria**:
  - Stress tests pass with stable bounded counts and expected drop ordering.
- **Demo**:
  - 30s deterministic stress simulation remains within cap.

### Step 5: Wire debug controls and clamping into global debug config
- **Files**: `src/game/types.ts`, `src/game/debugConfig.ts`, `tests/unit/debugConfig.test.ts`, optionally `src/game/Game.ts` debug action wiring
- **Tests first**:
  - new fireworks keys clamp/sanitize correctly
  - force-launch action remains available and routes to fireworks channel
- **Implementation**:
  - Add fireworks tuning keys/ranges/defaults.
  - Ensure runtime apply path accepts new values and force launch action is wired.
- **Success criteria**:
  - Debug config unit tests pass; runtime debug surface contains fireworks controls.
- **Demo**:
  - Test API can apply fireworks tuning values and expose clamped state.

### Step 6: Integrate fireworks simulation into Game loop + public state snapshot
- **Files**: `src/game/Game.ts`, `src/game/types.ts`, `tests/e2e/fireworks.spec.ts` (new)
- **Tests first**:
  - paused semantics: config changes apply on next step, not immediately
  - `getState().distractions.fireworks` exposes scoped lifecycle telemetry
- **Implementation**:
  - Initialize and step fireworks system in `runSimulationStep`.
  - Add minimal, deterministic fireworks snapshot fields to test state.
- **Success criteria**:
  - E2E assertions pass for deterministic lifecycle telemetry progression.
- **Demo**:
  - Playwright can step paused simulation and observe launch/apex/burst counters update predictably.

### Step 7: Replace legacy fireworks DOM pulse with staged render adapter + E2E regression pass
- **Files**: `src/game/Game.ts`, `src/styles.css`, `tests/e2e/fireworks.spec.ts`, `tests/e2e/gameplay.spec.ts` (if regression assertion needed), docs (`README.md`, `docs/features.md`)
- **Tests first**:
  - render metadata/lifecycle visibility assertions for fireworks nodes
  - cleanup removes expired render nodes
  - adversarial stress/cap scenario in Playwright
- **Implementation**:
  - Remove fireworks-only pulse path and map simulation particles to render nodes.
  - Keep non-fireworks distraction actors unchanged.
  - Update docs for new controls/test observability.
- **Success criteria**:
  - Fireworks E2E suite passes, existing gameplay/distraction regressions stay green.
- **Demo**:
  - In-browser deterministic run visibly shows launch arcs, primary/secondary bursts, and timely fade cleanup.
