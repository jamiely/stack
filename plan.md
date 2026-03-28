# Tower Stacker V1 Implementation Plan

## Summary
Build a greenfield desktop-first browser prototype of `Tower Stacker` using plain Three.js, TypeScript, and Vite with hot reload. V1 focuses on the core stacking loop only, but it must still be fully playable: title/start screen, live height/score UI, game-over with restart, upward camera follow, alternating X/Z placement, and simple falling overhang animation. Mobile is limited to touch input support in the initial plan; Electron is not part of V1, but the architecture should stay packaging-friendly. Testing and tuning are part of the core scope: add Playwright coverage for end-to-end functionality, a dedicated test mode that supports deterministic stepping, runtime debug controls for gameplay parameters, and unit tests targeting at least 90% coverage for the testable logic layer.

## Key Changes
- Initialize a Vite + TypeScript app with a minimal game shell: Three.js scene, renderer, camera, resize handling, asset-free placeholder visuals, and a small HTML/CSS HUD layer for menus and score.
- Implement the game as a deterministic state-driven loop rather than a React-style component tree. Core modules should cover:
  - `Game`: boot, update loop, scene lifecycle, restart flow
  - `StackSystem`: slab spawning, alternating move axis, edge bounce, stop input, trim calculation, failure detection
  - `CameraSystem`: smooth upward tracking of the active tower top
  - `UISystem`: start screen, live score/height, game-over overlay
  - `EffectsSystem`: simple impact feedback and fake/manual falling debris animation
- Represent slabs as simple box meshes with immutable logical data per level: center position, width/depth, height, move axis, and status (`active`, `landed`, `debris`). Use geometry scaling/repositioning for trimming instead of procedural mesh slicing in V1.
- Implement the trim algorithm from `docs/design.md` with one practical V1 adjustment: “perfect” behavior exists only as a tolerance-based snap/preserve-width rule if it is cheap to add cleanly; streak bonuses and slab growth are deferred beyond V1.
- Alternate placement axis from the start:
  - odd levels move on X and trim width on X
  - even levels move on Z and trim depth on Z
  This preserves the intended 3D feel without requiring advanced art or physics.
- Use fake/manual debris motion for the cut-off piece: detached mesh with initial lateral velocity, downward acceleration, and angular spin; despawn once below a floor threshold or after a fixed lifetime. No physics engine in V1.
- Keep input abstraction thin but explicit so desktop keyboard/mouse and mobile tap both call the same `stopActiveSlab()` action. Desktop is primary, but touch input should work from the first implementation.
- Keep future Electron support in mind by avoiding browser-only coupling in core game logic. Core systems should not depend on DOM APIs except through a thin app/input/UI boundary.
- Add a test harness mode for deterministic verification. Test mode should expose a stable control surface for Playwright and manual QA: seeded startup, paused boot option, single-step/tick advancement, scripted slab placement, and readable game-state hooks through a guarded debug API.
- Add developer-facing debug controls for tuning gameplay in runtime without code edits. At minimum expose slab width/depth/height, move speed, speed ramp, perfect tolerance, starting stack size or prebuilt levels, debris lifetime, and camera follow values.
- Keep game rules and calculations in pure modules where possible so unit tests can achieve at least 90% coverage on the logic layer without depending on WebGL or DOM rendering.

## Public Interfaces / Types
- `GameState`: `idle | playing | game_over`
- `Axis`: `x | z`
- `SlabData`: logical slab model with position, dimensions, level index, active axis, and mesh reference
- `GameConfig`: central tuning for base slab size, slab height, move speed, speed ramp, perfect tolerance, camera lerp, debris lifetime
- `DebugConfig`: runtime-overridable tuning state for gameplay and test harness controls
- `TestModeOptions`: seed, start paused flag, fixed time step, initial stack setup, and debug API enablement
- Core actions:
  - `startGame()`
  - `stopActiveSlab()`
  - `restartGame()`
  - `stepSimulation()`
  - `applyDebugConfig()`
- Core pure logic helpers:
  - overlap/trim calculation returning `landed`, `perfect`, or `miss`
  - next slab spawn data based on previous landed slab and level index
  - deterministic speed/difficulty progression
  - stack bootstrap generation for debug/test setup

## Milestones
1. Project bootstrap
   Set up Vite + TypeScript + Three.js, base scene, camera, renderer, resize behavior, and dev workflow.
2. Playable core loop
   Add slab motion, stop input, trim math, axis alternation, stack progression, miss detection, and restart.
3. Playability shell
   Add start screen, score/height display, game-over overlay, and smooth camera tracking.
4. Testability and tuning
   Add debug controls, deterministic test mode, and a stable automation surface for Playwright and manual stepping.
5. Basic juice
   Add impact feedback, simple debris fall/spin, and lightweight visual tuning for readability.
6. Automated verification and coverage
   Add unit tests for the logic layer, Playwright end-to-end tests for core flows, and coverage reporting with a 90% unit-test threshold.
7. Mobile input pass
   Validate touch input and responsive layout for the HUD without treating low-end mobile performance as a V1 optimization target.

## Test Plan
- Unit-test pure trim logic:
  - centered stop preserves full dimension
  - partial overlap shrinks the correct axis and re-centers the landed slab correctly
  - zero or negative overlap triggers miss
  - axis alternation switches X/Z behavior correctly
  - perfect tolerance snaps to target when within threshold
  - debug config overrides change spawn and movement behavior predictably
  - deterministic stepping advances identical game states for identical seeds and inputs
  - bootstrap stack generation produces valid initial tower state for debug/test scenarios
- Enforce unit-test coverage:
  - configure coverage reporting for the logic layer
  - fail CI or local verification when unit-test coverage drops below 90%
- Playwright end-to-end verification:
  - start screen launches the game successfully
  - keyboard and pointer input both stop the slab
  - test mode can start paused and advance one step at a time
  - deterministic test harness can force or reproduce a successful placement sequence
  - score/height updates after placements
  - a miss reaches game-over and restart returns to a clean state
  - debug controls can change selected gameplay values and visibly affect the simulation
- Manual gameplay verification:
  - start screen transitions into play
  - keyboard/mouse and tap both stop the slab
  - camera follows upward as floors are added
  - score/height increments correctly
  - debris falls and despawns cleanly
  - restart returns the game to a clean initial state
  - repeated restarts do not leak scene objects or duplicate input handling
  - debug panel can adjust block dimensions, stack setup, and speed without requiring reload
- Basic compatibility checks:
  - desktop browser remains the primary supported path
  - touch works on mobile-sized viewport
  - project runs via Vite dev server with hot reload intact

## Assumptions
- “1” for question 4 is treated as acceptance of the recommended V1 approach: fake/manual debris animation, not rigid-body physics.
- V1 excludes saboteurs, audio system, procedural mesh slicing, tower collapse physics, streak bonus growth, and Electron packaging.
- Placeholder geometry/materials are acceptable for V1; asset production is not part of this milestone.
- Mobile support in V1 means touch-capable interaction and usable layout, not full mobile-performance optimization from day one.
- The 90% coverage target applies to unit-testable application logic rather than WebGL rendering code or thin framework/bootstrap glue.
