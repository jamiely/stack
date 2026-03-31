---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Cloud diagnostics and acceptance coverage

## Description
Expose per-cloud diagnostics in the public test API and complete deterministic unit/e2e acceptance coverage, including adversarial threshold behavior and gameplay non-regression.

## Background
Cloud fix completion requires deterministic observability (`id`, coordinates, lane, recycle metadata) for Playwright assertions without breaking existing `distractions.visuals` compatibility.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Extend `PublicGameState` and `getState()` mapping with per-cloud diagnostics in test mode.
2. Preserve backward compatibility for existing `distractions.visuals` fields.
3. Finalize deterministic lifecycle/lane/recycle assertions in unit and cloud e2e suites.
4. Keep `tests/e2e/gameplay.spec.ts` core smoke assertions passing.

## Dependencies
- task-06-rounded-lobe-render-adapter.code-task.md

## Implementation Approach
1. TDD: add failing type/test assertions for diagnostics shape and deterministic e2e scenarios.
2. Implement API/type mappings and complete scenario assertions (including adversarial thresholds).
3. Refactor state mapping to keep compatibility and deterministic readability.

## Acceptance Criteria

1. **Per-Cloud Diagnostics Exposure**
   - Given test mode is enabled
   - When `window.__towerStackerTestApi.getState()` is called
   - Then cloud diagnostics include `id`, `x`, `y`, `z`, `lane`, and `recycleCount`

2. **Deterministic Adversarial Acceptance**
   - Given inverted/tight thresholds and zero-drift controls are applied
   - When deterministic steps run
   - Then state remains finite, sanitized behavior is deterministic, and recycle thrash from invalid config is absent

3. **Regression Safety**
   - Given cloud acceptance tests are complete
   - When running gameplay smoke e2e coverage
   - Then core gameplay assertions remain green

4. **Unit and E2E Tests Pass**
   - Given the implementation is complete
   - When running the relevant test suites
   - Then all tests for this task pass

## Metadata
- **Complexity**: High
- **Labels**: cloud,diagnostics,test-api,e2e,coverage,tdd
- **Required Skills**: TypeScript, API typing, Playwright, Vitest
