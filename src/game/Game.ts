import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { clampDebugConfig, defaultDebugConfig } from "./debugConfig";
import { FeedbackManager } from "./FeedbackManager";
import { getFailureFeedbackPlan, getPlacementFeedbackPlan } from "./logic/feedback";
import {
  FACE_ROTATION,
  filterFacesByVisibility,
  resolveEaveCornerSealSize,
  resolveEaveWidth,
  resolveSlabHue,
  resolveTentaclePalette,
  resolveTentacleSegmentOffset,
  resolveWindowCountNoise,
  resolveWindowMetrics,
  resolveWindowShutterPalette,
  sampleDecorNoise,
  shouldRenderWeathering,
  shouldUseDarkWindowTrim,
} from "./logic/decor";
import { advanceOscillation } from "./logic/oscillation";
import { samplePlacementCameraShake, sampleTremorCameraShake } from "./logic/cameraEffects";
import { sampleDayNightFrame } from "./logic/dayNight";
import { createDistractionState, updateDistractionState } from "./logic/distractions";
import {
  advanceCollapseSequence,
  createCollapseSequence,
  resolveSupplementalCollapseBurstSlabs,
  sampleCollapseFrame,
} from "./logic/collapse";
import { createCollapseVoxelSeeds, isProjectedSlabNearViewport } from "./logic/collapseVoxels";
import {
  collectArchivableLevels,
  getQualityScalars,
  resolveAdaptiveQualityPreset,
  selectDistractionLodTier,
  shouldUpdateForLod,
  toQualityPreset,
} from "./logic/performance";
import { resolveIntegrityTelemetry } from "./logic/integrity";
import { LEDGE_ANIMATION_DURATION_SECONDS, resolveLedgeDimensions, resolveLedgeFaceIndex, sampleLedgeAnimationScaleX } from "./logic/ledges";
import {
  getWindowHorizontalOffsets,
  resolveTentacleOutDepth,
  resolveWindowCountForFace,
  resolveWindowOutDepth,
  resolveWindowStyle,
  shouldRenderWindowsForFace,
} from "./logic/windows";
import {
  UFO_ORBIT_ANGULAR_SPEED,
  canForceDistractionChannel,
  createDistractionTimerRecord,
  getUfoOrbitDurationSeconds,
  readTestModeOptions,
  tickDistractionTimerRecord,
} from "./logic/runtime";
import { resolveFacadeStyle } from "./logic/facade";
import { sampleGorillaClimbPosition } from "./logic/gorilla";
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
import type { WindowStyle } from "./logic/windows";
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
  | "distractionBatEnabled"
  | "distractionContrastEnabled"
  | "distractionCloudEnabled"
  | "distractionFireworksEnabled"
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

interface LedgeAnimation {
  mesh: Mesh;
  elapsedSeconds: number;
  durationSeconds: number;
  targetScaleX: number;
}

interface WindowFaceDescriptor {
  span: number;
  createPosition: (offset: number, outDepth: number) => { x: number; y: number; z: number };
  rotationY: number;
  noiseSalt: number;
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
    bat: DistractionLodTier;
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
  distractionBatStartLevel: { min: 0, max: 120, step: 1, label: "Bat Start" },
  distractionCloudStartLevel: { min: 0, max: 120, step: 1, label: "Cloud Start" },
  distractionFireworksStartLevel: { min: 0, max: 120, step: 1, label: "Fireworks Start" },
  dayNightCycleBlocks: { min: 4, max: 80, step: 1, label: "Day/Night Blocks" },
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
  tremorShakeAmount: { min: 0, max: 3, step: 0.05, label: "Tremor Y Shake" },
};

const CAMERA_X = 8;
const DEBUG_TOGGLE_META: Record<DebugToggleKey, { label: string }> = {
  gridVisible: { label: "Grid Visible" },
  feedbackAudioEnabled: { label: "Audio Feedback" },
  feedbackHapticsEnabled: { label: "Haptics Feedback" },
  distractionsEnabled: { label: "Distractions Enabled" },
  distractionTentacleEnabled: { label: "Tentacle Layer" },
  distractionGorillaEnabled: { label: "Gorilla Layer" },
  distractionTremorEnabled: { label: "Tremor Pulse" },
  distractionUfoEnabled: { label: "UFO Layer" },
  distractionBatEnabled: { label: "Bat Layer" },
  distractionContrastEnabled: { label: "Contrast Wash" },
  distractionCloudEnabled: { label: "Cloud Occlusion" },
  distractionFireworksEnabled: { label: "Fireworks" },
  performanceAutoQualityEnabled: { label: "Auto Quality" },
};

const DEBUG_DISTRACTION_CHANNELS: DistractionChannel[] = [
  "tentacle",
  "gorilla",
  "tremor",
  "ufo",
  "bat",
  "contrastWash",
  "clouds",
  "fireworks",
];
const DEBUG_DISTRACTION_LAUNCH_DURATION_SECONDS = 6;
const UFO_EXIT_DURATION_SECONDS = 1.15;
const UFO_MIN_EXIT_SPEED_WORLD_UNITS_PER_SECOND = 6.8;
const GORILLA_CLIMB_SPEED = 0.7;
const GORILLA_SLAM_CYCLE_SPEED = 0.62;
const GORILLA_SLAM_DURATION_SECONDS = 0.2;
const STACK_LOOK_AHEAD_Y = 1.05;
const STARTUP_CAMERA_LIFT = 2.2;
const DAY_NIGHT_COLOR_LERP_SPEED = 3.2;
const DAY_NIGHT_STAR_LERP_SPEED = 4.2;
const DAY_NIGHT_NOON_FLARE_LERP_SPEED = 3.8;
const DAY_NIGHT_STAR_MAX_OPACITY = 1;
const DAY_NIGHT_NOON_FLARE_MAX_OPACITY = 0.92;
const STARTUP_CAMERA_LIFT_FADE_FLOORS = 10;
const PLACEMENT_SHAKE_DURATION_SECONDS = 0.16;
const COLLAPSE_VOXEL_SIZE = 0.38;
const COLLAPSE_VOXEL_LIFETIME_SECONDS = 2.2;
const COLLAPSE_VOXEL_MAX_COUNT = 2200;
const TENTACLE_SIDE_SWITCH_SPEED = 0.75;
const TENTACLE_BURST_CHANCE = 0.5;
const TENTACLE_EXTENSION_MULTIPLIER = 1.75;
const TENTACLE_MAX_PERSISTED_BURSTS = 32;
const TENTACLE_WAVE_SPEED = 5.8;
const DEBUG_DISTRACTION_BUTTON_META: Record<DistractionChannel, { label: string }> = {
  tentacle: { label: "Tentacle" },
  gorilla: { label: "Gorilla" },
  tremor: { label: "Tremor" },
  ufo: { label: "UFO" },
  bat: { label: "Bat" },
  contrastWash: { label: "Contrast" },
  clouds: { label: "Clouds" },
  fireworks: { label: "Fireworks" },
};

