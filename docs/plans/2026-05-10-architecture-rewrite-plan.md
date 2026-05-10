# Tower Stacker Architecture Rewrite Plan

> **For Hermes:** Use `subagent-driven-development` to execute this plan task-by-task once the team approves the architecture direction.

**Goal:** Rewrite the runtime architecture so gameplay, rendering, UI, debug tooling, and content systems are modular, testable, and easy to change without fear—especially for 3D animation and visual bug-fixing.

**Architecture:** Move from a single large `Game.ts` orchestrator to a layered architecture with a deterministic simulation core, thin rendering adapters, isolated feature modules, and explicit app/composition boundaries. Use a strangler-fig migration: keep shipping from the current repo while replacing one responsibility at a time behind stable interfaces.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest, Playwright, current browser build pipeline.

---

## Why rewrite

### Current pain points observed in the repo

- `src/game/Game.ts` is **5,149 lines** and currently mixes:
  - scene setup
  - game loop orchestration
  - input handling
  - DOM/debug panel creation
  - feature toggles
  - camera behavior
  - distraction visuals
  - cloud/fireworks/collapse/character integration
  - test API exposure
- `src/game/Game.ts` contains the overwhelming majority of direct `window`, DOM, and Three.js object wiring, which makes bug isolation expensive.
- `src/game/types.ts` and `src/game/debugConfig.ts` have become broad “everything bags,” signaling unclear ownership boundaries.
- The repo already has a promising pure-logic seam in `src/game/logic/*`, but that seam is not yet the architectural center of gravity.
- Rendering-heavy systems and content-heavy systems are coupled too closely to gameplay orchestration, which is exactly the kind of design that makes 3D/animation bugs painful to fix.

### Rewrite objectives

1. Make gameplay rules deterministic and independently testable.
2. Make rendering disposable: visuals should be replaceable without touching rules.
3. Make animation/content systems pluggable so bugs stay local.
4. Keep debug/test controls first-class instead of bolted on.
5. Preserve existing shipped behavior where possible while making future work cheaper.

---

## Target architecture

## Layer 1: Core domain/simulation

**Purpose:** Pure game rules with no DOM, no Three.js, no browser globals.

**Create/target paths:**
- `src/core/contracts.ts`
- `src/core/config/gameConfig.ts`
- `src/core/state/gameState.ts`
- `src/core/state/publicSnapshot.ts`
- `src/core/simulation/gameSimulator.ts`
- `src/core/simulation/stepSimulation.ts`
- `src/core/systems/placement/*`
- `src/core/systems/combo/*`
- `src/core/systems/recovery/*`
- `src/core/systems/integrity/*`
- `src/core/systems/distractions/*`
- `src/core/systems/collapse/*`
- `src/core/systems/performance/*`
- `src/core/random/*`

**Rules:**
- Inputs in, state out.
- Fixed-timestep simulation.
- No mesh references in state.
- No browser-only types.
- State snapshots must be serializable.

## Layer 2: Presentation/runtime adapters

**Purpose:** Translate pure simulation state into actual runtime effects.

**Create/target paths:**
- `src/runtime/gameRuntime.ts`
- `src/runtime/loop/frameLoop.ts`
- `src/runtime/input/inputController.ts`
- `src/runtime/input/inputBindingsDom.ts`
- `src/runtime/test/testApiBridge.ts`
- `src/runtime/debug/debugController.ts`
- `src/runtime/debug/debugConfigStore.ts`
- `src/runtime/audio/feedbackRuntime.ts`
- `src/runtime/persistence/sessionFlags.ts`

**Rules:**
- Knows about the browser and current session.
- Converts UI/input/debug/test interactions into simulation commands.
- Does not contain gameplay math.

## Layer 3: Rendering adapters

**Purpose:** Own all Three.js scene state and visual-only behavior.

**Create/target paths:**
- `src/render/scene/sceneBootstrap.ts`
- `src/render/scene/renderContext.ts`
- `src/render/scene/cameraController.ts`
- `src/render/scene/lightingController.ts`
- `src/render/tower/towerRenderer.ts`
- `src/render/tower/slabMeshFactory.ts`
- `src/render/tower/towerArchiveRenderer.ts`
- `src/render/effects/debrisRenderer.ts`
- `src/render/effects/collapseRenderer.ts`
- `src/render/effects/fireworksRenderer.ts`
- `src/render/distractions/cloudRenderer.ts`
- `src/render/distractions/gorillaRenderer.ts`
- `src/render/distractions/ufoRenderer.ts`
- `src/render/distractions/tentacleRenderer.ts`
- `src/render/characters/characterRenderer.ts`
- `src/render/facade/facadeRenderer.ts`

**Rules:**
- Read simulation snapshots + visual config.
- Maintain mesh pools, object lifecycle, and scene graph.
- Never decide game outcomes.

## Layer 4: DOM UI

**Purpose:** HUD, overlays, menus, debug panel, and status surfaces.

