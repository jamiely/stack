# Requirements — improve-fireworks-visual

## Objective
Overhaul fireworks visuals/simulation so fireworks present a deterministic multi-stage lifecycle (`launch -> arc/apex + primary burst -> secondary sparks -> fade/cleanup`) in world space behind the tower, while preserving gameplay behavior and performance safety.

## In Scope
1. Replace current fireworks visual path with fireworks-specific staged simulation and rendering.
2. Launch shells from varied world-space positions behind the stack.
3. Add visible launch arc before burst.
4. Add exactly one primary burst per shell with vivid multicolor chrysanthemum-style radial spread and trails.
5. Add delayed secondary spark emission that trends downward over life.
6. Add fade/expiry/cleanup lifecycle so entities are removed on time.
7. Add fireworks runtime debug controls/actions for tuning and deterministic tests.
8. Add deterministic test observability and tests for lifecycle progression and debug-control effects.
9. Add fireworks-local performance guardrails (caps/throttling/pooling/degradation order).

## Out of Scope
1. Non-fireworks distraction redesign (gorilla/UFO/tentacles/clouds/contrast/tremor).
2. Gameplay/scoring/combo/recovery/integrity/collapse/trim physics changes.
3. New fireworks audio or haptic behavior.
4. Global camera retuning beyond fireworks placement/projection needs.
5. Broad debug panel/UI redesign unrelated to fireworks controls.
6. General performance architecture refactors outside fireworks-local protections.
7. Unrelated test-surface expansion beyond fireworks/regression checks.

## Minimum Acceptance Criteria (deterministic 60 Hz test mode)
1. **Launch cadence + gating**
   - Enabled + level-gated channel repeatedly launches fireworks.
   - Inter-launch interval stays within **0.8s–2.4s** (default tuning).
   - No starvation gap > **3.0s** during a 20s active run.
   - Disabled/below-threshold state yields **zero launches**.

2. **World-space origin + arc visibility**
   - Shells spawn behind stack in world coordinates with varied X/Z origins.
   - Each shell has observable travel arc before burst.
   - Travel-to-apex duration: **0.45s–1.10s**.
   - At least **6 ticks** of visible travel before primary burst.

3. **Primary burst semantics**
   - Exactly one primary burst per shell.
   - Burst occurs at apex within **±1 tick**.
   - Burst has multicolor near-spherical radial spread + trails.

4. **Secondary emission semantics**
   - Secondary sparks belong to same firework lifecycle, not independent launches.
   - Secondary starts **0.05s–0.35s** after primary burst.
   - Secondary particles show downward velocity trend by mid-life.

5. **Fade/expiry/cleanup timing**
   - Primary completion by **1.2s–2.2s** after primary burst.
   - Secondary completion by **1.0s–2.8s** after secondary spawn.
   - Full instance cleanup (no shell/particles) by **<=3.2s** from launch.
   - No ghost particles; render path stops drawing expired entities.

6. **Deterministic observability + controls**
   - Same seed + step sequence => identical lifecycle timestamps/counts.
   - Playwright can assert staged progression via exposed snapshot fields.
   - Runtime controls (interval/speed/gravity/count/lifetime) measurably alter outcomes within one deterministic run.

7. **Performance non-regression floor**
   - Stress settings never exceed configured active particle cap.
   - Degradation policy drops secondary density before primary density.
   - No runaway entity growth across sustained 30s stress run.
