# Project Summary — Fireworks Chrysanthemum Starburst

## Artifacts Created

- `.agents/planning/2026-04-02-fireworks-starburst/rough-idea.md`
- `.agents/planning/2026-04-02-fireworks-starburst/idea-honing.md`
- `.agents/planning/2026-04-02-fireworks-starburst/research/existing-fireworks-implementation.md`
- `.agents/planning/2026-04-02-fireworks-starburst/research/chrysanthemum-distribution-strategy.md`
- `.agents/planning/2026-04-02-fireworks-starburst/research/deterministic-visual-verification.md`
- `.agents/planning/2026-04-02-fireworks-starburst/design/detailed-design.md`
- `.agents/planning/2026-04-02-fireworks-starburst/implementation/plan.md`
- `.agents/planning/2026-04-02-fireworks-starburst/summary.md`

## Brief Design Overview

The design replaces the current bell-like fireworks burst emission with a deterministic chrysanthemum-style circular starburst applied to all fireworks by default. It keeps one universal style (no style presets), preserves seeded deterministic behavior in test mode, and introduces runtime debug controls for tuning burst morphology (distribution, ring influence, jitter, vertical bias, and particle counts).

The plan keeps existing simulation guardrails (particle cap and degradation policy), leverages current config/debug plumbing, and adds deterministic screenshot-based Playwright verification for visual acceptance against the provided reference style.

## Brief Implementation Plan Overview

The implementation plan is structured into 8 incremental, demoable steps:
1. Extend config schema/clamps
2. Implement isotropic burst sampling
3. Add ring/jitter/bias shaping + configurable counts
4. Wire runtime debug controls
5. Expand unit tests for morphology + clamps
6. Add deterministic screenshot e2e verification
7. Tune defaults to match reference look
8. Final regression + docs update

Each step includes integrated testing requirements and explicit working demos.

## Suggested Next Steps

1. Review `design/detailed-design.md` for agreement on proposed controls and default behavior.
2. Start execution using `implementation/plan.md` checklist from Step 1 onward.
3. Capture/approve the baseline screenshot for deterministic fireworks visual regression.
4. Keep docs and tests updated per step to preserve CI readiness.

## Areas That May Need Further Refinement

- Exact default values for new morphology controls to best match the reference screenshot.
- Screenshot crop/tolerance strategy to maximize stability across environments.
- Whether to add optional numeric morphology telemetry assertions alongside screenshots for extra regression robustness.
