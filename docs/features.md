# Tower Stacker Features

This document tracks implemented gameplay features and notable behavior decisions for the current browser implementation.

## Core Gameplay

- Alternating slab movement axes by level (`X` then `Z` then `X`...)
- Stop-and-trim placement logic with three outcomes:
  - `perfect` (within tolerance, preserves target footprint)
  - `landed` (partial overlap, trims active slab)
  - `miss` (no overlap, game over)
- Score increments on each successful placement
- Height display tracks only player-built floors and excludes prebuilt starting stack slabs
- Combo HUD tracks perfect streak progress (`current/target`, default target `8`)
- Perfect hits increment combo while partial trims/misses reset it
- Recovery reward triggers at combo milestones (default every `8` perfect hits):
  - applies capped slab growth toward base dimensions
  - enables temporary movement slowdown for a configurable number of floors
- Audio + haptics feedback manager emits distinct cues for `perfect`, `landed`, and `miss` outcomes with browser-safe capability gating
- Runs start immediately on load; a brief `Tower stacker` title card appears at boot and eases out left
- Restart-after-failure is available from the contextual primary menu button (no separate rebuild action)
- V3 distraction framework runs as a deterministic side-channel (seeded + level-gated) without mutating trim/placement math
- V3.2 actor layer now renders a gorilla that climbs around the tower perimeter with rhythmic slam pulses, a UFO that can complete a full tower orbit and then flies off-screen toward the player in Z instead of popping out when deactivating (with contrast-wash flashes), and persistent front-layer cloud cover (including mid-screen occluders) with distraction-driven intensity boosts
- Structural integrity telemetry computes a deterministic tower center-of-mass approximation and classifies `stable`/`precarious`/`unstable` tiers against tunable thresholds
- Collapse fail sequence triggers on hard misses or unstable integrity, applying deterministic fallback toppling visuals, failure camera pullback, and collapse feedback cues
- V5.1 performance layer archives distant slabs into static chunk proxies, applies distraction LOD throttling, and enforces strict debris pooling/active caps through runtime quality controls

## Visual and Camera Behavior

- Camera follows landed tower height (instead of the just-spawned active slab) with configurable distance/lerp, smoothing post-placement climb and reducing jumpiness; startup framing applies a short-lived lift so the initial stack starts lower in the viewport and then eases toward normal framing as floors are added
- Successful placements trigger a brief impact flash pulse
- Active distraction channels now drive visible overlay actors (gorilla, UFO, cloud layer), contrast wash intensity, and camera tremor pulse effects; cloud motion now continuously sways left↔right (no hard reset) with stronger opacity and guaranteed mid-screen stack occlusion
- Precarious integrity tier introduces deterministic camera wobble scaled by configurable instability strength
- Active collapse sequence applies deterministic tower tilt/drop presentation and camera pullback progression
- Trimmed overhang pieces become animated debris and despawn by lifetime/threshold
- Slab color palette varies by slab level (hue progression)
- **Color stability rule:** a slab keeps its color when it transitions from active to landed (no post-placement recolor)

## Input

- Keyboard: `Space` / `Enter` on **key release** to place the active slab
- Pointer: click/tap on play area
- While in `game_over`, direct gameplay input (`Space`/`Enter` release or touch/click in the play area) immediately starts a fresh run
- Input is blocked when interacting with overlay/debug controls
- Touch input is handled explicitly for mobile `touchstart` and desktop pointer paths

## Debug Controls (`?debug`)

Debug mode also enables developer-facing HUD/overlay diagnostics that are hidden in normal gameplay:

- Top HUD `Status` card (`status-message`)
- Menu overlay descriptive body copy and renderer status line

Runtime tuning panel includes:

- Camera: height, distance, lerp
- Slab dimensions: base width, base depth, slab height (default 2.0; runtime range 1.0–3.0)
- Motion: range, base speed, speed ramp
- Placement: perfect tolerance, combo target length
- Recovery rewards: growth multiplier, slowdown factor, slowdown floors
- Feedback: audio enable toggle, haptics enable toggle
- Distractions: global enable, per-layer toggles (tentacle/gorilla/tremor/ufo/contrast/cloud), deterministic motion speed, level-start thresholds for tentacle/gorilla/ufo/cloud gating, and on-demand launch buttons for each distraction channel
- Integrity: precarious threshold, unstable threshold, and camera wobble strength
- Collapse: fail-sequence duration, tilt strength, camera pullback distance, and drop distance
- Performance: quality preset (`0` low / `1` medium / `2` high), auto-quality toggle, frame-budget target, archival keep-level/chunk sizing, distraction LOD near/far distances, active debris cap, and debris pool limit
- Setup: prebuilt starting levels (default raised so the base extends below the bottom screen edge)
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
- `getState()` (includes level, last placement outcome, top slab dimensions, combo state `{ current, best, target, rewardReady }`, recovery state `{ rewardsEarned, slowdownPlacementsRemaining, speedMultiplier }`, feedback state `{ audioEnabled, hapticsEnabled, audioSupported, hapticsSupported, audioUnlocked, eventsTriggered, audioEventsPlayed, hapticEventsPlayed, lastEvent }`, distraction state `{ enabled, level, active, signals, visuals }`, integrity state `{ tier, normalizedOffset, wobbleStrength, centerOfMass, topCenter, offset }`, collapse state `{ active, trigger, progress, cameraPullback, completed }`, performance state `{ qualityPreset, frameTimeMs, averageFrameTimeMs, activeObjects, visibleSlabs, archivedSlabs, archivedChunks, debrisActive, debrisPooled, distractionLod }`, and test-mode metadata including paused state/seed)

## Automated Verification

- Unit tests cover pure logic modules (trim, spawn, oscillation, config clamping)
- Playwright end-to-end tests cover:
  - Title boot autostart flow with intro title-card exit animation
  - Debug-panel and status-surface query gating
  - Test-mode API exposure and deterministic single-step advancement
  - Test-mode paused boot defaults and `paused=0` auto-run override
  - Keyboard keyup + pointer/touch stop input paths
  - Immediate restart from `game_over` using gameplay input (`Space`/touch)
  - Miss transition to game over and restart reset behavior
  - Runtime debug-speed tuning affecting active slab movement
  - Scripted deterministic placement sequences via test API
  - Combo milestone sequence triggering recovery growth + slowdown with HUD + test-state verification
  - Debug streak/recovery tuning changing runtime reward behavior
  - Audio/haptics toggle gating for runtime feedback emission
  - Distraction framework level-gating + runtime global toggle behavior
  - Gorilla/UFO/cloud actor rendering activation and continued trim correctness while distractions are active
  - Debug on-demand distraction launch buttons forcing each channel active for a short runtime window
  - Deterministic integrity telemetry transitions (`stable` → `precarious` → `unstable`) through scripted placements
  - Deterministic collapse trigger from unstable integrity without requiring a hard miss
  - High-start-stack performance smoke with archival/quality toggles and responsive input assertion
  - Deterministic scripted outcomes preserved with optimization toggles enabled
  - Mobile-sized touch/tap stop input path
- Unit coverage threshold is enforced at 90% for the logic layer
