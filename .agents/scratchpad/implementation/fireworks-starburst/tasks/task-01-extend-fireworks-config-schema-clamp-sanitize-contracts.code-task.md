---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Extend fireworks config schema + clamp/sanitize contracts

## Description
Add the new fireworks morphology and count controls to the shared config surface, then enforce safe clamping/sanitization so adversarial debug payloads cannot destabilize deterministic simulation.

## Background
Step 1 establishes the contract used by all later simulation and rendering changes. Existing fireworks controls already clamp and sanitize; the new controls must follow the same patterns including min/max normalization and integer coercion for count fields.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Extend `DebugConfig`/`FireworksConfig` and defaults with the new morphology/count controls required by design R1.
2. Update `clampDebugConfig` to enforce finite bounds, normalize any new min/max pairs, and integer-round count-like controls.
3. Update `sanitizeFireworksConfig` to mirror the same safety rules for simulation-side configs.
4. Preserve existing fireworks cap guardrails and legacy control behavior while adding the new fields.

## Dependencies
- None (first implementation step for the fireworks-starburst wave).

## Implementation Approach
1. TDD: add failing tests in `tests/unit/debugConfig.test.ts` for clamp, normalization, and integer coercion of new controls.
2. TDD: add failing tests in `tests/unit/fireworks.test.ts` for sanitize behavior of the same fields.
3. Implement minimal type/default/clamp/sanitize changes in `src/game/types.ts`, `src/game/debugConfig.ts`, and `src/game/logic/fireworks.ts`, then refactor while keeping tests green.

## Acceptance Criteria

1. **Schema and safety contracts are extended**
   - Given adversarial debug/simulation config payloads with non-finite, inverted, and out-of-range morphology/count values
   - When `clampDebugConfig` and `sanitizeFireworksConfig` are executed
   - Then returned values are finite, bounded, normalized, and integer-coerced where required.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,debug-config,sanitization,unit-tests
- **Required Skills**: TypeScript, Vitest, deterministic simulation