declare global {
  interface Window {
    __towerStackerTestApi?: TestApi;
  }
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
  private readonly batActor: HTMLDivElement;
  private readonly cloudLayer: HTMLDivElement;
  private readonly fireworksActor: HTMLDivElement;
  private readonly tremorPulse: HTMLDivElement;
  private readonly noonFlare: HTMLDivElement;

  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly renderer: WebGLRenderer | null;
  private readonly stackGroup = new Group();
  private readonly archivedGroup = new Group();
  private readonly debrisGroup = new Group();
  private readonly collapseVoxelGroup = new Group();
  private readonly tentacleGroup = new Group();
  private readonly gridHelper = new GridHelper(28, 28, 0xd8b162, 0x28425f);
  private readonly ambientLight = new AmbientLight(0xffffff, 1.8);
  private readonly directionalLight = new DirectionalLight(0xfff0c8, 2.2);

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
  private ledgeAnimations: LedgeAnimation[] = [];
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
  private readonly dayNightTargetSkyColor = new Color("#07101c");
  private readonly dayNightStarSmallMaterial = new PointsMaterial({
    color: "#f6fbff",
    vertexColors: true,
    transparent: true,
    opacity: 0,
    size: 1.6,
    sizeAttenuation: false,
    depthWrite: false,
  });
  private readonly dayNightStarMediumMaterial = new PointsMaterial({
    color: "#f6fbff",
    vertexColors: true,
    transparent: true,
    opacity: 0,
    size: 2.4,
    sizeAttenuation: false,
    depthWrite: false,
  });
  private readonly dayNightStarLargeMaterial = new PointsMaterial({
    color: "#f6fbff",
    vertexColors: true,
    transparent: true,
    opacity: 0,
    size: 3.4,
    sizeAttenuation: false,
    depthWrite: false,
  });
  private readonly starFieldSmall = this.createStarField(220, this.dayNightStarSmallMaterial, -34, -10);
  private readonly starFieldMedium = this.createStarField(130, this.dayNightStarMediumMaterial, -30, -8);
  private readonly starFieldLarge = this.createStarField(65, this.dayNightStarLargeMaterial, -26, -6);
  private activeQualityPreset: QualityPreset = toQualityPreset(defaultDebugConfig.performanceQualityPreset);
  private archivedLevelSet = new Set<number>();
  private archivedChunkCount = 0;
  private distractionLod: PerformanceSnapshot["distractionLod"] = {
    gorilla: "high",
    ufo: "high",
    bat: "high",
    clouds: "high",
    tremor: "high",
  };
  private statusMessage = "Line up the moving slab and keep the tower alive.";
  private introExitTimeoutId: number | null = null;
  private introHideTimeoutId: number | null = null;
  private readonly windowTexture = this.createWindowTexture();
  private readonly eavesTexture = this.createEavesTexture();
  private readonly weatheringTexture = this.createWeatheringTexture();
  private readonly brickTexture = this.createBrickTexture();
  private readonly sidingTexture = this.createSidingTexture();
  private cloudWorldAnchors: Vector3[] = [new Vector3(), new Vector3(), new Vector3()];
  private cloudSpawnFromTop: boolean[] = [false, false, false];
  private cloudAnchorsInitialized = false;
  private tentacleBurstKeys: string[] = [];

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
    this.batActor = document.createElement("div");
    this.cloudLayer = document.createElement("div");
    this.fireworksActor = document.createElement("div");
    this.tremorPulse = document.createElement("div");
    this.noonFlare = document.createElement("div");
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
    this.starFieldSmall.position.set(0, 0, -64);
    this.starFieldMedium.position.set(0, 0, -64);
    this.starFieldLarge.position.set(0, 0, -64);
    this.camera.add(this.starFieldSmall, this.starFieldMedium, this.starFieldLarge);
    this.scene.add(this.camera);
    this.scene.add(
      this.stackGroup,
      this.archivedGroup,
      this.debrisGroup,
      this.collapseVoxelGroup,
      this.tentacleGroup,
      this.gridHelper,
    );

    this.directionalLight.position.set(10, 18, 12);
    this.scene.add(this.ambientLight, this.directionalLight);
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

    this.batActor.className = "distraction-actor distraction-actor--bat";
    this.batActor.dataset.testid = "actor-bat";

    this.cloudLayer.className = "distraction-clouds";
    this.cloudLayer.dataset.testid = "actor-clouds";
    for (let index = 0; index < 3; index += 1) {
      const cloud = document.createElement("span");
      cloud.className = "distraction-cloud";
      this.cloudLayer.append(cloud);
    }

    this.fireworksActor.className = "distraction-fireworks";
    this.fireworksActor.dataset.testid = "actor-fireworks";
    this.fireworksActor.innerHTML = "<span class=\"distraction-fireworks__burst\"></span>";

    this.tremorPulse.className = "distraction-tremor";
    this.tremorPulse.dataset.testid = "actor-tremor";

    this.noonFlare.className = "distraction-noon-flare";
    this.noonFlare.dataset.testid = "actor-noon-flare";

    this.distractionLayer.append(
      this.noonFlare,
      this.gorillaActor,
      this.ufoActor,
      this.batActor,
      this.cloudLayer,
      this.fireworksActor,
      this.tremorPulse,
    );
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
            "distractionBatStartLevel",
            "distractionFireworksStartLevel",
            "dayNightCycleBlocks",
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
    this.tickForcedDistractionTimers(deltaSeconds);
    this.tickGorillaSlam(deltaSeconds);
    this.refreshQualityPreset();
    this.updateDistractions(deltaSeconds);
    this.updateDistractionActors();
    this.updateDayNightCycle(deltaSeconds);
    this.updateActiveSlab(deltaSeconds);
    this.updateDebris(deltaSeconds);
    this.updateCollapseVoxels(deltaSeconds);
    this.updateLedgeAnimations(deltaSeconds);
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
    this.clearGroup(this.tentacleGroup, true);
    this.slabMeshes = new Map<number, Mesh>();
    this.archivedLevelSet = new Set<number>();
    this.archivedChunkCount = 0;
    this.debrisPieces = [];
    this.debrisPool = [];
    this.collapseVoxels = [];
    this.ledgeAnimations = [];
    this.activeMesh = null;
    this.activeSlab = null;
    this.oscillation = null;
    this.frameCounter = 0;
    this.frameTimeMs = 0;
    this.averageFrameTimeMs = 0;
    this.activeQualityPreset = toQualityPreset(this.debugConfig.performanceQualityPreset);
    this.cloudAnchorsInitialized = false;
    this.cloudSpawnFromTop = [false, false, false];
    this.tentacleBurstKeys = [];
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
    const initialFocusY =
      (topLandedSlab?.position.y ?? 0) +
      this.debugConfig.cameraFramingOffset +
      this.debugConfig.cameraYOffset +
      STARTUP_CAMERA_LIFT +
      STACK_LOOK_AHEAD_Y;
    const initialTargetY = initialFocusY + this.debugConfig.cameraHeight;
    this.cameraTargetPosition.set(CAMERA_X, initialTargetY, this.debugConfig.cameraDistance);
    this.cameraLookAtY = Math.max(1.2, initialFocusY);
  }

  private spawnNextActive(): void {
    const target = this.landedSlabs[this.landedSlabs.length - 1];
    if (!target) {
      return;
    }

    const activeSlab = spawnActiveSlab(target, this.debugConfig);
    this.activeSlab = activeSlab;

    const targetAxisPosition = activeSlab.axis === "x" ? target.position.x : target.position.z;
    const spawnOffset = activeSlab.axis === "x" ? activeSlab.position.x : activeSlab.position.z;

    this.oscillation = {
      axis: activeSlab.axis,
      center: targetAxisPosition,
      offset: spawnOffset,
      direction: activeSlab.direction,
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
      const missedSlab = this.activeSlab;
      const missOffset = {
        x: missedSlab.position.x - target.position.x,
        z: missedSlab.position.z - target.position.z,
      };
      const supplementalBurstSlabs = resolveSupplementalCollapseBurstSlabs("miss", {
        missedActiveSlab: missedSlab,
      });
      this.activeSlab = null;
      this.activeMesh = null;
      this.oscillation = null;
      this.lastPlacementOutcome = result.outcome;
      this.combo = updateComboState(this.combo, result.outcome);
      this.feedbackManager.play(getPlacementFeedbackPlan(result.outcome));
      this.beginCollapseSequence("miss", missOffset, supplementalBurstSlabs);
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

  private beginCollapseSequence(
    trigger: CollapseTrigger,
    offset: { x: number; z: number },
    additionalBurstSlabs: SlabData[] = [],
  ): void {
    this.collapseSequence = createCollapseSequence(trigger, offset, {
      durationSeconds: this.debugConfig.collapseDurationSeconds,
      tiltStrength: this.debugConfig.collapseTiltStrength,
      pullbackDistance: this.debugConfig.collapseCameraPullback,
      dropDistance: this.debugConfig.collapseDropDistance,
    });
    this.feedbackManager.play(getFailureFeedbackPlan(trigger));
    this.triggerImpactPulse(0.36);

    const debrisBurstSlabs = this.collectBurstSlabsFromActiveDebris();
    this.spawnCollapseVoxels([...additionalBurstSlabs, ...debrisBurstSlabs]);
    this.debrisPieces = [];
    this.clearGroup(this.debrisGroup, true);

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
    return getUfoOrbitDurationSeconds(this.debugConfig.distractionMotionSpeed);
  }

  private canForceDistractionChannel(channel: DistractionChannel): boolean {
    return canForceDistractionChannel(channel, this.debugConfig);
  }

  private tickForcedDistractionTimers(deltaSeconds: number): void {
    tickDistractionTimerRecord(this.forcedDistractionTimers, DEBUG_DISTRACTION_CHANNELS, deltaSeconds);
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

  private updateDayNightCycle(deltaSeconds: number): void {
    const builtFloors = Math.max(0, this.landedSlabs.length - this.startingStackLevels);
    const frame = sampleDayNightFrame(builtFloors, this.debugConfig.dayNightCycleBlocks);
    const blend = 1 - Math.exp(-Math.max(0, Math.min(0.2, deltaSeconds)) * DAY_NIGHT_COLOR_LERP_SPEED);

    this.dayNightTargetSkyColor.set(frame.skyTop);
    if (this.scene.background instanceof Color) {
      this.scene.background.lerp(this.dayNightTargetSkyColor, blend);
    } else {
      this.scene.background = this.dayNightTargetSkyColor.clone();
    }

    this.ambientLight.intensity += (frame.ambientIntensity - this.ambientLight.intensity) * blend;
    this.directionalLight.intensity += (frame.directionalIntensity - this.directionalLight.intensity) * blend;

    const starBlend = 1 - Math.exp(-Math.max(0, Math.min(0.2, deltaSeconds)) * DAY_NIGHT_STAR_LERP_SPEED);
    const targetStarOpacity = frame.starVisibility * DAY_NIGHT_STAR_MAX_OPACITY;

    this.dayNightStarSmallMaterial.opacity += (targetStarOpacity * 0.6 - this.dayNightStarSmallMaterial.opacity) * starBlend;
    this.dayNightStarMediumMaterial.opacity += (targetStarOpacity * 0.85 - this.dayNightStarMediumMaterial.opacity) * starBlend;
    this.dayNightStarLargeMaterial.opacity += (targetStarOpacity - this.dayNightStarLargeMaterial.opacity) * starBlend;

    this.starFieldSmall.visible = this.dayNightStarSmallMaterial.opacity > 0.01;
    this.starFieldMedium.visible = this.dayNightStarMediumMaterial.opacity > 0.01;
    this.starFieldLarge.visible = this.dayNightStarLargeMaterial.opacity > 0.01;

    const flareBlend = 1 - Math.exp(-Math.max(0, Math.min(0.2, deltaSeconds)) * DAY_NIGHT_NOON_FLARE_LERP_SPEED);
    const targetFlareOpacity = frame.noonFlareStrength * DAY_NIGHT_NOON_FLARE_MAX_OPACITY;
    const currentFlareOpacity = Number.parseFloat(this.noonFlare.style.opacity || "0");
    const nextFlareOpacity = currentFlareOpacity + (targetFlareOpacity - currentFlareOpacity) * flareBlend;
    this.noonFlare.style.opacity = nextFlareOpacity.toFixed(3);
    this.updateNoonFlarePosition(nextFlareOpacity);
  }

  private updateNoonFlarePosition(flareOpacity: number): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    const focusSlab = this.landedSlabs[this.landedSlabs.length - 1] ?? this.activeSlab;
    if (!focusSlab) {
      this.noonFlare.style.transform = "translate(50vw, 34vh) translate(-50%, -50%) scale(1)";
      return;
    }

    const projected = new Vector3(
      focusSlab.position.x,
      focusSlab.position.y + focusSlab.dimensions.height * 0.45,
      focusSlab.position.z,
    ).project(this.camera);
    const targetX = (projected.x * 0.5 + 0.5) * width;
    const targetY = (-projected.y * 0.5 + 0.5) * height - height * 0.08;
    const clampedX = Math.min(width * 0.72, Math.max(width * 0.28, targetX));
    const clampedY = Math.min(height * 0.62, Math.max(height * 0.14, targetY));
    const scale = 1 + flareOpacity * 0.32;
    this.noonFlare.style.transform = `translate(${clampedX.toFixed(2)}px, ${clampedY.toFixed(2)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
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
      bat: selectDistractionLodTier(Math.max(0, snapshot.level - this.debugConfig.distractionBatStartLevel), lodNear, lodFar),
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
      const orbitRadius = Math.max(this.debugConfig.baseWidth, this.debugConfig.baseDepth) * 0.55 + 1.35;
      const climbPoint = sampleGorillaClimbPosition({
        topX: topPosition.x,
        topY: topPosition.y,
        topZ: topPosition.z,
        topHeight: topSlab?.dimensions.height ?? this.debugConfig.slabHeight,
        towerLevels: Math.max(1, this.landedSlabs.length - this.startingStackLevels),
        elapsedSeconds: this.distractionState.elapsedSeconds * GORILLA_CLIMB_SPEED,
        motionSpeed: this.debugConfig.distractionMotionSpeed,
        baseRadius: orbitRadius,
      });

      const worldPoint = new Vector3(climbPoint.x, climbPoint.y, climbPoint.z);
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
        this.syncUfoVisualSize(topSlab ?? null);
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

    if (!snapshot.active.bat) {
      this.batActor.style.opacity = "0";
    } else if (shouldUpdateForLod(this.distractionLod.bat, this.frameCounter, scalars.distractionUpdateStride)) {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const topSlab = this.landedSlabs[this.landedSlabs.length - 1];
      const centerX = topSlab?.position.x ?? 0;
      const centerY = (topSlab?.position.y ?? 0) + (topSlab?.dimensions.height ?? this.debugConfig.slabHeight) * 0.9;
      const centerZ = topSlab?.position.z ?? 0;
      const phase = this.distractionState.elapsedSeconds * this.debugConfig.distractionMotionSpeed * 2.2;
      const orbitRadius = Math.max(2.4, this.debugConfig.baseWidth * 0.9 + snapshot.signals.bat * 1.2);
      const worldPoint = new Vector3(
        centerX + Math.cos(phase) * orbitRadius,
        centerY + Math.sin(phase * 2.4) * 0.65,
        centerZ + Math.sin(phase * 1.15) * orbitRadius * 0.6,
      );
      const projected = worldPoint.project(this.camera);
      const screenX = (projected.x * 0.5 + 0.5) * width;
      const screenY = (-projected.y * 0.5 + 0.5) * height;
      const flap = 0.85 + Math.sin(phase * 6.4) * 0.35;
      const opacity = projected.z > -1 && projected.z < 1 ? 0.22 + snapshot.signals.bat * 0.7 : 0.08;
      this.batActor.style.opacity = opacity.toFixed(3);
      this.batActor.style.transform = `translate(${screenX.toFixed(2)}px, ${screenY.toFixed(2)}px) translate(-50%, -50%) scale(${flap.toFixed(3)})`;
    }

    if (shouldUpdateForLod(this.distractionLod.clouds, this.frameCounter, scalars.distractionUpdateStride)) {
      this.updateCloudLayer(snapshot);
    }

    if (snapshot.active.fireworks) {
      const burst = this.fireworksActor.querySelector<HTMLElement>(".distraction-fireworks__burst");
      const burstScale = 0.7 + snapshot.signals.fireworks * 0.9;
      const burstOpacity = 0.16 + snapshot.signals.fireworks * 0.72;
      const xPercent = 18 + ((this.distractionState.elapsedSeconds * 23.5) % 64);
      const yPercent = 22 + ((this.distractionState.elapsedSeconds * 17.25) % 48);
      this.fireworksActor.style.opacity = burstOpacity.toFixed(3);
      this.fireworksActor.style.transform = `translate(${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%) translate(-50%, -50%)`;
      if (burst) {
        burst.style.transform = `scale(${burstScale.toFixed(3)})`;
        burst.style.opacity = Math.min(1, 0.35 + snapshot.signals.fireworks * 0.75).toFixed(3);
      }
    } else {
      this.fireworksActor.style.opacity = "0";
    }

    const contrastOpacity = snapshot.active.contrastWash ? snapshot.signals.contrastWash * 0.35 : 0;
    this.shell.style.setProperty("--contrast-alpha", contrastOpacity.toFixed(3));

    if (shouldUpdateForLod(this.distractionLod.tremor, this.frameCounter, scalars.distractionUpdateStride)) {
      const tremorStrength = snapshot.active.tremor ? snapshot.signals.tremor : 0;
      this.tremorPulse.style.opacity = (tremorStrength * 0.75).toFixed(3);
      this.tremorPulse.style.transform = `scale(${(1 + tremorStrength * 0.4).toFixed(3)})`;
    }

    this.updateTentacleBursts(snapshot);
  }

  private syncUfoVisualSize(topSlab: SlabData | null): void {
    const height = this.container.clientHeight || window.innerHeight;
    if (!topSlab || height <= 0) {
      this.ufoActor.style.height = "2.3rem";
      this.ufoActor.style.width = "5.4rem";
      return;
    }

    const slabBottom = new Vector3(topSlab.position.x, topSlab.position.y, topSlab.position.z).project(this.camera);
    const slabTop = new Vector3(topSlab.position.x, topSlab.position.y + topSlab.dimensions.height, topSlab.position.z).project(this.camera);
    const projectedHeight = Math.abs((slabTop.y - slabBottom.y) * 0.5 * height);
    const ufoHeightPx = Math.max(18, Math.min(140, projectedHeight));
    this.ufoActor.style.height = `${ufoHeightPx.toFixed(1)}px`;
    this.ufoActor.style.width = `${(ufoHeightPx * 2.35).toFixed(1)}px`;
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
      this.cloudSpawnFromTop = cloudNodes.map(() => false);
      return;
    }

    const topSlab = this.landedSlabs[this.landedSlabs.length - 1] ?? this.activeSlab;
    if (!topSlab) {
      this.cloudLayer.style.opacity = "0";
      return;
    }

    if (!this.cloudAnchorsInitialized) {
      this.cloudWorldAnchors = cloudNodes.map((_, index) => this.createCloudAnchor(topSlab, index, 0, false));
      this.cloudSpawnFromTop = cloudNodes.map(() => false);
      this.cloudAnchorsInitialized = true;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const swayPhase = this.distractionState.elapsedSeconds * 0.6 * this.debugConfig.distractionMotionSpeed;
    const bobPhase = this.distractionState.elapsedSeconds * 0.28;

    cloudNodes.forEach((cloudNode, index) => {
      const anchor = this.cloudWorldAnchors[index] ?? this.createCloudAnchor(topSlab, index, this.frameCounter, false);
      this.cloudWorldAnchors[index] = anchor;

      const worldPoint = new Vector3(
        anchor.x + Math.sin(swayPhase + index) * (0.55 + index * 0.2),
        anchor.y + Math.cos(bobPhase + index * 0.75) * 0.22,
        anchor.z + Math.cos(swayPhase * 0.65 + index) * 0.38,
      );
      const projected = worldPoint.project(this.camera);

      const offBottom = projected.y > 1.25;
      const tooFarSide = Math.abs(projected.x) > 1.7;
      const behindCamera = projected.z > 1.1;
      if (offBottom || tooFarSide || behindCamera || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
        const respawnAnchor = this.createCloudAnchor(topSlab, index, this.frameCounter + index * 37, true);
        this.cloudWorldAnchors[index] = respawnAnchor;
        this.cloudSpawnFromTop[index] = true;
      }

      const stableAnchor = this.cloudWorldAnchors[index] ?? anchor;
      const stablePoint = new Vector3(
        stableAnchor.x + Math.sin(swayPhase + index) * (0.55 + index * 0.2),
        stableAnchor.y + Math.cos(bobPhase + index * 0.75) * 0.22,
        stableAnchor.z + Math.cos(swayPhase * 0.65 + index) * 0.38,
      );
      const stableProjected = stablePoint.project(this.camera);
      const screenX = (stableProjected.x * 0.5 + 0.5) * width;
      const screenY = (-stableProjected.y * 0.5 + 0.5) * height;
      cloudNode.style.transform = `translate(${screenX.toFixed(2)}px, ${screenY.toFixed(2)}px) translate(-50%, -50%)`;

      const enteringFromTop = this.cloudSpawnFromTop[index] === true;
      if (!enteringFromTop) {
        cloudNode.style.opacity = "1";
      } else {
        const entryAlpha = Math.min(1, Math.max(0, (stableProjected.y + 1.18) / 0.34));
        cloudNode.style.opacity = entryAlpha.toFixed(3);
        if (entryAlpha >= 0.995) {
          this.cloudSpawnFromTop[index] = false;
        }
      }
    });

    const baselineCloudOpacity = 0.28;
    const cloudSignalOpacity = snapshot.active.clouds ? snapshot.signals.clouds * 0.46 : 0;
    const cloudOpacity = baselineCloudOpacity + cloudSignalOpacity;
    this.cloudLayer.style.opacity = Math.min(0.92, cloudOpacity).toFixed(3);
    this.cloudLayer.style.transform = "translateX(0px)";
  }

  private createCloudAnchor(topSlab: SlabData, index: number, salt: number, spawnFromTop: boolean): Vector3 {
    const slabHeight = Math.max(0.5, this.debugConfig.slabHeight);
    const topCenter = new Vector3(topSlab.position.x, topSlab.position.y, topSlab.position.z);
    const toCamera = new Vector3(this.camera.position.x - topCenter.x, 0, this.camera.position.z - topCenter.z);
    if (toCamera.lengthSq() < 0.0001) {
      toCamera.set(1, 0, 0);
    } else {
      toCamera.normalize();
    }
    const lateral = new Vector3(-toCamera.z, 0, toCamera.x);

    const sideNoise = sampleDecorNoise(topSlab.level * 0.41 + salt * 0.23 + index * 1.31, 9.4);
    const depthNoise = sampleDecorNoise(topSlab.level * 0.37 + salt * 0.19 + index * 1.91, 23.5);
    const lateralNoise = sampleDecorNoise(topSlab.level * 0.53 + salt * 0.17 + index * 0.83, 41.2);
    const heightNoise = sampleDecorNoise(topSlab.level * 0.29 + salt * 0.21 + index * 0.59, 63.7);

    const frontSign = sideNoise > 0.5 ? 1 : -1;
    const depthDistance = 1.6 + depthNoise * 3.6;
    const lateralDistance = (lateralNoise * 2 - 1) * (2.6 + depthNoise * 2.4);
    const baseY = spawnFromTop
      ? topSlab.position.y + this.debugConfig.cameraHeight * (1.2 + heightNoise * 0.45)
      : topSlab.position.y + slabHeight * (1 + heightNoise * 2.6 + index * 0.22);

    return new Vector3(
      topCenter.x + toCamera.x * depthDistance * frontSign + lateral.x * lateralDistance,
      baseY,
      topCenter.z + toCamera.z * depthDistance * frontSign + lateral.z * lateralDistance,
    );
  }

  private updateTentacleBursts(snapshot: DistractionSnapshot): void {
    const tentacleEnabled =
      this.gameState === "playing" && this.debugConfig.distractionsEnabled && this.debugConfig.distractionTentacleEnabled;
    if (!tentacleEnabled || !snapshot.active.tentacle) {
      if (this.tentacleGroup.children.length > 0) {
        this.clearGroup(this.tentacleGroup, true);
      }
      this.tentacleBurstKeys = [];
      return;
    }

    const slab = this.landedSlabs[this.landedSlabs.length - 1];
    if (!slab || slab.dimensions.height < 0.9) {
      return;
    }

    const visibleFaces = this.getVisibleFaceDescriptors(slab);
    if (visibleFaces.length > 0) {
      const cycle = Math.floor(this.distractionState.elapsedSeconds * this.debugConfig.distractionMotionSpeed * TENTACLE_SIDE_SWITCH_SPEED);
      const cycleNoise = sampleDecorNoise(slab.level * 0.29 + cycle * 0.91, 24.8);
      if (cycleNoise < TENTACLE_BURST_CHANCE) {
        const sideNoise = sampleDecorNoise(slab.level * 0.43 + cycle * 0.67, 18.3);
        const visibleFaceIndex = Math.min(visibleFaces.length - 1, Math.floor(sideNoise * visibleFaces.length));
        const face = visibleFaces[visibleFaceIndex];
        const burstKey = `${slab.level}:${face?.noiseSalt ?? -1}`;
        if (face && !this.tentacleBurstKeys.includes(burstKey)) {
          const created = this.createTentacleBurstForFace(slab, face);
          if (created) {
            this.tentacleBurstKeys.push(burstKey);
            while (this.tentacleBurstKeys.length > TENTACLE_MAX_PERSISTED_BURSTS) {
              const removedKey = this.tentacleBurstKeys.shift();
              const removedRoot = removedKey
                ? this.tentacleGroup.children.find((child) => child.userData.burstKey === removedKey)
                : null;
              if (removedRoot) {
                this.tentacleGroup.remove(removedRoot);
                this.disposeObject3DMeshes(removedRoot);
              }
            }
          }
        }
      }
    }

    this.animateTentacles(snapshot.signals.tentacle);
  }

  private animateTentacles(signal: number): void {
    this.tentacleGroup.children.forEach((burstRoot) => {
      burstRoot.children.forEach((tentacle) => {
        const phase = typeof tentacle.userData.phase === "number" ? tentacle.userData.phase : 0;
        const baseRotationY = typeof tentacle.userData.baseRotationY === "number" ? tentacle.userData.baseRotationY : 0;
        const wiggle = (Math.sin(this.distractionState.elapsedSeconds * 6.2 + phase) + 1) / 2;
        const extension = (0.35 + signal * (0.7 + wiggle * 0.9)) * TENTACLE_EXTENSION_MULTIPLIER;
        tentacle.scale.z = extension;
        tentacle.scale.x = 0.92 + signal * 0.22;
        tentacle.scale.y = 0.92 + signal * 0.18;
        tentacle.rotation.x = Math.sin(this.distractionState.elapsedSeconds * 4.7 + phase) * 0.2;
        tentacle.rotation.y = baseRotationY;

        tentacle.children.forEach((segment) => {
          const baseY = typeof segment.userData.baseY === "number" ? segment.userData.baseY : segment.position.y;
          const waveAmplitude = typeof segment.userData.waveAmplitude === "number" ? segment.userData.waveAmplitude : 0;
          const wavePhase = typeof segment.userData.wavePhase === "number" ? segment.userData.wavePhase : phase;
          const wave =
            Math.sin(this.distractionState.elapsedSeconds * TENTACLE_WAVE_SPEED + wavePhase) * waveAmplitude * (0.55 + signal);
          segment.position.y = baseY + wave;
        });
      });
    });
  }

  private createTentacleBurstForFace(slab: SlabData, face: WindowFaceDescriptor): boolean {
    const { windowHeight, windowWidth, frameDepth, frameThickness } = resolveWindowMetrics(slab.dimensions.height);
    const windowStyle = this.getWindowStyleForSlab(slab);

    if (!shouldRenderWindowsForFace(face.span, windowStyle, windowWidth, frameThickness)) {
      return false;
    }

    const countNoise = resolveWindowCountNoise(slab.level, face.noiseSalt);
    const windowCount = resolveWindowCountForFace(face.span, windowStyle, windowWidth, frameThickness, countNoise);
    if (windowCount < 1) {
      return false;
    }

    const offsets = getWindowHorizontalOffsets(face.span, windowCount, windowStyle, windowWidth, frameThickness);

    const tentaclePalette = resolveTentaclePalette(slab.level, face.noiseSalt);
    const tentacleTone =
      tentaclePalette === "green"
        ? { color: "#47d17e", emissive: "#0b5f37" }
        : tentaclePalette === "pink"
          ? { color: "#ff79d8", emissive: "#7a1a5b" }
          : { color: "#b436ff", emissive: "#4e06a1" };

    const tentacleMaterial = new MeshStandardMaterial({
      color: new Color(tentacleTone.color),
      emissive: new Color(tentacleTone.emissive),
      emissiveIntensity: 0.5,
      metalness: 0.08,
      roughness: 0.62,
    });

    const burstRoot = new Group();
    burstRoot.userData.burstKey = `${slab.level}:${face.noiseSalt}`;

    offsets.forEach((localOffset, index) => {
      const root = new Group();
      const outDepth = resolveTentacleOutDepth(frameDepth);
      const position = face.createPosition(localOffset, outDepth);
      root.position.set(slab.position.x + position.x, slab.position.y + position.y, slab.position.z + position.z);
      root.rotation.y = face.rotationY;
      root.userData.baseRotationY = face.rotationY;
      root.userData.phase = index * 0.83 + sampleDecorNoise(slab.level * 0.71 + index * 0.43, 10.22) * Math.PI * 2;

      const segmentCount = 3 + Math.floor(sampleDecorNoise(slab.level * 0.97 + index * 0.77, 16.11) * 3);
      let cursor = 0;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const segmentLength = Math.max(0.12, windowHeight * (0.18 - segment * 0.016));
        const segmentWidth = Math.max(0.06, windowWidth * (0.34 - segment * 0.036));
        const segmentHeight = segmentWidth;
        const segmentMesh = new Mesh(new BoxGeometry(segmentWidth, segmentHeight, segmentLength), tentacleMaterial);
        const offset = resolveTentacleSegmentOffset(segment, index, segmentWidth, segmentHeight);
        segmentMesh.position.set(offset.x, offset.y, cursor + segmentLength / 2);
        segmentMesh.userData.baseY = segmentMesh.position.y;
        segmentMesh.userData.waveAmplitude = segmentHeight * (0.25 + segment * 0.12);
        segmentMesh.userData.wavePhase = root.userData.phase + segment * 0.65;
        cursor += segmentLength * 0.82;
        root.add(segmentMesh);
      }

      const tipLength = Math.max(0.12, windowHeight * 0.2);
      const tipRadius = Math.max(0.035, windowWidth * 0.14);
      const tip = new Mesh(new CylinderGeometry(0, tipRadius, tipLength, 4, 1), tentacleMaterial);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = cursor + tipLength / 2;
      tip.userData.baseY = tip.position.y;
      tip.userData.waveAmplitude = tipRadius * 1.15;
      tip.userData.wavePhase = root.userData.phase + segmentCount * 0.65;
      root.add(tip);

      burstRoot.add(root);
    });

    if (burstRoot.children.length === 0) {
      this.disposeObject3DMeshes(burstRoot);
      return false;
    }

    this.tentacleGroup.add(burstRoot);
    return true;
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

  private updateLedgeAnimations(deltaSeconds: number): void {
    if (this.ledgeAnimations.length === 0) {
      return;
    }

    this.ledgeAnimations = this.ledgeAnimations.filter((animation) => {
      if (!animation.mesh.parent) {
        return false;
      }

      animation.elapsedSeconds = Math.min(animation.durationSeconds, animation.elapsedSeconds + deltaSeconds);
      const frame = sampleLedgeAnimationScaleX(animation.elapsedSeconds, animation.durationSeconds, animation.targetScaleX);
      animation.mesh.scale.x = frame.scaleX;
      return !frame.completed;
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
    const focusY =
      (topLandedSlab?.position.y ?? 0) +
      this.debugConfig.cameraFramingOffset +
      this.debugConfig.cameraYOffset +
      startupLift +
      STACK_LOOK_AHEAD_Y -
      (collapseFrame?.cameraDrop ?? 0);
    const targetY = focusY + this.debugConfig.cameraHeight;
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
    const tremorShake = sampleTremorCameraShake(
      this.distractionState.elapsedSeconds,
      tremorStrength,
      this.debugConfig.tremorShakeAmount,
    );
    this.camera.position.x += tremorShake.x;
    this.camera.position.y += tremorShake.y;

    if (this.gorillaSlamRemaining > 0) {
      const slamStrength = this.gorillaSlamRemaining / GORILLA_SLAM_DURATION_SECONDS;
      const slamPhase = this.simulationElapsedSeconds * 40;
      this.camera.position.x += Math.sin(slamPhase) * 0.045 * slamStrength;
      this.camera.position.y -= 0.06 * slamStrength;
    }

    if (this.placementShakeRemaining > 0 && this.debugConfig.placementShakeAmount > 0) {
      this.placementShakeRemaining = Math.max(0, this.placementShakeRemaining - safeDeltaSeconds);
      const placementShake = samplePlacementCameraShake(
        this.simulationElapsedSeconds,
        this.placementShakeRemaining,
        PLACEMENT_SHAKE_DURATION_SECONDS,
        this.debugConfig.placementShakeAmount,
      );
      this.camera.position.x += placementShake.x;
      this.camera.position.y += placementShake.y;
      this.camera.position.z += placementShake.z;
    }

    if (this.integrityTelemetry.tier === "precarious") {
      const wobblePhase = this.simulationElapsedSeconds * 14;
      this.camera.position.x += Math.sin(wobblePhase) * this.integrityTelemetry.wobbleStrength;
      this.camera.position.z += Math.cos(wobblePhase * 0.85) * this.integrityTelemetry.wobbleStrength * 0.4;
    }

    const lookAtTargetY = Math.max(1.2, focusY);
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

    const horizontalScale = Math.max(1, this.camera.aspect) * 1.35;
    this.starFieldSmall.scale.x = horizontalScale;
    this.starFieldMedium.scale.x = horizontalScale;
    this.starFieldLarge.scale.x = horizontalScale;
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
        "distractionBatStartLevel",
        "distractionFireworksStartLevel",
        "dayNightCycleBlocks",
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
          batOpacity: Number(this.batActor.style.opacity || 0),
          cloudOpacity: Number(this.cloudLayer.style.opacity || 0),
          contrastOpacity: Number(this.shell.style.getPropertyValue("--contrast-alpha") || 0),
          tremorStrength: distractionSnapshot.active.tremor ? distractionSnapshot.signals.tremor : 0,
          fireworksOpacity: Number(this.fireworksActor.style.opacity || 0),
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
    const facadeStyle = resolveFacadeStyle(slab.level);
    const material = new MeshStandardMaterial({
      color: this.getSlabColor(slab.level),
      emissive: this.getSlabEmissive(slab.level),
      metalness: facadeStyle === "smooth" ? 0.12 : 0.08,
      roughness: facadeStyle === "brick" ? 0.9 : facadeStyle === "siding" ? 0.76 : 0.82,
      map: facadeStyle === "brick" ? this.brickTexture : facadeStyle === "siding" ? this.sidingTexture : null,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(slab.position.x, slab.position.y, slab.position.z);

    if (!isTop) {
      this.decorateSlabWithWeathering(mesh, slab);
      this.decorateSlabWithWindows(mesh, slab);
      this.decorateSlabWithLedge(mesh, slab);
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

    const radiusX = 6.2;
    const radiusY = 14.8;
    const step = 10.8;
    const centerY = 0;

    context.fillStyle = "rgba(255, 255, 255, 0.98)";
    for (let x = -12; x <= canvas.width + 14; x += step) {
      const centerX = x + step / 2;
      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI, false);
      context.closePath();
      context.fill();
    }

    context.strokeStyle = "rgba(232, 232, 232, 0.98)";
    context.lineWidth = 1.15;
    for (let x = -12; x <= canvas.width + 14; x += step) {
      const centerX = x + step / 2;
      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0.04, Math.PI - 0.04, false);
      context.stroke();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createBrickTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) {
      const fallbackTexture = new CanvasTexture(canvas);
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    context.fillStyle = "#b36f57";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(243, 216, 189, 0.45)";
    context.lineWidth = 3;

    const rowHeight = 16;
    const brickWidth = 32;
    for (let row = 0; row < canvas.height / rowHeight; row += 1) {
      const y = row * rowHeight;
      const offset = row % 2 === 0 ? 0 : brickWidth / 2;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();

      for (let x = offset; x < canvas.width; x += brickWidth) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + rowHeight);
        context.stroke();
      }
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createSidingTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) {
      const fallbackTexture = new CanvasTexture(canvas);
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    context.fillStyle = "#9eb4c4";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 6; y < canvas.height; y += 11) {
      context.fillStyle = "rgba(244, 250, 255, 0.35)";
      context.fillRect(0, y, canvas.width, 2);
      context.fillStyle = "rgba(69, 93, 116, 0.3)";
      context.fillRect(0, y + 2, canvas.width, 1);
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

    const { windowHeight, windowWidth, frameDepth, frameThickness, sillHeight, sillDepth } = resolveWindowMetrics(
      slab.dimensions.height,
    );

    const darkTrim = shouldUseDarkWindowTrim(slab.level);
    const slabHue = resolveSlabHue(slab.level) / 360;
    const darkTrimColor = new Color().setHSL(slabHue, 0.48, 0.27);
    const darkTrimEmissive = darkTrimColor.clone().offsetHSL(0, 0, -0.18);
    const frameMaterial = new MeshStandardMaterial({
      color: darkTrim ? darkTrimColor : new Color("#f2f6ff"),
      emissive: darkTrim ? darkTrimEmissive : new Color("#222e40"),
      emissiveIntensity: darkTrim ? 0.2 : 0.12,
      metalness: 0.06,
      roughness: darkTrim ? 0.54 : 0.64,
    });

    const glassMaterial = new MeshStandardMaterial({
      color: new Color("#ced8ea"),
      emissive: new Color("#3d5674"),
      emissiveIntensity: 0.2,
      metalness: 0.04,
      roughness: 0.44,
      map: this.windowTexture,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });

    const sillDarkColor = darkTrimColor.clone().offsetHSL(0, 0, 0.04);
    const sillDarkEmissive = sillDarkColor.clone().offsetHSL(0, 0, -0.2);
    const sillMaterial = new MeshStandardMaterial({
      color: darkTrim ? sillDarkColor : new Color("#e7edf9"),
      emissive: darkTrim ? sillDarkEmissive : new Color("#28364a"),
      emissiveIntensity: darkTrim ? 0.1 : 0.14,
      metalness: 0.04,
      roughness: 0.66,
    });

    const shutterPalette = resolveWindowShutterPalette(slab.level);
    const shutterMaterial = this.createShutterMaterial(shutterPalette);
    const windowStyle = this.getWindowStyleForSlab(slab);

    this.getVisibleFaceDescriptors(slab).forEach((face) => {
      if (!shouldRenderWindowsForFace(face.span, windowStyle, windowWidth, frameThickness)) {
        return;
      }

      const countNoise = resolveWindowCountNoise(slab.level, face.noiseSalt);
      const windowCount = resolveWindowCountForFace(face.span, windowStyle, windowWidth, frameThickness, countNoise);
      if (windowCount < 1) {
        return;
      }

      const offsets = getWindowHorizontalOffsets(face.span, windowCount, windowStyle, windowWidth, frameThickness);

      offsets.forEach((localOffset) => {
        const windowGroup = new Group();
        const outerWidth = windowWidth + frameThickness * 2;
        const outerHeight = windowHeight + frameThickness * 2;
        const glassWidth = Math.max(0.08, windowWidth * 0.9);
        const glassHeight = Math.max(0.14, windowHeight * 0.9);

        const sillWidth = Math.min(face.span, Math.max(outerWidth * 1.3, 0.22));
        const sill = new Mesh(new BoxGeometry(sillWidth, sillHeight, sillDepth), sillMaterial);
        sill.position.y = -outerHeight / 2 - sillHeight * 0.55;
        sill.position.z = sillDepth / 2 - frameDepth * 0.5;
        windowGroup.add(sill);

        this.buildWindowStyle(windowGroup, windowStyle, {
          frameMaterial,
          glassMaterial,
          sillMaterial,
          shutterMaterial,
          frameDepth,
          frameThickness,
          outerWidth,
          outerHeight,
          glassWidth,
          glassHeight,
        });

        const outDepth = resolveWindowOutDepth(frameDepth);
        const position = face.createPosition(localOffset, outDepth);
        windowGroup.position.set(position.x, position.y, position.z);
        windowGroup.rotation.y = face.rotationY;
        mesh.add(windowGroup);
      });
    });
  }

  private getWindowFaceDescriptors(slab: SlabData): WindowFaceDescriptor[] {
    return [
      {
        span: slab.dimensions.depth,
        createPosition: (offset, outDepth) => ({ x: slab.dimensions.width / 2 + outDepth, y: 0, z: offset }),
        rotationY: FACE_ROTATION.posX,
        noiseSalt: 1.7,
      },
      {
        span: slab.dimensions.depth,
        createPosition: (offset, outDepth) => ({ x: -(slab.dimensions.width / 2 + outDepth), y: 0, z: offset }),
        rotationY: FACE_ROTATION.negX,
        noiseSalt: 2.9,
      },
      {
        span: slab.dimensions.width,
        createPosition: (offset, outDepth) => ({ x: offset, y: 0, z: slab.dimensions.depth / 2 + outDepth }),
        rotationY: FACE_ROTATION.posZ,
        noiseSalt: 4.3,
      },
      {
        span: slab.dimensions.width,
        createPosition: (offset, outDepth) => ({ x: offset, y: 0, z: -(slab.dimensions.depth / 2 + outDepth) }),
        rotationY: FACE_ROTATION.negZ,
        noiseSalt: 5.6,
      },
    ];
  }

  private getVisibleFaceDescriptors(slab: SlabData): WindowFaceDescriptor[] {
    return filterFacesByVisibility(
      this.getWindowFaceDescriptors(slab),
      { x: slab.position.x, z: slab.position.z },
      { x: this.camera.position.x, z: this.camera.position.z },
      "visible",
    );
  }

  private getWindowStyleForSlab(slab: SlabData): WindowStyle {
    const styleNoise = sampleDecorNoise(slab.level * 1.27 + 8.17, 3.09);
    return resolveWindowStyle(styleNoise);
  }

  private buildWindowStyle(
    windowGroup: Group,
    style: WindowStyle,
    dimensions: {
      frameMaterial: MeshStandardMaterial;
      glassMaterial: MeshStandardMaterial;
      sillMaterial: MeshStandardMaterial;
      shutterMaterial: MeshStandardMaterial;
      frameDepth: number;
      frameThickness: number;
      outerWidth: number;
      outerHeight: number;
      glassWidth: number;
      glassHeight: number;
    },
  ): void {
    const {
      frameMaterial,
      glassMaterial,
      sillMaterial,
      shutterMaterial,
      frameDepth,
      frameThickness,
      outerWidth,
      outerHeight,
      glassWidth,
      glassHeight,
    } = dimensions;

    this.addRectangularCore(windowGroup, frameMaterial, glassMaterial, frameDepth, frameThickness, outerWidth, outerHeight, glassWidth, glassHeight);

    if (style === "pointedGothic") {
      this.addPointedGothicTop(windowGroup, frameMaterial, glassMaterial, frameDepth, frameThickness, outerWidth, outerHeight);
    } else if (style === "roundedGothic") {
      this.addRoundedGothicTop(windowGroup, frameMaterial, glassMaterial, frameDepth, frameThickness, outerWidth, outerHeight, glassWidth);
    } else if (style === "planter") {
      this.addPlanterBox(windowGroup, sillMaterial, frameDepth, frameThickness, outerWidth, outerHeight);
    } else if (style === "shuttered") {
      this.addShutters(windowGroup, frameMaterial, shutterMaterial, frameDepth, frameThickness, outerWidth, outerHeight);
    } else if (style === "bay") {
      this.addBayWindow(windowGroup, frameMaterial, glassMaterial, frameDepth, frameThickness, outerWidth, outerHeight, glassWidth, glassHeight);
    }
  }

  private addRectangularCore(
    windowGroup: Group,
    frameMaterial: MeshStandardMaterial,
    glassMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
    glassWidth: number,
    glassHeight: number,
  ): void {
    const sideFrameGeometry = new BoxGeometry(frameThickness, outerHeight, frameDepth);
    const topBottomFrameGeometry = new BoxGeometry(outerWidth, frameThickness, frameDepth);

    const leftFrame = new Mesh(sideFrameGeometry, frameMaterial);
    leftFrame.position.x = -outerWidth / 2 + frameThickness / 2;
    const rightFrame = new Mesh(sideFrameGeometry, frameMaterial);
    rightFrame.position.x = outerWidth / 2 - frameThickness / 2;
    const topFrame = new Mesh(topBottomFrameGeometry, frameMaterial);
    topFrame.position.y = outerHeight / 2 - frameThickness / 2;
    const bottomFrame = new Mesh(topBottomFrameGeometry, frameMaterial);
    bottomFrame.position.y = -outerHeight / 2 + frameThickness / 2;

    const glass = new Mesh(new BoxGeometry(glassWidth, glassHeight, frameDepth * 0.48), glassMaterial);
    glass.position.z = -frameDepth * 0.16;

    windowGroup.add(leftFrame, rightFrame, topFrame, bottomFrame, glass);
  }

  private addPointedGothicTop(
    windowGroup: Group,
    frameMaterial: MeshStandardMaterial,
    glassMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
  ): void {
    const shoulderY = outerHeight / 2 - frameThickness;
    const gableRise = Math.max(frameThickness * 2, outerHeight * 0.32);
    const gableRun = Math.max(frameThickness * 1.2, outerWidth / 2 - frameThickness * 0.35);
    const gableLength = Math.sqrt(gableRun * gableRun + gableRise * gableRise);
    const gableBeamGeometry = new BoxGeometry(gableLength, frameThickness, frameDepth);

    const leftArch = new Mesh(gableBeamGeometry, frameMaterial);
    leftArch.position.set(-gableRun / 2, shoulderY + gableRise / 2, 0);
    leftArch.rotation.z = Math.atan2(gableRise, gableRun);

    const rightArch = new Mesh(gableBeamGeometry, frameMaterial);
    rightArch.position.set(gableRun / 2, shoulderY + gableRise / 2, 0);
    rightArch.rotation.z = -Math.atan2(gableRise, gableRun);

    const apexCap = new Mesh(new BoxGeometry(frameThickness, frameThickness * 1.15, frameDepth), frameMaterial);
    apexCap.position.set(0, shoulderY + gableRise, 0);

    const archGlassRise = Math.max(frameThickness * 0.9, gableRise - frameThickness * 0.95);
    const archGlassRun = Math.max(frameThickness * 0.7, gableRun - frameThickness * 0.9);
    const archGlassLength = Math.sqrt(archGlassRun * archGlassRun + archGlassRise * archGlassRise);
    const archGlassGeometry = new BoxGeometry(archGlassLength, frameThickness * 0.46, frameDepth * 0.38);

    const leftArchGlass = new Mesh(archGlassGeometry, glassMaterial);
    leftArchGlass.position.set(-archGlassRun / 2, shoulderY + archGlassRise / 2 - frameThickness * 0.1, -frameDepth * 0.16);
    leftArchGlass.rotation.z = Math.atan2(archGlassRise, archGlassRun);

    const rightArchGlass = new Mesh(archGlassGeometry, glassMaterial);
    rightArchGlass.position.set(archGlassRun / 2, shoulderY + archGlassRise / 2 - frameThickness * 0.1, -frameDepth * 0.16);
    rightArchGlass.rotation.z = -Math.atan2(archGlassRise, archGlassRun);

    windowGroup.add(leftArch, rightArch, apexCap, leftArchGlass, rightArchGlass);
  }

  private addRoundedGothicTop(
    windowGroup: Group,
    frameMaterial: MeshStandardMaterial,
    glassMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
    glassWidth: number,
  ): void {
    const archBaseY = outerHeight / 2 - frameThickness * 0.95;
    const archRise = Math.max(frameThickness * 1.5, outerHeight * 0.24);
    const segments = 5;

    for (let segment = 0; segment < segments; segment += 1) {
      const t0 = segment / segments;
      const t1 = (segment + 1) / segments;
      const a0 = Math.PI - Math.PI * t0;
      const a1 = Math.PI - Math.PI * t1;
      const x0 = Math.cos(a0) * (outerWidth / 2 - frameThickness * 0.5);
      const y0 = Math.sin(a0) * archRise;
      const x1 = Math.cos(a1) * (outerWidth / 2 - frameThickness * 0.5);
      const y1 = Math.sin(a1) * archRise;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const length = Math.max(frameThickness, Math.sqrt(dx * dx + dy * dy));

      const frameSegment = new Mesh(new BoxGeometry(length, frameThickness, frameDepth), frameMaterial);
      frameSegment.position.set((x0 + x1) / 2, archBaseY + (y0 + y1) / 2, 0);
      frameSegment.rotation.z = Math.atan2(dy, dx);
      windowGroup.add(frameSegment);

      const glassSegment = new Mesh(new BoxGeometry(length * 0.78, frameThickness * 0.42, frameDepth * 0.38), glassMaterial);
      glassSegment.position.set((x0 + x1) / 2, archBaseY + (y0 + y1) / 2 - frameThickness * 0.12, -frameDepth * 0.16);
      glassSegment.rotation.z = Math.atan2(dy, dx);
      windowGroup.add(glassSegment);
    }

    const centerMullion = new Mesh(new BoxGeometry(frameThickness * 0.72, Math.max(0.14, archRise), frameDepth * 0.62), frameMaterial);
    centerMullion.position.set(0, archBaseY - archRise * 0.45, -frameDepth * 0.02);
    windowGroup.add(centerMullion);

    const rose = new Mesh(new BoxGeometry(Math.max(0.05, glassWidth * 0.16), Math.max(0.05, glassWidth * 0.16), frameDepth * 0.35), glassMaterial);
    rose.position.set(0, archBaseY + archRise * 0.44, -frameDepth * 0.12);
    windowGroup.add(rose);
  }

  private addPlanterBox(
    windowGroup: Group,
    sillMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
  ): void {
    const planterWidth = outerWidth * 0.9;
    const planterHeight = Math.max(0.06, frameThickness * 1.2);
    const planterDepth = frameDepth * 1.6;

    const planter = new Mesh(new BoxGeometry(planterWidth, planterHeight, planterDepth), sillMaterial);
    planter.position.set(0, -outerHeight / 2 - planterHeight * 1.2, planterDepth / 2 - frameDepth * 0.4);
    windowGroup.add(planter);

    const stemMaterial = new MeshStandardMaterial({
      color: new Color("#6d9a5f"),
      emissive: new Color("#1d311f"),
      emissiveIntensity: 0.09,
      metalness: 0.03,
      roughness: 0.77,
    });

    for (let index = 0; index < 3; index += 1) {
      const stemHeight = outerHeight * (0.18 + index * 0.04);
      const stem = new Mesh(new BoxGeometry(frameThickness * 0.3, stemHeight, frameThickness * 0.3), stemMaterial);
      stem.position.set(-planterWidth * 0.24 + index * planterWidth * 0.24, planter.position.y + stemHeight / 2, planter.position.z - frameDepth * 0.3);

      const leaf = new Mesh(new BoxGeometry(frameThickness * 0.85, frameThickness * 0.42, frameThickness * 0.55), stemMaterial);
      leaf.position.set(stem.position.x + frameThickness * (index % 2 === 0 ? 0.35 : -0.35), stem.position.y + stemHeight * 0.25, stem.position.z);
      leaf.rotation.z = index % 2 === 0 ? 0.4 : -0.4;

      windowGroup.add(stem, leaf);
    }
  }

  private addShutters(
    windowGroup: Group,
    frameMaterial: MeshStandardMaterial,
    shutterMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
  ): void {
    const shutterWidth = Math.max(frameThickness * 1.8, outerWidth * 0.22);
    const shutterHeight = outerHeight * 0.92;
    const shutterDepth = frameDepth * 0.52;
    const offsetX = outerWidth / 2 + shutterWidth * 0.5;

    const leftShutter = new Mesh(new BoxGeometry(shutterWidth, shutterHeight, shutterDepth), shutterMaterial);
    leftShutter.position.set(-offsetX, 0, -frameDepth * 0.08);
    const rightShutter = new Mesh(new BoxGeometry(shutterWidth, shutterHeight, shutterDepth), shutterMaterial);
    rightShutter.position.set(offsetX, 0, -frameDepth * 0.08);

    const latch = new Mesh(new BoxGeometry(frameThickness * 0.34, frameThickness * 0.34, shutterDepth * 1.3), frameMaterial);
    latch.position.set(0, 0, -frameDepth * 0.08);

    windowGroup.add(leftShutter, rightShutter, latch);
  }

  private createShutterMaterial(palette: ReturnType<typeof resolveWindowShutterPalette>): MeshStandardMaterial {
    const tones: Record<ReturnType<typeof resolveWindowShutterPalette>, { color: string; emissive: string }> = {
      slate: { color: "#d3deef", emissive: "#1d2938" },
      teal: { color: "#bddfe3", emissive: "#163642" },
      plum: { color: "#dac9ea", emissive: "#332248" },
      sand: { color: "#e8dcc3", emissive: "#3d3220" },
    };

    const tone = tones[palette];
    return new MeshStandardMaterial({
      color: new Color(tone.color),
      emissive: new Color(tone.emissive),
      emissiveIntensity: 0.08,
      metalness: 0.05,
      roughness: 0.68,
    });
  }

  private addBayWindow(
    windowGroup: Group,
    frameMaterial: MeshStandardMaterial,
    glassMaterial: MeshStandardMaterial,
    frameDepth: number,
    frameThickness: number,
    outerWidth: number,
    outerHeight: number,
    glassWidth: number,
    glassHeight: number,
  ): void {
    const wingWidth = Math.max(frameThickness * 1.2, outerWidth * 0.22);
    const wingDepth = frameDepth * 0.9;
    const centerDepth = frameDepth * 0.78;
    const bayOffsetZ = frameDepth * 0.33;

    const centerGlass = new Mesh(new BoxGeometry(Math.max(0.08, glassWidth * 0.82), glassHeight * 0.74, centerDepth), glassMaterial);
    centerGlass.position.set(0, 0, bayOffsetZ - frameDepth * 0.08);

    const leftWing = new Mesh(new BoxGeometry(wingWidth, outerHeight * 0.92, wingDepth), frameMaterial);
    leftWing.position.set(-outerWidth / 2 + wingWidth / 2, 0, bayOffsetZ);

    const rightWing = new Mesh(new BoxGeometry(wingWidth, outerHeight * 0.92, wingDepth), frameMaterial);
    rightWing.position.set(outerWidth / 2 - wingWidth / 2, 0, bayOffsetZ);

    const canopy = new Mesh(new BoxGeometry(outerWidth * 0.88, frameThickness * 1.05, frameDepth * 0.75), frameMaterial);
    canopy.position.set(0, outerHeight / 2 - frameThickness * 0.3, bayOffsetZ + frameDepth * 0.05);

    const baySill = new Mesh(new BoxGeometry(outerWidth * 0.92, frameThickness * 1.3, frameDepth * 1.15), frameMaterial);
    baySill.position.set(0, -outerHeight / 2 + frameThickness * 0.2, bayOffsetZ + frameDepth * 0.1);

    windowGroup.add(centerGlass, leftWing, rightWing, canopy, baySill);
  }

  private createWeatheringTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) {
      const fallbackTexture = new CanvasTexture(canvas);
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.42, "rgba(140, 140, 140, 0.35)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.96)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 37.17) % canvas.width;
      const y = canvas.height * 0.5 + ((index * 19.91) % (canvas.height * 0.45));
      const width = 10 + ((index * 7.13) % 24);
      const height = 1.2 + ((index * 3.31) % 2.6);
      context.fillRect(x, y, width, height);
    }

    context.fillStyle = "rgba(255, 255, 255, 0.58)";
    for (let index = 0; index < 14; index += 1) {
      const x = (index * 23.41 + 11) % canvas.width;
      const y = canvas.height * 0.55 + ((index * 11.73) % (canvas.height * 0.38));
      context.fillRect(x, y, 3.2, 8 + ((index * 5.7) % 11));
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private decorateSlabWithWeathering(mesh: Mesh, slab: SlabData): void {
    if (slab.dimensions.height < 0.9 || !this.shouldRenderWeatheringForSlab(slab.level)) {
      return;
    }

    const weatheringHeight = Math.max(0.5, slab.dimensions.height * 0.58);
    const elevationY = -slab.dimensions.height / 2 + weatheringHeight / 2;
    const weatheringColor = new Color(this.getSlabColor(slab.level)).offsetHSL(0, -0.08, -0.3);

    const faces: Array<{
      span: number;
      createPosition: () => { x: number; y: number; z: number };
      rotationY: number;
    }> = [
      {
        span: slab.dimensions.depth,
        createPosition: () => ({ x: slab.dimensions.width / 2 + 0.022, y: elevationY, z: 0 }),
        rotationY: FACE_ROTATION.posX,
      },
      {
        span: slab.dimensions.depth,
        createPosition: () => ({ x: -(slab.dimensions.width / 2 + 0.022), y: elevationY, z: 0 }),
        rotationY: FACE_ROTATION.negX,
      },
      {
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: slab.dimensions.depth / 2 + 0.022 }),
        rotationY: FACE_ROTATION.posZ,
      },
      {
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: -(slab.dimensions.depth / 2 + 0.022) }),
        rotationY: FACE_ROTATION.negZ,
      },
    ];

    filterFacesByVisibility(
      faces,
      { x: slab.position.x, z: slab.position.z },
      { x: this.camera.position.x, z: this.camera.position.z },
      "visible",
    ).forEach((face) => {
      const material = new MeshStandardMaterial({
        color: weatheringColor,
        emissive: new Color("#080a0f"),
        emissiveIntensity: 0.02,
        metalness: 0.01,
        roughness: 0.92,
        alphaMap: this.weatheringTexture,
        transparent: true,
        opacity: 0.48,
        side: DoubleSide,
        depthWrite: false,
      });

      const weathering = new Mesh(new PlaneGeometry(Math.max(0.4, face.span * 0.96), weatheringHeight), material);
      const position = face.createPosition();
      weathering.position.set(position.x, position.y, position.z);
      weathering.rotation.y = face.rotationY;
        mesh.add(weathering);
      });
  }

  private decorateSlabWithLedge(mesh: Mesh, slab: SlabData): void {
    if (slab.dimensions.height < 0.9) {
      return;
    }

    const visibleFaces = this.getVisibleFaceDescriptors(slab);
    if (visibleFaces.length === 0) {
      return;
    }

    const faceNoise = sampleDecorNoise(slab.level * 0.77 + 2.13, 6.91);
    const faceIndex = resolveLedgeFaceIndex(visibleFaces.length, faceNoise);
    if (faceIndex === null) {
      return;
    }

    const face = visibleFaces[faceIndex];
    if (!face) {
      return;
    }

    const widthNoise = sampleDecorNoise(slab.level * 1.19 + face.noiseSalt, 8.37);
    const { widthRatio, ledgeWidth, ledgeHeight, ledgeDepth, lipHeight, lipDepth } = resolveLedgeDimensions(
      face.span,
      slab.dimensions.height,
      widthNoise,
    );

    const slabBaseColor = new Color(this.getSlabColor(slab.level));
    const ledgeColor = slabBaseColor.clone().offsetHSL(0, -0.12, 0.14);
    const ledgeMaterial = new MeshStandardMaterial({
      color: ledgeColor,
      emissive: new Color(this.getSlabEmissive(slab.level)).multiplyScalar(0.45),
      emissiveIntensity: 0.14,
      metalness: 0.04,
      roughness: 0.66,
    });

    const ledge = new Mesh(new BoxGeometry(face.span, ledgeHeight, ledgeDepth), ledgeMaterial);
    const ledgeY = -slab.dimensions.height / 2 + ledgeHeight / 2 + 0.02;
    const outDepth = ledgeDepth / 2 - 0.01;
    const position = face.createPosition(0, outDepth);
    ledge.position.set(position.x, ledgeY, position.z);
    ledge.rotation.y = face.rotationY;

    const lip = new Mesh(
      new BoxGeometry(face.span, lipHeight, lipDepth),
      new MeshStandardMaterial({
        color: ledgeColor.clone().offsetHSL(0, -0.08, 0.06),
        emissive: new Color("#25384f"),
        emissiveIntensity: 0.08,
        metalness: 0.03,
        roughness: 0.7,
      }),
    );
    lip.position.set(0, ledgeHeight / 2 - lipHeight / 2, ledgeDepth / 2 - lipDepth / 2);
    ledge.add(lip);

    ledge.userData.isLedge = true;
    ledge.userData.usableWidth = ledgeWidth;

    const shouldAnimate = slab.level >= this.startingStackLevels;
    if (shouldAnimate) {
      ledge.scale.x = 0.01;
      this.ledgeAnimations.push({
        mesh: ledge,
        elapsedSeconds: 0,
        durationSeconds: LEDGE_ANIMATION_DURATION_SECONDS,
        targetScaleX: widthRatio,
      });
    } else {
      ledge.scale.x = widthRatio;
    }

    mesh.add(ledge);
  }

  private decorateSlabWithEaves(mesh: Mesh, slab: SlabData): void {
    if (slab.dimensions.height < 0.9 || !this.shouldRenderEavesForSlab(slab.level)) {
      return;
    }

    const eaveHeight = Math.max(0.44, Math.min(0.78, slab.dimensions.height * 0.26));
    const elevationY = slab.dimensions.height / 2 - eaveHeight * 0.42;

    const faces: Array<{
      id: "posX" | "negX" | "posZ" | "negZ";
      span: number;
      createPosition: () => { x: number; y: number; z: number };
      rotationY: number;
    }> = [
      {
        id: "posX",
        span: slab.dimensions.depth,
        createPosition: () => ({ x: slab.dimensions.width / 2 + 0.028, y: elevationY, z: 0 }),
        rotationY: FACE_ROTATION.posX,
      },
      {
        id: "negX",
        span: slab.dimensions.depth,
        createPosition: () => ({ x: -(slab.dimensions.width / 2 + 0.028), y: elevationY, z: 0 }),
        rotationY: FACE_ROTATION.negX,
      },
      {
        id: "posZ",
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: slab.dimensions.depth / 2 + 0.028 }),
        rotationY: FACE_ROTATION.posZ,
      },
      {
        id: "negZ",
        span: slab.dimensions.width,
        createPosition: () => ({ x: 0, y: elevationY, z: -(slab.dimensions.depth / 2 + 0.028) }),
        rotationY: FACE_ROTATION.negZ,
      },
    ];

    const finalFaces = filterFacesByVisibility(
      faces,
      { x: slab.position.x, z: slab.position.z },
      { x: this.camera.position.x, z: this.camera.position.z },
      "visible",
    );

    const slabBaseColor = new Color(this.getSlabColor(slab.level));
    const eaveColor = slabBaseColor.clone().offsetHSL(0, -0.08, -0.06);
    const eaveEmissive = new Color(this.getSlabEmissive(slab.level)).multiplyScalar(0.72);
    const eaveMaterial = new MeshStandardMaterial({
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

    finalFaces.forEach((face) => {
      const eaveWidth = resolveEaveWidth(face.span);
      const eave = new Mesh(new PlaneGeometry(eaveWidth, eaveHeight), eaveMaterial);
      const position = face.createPosition();
      eave.position.set(position.x, position.y, position.z);
      eave.rotation.y = face.rotationY;
      mesh.add(eave);
    });

    const visibleFaceIds = new Set(finalFaces.map((face) => face.id));
    const sealSize = resolveEaveCornerSealSize(eaveHeight);
    const cornerSealMaterial = new MeshStandardMaterial({
      color: eaveColor,
      emissive: eaveEmissive,
      emissiveIntensity: 0.16,
      metalness: 0.02,
      roughness: 0.74,
      transparent: true,
      opacity: 0.9,
      side: DoubleSide,
      depthWrite: false,
    });

    const cornerSeals = [
      { requires: ["posX", "posZ"] as const, xSign: 1, zSign: 1 },
      { requires: ["posX", "negZ"] as const, xSign: 1, zSign: -1 },
      { requires: ["negX", "posZ"] as const, xSign: -1, zSign: 1 },
      { requires: ["negX", "negZ"] as const, xSign: -1, zSign: -1 },
    ];

    cornerSeals.forEach((corner) => {
      if (!corner.requires.every((faceId) => visibleFaceIds.has(faceId))) {
        return;
      }

      const seal = new Mesh(new PlaneGeometry(sealSize, eaveHeight * 0.96), cornerSealMaterial);
      seal.position.set(
        corner.xSign * (slab.dimensions.width / 2 + 0.028),
        elevationY,
        corner.zSign * (slab.dimensions.depth / 2 + 0.028),
      );
      seal.rotation.y = corner.xSign === corner.zSign ? Math.PI / 4 : -Math.PI / 4;
      mesh.add(seal);
    });
  }

  private shouldRenderEavesForSlab(_level: number): boolean {
    return true;
  }

  private shouldRenderWeatheringForSlab(level: number): boolean {
    return shouldRenderWeathering(sampleDecorNoise(level, 4.61));
  }

  private getSlabColor(level: number): string {
    const hue = resolveSlabHue(level);
    return new Color().setHSL(hue / 360, 0.72, 0.67).getStyle();
  }

  private getSlabEmissive(level: number): string {
    const hue = resolveSlabHue(level);
    return new Color().setHSL(hue / 360, 0.58, 0.16).getStyle();
  }

  private isSlabNearScreen(slab: SlabData, outsideBlocks = 2): boolean {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const center = new Vector3(slab.position.x, slab.position.y, slab.position.z).project(this.camera);
    const top = new Vector3(slab.position.x, slab.position.y + slab.dimensions.height, slab.position.z).project(this.camera);

    return isProjectedSlabNearViewport(
      {
        center: { x: center.x, y: center.y, z: center.z },
        topY: top.y,
      },
      { width, height },
      outsideBlocks,
    );
  }

  private spawnCollapseVoxels(additionalBurstSlabs: SlabData[] = []): void {
    this.clearGroup(this.collapseVoxelGroup, true);
    this.collapseVoxels = [];

    const random = this.seededRandom ?? Math.random;
    const onScreenLandedSlabs = this.landedSlabs.filter((slab) => this.isSlabNearScreen(slab, 2));
    const burstSlabs = [...additionalBurstSlabs, ...onScreenLandedSlabs]
      .slice()
      .sort((a, b) => b.position.y - a.position.y || b.level - a.level);

    if (burstSlabs.length === 0) {
      const fallbackTop = this.landedSlabs.slice(-3).reverse();
      burstSlabs.push(...fallbackTop);
    }

    const topSlab = burstSlabs[0] ?? this.landedSlabs[this.landedSlabs.length - 1];
    const topCenter = topSlab?.position ?? { x: 0, y: 0, z: 0 };

    const voxelSeeds = createCollapseVoxelSeeds(burstSlabs, COLLAPSE_VOXEL_MAX_COUNT, COLLAPSE_VOXEL_SIZE);

    voxelSeeds.forEach((seed) => {
      const mesh = new Mesh(
        new BoxGeometry(seed.edge, seed.edge, seed.edge),
        new MeshStandardMaterial({
          color: this.getSlabColor(seed.level),
          emissive: this.getSlabEmissive(seed.level),
          metalness: 0.08,
          roughness: 0.86,
        }),
      );
      mesh.position.set(seed.center.x, seed.center.y, seed.center.z);
      this.collapseVoxelGroup.add(mesh);

      const burstDirection = new Vector3(seed.center.x - topCenter.x, seed.center.y - topCenter.y, seed.center.z - topCenter.z);
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
    });
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
    mesh.userData.slabLevel = slab.level;

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

  private collectBurstSlabsFromActiveDebris(): SlabData[] {
    const fallbackLevel = this.landedSlabs[this.landedSlabs.length - 1]?.level ?? 0;
    return this.debrisPieces.map((piece, index) => {
      const slabLevel =
        typeof piece.mesh.userData.slabLevel === "number" ? Math.max(0, Math.floor(piece.mesh.userData.slabLevel)) : fallbackLevel + index;

      return {
        level: slabLevel,
        axis: "x",
        position: {
          x: piece.mesh.position.x,
          y: piece.mesh.position.y,
          z: piece.mesh.position.z,
        },
        dimensions: {
          width: Math.max(0.12, piece.mesh.scale.x),
          height: Math.max(0.12, piece.mesh.scale.y),
          depth: Math.max(0.12, piece.mesh.scale.z),
        },
        direction: 1,
      };
    });
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

  private createStarField(starCount: number, material: PointsMaterial, minZ: number, maxZ: number): Points {
    const positions: number[] = [];
    const colors: number[] = [];
    const spreadX = 52;
    const spreadY = 34;

    for (let index = 0; index < starCount; index += 1) {
      const x = (Math.random() * 2 - 1) * spreadX;
      const y = (Math.random() * 2 - 1) * spreadY;
      const z = minZ + Math.random() * (maxZ - minZ);
      positions.push(x, y, z);

      const normalizedY = (y + spreadY) / (spreadY * 2);
      const brightness = 0.25 + normalizedY * 0.75;
      colors.push(brightness, brightness, brightness);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    const stars = new Points(geometry, material);
    stars.frustumCulled = false;
    stars.renderOrder = -2;
    stars.visible = false;
    return stars;
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
