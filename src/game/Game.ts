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
  WebGLRenderer,
} from "three";
import { clampDebugConfig, defaultDebugConfig } from "./debugConfig";
import { advanceOscillation, getAxisPosition } from "./logic/oscillation";
import type { DebugConfig, GameState } from "./types";
import type { OscillationState } from "./logic/oscillation";

type DebugNumberKey = Exclude<keyof DebugConfig, "gridVisible">;

const DEBUG_RANGES: Record<DebugNumberKey, { min: number; max: number; step: number; label: string }> = {
  cameraHeight: { min: 4, max: 20, step: 0.25, label: "Camera Height" },
  cameraDistance: { min: 7, max: 24, step: 0.25, label: "Camera Distance" },
  cameraLerp: { min: 0.02, max: 0.25, step: 0.01, label: "Camera Lerp" },
  motionRange: { min: 1, max: 10, step: 0.25, label: "Motion Range" },
  motionSpeed: { min: 0.2, max: 3, step: 0.05, label: "Motion Speed" },
};

export class Game {
  private readonly container: HTMLDivElement;
  private readonly shell: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: HTMLDivElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly heightValue: HTMLSpanElement;
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
  private readonly activeSlab: Mesh;
  private readonly gridHelper = new GridHelper(28, 28, 0xd8b162, 0x28425f);

  private debugConfig: DebugConfig = defaultDebugConfig;
  private lastFrameTime = 0;
  private gameState: GameState = "idle";
  private score = 0;
  private height = 3;
  private oscillation: OscillationState = {
    axis: "x" as const,
    offset: 0,
    direction: 1 as const,
  };

  public constructor(container: HTMLDivElement) {
    this.container = container;
    this.shell = document.createElement("div");
    this.shell.className = "game-shell";

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

    this.overlayTitle = document.createElement("h1");
    this.overlayBody = document.createElement("p");
    this.primaryButton = document.createElement("button");
    this.secondaryButton = document.createElement("button");
    this.debugPanel = document.createElement("div");
    this.rendererStatus = document.createElement("p");

    this.renderer = this.createRenderer();

    const slabGeometry = new BoxGeometry(4, 1, 4);
    const slabMaterial = new MeshStandardMaterial({ color: "#f7d27e", metalness: 0.15, roughness: 0.85 });
    this.activeSlab = new Mesh(slabGeometry, slabMaterial);

    this.scene.background = new Color("#07101c");
    this.buildScene();
    this.buildHud();
  }

  public mount(): void {
    this.container.replaceChildren(this.shell);
    this.shell.append(this.canvas, this.hud);
    this.updateMetrics();
    this.applyDebugConfig(this.debugConfig);
    this.renderHud();
    window.requestAnimationFrame(this.tick);
    window.addEventListener("resize", this.handleResize);
  }

