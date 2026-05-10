# Tower Stacker Animation + 3D Rendering Refactor Plan

> **For Hermes:** Use `subagent-driven-development` to execute this plan task-by-task. Keep changes incremental and preserve playable behavior after every slice.

**Goal:** Make 3D character placement, model scale normalization, and animation/render bugs easy to isolate, debug, and modify without rewriting the whole game architecture.

**Architecture:** Keep the game simple. Do **not** introduce workflow engines or broad app-platform layering. Instead, extract the current character/model rendering path out of `Game.ts` into a small set of focused modules: pure placement math, model normalization config, animation clip resolution, scene-node wrappers, and spatial debug tools. Use a strangler migration: move one seam at a time while keeping the rest of the game intact.

**Tech Stack:** TypeScript, Vite, Three.js, GLTFLoader/DRACOLoader, Vitest, Playwright.

---

## Current pain-point inventory

### Evidence from the current repo

- `src/game/Game.ts` is **5,149 lines** and currently mixes:
  - scene setup and Three.js object ownership
  - DOM/debug panel creation
  - gameplay loop orchestration
  - ledge anchor selection
  - model loading (`GLTFLoader`, `DRACOLoader`)
  - model normalization and bounds measurement (`Box3`)
  - animation clip loading, compatibility checks, retargeting, and playback
  - character placement and scale calculation
  - debug-driven rotation/translation tuning
- Character-specific placement and scale behavior is currently embedded directly in `Game.ts`, especially around:
  - `loadRemyCharacter()`
  - `buildRemyRigFromLoadedCharacter()`
  - `createRemyCharacterRig()`
  - `loadRemyAnimationClip()`
  - `placeRemyOnTopLedge()`
- The current placement path mixes several responsibilities in one method:
  - ledge anchor lookup
  - side-pose selection
  - target-height calculation
  - model depth/ledge overlap adjustment
  - debug offset application
  - final `position`, `rotation`, and `scale` writes
  - parent attachment to the slab mesh
- Current tests are strong for pure gameplay logic, but weak on final 3D transform correctness:
  - there are unit tests for `src/game/logic/remy.ts` and the animation-manager facade/routing
  - there are **no dedicated unit tests** for final model transform composition, model normalization, wrapper-node structure, or per-model scale contracts
- Current debug controls are useful for manual tuning, but the structure still makes many bugs ambiguous:
  - if a model floats, clips, scales oddly, or rotates wrong, it is not obvious whether the source is the asset, normalization, placement math, side pose, animation retargeting, or scene graph parenting

### Main architectural problem

The game does not need a giant platform rewrite.

It **does** need a clean seam between:
1. **gameplay truth**
2. **spatial placement math**
3. **model normalization**
4. **animation playback**
5. **scene graph application**
6. **debug inspection**

Right now those concerns are too interleaved inside `Game.ts`.

---

## Target module map

Keep the game architecture compact and game-centric.

### 1. Gameplay + spawn decisions remain where they are
**Keep using:**
- `src/game/logic/*`

This layer should continue to own:
- ledge spawn heuristics
- anchor visibility decisions
- distraction-trigger decisions
- gameplay state transitions

### 2. Add a focused character/render package
**Create:**
- `src/game/characters/contracts.ts`
- `src/game/characters/modelConfigs.ts`
- `src/game/characters/modelNormalization.ts`
- `src/game/characters/placementMath.ts`
- `src/game/characters/sceneNodes.ts`
- `src/game/characters/animationClipResolver.ts`
- `src/game/characters/characterView.ts`
- `src/game/characters/characterPlacementController.ts`
- `src/game/characters/characterAssetLoader.ts`

**Purpose by file:**

- `contracts.ts`
  - shared types for placement inputs/outputs
  - wrapper-node handles
  - model config shape
- `modelConfigs.ts`
  - per-model truth: scale, pivot/correction offsets, rotation defaults, anchor assumptions
- `modelNormalization.ts`
  - compute bounds, feet offsets, target scale, depth metrics
- `placementMath.ts`
  - pure final transform math from ledge + pose + debug overrides + normalized metrics
- `sceneNodes.ts`
  - create wrapper node hierarchy for easier transform debugging
- `animationClipResolver.ts`
  - clip compatibility, retargeting, scale-track stripping
- `characterView.ts`
  - own `Object3D` references and apply computed transforms to the correct nodes
- `characterPlacementController.ts`
  - high-level placement orchestration using pure math + view application
- `characterAssetLoader.ts`
  - loading models and animation sources; no placement decisions

