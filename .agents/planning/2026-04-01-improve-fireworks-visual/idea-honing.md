# Idea Honing

## Question 1
What does “improve the fireworks visual” mean for you in concrete terms—e.g., more realistic explosions, more colorful effects, smoother animation, better performance, reduced visual clutter, or something else?

## Answer 1
Enhance both look and behavior:
1. Fireworks should behave more like a chrysanthemum firework.
2. Firework placement should be more varied, appearing in different positions behind the stack.

## Question 2
For the chrysanthemum behavior, which characteristics matter most: (a) spherical burst shape, (b) longer particle trails, (c) slower expansion then fade, (d) color transitions, (e) occasional crackle/sparkle, or a specific combination?

## Answer 2
a and b are most important:
- spherical burst shape
- longer particle trails

## Question 3
For varied placement behind the stack, do you want launches to be fully random across the whole background, or constrained to a specific horizontal range (for example: mostly centered behind the tower, but with some spread to left/right)?

## Answer 3
Fully random across the whole background.

## Question 4
Do you want to keep the current number/frequency of fireworks, or increase/decrease how often they launch?

## Answer 4
Increased launch frequency/count.

## Question 5
Any constraints on performance or device targets (for example: must stay smooth on lower-end laptops/mobile), or is visual quality the priority even if effects are heavier?

## Answer 5
Performance is important: it should stay smooth on lower-end devices/laptops.

## Question 6
Should fireworks keep the current color palette, or do you want a specific palette/style (for example: vivid multicolor, warmer gold-heavy tones, etc.)?

## Answer 6
Vivid multicolor palette.

## Question 7
For the increased firework activity, do you want frequent single bursts, or occasional small clusters (2–4 fireworks close in time) while still keeping performance smooth?

## Answer 7
Desired sequence/behavior:
- Firework launches upward from some location.
- It follows a slight arc.
- It performs a primary burst.
- The primary burst emits smaller secondary sparks/bursts.
- Those smaller sparks drift downward a bit before fading.

## Question 8
Should every firework follow this multi-stage sequence, or should this be the dominant pattern with occasional simpler bursts mixed in for variety/performance?

## Answer 8
Every firework should use this multi-stage sequence.

## Question 9
Do you want runtime debug controls for tuning this effect (e.g., launch arc amount, primary burst size, secondary spark count, fade duration, and spawn rate), so visuals can be adjusted without code changes?

## Answer 9
Yes, add runtime debug controls for tuning the firework behavior.

## Question 10
What should success look like for this change? For example: “visually obvious chrysanthemum effect,” “more dynamic background placement,” and any measurable guardrails like maintaining stable frame rate.

## Answer 10
Success criteria:
- The effect is visibly chrysanthemum-like.
- Placement is visibly more dynamic/varied behind the stack.
- Performance remains stable/smooth.

## Question 11
Do you feel requirements clarification is complete, or do you want to refine anything else before we continue? We can also switch to research if you want to validate technical approaches first.

## Answer 11
User note: it is acceptable to fully replace the existing fireworks implementation if that yields a better result.

## Question 12
Should I consider requirements clarification complete now and move to a research plan, or do you want more requirement refinement first?

## Answer 12
Yes — requirements clarification is complete; proceed to research planning.

