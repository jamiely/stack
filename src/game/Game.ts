import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Object3D,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { clampDebugConfig, defaultDebugConfig } from "./debugConfig";
import { FeedbackManager } from "./FeedbackManager";
import { getFailureFeedbackPlan, getPlacementFeedbackPlan } from "./logic/feedback";
import { advanceOscillation } from "./logic/oscillation";
import { createDistractionState, updateDistractionState } from "./logic/distractions";
import { advanceCollapseSequence, createCollapseSequence, sampleCollapseFrame } from "./logic/collapse";
import {
  collectArchivableLevels,
  getQualityScalars,
  resolveAdaptiveQualityPreset,
  selectDistractionLodTier,
  shouldUpdateForLod,
  toQualityPreset,
} from "./logic/performance";
import { resolveIntegrityTelemetry } from "./logic/integrity";
import { createSeededRandom } from "./logic/random";
import { applyPlacementRecoveryTick, createRecoveryState, getRecoverySpeedMultiplier, resolveRecoveryReward } from "./logic/recovery";
import { createComboState, updateComboState } from "./logic/streak";
import { createInitialStack, getTravelSpeed, resolvePlacement, spawnActiveSlab } from "./logic/stack";
import type { RecoveryState } from "./logic/recovery";
import type { ComboState } from "./logic/streak";
import type { DistractionChannel, DistractionSnapshot, DistractionState } from "./logic/distractions";
import type { CollapseSequenceState, CollapseTrigger } from "./logic/collapse";
import type { IntegrityTelemetry } from "./logic/integrity";
import type { OscillationState } from "./logic/oscillation";
import type { DistractionLodTier, QualityPreset } from "./logic/performance";
import type { DebugConfig, GameState, PublicGameState, SlabData, TestApi, TestModeOptions, TrimResult } from "./types";

type DebugToggleKey =
  | "gridVisible"
  | "feedbackAudioEnabled"
  | "feedbackHapticsEnabled"
  | "distractionsEnabled"
  | "distractionTentacleEnabled"
  | "distractionGorillaEnabled"
  | "distractionTremorEnabled"
  | "distractionUfoEnabled"
  | "distractionContrastEnabled"
  | "distractionCloudEnabled"
  | "performanceAutoQualityEnabled";
type DebugNumberKey = Exclude<keyof DebugConfig, DebugToggleKey>;

interface DebrisPiece {
  mesh: Mesh;
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  remainingLifetime: number;
}

interface CollapseVoxel {
  mesh: Mesh;
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  remainingLifetime: number;
}

interface PerformanceSnapshot {
  qualityPreset: QualityPreset;
  requestedPreset: QualityPreset;
  autoQualityEnabled: boolean;
  frameTimeMs: number;
  averageFrameTimeMs: number;
  frameBudgetMs: number;
  activeObjects: number;
  visibleSlabs: number;
  archivedSlabs: number;
  archivedChunks: number;
  debrisActive: number;
  debrisPooled: number;
  distractionLod: {
    gorilla: DistractionLodTier;
    ufo: DistractionLodTier;
    clouds: DistractionLodTier;
    tremor: DistractionLodTier;
  };
}

const DEBUG_RANGES: Record<DebugNumberKey, { min: number; max: number; step: number; label: string }> = {
  cameraHeight: { min: 4, max: 20, step: 0.25, label: "Camera Height" },
  cameraDistance: { min: 7, max: 24, step: 0.25, label: "Camera Distance" },
  cameraLerp: { min: 0.02, max: 0.25, step: 0.01, label: "Camera Lerp" },
  cameraFramingOffset: { min: -1.5, max: 4, step: 0.05, label: "Camera Framing Offset" },
  cameraYOffset: { min: -6, max: 6, step: 0.1, label: "Camera Y" },
  baseWidth: { min: 2, max: 8, step: 0.25, label: "Block Width" },
  baseDepth: { min: 2, max: 8, step: 0.25, label: "Block Length" },
  slabHeight: { min: 1, max: 5, step: 0.1, label: "Slab Height" },
  motionRange: { min: 1, max: 10, step: 0.25, label: "Motion Range" },
  motionSpeed: { min: 0.4, max: 5, step: 0.05, label: "Move Speed" },
  speedRamp: { min: 0, max: 0.8, step: 0.02, label: "Speed Ramp" },
  perfectTolerance: { min: 0, max: 0.5, step: 0.01, label: "Perfect Window" },
  comboTarget: { min: 2, max: 12, step: 1, label: "Combo Target" },
  recoveryGrowthMultiplier: { min: 1, max: 1.5, step: 0.01, label: "Recovery Growth" },
  recoverySlowdownFactor: { min: 0.25, max: 1, step: 0.01, label: "Recovery Slowdown" },
  recoverySlowdownPlacements: { min: 0, max: 8, step: 1, label: "Slowdown Floors" },
  distractionMotionSpeed: { min: 0.2, max: 3, step: 0.05, label: "Distraction Speed" },
  distractionTentacleStartLevel: { min: 0, max: 80, step: 1, label: "Tentacle Start" },
  distractionGorillaStartLevel: { min: 0, max: 80, step: 1, label: "Gorilla Start" },
  distractionUfoStartLevel: { min: 0, max: 100, step: 1, label: "UFO Start" },
  distractionCloudStartLevel: { min: 0, max: 120, step: 1, label: "Cloud Start" },
  integrityPrecariousThreshold: { min: 0.35, max: 0.85, step: 0.01, label: "Precarious Threshold" },
  integrityUnstableThreshold: { min: 0.45, max: 1.2, step: 0.01, label: "Unstable Threshold" },
  integrityWobbleStrength: { min: 0, max: 1.5, step: 0.01, label: "Integrity Wobble" },
  collapseDurationSeconds: { min: 0.6, max: 3, step: 0.05, label: "Collapse Duration" },
  collapseTiltStrength: { min: 0.1, max: 1.3, step: 0.01, label: "Collapse Tilt" },
  collapseCameraPullback: { min: 0, max: 12, step: 0.1, label: "Collapse Pullback" },
  collapseDropDistance: { min: 0.5, max: 8, step: 0.1, label: "Collapse Drop" },
  performanceQualityPreset: { min: 0, max: 2, step: 1, label: "Quality Preset (0-2)" },
  performanceFrameBudgetMs: { min: 10, max: 40, step: 0.1, label: "Frame Budget ms" },
  archivalKeepRecentLevels: { min: 4, max: 40, step: 1, label: "Archive Keep Levels" },
  archivalChunkSize: { min: 2, max: 16, step: 1, label: "Archive Chunk Size" },
  lodNearDistance: { min: 2, max: 24, step: 1, label: "LOD Near Distance" },
  lodFarDistance: { min: 4, max: 48, step: 1, label: "LOD Far Distance" },
  maxActiveDebris: { min: 2, max: 80, step: 1, label: "Max Active Debris" },
  debrisPoolLimit: { min: 0, max: 120, step: 1, label: "Debris Pool Limit" },
  prebuiltLevels: { min: 1, max: 12, step: 1, label: "Starting Stack" },
  debrisLifetime: { min: 0.4, max: 4, step: 0.05, label: "Debris Lifetime" },
  debrisTumbleSpeed: { min: 0.2, max: 3, step: 0.05, label: "Debris Tumble" },
  placementShakeAmount: { min: 0, max: 1.5, step: 0.01, label: "Placement Shake" },
};

const CAMERA_X = 8;
const FIXED_STEP_DEFAULT_SECONDS = 1 / 60;
const DEBUG_TOGGLE_META: Record<DebugToggleKey, { label: string }> = {
  gridVisible: { label: "Grid Visible" },
  feedbackAudioEnabled: { label: "Audio Feedback" },
  feedbackHapticsEnabled: { label: "Haptics Feedback" },
  distractionsEnabled: { label: "Distractions Enabled" },
  distractionTentacleEnabled: { label: "Tentacle Layer" },
  distractionGorillaEnabled: { label: "Gorilla Layer" },
  distractionTremorEnabled: { label: "Tremor Pulse" },
  distractionUfoEnabled: { label: "UFO Layer" },
  distractionContrastEnabled: { label: "Contrast Wash" },
  distractionCloudEnabled: { label: "Cloud Occlusion" },
  performanceAutoQualityEnabled: { label: "Auto Quality" },
};

const DEBUG_DISTRACTION_CHANNELS: DistractionChannel[] = [
  "tentacle",
  "gorilla",
  "tremor",
  "ufo",
  "contrastWash",
  "clouds",
];
const DEBUG_DISTRACTION_LAUNCH_DURATION_SECONDS = 2.5;
const UFO_ORBIT_ANGULAR_SPEED = 0.95;
const UFO_EXIT_DURATION_SECONDS = 1.15;
const UFO_MIN_EXIT_SPEED_WORLD_UNITS_PER_SECOND = 6.8;
const GORILLA_CLIMB_SPEED = 0.7;
const GORILLA_SLAM_CYCLE_SPEED = 0.62;
const GORILLA_SLAM_DURATION_SECONDS = 0.2;
const CLOUD_SWAY_DISTANCE_PX = 120;
const STACK_LOOK_AHEAD_Y = 1.05;
const STARTUP_CAMERA_LIFT = 2.2;
const STARTUP_CAMERA_LIFT_FADE_FLOORS = 10;
const PLACEMENT_SHAKE_DURATION_SECONDS = 0.16;
const COLLAPSE_VOXEL_SIZE = 0.45;
const COLLAPSE_VOXEL_LIFETIME_SECONDS = 2.2;
const COLLAPSE_VOXEL_MAX_COUNT = 560;
const DEBUG_DISTRACTION_BUTTON_META: Record<DistractionChannel, { label: string }> = {
  tentacle: { label: "Tentacle" },
  gorilla: { label: "Gorilla" },
  tremor: { label: "Tremor" },
  ufo: { label: "UFO" },
  contrastWash: { label: "Contrast" },
  clouds: { label: "Clouds" },
};

declare global {
  interface Window {
    __towerStackerTestApi?: TestApi;
  }
}

function createDistractionTimerRecord(value: number): Record<DistractionChannel, number> {
  return {
    tentacle: value,
    gorilla: value,
    tremor: value,
    ufo: value,
    contrastWash: value,
    clouds: value,
  };
}

