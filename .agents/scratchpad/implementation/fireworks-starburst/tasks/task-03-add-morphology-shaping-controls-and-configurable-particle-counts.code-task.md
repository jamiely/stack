---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Add morphology shaping controls + configurable particle counts

## Description
Implement config-driven primary/secondary particle counts and morphology shaping controls (ring bias, jitter, vertical bias, speed variation) so deterministic bursts can be tuned toward chrysanthemum structure.

## Background
After schema and isotropic sampling are in place, this step moves fixed constants to config and applies bounded shaping transforms in emission logic.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Replace hardcoded primary/secondary burst counts with sanitized config-driven values.
2. Apply morphology shaping controls to emitted particle vectors/speeds using bounded deterministic transforms.
3. Preserve lifecycle completion and telemetry invariants expected by existing fireworks tests.
4. Ensure behavior remains deterministic across seeds and fixed-step replays.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-01-extend-fireworks-config-schema-clamp-sanitize-contracts.code-task.md
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-02-implement-deterministic-isotropic-burst-direction-sampler.code-task.md

## Implementation Approach
1. TDD: add failing tests for configurable counts and bounded morphology influence in `tests/unit/fireworks.test.ts`.
2. Implement config-driven counts and shaping transforms in `src/game/logic/fireworks.ts`.
3. Refactor duplicated constants/helpers while keeping determinism and bounds checks green.

## Acceptance Criteria

1. **Morphology controls and counts are active**
   - Given fixed-seed simulations with canonical vs perturbed morphology controls
   - When bursts are emitted under sufficient cap headroom
   - Then particle counts follow config and burst distributions change predictably within bounded ranges.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: High
- **Labels**: fireworks,morphology,simulation,unit-tests
- **Required Skills**: TypeScript, Vitest, vector math, deterministic simulation
