# Tower Stacker Features

This document tracks implemented gameplay features and notable behavior decisions for the current V1 prototype.

## Core Gameplay

- Alternating slab movement axes by level (`X` then `Z` then `X`...)
- Stop-and-trim placement logic with three outcomes:
  - `perfect` (within tolerance, preserves target footprint)
  - `landed` (partial overlap, trims active slab)
  - `miss` (no overlap, game over)
- Score increments on each successful placement
- Height display tracks current tower floors
- Combo HUD tracks perfect streak progress (`current/target`, default target `8`)
- Perfect hits increment combo while partial trims/misses reset it
- Recovery reward triggers at combo milestones (default every `8` perfect hits):
  - applies capped slab growth toward base dimensions
  - enables temporary movement slowdown for a configurable number of floors
- Audio + haptics feedback manager emits distinct cues for `perfect`, `landed`, and `miss` outcomes with browser-safe capability gating
- Restart and return-to-title flows are supported via a single contextual primary menu button (no separate rebuild action)
- V3 distraction framework runs as a deterministic side-channel (seeded + level-gated) without mutating trim/placement math
- V3.2 actor layer now renders gorilla climber + tremor pulses, UFO flyby + contrast-wash flashes, and front-layer cloud occlusion driven by deterministic distraction signals
- Structural integrity telemetry computes a deterministic tower center-of-mass approximation and classifies `stable`/`precarious`/`unstable` tiers against tunable thresholds

## Visual and Camera Behavior

- Camera follows tower height with configurable distance/lerp
- Successful placements trigger a brief impact flash pulse
- Active distraction channels now drive visible overlay actors (gorilla, UFO, cloud layer), contrast wash intensity, and camera tremor pulse effects
- Precarious integrity tier introduces deterministic camera wobble scaled by configurable instability strength
- Trimmed overhang pieces become animated debris and despawn by lifetime/threshold
- Slab color palette varies by slab level (hue progression)
- **Color stability rule:** a slab keeps its color when it transitions from active to landed (no post-placement recolor)

## Input

- Keyboard: `Space` / `Enter`
- Pointer: click/tap on play area
- Input is blocked when interacting with overlay/debug controls
- Touch input is supported through pointer events

## Debug Controls (`?debug`)

Debug mode also enables developer-facing HUD/overlay diagnostics that are hidden in normal gameplay:

- Top HUD `Status` card (`status-message`)
- Menu overlay descriptive body copy and renderer status line

Runtime tuning panel includes:

- Camera: height, distance, lerp
- Slab dimensions: base width, base depth, slab height
- Motion: range, base speed, speed ramp
- Placement: perfect tolerance, combo target length
- Recovery rewards: growth multiplier, slowdown factor, slowdown floors
- Feedback: audio enable toggle, haptics enable toggle
- Distractions: global enable, per-layer toggles (tentacle/gorilla/tremor/ufo/contrast/cloud), deterministic motion speed, and level-start thresholds for tentacle/gorilla/ufo/cloud gating
- Integrity: precarious threshold, unstable threshold, and camera wobble strength
- Setup: prebuilt starting levels
- Effects: debris lifetime, debris tumble strength
- Scene: grid visibility

## Deterministic Test Mode (`?test` or `?testMode`)

- Test mode can start paused by default
- `&paused=0` starts test mode unpaused
- `&seed=<int>` sets deterministic seeded spawn offsets/directions for active slabs
- Fixed-step size is configurable via query (`step`), clamped for safety
- Guarded test API is exposed at `window.__towerStackerTestApi`

### Exposed Test API

- `startGame()`
- `stopActiveSlab()`
- `restartGame()`
- `returnToTitle()`
- `applyDebugConfig(config)`
- `stepSimulation(steps?)`
- `setPaused(paused)`
- `setActiveOffset(offset)`
- `placeAtOffset(offset)`
- `getState()` (includes level, last placement outcome, top slab dimensions, combo state `{ current, best, target, rewardReady }`, recovery state `{ rewardsEarned, slowdownPlacementsRemaining, speedMultiplier }`, feedback state `{ audioEnabled, hapticsEnabled, audioSupported, hapticsSupported, audioUnlocked, eventsTriggered, audioEventsPlayed, hapticEventsPlayed, lastEvent }`, distraction state `{ enabled, level, active, signals, visuals }`, integrity state `{ tier, normalizedOffset, wobbleStrength, centerOfMass, topCenter, offset }`, and test-mode metadata including paused state/seed)

## Automated Verification

- Unit tests cover pure logic modules (trim, spawn, oscillation, config clamping)
- Playwright end-to-end tests cover:
  - Title boot and start flow
  - Debug-panel and status-surface query gating
  - Test-mode API exposure and deterministic single-step advancement
  - Test-mode paused boot defaults and `paused=0` auto-run override
  - Keyboard and pointer stop input paths
  - Miss transition to game over and restart reset behavior
  - Runtime debug-speed tuning affecting active slab movement
  - Scripted deterministic placement sequences via test API
  - Combo milestone sequence triggering recovery growth + slowdown with HUD + test-state verification
  - Debug streak/recovery tuning changing runtime reward behavior
  - Audio/haptics toggle gating for runtime feedback emission
  - Distraction framework level-gating + runtime global toggle behavior
  - Gorilla/UFO/cloud actor rendering activation and continued trim correctness while distractions are active
  - Deterministic integrity telemetry transitions (`stable` → `precarious` → `unstable`) through scripted placements
  - Mobile-sized touch/tap stop input path
- Unit coverage threshold is enforced at 90% for the logic layer
