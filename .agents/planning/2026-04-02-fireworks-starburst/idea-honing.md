## Question 1
What is the primary user-visible outcome you want from "fireworks starburst"?

### Answer 1
Final decision: The fireworks burst should resemble a chrysanthemum rather than a bell shape, with many smaller particles emitted in a much more circular radial pattern. Multiple concentric radii/layers are acceptable if they improve the look.

## Question 2
Where should this new chrysanthemum-style burst apply: all fireworks by default, only certain firework variants, or behind a debug toggle/config setting?

### Answer 2
Final decision: Apply the chrysanthemum-style burst to all fireworks by default.

## Question 3
What balance do you want between visual quality and performance? For example: keep current performance even on lower-end devices, allow a small FPS cost for better visuals, or prioritize visuals strongly.

### Answer 3
Final decision: Prioritize maintaining current performance, including on lower-end devices.

## Question 4
Should we expose runtime debug controls for tuning this burst shape (e.g., particle count, angular spread uniformity, speed variance, concentric rings), or keep behavior fixed with no new controls?

### Answer 4
Final decision: Add runtime debug controls for tuning burst-shape parameters (e.g., particle count, angular uniformity, speed variance, concentric ring behavior).

## Question 5
For deterministic testing and reproducibility, should the new burst generation use seeded randomness when test mode is enabled, so the same seed always produces the same starburst layout?

### Answer 5
Final decision: Yes—use seeded randomness in test mode so the same seed yields the same starburst layout.

## Question 6
What should be the success criteria for this change? (Pick all that apply or refine)
- Visually appears circular/chrysanthemum instead of bell-shaped
- Existing tests pass and new tests cover burst distribution logic
- No noticeable FPS regression during normal gameplay
- Playwright test mode can verify deterministic burst generation

### Answer 6
Final decision:
- Include visual success criterion: burst should look circular/chrysanthemum rather than bell-shaped.
- Include test-updates criterion: adjust/add tests as needed for the new behavior.
- For verification in deterministic test mode, screenshot verification is sufficient; target look should match the provided reference image at `/Users/jamiely/Library/Containers/cc.ffitch.shottr/Data/tmp/cc.ffitch.shottr/SCR-20260401-sfur.jpeg`.
- No separate explicit FPS regression gate was requested as a formal success criterion.

## Question 7
Besides emission geometry, should particle properties also change (size, lifetime, fade curve, gravity influence), or should we only change trajectory distribution to achieve the chrysanthemum look?

### Answer 7
Final decision: Use whichever combination is needed (geometry and/or particle-property tuning), with priority on achieving an accurate chrysanthemum look rather than minimizing scope of visual adjustments.

## Question 8
Do you want one universal chrysanthemum preset, or multiple selectable burst styles (e.g., standard chrysanthemum, dense chrysanthemum, ringed chrysanthemum) via debug controls while defaulting to one style in gameplay?

### Answer 8
Final decision: Use one universal chrysanthemum preset for all fireworks.

## Question 9
Any constraints on rollout safety? For example, should we keep a temporary fallback debug toggle to old burst behavior during tuning/testing, or replace old behavior outright with no fallback?

### Answer 9
Final decision: Replace old burst behavior outright with no fallback mode.

## Question 10
Do you feel requirements clarification is complete, or do you want to answer more questions before we move to research planning?

