---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Implement deterministic isotropic burst direction sampler

## Description
Replace the existing burst-direction generation path with deterministic isotropic spherical sampling so neutral settings have balanced distribution without directional bias artifacts.

## Background
Current emission direction logic is deterministic but not fully isotropic. This step updates sampling while preserving replay determinism and explicit RNG cursor progression.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Refactor particle direction generation to isotropic spherical sampling in the fireworks simulation core.
2. Maintain deterministic replay semantics for equal seed/config/step sequences.
3. Keep RNG cursor consumption explicit and stable across repeated runs.
4. Avoid regressions in existing telemetry, lifecycle, and cleanup behavior.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-01-extend-fireworks-config-schema-clamp-sanitize-contracts.code-task.md

## Implementation Approach
1. TDD: add failing replay determinism and neutral-distribution tests in `tests/unit/fireworks.test.ts`.
2. Implement isotropic sampler changes in `src/game/logic/fireworks.ts` with minimal diff.
3. Refactor for clarity/performance while preserving deterministic snapshots.

## Acceptance Criteria

1. **Deterministic isotropic sampling is implemented**
   - Given a fixed seed and identical simulation config
   - When the same step sequence is replayed multiple times
   - Then emitted state snapshots are byte-equal and distribution sanity checks pass under neutral bias.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,simulation,determinism,unit-tests
- **Required Skills**: TypeScript, Vitest, RNG/deterministic simulation math