### 3. Add spatial debug helpers
**Create:**
- `src/game/debug/spatialDebug.ts`
- `src/game/debug/transformSnapshot.ts`
- `src/game/debug/modelLabState.ts`

**Purpose:**
- make placement/scale/animation bugs inspectable in numbers and gizmos
- support both manual QA and automation hooks

### 4. Keep `Game.ts`, but shrink its role
**Modify:**
- `src/game/Game.ts`

**New role:**
- composition root for current game runtime
- delegates model loading, placement, and animation-specific responsibilities
- stops owning low-level transform math directly

---

## Ownership rules

These rules are the most important part of the refactor.

### Hard boundaries
- `src/game/logic/*` must not import Three.js scene objects for gameplay decisions.
- `placementMath.ts` must be pure and deterministic.
- `modelConfigs.ts` must be the only place that stores per-model correction defaults.
- `characterView.ts` applies transforms but does not decide gameplay outcomes.
- `animationClipResolver.ts` decides clip compatibility/retargeting but not ledge placement.
- `Game.ts` may coordinate, but it must not remain the long-term owner of final transform formulas.

### Transform ownership
There must be **one** final place that computes model transform.

That place should be `src/game/characters/placementMath.ts`.

It should output a structured result like:
- final world position
- final facing rotation
- final uniform scale
- per-node correction rotation
- per-node correction translation
- debug snapshot metadata

### Scene-node ownership
There must be explicit wrapper nodes, not a single anonymous model root.

Recommended wrapper stack:
- `CharacterRoot`
  - `PlacementNode`
    - `FacingNode`
      - `ScaleNode`
        - `CorrectionNode`
          - `PoseRotateX`
            - `PoseRotateY`
              - `PoseRotateZ`
                - `ModelNode`

This lets us isolate bugs by node level:
- wrong world placement → `PlacementNode`
- wrong facing → `FacingNode`
- wrong size → `ScaleNode`
- wrong pivot/up-axis fix → `CorrectionNode`
- wrong side/debug tilt → `PoseRotate*`
- skeleton/clip issues → `ModelNode`

---

## Recommended data contracts

### `modelConfigs.ts`
Use per-model config instead of hardcoded ad hoc constants inside `Game.ts`.

Suggested contract:

```ts
export interface CharacterModelConfig {
  id: string;
  targetHeightRatio: number;
  minHeight: number;
  maxHeight: number;
  defaultYawDegrees: number;
  defaultPitchDegrees: number;
  defaultRollDegrees: number;
  correctionRotationDegrees: {
    x: number;
    y: number;
    z: number;
  };
  correctionTranslation: {
    x: number;
    y: number;
    z: number;
  };
  anchorMode: "feet" | "center";
}
```

### `placementMath.ts`
Suggested contract:

```ts
export interface CharacterPlacementInput {
  slabPosition: { x: number; y: number; z: number };
  slabDimensions: { width: number; depth: number; height: number };
  ledgePosition: { x: number; y: number; z: number };
  ledgeRotationY: number;
  ledgeHeight: number;
  ledgeDepth: number;
  laneOffset: number;
  normalizedModel: {
    baseHeight: number;
    baseDepth: number;
  };
  sidePose: {
    yawDegrees: number;
    pitchDegrees: number;
    rollDegrees: number;
    translateX: number;
    translateY: number;
    translateZ: number;
  };
  debugOverride: {
    yawDegrees: number;
    pitchDegrees: number;
    rollDegrees: number;
    translateX: number;
    translateY: number;
    translateZ: number;
  };
}
```

Suggested output:

```ts
export interface CharacterPlacementResult {
  scale: number;
  worldPosition: { x: number; y: number; z: number };
  facingRotationY: number;
  poseRotationDegrees: {
    x: number;
    y: number;
    z: number;
  };
  debugSnapshot: {
    targetHeight: number;
    scaledDepth: number;
    overlapIntoWall: number;
    outwardOffset: number;
  };
}
```

---

## Testing strategy for interactive 3D bugs

### Principle
Do **not** rely mainly on screenshot tests or full interactive automation for animation/3D correctness.

Instead, test the layers that actually produce the visuals:
1. pure logic
2. transform math
3. model config validity
4. scene graph structure
5. tiny number of integration checks

### Test Layer 1 — existing logic tests
Keep and expand current tests under:
- `tests/unit/*.test.ts`

These already provide strong coverage for game rules and should stay the foundation.