**Create/target paths:**
- `src/ui/hud/hudController.ts`
- `src/ui/menus/titleScreen.ts`
- `src/ui/menus/gameOverOverlay.ts`
- `src/ui/debug/debugPanel.ts`
- `src/ui/debug/debugControlsSchema.ts`
- `src/ui/status/statusPresenter.ts`

**Rules:**
- DOM-only.
- No gameplay calculations.
- Emits intents/events to runtime controller.

---

## Key architectural decisions

### 1. Keep simulation state mesh-free
Current logical state should stop carrying implicit rendering ownership. Rendering identity should be managed separately through stable ids.

**Decision:**
- Add ids like `slabId`, `entityId`, `effectId` to core state.
- Renderer stores `Map<id, Object3D>` and reconciles against snapshots.

### 2. Replace “giant Game class” with composition root
`Game.ts` should become a thin assembly entrypoint rather than the application itself.

**Decision:**
- New `gameRuntime.ts` becomes composition root.
- Existing `Game.ts` is reduced to a compatibility shell and later removed.

### 3. Split feature logic from feature presentation
For every major subsystem, create a pure module + renderer/runtime adapter pair.

**Examples:**
- `core/systems/distractions/*` + `render/distractions/*`
- `core/systems/collapse/*` + `render/effects/collapseRenderer.ts`
- `core/systems/recovery/*` + `ui/hud/*`

### 4. Normalize config ownership
Current debug config is carrying both design-time defaults and runtime overrides.

**Decision:**
- `gameConfig.ts`: stable authored defaults and validation.
- `debugConfigStore.ts`: mutable session overrides.
- `resolvedConfig = merge(defaults, overrides)` at runtime boundary.

### 5. Make test mode a first-class runtime adapter
Test APIs should wrap the simulator, not poke arbitrary runtime internals.

**Decision:**
- `testApiBridge.ts` exposes simulation-safe commands only.
- Playwright talks to public commands/snapshots, not random DOM or mesh state.

---

## Recommended module breakdown by responsibility

### Core modules to preserve/migrate from current `src/game/logic/*`

Likely keep and move with minimal behavior change:
- `stack.ts`
- `streak.ts`
- `recovery.ts`
- `integrity.ts`
- `collapse.ts`
- `performance.ts`
- `random.ts`
- `runtime.ts` (split into simulation-safe vs browser-safe pieces)

Likely split further during migration:
- `fireworks.ts`
- `distractions.ts`
- `decor.ts`
- `windows.ts`
- `characterAnimationManager.ts`
- `facade.ts`

### Rendering feature packages

Each renderer should own:
- mesh creation
- object pooling
- update/reconciliation
- cleanup/disposal
- debug visualization hooks

Each renderer should not own:
- score logic
- placement outcomes
- state transitions
- cross-feature orchestration rules

---

## Rewrite strategy

## Phase 0: Freeze architecture targets before touching behavior

**Objective:** Define boundaries before implementation drifts.

**Files:**
- Create: `docs/plans/2026-05-10-architecture-rewrite-plan.md`
- Create later: `docs/architecture/module-map.md`
- Modify later: `README.md`

**Tasks:**
1. Approve the target layered architecture.
2. Approve naming conventions (`core`, `runtime`, `render`, `ui`).
3. Approve “no gameplay math in rendering/UI” as a hard rule.
4. Approve strangler migration over big-bang branch replacement.

**Verification:**
- Team can explain where any new bugfix should go before coding.

## Phase 1: Establish contracts and IDs

**Objective:** Create the types/interfaces that let old and new code coexist.

**Files:**
- Create: `src/core/contracts.ts`
- Create: `src/core/state/gameState.ts`
- Create: `src/core/state/publicSnapshot.ts`
- Modify: `src/game/types.ts`

**Tasks:**
1. Define core ids and event/intention types.
2. Define serializable `GameStateModel`.
3. Define renderer-facing snapshot shape.
4. Add adapter functions from current state to new snapshot contracts.

**Verification:**
- Unit tests confirm snapshots are serializable and deterministic.

## Phase 2: Extract simulation engine

**Objective:** Centralize fixed-step game progression in pure code.

**Files:**
- Create: `src/core/simulation/gameSimulator.ts`
- Create: `src/core/simulation/stepSimulation.ts`
- Create: `tests/unit/core/gameSimulator.test.ts`
- Modify: current logic modules as needed

**Tasks:**
1. Move start/restart/place/step behavior into simulator commands.
2. Move placement and level progression orchestration into simulator.
3. Keep combo/recovery/integrity/collapse transitions inside simulator.
4. Return events for presentation layers to consume.

**Verification:**
- Playwright-critical flows can be driven without scene/DOM assumptions.
- Unit coverage increases around the new simulator.

## Phase 3: Introduce runtime shell

**Objective:** Replace monolithic `Game` orchestration with a thin app runtime.

