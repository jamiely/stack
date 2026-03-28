import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { clampDebugConfig, defaultDebugConfig } from "./debugConfig";
import { advanceOscillation } from "./logic/oscillation";
import { createInitialStack, getTravelSpeed, resolvePlacement, spawnActiveSlab } from "./logic/stack";
import type { OscillationState } from "./logic/oscillation";
import type { DebugConfig, GameState, PublicGameState, SlabData, TestApi, TestModeOptions } from "./types";

type DebugNumberKey = Exclude<keyof DebugConfig, "gridVisible">;

interface DebrisPiece {
  mesh: Mesh;
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  remainingLifetime: number;
}

const DEBUG_RANGES: Record<DebugNumberKey, { min: number; max: number; step: number; label: string }> = {
  cameraHeight: { min: 4, max: 20, step: 0.25, label: "Camera Height" },
  cameraDistance: { min: 7, max: 24, step: 0.25, label: "Camera Distance" },
  cameraLerp: { min: 0.02, max: 0.25, step: 0.01, label: "Camera Lerp" },
  baseWidth: { min: 2, max: 8, step: 0.25, label: "Base Width" },
  baseDepth: { min: 2, max: 8, step: 0.25, label: "Base Depth" },
  slabHeight: { min: 0.5, max: 2, step: 0.1, label: "Slab Height" },
  motionRange: { min: 1, max: 10, step: 0.25, label: "Motion Range" },
  motionSpeed: { min: 0.4, max: 5, step: 0.05, label: "Move Speed" },
  speedRamp: { min: 0, max: 0.8, step: 0.02, label: "Speed Ramp" },
  perfectTolerance: { min: 0, max: 0.5, step: 0.01, label: "Perfect Window" },
  prebuiltLevels: { min: 1, max: 8, step: 1, label: "Starting Stack" },
  debrisLifetime: { min: 0.4, max: 4, step: 0.05, label: "Debris Lifetime" },
};

const CAMERA_X = 8;
const FIXED_STEP_DEFAULT_SECONDS = 1 / 60;

declare global {
  interface Window {
    __towerStackerTestApi?: TestApi;
  }
}

function readTestModeOptions(search: string): TestModeOptions {
  const params = new URLSearchParams(search);
  const enabled = params.has("test") || params.has("testMode");
  const startPaused = enabled && params.get("paused") !== "0";
  const stepParam = Number(params.get("step"));
  const fixedStepSeconds =
    Number.isFinite(stepParam) && stepParam > 0 && stepParam <= 0.25 ? stepParam : FIXED_STEP_DEFAULT_SECONDS;

  return {
    enabled,
    startPaused,
    fixedStepSeconds,
  };
}

export class Game {
  private readonly debugEnabled: boolean;
  private readonly testMode: TestModeOptions;
  private simulationPaused = false;

  private readonly container: HTMLDivElement;
  private readonly shell: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: HTMLDivElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly heightValue: HTMLSpanElement;
  private readonly messageValue: HTMLSpanElement;
  private readonly overlayTitle: HTMLHeadingElement;
  private readonly overlayBody: HTMLParagraphElement;
  private readonly primaryButton: HTMLButtonElement;
  private readonly secondaryButton: HTMLButtonElement;
  private readonly debugPanel: HTMLDivElement;
  private readonly rendererStatus: HTMLParagraphElement;

  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly renderer: WebGLRenderer | null;
  private readonly stackGroup = new Group();
  private readonly debrisGroup = new Group();
  private readonly gridHelper = new GridHelper(28, 28, 0xd8b162, 0x28425f);

  private debugConfig: DebugConfig = defaultDebugConfig;
  private landedSlabs: SlabData[] = [];
  private activeSlab: SlabData | null = null;
  private activeMesh: Mesh | null = null;
  private debrisPieces: DebrisPiece[] = [];
  private oscillation: OscillationState | null = null;
  private lastFrameTime = 0;
  private gameState: GameState = "idle";
  private score = 0;
  private statusMessage = "Line up the moving slab and keep the tower alive.";

