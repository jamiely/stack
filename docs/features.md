# Tower Stacker Features

This document tracks implemented gameplay features and notable behavior decisions for the current browser implementation.

## Core Gameplay

- Alternating slab movement axes by level (`X` then `Z` then `X`...)
- New active slabs now spawn closer to the top slab footprint: they begin sliding over the previous block when it is wide enough, but still enforce a minimum spawn clearance when the tower top gets thin so timing remains readable
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
- Restart-after-failure is handled by direct gameplay input (`Space`/`Enter` release, click, tap) from `game_over` without a dedicated restart button
- V3 distraction framework runs as a deterministic side-channel (seeded + level-gated) without mutating trim/placement math
- V3.3 actor layer now renders a gorilla that follows a deterministic tower-climb path around the building with rhythmic slam pulses, a UFO that can complete a full tower orbit and then flies off-screen toward the player in Z instead of popping out when deactivating (with contrast-wash flashes), persistent front-layer cloud cover (including mid-screen occluders) with distraction-driven intensity boosts, intermittent tentacle bursts (now with deterministic purple/green/pink palettes) that persist on previously affected slabs instead of being replaced on each new placement and are resolved once per newly landed slab via deterministic per-placement chance, and simulation-driven fireworks with staged shell launch/primary/secondary/fade lifecycles plus isotropic burst-direction sampling and reduced particle drag/gravity shaping for a more spherical chrysanthemum silhouette; default fireworks morphology/count tuning now ships in a chrysanthemum-biased profile (`primary=48`, `secondary=8`, `ringBias=0.2`, `radialJitter=0.2`, `verticalBias=0.08`, `speedJitter=0.14`)
- Tentacle bursts are decided immediately when each new slab lands (deterministic per-placement chance), spawn only on camera-visible slab faces, and animate with stronger vertical wave undulation as they extend
- UFO orbit altitude now tracks exactly one slab-height above the current tower top center; UFO visual size is projected from world scale so it reads approximately one slab tall on screen, and default UFO start-level tuning is lower so it appears earlier in normal runs
- Structural integrity telemetry computes a deterministic tower center-of-mass approximation and classifies `stable`/`precarious`/`unstable` tiers against tunable thresholds
- Collapse fail sequence triggers on hard misses, applying deterministic fallback toppling visuals, failure camera pullback, and collapse feedback cues
- V5.1 performance layer archives distant slabs into static chunk proxies, applies distraction LOD throttling, and enforces strict debris pooling/active caps through runtime quality controls

## Visual and Camera Behavior

