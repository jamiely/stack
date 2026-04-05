export interface CharacterAnimationForwardingPath {
  runRafStep(deltaSeconds: number): void;
  stepSimulation(steps?: number): void;
}

export interface CharacterAnimationForwardingPathOptions {
  runSimulationStep(deltaSeconds: number): void;
  fixedStepSeconds: number;
}

export function createCharacterAnimationForwardingPath(
  options: CharacterAnimationForwardingPathOptions,
): CharacterAnimationForwardingPath {
  const forwardSimulationStep = (deltaSeconds: number): void => {
    options.runSimulationStep(deltaSeconds);
  };

  return {
    runRafStep(deltaSeconds: number): void {
      forwardSimulationStep(deltaSeconds);
    },
    stepSimulation(steps = 1): void {
      for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
        forwardSimulationStep(options.fixedStepSeconds);
      }
    },
  };
}
