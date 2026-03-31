---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Docs sync and final verification

## Description
Update feature and setup/testing documentation to match shipped cloud behavior and run final verification gates.

## Background
Repo workflow requires docs to be updated whenever behavior/control/testing surface changes. Cloud fix completion includes explicit docs and regression gate validation.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Update `docs/features.md` to reflect cloud lifecycle, controls, rendering, and diagnostics behavior.
2. Update `README.md` if control surface or testing workflow text changed.
3. Run final verification gates: `npm run test:unit` and `npm run test:e2e`.
4. Ensure documentation language matches implemented deterministic semantics and non-goals.

## Dependencies
- task-07-cloud-diagnostics-and-acceptance-coverage.code-task.md

## Implementation Approach
1. TDD/documentation-first: identify failing expectation mismatches between docs and current implementation.
2. Update docs to align with implemented behavior and debug/test surfaces.
3. Run full unit and e2e suites; refactor wording for clarity while keeping tests green.

## Acceptance Criteria

1. **Documentation Alignment**
   - Given cloud fix implementation is complete
   - When reviewing `docs/features.md` and `README.md`
   - Then documented behavior, controls, and diagnostics match shipped implementation

2. **Final Verification Gates**
   - Given documentation updates are complete
   - When running `npm run test:unit` and `npm run test:e2e`
   - Then both suites pass

3. **Task Completion Quality**
   - Given all cloud-fix steps are implemented
   - When this task is finalized
   - Then objective-level documentation and regression gates are satisfied

## Metadata
- **Complexity**: Medium
- **Labels**: docs,verification,regression,cloud
- **Required Skills**: Documentation, Vitest, Playwright
