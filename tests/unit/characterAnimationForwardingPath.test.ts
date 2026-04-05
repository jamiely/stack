import { describe, expect, it, vi } from "vitest";
import { createCharacterAnimationForwardingPath } from "../../src/game/logic/characterAnimationForwardingPath";

describe("character animation forwarding path", () => {
  it("forwards exactly one simulation step for each RAF tick", () => {
    const runSimulationStep = vi.fn<(deltaSeconds: number) => void>();
    const path = createCharacterAnimationForwardingPath({
      runSimulationStep,
      fixedStepSeconds: 1 / 60,
    });

    path.runRafStep(0.25);

    expect(runSimulationStep).toHaveBeenCalledTimes(1);
    expect(runSimulationStep).toHaveBeenCalledWith(0.25);
  });

  it("forwards exactly N simulation steps for N manual test steps", () => {
    const runSimulationStep = vi.fn<(deltaSeconds: number) => void>();
    const path = createCharacterAnimationForwardingPath({
      runSimulationStep,
      fixedStepSeconds: 1 / 120,
    });

    path.stepSimulation(3);

    expect(runSimulationStep).toHaveBeenCalledTimes(3);
    expect(runSimulationStep).toHaveBeenNthCalledWith(1, 1 / 120);
    expect(runSimulationStep).toHaveBeenNthCalledWith(2, 1 / 120);
    expect(runSimulationStep).toHaveBeenNthCalledWith(3, 1 / 120);
  });

  it("uses the same shared simulation-step function for RAF and manual stepping", () => {
    const runSimulationStep = vi.fn<(deltaSeconds: number) => void>();
    const path = createCharacterAnimationForwardingPath({
      runSimulationStep,
      fixedStepSeconds: 1 / 30,
    });

    path.runRafStep(0.5);
    path.stepSimulation(2);

    expect(runSimulationStep).toHaveBeenCalledTimes(3);
    expect(runSimulationStep).toHaveBeenNthCalledWith(1, 0.5);
    expect(runSimulationStep).toHaveBeenNthCalledWith(2, 1 / 30);
    expect(runSimulationStep).toHaveBeenNthCalledWith(3, 1 / 30);
  });
});
