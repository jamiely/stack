---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Lane, drift, and sanitization semantics

## Description
Implement deterministic front/back lane policy, horizontal drift behavior, and threshold sanitization helpers in pure cloud logic.

## Background
Cloud fixes require lane-depth invariants, support for zero/non-zero horizontal drift, and safe normalization of inverted/tight lifecycle thresholds.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Implement deterministic lane assignment preserving front/back mix when count supports both lanes.
2. Apply configurable horizontal drift per step, including explicit valid zero-drift behavior.
3. Add sanitization helpers for spawn/despawn ordering and minimum separation.
4. Add unit coverage for lane mix invariants, drift semantics, and threshold sanitization outcomes.

## Dependencies
- task-02-cloud-lifecycle-recycle-thresholds.code-task.md

## Implementation Approach
1. TDD: add failing tests for lane-mix invariants, drift sign/magnitude, zero-drift static-x, and threshold sanitization.
2. Implement lane policy, drift updates, and sanitize helpers in cloud logic.
3. Refactor to keep pure deterministic behavior and test readability.

## Acceptance Criteria

1. **Lane Policy Invariants**
   - Given cloud count supports both lanes
   - When initializing and recycling clouds
   - Then front/back lane mix remains present and deterministic across identical runs

2. **Drift and Zero-Drift Semantics**
   - Given non-zero drift speed
   - When stepping simulation
   - Then cloud `x` changes monotonically according to drift direction/magnitude
   - And given zero drift speed
   - When stepping simulation without recycle
   - Then cloud `x` remains unchanged

3. **Threshold Sanitization**
   - Given inverted or too-tight spawn/despawn values
   - When sanitization is applied
   - Then effective thresholds are valid, ordered, and bounded without NaN/Infinity

4. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass

## Metadata
- **Complexity**: High
- **Labels**: cloud,lane,drift,sanitization,determinism,tdd
- **Required Skills**: TypeScript, Vitest, deterministic simulation
