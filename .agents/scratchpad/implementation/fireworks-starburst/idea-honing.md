# Idea Honing — fireworks-starburst

- Task: task-1775093503-c8bd (`pdd:fireworks-starburst:requirements`)
- Q1 (success criteria): Which exact visual reference should the Step 6 screenshot assertion use as the canonical chrysanthemum target (existing baseline asset/path), and what fixed seed + tick/frame capture point should be treated as authoritative?
- A1: Use the provided user-approved reference image as the visual style source of truth:
  - `/Users/jamiely/Library/Containers/cc.ffitch.shottr/Data/tmp/cc.ffitch.shottr/SCR-20260401-sfur.jpeg`
  and enforce CI via a committed Playwright baseline snapshot at:
  - `tests/e2e/fireworks.spec.ts-snapshots/fireworks-chrysanthemum-canonical-chromium-darwin.png`
- A1 (deterministic capture point): Use `seed=42` with `?debug&test&paused=1`, trigger one deterministic launch via debug control, then capture on the first primary burst frame + 2 simulation ticks (i.e., detect `primaryBursts` transition `0 -> 1`, step 2 more ticks, take screenshot). This burst-relative tick anchor is the authoritative capture timing.
- Q2 (visual gate precision): For the Step 6 Playwright screenshot assertion, what exact snapshot tolerance contract should be canonical in CI (for example `maxDiffPixels`, per-pixel threshold, and/or animation disablement), so we can avoid flaky pass/fail behavior across environments?
- A2: Canonical CI contract for the Step 6 chrysanthemum screenshot should be:
  - Use `expect(page).toHaveScreenshot("fireworks-chrysanthemum-canonical-chromium-darwin.png", { ... })`
  - `animations: "disabled"` (hard requirement)
  - `caret: "hide"`
  - `scale: "css"`
  - `threshold: 0.12` (per-pixel tolerance)
  - `maxDiffPixels: 180` (absolute diff cap)
- A2 (stability controls): Keep deterministic capture anchored exactly as in A1 (`seed=42`, first `primaryBursts` transition + 2 ticks, paused test mode/manual stepping). No additional animation-control flags are required beyond Playwright `animations: "disabled"` because simulation progression is already fully step-gated in paused mode.
