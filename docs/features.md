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
- Perfect hits increment combo, partial trims/misses reset it, and reaching target marks a reward-ready state for the upcoming V2.2 reward system
- Restart and return-to-title flows are supported via a single contextual primary menu button (no separate rebuild action)

## Visual and Camera Behavior

- Camera follows tower height with configurable distance/lerp
- Successful placements trigger a brief impact flash pulse
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
- Placement: perfect tolerance
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
- `getState()` (includes level, last placement outcome, combo state `{ current, best, target, rewardReady }`, and test-mode metadata including paused state/seed)

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
  - Perfect streak sequence reaching combo target with HUD + test-state verification
  - Mobile-sized touch/tap stop input path
- Unit coverage threshold is enforced at 90% for the logic layer