### Test Layer 2 — transform math tests
**Create:**
- `tests/unit/characterPlacementMath.test.ts`
- `tests/unit/modelNormalization.test.ts`

Focus on:
- target height clamps
- uniform scale calculation
- world placement from ledge transforms
- depth overlap correction
- lane offset handling
- side-pose + debug-offset composition
- final facing rotation

These should be pure-number tests with `toBeCloseTo` assertions.

### Test Layer 3 — config validation tests
**Create:**
- `tests/unit/characterModelConfigs.test.ts`

Focus on:
- every registered model has config
- numeric fields are finite
- angle ranges are sane
- min/max height contracts are valid
- target height ratios are positive

This catches many per-model scale/placement regressions before runtime.

### Test Layer 4 — scene graph structure tests
**Create:**
- `tests/unit/characterSceneNodes.test.ts`
- `tests/unit/characterView.test.ts`

Focus on:
- wrapper nodes are created in the correct order
- scale is applied to the scale node only
- correction offsets are applied to the correction node only
- pose rotations land on the correct wrapper nodes

This avoids brittle pixel assertions while still testing 3D wiring.

### Test Layer 5 — animation compatibility tests
**Create:**
- `tests/unit/animationClipResolver.test.ts`

Focus on:
- track target-name parsing
- clip compatibility detection
- scale-track stripping
- fallback behavior when retargeting fails

### Test Layer 6 — small integration harness
**Create:**
- `tests/e2e/character-placement-lab.spec.ts`

Add a tiny deterministic debug harness that exposes:
- current model id
- active animation id
- final transform snapshot
- wrapper node values
- model bounds metrics

Playwright should verify those values via a guarded test API, not by “judging” screenshots.

### Optional visual smoke checks
Keep to a minimum:
- model loads successfully
- model appears in scene
- one deterministic screenshot for gross regressions only

Use screenshots only as a coarse smoke test, not the primary correctness signal.

---

## Manual QA harness recommendation

Add a dedicated in-game “character placement lab” mode.

### Suggested debug features
- switch active model (`remy`, `timmy`, `amy`, `aj`)
- switch active clip
- freeze animation
- step animation frame/time manually
- toggle origin marker
- toggle bounding box
- toggle feet contact marker
- show wrapper-node transforms
- tweak scale/offset live
- copy current tweak values back into config

This harness is worth building because interactive 3D bugs are often faster to diagnose with a purpose-built debug scene than with generic automation.

---

## Migration strategy

Use a **strangler** approach. Do not rewrite the whole game.

## Manual testing policy

Jamie wants a **manual test pass after each major phase**.

That means every completed phase should end with:
- automated verification (`npm run test:unit`, `npm run build`, and targeted Playwright if relevant)
- a deployable build on GitHub Pages
- a short manual QA pass focused on animation, placement, and scale
- only then move to the next major phase

### Manual QA checklist per phase
- character appears on the intended ledge or fallback position
- character scale looks correct relative to slab height
- feet/base contact looks stable and not floating/sinking
- facing direction matches the ledge side
- animation still plays after placement changes
- switching/reloading character variants does not produce doubled transforms or bad parent attachments
- debug sliders still affect the expected transform layer only

### Deployment policy for manual QA
Current repo behavior:
- GitHub Pages deploys on **push to `main`** via `.github/workflows/deploy-pages.yml`
- test workflows already run on pull requests and on pushes to `main`

Recommended workflow for now:
- do implementation on a branch
- run local tests
- when a major phase is ready for Jamie to manually test, merge/push that phase to `main`
- let GitHub Pages deploy the phase build
- Jamie manually tests the live site
- only then continue to the next phase

Why this is the best default right now:
- the game is small enough that one canonical manual-test environment is simpler
- Pages-on-main already exists, so this adds no deployment complexity
- the refactor is incremental, so each major phase should be safe to ship if tests pass

When to add staging later:
- if `main` becomes too risky to use as a manual test channel
- if a phase needs longer exploratory QA before it should replace the public Pages build
- if parallel feature work starts causing deploy contention

If that happens, add a preview deployment path later (for example a `staging` branch or PR preview workflow). But for this refactor, **main as the manual-test checkpoint is the simplest good choice**.

### Phase 1 — extract pure transform math
**Objective:** move final placement math out of `Game.ts` without changing behavior.

