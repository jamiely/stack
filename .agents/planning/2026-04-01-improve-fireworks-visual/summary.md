# Project Summary: Fireworks Visual Overhaul

## Artifacts Created

### Root
- `.agents/planning/2026-04-01-improve-fireworks-visual/rough-idea.md`
- `.agents/planning/2026-04-01-improve-fireworks-visual/idea-honing.md`
- `.agents/planning/2026-04-01-improve-fireworks-visual/summary.md`

### Research
- `.agents/planning/2026-04-01-improve-fireworks-visual/research/current-fireworks-and-gaps.md`
- `.agents/planning/2026-04-01-improve-fireworks-visual/research/existing-fireworks-implementations.md`
- `.agents/planning/2026-04-01-improve-fireworks-visual/research/recommended-direction.md`
- `.agents/planning/2026-04-01-improve-fireworks-visual/research/web-fireworks-implementation-patterns.md`

### Design
- `.agents/planning/2026-04-01-improve-fireworks-visual/design/detailed-design.md`

### Implementation
- `.agents/planning/2026-04-01-improve-fireworks-visual/implementation/plan.md`

## Design Overview
The design replaces the current DOM pulse fireworks with a deterministic world-space staged simulation:
1. launch shell with slight arc,
2. primary chrysanthemum-style spherical burst with longer trails,
3. secondary sparks that drift downward and fade.

It includes:
- performance guardrails for lower-end devices,
- vivid multicolor styling,
- broad randomized placement behind the stack,
- runtime debug tuning controls,
- deterministic test hooks and coverage strategy.

## Implementation Plan Overview
The implementation plan is organized into 10 incremental, demoable steps, each with integrated test requirements:
- core simulation scaffolding,
- launch/apex logic,
- primary and secondary burst stages,
- world-space placement,
- renderer integration and replacement of old path,
- debug controls,
- performance safeguards,
- deterministic Playwright coverage,
- final hardening and documentation.

A checklist is included at the top of the plan to track progress directly against each step.

## Suggested Next Steps
1. Review and approve the design at:
   - `.agents/planning/2026-04-01-improve-fireworks-visual/design/detailed-design.md`
2. Start execution using:
   - `.agents/planning/2026-04-01-improve-fireworks-visual/implementation/plan.md`
3. Implement in order, completing tests in each step before moving on.

## Areas for Potential Refinement
- Exact default values/ranges for debug sliders (tuning pass likely needed).
- Final rendering primitive choice (points vs sprite-based trails) after first visual prototype.
- Performance thresholds definition for “smooth on lower-end devices” in CI/perf checks.
