---
status: completed
created: 2026-04-02
started: 2026-04-03
completed: 2026-04-03
---
# Task: Tune default values to match chrysanthemum reference style

## Description
Tune default fireworks morphology/count values so out-of-the-box behavior aligns with the chrysanthemum reference while keeping deterministic guardrails and canonical screenshot tests green.

## Background
After controls and visual gate are in place, defaults must be adjusted to the target look without violating cap safety or deterministic replay contracts.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Update default debug config values for new fireworks controls toward chrysanthemum target behavior.
2. Ensure default settings remain within cap-safe and sanitization-safe envelope.
3. Keep canonical screenshot test and existing determinism/cap tests passing after tuning.
4. Adjust tests only where assertions intentionally encode defaults.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-06-add-canonical-deterministic-screenshot-gate.code-task.md

## Implementation Approach
1. TDD: add/adjust default-envelope assertions in `tests/unit/fireworks.test.ts` or `tests/unit/debugConfig.test.ts` as needed.
2. Iteratively tune defaults in `src/game/debugConfig.ts` while running deterministic and visual tests.
3. Refactor comments/labels for clarity once tuned values stabilize.

## Acceptance Criteria

1. **Default fireworks behavior matches target style safely**
   - Given default startup config with deterministic seed
   - When fireworks bursts are produced and evaluated through existing telemetry/visual tests
   - Then bursts match chrysanthemum expectations while respecting cap and determinism guardrails.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit/e2e suites for this task
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,tuning,defaults,visual-regression
- **Required Skills**: TypeScript, Playwright, deterministic tuning workflow
