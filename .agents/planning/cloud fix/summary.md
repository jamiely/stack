# Planning Summary: `cloud fix`

## Artifacts Created

- `.agents/planning/cloud fix/rough-idea.md`
- `.agents/planning/cloud fix/idea-honing.md`
- `.agents/planning/cloud fix/research/current-cloud-system.md`
- `.agents/planning/cloud fix/research/camera-and-coordinate-flow.md`
- `.agents/planning/cloud fix/research/testing-and-debug-hooks.md`
- `.agents/planning/cloud fix/research/rendering-style-options.md`
- `.agents/planning/cloud fix/design/detailed-design.md`
- `.agents/planning/cloud fix/implementation/plan.md`
- `.agents/planning/cloud fix/summary.md`

## Brief Design Overview

The plan replaces the existing cloud system with a deterministic, world-coordinate cloud simulation module plus a thin render adapter. The new design enforces camera-relative lifecycle thresholds (spawn above camera, recycle below camera), preserves explicit front/behind stack depth layering, keeps slow horizontal drift, and removes fragile mixed camera/NDC anchoring behavior. Visuals are upgraded to smooth rounded-lobe Mario-style procedural clouds.

## Brief Implementation Plan Overview

Implementation is split into nine incremental steps:
1. build pure deterministic cloud data model,
2. implement camera-relative lifecycle/recycling,
3. add front/back depth lanes + horizontal drift,
4. integrate and remove legacy cloud logic,
5. add debug controls and clamps,
6. ship rounded-lobe cloud visuals,
7. expose cloud diagnostics in test API,
8. add unit + Playwright acceptance coverage,
9. update docs and finalize.

Each step yields demoable behavior and includes tests aligned with deterministic and regression requirements.

## Recommended Next Steps

1. Review `design/detailed-design.md` for any final behavior tweaks.
2. Execute `implementation/plan.md` in order.
3. Validate each step with unit + Playwright before commits.

## Areas for Optional Refinement

- Fine-tune default/range values for new cloud debug controls after first integration pass.
- Decide whether to include explicit front/back ratio tuning slider initially or keep it fixed and internal.
- Add optional low-performance cloud profile later (reduced count/update cadence) once mobile pass is prioritized.