- Camera follows landed tower height (instead of the just-spawned active slab) with configurable distance/lerp plus a tunable framing offset, frame-rate-independent damping, and a smoothed look target so post-placement climbs feel fluid even during frame-time spikes; startup framing applies a short-lived lift so the initial stack starts lower in the viewport and then eases toward normal framing as floors are added, and `Camera Height` now adjusts eye elevation independently from the focal-point `Camera Y` offset
- Successful placements trigger a brief impact flash pulse plus a configurable camera shake burst (`Placement Shake` debug control); tremor pulses include a subtle vertical camera component
- Active distraction channels now drive visible overlay actors (gorilla, UFO, cloud layer, fireworks), contrast wash intensity, and camera tremor pulse effects; cloud rendering is world-projected so vertical cloud position tracks world space instead of appearing pinned to screen coordinates, and the cloud adapter maps deterministic lane/variant metadata to rounded-lobe silhouettes with subtle front/back depth styling.
- Fireworks rendering now uses a simulation-to-DOM adapter (`.distraction-fireworks__entity`) that stamps deterministic metadata (`data-fireworks-kind`, `data-fireworks-entity-id`, `data-fireworks-shell-id`, `data-fireworks-stage`) for shell/particle lifecycle assertions, guarantees expired entities are removed from the layer, and spawns each launch slightly above the current tower top in world space (captured at launch time)
- Cloud lifecycle is simulation-driven and camera-relative (despawn below threshold, recycle above camera spawn band) with deterministic in-place recycle metadata; by default tuning keeps on-screen coverage while enabled, but cloud count debug controls can intentionally reduce the layer to zero nodes.
- Precarious integrity tier introduces deterministic camera wobble scaled by configurable instability strength
- Active collapse sequence applies deterministic tower tilt/drop presentation and camera pullback progression
- Collapse now also spawns a deterministic voxelized explosion burst from landed tower slabs for game-over presentation plus any still-visible trimmed debris pieces from earlier cuts (excluding the final unplaced missed slab); voxels are generated with more even cube-like sizing, distributed across slab heights so upper blocks remain represented, and capped to slabs within roughly two block-heights outside the current screen bounds
- Trimmed overhang pieces become animated debris and despawn by lifetime/threshold
- Debris pieces inherit the parent slab color, push away from the tower with deterministic lateral motion, and no longer use rotational tumble spin
- Landed (non-active) slabs (including the prebuilt starting stack) add procedural 3D window facades with body-framed windows and protruding sills, deterministic per-side window-count variation, one deterministic style per slab (no mixed styles on a single block), and style variants for rectangular, pointed gothic, rounded gothic, planter-box, shuttered, and bay windows while keeping windows vertically centered; window generation skips too-narrow faces, enforces stronger edge clearance (including a minimum edge distance and a half-window edge padding guard) so windows stay away from block edges, clamps pair spacing to avoid excessive gaps while keeping the set horizontally centered, enforces shutter spacing so shutters never overlap, varies shutter colors per slab, and occasionally switches trim/sill palettes to darker slab-hue accents
- Newly landed slabs now also spawn a dedicated lower ledge/balcony strip on a visible face; ledges animate in from narrow to full configured size and deterministically vary from 25% to 100% of the face span, and a randomly selected dancer is anchored onto a visible ledge with automatic world-space scaling so it stays appropriately sized as slab height changes (the active dancer does not hop to a newer ledge while the current ledge is still visible); character selection is randomized across `assets/remy_character_t_pose.glb`, `assets/timmy_tiny_webp.glb`, `assets/amy_tiny_webp.glb`, and `assets/aj_tiny_webp.glb`, while animation selection is randomized across `assets/remy_hip_hop_animation_inplace.glb`, `assets/house_dancing_inplace.glb`, `assets/chicken_dance_inplace.glb`, and `assets/ymca_dance_inplace.glb`, with a fresh random character+animation reroll each time the dancer reappears after being hidden; clip playback retains retarget fallback support, strips animated bone-scale tracks before playback to prevent limb-stretch artifacts across mixed-cast clips, ping-pong looping to smooth non-seam boundaries, auto-orientation to the best detected up-axis for non-Y-up model exports, disabled mesh frustum culling for reliability, fallback to top-slab placement when no ledge anchor is available, and temporary hide behavior only when tentacle bursts are present on that same ledge face to avoid clipping
- Decorative windows/eaves/weathering and tentacle bursts are all limited to camera-facing sides
- Landed slabs can also render scalloped eave trims near top edges for arcade-style architectural variation, on all visible sides, with flush edge spans plus tiny corner seal pieces to close seam gaps while avoiding sharp corner spikes
- Landed slabs can render deterministic randomized bottom-half weathering overlays to add façade wear variation
- Slab color palette varies by slab level (hue progression), and slab facade finish now deterministically alternates between smooth, brick, and siding variants
- A continuous, eased day/night lighting cycle modulates sky and ambient/directional light through gradual phases (night → dawn → early morning → noon → evening → sunset → night) with frame-smoothed background color blending between states, plus a subtle fixed-screen star field (mixed star sizes) that fades in at night and recedes through daylight, and a noon-weighted camera flare overlay that intensifies near midday and tracks near the stack center
- **Color stability rule:** a slab keeps its color when it transitions from active to landed (no post-placement recolor)

## Input

- Keyboard: `Space` / `Enter` on **key release** to place the active slab
- Pointer: click/tap on play area
- While in `game_over`, direct gameplay input (`Space`/`Enter` release or touch/click in the play area) immediately starts a fresh run (no visible restart button)
- Input is blocked when interacting with overlay/debug controls
- Touch input is handled explicitly for mobile `touchstart` and desktop pointer paths

## Debug Controls (`?debug`)

Debug mode also enables developer-facing HUD/overlay diagnostics that are hidden in normal gameplay:

- Top HUD `Status` card (`status-message`)
- Menu overlay descriptive body copy and renderer status line

Runtime tuning panel includes:

- Camera: height, distance, lerp, framing offset, and focal-point Y offset (`Camera Y`)
- Slab dimensions: block width, block length, slab height (default 3.0; runtime range 1.0–5.0 so the default is centered) with immediate visual world rebuild while sliders change
- Motion: range, base speed, speed ramp
- Placement: perfect tolerance, combo target length
- Recovery rewards: growth multiplier, slowdown factor, slowdown floors
- Feedback: audio enable toggle, haptics enable toggle
- Distractions: global enable, per-layer toggles (tentacle/gorilla/tremor/ufo/contrast/cloud/fireworks), deterministic motion speed, level-start thresholds for tentacle/gorilla/ufo/cloud/fireworks gating, fireworks simulation controls (launch interval min/max, shell speed min/max, shell gravity, shell trail ticks min/max, secondary delay min/max, particle lifetime min/max, primary/secondary particle counts, ring bias, radial jitter, vertical bias, speed jitter, and active-particle cap with min/max relationship sanitization), cloud-specific simulation controls (count, horizontal drift speed including explicit zero-drift, spawn-above band, despawn-below band with ordered sanitization and minimum separation), and on-demand launch buttons for each distraction channel
- Integrity: precarious threshold, unstable threshold, and camera wobble strength
- Collapse: fail-sequence duration, tilt strength, camera pullback distance, and drop distance
- Performance: quality preset (`0` low / `1` medium / `2` high), auto-quality toggle, frame-budget target, archival keep-level/chunk sizing, distraction LOD near/far distances, active debris cap, and debris pool limit
- Setup: prebuilt starting levels (default raised so the base extends below the bottom screen edge) plus `Normalize W/L/H` quick action to unify block width/length/height
- Block motion: `Pause Block Motion` / `Resume Block Motion` debug action to freeze the active slab path for close placement inspection
- Dancer placement: runtime rotation controls on all axes (X/Y/Z) plus translation controls on all axes (X/Y/Z) now map directly to the applied transform with per-character defaults (`Remy: Rot Y=-9, Rot X=-7, Rot Z=89`; `Timmy/Amy/AJ: Rot Y=-180, Rot X=180, Rot Z=180`; `Move Y=0.85`), and a `Reset Remy Placement` action for rapid model anchoring/orientation tuning
- Atmosphere: configurable day/night cycle duration
- Effects: debris lifetime and placement camera shake amount
- Scene: grid visibility (off by default)

## Deterministic Test Mode (`?test` or `?testMode`)

- Test mode can start paused by default
- `&paused=0` starts test mode unpaused
- `&seed=<int>` sets deterministic seeded simulation/distraction state (active-slab spawn placement is geometry-driven and seed-independent)
- Fixed-step size is configurable via query (`step`), clamped for safety
- Guarded test API is exposed at `window.__towerStackerTestApi`

### Exposed Test API

- `startGame()`
- `stopActiveSlab()`
- `restartGame()`
- `returnToTitle()`
- `applyDebugConfig(config)` (partial patches supported; in paused deterministic mode, cloud/distraction simulation effects apply on the next `stepSimulation(...)`)
- `stepSimulation(steps?)`
- `setPaused(paused)`
- `setActiveOffset(offset)`
- `placeAtOffset(offset)`
- `getState()` (includes level, last placement outcome, top slab dimensions, combo state `{ current, best, target, rewardReady }`, recovery state `{ rewardsEarned, slowdownPlacementsRemaining, speedMultiplier }`, feedback state `{ audioEnabled, hapticsEnabled, audioSupported, hapticsSupported, audioUnlocked, eventsTriggered, audioEventsPlayed, hapticEventsPlayed, lastEvent }`, distraction state `{ enabled, level, active, signals, visuals, clouds[], fireworks }` where each cloud diagnostic includes `{ id, x, y, z, lane, recycleCount }` and fireworks diagnostics include lifecycle/cap counters `{ tick, elapsedSeconds, activeShells, activeParticles, launches, primaryBursts, secondaryBursts, cleanupEvents, droppedSecondary, droppedPrimary, maxActiveParticles }`, integrity state `{ tier, normalizedOffset, wobbleStrength, centerOfMass, topCenter, offset }`, collapse state `{ active, trigger, progress, cameraPullback, completed }`, performance state `{ qualityPreset, frameTimeMs, averageFrameTimeMs, activeObjects, visibleSlabs, archivedSlabs, archivedChunks, debrisActive, debrisPooled, distractionLod }`, and test-mode metadata including paused state/seed)

## Automated Verification

- Unit tests cover non-rendering modules (trim/spawn/oscillation/feedback/distraction/integrity/performance/recovery/collapse/ledge/window-layout/decor/remy-appearance/runtime-control logic, config clamping, and non-rendering runtime services such as feedback orchestration)
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
  - Debug on-demand distraction launch buttons forcing each channel (including fireworks) active for a short runtime window
  - Deterministic integrity telemetry transitions (`stable` → `precarious` → `unstable`) through scripted placements
  - Deterministic collapse trigger from unstable integrity without requiring a hard miss
  - High-start-stack performance smoke with archival/quality toggles and responsive input assertion
  - Deterministic scripted outcomes preserved with optimization toggles enabled
  - Fireworks render adapter regression coverage for metadata staging, expired-node cleanup, 30s cap/degradation stress bounds, and a canonical deterministic chrysanthemum screenshot gate (seed `42`, first primary-burst transition + 2 paused ticks, `threshold: 0.12`, `maxDiffPixels: 180`)
  - Mobile-sized touch/tap stop input path
- Unit coverage threshold is enforced at 90% for non-rendering code
- Full regression closure command set for this milestone: `npm run test:unit`, `npm run test:e2e`, `npm run coverage`, and `npm run build` (all must pass before merge)