function readTestModeOptions(search: string): TestModeOptions {
  const params = new URLSearchParams(search);
  const enabled = params.has("test") || params.has("testMode");
  const startPaused = enabled && params.get("paused") !== "0";
  const stepParam = Number(params.get("step"));
  const fixedStepSeconds =
    Number.isFinite(stepParam) && stepParam > 0 && stepParam <= 0.25 ? stepParam : FIXED_STEP_DEFAULT_SECONDS;

  const seedParam = Number(params.get("seed"));
  const seed = Number.isFinite(seedParam) ? Math.trunc(seedParam) : null;

  return {
    enabled,
    startPaused,
    fixedStepSeconds,
    seed,
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
  private readonly comboValue: HTMLSpanElement;
  private readonly messageValue: HTMLSpanElement;
  private readonly perfValue: HTMLSpanElement;
  private readonly overlayTitle: HTMLHeadingElement;
  private readonly overlayBody: HTMLParagraphElement;
  private readonly primaryButton: HTMLButtonElement;
  private readonly introTitle: HTMLDivElement;
  private readonly debugPanel: HTMLDivElement;
  private readonly rendererStatus: HTMLParagraphElement;
  private readonly distractionLayer: HTMLDivElement;
  private readonly gorillaActor: HTMLDivElement;
  private readonly ufoActor: HTMLDivElement;
  private readonly cloudLayer: HTMLDivElement;
  private readonly tremorPulse: HTMLDivElement;

  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly renderer: WebGLRenderer | null;
  private readonly stackGroup = new Group();
  private readonly archivedGroup = new Group();
  private readonly debrisGroup = new Group();
  private readonly collapseVoxelGroup = new Group();
  private readonly gridHelper = new GridHelper(28, 28, 0xd8b162, 0x28425f);

  private debugConfig: DebugConfig = defaultDebugConfig;
  private readonly feedbackManager = new FeedbackManager({
    audioEnabled: defaultDebugConfig.feedbackAudioEnabled,
    hapticsEnabled: defaultDebugConfig.feedbackHapticsEnabled,
  });
  private landedSlabs: SlabData[] = [];
  private slabMeshes = new Map<number, Mesh>();
  private activeSlab: SlabData | null = null;
  private activeMesh: Mesh | null = null;
  private debrisPieces: DebrisPiece[] = [];
  private debrisPool: Mesh[] = [];
  private collapseVoxels: CollapseVoxel[] = [];
  private oscillation: OscillationState | null = null;
  private lastFrameTime = 0;
  private gameState: GameState = "idle";
  private score = 0;
  private startingStackLevels = 0;
  private combo: ComboState = createComboState(defaultDebugConfig.comboTarget);
  private recovery: RecoveryState = createRecoveryState();
  private lastPlacementOutcome: TrimResult["outcome"] | null = null;
  private impactPulseRemaining = 0;
  private seededRandom: (() => number) | null = null;
  private distractionState: DistractionState = createDistractionState(0x53a9c321);
  private forcedDistractionTimers: Record<DistractionChannel, number> = createDistractionTimerRecord(0);
  private ufoWasActive = false;
  private ufoExitSecondsRemaining = 0;
  private ufoOrbitWorldPosition = new Vector3();
  private ufoWorldVelocity = new Vector3(UFO_MIN_EXIT_SPEED_WORLD_UNITS_PER_SECOND, 0.15, 0.8);
  private gorillaLastSlamCycle = -1;
  private gorillaSlamRemaining = 0;
  private integrityTelemetry: IntegrityTelemetry = resolveIntegrityTelemetry(
    [],
    {
      precarious: defaultDebugConfig.integrityPrecariousThreshold,
      unstable: defaultDebugConfig.integrityUnstableThreshold,
    },
    defaultDebugConfig.integrityWobbleStrength,
  );
  private collapseSequence: CollapseSequenceState | null = null;
  private collapseProgress = 0;
  private collapseCameraPullback = 0;
  private simulationElapsedSeconds = 0;
  private frameCounter = 0;
  private frameTimeMs = 0;
  private placementShakeRemaining = 0;
  private averageFrameTimeMs = 0;
  private cameraLookAtY = STACK_LOOK_AHEAD_Y;
  private readonly cameraTargetPosition = new Vector3(
    CAMERA_X,
    defaultDebugConfig.cameraHeight + defaultDebugConfig.cameraFramingOffset + defaultDebugConfig.cameraYOffset,
    defaultDebugConfig.cameraDistance,
  );
  private activeQualityPreset: QualityPreset = toQualityPreset(defaultDebugConfig.performanceQualityPreset);
  private archivedLevelSet = new Set<number>();
  private archivedChunkCount = 0;
  private distractionLod: PerformanceSnapshot["distractionLod"] = {
    gorilla: "high",
    ufo: "high",
    clouds: "high",
    tremor: "high",
  };
  private statusMessage = "Line up the moving slab and keep the tower alive.";
  private introExitTimeoutId: number | null = null;
  private introHideTimeoutId: number | null = null;
  private readonly windowTexture = this.createWindowTexture();
  private readonly eavesTexture = this.createEavesTexture();
  private cloudWorldAnchors: Vector3[] = [new Vector3(), new Vector3(), new Vector3()];
  private cloudAnchorsInitialized = false;

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
    this.shell.addEventListener("touchstart", this.handleTouchStart, { passive: false });

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

    this.comboValue = document.createElement("span");
    this.comboValue.className = "hud__value";
    this.comboValue.dataset.testid = "combo-value";

    this.messageValue = document.createElement("span");
    this.messageValue.className = "hud__message";
    this.messageValue.dataset.testid = "status-message";

    this.perfValue = document.createElement("span");
    this.perfValue.className = "hud__message hud__message--compact";
    this.perfValue.dataset.testid = "perf-message";

    this.overlayTitle = document.createElement("h1");
    this.overlayTitle.dataset.testid = "overlay-title";
    this.overlayBody = document.createElement("p");
    this.overlayBody.dataset.testid = "overlay-body";
    this.primaryButton = document.createElement("button");
    this.introTitle = document.createElement("div");
    this.debugPanel = document.createElement("div");
    this.rendererStatus = document.createElement("p");
    this.distractionLayer = document.createElement("div");
    this.gorillaActor = document.createElement("div");
    this.ufoActor = document.createElement("div");
    this.cloudLayer = document.createElement("div");
    this.tremorPulse = document.createElement("div");

    this.renderer = this.createRenderer();

    this.scene.background = new Color("#07101c");
    this.buildScene();
    this.buildHud();
    this.buildDistractionOverlay();
    this.resetWorld();
  }

  public mount(): void {
    this.container.replaceChildren(this.shell);
    this.shell.append(this.canvas, this.distractionLayer, this.hud, this.introTitle);
    this.updateMetrics();
    this.applyDebugConfig(this.debugConfig);
    this.startGame();
    this.showIntroTitle();
    window.requestAnimationFrame(this.tick);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keyup", this.handleKeyUp);

    if (this.testMode.enabled) {
      window.__towerStackerTestApi = this.createTestApi();
    }
  }

  private buildScene(): void {
    this.camera.position.set(
      CAMERA_X,
      this.debugConfig.cameraHeight + this.debugConfig.cameraFramingOffset + this.debugConfig.cameraYOffset,
      this.debugConfig.cameraDistance,
    );
    this.gridHelper.position.y = -12;
    this.scene.add(this.stackGroup, this.archivedGroup, this.debrisGroup, this.collapseVoxelGroup, this.gridHelper);

    const ambientLight = new AmbientLight(0xffffff, 1.8);
    const directionalLight = new DirectionalLight(0xfff0c8, 2.2);
    directionalLight.position.set(10, 18, 12);
    this.scene.add(ambientLight, directionalLight);
  }

  private buildHud(): void {
    const topbar = document.createElement("div");
    topbar.className = "hud__topbar";
    topbar.innerHTML = this.debugEnabled
      ? `
      <div class="hud__card">
        <span class="hud__label">Score</span>
      </div>
      <div class="hud__card">
        <span class="hud__label">Height</span>
      </div>
      <div class="hud__card">
        <span class="hud__label">Combo</span>
      </div>
      <div class="hud__card hud__card--wide" data-testid="status-card">
        <span class="hud__label">Status</span>
      </div>
      <div class="hud__card hud__card--wide" data-testid="perf-card">
        <span class="hud__label">Perf</span>
      </div>
    `
      : `
      <div class="hud__card">
        <span class="hud__label">Score</span>
      </div>
      <div class="hud__card">
        <span class="hud__label">Height</span>
      </div>
      <div class="hud__card">
        <span class="hud__label">Combo</span>
      </div>
    `;

    const cards = topbar.querySelectorAll(".hud__card");
    cards[0]?.append(this.scoreValue);
    cards[1]?.append(this.heightValue);
    cards[2]?.append(this.comboValue);
    if (this.debugEnabled) {
      cards[3]?.append(this.messageValue);
      cards[4]?.append(this.perfValue);
    }

    const overlay = document.createElement("section");
    overlay.className = "overlay";
    overlay.dataset.testid = "menu-overlay";

    this.primaryButton.className = "button button--primary";
    this.primaryButton.type = "button";
    this.primaryButton.addEventListener("click", this.handlePrimaryAction);

    const actions = document.createElement("div");
    actions.className = "overlay__actions";
    actions.append(this.primaryButton);

    this.rendererStatus.className = "overlay__status";

    overlay.append(this.overlayTitle);
    if (this.debugEnabled) {
      overlay.append(this.overlayBody, this.rendererStatus);
    }
    overlay.append(actions);

    this.introTitle.className = "intro-title";
    this.introTitle.dataset.testid = "intro-title";
    this.introTitle.textContent = "Tower stacker";

    this.debugPanel.className = "debug-panel";
    this.debugPanel.dataset.testid = "debug-panel";
    this.debugPanel.append(this.createDebugControls());

    this.hud.append(topbar, overlay);
    if (this.debugEnabled) {
      this.hud.append(this.debugPanel);
    }
  }

  private buildDistractionOverlay(): void {
    this.distractionLayer.className = "distraction-layer";

    this.gorillaActor.className = "distraction-actor distraction-actor--gorilla";
    this.gorillaActor.dataset.testid = "actor-gorilla";

    this.ufoActor.className = "distraction-actor distraction-actor--ufo";
    this.ufoActor.dataset.testid = "actor-ufo";

    this.cloudLayer.className = "distraction-clouds";
    this.cloudLayer.dataset.testid = "actor-clouds";
    for (let index = 0; index < 3; index += 1) {
      const cloud = document.createElement("span");
      cloud.className = "distraction-cloud";
      this.cloudLayer.append(cloud);
    }

    this.tremorPulse.className = "distraction-tremor";
    this.tremorPulse.dataset.testid = "actor-tremor";

    this.distractionLayer.append(this.gorillaActor, this.ufoActor, this.cloudLayer, this.tremorPulse);
  }

  private createDebugControls(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const title = document.createElement("h2");
    title.textContent = "Runtime Debug";
    fragment.append(title, this.createDistractionLaunchControls(), this.createNormalizeBlockControl());

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
          const integerKeys: DebugNumberKey[] = [
            "comboTarget",
            "recoverySlowdownPlacements",
            "prebuiltLevels",
            "performanceQualityPreset",
            "archivalKeepRecentLevels",
            "archivalChunkSize",
            "lodNearDistance",
            "lodFarDistance",
            "maxActiveDebris",
            "debrisPoolLimit",
          ];
          const rawValue = Number(input.value);
          const nextConfig = {
            ...this.debugConfig,
            [key]: integerKeys.includes(key) ? Math.round(rawValue) : rawValue,
          };
          this.applyDebugConfig(nextConfig);
          this.renderHud();
        });

        label.append(row, input);
        fragment.append(label);
      },
    );

    (Object.entries(DEBUG_TOGGLE_META) as [DebugToggleKey, { label: string }][]).forEach(([key, meta]) => {
      const toggleLabel = document.createElement("label");
      toggleLabel.textContent = meta.label;

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = this.debugConfig[key];
      toggle.dataset.debugKey = key;
      toggle.addEventListener("change", () => {
        this.applyDebugConfig({
          ...this.debugConfig,
          [key]: toggle.checked,
        });
        this.renderHud();
      });

      toggleLabel.append(toggle);
      fragment.append(toggleLabel);
    });

    return fragment;
  }

  private createDistractionLaunchControls(): HTMLElement {
    const distractionLaunch = document.createElement("section");
    distractionLaunch.className = "debug-panel__actions";

    const distractionLaunchTitle = document.createElement("h3");
    distractionLaunchTitle.className = "debug-panel__actions-title";
    distractionLaunchTitle.textContent = "Launch Distractions";
    distractionLaunch.append(distractionLaunchTitle);

    const launchGrid = document.createElement("div");
    launchGrid.className = "debug-panel__actions-grid";

    DEBUG_DISTRACTION_CHANNELS.forEach((channel) => {
      const launchButton = document.createElement("button");
      launchButton.type = "button";
      launchButton.className = "button button--secondary debug-panel__action";
      launchButton.dataset.testid = `debug-launch-${channel}`;
      launchButton.textContent = DEBUG_DISTRACTION_BUTTON_META[channel].label;
      launchButton.addEventListener("click", () => {
        this.triggerDebugDistraction(channel);
      });
      launchGrid.append(launchButton);
    });

    distractionLaunch.append(launchGrid);
    return distractionLaunch;
  }

  private createNormalizeBlockControl(): HTMLElement {
    const section = document.createElement("section");
    section.className = "debug-panel__actions";

    const title = document.createElement("h3");
    title.className = "debug-panel__actions-title";
    title.textContent = "Block Dimensions";

    const normalizeButton = document.createElement("button");
    normalizeButton.type = "button";
    normalizeButton.className = "button button--secondary debug-panel__action";
    normalizeButton.dataset.testid = "debug-normalize-block";
    normalizeButton.textContent = "Normalize W/L/H";
    normalizeButton.addEventListener("click", () => {
      const averageDimension = Number(
        ((this.debugConfig.baseWidth + this.debugConfig.baseDepth + this.debugConfig.slabHeight) / 3).toFixed(2),
      );
      this.applyDebugConfig({
        ...this.debugConfig,
        baseWidth: averageDimension,
        baseDepth: averageDimension,
        slabHeight: averageDimension,
      });
      this.renderHud();
    });

    section.append(title, normalizeButton);
    return section;
  }

  private readonly handlePrimaryAction = (): void => {
    this.feedbackManager.primeFromGesture();

    if (this.gameState === "playing") {
      this.returnToTitle();
      return;
    }

    this.startGame();
  };

  private readonly handleResize = (): void => {
    this.updateMetrics();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
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
    this.feedbackManager.primeFromGesture();

    if (this.gameState === "playing") {
      this.stopActiveSlab();
      return;
    }

    if (this.gameState === "idle" || this.gameState === "game_over") {
      this.startGame();
    }
  };

  private readonly handlePointerStop = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest(".overlay, .debug-panel")) {
      return;
    }

    this.feedbackManager.primeFromGesture();

    if (this.gameState === "playing") {
      this.stopActiveSlab();
      return;
    }

    if (this.gameState === "game_over") {
      this.startGame();
    }
  };

  private readonly handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length > 1) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".overlay, .debug-panel")) {
      return;
    }

    event.preventDefault();

    this.feedbackManager.primeFromGesture();

    if (this.gameState === "playing") {
      this.stopActiveSlab();
      return;
    }

    if (this.gameState === "game_over") {
      this.startGame();
    }
  };

  private readonly tick = (timestamp: number): void => {
    const deltaSeconds = this.lastFrameTime === 0 ? 0 : (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    this.updatePerformanceFrameTimes(deltaSeconds);

    this.tickForcedDistractionTimers(deltaSeconds);
    this.tickGorillaSlam(deltaSeconds);

    if (!this.simulationPaused) {
      this.runSimulationStep(deltaSeconds);
    } else {
      this.updateImpactPulse(deltaSeconds);
      this.updateDistractionActors();
      this.updateCamera(deltaSeconds);
    }

    this.renderer?.render(this.scene, this.camera);
    window.requestAnimationFrame(this.tick);
  };

  private runSimulationStep(deltaSeconds: number): void {
    this.simulationElapsedSeconds += deltaSeconds;
    this.frameCounter += 1;
    this.refreshQualityPreset();
    this.updateDistractions(deltaSeconds);
    this.updateDistractionActors();
    this.updateActiveSlab(deltaSeconds);
    this.updateDebris(deltaSeconds);
    this.updateCollapseVoxels(deltaSeconds);
    this.updateImpactPulse(deltaSeconds);
    this.updateCollapseSequence(deltaSeconds);
    this.updateCamera(deltaSeconds);
  }

  private updatePerformanceFrameTimes(deltaSeconds: number): void {
    const frameTimeMs = Math.max(0, deltaSeconds * 1000);
    this.frameTimeMs = frameTimeMs;
    if (this.averageFrameTimeMs === 0) {
      this.averageFrameTimeMs = frameTimeMs;
      return;
    }

    const smoothing = 0.08;
    this.averageFrameTimeMs += (frameTimeMs - this.averageFrameTimeMs) * smoothing;
  }

  private refreshQualityPreset(): void {
    const requestedPreset = toQualityPreset(this.debugConfig.performanceQualityPreset);
    const nextPreset = resolveAdaptiveQualityPreset(
      this.activeQualityPreset,
      requestedPreset,
      this.debugConfig.performanceAutoQualityEnabled,
      this.averageFrameTimeMs,
      this.debugConfig.performanceFrameBudgetMs,
    );

    if (nextPreset !== this.activeQualityPreset) {
      this.activeQualityPreset = nextPreset;
      this.syncArchivedRepresentation();
    }

    const scalars = getQualityScalars(this.activeQualityPreset);
    this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio, scalars.pixelRatioCap));
  }

  private startGame(): void {
    this.resetWorld();
    this.gameState = "playing";
    this.spawnNextActive();
    this.statusMessage = "Press space, enter, click, or tap to drop the slab.";
    this.renderHud();
  }

  private showIntroTitle(): void {
    this.introTitle.classList.remove("intro-title--exit", "intro-title--hidden");

    if (this.introExitTimeoutId !== null) {
      window.clearTimeout(this.introExitTimeoutId);
      this.introExitTimeoutId = null;
    }

    if (this.introHideTimeoutId !== null) {
      window.clearTimeout(this.introHideTimeoutId);
      this.introHideTimeoutId = null;
    }

    this.introExitTimeoutId = window.setTimeout(() => {
      this.introTitle.classList.add("intro-title--exit");
      this.introHideTimeoutId = window.setTimeout(() => {
        this.introTitle.classList.add("intro-title--hidden");
        this.introHideTimeoutId = null;
      }, 420);
      this.introExitTimeoutId = null;
    }, 750);
  }

  private returnToTitle(): void {
    this.gameState = "idle";
    this.statusMessage = "Adjust the starting stack or timing window, then start a new run.";
    this.resetWorld();
    this.renderHud();
  }

  private resetWorld(): void {
    this.lastFrameTime = 0;
    this.simulationElapsedSeconds = 0;
    this.score = 0;
    this.combo = createComboState(this.debugConfig.comboTarget);
    this.recovery = createRecoveryState();
    this.lastPlacementOutcome = null;
    this.impactPulseRemaining = 0;
    this.placementShakeRemaining = 0;
    this.seededRandom = this.testMode.seed === null ? null : createSeededRandom(this.testMode.seed);
    this.collapseSequence = null;
    this.collapseProgress = 0;
    this.collapseCameraPullback = 0;
    const distractionSeed = this.testMode.seed ?? 0x53a9c321;
    this.distractionState = createDistractionState(distractionSeed);
    this.forcedDistractionTimers = createDistractionTimerRecord(0);
    this.ufoWasActive = false;
    this.ufoExitSecondsRemaining = 0;
    this.ufoOrbitWorldPosition.set(0, 0, 0);
    this.ufoWorldVelocity.set(UFO_MIN_EXIT_SPEED_WORLD_UNITS_PER_SECOND, 0.15, 0.8);
    this.gorillaLastSlamCycle = -1;
    this.gorillaSlamRemaining = 0;
    this.shell.style.setProperty("--impact-alpha", "0");
    this.shell.style.setProperty("--contrast-alpha", "0");
    this.shell.style.setProperty("--collapse-alpha", "0");
    this.stackGroup.rotation.set(0, 0, 0);
    this.stackGroup.position.set(0, 0, 0);
    this.stackGroup.visible = true;
    this.archivedGroup.rotation.set(0, 0, 0);
    this.archivedGroup.position.set(0, 0, 0);
    this.archivedGroup.visible = true;
    this.clearGroup(this.stackGroup, true);
    this.clearGroup(this.archivedGroup, true);
    this.clearGroup(this.debrisGroup, true);
    this.clearGroup(this.collapseVoxelGroup, true);
    this.slabMeshes = new Map<number, Mesh>();
    this.archivedLevelSet = new Set<number>();
    this.archivedChunkCount = 0;
    this.debrisPieces = [];
    this.debrisPool = [];
    this.collapseVoxels = [];
    this.activeMesh = null;
    this.activeSlab = null;
    this.oscillation = null;
    this.frameCounter = 0;
    this.frameTimeMs = 0;
    this.averageFrameTimeMs = 0;
    this.activeQualityPreset = toQualityPreset(this.debugConfig.performanceQualityPreset);
    this.cloudAnchorsInitialized = false;
    this.landedSlabs = createInitialStack(this.debugConfig);
    this.startingStackLevels = this.landedSlabs.length;

    this.landedSlabs.forEach((slab) => {
      const mesh = this.createSlabMesh(slab, false);
      this.slabMeshes.set(slab.level, mesh);
      this.stackGroup.add(mesh);
    });

    this.syncArchivedRepresentation();
    this.refreshIntegrityTelemetry();
    this.updateDistractionActors();

    const topLandedSlab = this.landedSlabs[this.landedSlabs.length - 1] ?? null;
    const initialTargetY =
      (topLandedSlab?.position.y ?? 0) +
      this.debugConfig.cameraHeight +
      this.debugConfig.cameraFramingOffset +
      this.debugConfig.cameraYOffset +
      STARTUP_CAMERA_LIFT;
    this.cameraTargetPosition.set(CAMERA_X, initialTargetY, this.debugConfig.cameraDistance);
    this.cameraLookAtY = Math.max(
      1.2,
      initialTargetY - this.debugConfig.cameraHeight - this.debugConfig.cameraFramingOffset - this.debugConfig.cameraYOffset + STACK_LOOK_AHEAD_Y,
    );
  }

  private spawnNextActive(): void {
    const target = this.landedSlabs[this.landedSlabs.length - 1];
    if (!target) {
      return;
    }

    const activeSlab = spawnActiveSlab(target, this.debugConfig);
    this.activeSlab = activeSlab;

    const targetAxisPosition = activeSlab.axis === "x" ? target.position.x : target.position.z;
    const spawnSide = this.seededRandom ? ((this.seededRandom() < 0.5 ? -1 : 1) as 1 | -1) : (-1 as 1 | -1);
    const spawnOffset = targetAxisPosition + spawnSide * this.debugConfig.motionRange;
    const spawnDirection = (spawnSide * -1) as 1 | -1;

    this.oscillation = {
      axis: activeSlab.axis,
      center: targetAxisPosition,
      offset: spawnOffset,
      direction: spawnDirection,
    };

    if (activeSlab.axis === "x") {
      activeSlab.position.x = spawnOffset;
    } else {
      activeSlab.position.z = spawnOffset;
    }

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
      const missOffset = {
        x: this.activeSlab.position.x - target.position.x,
        z: this.activeSlab.position.z - target.position.z,
      };
      this.spawnDebris(this.activeSlab, this.activeSlab.axis, true);
      this.activeSlab = null;
      this.activeMesh = null;
      this.oscillation = null;
      this.lastPlacementOutcome = result.outcome;
      this.combo = updateComboState(this.combo, result.outcome);
      this.feedbackManager.play(getPlacementFeedbackPlan(result.outcome));
      this.beginCollapseSequence("miss", missOffset);
      this.gameState = "game_over";
      this.statusMessage = "Hard miss! Tower collapse sequence triggered.";
      this.renderHud();
      return;
    }

    if (!result.landedSlab) {
      return;
    }

    if (result.debrisSlab) {
      this.spawnDebris(result.debrisSlab, result.landedSlab.axis, false);
    }

    this.lastPlacementOutcome = result.outcome;
    this.combo = updateComboState(this.combo, result.outcome);
    this.feedbackManager.play(getPlacementFeedbackPlan(result.outcome));
    this.recovery = applyPlacementRecoveryTick(this.recovery);

    const recoveryResolution = resolveRecoveryReward(this.recovery, this.combo, result.landedSlab, {
      baseWidth: this.debugConfig.baseWidth,
      baseDepth: this.debugConfig.baseDepth,
      growthMultiplier: this.debugConfig.recoveryGrowthMultiplier,
      slowdownPlacements: this.debugConfig.recoverySlowdownPlacements,
    });

    this.recovery = recoveryResolution.state;
    const rewardedLandedSlab = recoveryResolution.landedSlab;

    this.triggerImpactPulse(result.outcome === "perfect" ? 0.25 : 0.18);
    this.triggerPlacementShake();
    this.landedSlabs.push(rewardedLandedSlab);
    const landedMesh = this.createSlabMesh(rewardedLandedSlab, false);
    this.slabMeshes.set(rewardedLandedSlab.level, landedMesh);
    this.stackGroup.add(landedMesh);
    this.syncArchivedRepresentation();
    this.refreshIntegrityTelemetry();
    this.score += 1;

    if (this.integrityTelemetry.tier === "unstable") {
      this.statusMessage = "Tower integrity is unstable. Keep stacking, or a hard miss will end the run.";
    } else if (recoveryResolution.triggered) {
      const slowdownPercent = Math.round((1 - this.debugConfig.recoverySlowdownFactor) * 100);
      this.statusMessage =
        slowdownPercent > 0
          ? `Recovery reward! Slab footprint restored and speed reduced ${slowdownPercent}% for ${this.recovery.slowdownPlacementsRemaining} floors.`
          : "Recovery reward! Slab footprint restored to help you stabilize the tower.";
    } else if (result.outcome === "perfect") {
      this.statusMessage = this.combo.rewardReady
        ? `Combo ready at ${this.combo.current}/${this.combo.target}.`
        : `Perfect alignment. Combo ${this.combo.current}/${this.combo.target}.`;
    } else {
      this.statusMessage = `Trimmed ${result.trimmedSize.toFixed(2)} units off the ${result.landedSlab.axis.toUpperCase()} axis.`;
    }

    this.activeSlab = null;
    this.activeMesh = null;
    this.oscillation = null;
    this.spawnNextActive();
    this.renderHud();
  }

  private beginCollapseSequence(trigger: CollapseTrigger, offset: { x: number; z: number }): void {
    this.collapseSequence = createCollapseSequence(trigger, offset, {
      durationSeconds: this.debugConfig.collapseDurationSeconds,
      tiltStrength: this.debugConfig.collapseTiltStrength,
      pullbackDistance: this.debugConfig.collapseCameraPullback,
      dropDistance: this.debugConfig.collapseDropDistance,
    });
    this.feedbackManager.play(getFailureFeedbackPlan(trigger));
    this.triggerImpactPulse(0.36);
    this.spawnCollapseVoxels();
    this.stackGroup.visible = false;
    this.archivedGroup.visible = false;
  }

  private triggerDebugDistraction(channel: DistractionChannel): void {
    if (!this.canForceDistractionChannel(channel)) {
      return;
    }

    const durationSeconds =
      channel === "ufo"
        ? Math.max(DEBUG_DISTRACTION_LAUNCH_DURATION_SECONDS, this.getUfoOrbitDurationSeconds())
        : DEBUG_DISTRACTION_LAUNCH_DURATION_SECONDS;

    this.forcedDistractionTimers[channel] = durationSeconds;
    this.updateDistractionActors();
  }

  private getUfoOrbitDurationSeconds(): number {
    const speed = Math.max(0.2, this.debugConfig.distractionMotionSpeed);
    return (Math.PI * 2) / (UFO_ORBIT_ANGULAR_SPEED * speed);
  }

  private canForceDistractionChannel(channel: DistractionChannel): boolean {
    if (!this.debugConfig.distractionsEnabled) {
      return false;
    }

    switch (channel) {
      case "tentacle":
        return this.debugConfig.distractionTentacleEnabled;
      case "gorilla":
        return this.debugConfig.distractionGorillaEnabled;
      case "tremor":
        return this.debugConfig.distractionTremorEnabled;
      case "ufo":
        return this.debugConfig.distractionUfoEnabled;
      case "contrastWash":
        return this.debugConfig.distractionContrastEnabled;
      case "clouds":
        return this.debugConfig.distractionCloudEnabled;
      default:
        return false;
    }
  }

  private tickForcedDistractionTimers(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    DEBUG_DISTRACTION_CHANNELS.forEach((channel) => {
      const remaining = this.forcedDistractionTimers[channel];
      if (remaining <= 0) {
        return;
      }

      this.forcedDistractionTimers[channel] = Math.max(0, remaining - deltaSeconds);
    });
  }

  private tickGorillaSlam(deltaSeconds: number): void {
    if (deltaSeconds <= 0 || this.gorillaSlamRemaining <= 0) {
      return;
    }

    this.gorillaSlamRemaining = Math.max(0, this.gorillaSlamRemaining - deltaSeconds);
  }

  private getEffectiveDistractionSnapshot(): DistractionSnapshot {
    const snapshot = this.distractionState.snapshot;
    const active = { ...snapshot.active };
    const signals = { ...snapshot.signals };

    DEBUG_DISTRACTION_CHANNELS.forEach((channel) => {
      if (this.forcedDistractionTimers[channel] <= 0 || !this.canForceDistractionChannel(channel)) {
        return;
      }

      active[channel] = true;
      signals[channel] = Math.max(signals[channel], 1);
    });

    return {
      ...snapshot,
      active,
      signals,
    };
  }

  private updateDistractions(deltaSeconds: number): void {
    const scalars = getQualityScalars(this.activeQualityPreset);
    const shouldUpdate = this.frameCounter % Math.max(1, scalars.distractionUpdateStride) === 0;
    if (!shouldUpdate) {
      return;
    }

    const steppedDelta = deltaSeconds * Math.max(1, scalars.distractionUpdateStride);
    this.distractionState = updateDistractionState(
      this.distractionState,
      steppedDelta,
      this.landedSlabs.length - 1,
      this.debugConfig,
    );
  }

  private updateDistractionActors(): void {
    const snapshot = this.getEffectiveDistractionSnapshot();
    const scalars = getQualityScalars(this.activeQualityPreset);
    const lodNear = Math.round(this.debugConfig.lodNearDistance * scalars.lodDistanceMultiplier);
    const lodFar = Math.round(this.debugConfig.lodFarDistance * scalars.lodDistanceMultiplier);

    this.distractionLod = {
      gorilla: selectDistractionLodTier(Math.max(0, snapshot.level - this.debugConfig.distractionGorillaStartLevel), lodNear, lodFar),
      ufo: selectDistractionLodTier(Math.max(0, snapshot.level - this.debugConfig.distractionUfoStartLevel), lodNear, lodFar),
      clouds: selectDistractionLodTier(Math.max(0, snapshot.level - this.debugConfig.distractionCloudStartLevel), lodNear, lodFar),
      tremor: selectDistractionLodTier(snapshot.level, lodNear, lodFar),
    };

    if (!snapshot.active.gorilla) {
      this.gorillaActor.style.opacity = "0";
      this.gorillaLastSlamCycle = -1;
    } else if (shouldUpdateForLod(this.distractionLod.gorilla, this.frameCounter, scalars.distractionUpdateStride)) {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const topSlab = this.landedSlabs[this.landedSlabs.length - 1];
      const topPosition = topSlab?.position ?? { x: 0, y: 0, z: 0 };
      const orbitPhase = this.distractionState.elapsedSeconds * GORILLA_CLIMB_SPEED * this.debugConfig.distractionMotionSpeed;
      const aroundAngle = orbitPhase * 0.9;
      const climbWave = (Math.sin(orbitPhase * Math.PI * 2) + 1) / 2;
      const verticalRange = Math.max(2.6, Math.min(8.5, (this.landedSlabs.length - 1) * 0.33 + 2.1));
      const orbitRadius = Math.max(this.debugConfig.baseWidth, this.debugConfig.baseDepth) * 0.55 + 1.35;

      const worldPoint = new Vector3(
        topPosition.x + Math.cos(aroundAngle) * orbitRadius,
        topPosition.y - verticalRange * 0.35 + climbWave * verticalRange,
        topPosition.z + Math.sin(aroundAngle) * orbitRadius,
      );
      const projected = worldPoint.clone().project(this.camera);
      const screenX = (projected.x * 0.5 + 0.5) * width;
      const screenY = (-projected.y * 0.5 + 0.5) * height;
      const clampedX = Math.min(width + 120, Math.max(-120, screenX));
      const clampedY = Math.min(height + 120, Math.max(-120, screenY));
      const inFrontOfCamera = projected.z > -1 && projected.z < 1;
      const depthScale = 0.88 + (1 - Math.max(0, Math.min(1, (projected.z + 1) * 0.5))) * 0.32;
      const gorillaOpacity = inFrontOfCamera ? 0.26 + snapshot.signals.gorilla * 0.72 : 0.12 + snapshot.signals.gorilla * 0.18;

      this.gorillaActor.style.opacity = gorillaOpacity.toFixed(3);
      this.gorillaActor.style.transform = `translate(${clampedX.toFixed(2)}px, ${clampedY.toFixed(2)}px) translate(-50%, -50%) scale(${depthScale.toFixed(3)})`;

      const slamCycle = this.distractionState.elapsedSeconds * GORILLA_SLAM_CYCLE_SPEED * this.debugConfig.distractionMotionSpeed;
      const slamCycleIndex = Math.floor(slamCycle);
      const slamCycleProgress = slamCycle - slamCycleIndex;
      if (slamCycleIndex !== this.gorillaLastSlamCycle && slamCycleProgress < 0.08) {
        this.gorillaLastSlamCycle = slamCycleIndex;
        this.gorillaSlamRemaining = GORILLA_SLAM_DURATION_SECONDS;
        this.triggerImpactPulse(0.1);
      }
    }

    const shouldUpdateUfo =
      shouldUpdateForLod(this.distractionLod.ufo, this.frameCounter, scalars.distractionUpdateStride) ||
      !snapshot.active.ufo ||
      this.ufoExitSecondsRemaining > 0 ||
      this.ufoWasActive;
    if (shouldUpdateUfo) {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const frameDeltaSeconds = Math.max(1 / 120, this.frameTimeMs > 0 ? this.frameTimeMs / 1000 : 1 / 60);

      if (snapshot.active.ufo) {
        const topSlab = this.landedSlabs[this.landedSlabs.length - 1];
        const orbitPhase = this.distractionState.elapsedSeconds * UFO_ORBIT_ANGULAR_SPEED * this.debugConfig.distractionMotionSpeed;
        const orbitRadius = Math.max(3.2, this.debugConfig.baseWidth * 1.15 + snapshot.signals.ufo * 1.8);
        const orbitCenterX = topSlab?.position.x ?? 0;
        const topCenterY = topSlab?.position.y ?? 0;
        const topSlabHeight = topSlab?.dimensions.height ?? this.debugConfig.slabHeight;
        const orbitCenterY = topCenterY + topSlabHeight;
        const orbitCenterZ = topSlab?.position.z ?? 0;

        const worldPoint = new Vector3(
          orbitCenterX + Math.cos(orbitPhase) * orbitRadius,
          orbitCenterY,
          orbitCenterZ + Math.sin(orbitPhase) * orbitRadius,
        );

        if (this.ufoWasActive) {
          this.ufoWorldVelocity.copy(worldPoint).sub(this.ufoOrbitWorldPosition).divideScalar(frameDeltaSeconds);
        }

        this.ufoOrbitWorldPosition.copy(worldPoint);
        this.ufoExitSecondsRemaining = 0;
        this.ufoWasActive = true;

        const projected = worldPoint.clone().project(this.camera);
        const screenX = (projected.x * 0.5 + 0.5) * width;
        const screenY = (-projected.y * 0.5 + 0.5) * height;
        const clampedX = Math.min(width + 160, Math.max(-160, screenX));
        const clampedY = Math.min(height + 160, Math.max(-160, screenY));
        const inFrontOfCamera = projected.z > -1 && projected.z < 1;
        const ufoOpacity = inFrontOfCamera ? 0.26 + snapshot.signals.ufo * 0.74 : 0.18 + snapshot.signals.ufo * 0.2;
        this.ufoActor.style.opacity = ufoOpacity.toFixed(3);
        this.ufoActor.style.transform = `translate(${clampedX.toFixed(2)}px, ${clampedY.toFixed(2)}px) translate(-50%, -50%)`;
      } else {
        if (this.ufoWasActive) {
          const tangentDirection = this.ufoWorldVelocity.clone().setY(0);
          if (tangentDirection.lengthSq() < 1e-5) {
            tangentDirection.set(1, 0, 0);
          }
          tangentDirection.normalize();

          const towardCameraDirection = new Vector3().subVectors(this.camera.position, this.ufoOrbitWorldPosition).setY(0);
          if (towardCameraDirection.lengthSq() < 1e-5) {
            towardCameraDirection.set(0, 0, 1);
          }
          towardCameraDirection.normalize();

          const towardPlayerZBias = new Vector3(0, 0, 0.45);
          const exitDirection = tangentDirection
            .multiplyScalar(0.45)
            .add(towardCameraDirection.multiplyScalar(0.4))
            .add(towardPlayerZBias)
            .add(new Vector3(0, 0.2, 0))
            .normalize();

          const tangentSpeed = Math.max(0, this.ufoWorldVelocity.length());
          const exitSpeed = Math.max(UFO_MIN_EXIT_SPEED_WORLD_UNITS_PER_SECOND, tangentSpeed * 1.2);
          this.ufoWorldVelocity.copy(exitDirection.multiplyScalar(exitSpeed));
          this.ufoExitSecondsRemaining = UFO_EXIT_DURATION_SECONDS;
          this.ufoWasActive = false;
        }

        if (this.ufoExitSecondsRemaining > 0) {
          this.ufoExitSecondsRemaining = Math.max(0, this.ufoExitSecondsRemaining - frameDeltaSeconds);
          const fadeProgress = this.ufoExitSecondsRemaining / UFO_EXIT_DURATION_SECONDS;
          this.ufoOrbitWorldPosition.addScaledVector(this.ufoWorldVelocity, frameDeltaSeconds);

          const projected = this.ufoOrbitWorldPosition.clone().project(this.camera);
          const screenX = (projected.x * 0.5 + 0.5) * width;
          const screenY = (-projected.y * 0.5 + 0.5) * height;
          this.ufoActor.style.opacity = (0.58 * fadeProgress).toFixed(3);
          this.ufoActor.style.transform = `translate(${screenX.toFixed(2)}px, ${screenY.toFixed(2)}px) translate(-50%, -50%)`;
        } else {
          this.ufoActor.style.opacity = "0";
        }
      }
    }

    if (shouldUpdateForLod(this.distractionLod.clouds, this.frameCounter, scalars.distractionUpdateStride)) {
      this.updateCloudLayer(snapshot);
    }

    const contrastOpacity = snapshot.active.contrastWash ? snapshot.signals.contrastWash * 0.35 : 0;
    this.shell.style.setProperty("--contrast-alpha", contrastOpacity.toFixed(3));

    if (shouldUpdateForLod(this.distractionLod.tremor, this.frameCounter, scalars.distractionUpdateStride)) {
      const tremorStrength = snapshot.active.tremor ? snapshot.signals.tremor : 0;
      this.tremorPulse.style.opacity = (tremorStrength * 0.75).toFixed(3);
      this.tremorPulse.style.transform = `scale(${(1 + tremorStrength * 0.4).toFixed(3)})`;
    }
  }

  private updateCloudLayer(snapshot: DistractionSnapshot): void {
    const cloudNodes = Array.from(this.cloudLayer.querySelectorAll<HTMLElement>(".distraction-cloud"));
    if (cloudNodes.length === 0) {
      return;
    }

    const cloudChannelEnabled = this.debugConfig.distractionsEnabled && this.debugConfig.distractionCloudEnabled;
    if (!cloudChannelEnabled) {
      this.cloudLayer.style.opacity = "0";
      this.cloudAnchorsInitialized = false;
      return;
    }

    if (!this.cloudAnchorsInitialized) {
      const topSlab = this.landedSlabs[this.landedSlabs.length - 1];
      const topY = topSlab?.position.y ?? 0;
      const baseX = topSlab?.position.x ?? 0;
      const baseZ = topSlab?.position.z ?? 0;
      const offsets = [
        { x: -3.8, y: 2.6, z: -2.2 },
        { x: 2.1, y: 0.9, z: 1.6 },
        { x: -1.2, y: -0.5, z: 2.9 },
      ];
      this.cloudWorldAnchors = offsets.map(
        (offset) =>
          new Vector3(
            baseX + offset.x,
            topY + this.debugConfig.slabHeight * (1.2 + offset.y),
            baseZ + offset.z,
          ),
      );
      this.cloudAnchorsInitialized = true;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const swayPhase = this.distractionState.elapsedSeconds * 0.6 * this.debugConfig.distractionMotionSpeed;
    const bobPhase = this.distractionState.elapsedSeconds * 0.28;

    cloudNodes.forEach((cloudNode, index) => {
      const anchor = this.cloudWorldAnchors[index] ?? this.cloudWorldAnchors[0] ?? new Vector3();
      const swayMultiplier = index === 1 ? 1 : index === 2 ? -0.7 : 0.85;
      const worldPoint = new Vector3(
        anchor.x + Math.sin(swayPhase + index) * (0.55 + index * 0.2),
        anchor.y + Math.cos(bobPhase + index * 0.75) * 0.22,
        anchor.z + Math.cos(swayPhase * 0.65 + index) * 0.38,
      );
      const projected = worldPoint.project(this.camera);
      const rawScreenX = (projected.x * 0.5 + 0.5) * width + Math.sin(swayPhase + index * 0.35) * CLOUD_SWAY_DISTANCE_PX * swayMultiplier;
      const rawScreenY = (-projected.y * 0.5 + 0.5) * height;
      const screenX = index === 0 ? Math.min(width - 80, Math.max(80, rawScreenX)) : rawScreenX;
      const screenY = index === 0 ? Math.min(height - 80, Math.max(80, rawScreenY)) : rawScreenY;
      cloudNode.style.transform = `translate(${screenX.toFixed(2)}px, ${screenY.toFixed(2)}px) translate(-50%, -50%)`;
    });

    const baselineCloudOpacity = 0.28;
    const cloudSignalOpacity = snapshot.active.clouds ? snapshot.signals.clouds * 0.46 : 0;
    const cloudOpacity = baselineCloudOpacity + cloudSignalOpacity;
    this.cloudLayer.style.opacity = Math.min(0.92, cloudOpacity).toFixed(3);
    this.cloudLayer.style.transform = "translateX(0px)";
  }

  private updateActiveSlab(deltaSeconds: number): void {
    if (this.gameState !== "playing" || !this.activeSlab || !this.activeMesh || !this.oscillation) {
      return;
    }

    this.oscillation = advanceOscillation(
      this.oscillation,
      deltaSeconds,
      getTravelSpeed(this.activeSlab.level, this.debugConfig) *
        getRecoverySpeedMultiplier(this.recovery, this.debugConfig.recoverySlowdownFactor),
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
        this.recycleDebrisMesh(piece.mesh);
      }
      return stillVisible;
    });

    const scalars = getQualityScalars(this.activeQualityPreset);
    const maxActiveDebris = Math.max(1, Math.round(this.debugConfig.maxActiveDebris * scalars.maxDebrisMultiplier));
    while (this.debrisPieces.length > maxActiveDebris) {
      const piece = this.debrisPieces.shift();
      if (!piece) {
        break;
      }
      this.recycleDebrisMesh(piece.mesh);
    }
  }

  private updateCollapseVoxels(deltaSeconds: number): void {
    if (this.collapseVoxels.length === 0) {
      return;
    }

    const gravity = 17;
    this.collapseVoxels = this.collapseVoxels.filter((voxel) => {
      voxel.remainingLifetime -= deltaSeconds;
      voxel.velocity.y -= gravity * deltaSeconds;
      voxel.mesh.position.x += voxel.velocity.x * deltaSeconds;
      voxel.mesh.position.y += voxel.velocity.y * deltaSeconds;
      voxel.mesh.position.z += voxel.velocity.z * deltaSeconds;
      voxel.mesh.rotation.x += voxel.angularVelocity.x * deltaSeconds;
      voxel.mesh.rotation.y += voxel.angularVelocity.y * deltaSeconds;
      voxel.mesh.rotation.z += voxel.angularVelocity.z * deltaSeconds;

      const visible = voxel.remainingLifetime > 0 && voxel.mesh.position.y > -15;
      if (!visible) {
        this.collapseVoxelGroup.remove(voxel.mesh);
        voxel.mesh.geometry.dispose();
        if (voxel.mesh.material instanceof MeshStandardMaterial) {
          voxel.mesh.material.dispose();
        }
      }
      return visible;
    });
  }

  private triggerImpactPulse(durationSeconds: number): void {
    this.impactPulseRemaining = Math.max(this.impactPulseRemaining, durationSeconds);
    this.shell.style.setProperty("--impact-alpha", "0.5");
  }

  private triggerPlacementShake(): void {
    this.placementShakeRemaining = Math.max(this.placementShakeRemaining, PLACEMENT_SHAKE_DURATION_SECONDS);
  }

  private updateImpactPulse(deltaSeconds: number): void {
    if (this.impactPulseRemaining <= 0) {
      return;
    }

    this.impactPulseRemaining = Math.max(0, this.impactPulseRemaining - deltaSeconds);
    const alpha = Math.min(0.5, this.impactPulseRemaining * 2.2);
    this.shell.style.setProperty("--impact-alpha", alpha.toFixed(3));
  }

  private updateCollapseSequence(deltaSeconds: number): void {
    if (!this.collapseSequence) {
      this.collapseProgress = 0;
      this.collapseCameraPullback = 0;
      this.shell.style.setProperty("--collapse-alpha", "0");
      return;
    }

    this.collapseSequence = advanceCollapseSequence(this.collapseSequence, deltaSeconds);
    const frame = sampleCollapseFrame(this.collapseSequence);
    this.collapseProgress = frame.progress;
    this.collapseCameraPullback = frame.cameraPullback;
    this.stackGroup.rotation.set(frame.stackTiltX, 0, frame.stackTiltZ);
    this.archivedGroup.rotation.set(frame.stackTiltX, 0, frame.stackTiltZ);
    this.stackGroup.position.y = -frame.stackDropY;
    this.archivedGroup.position.y = -frame.stackDropY;
    this.shell.style.setProperty("--collapse-alpha", (0.12 + frame.progress * 0.35).toFixed(3));
  }

  private updateCamera(deltaSeconds: number): void {
    const topLandedSlab = this.landedSlabs[this.landedSlabs.length - 1] ?? this.activeSlab;
    const collapseFrame = this.collapseSequence ? sampleCollapseFrame(this.collapseSequence) : null;
    const builtFloors = Math.max(0, this.landedSlabs.length - this.startingStackLevels);
    const startupLiftFactor = Math.max(0, 1 - builtFloors / STARTUP_CAMERA_LIFT_FADE_FLOORS);
    const startupLift = STARTUP_CAMERA_LIFT * startupLiftFactor;
    const targetY =
      (topLandedSlab?.position.y ?? 0) +
      this.debugConfig.cameraHeight +
      this.debugConfig.cameraFramingOffset +
      this.debugConfig.cameraYOffset +
      startupLift -
      (collapseFrame?.cameraDrop ?? 0);
    const targetZ = this.debugConfig.cameraDistance + (collapseFrame?.cameraPullback ?? 0);

    const safeDeltaSeconds = Math.max(0, Math.min(0.1, deltaSeconds));
    const fpsAdjustedLerp =
      safeDeltaSeconds > 0
        ? 1 - Math.pow(1 - this.debugConfig.cameraLerp, safeDeltaSeconds * 60)
        : this.debugConfig.cameraLerp;

    this.cameraTargetPosition.set(CAMERA_X, targetY, targetZ);
    this.camera.position.lerp(this.cameraTargetPosition, fpsAdjustedLerp);

    const distractionSnapshot = this.getEffectiveDistractionSnapshot();
    const tremorStrength = distractionSnapshot.active.tremor ? distractionSnapshot.signals.tremor : 0;
    if (tremorStrength > 0) {
      const shakePhase = this.distractionState.elapsedSeconds * 58;
      this.camera.position.x += Math.sin(shakePhase) * 0.03 * tremorStrength;
      this.camera.position.y += Math.cos(shakePhase * 0.9) * 0.04 * tremorStrength;
    }

    if (this.gorillaSlamRemaining > 0) {
      const slamStrength = this.gorillaSlamRemaining / GORILLA_SLAM_DURATION_SECONDS;
      const slamPhase = this.simulationElapsedSeconds * 40;
      this.camera.position.x += Math.sin(slamPhase) * 0.045 * slamStrength;
      this.camera.position.y -= 0.06 * slamStrength;
    }

    if (this.placementShakeRemaining > 0 && this.debugConfig.placementShakeAmount > 0) {
      this.placementShakeRemaining = Math.max(0, this.placementShakeRemaining - safeDeltaSeconds);
      const shakeStrength =
        (this.placementShakeRemaining / PLACEMENT_SHAKE_DURATION_SECONDS) * this.debugConfig.placementShakeAmount;
      const shakePhase = this.simulationElapsedSeconds * 78;
      this.camera.position.x += Math.sin(shakePhase) * 0.08 * shakeStrength;
      this.camera.position.y += Math.cos(shakePhase * 1.1) * 0.06 * shakeStrength;
      this.camera.position.z += Math.sin(shakePhase * 0.9) * 0.04 * shakeStrength;
    }

    if (this.integrityTelemetry.tier === "precarious") {
      const wobblePhase = this.simulationElapsedSeconds * 14;
      this.camera.position.x += Math.sin(wobblePhase) * this.integrityTelemetry.wobbleStrength;
      this.camera.position.z += Math.cos(wobblePhase * 0.85) * this.integrityTelemetry.wobbleStrength * 0.4;
    }

    const lookAtTargetY = Math.max(
      1.2,
      targetY - this.debugConfig.cameraHeight - this.debugConfig.cameraFramingOffset - this.debugConfig.cameraYOffset + STACK_LOOK_AHEAD_Y,
    );
    const lookAtLerp = Math.min(1, fpsAdjustedLerp * 1.25);
    this.cameraLookAtY += (lookAtTargetY - this.cameraLookAtY) * lookAtLerp;
    this.camera.lookAt(0, this.cameraLookAtY, 0);
  }

  private updateMetrics(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height, false);
  }

  private syncArchivedRepresentation(): void {
    const topLevel = this.landedSlabs.length > 0 ? this.landedSlabs[this.landedSlabs.length - 1]!.level : 0;
    const scalars = getQualityScalars(this.activeQualityPreset);
    const keepRecentLevels = Math.max(1, Math.round(this.debugConfig.archivalKeepRecentLevels * scalars.keepRecentMultiplier));
    const archivableLevels = collectArchivableLevels(
      this.landedSlabs.map((slab) => slab.level),
      topLevel,
      keepRecentLevels,
    );
    this.archivedLevelSet = new Set<number>(archivableLevels);

    this.landedSlabs.forEach((slab) => {
      const mesh = this.slabMeshes.get(slab.level);
      if (!mesh) {
        return;
      }

      if (this.archivedLevelSet.has(slab.level)) {
        if (mesh.parent === this.stackGroup) {
          this.stackGroup.remove(mesh);
        }
      } else if (mesh.parent !== this.stackGroup) {
        this.stackGroup.add(mesh);
      }
    });

    this.rebuildArchivedChunks();
  }

  private rebuildArchivedChunks(): void {
    this.clearGroup(this.archivedGroup, true);
    this.archivedChunkCount = 0;

    if (this.archivedLevelSet.size === 0) {
      return;
    }

    const scalars = getQualityScalars(this.activeQualityPreset);
    const chunkSize = Math.max(2, Math.round(this.debugConfig.archivalChunkSize * scalars.chunkSizeMultiplier));

    const chunkMap = new Map<number, SlabData[]>();
    this.landedSlabs.forEach((slab) => {
      if (!this.archivedLevelSet.has(slab.level)) {
        return;
      }

      const chunkIndex = Math.floor(slab.level / chunkSize);
      const chunk = chunkMap.get(chunkIndex) ?? [];
      chunk.push(slab);
      chunkMap.set(chunkIndex, chunk);
    });

    chunkMap.forEach((chunkSlabs) => {
      if (chunkSlabs.length === 0) {
        return;
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let minZ = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let maxZ = Number.NEGATIVE_INFINITY;

      chunkSlabs.forEach((slab) => {
        minX = Math.min(minX, slab.position.x - slab.dimensions.width / 2);
        maxX = Math.max(maxX, slab.position.x + slab.dimensions.width / 2);
        minY = Math.min(minY, slab.position.y - slab.dimensions.height / 2);
        maxY = Math.max(maxY, slab.position.y + slab.dimensions.height / 2);
        minZ = Math.min(minZ, slab.position.z - slab.dimensions.depth / 2);
        maxZ = Math.max(maxZ, slab.position.z + slab.dimensions.depth / 2);
      });

      const width = Math.max(0.2, maxX - minX);
      const height = Math.max(0.2, maxY - minY);
      const depth = Math.max(0.2, maxZ - minZ);
      const geometry = new BoxGeometry(width, height, depth);
      const material = new MeshStandardMaterial({
        color: new Color("#7b5a39"),
        emissive: new Color("#15100a"),
        metalness: 0.02,
        roughness: 0.96,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      this.archivedGroup.add(mesh);
      this.archivedChunkCount += 1;
    });
  }

  private getPerformanceSnapshot(): PerformanceSnapshot {
    return {
      qualityPreset: this.activeQualityPreset,
      requestedPreset: toQualityPreset(this.debugConfig.performanceQualityPreset),
      autoQualityEnabled: this.debugConfig.performanceAutoQualityEnabled,
      frameTimeMs: this.frameTimeMs,
      averageFrameTimeMs: this.averageFrameTimeMs,
      frameBudgetMs: this.debugConfig.performanceFrameBudgetMs,
      activeObjects:
        this.stackGroup.children.length +
        this.archivedGroup.children.length +
        this.debrisGroup.children.length +
        this.collapseVoxelGroup.children.length,
      visibleSlabs: this.stackGroup.children.length,
      archivedSlabs: this.archivedLevelSet.size,
      archivedChunks: this.archivedChunkCount,
      debrisActive: this.debrisPieces.length,
      debrisPooled: this.debrisPool.length,
      distractionLod: { ...this.distractionLod },
    };
  }

  private applyDebugConfig(config: DebugConfig): void {
    const previousConfig = this.debugConfig;
    this.debugConfig = clampDebugConfig(config);
    this.gridHelper.visible = this.debugConfig.gridVisible;
    this.feedbackManager.updateConfig({
      audioEnabled: this.debugConfig.feedbackAudioEnabled,
      hapticsEnabled: this.debugConfig.feedbackHapticsEnabled,
    });

    if (previousConfig.comboTarget !== this.debugConfig.comboTarget) {
      this.combo = {
        ...this.combo,
        target: this.debugConfig.comboTarget,
        rewardReady: this.combo.current >= this.debugConfig.comboTarget,
      };
    }

    const integrityConfigChanged =
      previousConfig.integrityPrecariousThreshold !== this.debugConfig.integrityPrecariousThreshold ||
      previousConfig.integrityUnstableThreshold !== this.debugConfig.integrityUnstableThreshold ||
      previousConfig.integrityWobbleStrength !== this.debugConfig.integrityWobbleStrength;

    if (integrityConfigChanged) {
      this.refreshIntegrityTelemetry();
    }

    this.distractionState = updateDistractionState(
      this.distractionState,
      0,
      this.landedSlabs.length - 1,
      this.debugConfig,
    );
    this.updateDistractionActors();

    if (!this.debugConfig.performanceAutoQualityEnabled) {
      this.activeQualityPreset = toQualityPreset(this.debugConfig.performanceQualityPreset);
    }

    this.debugPanel.querySelectorAll<HTMLInputElement>("[data-debug-key]").forEach((input) => {
      const key = input.dataset.debugKey as keyof DebugConfig | undefined;
      if (!key) {
        return;
      }

      if (input.type === "checkbox") {
        const toggleKey = key as DebugToggleKey;
        input.checked = this.debugConfig[toggleKey];
      } else {
        input.value = String(this.debugConfig[key] as number);
      }
    });

    const dimensionsChanged =
      previousConfig.baseWidth !== this.debugConfig.baseWidth ||
      previousConfig.baseDepth !== this.debugConfig.baseDepth ||
      previousConfig.slabHeight !== this.debugConfig.slabHeight;

    const prebuiltLevelsChanged = previousConfig.prebuiltLevels !== this.debugConfig.prebuiltLevels;

    const performanceStructureChanged =
      previousConfig.performanceQualityPreset !== this.debugConfig.performanceQualityPreset ||
      previousConfig.archivalKeepRecentLevels !== this.debugConfig.archivalKeepRecentLevels ||
      previousConfig.archivalChunkSize !== this.debugConfig.archivalChunkSize;

    if (dimensionsChanged || prebuiltLevelsChanged) {
      const wasPlaying = this.gameState === "playing";
      this.resetWorld();

      if (wasPlaying) {
        this.gameState = "playing";
        this.spawnNextActive();
        this.statusMessage = "Debug dimensions updated.";
      } else {
        this.gameState = "idle";
        this.statusMessage = "Adjust the starting stack or timing window, then start a new run.";
      }

      return;
    }

    if (performanceStructureChanged) {
      this.syncArchivedRepresentation();
    }
  }

  private renderHud(): void {
    const overlay = this.hud.querySelector<HTMLElement>(".overlay");
    this.scoreValue.textContent = String(this.score);
    this.heightValue.textContent = `${Math.max(0, this.landedSlabs.length - this.startingStackLevels)} floors`;
    this.comboValue.textContent = `${this.combo.current}/${this.combo.target}`;
    this.messageValue.textContent = this.statusMessage;
    const perf = this.getPerformanceSnapshot();
    this.perfValue.textContent = `${perf.qualityPreset.toUpperCase()} ${perf.averageFrameTimeMs.toFixed(1)}ms avg · objs ${perf.activeObjects} · slabs ${perf.visibleSlabs}/${perf.archivedSlabs}a · debris ${perf.debrisActive}/${perf.debrisPooled}p`;

    if (this.gameState === "playing") {
      this.overlayTitle.textContent = "Tower Live";
      this.overlayBody.textContent =
        "Stop each moving slab before it misses. Perfect placements preserve the footprint; partial overlaps trim it permanently.";
      this.primaryButton.textContent = "Return To Title";
      this.primaryButton.style.display = "none";
      overlay?.classList.add("overlay--hidden");
    } else if (this.gameState === "game_over") {
      this.overlayTitle.textContent = "Tower Fell";
      this.overlayBody.textContent =
        "A hard miss triggers the collapse sequence. Press space/enter, click, or tap to immediately start a fresh run.";
      this.primaryButton.style.display = "none";
      overlay?.classList.remove("overlay--hidden");
    } else {
      this.overlayTitle.textContent = "Tower Stacker";
      this.overlayBody.textContent =
        "Playable milestone: alternating X/Z movement, permanent trimming, collapse fail sequence, and runtime performance archival/LOD tuning are active.";
      this.primaryButton.textContent = "Start Run";
      this.primaryButton.style.display = "none";
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

      const integerKeys: DebugNumberKey[] = [
        "prebuiltLevels",
        "comboTarget",
        "recoverySlowdownPlacements",
        "performanceQualityPreset",
        "archivalKeepRecentLevels",
        "archivalChunkSize",
        "lodNearDistance",
        "lodFarDistance",
        "maxActiveDebris",
        "debrisPoolLimit",
      ];

      node.textContent = integerKeys.includes(key)
        ? String(this.debugConfig[key])
        : `${this.debugConfig[key].toFixed(2)}`;
    });
  }

  private setActiveOffset(offset: number): boolean {
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
      setActiveOffset: (offset) => this.setActiveOffset(offset),
      placeAtOffset: (offset) => {
        if (!this.setActiveOffset(offset)) {
          return null;
        }

        this.stopActiveSlab();
        return this.lastPlacementOutcome;
      },
      getState: () => this.getPublicState(),
    };
  }

  private getPublicState(): PublicGameState {
    const feedback = this.feedbackManager.getSnapshot();
    const distractionSnapshot = this.getEffectiveDistractionSnapshot();

    return {
      gameState: this.gameState,
      score: this.score,
      height: Math.max(0, this.landedSlabs.length - this.startingStackLevels),
      level: this.landedSlabs.length - 1,
      activeAxis: this.activeSlab?.axis ?? null,
      activePosition: this.activeSlab
        ? {
            x: this.activeSlab.position.x,
            y: this.activeSlab.position.y,
            z: this.activeSlab.position.z,
          }
        : null,
      lastPlacementOutcome: this.lastPlacementOutcome,
      topDimensions: this.landedSlabs.length > 0 ? { ...this.landedSlabs[this.landedSlabs.length - 1]!.dimensions } : null,
      combo: {
        current: this.combo.current,
        best: this.combo.best,
        target: this.combo.target,
        rewardReady: this.combo.rewardReady,
      },
      recovery: {
        rewardsEarned: this.recovery.rewardsEarned,
        slowdownPlacementsRemaining: this.recovery.slowdownPlacementsRemaining,
        speedMultiplier: getRecoverySpeedMultiplier(this.recovery, this.debugConfig.recoverySlowdownFactor),
      },
      feedback,
      distractions: {
        enabled: distractionSnapshot.enabled,
        level: distractionSnapshot.level,
        active: { ...distractionSnapshot.active },
        signals: { ...distractionSnapshot.signals },
        visuals: {
          gorillaOpacity: Number(this.gorillaActor.style.opacity || 0),
          ufoOpacity: Number(this.ufoActor.style.opacity || 0),
          cloudOpacity: Number(this.cloudLayer.style.opacity || 0),
          contrastOpacity: Number(this.shell.style.getPropertyValue("--contrast-alpha") || 0),
          tremorStrength: distractionSnapshot.active.tremor ? distractionSnapshot.signals.tremor : 0,
        },
      },
      integrity: {
        tier: this.integrityTelemetry.tier,
        normalizedOffset: this.integrityTelemetry.normalizedOffset,
        wobbleStrength: this.integrityTelemetry.wobbleStrength,
        centerOfMass: { ...this.integrityTelemetry.centerOfMass },
        topCenter: { ...this.integrityTelemetry.topCenter },
        offset: { ...this.integrityTelemetry.offset },
      },
      collapse: {
        active: this.collapseSequence !== null && this.collapseProgress < 1,
        trigger: this.collapseSequence?.trigger ?? null,
        progress: this.collapseProgress,
        cameraPullback: this.collapseCameraPullback,
        completed: this.collapseSequence !== null && this.collapseProgress >= 1,
      },
      performance: this.getPerformanceSnapshot(),
      debugConfig: { ...this.debugConfig },
      testMode: {
        enabled: this.testMode.enabled,
        paused: this.simulationPaused,
        fixedStepSeconds: this.testMode.fixedStepSeconds,
        seed: this.testMode.seed,
      },
    };
  }

  private refreshIntegrityTelemetry(): void {
    this.integrityTelemetry = resolveIntegrityTelemetry(
      this.landedSlabs,
      {
        precarious: this.debugConfig.integrityPrecariousThreshold,
        unstable: this.debugConfig.integrityUnstableThreshold,
      },
      this.debugConfig.integrityWobbleStrength,
    );
  }

  private createSlabMesh(slab: SlabData, isTop: boolean): Mesh {
    const geometry = new BoxGeometry(slab.dimensions.width, slab.dimensions.height, slab.dimensions.depth);
    const material = new MeshStandardMaterial({
      color: this.getSlabColor(slab.level),
      emissive: this.getSlabEmissive(slab.level),
      metalness: 0.12,
      roughness: 0.82,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(slab.position.x, slab.position.y, slab.position.z);

    if (!isTop) {
      this.decorateSlabWithWindows(mesh, slab);
      this.decorateSlabWithEaves(mesh, slab);
    }

    return mesh;
  }

  private createWindowTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) {
      const fallbackTexture = new CanvasTexture(canvas);
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#cfd9e8";
    context.fillRect(5, 2, 54, 124);

    context.fillStyle = "#24384f";
    context.fillRect(12, 8, 40, 112);

    context.fillStyle = "rgba(182, 206, 228, 0.52)";
    context.fillRect(16, 11, 5, 106);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createEavesTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 40;
    const context = canvas.getContext("2d");
    if (!context) {
      const fallbackTexture = new CanvasTexture(canvas);
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const radius = 8.5;
    const step = 11.5;
    const centerY = 0;

    context.fillStyle = "rgba(255, 255, 255, 0.98)";
    for (let x = -12; x <= canvas.width + 14; x += step) {
      const centerX = x + step / 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI, false);
      context.closePath();
      context.fill();
    }

    context.strokeStyle = "rgba(232, 232, 232, 0.98)";
    context.lineWidth = 1.2;
    for (let x = -12; x <= canvas.width + 14; x += step) {
      const centerX = x + step / 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0.04, Math.PI - 0.04, false);
      context.stroke();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private decorateSlabWithWindows(mesh: Mesh, slab: SlabData): void {
    if (slab.dimensions.height < 0.9) {
      return;
    }

    const windowHeight = Math.max(0.48, Math.min(0.86, slab.dimensions.height * 0.32));
    const windowWidth = Math.max(0.13, windowHeight * 0.34);
    const elevationY = Math.min(slab.dimensions.height * 0.18, slab.dimensions.height / 2 - windowHeight / 2 - 0.04);
    const windowMaterial = new MeshStandardMaterial({
      color: new Color("#dce4f2"),
      emissive: new Color("#38506a"),
      emissiveIntensity: 0.22,
      metalness: 0.03,
      roughness: 0.72,
      map: this.windowTexture,
      transparent: true,
      opacity: 0.96,
      side: DoubleSide,
      depthWrite: false,
    });

    const faces: Array<{
      span: number;
      createPosition: (offset: number) => { x: number; y: number; z: number };
      rotationY: number;
    }> = [
      {
        span: slab.dimensions.depth,
        createPosition: (offset) => ({ x: slab.dimensions.width / 2 + 0.025, y: elevationY, z: offset }),
        rotationY: -Math.PI / 2,
      },
      {
        span: slab.dimensions.depth,
        createPosition: (offset) => ({ x: -(slab.dimensions.width / 2 + 0.025), y: elevationY, z: offset }),
        rotationY: Math.PI / 2,
      },
      {
        span: slab.dimensions.width,
        createPosition: (offset) => ({ x: offset, y: elevationY, z: slab.dimensions.depth / 2 + 0.025 }),
        rotationY: 0,
      },
      {
        span: slab.dimensions.width,
        createPosition: (offset) => ({ x: offset, y: elevationY, z: -(slab.dimensions.depth / 2 + 0.025) }),
        rotationY: Math.PI,
      },
    ];

    faces.forEach((face) => {
      const windowCount = Math.max(1, Math.min(5, Math.round(face.span / 1.25)));
      const spacing = face.span / (windowCount + 1);

      for (let index = 0; index < windowCount; index += 1) {
        const localOffset = -face.span / 2 + spacing * (index + 1);
        const windowMesh = new Mesh(new PlaneGeometry(windowWidth, windowHeight), windowMaterial.clone());
        const position = face.createPosition(localOffset);
        windowMesh.position.set(position.x, position.y, position.z);
        windowMesh.rotation.y = face.rotationY;
        mesh.add(windowMesh);
      }
    });
  }

  private decorateSlabWithEaves(mesh: Mesh, slab: SlabData): void {
    if (slab.dimensions.height < 0.9 || !this.shouldRenderEavesForSlab(slab.level)) {
      return;
    }

    const eaveHeight = Math.max(0.28, Math.min(0.56, slab.dimensions.height * 0.18));
    const elevationY = slab.dimensions.height / 2 - eaveHeight * 0.32;

    const faces: Array<{
      span: number;
      createPosition: () => { x: number; y: number; z: number };
      rotationY: number;
      faceIndex: number;
    }> = [
      {
        span: slab.dimensions.depth,
        createPosition: () => ({ x: slab.dimensions.width / 2 + 0.028, y: elevationY, z: 0 }),
        rotationY: -Math.PI / 2,
        faceIndex: 0,
      },
      {
        span: slab.dimensions.depth,
        createPosition: () => ({ x: -(slab.dimensions.width / 2 + 0.028), y: elevationY, z: 0 }),
        rotationY: Math.PI / 2,
        faceIndex: 1,
      },
      {
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: slab.dimensions.depth / 2 + 0.028 }),
        rotationY: 0,
        faceIndex: 2,
      },
      {
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: -(slab.dimensions.depth / 2 + 0.028) }),
        rotationY: Math.PI,
        faceIndex: 3,
      },
    ];

    const chosenFaces = faces.filter((face) => this.sampleDecorNoise(slab.level, face.faceIndex + 0.91) > 0.42);
    const finalFaces = chosenFaces.length > 0 ? chosenFaces : [faces[Math.floor(this.sampleDecorNoise(slab.level, 8.14) * faces.length)]!];

    const slabBaseColor = new Color(this.getSlabColor(slab.level));
    const eaveColor = slabBaseColor.clone().offsetHSL(0, -0.08, -0.06);
    const eaveEmissive = new Color(this.getSlabEmissive(slab.level)).multiplyScalar(0.72);

    finalFaces.forEach((face) => {
      const material = new MeshStandardMaterial({
        color: eaveColor,
        emissive: eaveEmissive,
        emissiveIntensity: 0.16,
        metalness: 0.02,
        roughness: 0.74,
        map: this.eavesTexture,
        transparent: true,
        opacity: 0.93,
        side: DoubleSide,
        depthWrite: false,
      });

      const eave = new Mesh(new PlaneGeometry(Math.max(0.5, face.span * 0.98), eaveHeight), material);
      const position = face.createPosition();
      eave.position.set(position.x, position.y, position.z);
      eave.rotation.y = face.rotationY;
      mesh.add(eave);
    });
  }

  private shouldRenderEavesForSlab(level: number): boolean {
    return this.sampleDecorNoise(level, 0.17) > 0.36;
  }

  private sampleDecorNoise(level: number, salt: number): number {
    const value = Math.sin(level * 12.9898 + salt * 78.233) * 43758.5453123;
    return value - Math.floor(value);
  }

  private getSlabColor(level: number): string {
    const hue = (42 + level * 31) % 360;
    return new Color().setHSL(hue / 360, 0.72, 0.67).getStyle();
  }

  private getSlabEmissive(level: number): string {
    const hue = (42 + level * 31) % 360;
    return new Color().setHSL(hue / 360, 0.58, 0.16).getStyle();
  }

  private spawnCollapseVoxels(): void {
    this.clearGroup(this.collapseVoxelGroup, true);
    this.collapseVoxels = [];

    const random = this.seededRandom ?? Math.random;
    const topSlab = this.landedSlabs[this.landedSlabs.length - 1];
    const topCenter = topSlab?.position ?? { x: 0, y: 0, z: 0 };

    for (let slabIndex = 0; slabIndex < this.landedSlabs.length; slabIndex += 1) {
      const slab = this.landedSlabs[slabIndex]!;
      const xCount = Math.max(1, Math.min(5, Math.round(slab.dimensions.width / COLLAPSE_VOXEL_SIZE)));
      const yCount = Math.max(1, Math.min(2, Math.round(slab.dimensions.height / COLLAPSE_VOXEL_SIZE)));
      const zCount = Math.max(1, Math.min(5, Math.round(slab.dimensions.depth / COLLAPSE_VOXEL_SIZE)));
      const cellWidth = slab.dimensions.width / xCount;
      const cellHeight = slab.dimensions.height / yCount;
      const cellDepth = slab.dimensions.depth / zCount;

      for (let xIndex = 0; xIndex < xCount; xIndex += 1) {
        for (let yIndex = 0; yIndex < yCount; yIndex += 1) {
          for (let zIndex = 0; zIndex < zCount; zIndex += 1) {
            if (this.collapseVoxels.length >= COLLAPSE_VOXEL_MAX_COUNT) {
              return;
            }

            const centerX = slab.position.x - slab.dimensions.width / 2 + cellWidth * (xIndex + 0.5);
            const centerY = slab.position.y - slab.dimensions.height / 2 + cellHeight * (yIndex + 0.5);
            const centerZ = slab.position.z - slab.dimensions.depth / 2 + cellDepth * (zIndex + 0.5);
            const mesh = new Mesh(
              new BoxGeometry(Math.max(0.12, cellWidth * 0.92), Math.max(0.12, cellHeight * 0.92), Math.max(0.12, cellDepth * 0.92)),
              new MeshStandardMaterial({
                color: this.getSlabColor(slab.level),
                emissive: this.getSlabEmissive(slab.level),
                metalness: 0.08,
                roughness: 0.86,
              }),
            );
            mesh.position.set(centerX, centerY, centerZ);
            this.collapseVoxelGroup.add(mesh);

            const burstDirection = new Vector3(centerX - topCenter.x, centerY - topCenter.y, centerZ - topCenter.z);
            if (burstDirection.lengthSq() < 1e-6) {
              burstDirection.set((random() - 0.5) * 0.2, 1, (random() - 0.5) * 0.2);
            }
            burstDirection.normalize();
            const speed = 3.8 + random() * 3.1;

            this.collapseVoxels.push({
              mesh,
              velocity: {
                x: burstDirection.x * speed,
                y: Math.max(2.8, burstDirection.y * speed + 2.6),
                z: burstDirection.z * speed,
              },
              angularVelocity: {
                x: (random() - 0.5) * 7,
                y: (random() - 0.5) * 7,
                z: (random() - 0.5) * 7,
              },
              remainingLifetime: COLLAPSE_VOXEL_LIFETIME_SECONDS,
            });
          }
        }
      }
    }
  }

  private spawnDebris(slab: SlabData, axis: SlabData["axis"], fullMiss: boolean): void {
    const mesh = this.getOrCreateDebrisMesh();
    const towerTop = this.landedSlabs[this.landedSlabs.length - 1];

    const pushSign = axis === "x"
      ? Math.sign(slab.position.x - (towerTop?.position.x ?? 0)) || Math.sign(slab.position.x || 1) || 1
      : Math.sign(slab.position.z - (towerTop?.position.z ?? 0)) || Math.sign(slab.position.z || 1) || 1;

    const pushClearance = axis === "x"
      ? ((towerTop?.dimensions.width ?? this.debugConfig.baseWidth) + slab.dimensions.width) / 2 + 0.08
      : ((towerTop?.dimensions.depth ?? this.debugConfig.baseDepth) + slab.dimensions.depth) / 2 + 0.08;

    const startX = axis === "x" ? (towerTop?.position.x ?? slab.position.x) + pushSign * pushClearance : slab.position.x;
    const startZ = axis === "z" ? (towerTop?.position.z ?? slab.position.z) + pushSign * pushClearance : slab.position.z;

    mesh.position.set(startX, slab.position.y, startZ);
    mesh.scale.set(slab.dimensions.width, slab.dimensions.height, slab.dimensions.depth);
    mesh.visible = true;

    if (mesh.material instanceof MeshStandardMaterial) {
      mesh.material.color.set(this.getSlabColor(slab.level));
      mesh.material.emissive.set(this.getSlabEmissive(slab.level));
    }

    this.debrisGroup.add(mesh);

    const lateral = fullMiss ? 4.7 : 3.1;
    const xVelocity = axis === "x" ? pushSign * lateral : 0;
    const zVelocity = axis === "z" ? pushSign * lateral : 0;

    this.debrisPieces.push({
      mesh,
      velocity: { x: xVelocity, y: 1.8, z: zVelocity },
      angularVelocity: {
        x: 0,
        y: 0,
        z: 0,
      },
      remainingLifetime: this.debugConfig.debrisLifetime,
    });

    const scalars = getQualityScalars(this.activeQualityPreset);
    const maxActiveDebris = Math.max(1, Math.round(this.debugConfig.maxActiveDebris * scalars.maxDebrisMultiplier));
    while (this.debrisPieces.length > maxActiveDebris) {
      const piece = this.debrisPieces.shift();
      if (!piece) {
        break;
      }
      this.recycleDebrisMesh(piece.mesh);
    }
  }

  private getOrCreateDebrisMesh(): Mesh {
    const pooled = this.debrisPool.pop();
    if (pooled) {
      return pooled;
    }

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({
      color: new Color("#f0c970"),
      emissive: new Color("#41270f"),
      metalness: 0.08,
      roughness: 0.88,
    });
    return new Mesh(geometry, material);
  }

  private recycleDebrisMesh(mesh: Mesh): void {
    this.debrisGroup.remove(mesh);
    mesh.visible = false;
    mesh.rotation.set(0, 0, 0);
    const poolLimit = Math.max(0, this.debugConfig.debrisPoolLimit);
    if (this.debrisPool.length < poolLimit) {
      this.debrisPool.push(mesh);
      return;
    }

    mesh.geometry.dispose();
    if (mesh.material instanceof MeshStandardMaterial) {
      mesh.material.dispose();
    }
  }

  private clearGroup(group: Group, disposeMeshes = false): void {
    while (group.children.length > 0) {
      const child = group.children[0]!;
      group.remove(child);
      if (disposeMeshes) {
        this.disposeObject3DMeshes(child);
      }
    }
  }

  private disposeObject3DMeshes(node: Object3D): void {
    node.children.forEach((child) => {
      this.disposeObject3DMeshes(child);
    });

    if (node instanceof Mesh) {
      node.geometry.dispose();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material.dispose());
      } else if (node.material instanceof MeshStandardMaterial) {
        node.material.dispose();
      }
    }
  }

  private createRenderer(): WebGLRenderer | null {
    try {
      const renderer = new WebGLRenderer({
        antialias: true,
        canvas: this.canvas,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, getQualityScalars(this.activeQualityPreset).pixelRatioCap));
      renderer.setClearColor(new Color("#07101c"));
      return renderer;
    } catch (error) {
      console.warn("WebGL renderer unavailable; continuing in fallback mode.", error);
      this.canvas.dataset.renderer = "fallback";
      return null;
    }
  }
}
