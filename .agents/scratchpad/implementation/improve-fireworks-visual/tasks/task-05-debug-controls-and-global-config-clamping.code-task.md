---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Debug Controls and Global Config Clamping

## Description
Expose fireworks tuning through global debug config and ensure clamping/sanitization plus force-launch action compatibility.

## Background
Fireworks simulation must be runtime-tunable and testable through existing debug surfaces. This step integrates fireworks keys into established debug config pipelines.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add fireworks numeric debug keys, defaults, and ranges in `src/game/types.ts` and `src/game/debugConfig.ts`.
2. Extend `clampDebugConfig` to sanitize fireworks min/max relationships and cap bounds.
3. Preserve/verify debug force-launch action routing for fireworks channel.
4. Add/extend `tests/unit/debugConfig.test.ts` coverage for new fireworks keys and action contract.

## Dependencies
- task-04-particle-cap-guardrails-and-degradation-order.code-task.md

## Implementation Approach
1. Write failing debug config tests for fireworks key clamping and force-launch action availability.
2. Implement key/range/default additions and clamp logic.
3. Refactor config helpers to avoid drift between defaults/ranges/clamps while keeping tests green.

## Acceptance Criteria

1. **Fireworks Debug Keys Clamp Correctly**
   - Given out-of-range or inverted fireworks debug values
   - When global debug clamping runs
   - Then values are normalized to valid ranges and relationships.

2. **Force Launch Action Compatibility**
   - Given the debug action surface is queried/applied
   - When invoking fireworks launch action
   - Then force launch remains available and routes to the fireworks channel.

3. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,debug-config,api,testing
- **Required Skills**: TypeScript, Vitest, debug systems