  public constructor(container: HTMLDivElement) {
    this.container = container;
    const query = window.location.search;
    this.debugEnabled = new URLSearchParams(query).has("debug");
    this.testMode = readTestModeOptions(query);
    this.simulationPaused = this.testMode.enabled && this.testMode.startPaused;

    this.shell = document.createElement("div");
    this.shell.className = "game-shell";
    this.shell.dataset.testMode = this.testMode.enabled ? "on" : "off";
    this.shell.addEventListener("pointerdown", this.handlePointerStop);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";

    this.hud = document.createElement("div");
    this.hud.className = "hud";

    this.scoreValue = document.createElement("span");
    this.scoreValue.className = "hud__value";
    this.scoreValue.dataset.testid = "score-value";

    this.heightValue = document.createElement("span");
    this.heightValue.className = "hud__value";
    this.heightValue.dataset.testid = "height-value";

    this.messageValue = document.createElement("span");
    this.messageValue.className = "hud__message";
    this.messageValue.dataset.testid = "status-message";

    this.overlayTitle = document.createElement("h1");
    this.overlayTitle.dataset.testid = "overlay-title";
    this.overlayBody = document.createElement("p");
    this.overlayBody.dataset.testid = "overlay-body";
    this.primaryButton = document.createElement("button");
    this.secondaryButton = document.createElement("button");
    this.debugPanel = document.createElement("div");
    this.rendererStatus = document.createElement("p");

    this.renderer = this.createRenderer();

    this.scene.background = new Color("#07101c");
    this.buildScene();
    this.buildHud();
    this.resetWorld();
  }

  public mount(): void {
    this.container.replaceChildren(this.shell);
    this.shell.append(this.canvas, this.hud);
    this.updateMetrics();
    this.applyDebugConfig(this.debugConfig);
    this.renderHud();
    window.requestAnimationFrame(this.tick);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);

