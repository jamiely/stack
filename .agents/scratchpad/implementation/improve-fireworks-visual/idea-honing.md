# Idea Honing — improve-fireworks-visual

## Q1
What is explicitly out of scope for this overhaul so we avoid churn (e.g., changing non-fireworks distraction visuals, audio/haptics behavior, or gameplay scoring/physics)?

- task_id: task-1775049573-74e0
- task_key: pdd:improve-fireworks-visual:requirements

### A1
Explicitly out of scope for this overhaul:

1. **Non-fireworks distraction visuals**
   - No behavior or art changes for gorilla, UFO, tentacles, clouds, contrast wash, or tremor beyond minimal shared plumbing needed to keep existing integration stable.
2. **Core gameplay mechanics**
   - No changes to trim/overlap math, slab movement cadence, scoring, combo/recovery rewards, integrity tiers, or collapse triggering.
3. **Audio/haptics systems**
   - No new fireworks-specific audio cues or haptic patterns in this pass; existing feedback manager behavior remains unchanged.
4. **Camera and world framing rules outside fireworks placement**
   - No global camera retuning; only fireworks spawn/render positioning needed so fireworks appear behind the stack in world space.
5. **Broad UI/UX redesign**
   - No debug panel restructuring or unrelated control changes; only fireworks-specific debug controls/actions needed for tuning and deterministic tests.
6. **General performance architecture refactors**
   - No rework of archive/LOD/debris systems except fireworks-local guardrails (particle caps/throttling/pooling) required to prevent regressions.
7. **Unrelated test-surface expansion**
   - No new end-to-end coverage for unrelated channels/features beyond regression assertions needed to prove fireworks changes did not break them.

## Q2
What are the **minimum acceptance criteria** (observable in-game and testable) that must be true to call this overhaul done—for example launch cadence, arc visibility, primary/secondary burst behavior, and fade/cleanup timing windows?

- task_id: task-1775049573-74e0
- task_key: pdd:improve-fireworks-visual:requirements

### A2
Minimum acceptance criteria for “done” (assuming deterministic fixed-step simulation at 60 Hz in test mode):

1. **Launch cadence + gating correctness**
   - When fireworks channel is enabled and level gating threshold is met, launches occur repeatedly with randomized but bounded spacing.
   - Acceptance window: inter-launch interval must stay within **0.8s–2.4s** (default tuning) with no starvation gap > **3.0s** during a 20s active run.
   - When channel is disabled or below start level, **zero launches** occur.

2. **World-space launch origin + visible arc phase**
   - Each shell must spawn in world coordinates behind the stack (not viewport-anchored), with varied X/Z origin over time.
   - Every launched shell must show an observable pre-burst travel arc before apex (not instant burst-at-spawn).
   - Acceptance window: shell travel-to-apex duration **0.45s–1.10s**; at least **6 simulation ticks** of visible travel before primary burst event.

3. **Primary burst behavior (chrysanthemum baseline)**
   - Exactly one primary burst event per shell at apex.
   - Primary burst emits multicolor radial particles with near-spherical spread and visible trails.
   - Acceptance window: primary burst created within **±1 tick** of apex trigger; no duplicate primary event for same shell.

4. **Secondary spark follow-up behavior**
   - Secondary sparks must be emitted after primary burst (same firework lifecycle), not as independent launches.
   - Acceptance window: secondary emission begins **0.05s–0.35s** after primary burst.
   - Secondary particles must exhibit a downward velocity trend over life (gravity-dominant by mid-life).

5. **Fade, expiry, and cleanup timing**
   - Primary and secondary particles must fade out and be removed from active simulation state without lingering forever.
   - Acceptance windows:
     - Primary lifetime complete by **1.2s–2.2s** after primary burst.
     - Secondary lifetime complete by **1.0s–2.8s** after secondary spawn.
     - Full firework cleanup (no shell/particles remaining for that instance) by **≤3.2s** from launch under default settings.
   - No “ghost” entities: expired particles count returns to baseline/pool and render adapter stops drawing them.

6. **Deterministic testability + debug control observability**
   - With same seed and same step sequence, lifecycle timestamps/counts are identical across runs.
   - Playwright can assert staged progression (`launch -> apex/primary -> secondary -> fade/cleanup`) using exposed test snapshot fields.
   - Runtime debug controls (launch interval, shell speed/gravity, burst counts/lifetimes) must visibly and measurably shift timing/count outcomes within one deterministic run.

7. **Performance safety floor (minimum non-regression criterion)**
   - Under stress debug settings, active particles must never exceed configured cap; degradation policy should preferentially reduce secondary density first.
   - System remains responsive (no runaway growth of active entities across a sustained 30s stress run).

These are intentionally **minimum** acceptance bars; tighter aesthetic tuning can happen later without reopening requirements as long as the staged lifecycle and deterministic observability remain intact.

## Requirements Completion Check
- Core functionality defined: staged lifecycle (`launch -> arc/apex primary -> secondary -> fade/cleanup`) and world-space placement are explicit.
- Scope boundaries explicit: non-fireworks channels, gameplay systems, audio/haptics, and broad refactors are out of scope.
- Success criteria measurable: timing/count/cap windows are specified with deterministic 60 Hz observability.
- Edge/perf cases captured: disable/start-level gating, no-starvation cadence, particle cap enforcement, cleanup deadlines, and deterministic replay guarantees.