  private buildScene(): void {
    this.camera.position.set(8, this.debugConfig.cameraHeight, this.debugConfig.cameraDistance);

    this.scene.add(this.stackGroup);
    this.scene.add(this.gridHelper);

    const ambientLight = new AmbientLight(0xffffff, 1.8);
    const directionalLight = new DirectionalLight(0xfff0c8, 2.2);
    directionalLight.position.set(10, 18, 12);

    this.scene.add(ambientLight, directionalLight);

    for (let index = 0; index < 3; index += 1) {
      const slab = this.activeSlab.clone();
      slab.position.y = index;
      slab.position.x = index % 2 === 0 ? 0 : 0.12;
      slab.material = new MeshStandardMaterial({
        color: index === 2 ? "#87d5ff" : "#f7d27e",
        metalness: 0.15,
        roughness: 0.85,
      });
      this.stackGroup.add(slab);
    }

    this.activeSlab.position.set(0, 3, 0);
    this.activeSlab.material = new MeshStandardMaterial({
      color: "#ff9360",
      emissive: "#25110a",
      metalness: 0.1,
      roughness: 0.78,
    });
    this.scene.add(this.activeSlab);
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
    `;

    const cards = topbar.querySelectorAll(".hud__card");
    cards[0]?.append(this.scoreValue);
    cards[1]?.append(this.heightValue);

    const overlay = document.createElement("section");
    overlay.className = "overlay";
    overlay.dataset.testid = "menu-overlay";

    this.primaryButton.className = "button button--primary";
    this.primaryButton.dataset.testid = "start-button";
    this.primaryButton.type = "button";
    this.primaryButton.addEventListener("click", this.handlePrimaryAction);

    this.secondaryButton.className = "button button--secondary";
    this.secondaryButton.type = "button";
    this.secondaryButton.textContent = "Pause Motion";
    this.secondaryButton.addEventListener("click", this.handleSecondaryAction);

    const actions = document.createElement("div");
    actions.className = "overlay__actions";
    actions.append(this.primaryButton, this.secondaryButton);

    this.rendererStatus.className = "overlay__status";

    overlay.append(this.overlayTitle, this.overlayBody, this.rendererStatus, actions);

    this.debugPanel.className = "debug-panel";
    this.debugPanel.dataset.testid = "debug-panel";
    this.debugPanel.append(this.createDebugControls());

    this.hud.append(topbar, this.debugPanel, overlay);
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
          this.applyDebugConfig({
            ...this.debugConfig,
            [key]: Number(input.value),
          });
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
    this.gameState = this.gameState === "idle" ? "playing" : "idle";
    this.score = this.gameState === "playing" ? 1 : 0;
    this.renderHud();
  };

  private readonly handleSecondaryAction = (): void => {
    if (this.gameState === "playing") {
      this.gameState = "idle";
      this.score = 0;
    } else {
      this.oscillation = {
        axis: this.oscillation.axis === "x" ? "z" : "x",
        offset: 0,
        direction: 1,
      };
    }
    this.renderHud();
  };

  private readonly handleResize = (): void => {
    this.updateMetrics();
  };

  private readonly tick = (timestamp: number): void => {
    const deltaSeconds = this.lastFrameTime === 0 ? 0 : (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    if (this.gameState === "playing") {
      this.oscillation = advanceOscillation(
        this.oscillation,
        deltaSeconds,
        this.debugConfig.motionSpeed,
        this.debugConfig.motionRange,
      );
      const position = getAxisPosition(this.oscillation.axis, this.oscillation.offset);
      this.activeSlab.position.x = position.x;
      this.activeSlab.position.z = position.z;
    }

    this.camera.position.lerp(
      {
        x: 8,
        y: this.debugConfig.cameraHeight,
        z: this.debugConfig.cameraDistance,
      } as typeof this.camera.position,
      this.debugConfig.cameraLerp,
    );
    this.camera.lookAt(0, 1.4, 0);
    this.renderer?.render(this.scene, this.camera);
    window.requestAnimationFrame(this.tick);
  };

  private updateMetrics(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height, false);
  }

  private applyDebugConfig(config: DebugConfig): void {
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
  }

  private renderHud(): void {
    this.scoreValue.textContent = String(this.score);
    this.heightValue.textContent = `${this.height} floors`;

    if (this.gameState === "playing") {
      this.overlayTitle.textContent = "Prototype In Motion";
      this.overlayBody.textContent =
        "Milestone one is live: the shell, camera, renderer, input surface, and runtime debug panel are wired. Core stop-and-trim gameplay lands next.";
      this.rendererStatus.textContent = this.renderer
        ? "Renderer: WebGL active."
        : "Renderer: fallback mode active because WebGL is unavailable in this browser.";
      this.primaryButton.textContent = "Return To Title";
      this.secondaryButton.textContent = "Reset Axis";
    } else {
      this.overlayTitle.textContent = "Tower Stacker";
      this.overlayBody.textContent =
        "Desktop-first prototype scaffold with touch-ready controls, a live Three.js scene, and the first debug controls for camera and slab motion.";
      this.rendererStatus.textContent = this.renderer
        ? "Renderer: WebGL active."
        : "Renderer: fallback mode active because WebGL is unavailable in this browser.";
      this.primaryButton.textContent = "Start Prototype";
      this.secondaryButton.textContent = "Swap Axis Preview";
    }

    this.debugPanel.querySelectorAll<HTMLElement>("[data-debug-value]").forEach((node) => {
      const key = node.dataset.debugValue as DebugNumberKey | undefined;
      if (!key) {
        return;
      }
      node.textContent = `${this.debugConfig[key].toFixed(2)}`;
    });
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