**Files:**
- Create: `src/runtime/gameRuntime.ts`
- Create: `src/runtime/loop/frameLoop.ts`
- Create: `src/runtime/input/inputController.ts`
- Create: `src/runtime/test/testApiBridge.ts`
- Modify: `src/main.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Move the animation frame loop out of `Game.ts`.
2. Route inputs through command dispatch.
3. Move test API exposure into its own adapter.
4. Make old `Game.ts` delegate to the runtime shell.

**Verification:**
- Runtime can boot, pause, step, restart, and expose snapshots.

## Phase 4: Extract UI from runtime

**Objective:** Stop building DOM and debug controls inside game orchestration.

**Files:**
- Create: `src/ui/hud/hudController.ts`
- Create: `src/ui/menus/titleScreen.ts`
- Create: `src/ui/menus/gameOverOverlay.ts`
- Create: `src/ui/debug/debugPanel.ts`
- Create: `src/ui/debug/debugControlsSchema.ts`
- Modify: `src/styles.css`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Move overlay creation into UI modules.
2. Move debug-panel field definitions into schema-driven config.
3. Convert UI interactions into explicit runtime intents.

**Verification:**
- UI can be changed without touching placement/camera/collapse rules.

## Phase 5: Extract rendering packages

**Objective:** Break scene responsibilities into isolated renderers.

**Files:**
- Create: `src/render/scene/*`
- Create: `src/render/tower/*`
- Create: `src/render/effects/*`
- Create: `src/render/distractions/*`
- Create: `src/render/characters/*`
- Create: `src/render/facade/*`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Start with slab/tower rendering.
2. Then camera/lighting.
3. Then debris/collapse.
4. Then distractions.
5. Then characters/facade/decor.

**Verification:**
- A bug in fireworks/clouds/characters can be fixed by touching only that renderer and its tests.

## Phase 6: Rationalize debug config

**Objective:** Turn config sprawl into structured groups with ownership.

**Files:**
- Create: `src/core/config/gameConfig.ts`
- Create: `src/runtime/debug/debugConfigStore.ts`
- Modify: `src/game/debugConfig.ts`
- Modify: `src/game/types.ts`

**Tasks:**
1. Split authored defaults from runtime overrides.
2. Group config by feature domain.
3. Add validation/clamping per feature package.

**Verification:**
- Each config value has one owner and one place to validate it.

## Phase 7: Retire compatibility shell

**Objective:** Delete the old monolith once new boundaries are proven.

**Files:**
- Remove or drastically shrink: `src/game/Game.ts`
- Update: `README.md`
- Update: `docs/features.md`
- Update: tests as needed

**Tasks:**
1. Remove dead adapters.
2. Repoint tests to new public runtime surface.
3. Update docs to describe new architecture.

**Verification:**
- `Game.ts` is no longer the main implementation body.

---

## Testing strategy during rewrite

### Unit tests
Focus on:
- simulator transitions
- event emission
- config validation
- renderer reconciliation helpers that can be tested without WebGL
- feature-specific pure logic

### Playwright
Preserve and expand:
- deterministic start/step/place/restart flows
- debug control behavior
- key visual state assertions through stable test metadata
- regression cases for previously brittle features

### Acceptance gates for each migration slice
- `npm run test:unit`
- `npm run coverage`
- `npm run test:e2e`
- `npm run build`

---

## What to borrow from TanStack CLI patterns

From the cloned reference repo `TanStack/cli`, the most relevant architectural lessons are:

1. **Capability-oriented structure**
   - The repo separates CLI entry, creation engine, frameworks, templates, and skills.
   - We should mirror this by separating simulation, runtime, render, and UI instead of centralizing everything in one app class.

2. **Explicit task/skill boundaries**
   - TanStack ships narrowly scoped skills for scaffold, metadata lookup, ecosystem selection, and add-on maintenance.
   - We should design Tower Stacker systems so each subsystem has a narrow responsibility and a narrow failure surface.

3. **Composition over god objects**
   - TanStack uses packages/features rather than one giant “do everything” file.
   - Tower Stacker should treat camera, distractions, facade rendering, characters, and collapse as composable modules.

---

## Non-goals for the first rewrite pass

- Changing core gameplay rules just for novelty
- Replacing Three.js
- Rebuilding all visuals before boundaries are in place
- Converting to ECS unless the new layered architecture still feels insufficient after extraction
- Over-abstracting content modules before the simulator/runtime/render boundaries are stable

---

## Immediate next actions

1. Approve this rewrite direction.
2. Start with **Phase 1 + Phase 2 only**.
3. Keep all new logic behind stable contracts and adapters.
4. Delay any major art/animation changes until the rendering packages exist.

---

## Suggested first execution slice

If we start implementation next, the safest first slice is:

1. Add core contracts and serializable snapshot types.
2. Extract a pure `gameSimulator` that handles start/place/restart/step.
3. Make current `Game.ts` delegate to that simulator while keeping existing visuals.

That gives us the highest leverage with the lowest visual regression risk.