    if (this.testMode.enabled) {
      window.__towerStackerTestApi = this.createTestApi();
    }
  }

  private buildScene(): void {
    this.camera.position.set(CAMERA_X, this.debugConfig.cameraHeight, this.debugConfig.cameraDistance);
    this.scene.add(this.stackGroup, this.debrisGroup, this.gridHelper);

    const ambientLight = new AmbientLight(0xffffff, 1.8);
    const directionalLight = new DirectionalLight(0xfff0c8, 2.2);
    directionalLight.position.set(10, 18, 12);
    this.scene.add(ambientLight, directionalLight);
  }

  private buildHud(): void {
    const topbar = document.createElement("div");
    topbar.className = "hud__topbar";
    topbar.innerHTML = `
      <div class="hud__card">
        <span class="hud__label">Score</span>
      </div>
      <div class="hud__card">
        <span class="hud__label">Height</span>
      </div>
      <div class="hud__card hud__card--wide">
        <span class="hud__label">Status</span>
      </div>
    `;

    const cards = topbar.querySelectorAll(".hud__card");
    cards[0]?.append(this.scoreValue);
    cards[1]?.append(this.heightValue);
    cards[2]?.append(this.messageValue);

    const overlay = document.createElement("section");
    overlay.className = "overlay";
    overlay.dataset.testid = "menu-overlay";

    this.primaryButton.className = "button button--primary";
    this.primaryButton.dataset.testid = "start-button";
    this.primaryButton.type = "button";
    this.primaryButton.addEventListener("click", this.handlePrimaryAction);

    this.secondaryButton.className = "button button--secondary";
    this.secondaryButton.dataset.testid = "secondary-button";
    this.secondaryButton.type = "button";
    this.secondaryButton.addEventListener("click", this.handleSecondaryAction);

    const actions = document.createElement("div");
    actions.className = "overlay__actions";
    actions.append(this.primaryButton, this.secondaryButton);

    this.rendererStatus.className = "overlay__status";

    overlay.append(this.overlayTitle, this.overlayBody, this.rendererStatus, actions);

    this.debugPanel.className = "debug-panel";
    this.debugPanel.dataset.testid = "debug-panel";
    this.debugPanel.append(this.createDebugControls());

    this.hud.append(topbar, overlay);
    if (this.debugEnabled) {
      this.hud.append(this.debugPanel);
    }
  }

  private createDebugControls(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const title = document.createElement("h2");
    title.textContent = "Runtime Debug";
    fragment.append(title);

    (Object.entries(DEBUG_RANGES) as [DebugNumberKey, (typeof DEBUG_RANGES)[DebugNumberKey]][]).forEach(
      ([key, meta]) => {
        const label = document.createElement("label");
        const row = document.createElement("div");
        row.className = "debug-panel__row";

        const value = document.createElement("span");
        value.dataset.debugValue = key;

        const name = document.createElement("span");
        name.textContent = meta.label;
        row.append(name, value);

        const input = document.createElement("input");
        input.type = "range";
        input.min = String(meta.min);
        input.max = String(meta.max);
        input.step = String(meta.step);
        input.value = String(this.debugConfig[key]);
        input.dataset.debugKey = key;
        input.addEventListener("input", () => {
          const nextConfig = {
            ...this.debugConfig,
            [key]: key === "prebuiltLevels" ? Math.round(Number(input.value)) : Number(input.value),
          };
          this.applyDebugConfig(nextConfig);
          this.renderHud();
        });

        label.append(row, input);
        fragment.append(label);
      },
    );

    const toggleLabel = document.createElement("label");
    toggleLabel.textContent = "Grid Visible";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = this.debugConfig.gridVisible;
    toggle.dataset.debugKey = "gridVisible";
    toggle.addEventListener("change", () => {
      this.applyDebugConfig({
        ...this.debugConfig,
        gridVisible: toggle.checked,
      });
      this.renderHud();
    });

    toggleLabel.append(toggle);
    fragment.append(toggleLabel);
    return fragment;
  }

  private readonly handlePrimaryAction = (): void => {
    if (this.gameState === "playing") {
      this.returnToTitle();
      return;
    }

    this.startGame();
  };

  private readonly handleSecondaryAction = (): void => {
    if (this.gameState === "game_over") {
      this.startGame();
      return;
    }

    this.resetWorld();
    this.renderHud();
  };

  private readonly handleResize = (): void => {
    this.updateMetrics();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "Space" && event.code !== "Enter") {
      return;
    }

    if (event.target instanceof HTMLElement) {
      const tagName = event.target.tagName;
      if (tagName === "INPUT" || tagName === "BUTTON") {
        return;
      }
    }

    event.preventDefault();

    if (this.gameState === "playing") {
      this.stopActiveSlab();
      return;
    }

    if (this.gameState === "idle") {
      this.startGame();
    }
  };

  private readonly handlePointerStop = (event: PointerEvent): void => {
    if (this.gameState !== "playing") {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest(".overlay, .debug-panel")) {
      return;
    }

    this.stopActiveSlab();
  };

  private readonly tick = (timestamp: number): void => {
    const deltaSeconds = this.lastFrameTime === 0 ? 0 : (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    if (!this.simulationPaused) {
      this.runSimulationStep(deltaSeconds);
    } else {
      this.updateCamera();
    }

    this.renderer?.render(this.scene, this.camera);
    window.requestAnimationFrame(this.tick);
  };

  private runSimulationStep(deltaSeconds: number): void {
    this.updateActiveSlab(deltaSeconds);
    this.updateDebris(deltaSeconds);
    this.updateCamera();
  }

  private startGame(): void {
    this.resetWorld();
    this.gameState = "playing";
    this.spawnNextActive();
    this.statusMessage = "Press space, enter, click, or tap to drop the slab.";
    this.renderHud();
  }

  private returnToTitle(): void {
    this.gameState = "idle";
    this.statusMessage = "Adjust the starting stack or timing window, then start a new run.";
    this.resetWorld();
    this.renderHud();
  }

  private resetWorld(): void {
    this.lastFrameTime = 0;
    this.score = 0;
    this.clearGroup(this.stackGroup);
    this.clearGroup(this.debrisGroup);
    this.debrisPieces = [];
    this.activeMesh = null;
    this.activeSlab = null;
    this.oscillation = null;
    this.landedSlabs = createInitialStack(this.debugConfig);

    this.landedSlabs.forEach((slab) => {
      this.stackGroup.add(this.createSlabMesh(slab, false));
    });
  }

  private spawnNextActive(): void {
    const target = this.landedSlabs[this.landedSlabs.length - 1];
    if (!target) {
      return;
    }

    const activeSlab = spawnActiveSlab(target, this.debugConfig);
    this.activeSlab = activeSlab;
    this.oscillation = {
      axis: activeSlab.axis,
      offset: -this.debugConfig.motionRange,
      direction: 1,
    };

    if (this.activeMesh) {
      this.scene.remove(this.activeMesh);
    }

    this.activeMesh = this.createSlabMesh(activeSlab, true);
    this.scene.add(this.activeMesh);
  }

  private stopActiveSlab(): void {
    if (this.gameState !== "playing" || !this.activeSlab || !this.activeMesh) {
      return;
    }

    const target = this.landedSlabs[this.landedSlabs.length - 1];
    if (!target) {
      return;
    }

    const result = resolvePlacement(this.activeSlab, target, this.debugConfig.perfectTolerance);
    this.scene.remove(this.activeMesh);

    if (result.outcome === "miss") {
      this.spawnDebris(this.activeSlab, this.activeSlab.axis, true);
      this.activeSlab = null;
      this.activeMesh = null;
      this.oscillation = null;
      this.gameState = "game_over";
      this.statusMessage = "Missed the tower. Restart and try to recover your rhythm.";
      this.renderHud();
      return;
    }

    if (!result.landedSlab) {
      return;
    }

    if (result.debrisSlab) {
      this.spawnDebris(result.debrisSlab, result.landedSlab.axis, false);
    }

    this.landedSlabs.push(result.landedSlab);
    this.stackGroup.add(this.createSlabMesh(result.landedSlab, false));
    this.score += 1;
    this.statusMessage =
      result.outcome === "perfect"
        ? "Perfect alignment. Width preserved."
        : `Trimmed ${result.trimmedSize.toFixed(2)} units off the ${result.landedSlab.axis.toUpperCase()} axis.`;

    this.activeSlab = null;
    this.activeMesh = null;
    this.oscillation = null;
    this.spawnNextActive();
    this.renderHud();
  }

  private updateActiveSlab(deltaSeconds: number): void {
    if (this.gameState !== "playing" || !this.activeSlab || !this.activeMesh || !this.oscillation) {
      return;
    }

    this.oscillation = advanceOscillation(
      this.oscillation,
      deltaSeconds,
      getTravelSpeed(this.activeSlab.level, this.debugConfig),
      this.debugConfig.motionRange,
    );

    if (this.oscillation.axis === "x") {
      this.activeSlab.position.x = this.oscillation.offset;
      this.activeMesh.position.x = this.oscillation.offset;
    } else {
      this.activeSlab.position.z = this.oscillation.offset;
      this.activeMesh.position.z = this.oscillation.offset;
    }
  }

  private updateDebris(deltaSeconds: number): void {
    if (this.debrisPieces.length === 0) {
      return;
    }

    const gravity = 12;
    this.debrisPieces = this.debrisPieces.filter((piece) => {
      piece.remainingLifetime -= deltaSeconds;
      piece.velocity.y -= gravity * deltaSeconds;
      piece.mesh.position.x += piece.velocity.x * deltaSeconds;
      piece.mesh.position.y += piece.velocity.y * deltaSeconds;
      piece.mesh.position.z += piece.velocity.z * deltaSeconds;
      piece.mesh.rotation.x += piece.angularVelocity.x * deltaSeconds;
      piece.mesh.rotation.y += piece.angularVelocity.y * deltaSeconds;
      piece.mesh.rotation.z += piece.angularVelocity.z * deltaSeconds;

      const stillVisible = piece.remainingLifetime > 0 && piece.mesh.position.y > -12;
      if (!stillVisible) {
        this.debrisGroup.remove(piece.mesh);
      }
      return stillVisible;
    });
  }

  private updateCamera(): void {
    const targetSlab = this.activeSlab ?? this.landedSlabs[this.landedSlabs.length - 1];
    const targetY = (targetSlab?.position.y ?? 0) + this.debugConfig.cameraHeight;
    const targetZ = this.debugConfig.cameraDistance;

    this.camera.position.lerp(
      new Vector3(CAMERA_X, targetY, targetZ),
      this.debugConfig.cameraLerp,
    );
    this.camera.lookAt(0, Math.max(1.4, targetY - this.debugConfig.cameraHeight + 0.5), 0);
  }

  private updateMetrics(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height, false);
  }

  private applyDebugConfig(config: DebugConfig): void {
    const previousConfig = this.debugConfig;
    this.debugConfig = clampDebugConfig(config);
    this.gridHelper.visible = this.debugConfig.gridVisible;

    this.debugPanel.querySelectorAll<HTMLInputElement>("[data-debug-key]").forEach((input) => {
      const key = input.dataset.debugKey as keyof DebugConfig | undefined;
      if (!key) {
        return;
      }

      if (input.type === "checkbox") {
        input.checked = this.debugConfig.gridVisible;
      } else {
        input.value = String(this.debugConfig[key] as number);
      }
    });

    const requiresReset =
      previousConfig.baseWidth !== this.debugConfig.baseWidth ||
      previousConfig.baseDepth !== this.debugConfig.baseDepth ||
      previousConfig.slabHeight !== this.debugConfig.slabHeight ||
      previousConfig.prebuiltLevels !== this.debugConfig.prebuiltLevels;

    if (requiresReset && this.gameState !== "playing") {
      this.resetWorld();
    }
  }

  private renderHud(): void {
    const overlay = this.hud.querySelector<HTMLElement>(".overlay");
    this.scoreValue.textContent = String(this.score);
    this.heightValue.textContent = `${this.landedSlabs.length} floors`;
    this.messageValue.textContent = this.statusMessage;

    if (this.gameState === "playing") {
      this.overlayTitle.textContent = "Tower Live";
      this.overlayBody.textContent =
        "Stop each moving slab before it misses. Perfect placements preserve the footprint; partial overlaps trim it permanently.";
      this.primaryButton.textContent = "Return To Title";
      this.secondaryButton.textContent = "Reset Stack";
      overlay?.classList.add("overlay--hidden");
    } else if (this.gameState === "game_over") {
      this.overlayTitle.textContent = "Tower Fell";
      this.overlayBody.textContent =
        "The moving slab missed the target. Restart the run or adjust the debug tuning for a different difficulty curve.";
      this.primaryButton.textContent = "Restart Run";
      this.secondaryButton.textContent = "Rebuild Stack";
      overlay?.classList.remove("overlay--hidden");
    } else {
      this.overlayTitle.textContent = "Tower Stacker";
      this.overlayBody.textContent =
        "Playable milestone: alternating X/Z movement, permanent trimming, camera follow, falling debris, and live gameplay tuning are active.";
      this.primaryButton.textContent = "Start Run";
      this.secondaryButton.textContent = "Rebuild Stack";
      overlay?.classList.remove("overlay--hidden");
    }

    this.rendererStatus.textContent = this.renderer
      ? "Renderer: WebGL active."
      : "Renderer: fallback mode active because WebGL is unavailable in this browser.";

    this.debugPanel.querySelectorAll<HTMLElement>("[data-debug-value]").forEach((node) => {
      const key = node.dataset.debugValue as DebugNumberKey | undefined;
      if (!key) {
        return;
      }

      node.textContent =
        key === "prebuiltLevels" ? String(this.debugConfig[key]) : `${this.debugConfig[key].toFixed(2)}`;
    });
  }

  private createTestApi(): TestApi {
    return {
      startGame: () => this.startGame(),
      stopActiveSlab: () => this.stopActiveSlab(),
      restartGame: () => this.startGame(),
      returnToTitle: () => this.returnToTitle(),
      applyDebugConfig: (config) => {
        this.applyDebugConfig(config);
        this.renderHud();
      },
      stepSimulation: (steps = 1) => {
        const clampedSteps = Math.max(1, Math.floor(steps));
        for (let index = 0; index < clampedSteps; index += 1) {
          this.runSimulationStep(this.testMode.fixedStepSeconds);
        }
        this.renderer?.render(this.scene, this.camera);
      },
      setPaused: (paused) => {
        this.simulationPaused = paused;
        this.renderHud();
      },
      setActiveOffset: (offset) => {
        if (!this.activeSlab || !this.activeMesh) {
          return false;
        }

        if (this.activeSlab.axis === "x") {
          this.activeSlab.position.x = offset;
          this.activeMesh.position.x = offset;
        } else {
          this.activeSlab.position.z = offset;
          this.activeMesh.position.z = offset;
        }

        if (this.oscillation) {
          this.oscillation.offset = offset;
        }

        return true;
      },
      getState: () => this.getPublicState(),
    };
  }

  private getPublicState(): PublicGameState {
    return {
      gameState: this.gameState,
      score: this.score,
      height: this.landedSlabs.length,
      activeAxis: this.activeSlab?.axis ?? null,
      activePosition: this.activeSlab
        ? {
            x: this.activeSlab.position.x,
            y: this.activeSlab.position.y,
            z: this.activeSlab.position.z,
          }
        : null,
      debugConfig: { ...this.debugConfig },
    };
  }

  private createSlabMesh(slab: SlabData, _isTop: boolean): Mesh {
    const geometry = new BoxGeometry(slab.dimensions.width, slab.dimensions.height, slab.dimensions.depth);
    const material = new MeshStandardMaterial({
      color: this.getSlabColor(slab.level),
      emissive: this.getSlabEmissive(slab.level),
      metalness: 0.12,
      roughness: 0.82,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(slab.position.x, slab.position.y, slab.position.z);
    return mesh;
  }

  private getSlabColor(level: number): string {
    const hue = (42 + level * 31) % 360;
    return new Color().setHSL(hue / 360, 0.72, 0.67).getStyle();
  }

  private getSlabEmissive(level: number): string {
    const hue = (42 + level * 31) % 360;
    return new Color().setHSL(hue / 360, 0.58, 0.16).getStyle();
  }

  private spawnDebris(slab: SlabData, axis: SlabData["axis"], fullMiss: boolean): void {
    const mesh = this.createSlabMesh(slab, false);
    this.debrisGroup.add(mesh);

    const lateral = fullMiss ? 4.4 : 2.7;
    const xVelocity = axis === "x" ? Math.sign(slab.position.x || 1) * lateral : 0.4;
    const zVelocity = axis === "z" ? Math.sign(slab.position.z || 1) * lateral : 0.4;

    this.debrisPieces.push({
      mesh,
      velocity: { x: xVelocity, y: 1.8, z: zVelocity },
      angularVelocity: { x: 1.4, y: 2.2, z: 1.1 },
      remainingLifetime: this.debugConfig.debrisLifetime,
    });
  }

  private clearGroup(group: Group): void {
    while (group.children.length > 0) {
      group.remove(group.children[0]!);
    }
  }

  private createRenderer(): WebGLRenderer | null {
    try {
      const renderer = new WebGLRenderer({
        antialias: true,
        canvas: this.canvas,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(new Color("#07101c"));
      return renderer;
    } catch (error) {
      console.warn("WebGL renderer unavailable; continuing in fallback mode.", error);
      this.canvas.dataset.renderer = "fallback";
      return null;
    }
  }
}
