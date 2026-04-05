# Plan — animation-system-refactor-step-1

## Scope and guardrails
- Implement only Step 1 boundary work from `.agents/planning/2026-04-05-animation-system-refactor/implementation/plan.md`.
- Preserve existing gameplay behavior; no Step 2–7 extraction in this wave.
- Keep ledge-anchor/suppression orchestration in `Game.ts`; route lifecycle entrypoints through a new facade.
- Place new non-rendering manager logic under `src/game/logic/` so coverage enforcement includes it.

## Test strategy (TDD-first)

### Unit tests (write first, fail first)
1. **`tests/unit/characterAnimationManager.test.ts`**
   - Target: new facade module (`CharacterAnimationManager`) and bridge interface.
   - Cases:
     - exposes required methods: `preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`.
     - each method forwards exactly one call to the matching bridge method.
     - `update(deltaSeconds)` preserves no-op semantics for non-positive deltas (no bridge update call).
     - repeated `release` and `disposeAll` calls do not throw (bridge-compatible idempotent behavior for Step 1).

2. **`tests/unit/characterAnimationManager.bridge.test.ts`**
   - Target: callback bridge factory used by `Game` (private-method-safe indirection).
   - Cases:
     - callback bridge invokes provided `Game` callbacks for all five lifecycle entrypoints.
     - callback bridge passes `deltaSeconds` through unchanged on `update`.
     - bridge remains deterministic/pure from test doubles (no hidden global state).

3. **`tests/unit/characterAnimationForwardingPath.test.ts`**
   - Target: extracted Step-1 forwarding seam used by both RAF path and test stepping path (if extracted as helper).
   - Cases:
     - one simulation step triggers exactly one manager `update` call.
     - N manual test steps trigger N manager `update` calls (no duplicate forwarding in the loop).
     - shared path invariant: both runtime tick and `stepSimulation` use the same simulation-step function.

### Integration checks
1. **`Game.ts` call-routing integration (code-level)**
   - Verify direct lifecycle entrypoint callsites now route through facade:
     - preload/spawn refresh callsites
     - `runSimulationStep` update forwarding
     - release branches for anchor/suppression/fallback detach
     - reset teardown `disposeAll`
   - Confirm deferred internals (selection/loading/retarget/placement/debug naming) remain in `Game.ts`.

2. **Automated regression integration**
   - Run `npm run test:unit` to validate manager + existing logic modules.
   - Run `npm run test:e2e` smoke/gameplay to confirm unchanged user-visible flow.

### E2E manual scenario (for Validator)
Harness: **Playwright/browser automation (`/?test&debug&paused=1&seed=42`)**

Scenario:
1. Load app in test mode and confirm game starts without console/runtime errors.
2. Start run via test API, set paused, call `stepSimulation(1)` twice, and verify active slab position changes incrementally each step (no frozen or double-step jump).
3. Trigger a miss (`setActiveOffset(10)` + `stopActiveSlab()`), assert game enters `game_over`.
4. Restart via input (space or click), assert `gameState` returns to `playing` and score resets.
5. **Adversarial path:** repeat miss/restart cycle multiple times while paused stepping between cycles; expect no crash, no stuck state, and stable restart behavior.

## Numbered implementation steps (TDD order)

### Step 1: Add failing facade/bridge contract tests
- **Files:**
  - `tests/unit/characterAnimationManager.test.ts` (new)
  - `tests/unit/characterAnimationManager.bridge.test.ts` (new)
  - `tests/unit/characterAnimationForwardingPath.test.ts` (new, if helper seam is extracted)
- **Tests expected after step:** intentionally RED (module/type missing and/or forwarding not wired yet).
- **Connects to previous work:** uses approved Step 1 contract from requirements/design artifacts.
- **Success criteria:** tests clearly encode the five-method facade contract and exactly-once update forwarding invariant.
- **Demo:** failing tests provide precise implementation targets and prevent silent scope creep.

### Step 2: Implement `CharacterAnimationManager` + callback bridge in covered logic path
- **Files:**
  - `src/game/logic/characterAnimationManager.ts` (new)
  - optional: `src/game/logic/characterAnimationForwarding.ts` (new helper seam for shared-path assertions)
- **Tests expected after step:**
  - manager contract and bridge unit tests turn GREEN.
  - forwarding-path helper tests GREEN (if helper extracted).
- **Connects to previous work:** satisfies Step 1 RED tests without changing gameplay branches yet.
- **Success criteria:** facade methods delegate to bridge callbacks with no behavior policy beyond Step-1 no-op/safety guards.
- **Demo:** unit suite shows fully working facade module in isolation.

### Step 3: Route `Game.ts` lifecycle entrypoints through facade
- **Files:**
  - `src/game/Game.ts` (manager field wiring + callsite routing)
- **Routing targets:**
  - preload and spawn refresh entrypoints -> manager calls
  - per-frame animation update in `runSimulationStep` -> `characterAnimationManager.update(deltaSeconds)`
  - detach/release branches -> `characterAnimationManager.release()`
  - reset teardown -> `characterAnimationManager.disposeAll()`
- **Tests expected after step:**
  - all new unit tests remain GREEN.
  - existing unit suite remains GREEN.
- **Connects to previous work:** consumes Step 2 facade in real runtime path while preserving bridge-backed internals.
- **Success criteria:** no direct `Game` lifecycle entrypoint calls remain for Step-1 methods; deferred internals still in place.
- **Demo:** game loop and test-step loop still animate/advance correctly with facade-owned forwarding.

### Step 4: Regression verification and completion gate
- **Files:**
  - `tests/e2e/gameplay.spec.ts` (only if a targeted regression assertion is needed)
  - no-op or minimal docs touch only if observable behavior/doc surface changed
- **Tests expected after step:**
  - `npm run test:unit`
  - `npm run test:e2e`
  - `npm run build`
- **Connects to previous work:** validates that Step 1 refactor changed ownership boundary, not gameplay output.
- **Success criteria:** smoke/gameplay flows pass unchanged; deterministic stepping/restart path remains stable under adversarial loop.
- **Demo:** start/play/place/miss/restart flows work exactly as baseline with manager facade in place.

## Final completion criteria for this spec
- Step 1 facade exists and is used by `Game` for `preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`.
- Unit coverage includes contract + forwarding semantics + exactly-once update regression checks.
- Playwright smoke/gameplay regressions pass with no behavior drift.
- Deferred Step 2–7 refactors are untouched in this implementation wave.