**Files:**
- Create: `src/game/characters/contracts.ts`
- Create: `src/game/characters/placementMath.ts`
- Create: `tests/unit/characterPlacementMath.test.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Copy the numeric placement logic from `placeRemyOnTopLedge()` into a pure helper.
2. Define explicit input/output contracts.
3. Add fixture-based tests for current expected transforms.
4. Make `Game.ts` call the helper and only apply the result.

**Verification:**
- unit tests pass
- rendered behavior stays unchanged
- transform formulas now live outside `Game.ts`

### Phase 2 — extract model normalization
**Objective:** isolate bounds measurement and per-model correction defaults.

**Files:**
- Create: `src/game/characters/modelConfigs.ts`
- Create: `src/game/characters/modelNormalization.ts`
- Create: `tests/unit/characterModelConfigs.test.ts`
- Create: `tests/unit/modelNormalization.test.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Move default per-model rotation/translation config out of `Game.ts` constants.
2. Extract bounds-center/feet-offset calculation into `modelNormalization.ts`.
3. Return structured normalized metrics from loader code.
4. Replace inline per-model defaults with config lookup.

**Verification:**
- all models still load
- no placement regression in existing game view
- config validation tests prove model config sanity

### Phase 3 — extract scene wrapper nodes + view
**Objective:** make transform sources inspectable by node level.

**Files:**
- Create: `src/game/characters/sceneNodes.ts`
- Create: `src/game/characters/characterView.ts`
- Create: `tests/unit/characterSceneNodes.test.ts`
- Create: `tests/unit/characterView.test.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Build the wrapper node hierarchy in one place.
2. Move transform writes to `CharacterView.applyPlacement(...)`.
3. Keep animation target references available through the view.
4. Ensure parent attachment/removal is centralized.

**Verification:**
- scene-node tests pass
- placement bugs can be localized to a single node layer

### Phase 4 — extract animation clip resolution
**Objective:** separate clip loading/retargeting from placement and asset loading.

**Files:**
- Create: `src/game/characters/animationClipResolver.ts`
- Create: `tests/unit/animationClipResolver.test.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Move clip compatibility checks out of `Game.ts`.
2. Move scale-track stripping out of `Game.ts`.
3. Move retarget fallback selection into the resolver module.
4. Keep playback setup in a thin runtime/view layer.

**Verification:**
- animation unit tests pass
- clip fallback still works at runtime

### Phase 5 — add spatial debug surface
**Objective:** convert guesswork into inspectable state.

**Files:**
- Create: `src/game/debug/transformSnapshot.ts`
- Create: `src/game/debug/spatialDebug.ts`
- Create: `src/game/debug/modelLabState.ts`
- Create: `tests/e2e/character-placement-lab.spec.ts`
- Modify: `src/game/Game.ts`

**Tasks:**
1. Expose structured transform snapshots through debug/test mode.
2. Add origin/bounds/contact-point helpers.
3. Add model-lab toggles behind debug/test mode.
4. Add Playwright checks against numeric snapshots.

**Verification:**
- test API can inspect transform state deterministically
- manual QA can tune placement/scale without code edits

### Phase 6 — retire old inline character path
**Objective:** remove the remaining character-specific placement/normalization math from `Game.ts`.

**Files:**
- Modify: `src/game/Game.ts`
- Update: `README.md`
- Update: `docs/features.md`

**Tasks:**
1. Delete dead helper code replaced by new modules.
2. Update docs for the new debugging/testing surface.
3. Keep only composition/orchestration in `Game.ts`.

**Verification:**
- `Game.ts` is smaller and less responsible
- animation/placement bug fixes can be made without editing a 5k-line file

---

## First safe slice

The safest high-leverage first slice is:

1. extract `placementMath.ts`
2. add `characterPlacementMath.test.ts`
3. make `Game.ts` call the pure placement function

Why this is first:
- directly targets the frequent bug area
- low risk to gameplay rules
- easiest to verify with deterministic tests
- creates the seam needed for the rest of the refactor

---

## Acceptance gates per slice

Run after each migration slice:
- `npm run test:unit`
- `npm run build`
- targeted Playwright spec if the slice changes test/debug surface

When the debug-lab harness lands, also run:
- `npm run test:e2e -- character-placement-lab.spec.ts`

---

## Immediate next actions

1. Treat this plan as the new architecture direction for character animation/placement/rendering work.
2. Keep the rest of the game architecture lightweight.
3. Start with **Phase 1 only**.
4. Do not move unrelated gameplay systems during this pass.

---

## Notes from current verification

- `npm install` completed successfully in the repo.
- `npm run test:unit` currently passes: **29 test files, 197 tests**.
- This means the repo is in a good state to start the refactor with test-first slices.
