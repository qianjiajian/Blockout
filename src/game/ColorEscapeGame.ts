import { LEVELS, getLevel } from "../core/levels";
import { PuzzleModel } from "../core/PuzzleModel";
import { localDayKey, millisecondsUntilNextLocalDay, selectDailyLevel, settleDailyChallenge } from "../core/daily";
import { detectMechanicEvents } from "../core/mechanicEvents";
import type { MechanicEventKind } from "../core/mechanicEvents";
import { SUPPLY_ITEMS, SUPPLY_ORDER, nextUnseenUnlockedSupply, purchaseSupply, unlockedSupplyKinds } from "../core/supply";
import type { SupplyKind } from "../core/supply";
import {
  DEFAULT_META_DISCOVERY,
  acknowledgeCollectionUnlocks,
  acknowledgeDailyUnlock,
  dailyUnlockPending,
  pendingCollectionUnlockLevel,
  sanitizeMetaDiscovery,
  type MetaDiscoveryState,
} from "../core/metaDiscovery";
import {
  buildChapterLeaderboard,
  buildEfficiencyLeaderboard,
  paginateLeaderboard,
  type ChapterLeaderboardEntry,
  type EfficiencyLeaderboardEntry,
  type LeaderboardPage,
} from "../core/localLeaderboard";
import type { BlockColor, BlockState, Difficulty, ExitAttemptStatus, Point, PuzzleSnapshot, Side } from "../core/types";
import type { GameHost, PointerSample, SoundKind } from "../platform/Host";
import { ART_ATLASES, GAME_ART } from "./artManifest";
import { chooseBlockBadgeCell } from "./blockBadge";
import { buildBlockConnectorLayout } from "./blockConnectors";
import { pickNearbyBlock } from "./blockPicker";
import { blockingBlockForSweep } from "./blockingFocus";
import { adaptiveRescueAction } from "./adaptiveRescue";
import { localBreakthroughAction, type LocalBreakthroughAction } from "./localBreakthroughFocus";
import { buildBoardRimLayout } from "./boardRim";
import { availableGateTargets, gateIsAvailableTarget } from "./gateFocus";
import { blockAvailabilityVisual, gateReadinessVisual } from "./availabilityVisuals";
import { gateReadinessMap, type GateReadiness } from "./gateReadiness";
import {
  expandInteractionTarget,
  MINIMUM_INTERACTION_TARGET_CSS,
  type HitTargetOptions,
} from "./hitTargets";
import {
  advanceContinuousDragPose,
  candidateGridSteps,
  chooseNearestReachableSnap,
  chooseReleaseExitSide,
  createContinuousCollisionValidator,
  easeOutCubic,
  isContinuousPoseAtEdge,
  sweepContinuousPose,
  type ContinuousPoseValidator,
} from "./continuousDrag";
import { tutorialGuideMotion } from "./tutorialGuideMotion";
import { MECHANISM_GUIDE } from "../core/mechanismCatalog";

const LOGICAL_WIDTH = 496;
const LOGICAL_HEIGHT = 1078;
const SAVE_KEY = "color-escape-save-v1";
const LEVELS_PER_PAGE = 10;
const LEVEL_PAGE_COUNT = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);
const QUICK_CLEAR_MAX_LEVEL = 3;
const QUICK_CLEAR_DURATION = 0.58;
const QUICK_CLEAR_REDUCED_DURATION = 0.24;
const BLOCKED_FEEDBACK_DURATION = 0.18;
const BLOCKER_FOCUS_DURATION = 0.62;
const BLOCKER_FOCUS_REDUCED_DURATION = 0.34;
const EXIT_TO_MECHANIC_DELAY = 0.2;
const EXIT_TO_MECHANIC_REDUCED_DELAY = 0.14;
const CONVEYOR_MOTION_DURATION = 0.18;
const MAX_CAUSAL_RELAYS_PER_ACTION = 3;
const MAX_ADAPTIVE_RESCUE_DRAGS = 1;
const DRAG_DEAD_ZONE = 5;
const DRAG_SWEEP_STEP = 0.08;
const DRAG_GRID_HYSTERESIS = 0.08;
const DRAG_SETTLE_DURATION = 0.09;
const DRAG_RETURN_DURATION = 0.12;
const UPDATE_TOAST_DURATION = 6;
const BOOSTER_UNLOCK_TOAST_DURATION = 3.6;
const BOOSTER_UNLOCK_TOAST_REDUCED_DURATION = 2.4;
const MAIN_NAVIGATION_TRANSITION_DURATION = 0.2;
const STARTUP_DEFERRED_ART_DELAY_MS = 80;
const ART_LOAD_CONCURRENCY = 6;
const DAILY_ROLLOVER_MAX_CHECK_MS = 60_000;
const DAILY_ROLLOVER_SLOP_MS = 80;
const MINIMUM_BLOCK_PICK_TARGET_CSS = 44;
const BLOCK_PICK_AMBIGUITY_CSS = 4;

const gentleReverseStep = (progress: number): number => {
  const t = Math.min(1, Math.max(0, progress));
  // Ninth-order smoothstep keeps the first 50 ms below 5% travel at 20 FPS,
  // while still reaching both endpoints with zero velocity and acceleration.
  return t ** 5 * (126 - 420 * t + 540 * t ** 2 - 315 * t ** 3 + 70 * t ** 4);
};
const UPDATE_NOTICE = {
  id: "2026-09-07-r107",
  date: "2026年9月7日",
  items: [
    "碰到障碍后可直接转向",
    "松手落位和出口吸附更准确",
    "修复长按未移动却增加步数",
  ],
} as const;

type Screen = "home" | "levels" | "records" | "supply" | "leaderboard" | "settings" | "updates" | "resetConfirm" | "feature" | "playing" | "paused" | "celebrating" | "win" | "failed" | "settlementFailed";
type MainNavigationScreen = "supply" | "leaderboard" | "home" | "levels" | "records";

interface SettlementPresentation {
  assistedClear: boolean;
  earnedStars: number;
  firstClearReward: boolean;
  dailyReward: number;
  dailySettlementUnavailable: boolean;
  quickClear: boolean;
}

interface PendingSettlement {
  candidateSave: SaveData;
  baselineSave: SaveData;
  presentation: SettlementPresentation;
}
interface PendingSettlementAbandon {
  candidateSave: SaveData;
  baselineSave: SaveData;
}
type PersistenceOutcome = "committed" | "rejected" | "unknown";
type SettlementFailureKind = Exclude<PersistenceOutcome, "committed">;
type LeaderboardMode = "chapters" | "efficiency";
type Booster = SupplyKind;

interface SaveData {
  schemaVersion: 1;
  currentLevel: number;
  highestLevel: number;
  coins: number;
  sound: boolean;
  haptic: boolean;
  reducedMotion: boolean;
  featureSeen: string[];
  boosterUnlockSeen: Booster[];
  metaDiscovery: MetaDiscoveryState;
  boosters: Record<Booster, number>;
  bestStars: Record<string, number>;
  bestMoves: Record<string, number>;
  rewardedLevels: number[];
  dailyStreak: number;
  lastDailyCompletedDay: string;
  lastSeenUpdate: string;
  activeRun?: {
    levelId: number;
    returnLevelId: number;
    daily: boolean;
    dailyDayKey?: string;
    boosterSpent: Record<Booster, number>;
  };
}

interface Rect { x: number; y: number; width: number; height: number }
interface BoardLayout extends Rect { cell: number; innerX: number; innerY: number; innerWidth: number; innerHeight: number }
interface TutorialGuideGeometry {
  blockId: string;
  origins: Point[];
  points: { x: number; y: number }[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  reason?: "authored" | "blocker" | "followup" | "space";
  focusBlockId?: string;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  spin: number;
  fragmentColor?: BlockColor;
  fragmentIndex?: number;
}
interface ExitGhost { block: BlockState; side: Side; age: number; duration: number }
interface ExitPulse { side: Side; offset: number; size: number; color: BlockColor; age: number; duration: number }
interface ExitFailureFeedback extends Rect {
  status: Exclude<ExitAttemptStatus, "ok">;
  text: string;
  age: number;
  duration: number;
}
interface BoosterFeedback { text: string; color: string; age: number; duration: number }
interface BoosterUnlockToast { kind: Booster; age: number; duration: number }
interface UndoAction { booster?: Booster }
interface DragVisualState {
  blockId: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  modelX: number;
  modelY: number;
  started: boolean;
  lastIntentAxis?: "x" | "y";
  exitFeedbackSides: Set<Side>;
  settling: boolean;
  settleFromX: number;
  settleFromY: number;
  settleToX: number;
  settleToY: number;
  settleElapsed: number;
  settleDuration: number;
  isPoseValid: ContinuousPoseValidator;
}
interface DragGridSyncResult {
  moved: boolean;
  exitSides: Side[];
}
interface MainNavigationTransition {
  from: MainNavigationScreen;
  to: MainNavigationScreen;
  direction: -1 | 1;
  age: number;
  duration: number;
  startProgress: number;
  easing: "out" | "smooth";
}
interface MechanicPulse {
  kind: MechanicEventKind;
  target: "gate" | "block" | "shutter";
  targetId: string;
  shutterSkin?: "shutter" | "generator";
  x: number;
  y: number;
  width: number;
  height: number;
  sourceX?: number;
  sourceY?: number;
  delay: number;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  motionDuration: number;
  age: number;
  duration: number;
  remaining: number;
  unlocked: boolean;
  burstColor: string;
  burstCount: number;
  burstSpeed: number;
  shakeDuration: number;
  presented: boolean;
}

const COLOR_STYLE: Record<BlockColor, { base: string; light: string; dark: string; ink: string }> = {
  red: { base: "#f22f3e", light: "#ff6671", dark: "#9f1026", ink: "#ffe8eb" },
  blue: { base: "#1787f3", light: "#57b9ff", dark: "#0750b5", ink: "#e9f7ff" },
  green: { base: "#24bf45", light: "#64eb70", dark: "#087c2b", ink: "#ecfff0" },
  yellow: { base: "#ffc319", light: "#ffe65f", dark: "#cc7900", ink: "#fff9dc" },
  purple: { base: "#a33ceb", light: "#dc77ff", dark: "#5f159d", ink: "#f9eaff" },
  orange: { base: "#ff7d16", light: "#ffb44e", dark: "#b53b06", ink: "#fff2e5" },
  pink: { base: "#f746a0", light: "#ff83c3", dark: "#a91368", ink: "#ffecf7" },
  cyan: { base: "#24cae8", light: "#83efff", dark: "#087aab", ink: "#e8fdff" },
};

const COLOR_MARK: Record<BlockColor, string> = {
  red: "●", blue: "◆", green: "▲", yellow: "■", purple: "✦", orange: "⬟", pink: "♥", cyan: "✚",
};
const LAYER_BADGE_INDEX: Record<BlockColor, number> = {
  red: 0, blue: 1, green: 2, yellow: 3, purple: 4, orange: 5, pink: 6, cyan: 7,
};

const DEFAULT_SAVE: SaveData = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: true,
  haptic: true,
  reducedMotion: false,
  featureSeen: [],
  boosterUnlockSeen: [],
  metaDiscovery: { ...DEFAULT_META_DISCOVERY },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "",
};

const BUTTONS = {
  homeSupply: { x: 10, y: 58, width: 158, height: 64 },
  homeSettings: { x: 420, y: 54, width: 68, height: 72 },
  homePlay: { x: 118, y: 764, width: 260, height: 98 },
  homeDaily: { x: 120, y: 864, width: 256, height: 82 },
  homePrev: { x: 38, y: 654, width: 78, height: 92 },
  homeNext: { x: 380, y: 654, width: 78, height: 92 },
  homeLevels: { x: 0, y: 978, width: 165, height: 100 },
  homeRecords: { x: 331, y: 978, width: 165, height: 100 },
  menuBack: { x: 25, y: 44, width: 58, height: 58 },
  levelsPrev: { x: 22, y: 910, width: 118, height: 52 },
  levelsNext: { x: 356, y: 910, width: 118, height: 52 },
  leaderboardChapters: { x: 76, y: 276, width: 166, height: 54 },
  leaderboardEfficiency: { x: 254, y: 276, width: 166, height: 54 },
  leaderboardPrev: { x: 22, y: 910, width: 118, height: 52 },
  leaderboardNext: { x: 356, y: 910, width: 118, height: 52 },
  updateToast: { x: 70, y: 130, width: 356, height: 96 },
  settingsUpdates: { x: 85, y: 750, width: 326, height: 64 },
  settingsReset: { x: 82, y: 842, width: 332, height: 70 },
  undo: { x: 25, y: 111, width: 58, height: 58 },
  pause: { x: 414, y: 111, width: 58, height: 58 },
  time: { x: 91, y: 949, width: 82, height: 82 },
  rocket: { x: 207, y: 949, width: 82, height: 82 },
  pulse: { x: 323, y: 949, width: 82, height: 82 },
  modalPrimary: { x: 111, y: 720, width: 274, height: 70 },
  modalSecondary: { x: 111, y: 804, width: 274, height: 58 },
  pauseResume: { x: 111, y: 686, width: 274, height: 70 },
  pauseRestart: { x: 111, y: 776, width: 130, height: 58 },
  pauseHome: { x: 255, y: 776, width: 130, height: 58 },
};

const MAIN_NAVIGATION: ReadonlyArray<{ screen: MainNavigationScreen; label: string }> = [
  { screen: "supply", label: "商店" },
  { screen: "leaderboard", label: "排行" },
  { screen: "home", label: "主页" },
  { screen: "levels", label: "旅程" },
  { screen: "records", label: "收藏" },
];

const JOURNEY_NODE_CENTERS: ReadonlyArray<readonly [number, number]> = [
  [218, 855], [304, 765], [213, 691], [304, 616], [213, 549],
  [302, 490], [212, 423], [306, 356], [228, 296], [311, 215],
];

const COLLECTION_COLOR_ITEMS = [
  { id: "red", kind: "color", color: "red", title: "红色核心", detail: "红色圆点方块", unlockLevel: 1 },
  { id: "blue", kind: "color", color: "blue", title: "蓝色棱镜", detail: "蓝色菱形方块", unlockLevel: 1 },
  { id: "green", kind: "color", color: "green", title: "绿色航标", detail: "绿色三角方块", unlockLevel: 1 },
  { id: "yellow", kind: "color", color: "yellow", title: "黄色方晶", detail: "黄色方形方块", unlockLevel: 3 },
  { id: "purple", kind: "color", color: "purple", title: "紫色星芒", detail: "紫色闪光方块", unlockLevel: 6 },
  { id: "orange", kind: "color", color: "orange", title: "橙色六芒", detail: "橙色六边方块", unlockLevel: 10 },
  { id: "pink", kind: "color", color: "pink", title: "粉色心核", detail: "粉色心形方块", unlockLevel: 31 },
  { id: "cyan", kind: "color", color: "cyan", title: "青色增幅", detail: "青色十字方块", unlockLevel: 51 },
] as const;

const COLLECTION_MECHANISM_ITEMS = MECHANISM_GUIDE.map((item) => ({
  ...item,
  kind: "mechanism" as const,
  detail: item.effect,
}));

type CollectionCategory = "colors" | "mechanisms";
type CollectionItem = (typeof COLLECTION_COLOR_ITEMS)[number] | (typeof COLLECTION_MECHANISM_ITEMS)[number];

const LEGACY_COLLECTION_DISCOVERY_LEVELS = [1, 3, 6, 10, 15, 31, 35, 51, 100] as const;
const COLLECTION_DISCOVERY_LEVELS = [1, 2, 3, 6, 10, 11, 15, 31, 35, 50, 51, 70, 91] as const;
const COLLECTION_CATEGORY_RECTS: Record<CollectionCategory, Rect> = {
  colors: { x: 45, y: 120, width: 196, height: 54 },
  mechanisms: { x: 255, y: 120, width: 196, height: 54 },
};
const COLLECTION_DETAIL_RECT: Rect = { x: 44, y: 736, width: 408, height: 178 };

type SettingKind = "sound" | "haptic" | "reducedMotion";

const SETTINGS_RECTS: Record<SettingKind, Rect> = {
  sound: { x: 42, y: 220, width: 412, height: 146 },
  haptic: { x: 42, y: 398, width: 412, height: 146 },
  reducedMotion: { x: 42, y: 576, width: 412, height: 146 },
};

const SUPPLY_RECTS: Record<Booster, Rect> = {
  time: { x: 36, y: 370, width: 424, height: 160 },
  rocket: { x: 36, y: 548, width: 424, height: 160 },
  pulse: { x: 36, y: 726, width: 424, height: 160 },
};

const PAUSE_SETTING_RECTS: Record<SettingKind, Rect> = {
  sound: { x: 136, y: 453, width: 88, height: 50 },
  haptic: { x: 272, y: 453, width: 88, height: 50 },
  reducedMotion: { x: 204, y: 598, width: 88, height: 50 },
};

const inside = (x: number, y: number, rect: Rect): boolean => (
  x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height
);

const copyDefaultSave = (): SaveData => JSON.parse(JSON.stringify(DEFAULT_SAVE)) as SaveData;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const canonicalStorageValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalStorageValue);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalStorageValue(value[key])]),
  );
};

const storageValuesEqual = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(canonicalStorageValue(left)) === JSON.stringify(canonicalStorageValue(right));
  } catch {
    return false;
  }
};

const boundedInteger = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(numeric)));
};

const boundedStringSet = (value: unknown, limit = 64, maxLength = 64): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => (
    typeof item === "string" && item.length > 0 && item.length <= maxLength
  )))].slice(0, limit);
};

const sanitizeLevelRecord = (value: unknown, maximum: number): Record<string, number> => {
  if (!isPlainRecord(value)) return {};
  const result: Record<string, number> = {};
  for (const [rawLevel, rawMetric] of Object.entries(value)) {
    const level = Number(rawLevel);
    if (!Number.isInteger(level) || level < 1 || level > LEVELS.length) continue;
    const metric = boundedInteger(rawMetric, 0, 0, maximum);
    if (metric > 0) result[String(level)] = metric;
  }
  return result;
};

const validLocalDay = (value: unknown): string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? "" : value;
};

export class ColorEscapeGame {
  private readonly host: GameHost;
  private readonly ctx: CanvasRenderingContext2D;
  private save: SaveData;
  private model: PuzzleModel;
  private screen: Screen = "home";
  private selectedId?: string;
  private activePointer?: number;
  private selectionAssist?: { blockId: string; distanceCss: number; maximumDistanceCss: number };
  private pointerDown = { x: 0, y: 0 };
  private pointerNow = { x: 0, y: 0 };
  private dragVisual?: DragVisualState;
  private particles: Particle[] = [];
  private exitGhosts: ExitGhost[] = [];
  private exitPulses: ExitPulse[] = [];
  private exitFailure?: ExitFailureFeedback;
  private mechanicPulses: MechanicPulse[] = [];
  private boardShakeTime = 0;
  private lastFrame = 0;
  private celebrationTime = 0;
  private pendingCelebration = 0;
  private quickClear = false;
  private elapsed = 0;
  private boosterTarget?: Booster;
  private boosterFeedback?: BoosterFeedback;
  private hudFeedback?: BoosterFeedback;
  private supplyFeedback?: { text: string; color: string };
  private updateToastVisible = false;
  private updateToastAge = 0;
  private boosterUnlockToast?: BoosterUnlockToast;
  private updateReturnScreen: "home" | "settings" = "home";
  private undoActions: UndoAction[] = [];
  private lastMoveSoundAt = 0;
  private lastBlockedSoundAt = 0;
  private blockedBlockId?: string;
  private blockedFeedbackTime = 0;
  private blockerFocusBlockId?: string;
  private blockerFocusTime = 0;
  private grabFeedbackTime = 0;
  private noClearMoveStreak = 0;
  private strategyNudgeAcknowledged = false;
  private strategyFollowupAvailableAt?: number;
  private strategyFollowupAction?: LocalBreakthroughAction & { from: Point };
  private strategyFollowupDrags = 0;
  private strategyNudgeDrag?: {
    blockId: string;
    target: Point;
    reason: "authored" | "blocker" | "followup";
    focusBlockId: string;
  };
  private strategyRescueDrags = 0;
  private fpsSamples: number[] = [];
  private dirty = true;
  private framePending = false;
  private earnedStars = 0;
  private firstClearReward = false;
  private assistedClear = false;
  private dailyMode = false;
  private dailyReward = 0;
  private dailyReturnLevelId = 1;
  private dailyChallengeDayKey?: string;
  private dailySettlementUnavailable = false;
  private observedLocalDayKey = localDayKey();
  private homeDailyRenderedDayKey = "";
  private dailyRolloverTimer?: number;
  private appVisible: boolean;
  private storageBaselineReady: boolean;
  private storageReadAttempts = 0;
  private pendingSettlement?: PendingSettlement;
  private pendingSettlementAbandon?: PendingSettlementAbandon;
  private settlementSaveFailed = false;
  private settlementFailureKind?: SettlementFailureKind;
  private settlementSaveAttempts = 0;
  private resetSaveFailed = false;
  private levelPage = 0;
  private leaderboardMode: LeaderboardMode = "chapters";
  private leaderboardPages: Record<LeaderboardMode, number> = { chapters: 0, efficiency: 0 };
  private collectionCategory: CollectionCategory = "colors";
  private collectionSelections: Record<CollectionCategory, number> = { colors: 0, mechanisms: 0 };
  private navigationTransition?: MainNavigationTransition;
  private navigationPendingTarget?: MainNavigationScreen;
  private shellArtReady = false;
  private artReady = false;
  private readonly artLoadStartedAt = Date.now();
  private artShellLoadMs = 0;
  private artFullLoadMs = 0;
  private artLoadedImageCount = 0;
  private artLoadError?: string;
  private artLoadFailurePhase?: "shell" | "deferred";
  private art: {
    home?: HTMLImageElement;
    homeUi?: {
      coinIcon: HTMLImageElement;
      coinPanel: HTMLImageElement;
      settingsButton: HTMLImageElement;
      levelCard: HTMLImageElement;
      levelPill: HTMLImageElement;
      arrowLeft: HTMLImageElement;
      arrowRight: HTMLImageElement;
      startButton: HTMLImageElement;
      dailyRibbon: HTMLImageElement;
      dailyCalendar: HTMLImageElement;
    };
    navigationFive?: {
      icons: HTMLImageElement;
      bar: HTMLImageElement;
      selected: HTMLImageElement;
    };
    journeyTrack?: HTMLImageElement;
    gameplayBackground?: HTMLImageElement;
    boosters?: HTMLImageElement;
    boosterUnlockBanner?: HTMLImageElement;
    discoveryBadge?: HTMLImageElement;
    achievements?: HTMLImageElement;
    onboarding?: HTMLImageElement;
    mechanics?: HTMLImageElement;
    supply?: HTMLImageElement;
    uiPanel?: HTMLImageElement;
    buttons?: HTMLImageElement;
    toggles?: HTMLImageElement;
    systemIcons?: HTMLImageElement;
    settingsIcons?: HTMLImageElement;
    blockCells?: Record<BlockColor, HTMLImageElement>;
    plainBlockCells?: Record<BlockColor, HTMLImageElement>;
    blockConnectors?: Record<BlockColor, HTMLImageElement>;
    gates?: Record<BlockColor, HTMLImageElement>;
    emptyCell?: HTMLImageElement;
    irregularCell?: HTMLImageElement;
    boardRimRail?: HTMLImageElement;
    boardRimCorner?: HTMLImageElement;
    shutter?: HTMLImageElement;
    iceCover?: HTMLImageElement;
    progressionMechanics?: HTMLImageElement;
    mechanismGuideIcons?: HTMLImageElement;
    layerPreviewBadges?: HTMLImageElement;
    particleSpark?: HTMLImageElement;
    exitSuctionTrail?: HTMLImageElement;
    victoryHalo?: HTMLImageElement;
    blockGrabHalo?: HTMLImageElement;
    blockBlockedHalo?: HTMLImageElement;
    blockerFocusCorners?: HTMLImageElement;
    strategyFocusCorners?: HTMLImageElement;
    mechanicRelayMote?: HTMLImageElement;
  } = {};

  constructor(host: GameHost) {
    this.host = host;
    this.ctx = host.context;
    this.appVisible = host.isVisible?.() ?? true;
    const initialStorage = host.storageRead<unknown>(SAVE_KEY);
    this.storageReadAttempts = 1;
    this.storageBaselineReady = initialStorage.status !== "unavailable";
    const loaded = initialStorage.status === "ok" ? initialStorage.value : undefined;
    this.save = this.recoverInterruptedRun(this.sanitizeSave(loaded ?? copyDefaultSave()));
    this.updateToastVisible = this.save.lastSeenUpdate !== UPDATE_NOTICE.id;
    const storedMotionPreference = isPlainRecord(loaded) && typeof loaded.reducedMotion === "boolean";
    if (!storedMotionPreference && host.prefersReducedMotion?.()) this.save.reducedMotion = true;
    if (this.storageBaselineReady) host.storageSet(SAVE_KEY, this.save);
    this.model = new PuzzleModel(getLevel(this.save.currentLevel));
    void this.loadArt();
    host.onPointer({
      down: (sample) => this.handleDown(this.toLogical(sample)),
      move: (sample) => this.handleMove(this.toLogical(sample)),
      up: (sample) => this.handleUp(this.toLogical(sample)),
      cancel: (sample) => this.handleCancel(this.toLogical(sample)),
    });
    host.onHide(() => {
      this.appVisible = false;
      this.cancelDailyRolloverWatch();
      if (this.activePointer !== undefined && this.selectedId) this.model.cancelAction();
      this.selectedId = undefined;
      this.activePointer = undefined;
      this.selectionAssist = undefined;
      this.dragVisual = undefined;
      this.strategyNudgeDrag = undefined;
      this.strategyFollowupAvailableAt = undefined;
      this.strategyFollowupAction = undefined;
      this.strategyFollowupDrags = 0;
      this.strategyRescueDrags = 0;
      this.blockerFocusBlockId = undefined;
      this.blockerFocusTime = 0;
      this.grabFeedbackTime = 0;
      this.boosterTarget = undefined;
      if (this.screen === "playing") this.screen = "paused";
      this.dirty = true;
      this.scheduleFrame();
    });
    host.onShow(() => {
      this.appVisible = true;
      if (!this.storageBaselineReady) this.retryStorageBaseline();
      this.observeLocalDay();
      this.scheduleDailyRolloverWatch();
      this.lastFrame = 0;
      this.dirty = true;
      this.scheduleFrame();
    });
    host.onResize(() => {
      // Pointer samples received before and after a viewport change use different
      // coordinate scales. Cancel the in-flight action so the next sample cannot
      // turn that scale change into a synthetic drag.
      if (this.activePointer !== undefined) {
        this.handleCancel({
          id: this.activePointer,
          x: this.pointerNow.x,
          y: this.pointerNow.y,
        });
      }
      this.lastFrame = 0;
      this.dirty = true;
      this.scheduleFrame();
    });
    this.scheduleDailyRolloverWatch();
  }

  private async loadImages(paths: readonly string[], concurrency = ART_LOAD_CONCURRENCY): Promise<HTMLImageElement[]> {
    const images = new Array<HTMLImageElement>(paths.length);
    let cursor = 0;
    const workerCount = Math.min(Math.max(1, concurrency), paths.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (cursor < paths.length) {
        const index = cursor;
        cursor += 1;
        images[index] = await this.host.createImage(paths[index]);
        this.artLoadedImageCount += 1;
      }
    }));
    return images;
  }

  private failArtLoad(phase: "shell" | "deferred", error: unknown): void {
    this.artLoadFailurePhase = phase;
    this.artLoadError = error instanceof Error ? error.message : String(error);
    this.artReady = false;
    this.dirty = true;
    this.scheduleFrame();
  }

  private async loadArt(): Promise<void> {
    try {
      const [home, homeCoinIcon, homeCoinPanel, homeSettingsButton, homeLevelCard, homeLevelPill, homeArrowLeft, homeArrowRight, homeStartButton, homeDailyRibbon, homeDailyCalendar, navigationFiveIcons, navigationFiveBar, navigationFiveSelected, onboarding, uiPanel] = await this.loadImages([
        GAME_ART.backgrounds.home,
        GAME_ART.ui.home.coinIcon,
        GAME_ART.ui.home.coinPanel,
        GAME_ART.ui.home.settingsButton,
        GAME_ART.ui.home.levelCard,
        GAME_ART.ui.home.levelPill,
        GAME_ART.ui.home.arrowLeft,
        GAME_ART.ui.home.arrowRight,
        GAME_ART.ui.home.startButton,
        GAME_ART.ui.home.dailyRibbon,
        GAME_ART.ui.home.dailyCalendar,
        GAME_ART.ui.navigationFive.icons,
        GAME_ART.ui.navigationFive.bar,
        GAME_ART.ui.navigationFive.selected,
        GAME_ART.ui.onboardingDaily,
        GAME_ART.ui.universalPanel,
      ]);
      this.art = {
        home,
        homeUi: {
          coinIcon: homeCoinIcon,
          coinPanel: homeCoinPanel,
          settingsButton: homeSettingsButton,
          levelCard: homeLevelCard,
          levelPill: homeLevelPill,
          arrowLeft: homeArrowLeft,
          arrowRight: homeArrowRight,
          startButton: homeStartButton,
          dailyRibbon: homeDailyRibbon,
          dailyCalendar: homeDailyCalendar,
        },
        navigationFive: {
          icons: navigationFiveIcons,
          bar: navigationFiveBar,
          selected: navigationFiveSelected,
        },
        onboarding,
        uiPanel,
      };
      this.shellArtReady = true;
      this.artShellLoadMs = Date.now() - this.artLoadStartedAt;
      this.dirty = true;
      this.scheduleFrame();
    } catch (error) {
      this.failArtLoad("shell", error);
      return;
    }

    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, STARTUP_DEFERRED_ART_DELAY_MS));
    await this.loadDeferredArt();
  }

  private async loadDeferredArt(): Promise<void> {
    try {
    const [journeyTrack, gameplayBackground, boosters, boosterUnlockBanner, discoveryBadge, achievements, mechanics, supply, buttons, toggles, systemIcons, settingsIcons, redBlock, blueBlock, greenBlock, yellowBlock, purpleBlock, orangeBlock, pinkBlock, cyanBlock, redPlainBlock, bluePlainBlock, greenPlainBlock, yellowPlainBlock, purplePlainBlock, orangePlainBlock, pinkPlainBlock, cyanPlainBlock, redConnector, blueConnector, greenConnector, yellowConnector, purpleConnector, orangeConnector, pinkConnector, cyanConnector, redGate, blueGate, greenGate, yellowGate, purpleGate, orangeGate, pinkGate, cyanGate, emptyCell, irregularCell, boardRimRail, boardRimCorner, shutter, iceCover, progressionMechanics, mechanismGuideIcons, layerPreviewBadges, particleSpark, exitSuctionTrail, victoryHalo, blockGrabHalo, blockBlockedHalo, blockerFocusCorners, strategyFocusCorners, mechanicRelayMote] = await this.loadImages([
      GAME_ART.ui.journeyTrack,
      GAME_ART.backgrounds.gameplay,
      GAME_ART.ui.boosters,
      GAME_ART.ui.boosterUnlockBanner,
      GAME_ART.ui.discoveryBadge,
      GAME_ART.ui.achievements,
      GAME_ART.fx.mechanics,
      GAME_ART.ui.supplyStation,
      GAME_ART.ui.buttons,
      GAME_ART.ui.toggles,
      GAME_ART.ui.systemIcons,
      GAME_ART.ui.settingsIcons,
      GAME_ART.gameplay.blocks.red,
      GAME_ART.gameplay.blocks.blue,
      GAME_ART.gameplay.blocks.green,
      GAME_ART.gameplay.blocks.yellow,
      GAME_ART.gameplay.blocks.purple,
      GAME_ART.gameplay.blocks.orange,
      GAME_ART.gameplay.blocks.pink,
      GAME_ART.gameplay.blocks.cyan,
      GAME_ART.gameplay.plainBlocks.red,
      GAME_ART.gameplay.plainBlocks.blue,
      GAME_ART.gameplay.plainBlocks.green,
      GAME_ART.gameplay.plainBlocks.yellow,
      GAME_ART.gameplay.plainBlocks.purple,
      GAME_ART.gameplay.plainBlocks.orange,
      GAME_ART.gameplay.plainBlocks.pink,
      GAME_ART.gameplay.plainBlocks.cyan,
      GAME_ART.gameplay.connectors.red,
      GAME_ART.gameplay.connectors.blue,
      GAME_ART.gameplay.connectors.green,
      GAME_ART.gameplay.connectors.yellow,
      GAME_ART.gameplay.connectors.purple,
      GAME_ART.gameplay.connectors.orange,
      GAME_ART.gameplay.connectors.pink,
      GAME_ART.gameplay.connectors.cyan,
      GAME_ART.gameplay.gates.red,
      GAME_ART.gameplay.gates.blue,
      GAME_ART.gameplay.gates.green,
      GAME_ART.gameplay.gates.yellow,
      GAME_ART.gameplay.gates.purple,
      GAME_ART.gameplay.gates.orange,
      GAME_ART.gameplay.gates.pink,
      GAME_ART.gameplay.gates.cyan,
      GAME_ART.gameplay.emptyCell,
      GAME_ART.gameplay.irregularCell,
      GAME_ART.gameplay.boardRimRail,
      GAME_ART.gameplay.boardRimCorner,
      GAME_ART.gameplay.shutter,
      GAME_ART.gameplay.iceCover,
      GAME_ART.gameplay.progressionMechanics,
      GAME_ART.gameplay.mechanismGuideIcons,
      GAME_ART.gameplay.layerPreviewBadges,
      GAME_ART.fx.particleSpark,
      GAME_ART.fx.exitSuctionTrail,
      GAME_ART.fx.victoryHalo,
      GAME_ART.fx.blockGrabHalo,
      GAME_ART.fx.blockBlockedHalo,
      GAME_ART.fx.blockerFocusCorners,
      GAME_ART.fx.strategyFocusCorners,
      GAME_ART.fx.mechanicRelayMote,
    ]);
    this.art = {
      ...this.art,
      journeyTrack,
      gameplayBackground,
      boosters,
      boosterUnlockBanner,
      discoveryBadge,
      achievements,
      mechanics,
      supply,
      buttons,
      toggles,
      systemIcons,
      settingsIcons,
      blockCells: {
        red: redBlock,
        blue: blueBlock,
        green: greenBlock,
        yellow: yellowBlock,
        purple: purpleBlock,
        orange: orangeBlock,
        pink: pinkBlock,
        cyan: cyanBlock,
      },
      plainBlockCells: {
        red: redPlainBlock,
        blue: bluePlainBlock,
        green: greenPlainBlock,
        yellow: yellowPlainBlock,
        purple: purplePlainBlock,
        orange: orangePlainBlock,
        pink: pinkPlainBlock,
        cyan: cyanPlainBlock,
      },
      blockConnectors: {
        red: redConnector,
        blue: blueConnector,
        green: greenConnector,
        yellow: yellowConnector,
        purple: purpleConnector,
        orange: orangeConnector,
        pink: pinkConnector,
        cyan: cyanConnector,
      },
      gates: {
        red: redGate,
        blue: blueGate,
        green: greenGate,
        yellow: yellowGate,
        purple: purpleGate,
        orange: orangeGate,
        pink: pinkGate,
        cyan: cyanGate,
      },
      emptyCell,
      irregularCell,
      boardRimRail,
      boardRimCorner,
      shutter,
      iceCover,
      progressionMechanics,
      mechanismGuideIcons,
      layerPreviewBadges,
      particleSpark,
      exitSuctionTrail,
      victoryHalo,
      blockGrabHalo,
      blockBlockedHalo,
      blockerFocusCorners,
      strategyFocusCorners,
      mechanicRelayMote,
    };
    this.artReady = true;
    this.artFullLoadMs = Date.now() - this.artLoadStartedAt;
    this.dirty = true;
    this.scheduleFrame();
    } catch (error) {
      this.failArtLoad("deferred", error);
    }
  }

  start(): void {
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.framePending) return;
    this.framePending = true;
    this.host.requestFrame((time) => {
      this.framePending = false;
      this.frame(time);
    });
  }

  loadLevel(id: number, play = false, daily = false, dailyDayKey?: string): void {
    const normalized = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(id)) || 1));
    const continuedDailyDayKey = daily && this.dailyMode
      ? validLocalDay(dailyDayKey)
        || validLocalDay(this.save.activeRun?.dailyDayKey)
        || validLocalDay(this.dailyChallengeDayKey)
      : validLocalDay(dailyDayKey);
    const resolvedDailyDayKey = daily
      ? continuedDailyDayKey || undefined
      : undefined;
    this.save.activeRun = undefined;
    if (!daily) this.save.currentLevel = normalized;
    this.model = new PuzzleModel(getLevel(normalized));
    this.selectedId = undefined;
    this.activePointer = undefined;
    this.selectionAssist = undefined;
    this.dragVisual = undefined;
    this.strategyNudgeDrag = undefined;
    this.strategyFollowupAvailableAt = undefined;
    this.strategyFollowupAction = undefined;
    this.strategyFollowupDrags = 0;
    this.strategyRescueDrags = 0;
    this.boosterTarget = undefined;
    this.boosterFeedback = undefined;
    this.hudFeedback = undefined;
    this.supplyFeedback = undefined;
    this.undoActions = [];
    this.blockedBlockId = undefined;
    this.blockedFeedbackTime = 0;
    this.blockerFocusBlockId = undefined;
    this.blockerFocusTime = 0;
    this.grabFeedbackTime = 0;
    this.noClearMoveStreak = 0;
    this.strategyNudgeAcknowledged = false;
    this.earnedStars = 0;
    this.firstClearReward = false;
    this.assistedClear = false;
    this.dailyMode = daily;
    this.dailyChallengeDayKey = resolvedDailyDayKey;
    this.dailyReward = 0;
    this.dailySettlementUnavailable = false;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.boosterUnlockToast = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.settlementSaveAttempts = 0;
    this.particles = [];
    this.exitGhosts = [];
    this.exitPulses = [];
    this.exitFailure = undefined;
    this.mechanicPulses = [];
    this.boardShakeTime = 0;
    this.pendingCelebration = 0;
    this.celebrationTime = 0;
    this.quickClear = false;
    this.navigationTransition = undefined;
    this.navigationPendingTarget = undefined;
    this.screen = play ? "playing" : "home";
    if (play) this.save.activeRun = this.createRunJournal(normalized, daily);
    this.dirty = true;
    this.persist();
    this.scheduleFrame();
  }

  getDebugState(): Record<string, unknown> {
    const strategyFocusBlock = this.strategyFocusBlock();
    const strategyNudgePlan = this.strategyNudgeOrigins();
    const leaderboard = this.leaderboardPageView();
    const daily = this.dailyStatus();
    const collectionItems = this.collectionItems();
    const collectionSelection = this.collectionSelections[this.collectionCategory];
    const selectedCollectionItem = collectionItems[collectionSelection] ?? collectionItems[0];
    return {
      screen: this.screen,
      storage: {
        baselineReady: this.storageBaselineReady,
        status: this.storageBaselineReady ? "ready" : "unavailable",
        readAttempts: this.storageReadAttempts,
      },
      viewportTransform: this.viewportTransform(),
      level: this.model.level,
      puzzle: this.model.snapshot(),
      selectedId: this.selectedId,
      activePointer: this.activePointer,
      selectionAssist: this.selectionAssist ? { ...this.selectionAssist } : undefined,
      dragMotion: this.dragVisual ? {
        blockId: this.dragVisual.blockId,
        state: this.dragVisual.settling ? "settling" : this.dragVisual.started ? "dragging" : "held",
        visualX: this.dragVisual.x,
        visualY: this.dragVisual.y,
        gridX: this.model.getBlock(this.dragVisual.blockId)?.x,
        gridY: this.model.getBlock(this.dragVisual.blockId)?.y,
        fractionalX: this.dragVisual.x - Math.round(this.dragVisual.x),
        fractionalY: this.dragVisual.y - Math.round(this.dragVisual.y),
        settleRemaining: this.dragVisual.settling
          ? Math.max(0, this.dragVisual.settleDuration - this.dragVisual.settleElapsed)
          : 0,
      } : undefined,
      boosterTarget: this.boosterTarget,
      boosterFeedback: this.boosterFeedback ? { text: this.boosterFeedback.text, color: this.boosterFeedback.color } : undefined,
      hudFeedback: this.hudFeedback ? { text: this.hudFeedback.text, color: this.hudFeedback.color } : undefined,
      undoActions: this.undoActions.map((action) => ({ ...action })),
      controls: {
        undoEnabled: this.undoActions.length > 0,
        boosters: {
          time: this.boosterUnlocked("time") && this.save.boosters.time > 0,
          rocket: this.boosterUnlocked("rocket") && this.save.boosters.rocket > 0,
          pulse: this.boosterUnlocked("pulse") && this.save.boosters.pulse > 0,
        },
      },
      interactionTargets: this.interactionTargetEvidence(),
      settings: { sound: this.save.sound, haptic: this.save.haptic, reducedMotion: this.save.reducedMotion },
      progression: { highestLevel: this.save.highestLevel, bestStars: { ...this.save.bestStars }, bestMoves: { ...this.save.bestMoves } },
      boosterUnlock: {
        seen: [...this.save.boosterUnlockSeen],
        pending: this.boosterUnlockToast ? {
          kind: this.boosterUnlockToast.kind,
          title: SUPPLY_ITEMS[this.boosterUnlockToast.kind].title,
          effect: SUPPLY_ITEMS[this.boosterUnlockToast.kind].effect,
          age: this.boosterUnlockToast.age,
          duration: this.boosterUnlockToast.duration,
          rect: this.boosterUnlockToastRect(),
          visible: this.boosterUnlockToastEligible(),
        } : undefined,
        artReady: Boolean(this.art.boosterUnlockBanner),
      },
      assistedClear: this.assistedClear,
      economy: { coins: this.save.coins, boosters: { ...this.save.boosters }, rewardedLevels: [...this.save.rewardedLevels] },
      supply: {
        feedback: this.supplyFeedback ? { ...this.supplyFeedback } : undefined,
        items: SUPPLY_ORDER.map((kind) => ({
          ...SUPPLY_ITEMS[kind],
          stock: this.save.boosters[kind],
          unlocked: this.boosterUnlocked(kind),
          affordable: this.boosterUnlocked(kind) && this.save.coins >= SUPPLY_ITEMS[kind].price,
          full: this.save.boosters[kind] >= SUPPLY_ITEMS[kind].maxStock,
        })),
      },
      activeRun: this.save.activeRun ? {
        ...this.save.activeRun,
        boosterSpent: { ...this.save.activeRun.boosterSpent },
      } : undefined,
      settlement: {
        status: this.settlementSaveFailed
          ? "failed"
          : this.screen === "celebrating" || this.screen === "win" ? "committed" : "idle",
        kind: this.dailyMode ? "daily" : "normal",
        levelId: this.model.level.id,
        attempts: this.settlementSaveAttempts,
        operation: this.pendingSettlementAbandon ? "abandon" : "settle",
        retryAvailable: this.screen === "settlementFailed",
        persistence: this.screen === "settlementFailed" ? this.settlementFailureKind : undefined,
        message: this.screen === "settlementFailed" ? this.settlementFailureDetail() : undefined,
        actions: this.screen === "settlementFailed"
          ? {
            primary: this.pendingSettlementAbandon ? "重试返回" : "重试保存",
            secondary: this.pendingSettlementAbandon || this.settlementFailureKind === "unknown"
              ? undefined
              : "放弃并返回",
          }
          : undefined,
        rewardPresented: !this.settlementSaveFailed && (this.screen === "celebrating" || this.screen === "win"),
        pendingCoinDelta: this.pendingSettlementAbandon
          ? this.pendingSettlementAbandon.candidateSave.coins - this.save.coins
          : this.pendingSettlement
            ? this.pendingSettlement.candidateSave.coins - this.save.coins
          : 0,
      },
      reset: { saveFailed: this.resetSaveFailed },
      daily: {
        mode: this.dailyMode,
        selectedLevel: daily.levelId,
        unlocked: daily.unlocked,
        completedToday: daily.completedToday,
        today: daily.today,
        challengeDayKey: this.dailyChallengeDayKey,
        lastCompletedDay: this.save.lastDailyCompletedDay,
        streak: this.save.dailyStreak,
        reward: this.dailyReward,
        settlementUnavailable: this.dailySettlementUnavailable,
        unlockDiscoveryPending: this.dailyUnlockDiscoveryPending(),
        homeRenderedDay: this.homeDailyRenderedDayKey,
        rolloverWatchDay: this.observedLocalDayKey,
        rolloverWatchScheduled: this.dailyRolloverTimer !== undefined,
      },
      navigation: {
        selected: this.navigationPendingTarget
          ?? (this.navigationTransition?.to
            ?? (this.isMainNavigationScreen(this.screen) ? this.screen : undefined)),
        tabs: MAIN_NAVIGATION.map((tab) => ({ ...tab })),
        artReady: Boolean(this.art.navigationFive?.icons && this.art.navigationFive.bar && this.art.navigationFive.selected),
        safe: this.safeOffsets(),
        headerOffset: this.mainPageHeaderOffset(),
        bar: { ...this.mainNavigationRect(0), width: LOGICAL_WIDTH },
        journeyFooterBottom: this.journeyFooterRect(BUTTONS.levelsNext).y + BUTTONS.levelsNext.height,
        leaderboardFooterBottom: this.leaderboardFooterRect(BUTTONS.leaderboardNext).y + BUTTONS.leaderboardNext.height,
        supplyContentBottom: SUPPLY_RECTS.pulse.y + SUPPLY_RECTS.pulse.height + this.supplyPageOffset(),
        transition: this.navigationTransition ? {
          ...this.navigationTransition,
          linearProgress: Math.min(1, this.navigationTransition.age / this.navigationTransition.duration),
          progress: this.mainNavigationVisualProgress(this.navigationTransition),
          pendingTarget: this.navigationPendingTarget,
        } : undefined,
      },
      leaderboard: {
        mode: this.leaderboardMode,
        ...leaderboard,
      },
      collection: {
        category: this.collectionCategory,
        selected: collectionSelection,
        selectedId: selectedCollectionItem?.id,
        selectedTitle: selectedCollectionItem?.title,
        selectedDetail: selectedCollectionItem && this.collectionItemUnlocked(selectedCollectionItem)
          ? selectedCollectionItem.detail
          : undefined,
        displayedDetail: selectedCollectionItem ? this.collectionDetailText(selectedCollectionItem) : undefined,
        selectedUnlocked: selectedCollectionItem ? this.collectionItemUnlocked(selectedCollectionItem) : false,
        unlocked: collectionItems.filter((item) => this.collectionItemUnlocked(item)).length,
        total: collectionItems.length,
        allTotal: COLLECTION_COLOR_ITEMS.length + COLLECTION_MECHANISM_ITEMS.length,
        visibleItemIds: collectionItems.map((item) => item.id),
        artReady: Boolean(this.art.mechanismGuideIcons),
        layout: {
          categoryRects: Object.fromEntries((["colors", "mechanisms"] as const)
            .map((category) => [category, this.collectionCategoryRect(category)])),
          firstCardRect: this.collectionCardRect(0),
          lastCardRect: this.collectionCardRect(collectionItems.length - 1),
          detailRect: this.collectionDetailRect(),
          navigationTop: this.mainNavigationRect(0).y,
        },
      },
      discovery: {
        state: { ...this.save.metaDiscovery },
        collection: {
          pending: this.pendingCollectionDiscoveryLevel() != null,
          newestUnseenLevel: this.pendingCollectionDiscoveryLevel(),
          badgeRect: this.collectionDiscoveryBadgeRect(),
        },
        daily: {
          pending: this.dailyUnlockDiscoveryPending(),
          badgeRect: this.dailyDiscoveryBadgeRect(-this.safeOffsets().bottom),
        },
        artReady: Boolean(this.art.discoveryBadge),
      },
      levelPage: this.levelPage,
      onboarding: {
        basicsSeen: this.save.featureSeen.includes("basics"),
        guide: this.shouldShowBasicTutorial() ? this.tutorialGuideGeometry(this.boardLayout()) : undefined,
      },
      strategyNudge: {
        noClearMoveStreak: this.noClearMoveStreak,
        acknowledged: this.strategyNudgeAcknowledged,
        guide: this.strategyNudgeGuideGeometry(this.boardLayout()),
        visible: Boolean(this.strategyNudgeGuideGeometry(this.boardLayout())),
        reason: strategyNudgePlan?.reason,
        focusBlockId: strategyNudgePlan?.focusBlockId,
        rescueDrags: this.strategyRescueDrags,
        followup: {
          availableAt: this.strategyFollowupAvailableAt,
          ready: Boolean(this.strategyFollowupAction),
          drags: this.strategyFollowupDrags,
        },
        blockerFocusArtReady: Boolean(this.art.blockerFocusCorners),
      },
      strategyFocus: {
        noClearMoveStreak: this.noClearMoveStreak,
        configuredBlockId: this.model.level.strategyFocus?.blockId,
        threshold: this.model.level.strategyFocus?.afterMoves,
        blockId: strategyFocusBlock?.id,
        visible: Boolean(strategyFocusBlock),
        directional: false,
        animated: !this.save.reducedMotion,
        artReady: Boolean(this.art.strategyFocusCorners),
      },
      updateNotice: {
        id: UPDATE_NOTICE.id,
        items: [...UPDATE_NOTICE.items],
        seen: this.save.lastSeenUpdate === UPDATE_NOTICE.id,
        toastVisible: this.updateToastVisible,
        returnScreen: this.screen === "updates" ? this.updateReturnScreen : undefined,
      },
      board: this.boardLayout(),
      averageFps: this.fpsSamples.length ? this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length : 0,
      particles: this.particles.length,
      exitGhosts: this.exitGhosts.length,
      exitSuctionTrailReady: Boolean(this.art.exitSuctionTrail),
      exitPulses: this.exitPulses.map((pulse) => ({ side: pulse.side, color: pulse.color, age: pulse.age })),
      fragmentColors: [...new Set(this.particles.flatMap((particle) => particle.fragmentColor ? [particle.fragmentColor] : []))],
      exitFailure: this.exitFailure ? { status: this.exitFailure.status, text: this.exitFailure.text } : undefined,
      failureActions: this.screen === "failed" ? { primary: "重新挑战", secondary: "返回主页" } : undefined,
      accessibility: {
        colorMarks: { ...COLOR_MARK },
        blockBadges: this.model.snapshot().blocks.map((block) => {
          const cells = this.model.blockCells(block);
          return {
            id: block.id,
            cell: chooseBlockBadgeCell(cells),
            totalCells: cells.length,
            markedCells: 1,
            plainCells: Math.max(0, cells.length - 1),
          };
        }),
        layeredBlocks: this.model.snapshot().blocks
          .filter((block) => block.layers.length > 1)
          .map((block) => ({
            id: block.id,
            outerColor: block.layers[0],
            outerMark: COLOR_MARK[block.layers[0]],
            innerColor: block.layers[1],
            innerMark: COLOR_MARK[block.layers[1]],
          })),
      },
      winAction: this.winActionLabel(),
      winSecondaryAction: this.winSecondaryActionLabel(),
      featureVisual: this.featureVisual(),
      mechanicPulses: this.mechanicPulses.map((pulse) => ({
        kind: pulse.kind,
        target: pulse.target,
        targetId: pulse.targetId,
        shutterSkin: pulse.shutterSkin,
        remaining: pulse.remaining,
        unlocked: pulse.unlocked,
        label: pulse.unlocked ? this.mechanicPulseLabel(pulse) : undefined,
        phase: pulse.presented ? "visible" : "queued",
        delayRemaining: Math.max(0, -pulse.age),
        age: pulse.age,
        relay: pulse.sourceX != null && pulse.sourceY != null ? {
          sourceX: pulse.sourceX,
          sourceY: pulse.sourceY,
          targetX: pulse.x,
          targetY: pulse.y,
          progress: pulse.delay > 0 ? Math.max(0, Math.min(1, 1 + pulse.age / pulse.delay)) : 1,
          visible: !this.save.reducedMotion && pulse.age < 0,
          artReady: Boolean(this.art.mechanicRelayMote),
        } : undefined,
        motion: pulse.kind === "conveyor" && pulse.fromX != null && pulse.fromY != null
          && pulse.toX != null && pulse.toY != null ? {
            from: [pulse.fromX, pulse.fromY],
            to: [pulse.toX, pulse.toY],
            progress: pulse.age <= 0 || this.save.reducedMotion
              ? (pulse.age <= 0 ? 0 : 1)
              : Math.max(0, Math.min(1, pulse.age / pulse.motionDuration)),
          } : undefined,
      })),
      boardShakeTime: this.boardShakeTime,
      selectionFeedback: this.selectedId || this.dragVisual?.settling ? {
        mode: this.blockedBlockId === (this.selectedId ?? this.dragVisual?.blockId) && this.blockedFeedbackTime > 0 ? "blocked" : "grabbed",
        settleRemaining: this.grabFeedbackTime,
        grabHaloReady: Boolean(this.art.blockGrabHalo),
        blockedHaloReady: Boolean(this.art.blockBlockedHalo),
      } : undefined,
      blockerFocus: this.blockerFocusBlockId && this.blockerFocusTime > 0 ? {
        blockId: this.blockerFocusBlockId,
        remaining: this.blockerFocusTime,
        artReady: Boolean(this.art.blockerFocusCorners),
      } : undefined,
      targetGateFocus: (() => {
        const snapshot = this.model.snapshot();
        const selected = this.selectedId ? snapshot.blocks.find((block) => block.id === this.selectedId) : undefined;
        return availableGateTargets(selected, snapshot.gates).map((gate) => ({
          id: gate.id,
          side: gate.side,
          color: gate.color,
          star: Boolean(gate.star),
        }));
      })(),
      pendingCelebration: this.pendingCelebration,
      quickClear: this.quickClear ? {
        fromLevel: this.model.level.id,
        toLevel: Math.min(LEVELS.length, this.model.level.id + 1),
        duration: this.save.reducedMotion ? QUICK_CLEAR_REDUCED_DURATION : QUICK_CLEAR_DURATION,
      } : undefined,
      art: {
        shellReady: this.shellArtReady,
        ready: this.artReady,
        loadedImages: this.artLoadedImageCount,
        shellLoadMs: this.artShellLoadMs,
        fullLoadMs: this.artFullLoadMs,
        loadFailurePhase: this.artLoadFailurePhase,
        loadError: this.artLoadError,
        gameplayBackground: Boolean(this.art.gameplayBackground),
        plainBlocksReady: this.art.plainBlockCells
          ? Object.values(this.art.plainBlockCells).every(Boolean)
          : false,
        layerPreviewBadgesReady: Boolean(this.art.layerPreviewBadges),
      },
    };
  }

  private sanitizeSave(value: unknown): SaveData {
    if (!isPlainRecord(value) || value.schemaVersion !== 1) return copyDefaultSave();
    const highestLevel = boundedInteger(value.highestLevel, 1, 1, LEVELS.length);
    const currentLevel = boundedInteger(value.currentLevel, 1, 1, highestLevel);
    const legacyRewards = Array.from({ length: Math.max(0, highestLevel - 1) }, (_, index) => index + 1);
    const rewardedLevels = Array.isArray(value.rewardedLevels) ? value.rewardedLevels : legacyRewards;
    const sanitizedRewardedLevels = [...new Set(rewardedLevels.filter((id): id is number => (
      typeof id === "number" && Number.isInteger(id) && id >= 1 && id <= LEVELS.length
    )))];
    const legacyCollectionLevel = Math.max(1, ...LEGACY_COLLECTION_DISCOVERY_LEVELS
      .filter((unlockLevel) => unlockLevel <= 1
        || sanitizedRewardedLevels.includes(unlockLevel)
        || highestLevel > unlockLevel));
    const metaDiscovery = sanitizeMetaDiscovery(
      value.metaDiscovery,
      legacyCollectionLevel,
      highestLevel >= 6 && sanitizedRewardedLevels.length > 0,
      LEVELS.length,
    );
    const boosterUnlockSeen = Array.isArray(value.boosterUnlockSeen)
      ? [...new Set(value.boosterUnlockSeen.filter((kind): kind is Booster => SUPPLY_ORDER.includes(kind as Booster)))]
      : unlockedSupplyKinds(highestLevel);
    const storedBoosters = isPlainRecord(value.boosters) ? value.boosters : {};
    const safeCount = (count: unknown, fallback = 0, max = 99): number => boundedInteger(count, fallback, 0, max);
    const boosters = {
      time: safeCount(storedBoosters.time, DEFAULT_SAVE.boosters.time, SUPPLY_ITEMS.time.maxStock),
      rocket: safeCount(storedBoosters.rocket, DEFAULT_SAVE.boosters.rocket, SUPPLY_ITEMS.rocket.maxStock),
      pulse: safeCount(storedBoosters.pulse, DEFAULT_SAVE.boosters.pulse, SUPPLY_ITEMS.pulse.maxStock),
    };
    const storedRun = isPlainRecord(value.activeRun) ? value.activeRun : undefined;
    const storedSpent = isPlainRecord(storedRun?.boosterSpent) ? storedRun.boosterSpent : {};
    const activeLevel = boundedInteger(storedRun?.levelId, currentLevel, 1, highestLevel);
    const returnLevel = boundedInteger(storedRun?.returnLevelId, currentLevel, 1, highestLevel);
    const activeRunDaily = typeof storedRun?.daily === "boolean" ? storedRun.daily : false;
    const activeRunDayKey = activeRunDaily ? validLocalDay(storedRun?.dailyDayKey) : "";
    const activeRun: SaveData["activeRun"] = storedRun ? {
      levelId: activeLevel,
      returnLevelId: returnLevel,
      daily: activeRunDaily,
      ...(activeRunDayKey ? { dailyDayKey: activeRunDayKey } : {}),
      boosterSpent: {
        time: safeCount(storedSpent.time, 0, Math.max(0, SUPPLY_ITEMS.time.maxStock - Math.min(SUPPLY_ITEMS.time.maxStock, boosters.time))),
        rocket: safeCount(storedSpent.rocket, 0, Math.max(0, SUPPLY_ITEMS.rocket.maxStock - Math.min(SUPPLY_ITEMS.rocket.maxStock, boosters.rocket))),
        pulse: safeCount(storedSpent.pulse, 0, Math.max(0, SUPPLY_ITEMS.pulse.maxStock - Math.min(SUPPLY_ITEMS.pulse.maxStock, boosters.pulse))),
      },
    } : undefined;
    return {
      schemaVersion: 1,
      currentLevel,
      highestLevel,
      coins: safeCount(value.coins, DEFAULT_SAVE.coins, 999999),
      sound: typeof value.sound === "boolean" ? value.sound : DEFAULT_SAVE.sound,
      haptic: typeof value.haptic === "boolean" ? value.haptic : DEFAULT_SAVE.haptic,
      reducedMotion: typeof value.reducedMotion === "boolean" ? value.reducedMotion : DEFAULT_SAVE.reducedMotion,
      featureSeen: boundedStringSet(value.featureSeen),
      boosterUnlockSeen,
      metaDiscovery,
      boosters,
      activeRun,
      bestStars: sanitizeLevelRecord(value.bestStars, 3),
      bestMoves: sanitizeLevelRecord(value.bestMoves, 99999),
      rewardedLevels: sanitizedRewardedLevels,
      dailyStreak: boundedInteger(value.dailyStreak, 0, 0, 999),
      lastDailyCompletedDay: validLocalDay(value.lastDailyCompletedDay),
      lastSeenUpdate: typeof value.lastSeenUpdate === "string" ? value.lastSeenUpdate.slice(0, 64) : "",
    };
  }

  private cloneSave(save: SaveData): SaveData {
    return {
      ...save,
      featureSeen: [...save.featureSeen],
      boosterUnlockSeen: [...save.boosterUnlockSeen],
      metaDiscovery: { ...save.metaDiscovery },
      boosters: { ...save.boosters },
      bestStars: { ...save.bestStars },
      bestMoves: { ...save.bestMoves },
      rewardedLevels: [...save.rewardedLevels],
      activeRun: save.activeRun ? {
        ...save.activeRun,
        boosterSpent: { ...save.activeRun.boosterSpent },
      } : undefined,
    };
  }

  private abandonRunCandidate(save: SaveData): SaveData {
    const candidate = this.cloneSave(save);
    const activeRun = candidate.activeRun;
    if (!activeRun) return candidate;
    candidate.currentLevel = activeRun.returnLevelId;
    (Object.keys(candidate.boosters) as Booster[]).forEach((kind) => {
      const recoveryCeiling = Math.max(SUPPLY_ITEMS[kind].maxStock, candidate.boosters[kind]);
      candidate.boosters[kind] = Math.min(recoveryCeiling, candidate.boosters[kind] + activeRun.boosterSpent[kind]);
    });
    candidate.activeRun = undefined;
    return candidate;
  }

  private recoverInterruptedRun(save: SaveData): SaveData {
    return save.activeRun ? this.abandonRunCandidate(save) : save;
  }

  private createRunJournal(levelId: number, daily: boolean): NonNullable<SaveData["activeRun"]> {
    const dailyDayKey = daily ? validLocalDay(this.dailyChallengeDayKey) : "";
    return {
      levelId,
      returnLevelId: daily ? this.dailyReturnLevelId : levelId,
      daily,
      ...(dailyDayKey ? { dailyDayKey } : {}),
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    };
  }

  private beginRunJournal(): void {
    this.save.activeRun = this.createRunJournal(this.model.level.id, this.dailyMode);
    this.persist();
  }

  private beginSelectedChallenge(): void {
    this.beginRunJournal();
    const intro = this.model.level.featureIntro;
    this.screen = intro && !this.save.featureSeen.includes(intro.kind) ? "feature" : "playing";
    this.dirty = true;
    this.scheduleFrame();
  }

  private spendBooster(kind: Booster): void {
    this.save.activeRun ??= this.createRunJournal(this.model.level.id, this.dailyMode);
    this.save.boosters[kind] -= 1;
    this.save.activeRun.boosterSpent[kind] += 1;
  }

  private refundBooster(kind: Booster): void {
    this.save.boosters[kind] += 1;
    if (this.save.activeRun) {
      this.save.activeRun.boosterSpent[kind] = Math.max(0, this.save.activeRun.boosterSpent[kind] - 1);
    }
  }

  private dailyStatus(): { unlocked: boolean; completedToday: boolean; levelId?: number; today: string } {
    const today = localDayKey();
    const unlocked = this.save.highestLevel >= 6;
    const levelId = unlocked ? selectDailyLevel(today, this.save.rewardedLevels, LEVELS.length) : undefined;
    return { unlocked: unlocked && levelId != null, completedToday: this.save.lastDailyCompletedDay === today, levelId, today };
  }

  private unlockedCollectionDiscoveryLevels(): number[] {
    const allItems: readonly CollectionItem[] = [...COLLECTION_COLOR_ITEMS, ...COLLECTION_MECHANISM_ITEMS];
    return COLLECTION_DISCOVERY_LEVELS.filter((unlockLevel) => allItems.some((item) => (
      item.unlockLevel === unlockLevel && this.collectionItemUnlocked(item)
    )));
  }

  private pendingCollectionDiscoveryLevel(): number | undefined {
    return pendingCollectionUnlockLevel(this.save.metaDiscovery, this.unlockedCollectionDiscoveryLevels());
  }

  private dailyUnlockDiscoveryPending(): boolean {
    return dailyUnlockPending(this.save.metaDiscovery, this.dailyStatus().unlocked);
  }

  private commitMetaDiscovery(next: MetaDiscoveryState): PersistenceOutcome {
    if (next === this.save.metaDiscovery) return "committed";
    const candidate = this.cloneSave(this.save);
    candidate.metaDiscovery = next;
    let outcome = this.persistVerified(candidate);
    // Discovery acknowledgement is idempotent. One immediate retry resolves the
    // common bridge case where the write or its acknowledgement was transiently
    // lost. If both attempts remain unknowable, keep the user's acknowledgement
    // in memory so the next ordinary journal write cannot overwrite a write that
    // may already have landed; a later reload still follows durable storage.
    if (outcome === "unknown") outcome = this.persistVerified(candidate);
    if (outcome === "rejected") return outcome;
    this.save = candidate;
    this.dirty = true;
    return outcome;
  }

  private commitTransientAcknowledgement(update: (candidate: SaveData) => void): PersistenceOutcome {
    const baseline = this.save;
    const candidate = this.cloneSave(baseline);
    update(candidate);
    if (storageValuesEqual(candidate, baseline)) return "committed";

    let outcome = this.persistVerified(candidate, baseline);
    // Tutorials and notices are informational rather than assets or rewards.
    // Retry one ambiguous bridge result with the exact same immutable value,
    // then remember the acknowledgement for this live session even when the
    // device definitely rejected it. That prevents an already-read prompt from
    // immediately nagging again; a later launch still follows durable storage.
    if (outcome === "unknown") outcome = this.persistVerified(candidate, baseline);
    this.save = candidate;
    this.dirty = true;
    return outcome;
  }

  private acknowledgeCollectionDiscovery(): PersistenceOutcome {
    return this.commitMetaDiscovery(acknowledgeCollectionUnlocks(
      this.save.metaDiscovery,
      this.unlockedCollectionDiscoveryLevels(),
    ));
  }

  private acknowledgeDailyDiscovery(): PersistenceOutcome {
    return this.commitMetaDiscovery(acknowledgeDailyUnlock(this.save.metaDiscovery));
  }

  private observeLocalDay(): boolean {
    const today = localDayKey();
    if (today === this.observedLocalDayKey) return false;
    this.observedLocalDayKey = today;
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private cancelDailyRolloverWatch(): void {
    if (this.dailyRolloverTimer === undefined) return;
    this.host.cancelTimeout(this.dailyRolloverTimer);
    this.dailyRolloverTimer = undefined;
  }

  private scheduleDailyRolloverWatch(): void {
    this.cancelDailyRolloverWatch();
    if (!this.appVisible) return;
    const measuredUntilNextDay = millisecondsUntilNextLocalDay();
    const untilNextDay = measuredUntilNextDay > 0
      ? measuredUntilNextDay
      : DAILY_ROLLOVER_MAX_CHECK_MS;
    const delay = Math.max(
      DAILY_ROLLOVER_SLOP_MS,
      Math.min(DAILY_ROLLOVER_MAX_CHECK_MS, untilNextDay + DAILY_ROLLOVER_SLOP_MS),
    );
    this.dailyRolloverTimer = this.host.scheduleTimeout(() => {
      this.dailyRolloverTimer = undefined;
      if (!this.appVisible) return;
      this.observeLocalDay();
      this.scheduleDailyRolloverWatch();
    }, delay);
  }

  private dailyChallengeDateLabel(): string {
    const dayKey = validLocalDay(this.dailyChallengeDayKey);
    if (!dayKey) return "该日";
    const [, month, day] = dayKey.split("-").map(Number);
    return `${month}月${day}日`;
  }

  private settlementFailureDetail(): string {
    if (this.pendingSettlementAbandon) {
      return this.settlementFailureKind === "unknown"
        ? "放弃本局与道具返还结果待确认"
        : "放弃本局与道具返还尚未保存";
    }
    if (this.settlementFailureKind === "unknown") {
      if (this.dailyMode) return `${this.dailyChallengeDateLabel()}奖励保存结果待确认`;
      if (this.model.level.id === LEVELS.length) return "赛季完成状态保存结果待确认";
      return "本次结果与奖励保存结果待确认";
    }
    if (this.dailyMode) return `${this.dailyChallengeDateLabel()}奖励与连续天数尚未到账`;
    if (this.model.level.id === LEVELS.length) return "赛季完成状态尚未保存";
    return "本次结果与奖励尚未到账";
  }

  private startDailyChallenge(): void {
    this.observeLocalDay();
    const daily = this.dailyStatus();
    if (!daily.unlocked || !daily.levelId) {
      this.playSound("blocked");
      return;
    }
    if (this.dailyUnlockDiscoveryPending()) this.acknowledgeDailyDiscovery();
    this.dailyReturnLevelId = this.model.level.id;
    this.loadLevel(daily.levelId, true, true, daily.today);
    this.playSound("button");
  }

  private supplyBuyRect(kind: Booster): Rect {
    const row = this.offsetRect(SUPPLY_RECTS[kind], 0, this.supplyPageOffset());
    return { x: row.x + row.width - 144, y: row.y + 36, width: 122, height: 88 };
  }

  private settingRect(kind: SettingKind): Rect {
    return this.offsetRect(SETTINGS_RECTS[kind], 0, this.safeOffsets().top);
  }

  private toggleSetting(kind: SettingKind): void {
    this.save[kind] = !this.save[kind];
    if (kind === "reducedMotion" && this.save.reducedMotion) this.boardShakeTime = 0;
    this.persist();
    if (kind === "haptic") this.vibrate("light");
    else this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private resetProgress(): void {
    const preferences = {
      sound: this.save.sound,
      haptic: this.save.haptic,
      reducedMotion: this.save.reducedMotion,
      lastSeenUpdate: this.save.lastSeenUpdate,
    };
    const candidate = { ...copyDefaultSave(), ...preferences };
    if (this.persistVerified(candidate) !== "committed") {
      this.resetSaveFailed = true;
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    this.save = candidate;
    this.resetSaveFailed = false;
    this.boosterUnlockToast = undefined;
    this.dailyReturnLevelId = 1;
    this.loadLevel(1, false, false);
    this.playSound("button");
    this.vibrate("medium");
  }

  private buySupply(kind: Booster): void {
    const item = SUPPLY_ITEMS[kind];
    const result = purchaseSupply(this.save.coins, this.save.boosters[kind], kind, this.save.highestLevel);
    if (result.status === "purchased") {
      const candidate: SaveData = {
        ...this.save,
        coins: result.coins,
        boosters: { ...this.save.boosters, [kind]: result.stock },
      };
      if (this.persistVerified(candidate) !== "committed") {
        this.supplyFeedback = { text: "保存失败 · 请重试", color: "#ff9a86" };
        this.playSound("blocked");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      this.save = candidate;
      this.supplyFeedback = { text: `已补充${item.title} · 库存 ${result.stock}/${item.maxStock}`, color: "#76f5b1" };
      const button = this.supplyBuyRect(kind);
      this.emitBurst(button.x + button.width / 2, button.y + button.height / 2, "#ffe15c", 10, 72);
      this.playSound("button");
      this.vibrate("light");
    } else if (result.status === "locked") {
      this.supplyFeedback = { text: `Lv ${item.unlockLevel} 解锁${item.title}`, color: "#bcb6dd" };
      this.playSound("blocked");
    } else if (result.status === "full") {
      this.supplyFeedback = { text: `${item.title}库存已满`, color: "#bcb6dd" };
      this.playSound("blocked");
    } else {
      this.supplyFeedback = { text: `金币不足 · 还差 ${result.shortfall}`, color: "#ff9a86" };
      this.playSound("blocked");
    }
    this.dirty = true;
    this.scheduleFrame();
  }

  private retryStorageBaseline(): boolean {
    this.storageReadAttempts += 1;
    const result = this.host.storageRead<unknown>(SAVE_KEY);
    if (result.status === "unavailable") {
      this.dirty = true;
      this.scheduleFrame();
      return false;
    }

    const loaded = result.status === "ok" ? result.value : undefined;
    const restored = this.recoverInterruptedRun(this.sanitizeSave(loaded ?? copyDefaultSave()));
    const storedMotionPreference = isPlainRecord(loaded) && typeof loaded.reducedMotion === "boolean";
    if (!storedMotionPreference && this.host.prefersReducedMotion?.()) restored.reducedMotion = true;
    this.save = restored;
    this.model = new PuzzleModel(getLevel(this.save.currentLevel));
    this.storageBaselineReady = true;
    this.updateToastVisible = this.save.lastSeenUpdate !== UPDATE_NOTICE.id;
    this.dailyMode = false;
    this.dailyReturnLevelId = this.save.currentLevel;
    this.dailyChallengeDayKey = undefined;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.boosterUnlockToast = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.screen = "home";
    this.host.storageSet(SAVE_KEY, this.save);
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private persist(save: SaveData = this.save): boolean {
    return this.storageBaselineReady && this.host.storageSet(SAVE_KEY, save);
  }

  private persistVerified(save: SaveData, baseline: SaveData = this.save): PersistenceOutcome {
    if (!this.storageBaselineReady) return "unknown";
    if (this.persist(save)) return "committed";
    // Some storage bridges can report an error after the write has already
    // reached disk. Treat an exact read-back match as committed so a later
    // recovery action cannot overwrite rewards that actually landed. Only an
    // exact pre-write baseline is definitely rejected; every other read result
    // is ambiguous and must keep retrying the same immutable candidate.
    try {
      const result = this.host.storageRead<unknown>(SAVE_KEY);
      if (result.status !== "ok") return "unknown";
      if (storageValuesEqual(result.value, save)) return "committed";
      if (storageValuesEqual(result.value, baseline)) return "rejected";
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  private boosterUnlocked(kind: Booster): boolean {
    return this.save.highestLevel >= SUPPLY_ITEMS[kind].unlockLevel;
  }

  private boosterUnlockToastEligible(): boolean {
    if (this.navigationTransition || (this.screen === "home" && this.updateToastVisible)) return false;
    if (this.screen === "playing" && this.shouldShowBasicTutorial()) return false;
    return this.screen === "home" || this.screen === "supply" || this.screen === "leaderboard"
      || this.screen === "levels" || this.screen === "records" || this.screen === "playing";
  }

  private boosterUnlockToastRect(): Rect {
    return { x: 38, y: 202 + Math.min(24, this.safeOffsets().top), width: 420, height: 128 };
  }

  private finishBoosterUnlockToast(): void {
    const kind = this.boosterUnlockToast?.kind;
    if (!kind) return;
    if (!this.save.boosterUnlockSeen.includes(kind)) {
      this.commitTransientAcknowledgement((candidate) => {
        candidate.boosterUnlockSeen = [...candidate.boosterUnlockSeen, kind];
      });
    }
    this.boosterUnlockToast = undefined;
    this.dirty = true;
  }

  private updateBoosterUnlockToast(delta: number): void {
    if (!this.boosterUnlockToast) {
      if (!this.boosterUnlockToastEligible()) return;
      const kind = nextUnseenUnlockedSupply(this.save.highestLevel, this.save.boosterUnlockSeen);
      if (!kind) return;
      this.boosterUnlockToast = {
        kind,
        age: 0,
        duration: this.save.reducedMotion ? BOOSTER_UNLOCK_TOAST_REDUCED_DURATION : BOOSTER_UNLOCK_TOAST_DURATION,
      };
      this.playSound("button");
      this.vibrate("light");
      this.dirty = true;
      return;
    }
    if (!this.boosterUnlockToastEligible()) return;
    this.boosterUnlockToast.age += delta;
    if (this.boosterUnlockToast.age >= this.boosterUnlockToast.duration) this.finishBoosterUnlockToast();
    else this.dirty = true;
  }

  private acknowledgeUpdateNotice(): void {
    this.updateToastVisible = false;
    this.updateToastAge = 0;
    if (this.save.lastSeenUpdate !== UPDATE_NOTICE.id) {
      this.commitTransientAcknowledgement((candidate) => {
        candidate.lastSeenUpdate = UPDATE_NOTICE.id;
      });
    }
    this.dirty = true;
  }

  private openUpdateNotice(returnScreen: "home" | "settings"): void {
    this.updateReturnScreen = returnScreen;
    this.updateToastVisible = false;
    this.updateToastAge = 0;
    this.screen = "updates";
    this.playSound("button");
    this.dirty = true;
  }

  private playSound(kind: SoundKind): void { if (this.save.sound) this.host.sound(kind); }
  private vibrate(kind: "light" | "medium"): void { if (this.save.haptic) this.host.vibrate(kind); }

  private viewportTransform(): { scale: number; offsetX: number; offsetY: number } {
    const viewport = this.host.viewport();
    const scale = Math.min(viewport.width / LOGICAL_WIDTH, viewport.height / LOGICAL_HEIGHT);
    return {
      scale,
      offsetX: (viewport.width - LOGICAL_WIDTH * scale) / 2,
      offsetY: (viewport.height - LOGICAL_HEIGHT * scale) / 2,
    };
  }

  private toLogical(sample: PointerSample): PointerSample {
    const { scale, offsetX, offsetY } = this.viewportTransform();
    return { id: sample.id, x: (sample.x - offsetX) / scale, y: (sample.y - offsetY) / scale };
  }

  private frame(time: number): void {
    if (!this.shellArtReady) {
      if (this.artLoadError) this.render();
      return;
    }
    if (!this.artReady) {
      this.render();
      this.dirty = false;
      return;
    }
    const rawDelta = this.lastFrame ? Math.max(0, (time - this.lastFrame) / 1000) : 0;
    const delta = Math.min(0.05, rawDelta);
    this.lastFrame = time;
    this.elapsed += delta;
    if (this.navigationTransition) {
      this.navigationTransition.age = Math.min(
        this.navigationTransition.duration,
        this.navigationTransition.age + delta,
      );
      if (this.navigationTransition.age >= this.navigationTransition.duration) {
        const settledScreen = this.navigationTransition.to;
        const pendingTarget = this.navigationPendingTarget;
        this.navigationTransition = undefined;
        this.navigationPendingTarget = undefined;
        this.screen = settledScreen;
        if (pendingTarget && pendingTarget !== settledScreen) {
          const fromIndex = MAIN_NAVIGATION.findIndex((tab) => tab.screen === settledScreen);
          const targetIndex = MAIN_NAVIGATION.findIndex((tab) => tab.screen === pendingTarget);
          this.screen = pendingTarget;
          this.navigationTransition = {
            from: settledScreen,
            to: pendingTarget,
            direction: targetIndex > fromIndex ? 1 : -1,
            age: 0,
            duration: MAIN_NAVIGATION_TRANSITION_DURATION,
            startProgress: 0,
            easing: "out",
          };
        }
      }
      this.dirty = true;
    }
    if (rawDelta > 0) {
      this.fpsSamples.push(1 / rawDelta);
      if (this.fpsSamples.length > 120) this.fpsSamples.shift();
    }

    if (this.screen === "playing") {
      this.blockedFeedbackTime = Math.max(0, this.blockedFeedbackTime - delta);
      this.blockerFocusTime = Math.max(0, this.blockerFocusTime - delta);
      this.grabFeedbackTime = Math.max(0, this.grabFeedbackTime - delta);
      if (this.blockedFeedbackTime === 0) this.blockedBlockId = undefined;
      if (this.blockerFocusTime === 0) this.blockerFocusBlockId = undefined;
      this.updateDragSettle(delta);
      const heldBlock = this.dragVisual?.started && this.selectedId
        ? this.model.getBlock(this.selectedId)
        : undefined;
      const spatialChanged = this.model.tick(delta, heldBlock && this.dragVisual ? {
        blockId: heldBlock.id,
        x: this.dragVisual.x,
        y: this.dragVisual.y,
        shape: heldBlock.shape,
        rollbackX: this.dragVisual.originX,
        rollbackY: this.dragVisual.originY,
      } : undefined);
      if (spatialChanged) this.refreshActiveDragCollisionWorld();
      if (this.pendingCelebration > 0) {
        this.pendingCelebration -= delta;
        if (this.pendingCelebration <= 0) this.beginCelebration();
      }
      if (this.model.snapshot().failed) {
        this.selectedId = undefined;
        this.activePointer = undefined;
        this.selectionAssist = undefined;
        this.dragVisual = undefined;
        this.boosterTarget = undefined;
        this.boosterFeedback = undefined;
        this.hudFeedback = undefined;
        this.blockedBlockId = undefined;
        this.blockedFeedbackTime = 0;
        this.blockerFocusBlockId = undefined;
        this.blockerFocusTime = 0;
        this.grabFeedbackTime = 0;
        this.particles = [];
        this.exitGhosts = [];
        this.exitPulses = [];
        this.exitFailure = undefined;
        this.mechanicPulses = [];
        this.boardShakeTime = 0;
        this.screen = "failed";
        this.dirty = true;
        this.playSound("fail");
        this.vibrate("medium");
      }
    } else if (this.screen === "celebrating") {
      this.celebrationTime += delta;
      const duration = this.quickClear
        ? this.save.reducedMotion ? QUICK_CLEAR_REDUCED_DURATION : QUICK_CLEAR_DURATION
        : this.save.reducedMotion ? 0.9 : 2.7;
      if (this.celebrationTime > duration) {
        if (this.quickClear) {
          const nextLevel = Math.min(LEVELS.length, this.model.level.id + 1);
          this.loadLevel(nextLevel, false);
          this.beginSelectedChallenge();
        } else {
          this.screen = "win";
          this.dirty = true;
        }
      }
    } else if (this.screen === "home" && this.updateToastVisible) {
      this.updateToastAge += delta;
      if (this.updateToastAge >= UPDATE_TOAST_DURATION) this.acknowledgeUpdateNotice();
    }
    this.updateBoosterUnlockToast(delta);
    this.updateParticles(delta);
    this.updateExitGhosts(delta);
    this.updateExitPulses(delta);
    this.updateMechanicPulses(delta);
    this.updateExitFailure(delta);
    this.updateBoosterFeedback(delta);
    this.updateHudFeedback(delta);
    const animated = this.screen === "playing" || this.screen === "celebrating"
      || (this.screen === "home" && this.updateToastVisible) || this.particles.length > 0
      || this.exitGhosts.length > 0 || this.exitPulses.length > 0 || this.mechanicPulses.length > 0 || this.boardShakeTime > 0
      || this.exitFailure != null || this.boosterFeedback != null || this.hudFeedback != null
      || this.navigationTransition != null || (this.boosterUnlockToast != null && this.boosterUnlockToastEligible());
    if (this.dirty || animated) {
      this.render();
      this.dirty = false;
    }
    if (animated) this.scheduleFrame();
  }

  private updateDragSettle(delta: number): void {
    const visual = this.dragVisual;
    if (!visual?.settling) return;
    visual.settleElapsed = Math.min(visual.settleDuration, visual.settleElapsed + delta);
    const progress = visual.settleDuration > 0 ? visual.settleElapsed / visual.settleDuration : 1;
    const eased = easeOutCubic(progress);
    visual.x = visual.settleFromX + (visual.settleToX - visual.settleFromX) * eased;
    visual.y = visual.settleFromY + (visual.settleToY - visual.settleFromY) * eased;
    this.dirty = true;
    if (progress >= 1) this.dragVisual = undefined;
  }

  private refreshActiveDragCollisionWorld(): void {
    const visual = this.dragVisual;
    if (!visual) return;
    const snapshot = this.model.snapshot();
    const block = snapshot.blocks.find((candidate) => candidate.id === visual.blockId);
    if (!block) return;

    const modelDeltaX = block.x - visual.modelX;
    const modelDeltaY = block.y - visual.modelY;
    if (visual.settling) {
      if (modelDeltaX !== 0 || modelDeltaY !== 0) {
        visual.x += modelDeltaX;
        visual.y += modelDeltaY;
        visual.settleFromX += modelDeltaX;
        visual.settleFromY += modelDeltaY;
        visual.settleToX = block.x;
        visual.settleToY = block.y;
        visual.modelX = block.x;
        visual.modelY = block.y;
      }
      visual.isPoseValid = createContinuousCollisionValidator(snapshot, visual.blockId);
      return;
    }
    if (!this.selectedId || visual.blockId !== this.selectedId) return;
    if (modelDeltaX !== 0 || modelDeltaY !== 0) {
      // A moving platform carries the held piece in world space. Translate the
      // render pose by the same amount; the next pointer delta then continues
      // naturally from the new position without an absolute-target jump.
      visual.x += modelDeltaX;
      visual.y += modelDeltaY;
      visual.modelX = block.x;
      visual.modelY = block.y;
    }
    visual.isPoseValid = createContinuousCollisionValidator(snapshot, visual.blockId);
    if (!visual.isPoseValid(visual.x, visual.y)) {
      const projected = sweepContinuousPose(
        { x: block.x, y: block.y },
        { x: visual.x, y: visual.y },
        visual.isPoseValid,
        DRAG_SWEEP_STEP,
      );
      visual.x = projected.x;
      visual.y = projected.y;
    }
  }

  private hasActiveMechanicMotion(): boolean {
    return this.mechanicPulses.some((pulse) => (
      pulse.kind === "conveyor"
      && pulse.age < (this.save.reducedMotion ? 0 : pulse.motionDuration)
    ));
  }

  private mechanicVisualBlock(block: BlockState): BlockState {
    const pulse = [...this.mechanicPulses].reverse().find((candidate) => (
      candidate.kind === "conveyor"
      && candidate.targetId === block.id
      && candidate.fromX != null
      && candidate.fromY != null
      && candidate.toX != null
      && candidate.toY != null
      && candidate.age < candidate.motionDuration
    ));
    if (!pulse || pulse.fromX == null || pulse.fromY == null || pulse.toX == null || pulse.toY == null) return block;
    const progress = pulse.age <= 0
      ? 0
      : this.save.reducedMotion || pulse.motionDuration <= 0
        ? 1
        : easeOutCubic(Math.min(1, pulse.age / pulse.motionDuration));
    return {
      ...block,
      x: pulse.fromX + (pulse.toX - pulse.fromX) * progress,
      y: pulse.fromY + (pulse.toY - pulse.fromY) * progress,
    };
  }

  private syncDragGridCandidate(visual: DragVisualState): DragGridSyncResult {
    let moved = false;
    const limit = this.model.level.width + this.model.level.height + 4;
    for (let index = 0; index < limit; index += 1) {
      const block = this.model.getBlock(visual.blockId);
      if (!block) break;
      const candidates = candidateGridSteps(visual, block, DRAG_GRID_HYSTERESIS);
      if (!candidates.length) break;
      let advanced = false;
      for (const candidate of candidates) {
        const previousCoordinate = candidate.axis === "x" ? block.x : block.y;
        if (!this.model.moveBlockStep(visual.blockId, candidate.x, candidate.y)) continue;
        moved = true;
        advanced = true;
        const movedBlock = this.model.getBlock(visual.blockId);
        if (movedBlock) {
          visual.modelX = movedBlock.x;
          visual.modelY = movedBlock.y;
          const exitSides = this.model.possibleExitSides(movedBlock);
          const movedCoordinate = candidate.axis === "x" ? movedBlock.x : movedBlock.y;
          const visualCoordinate = candidate.axis === "x" ? visual.x : visual.y;
          const crossAxisAligned = candidate.axis === "x"
            ? Math.abs(visual.y - movedBlock.y) <= 0.04
            : Math.abs(visual.x - movedBlock.x) <= 0.04;
          const direction = Math.sign(movedCoordinate - previousCoordinate);
          const crossedAnchor = direction > 0
            ? visualCoordinate >= movedCoordinate - 0.04
            : visualCoordinate <= movedCoordinate + 0.04;
          if (exitSides.length > 0 && crossAxisAligned && crossedAnchor) {
            // A sparse sample may cross an aligned gate and continue several
            // cells in one event. Intercept at the first physical gate contact
            // rather than losing it at the sample's final grid candidate.
            visual.x = movedBlock.x;
            visual.y = movedBlock.y;
            return { moved, exitSides };
          }
        }
        break;
      }
      if (!advanced) break;
    }
    const block = this.model.getBlock(visual.blockId);
    return { moved, exitSides: block ? this.model.possibleExitSides(block) : [] };
  }

  private isMainNavigationScreen(screen: Screen): screen is MainNavigationScreen {
    return MAIN_NAVIGATION.some((tab) => tab.screen === screen);
  }

  private mainNavigationRect(index: number): Rect {
    const width = LOGICAL_WIDTH / MAIN_NAVIGATION.length;
    return { x: index * width, y: 982 - this.safeOffsets().bottom, width, height: 96 };
  }

  private collectionDiscoveryBadgeRect(): Rect {
    const tab = this.mainNavigationRect(MAIN_NAVIGATION.findIndex(({ screen }) => screen === "records"));
    return { x: tab.x + tab.width - 42, y: tab.y - 7, width: 38, height: 38 };
  }

  private dailyDiscoveryBadgeRect(offsetY = 0): Rect {
    return { x: 340, y: 854 + offsetY, width: 42, height: 42 };
  }

  private mainPageHeaderOffset(): number {
    // Keep the icon/title below the unsafe top without pushing the fixed page
    // content into the bottom navigation on devices with two large insets.
    return Math.max(0, this.safeOffsets().top - 30);
  }

  private supplyPageOffset(): number {
    const safe = this.safeOffsets();
    const navigationTop = 982 - safe.bottom;
    const contentBottom = SUPPLY_RECTS.pulse.y + SUPPLY_RECTS.pulse.height;
    const desiredOffset = Math.max(0, this.mainPageHeaderOffset() - 12);
    return Math.min(desiredOffset, Math.max(0, navigationTop - 40 - contentBottom));
  }

  private journeyFooterRect(rect: Rect): Rect {
    return this.offsetRect(rect, 0, -this.safeOffsets().bottom);
  }

  private leaderboardFooterRect(rect: Rect): Rect {
    return this.offsetRect(rect, 0, -this.safeOffsets().bottom);
  }

  private mainNavigationVisualProgress(transition: MainNavigationTransition): number {
    const linear = Math.min(1, Math.max(0, transition.age / transition.duration));
    const eased = transition.easing === "smooth"
      ? gentleReverseStep(linear)
      : easeOutCubic(linear);
    return transition.startProgress + (1 - transition.startProgress) * eased;
  }

  private handleMainNavigation(point: PointerSample): boolean {
    for (let index = 0; index < MAIN_NAVIGATION.length; index += 1) {
      if (!this.interactionHit(point, this.mainNavigationRect(index))) continue;
      const target = MAIN_NAVIGATION[index].screen;
      if (target === "levels") this.levelPage = Math.floor((this.model.level.id - 1) / LEVELS_PER_PAGE);
      if (target === "supply") this.supplyFeedback = undefined;
      if (target === "records" && this.pendingCollectionDiscoveryLevel() != null) {
        this.acknowledgeCollectionDiscovery();
      }
      let changed = false;
      if (this.save.reducedMotion) {
        if (target !== this.screen || this.navigationTransition || this.navigationPendingTarget) {
          this.screen = target;
          this.navigationTransition = undefined;
          this.navigationPendingTarget = undefined;
          changed = true;
        }
      } else if (this.navigationTransition) {
        const active = this.navigationTransition;
        if (target === active.to) {
          if (this.navigationPendingTarget) {
            this.navigationPendingTarget = undefined;
            changed = true;
          }
        } else if (target === active.from) {
          // Reverse from the exact current pixel position. The full 200 ms
          // high-order curve stays continuous even when the next frame is late.
          const visualProgress = this.mainNavigationVisualProgress(active);
          this.navigationTransition = {
            from: active.to,
            to: active.from,
            direction: active.direction === 1 ? -1 : 1,
            age: 0,
            duration: MAIN_NAVIGATION_TRANSITION_DURATION,
            startProgress: 1 - visualProgress,
            easing: "smooth",
          };
          this.navigationPendingTarget = undefined;
          this.screen = target;
          changed = true;
        } else if (target !== this.navigationPendingTarget) {
          // A third destination starts from the fully settled current target,
          // preserving visual continuity while keeping only the latest intent.
          this.navigationPendingTarget = target;
          changed = true;
        }
      } else if (target !== this.screen) {
        const from = this.isMainNavigationScreen(this.screen) ? this.screen : "home";
        const fromIndex = MAIN_NAVIGATION.findIndex((tab) => tab.screen === from);
        const targetIndex = MAIN_NAVIGATION.findIndex((tab) => tab.screen === target);
        this.screen = target;
        this.navigationTransition = {
          from,
          to: target,
          direction: targetIndex > fromIndex ? 1 : -1,
          age: 0,
          duration: MAIN_NAVIGATION_TRANSITION_DURATION,
          startProgress: 0,
          easing: "out",
        };
        this.navigationPendingTarget = undefined;
        this.lastFrame = 0;
        changed = true;
      }
      if (changed) this.playSound("button");
      this.dirty = true;
      this.scheduleFrame();
      return true;
    }
    return false;
  }

  private chapterLeaderboard(): ChapterLeaderboardEntry[] {
    return buildChapterLeaderboard(LEVELS.length, this.save.bestStars, this.save.rewardedLevels);
  }

  private efficiencyLeaderboard(): EfficiencyLeaderboardEntry[] {
    return buildEfficiencyLeaderboard(this.save.bestMoves, LEVELS);
  }

  private leaderboardPageView(): LeaderboardPage<ChapterLeaderboardEntry | EfficiencyLeaderboardEntry> {
    const entries: Array<ChapterLeaderboardEntry | EfficiencyLeaderboardEntry> = this.leaderboardMode === "chapters"
      ? this.chapterLeaderboard()
      : this.efficiencyLeaderboard();
    return paginateLeaderboard(entries, this.leaderboardPages[this.leaderboardMode]);
  }

  private collectionItems(category: CollectionCategory = this.collectionCategory): readonly CollectionItem[] {
    return category === "colors" ? COLLECTION_COLOR_ITEMS : COLLECTION_MECHANISM_ITEMS;
  }

  private collectionItemUnlocked(item: CollectionItem): boolean {
    if (item.unlockLevel <= 1 || this.save.rewardedLevels.includes(item.unlockLevel)) return true;
    return item.kind === "mechanism"
      ? this.save.highestLevel >= item.unlockLevel
      : this.save.highestLevel > item.unlockLevel;
  }

  private collectionDetailText(item: CollectionItem): string {
    if (this.collectionItemUnlocked(item)) return item.detail;
    return `${item.kind === "mechanism" ? "到达" : "完成"}第 ${item.unlockLevel} 关后解锁`;
  }

  private collectionContentOffset(): number {
    const navigationTop = this.mainNavigationRect(0).y;
    const available = Math.max(0, navigationTop - 16 - (COLLECTION_DETAIL_RECT.y + COLLECTION_DETAIL_RECT.height));
    return Math.min(this.mainPageHeaderOffset(), available);
  }

  private collectionCategoryRect(category: CollectionCategory): Rect {
    return this.offsetRect(COLLECTION_CATEGORY_RECTS[category], 0, this.collectionContentOffset());
  }

  private collectionDetailRect(): Rect {
    return this.offsetRect(COLLECTION_DETAIL_RECT, 0, this.collectionContentOffset());
  }

  private collectionCardRect(index: number): Rect {
    return {
      x: 39 + (index % 3) * 145,
      y: 190 + Math.floor(index / 3) * 134 + this.collectionContentOffset(),
      width: 128,
      height: 120,
    };
  }

  private journeyNodeRect(index: number): Rect {
    const [x, y] = JOURNEY_NODE_CENTERS[index];
    return { x: x - 36, y: y - 36, width: 72, height: 72 };
  }

  private handleDown(point: PointerSample): void {
    if (!this.artReady) return;
    if (!this.storageBaselineReady) {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        const restored = this.retryStorageBaseline();
        if (restored) this.playSound("button");
        else this.playSound("blocked");
      }
      return;
    }
    // Timer throttling must never let a direct player action retain yesterday's
    // observed date; daily start still snapshots the fresh day a second time.
    this.observeLocalDay();
    this.dirty = true;
    this.scheduleFrame();
    // A second finger may still reach the platform host while one drag owns
    // the game. Never let that non-owner rewrite the active drag's delta base.
    if (this.activePointer === undefined || point.id === this.activePointer) {
      this.pointerNow = { x: point.x, y: point.y };
    }
    if (this.screen === "updates") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        this.acknowledgeUpdateNotice();
        this.screen = this.updateReturnScreen;
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "home" && this.updateToastVisible
      && this.interactionHit(point, this.offsetRect(BUTTONS.updateToast, 0, this.safeOffsets().top))) {
      this.openUpdateNotice("home");
      return;
    }
    if (this.boosterUnlockToast && this.boosterUnlockToastEligible()
      && this.interactionHit(point, this.boosterUnlockToastRect())) {
      this.finishBoosterUnlockToast();
      this.playSound("button");
      return;
    }
    if (this.isMainNavigationScreen(this.screen) && this.handleMainNavigation(point)) {
      if (this.updateToastVisible) this.acknowledgeUpdateNotice();
      return;
    }
    // Keep the fixed tab bar responsive during the brief slide, but do not let
    // a moving page turn the same tap into an unintended purchase or level pick.
    if (this.navigationTransition) return;
    if (this.screen === "home") {
      const safe = this.safeOffsets();
      const bottom = safe.bottom;
      const cardOffset = this.homeCardOffset(bottom);
      if (this.updateToastVisible && this.interactionHit(point, this.offsetRect(BUTTONS.updateToast, 0, safe.top))) {
        this.openUpdateNotice("home");
        return;
      }
      if (this.updateToastVisible) this.acknowledgeUpdateNotice();
      if (this.interactionHit(point, this.offsetRect(BUTTONS.homeSettings, 0, safe.top), { anchorY: "end" })) {
        this.screen = "settings";
        this.playSound("button");
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeSupply, 0, safe.top), { anchorY: "end" })) {
        this.supplyFeedback = undefined;
        this.screen = "supply";
        this.playSound("button");
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homePlay, 0, -bottom))) {
        this.playSound("button");
        this.beginSelectedChallenge();
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeDaily, 0, -bottom))) {
        this.startDailyChallenge();
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homePrev, 0, cardOffset))) {
        if (this.model.level.id > 1) this.loadLevel(this.model.level.id - 1, false);
        else this.playSound("blocked");
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeNext, 0, cardOffset))) {
        if (this.model.level.id < this.save.highestLevel) this.loadLevel(this.model.level.id + 1, false);
        else this.playSound("blocked");
      } else {
        if (this.interactionHit(point, this.offsetRect(BUTTONS.homeLevels, 0, -bottom))) {
          this.levelPage = Math.floor((this.model.level.id - 1) / LEVELS_PER_PAGE);
          this.screen = "levels";
          this.playSound("button");
        } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeRecords, 0, -bottom))) {
          if (this.pendingCollectionDiscoveryLevel() != null) this.acknowledgeCollectionDiscovery();
          this.screen = "records";
          this.playSound("button");
        }
      }
      return;
    }
    if (this.screen === "settings") {
      const safe = this.safeOffsets();
      if (this.interactionHit(point, this.offsetRect(BUTTONS.menuBack, 0, safe.top))) {
        this.screen = "home";
        this.playSound("button");
        return;
      }
      for (const kind of Object.keys(SETTINGS_RECTS) as SettingKind[]) {
        if (this.interactionHit(point, this.settingRect(kind))) {
          this.toggleSetting(kind);
          return;
        }
      }
      if (this.interactionHit(point, this.offsetRect(BUTTONS.settingsUpdates, 0, safe.top))) {
        this.openUpdateNotice("settings");
        return;
      }
      if (this.interactionHit(point, this.offsetRect(BUTTONS.settingsReset, 0, safe.top))) {
        this.resetSaveFailed = false;
        this.screen = "resetConfirm";
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "resetConfirm") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        this.resetProgress();
      } else if (this.interactionHit(point, BUTTONS.modalSecondary, { anchorY: "start" })) {
        this.resetSaveFailed = false;
        this.screen = "settings";
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "supply") {
      for (const kind of SUPPLY_ORDER) {
        if (this.interactionHit(point, this.supplyBuyRect(kind))) {
          this.buySupply(kind);
          return;
        }
      }
      return;
    }
    if (this.screen === "leaderboard") {
      if (this.interactionHit(point, BUTTONS.leaderboardChapters)) {
        this.leaderboardMode = "chapters";
        this.leaderboardPages.chapters = paginateLeaderboard(this.chapterLeaderboard(), this.leaderboardPages.chapters).page;
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.leaderboardEfficiency)) {
        this.leaderboardMode = "efficiency";
        this.leaderboardPages.efficiency = paginateLeaderboard(this.efficiencyLeaderboard(), this.leaderboardPages.efficiency).page;
        this.playSound("button");
      } else if (this.interactionHit(point, this.leaderboardFooterRect(BUTTONS.leaderboardPrev))) {
        const view = this.leaderboardPageView();
        if (view.canGoBack) {
          this.leaderboardPages[this.leaderboardMode] = view.page - 1;
          this.playSound("button");
        } else this.playSound("blocked");
      } else if (this.interactionHit(point, this.leaderboardFooterRect(BUTTONS.leaderboardNext))) {
        const view = this.leaderboardPageView();
        if (view.canGoForward) {
          this.leaderboardPages[this.leaderboardMode] = view.page + 1;
          this.playSound("button");
        } else this.playSound("blocked");
      }
      return;
    }
    if (this.screen === "levels") {
      if (this.interactionHit(point, this.journeyFooterRect(BUTTONS.levelsPrev))) {
        if (this.levelPage > 0) {
          this.levelPage -= 1;
          this.playSound("button");
        } else this.playSound("blocked");
        return;
      }
      if (this.interactionHit(point, this.journeyFooterRect(BUTTONS.levelsNext))) {
        if (this.levelPage < LEVEL_PAGE_COUNT - 1) {
          this.levelPage += 1;
          this.playSound("button");
        } else this.playSound("blocked");
        return;
      }
      const levelId = this.levelIdAt(point.x, point.y);
      if (levelId && levelId <= this.save.highestLevel) {
        this.loadLevel(levelId, false);
        this.playSound("button");
      } else if (levelId) this.playSound("blocked");
      return;
    }
    if (this.screen === "records") {
      for (const category of ["colors", "mechanisms"] as const) {
        if (!this.interactionHit(point, this.collectionCategoryRect(category))) continue;
        this.collectionCategory = category;
        this.playSound("button");
        return;
      }
      const items = this.collectionItems();
      for (let index = 0; index < items.length; index += 1) {
        if (!this.interactionHit(point, this.collectionCardRect(index))) continue;
        this.collectionSelections[this.collectionCategory] = index;
        this.playSound(this.collectionItemUnlocked(items[index]) ? "button" : "blocked");
        break;
      }
      return;
    }
    if (this.screen === "feature") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        const intro = this.model.level.featureIntro;
        if (intro && !this.save.featureSeen.includes(intro.kind)) {
          this.commitTransientAcknowledgement((candidate) => {
            candidate.featureSeen = [
              intro.kind,
              ...candidate.featureSeen.filter((kind) => kind !== intro.kind),
            ].slice(0, 64);
          });
        }
        this.screen = "playing";
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "paused") {
      if (this.interactionHit(point, PAUSE_SETTING_RECTS.sound)) {
        this.toggleSetting("sound");
      } else if (this.interactionHit(point, PAUSE_SETTING_RECTS.haptic)) {
        this.toggleSetting("haptic");
      } else if (this.interactionHit(point, PAUSE_SETTING_RECTS.reducedMotion)) {
        this.toggleSetting("reducedMotion");
      } else if (this.interactionHit(point, BUTTONS.pauseResume, { anchorY: "end" })) {
        this.screen = "playing";
        this.lastFrame = 0;
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.pauseRestart, { anchorY: "start" })) {
        this.loadLevel(
          this.model.level.id,
          true,
          this.dailyMode,
          this.save.activeRun?.dailyDayKey ?? this.dailyChallengeDayKey,
        );
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.pauseHome, { anchorY: "start" })) {
        this.loadLevel(this.dailyMode ? this.dailyReturnLevelId : this.model.level.id, false);
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "settlementFailed") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        if (this.pendingSettlementAbandon) this.abandonFailedSettlement();
        else this.beginCelebration();
      } else if (!this.pendingSettlementAbandon && this.settlementFailureKind !== "unknown"
        && this.interactionHit(point, BUTTONS.modalSecondary, { anchorY: "start" })) {
        this.abandonFailedSettlement();
      }
      return;
    }
    if (this.screen === "win") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        if (this.dailyMode) this.loadLevel(this.dailyReturnLevelId, false);
        else if (this.model.level.id === LEVELS.length) this.loadLevel(LEVELS.length, false);
        else {
          this.loadLevel(this.model.level.id + 1, false);
          this.beginSelectedChallenge();
        }
        this.playSound("button");
      } else if (this.winSecondaryActionLabel() && this.interactionHit(point, BUTTONS.modalSecondary, { anchorY: "start" })) {
        this.loadLevel(this.save.currentLevel, false);
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "failed") {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        this.loadLevel(
          this.model.level.id,
          true,
          this.dailyMode,
          this.save.activeRun?.dailyDayKey ?? this.dailyChallengeDayKey,
        );
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.modalSecondary, { anchorY: "start" })) {
        this.loadLevel(this.dailyMode ? this.dailyReturnLevelId : this.model.level.id, false);
        this.playSound("button");
      }
      return;
    }
    if (this.screen !== "playing") return;
    if (this.model.snapshot().complete) return;
    if (this.activePointer !== undefined) return;
    this.exitFailure = undefined;

    const safe = this.safeOffsets();
    if (this.interactionHit(point, this.offsetRect(BUTTONS.undo, 0, safe.top))) {
      this.dragVisual = undefined;
      if (this.model.undo()) {
        const action = this.undoActions.pop();
        if (action?.booster) {
          this.refundBooster(action.booster);
          const names: Record<Booster, string> = { time: "加时", rocket: "火箭", pulse: "脉冲" };
          this.showBoosterFeedback(`已返还${names[action.booster]}`, "#70f0b4");
          this.persist();
        }
        this.particles = [];
        this.exitGhosts = [];
        this.exitPulses = [];
        this.mechanicPulses = [];
        this.exitFailure = undefined;
        this.boardShakeTime = 0;
        this.pendingCelebration = 0;
        this.noClearMoveStreak = 0;
        this.strategyNudgeAcknowledged = false;
        this.strategyFollowupAvailableAt = undefined;
        this.strategyFollowupAction = undefined;
        this.strategyFollowupDrags = 0;
        this.strategyRescueDrags = 0;
        this.playSound("button");
        this.vibrate("light");
      } else {
        this.showHudFeedback("暂无可撤销操作", "#aaa5ce");
        this.playSound("blocked");
      }
      return;
    }
    if (this.interactionHit(point, this.offsetRect(BUTTONS.pause, 0, safe.top))) {
      this.dragVisual = undefined;
      this.screen = "paused";
      this.playSound("button");
      return;
    }
    if (this.pendingCelebration > 0 || this.hasActiveMechanicMotion()) return;
    if (this.interactionHit(point, this.offsetRect(BUTTONS.time, 0, -safe.bottom))) { this.useBooster("time"); return; }
    if (this.interactionHit(point, this.offsetRect(BUTTONS.rocket, 0, -safe.bottom))) { this.useBooster("rocket"); return; }
    if (this.interactionHit(point, this.offsetRect(BUTTONS.pulse, 0, -safe.bottom))) { this.useBooster("pulse"); return; }
    if (this.dragVisual?.settling) return;

    const block = this.blockAt(point.x, point.y);
    if (!block) {
      this.boosterTarget = undefined;
      return;
    }
    if (this.boosterTarget === "rocket") {
      const ghost = JSON.parse(JSON.stringify(block)) as BlockState;
      const before = this.model.snapshot();
      this.model.beginAction();
      const result = this.model.removeBlockWithBooster(block.id);
      if (result.ok) {
        this.strategyFollowupAvailableAt = undefined;
        this.strategyFollowupAction = undefined;
        this.strategyFollowupDrags = 0;
        this.emitMechanicFeedback(before, this.model.snapshot(), this.exitToMechanicDelay());
        this.spendBooster("rocket");
        this.commitAction("rocket");
        this.emitBlockParticles(block, result.color!, "top", 26);
        this.exitGhosts.push({ block: ghost, side: "top", age: 0, duration: this.save.reducedMotion ? 0.12 : 0.3 });
        this.playSound("exit");
        this.vibrate("medium");
        this.persist();
        this.showBoosterFeedback("火箭已发射", "#ffcc55");
        if (result.complete) this.pendingCelebration = this.shouldUseQuickClear() ? 0.06 : 0.42;
        this.boosterTarget = undefined;
      } else {
        this.model.cancelAction();
        this.showBoosterFeedback("方块仍冰封", "#ff7d8d");
        this.playSound("ice");
        this.vibrate("light");
      }
      this.selectionAssist = undefined;
      return;
    }
    if (!this.model.isBlockActive(block)) {
      this.playSound("ice");
      this.vibrate("light");
      return;
    }

    const board = this.boardLayout();
    const strategyNudge = this.strategyNudgeOrigins();
    const strategyNudgeTarget = strategyNudge?.origins.at(-1);
    this.strategyNudgeDrag = strategyNudge?.block.id === block.id && strategyNudgeTarget
      ? {
        blockId: block.id,
        target: strategyNudgeTarget,
        reason: strategyNudge.reason,
        focusBlockId: strategyNudge.focusBlockId,
      }
      : undefined;
    this.activePointer = point.id;
    this.selectedId = block.id;
    this.grabFeedbackTime = 0.12;
    this.pointerDown = { x: point.x, y: point.y };
    this.dragVisual = {
      blockId: block.id,
      x: block.x,
      y: block.y,
      originX: block.x,
      originY: block.y,
      modelX: block.x,
      modelY: block.y,
      started: false,
      exitFeedbackSides: new Set(),
      settling: false,
      settleFromX: block.x,
      settleFromY: block.y,
      settleToX: block.x,
      settleToY: block.y,
      settleElapsed: 0,
      settleDuration: DRAG_SETTLE_DURATION,
      isPoseValid: createContinuousCollisionValidator(this.model.snapshot(), block.id),
    };
    this.blockerFocusBlockId = undefined;
    this.blockerFocusTime = 0;
    this.model.beginAction();
    const alreadyAlignedSides = this.model.possibleExitSides(block);
    const alreadyAlignedSide = chooseReleaseExitSide(alreadyAlignedSides, point, board);
    if (alreadyAlignedSide) {
      this.attemptExit(alreadyAlignedSide);
      return;
    }
    this.playSound("select");
    this.vibrate("light");
  }

  private handleMove(point: PointerSample): void {
    if (this.screen !== "playing" || point.id !== this.activePointer || !this.selectedId) return;
    this.scheduleFrame();
    const board = this.boardLayout();
    const block = this.model.getBlock(this.selectedId);
    const previousPointer = this.pointerNow;
    this.pointerNow = { x: point.x, y: point.y };
    const visual = this.dragVisual;
    if (!block || !visual || visual.blockId !== block.id || visual.settling) return;
    let pointerOrigin = previousPointer;
    if (!visual.started) {
      const pointerDistance = Math.hypot(point.x - this.pointerDown.x, point.y - this.pointerDown.y);
      if (pointerDistance < DRAG_DEAD_ZONE) return;
      visual.started = true;
      // Preserve the full initial displacement instead of losing the samples
      // consumed by the dead zone.
      pointerOrigin = this.pointerDown;
    }

    const previousX = visual.x;
    const previousY = visual.y;
    const pointerDelta = {
      x: (point.x - pointerOrigin.x) / board.cell,
      y: (point.y - pointerOrigin.y) / board.cell,
    };
    const swept = advanceContinuousDragPose(
      { x: visual.x, y: visual.y },
      {
        grid: { x: block.x, y: block.y },
        pointerDelta,
      },
      visual.isPoseValid,
      DRAG_SWEEP_STEP,
    );
    visual.x = swept.x;
    visual.y = swept.y;
    const synced = this.syncDragGridCandidate(visual);
    const moved = synced.moved;
    if (moved && this.model.level.id === 1 && !this.save.featureSeen.includes("basics")) {
      this.commitTransientAcknowledgement((candidate) => {
        candidate.featureSeen = [
          "basics",
          ...candidate.featureSeen.filter((kind) => kind !== "basics"),
        ].slice(0, 64);
      });
    }
    if (moved && synced.exitSides.length === 0 && this.elapsed - this.lastMoveSoundAt > 0.09) {
      this.playSound("move");
      this.lastMoveSoundAt = this.elapsed;
    }
    const wantedMove = Math.hypot(visual.x - previousX, visual.y - previousY) > 0.01
      || Math.hypot(pointerDelta.x, pointerDelta.y) > 0.01;
    const pointerX = Math.abs(pointerDelta.x);
    const pointerY = Math.abs(pointerDelta.y);
    if (pointerX > pointerY * 1.15) visual.lastIntentAxis = "x";
    else if (pointerY > pointerX * 1.15) visual.lastIntentAxis = "y";
    const intendedSide: Side | undefined = pointerX > pointerY * 1.15
      ? (pointerDelta.x < 0 ? "left" : "right")
      : pointerY > pointerX * 1.15
        ? (pointerDelta.y < 0 ? "top" : "bottom")
        : undefined;
    const currentBlock = this.model.getBlock(visual.blockId);
    const contactedExitSides = currentBlock
      ? synced.exitSides.filter((candidate) => this.visualTouchesUsableExit(visual, currentBlock, candidate))
      : [];
    const alignedSide = chooseReleaseExitSide(contactedExitSides, point, board, intendedSide);
    if (alignedSide) {
      this.attemptExit(alignedSide);
      this.dirty = true;
      return;
    }
    const blockedAlongIntent = pointerX > pointerY * 1.15
      ? swept.blockedX
      : pointerY > pointerX * 1.15
        ? swept.blockedY
        : swept.blockedX || swept.blockedY;
    if (wantedMove && blockedAlongIntent) {
      this.blockedBlockId = block.id;
      this.blockedFeedbackTime = BLOCKED_FEEDBACK_DURATION;
      const blocker = blockingBlockForSweep(this.model.snapshot(), block.id, {
        pose: { x: visual.x, y: visual.y },
        pointerDelta,
        blockedX: swept.blockedX,
        blockedY: swept.blockedY,
      });
      if (blocker) {
        this.blockerFocusBlockId = blocker;
        this.blockerFocusTime = this.save.reducedMotion ? BLOCKER_FOCUS_REDUCED_DURATION : BLOCKER_FOCUS_DURATION;
      }
      if (this.elapsed - this.lastBlockedSoundAt > 0.22) {
        this.playSound("blocked");
        this.vibrate("light");
        this.lastBlockedSoundAt = this.elapsed;
      }
    }
    // Keep a failed-exit side latched until the block itself leaves that edge.
    // Pointer jitter around the viewport boundary must not replay the same
    // failure sound/message every time it crosses back outside.
    for (const latchedSide of visual.exitFeedbackSides) {
      if (!currentBlock || !isContinuousPoseAtEdge(
        visual,
        currentBlock.shape,
        this.model.level.width,
        this.model.level.height,
        latchedSide,
      )) {
        visual.exitFeedbackSides.delete(latchedSide);
      }
    }
    const side = this.exitSideFromPointer(point.x, point.y, board);
    if (side && currentBlock
      && isContinuousPoseAtEdge(
        visual,
        currentBlock.shape,
        this.model.level.width,
        this.model.level.height,
        side,
      )
      && !visual.exitFeedbackSides.has(side)) {
      visual.exitFeedbackSides.add(side);
      this.attemptExit(side);
    }
    this.dirty = true;
  }

  private handleUp(point: PointerSample): void {
    if (this.screen !== "playing" || point.id !== this.activePointer || !this.selectedId) return;
    this.scheduleFrame();
    // Browsers and WeChat may deliver a new coordinate only on pointerup /
    // touchend. Run that terminal sample through the exact same sweep before
    // choosing a grid cell or exit.
    this.handleMove(point);
    if (point.id !== this.activePointer || !this.selectedId) return;
    const board = this.boardLayout();
    const visualBeforeSnap = this.dragVisual;
    const blockBeforeSnap = this.model.getBlock(this.selectedId);
    if (visualBeforeSnap && blockBeforeSnap) {
      const snap = chooseNearestReachableSnap(
        visualBeforeSnap,
        blockBeforeSnap,
        (x, y) => this.model.canPlace(blockBeforeSnap, x, y),
        visualBeforeSnap.lastIntentAxis,
      );
      for (const pose of snap.path) {
        if (!this.model.moveBlockStep(blockBeforeSnap.id, pose.x, pose.y)) break;
      }
      const snappedBlock = this.model.getBlock(blockBeforeSnap.id);
      if (snappedBlock) {
        visualBeforeSnap.modelX = snappedBlock.x;
        visualBeforeSnap.modelY = snappedBlock.y;
      }
    }
    const explicit = this.exitSideFromPointer(point.x, point.y, board);
    if (explicit && this.selectedId) {
      const block = this.model.getBlock(this.selectedId);
      const visual = this.dragVisual;
      if (block && visual && this.model.exitAttemptStatus(block.id, explicit) !== "not-at-edge"
        && !visual.exitFeedbackSides.has(explicit)) {
        visual.exitFeedbackSides.add(explicit);
        this.attemptExit(explicit);
      }
    }
    if (this.selectedId) {
      const block = this.model.getBlock(this.selectedId);
      const possible = block ? this.model.possibleExitSides(block) : [];
      const dx = point.x - this.pointerDown.x;
      const dy = point.y - this.pointerDown.y;
      const inferred: Side | undefined = Math.abs(dx) > Math.abs(dy)
        ? (dx < -board.cell * 0.7 ? "left" : dx > board.cell * 0.7 ? "right" : undefined)
        : (dy < -board.cell * 0.7 ? "top" : dy > board.cell * 0.7 ? "bottom" : undefined);
      const releaseSide = chooseReleaseExitSide(possible, point, board, inferred);
      if (releaseSide) this.attemptExit(releaseSide);
    }
    if (this.selectedId) {
      const followupWasReady = Boolean(this.strategyFollowupAction);
      const guidedDrag = this.strategyNudgeDrag?.blockId === this.selectedId ? this.strategyNudgeDrag : undefined;
      const guidedBlockBeforeCommit = guidedDrag ? this.model.getBlock(this.selectedId) : undefined;
      const guidedTarget = guidedDrag?.target;
      const reachedGuidedTarget = Boolean(guidedBlockBeforeCommit && guidedTarget
        && guidedBlockBeforeCommit.x === guidedTarget[0] && guidedBlockBeforeCommit.y === guidedTarget[1]);
      const committed = this.commitAction();
      if (committed) {
        if (followupWasReady) this.strategyFollowupAction = undefined;
        this.noClearMoveStreak += 1;
        if (reachedGuidedTarget) {
          if (guidedDrag?.reason === "followup") {
            this.strategyFollowupDrags += 1;
            this.strategyFollowupAvailableAt = undefined;
          } else {
            this.strategyRescueDrags += 1;
            this.strategyNudgeAcknowledged = guidedDrag?.reason === "authored"
              || this.strategyRescueDrags >= MAX_ADAPTIVE_RESCUE_DRAGS;
            if (this.strategyNudgeAcknowledged && this.strategyFollowupDrags === 0) {
              this.strategyFollowupAvailableAt = this.noClearMoveStreak;
            }
          }
        }
        this.prepareStrategyFollowup();
      }
      const block = this.model.getBlock(this.selectedId);
      const visual = this.dragVisual;
      if (block && visual) {
        const distance = Math.hypot(visual.x - block.x, visual.y - block.y);
        if (distance > 0.001) {
          visual.settling = true;
          visual.settleFromX = visual.x;
          visual.settleFromY = visual.y;
          visual.settleToX = block.x;
          visual.settleToY = block.y;
          visual.settleElapsed = 0;
          const standardDuration = committed ? DRAG_SETTLE_DURATION : DRAG_RETURN_DURATION;
          visual.settleDuration = this.save.reducedMotion ? Math.min(0.06, standardDuration) : standardDuration;
        } else {
          this.dragVisual = undefined;
        }
      } else {
        this.dragVisual = undefined;
      }
    }
    this.selectedId = undefined;
    this.activePointer = undefined;
    this.selectionAssist = undefined;
    this.strategyNudgeDrag = undefined;
    this.grabFeedbackTime = 0;
  }

  private handleCancel(point: PointerSample): void {
    if (point.id !== this.activePointer) return;
    if (this.selectedId) this.model.cancelAction();
    this.selectedId = undefined;
    this.activePointer = undefined;
    this.selectionAssist = undefined;
    this.dragVisual = undefined;
    this.strategyNudgeDrag = undefined;
    this.blockedBlockId = undefined;
    this.blockedFeedbackTime = 0;
    this.blockerFocusBlockId = undefined;
    this.blockerFocusTime = 0;
    this.grabFeedbackTime = 0;
    this.exitFailure = undefined;
    this.dirty = true;
    this.scheduleFrame();
  }

  private useBooster(kind: Booster): void {
    if (!this.boosterUnlocked(kind)) {
      this.boosterTarget = undefined;
      const item = SUPPLY_ITEMS[kind];
      this.showBoosterFeedback(`Lv ${item.unlockLevel} 解锁${item.title}`, "#aaa5ce");
      this.playSound("blocked");
      return;
    }
    if (this.save.boosters[kind] <= 0) {
      this.boosterTarget = undefined;
      const names: Record<Booster, string> = { time: "加时", rocket: "火箭", pulse: "脉冲" };
      this.showBoosterFeedback(`${names[kind]}已用完`, "#ff7d8d");
      this.playSound("blocked");
      return;
    }
    if (kind === "rocket") {
      this.boosterTarget = this.boosterTarget === "rocket" ? undefined : "rocket";
      this.boosterFeedback = undefined;
      this.playSound("button");
      return;
    }
    this.boosterTarget = undefined;
    const before = this.model.snapshot();
    this.model.beginAction();
    const changed = kind === "time"
      ? this.model.addTime(30)
      : kind === "pulse" ? this.model.thawAll(2) : true;
    if (changed) {
      if (kind === "pulse") {
        this.strategyFollowupAvailableAt = undefined;
        this.strategyFollowupAction = undefined;
        this.strategyFollowupDrags = 0;
      }
      if (kind === "pulse") this.emitMechanicFeedback(before, this.model.snapshot());
      this.spendBooster(kind);
      this.commitAction(kind);
      this.persist();
      this.playSound(kind === "pulse" ? "ice" : "button");
      this.vibrate("light");
      if (kind === "pulse") this.emitBurst(248, 560, "#72f6ff", 28, 150);
      this.showBoosterFeedback(kind === "time" ? "+30 秒" : "机关进度 -2", kind === "time" ? "#66d8ff" : "#bd91ff");
    } else {
      this.model.cancelAction();
      this.showBoosterFeedback(kind === "time" ? "时间已满" : "当前没有机关", "#ffbd55");
      this.playSound("blocked");
    }
  }

  private commitAction(booster?: Booster): boolean {
    const committed = this.model.commitAction(booster == null);
    if (committed) {
      this.undoActions.push({ booster });
      if (this.undoActions.length > 20) this.undoActions.shift();
    }
    return committed;
  }

  private showBoosterFeedback(text: string, color: string): void {
    this.boosterFeedback = { text, color, age: 0, duration: 0.9 };
    this.dirty = true;
    this.scheduleFrame();
  }

  private showHudFeedback(text: string, color: string): void {
    this.hudFeedback = { text, color, age: 0, duration: 0.9 };
    this.dirty = true;
    this.scheduleFrame();
  }

  private levelIdAt(x: number, y: number): number | undefined {
    const firstId = this.levelPage * LEVELS_PER_PAGE + 1;
    const lastId = Math.min(LEVELS.length, firstId + LEVELS_PER_PAGE - 1);
    for (let id = firstId; id <= lastId; id += 1) {
      const localIndex = id - firstId;
      if (this.interactionHit({ x, y }, this.journeyNodeRect(localIndex))) return id;
    }
    return undefined;
  }

  private attemptExit(side: Side): void {
    if (!this.selectedId) return;
    const block = this.model.getBlock(this.selectedId);
    if (!block) return;
    const status = this.model.exitAttemptStatus(this.selectedId, side);
    if (status !== "ok") {
      this.showExitFailure(block, status);
      return;
    }
    this.exitFailure = undefined;
    const ghost = JSON.parse(JSON.stringify(block)) as BlockState;
    const visual = this.dragVisual?.blockId === block.id ? this.dragVisual : undefined;
    if (visual) {
      ghost.x = visual.x;
      ghost.y = visual.y;
    }
    const before = this.model.snapshot();
    const result = this.model.tryExit(this.selectedId, side);
    if (!result.ok) return;
    this.noClearMoveStreak = 0;
    this.strategyNudgeAcknowledged = true;
    this.strategyFollowupAvailableAt = undefined;
    this.strategyFollowupAction = undefined;
    this.strategyFollowupDrags = 0;
    this.strategyRescueDrags = 0;
    const mechanismSource = this.exitGateCenter(before, block, result.color!, side);
    this.emitMechanicFeedback(before, this.model.snapshot(), this.exitToMechanicDelay(), mechanismSource);
    this.emitExitPulse(before, block, result.color!, side);
    this.emitBlockParticles(block, result.color!, side, result.layerRemoved ? 14 : 24);
    if (!result.layerRemoved) this.exitGhosts.push({ block: ghost, side, age: 0, duration: this.save.reducedMotion ? 0.14 : 0.28 });
    this.commitAction();
    this.playSound(result.layerRemoved ? "ice" : "exit");
    this.vibrate(result.layerRemoved ? "light" : "medium");
    this.selectedId = undefined;
    this.activePointer = undefined;
    this.selectionAssist = undefined;
    if (result.layerRemoved && visual) {
      const remaining = this.model.getBlock(block.id);
      if (remaining && Math.hypot(visual.x - remaining.x, visual.y - remaining.y) > 0.001) {
        visual.modelX = remaining.x;
        visual.modelY = remaining.y;
        visual.settling = true;
        visual.settleFromX = visual.x;
        visual.settleFromY = visual.y;
        visual.settleToX = remaining.x;
        visual.settleToY = remaining.y;
        visual.settleElapsed = 0;
        visual.settleDuration = this.save.reducedMotion ? 0.06 : DRAG_SETTLE_DURATION;
      } else {
        this.dragVisual = undefined;
      }
    } else {
      this.dragVisual = undefined;
    }
    this.strategyNudgeDrag = undefined;
    this.blockedBlockId = undefined;
    this.blockedFeedbackTime = 0;
    this.blockerFocusBlockId = undefined;
    this.blockerFocusTime = 0;
    this.grabFeedbackTime = 0;
    if (result.complete) this.pendingCelebration = this.shouldUseQuickClear() ? 0.06 : 0.46;
  }

  private shouldUseQuickClear(): boolean {
    return !this.dailyMode
      && this.model.level.id <= QUICK_CLEAR_MAX_LEVEL
      && !this.save.rewardedLevels.includes(this.model.level.id);
  }

  private createPendingSettlement(): PendingSettlement {
    const snapshot = this.model.snapshot();
    const levelKey = String(this.model.level.id);
    const quickClear = this.shouldUseQuickClear();
    const candidateSave = this.cloneSave(this.save);
    const assistedClear = (candidateSave.activeRun?.boosterSpent.rocket ?? 0) > 0
      || (candidateSave.activeRun?.boosterSpent.pulse ?? 0) > 0;
    const earnedStars = this.starsForMoves(
      snapshot.moves,
      this.model.level.parMoves ?? Math.max(3, this.model.level.blocks.length + 2),
    );
    candidateSave.bestStars[levelKey] = Math.max(candidateSave.bestStars[levelKey] ?? 0, earnedStars);
    const previousMoves = candidateSave.bestMoves[levelKey];
    if (!assistedClear && (!previousMoves || snapshot.moves < previousMoves)) candidateSave.bestMoves[levelKey] = snapshot.moves;
    const firstClearReward = !candidateSave.rewardedLevels.includes(this.model.level.id);
    if (firstClearReward) {
      candidateSave.coins += this.model.level.reward;
      candidateSave.rewardedLevels.push(this.model.level.id);
    }

    let dailyReward = 0;
    let dailySettlementUnavailable = false;
    if (this.dailyMode) {
      const settlementDayKey = validLocalDay(candidateSave.activeRun?.dailyDayKey);
      if (!settlementDayKey) {
        dailySettlementUnavailable = true;
      } else {
        const settlement = settleDailyChallenge(
          settlementDayKey,
          candidateSave.lastDailyCompletedDay,
          candidateSave.dailyStreak,
          earnedStars,
        );
        candidateSave.dailyStreak = settlement.streak;
        candidateSave.lastDailyCompletedDay = settlement.lastCompletedDay;
        if (settlement.completedNow) {
          dailyReward = settlement.reward;
          candidateSave.coins += settlement.reward;
        }
      }
    }

    const previousHighestLevel = candidateSave.highestLevel;
    const nextLevel = Math.min(LEVELS.length, this.model.level.id + 1);
    const advancesJourney = !this.dailyMode
      && firstClearReward
      && this.model.level.id === previousHighestLevel
      && nextLevel > previousHighestLevel;
    if (advancesJourney) {
      candidateSave.highestLevel = nextLevel;
      candidateSave.currentLevel = nextLevel;
    }
    candidateSave.activeRun = undefined;
    return {
      candidateSave,
      baselineSave: this.cloneSave(this.save),
      presentation: {
        assistedClear,
        earnedStars,
        firstClearReward,
        dailyReward,
        dailySettlementUnavailable,
        quickClear,
      },
    };
  }

  private beginCelebration(): void {
    const pending = this.pendingSettlement ?? this.createPendingSettlement();
    this.pendingSettlement = pending;
    this.settlementSaveAttempts += 1;
    const persistence = this.persistVerified(pending.candidateSave, pending.baselineSave);
    if (persistence !== "committed") {
      this.settlementSaveFailed = true;
      this.settlementFailureKind = persistence;
      this.screen = "settlementFailed";
      this.celebrationTime = 0;
      this.quickClear = false;
      this.dirty = true;
      this.playSound("blocked");
      this.vibrate("light");
      this.scheduleFrame();
      return;
    }

    this.save = pending.candidateSave;
    this.assistedClear = pending.presentation.assistedClear;
    this.earnedStars = pending.presentation.earnedStars;
    this.firstClearReward = pending.presentation.firstClearReward;
    this.dailyReward = pending.presentation.dailyReward;
    this.dailySettlementUnavailable = pending.presentation.dailySettlementUnavailable;
    this.quickClear = pending.presentation.quickClear;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.screen = "celebrating";
    this.celebrationTime = 0;
    this.playSound("win");
    this.vibrate("medium");
    const burstCount = this.quickClear ? 3 : 7;
    for (let index = 0; index < burstCount; index += 1) {
      const x = 50 + Math.random() * 396;
      const y = 230 + Math.random() * 420;
      this.emitBurst(
        x,
        y,
        COLOR_STYLE[(["red", "blue", "green", "yellow", "purple", "pink"] as BlockColor[])[index % 6]].base,
        this.quickClear ? 8 : 22,
        this.quickClear ? 130 : 220,
      );
    }
  }

  private abandonFailedSettlement(): void {
    if (this.settlementFailureKind === "unknown" && !this.pendingSettlementAbandon) {
      this.playSound("blocked");
      this.vibrate("light");
      return;
    }
    const pending = this.pendingSettlementAbandon ?? {
      candidateSave: this.abandonRunCandidate(this.save),
      baselineSave: this.cloneSave(this.save),
    };
    this.pendingSettlementAbandon = pending;
    this.settlementSaveAttempts += 1;
    const persistence = this.persistVerified(pending.candidateSave, pending.baselineSave);
    if (persistence !== "committed") {
      this.settlementFailureKind = persistence;
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    const candidate = pending.candidateSave;
    const returnLevelId = candidate.currentLevel;
    this.save = candidate;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.loadLevel(returnLevelId, false);
    this.playSound("button");
  }

  private starsForMoves(moves: number, parMoves: number): number {
    if (moves <= parMoves) return 3;
    if (moves <= parMoves + 2) return 2;
    return 1;
  }

  private blockAt(x: number, y: number): BlockState | undefined {
    this.selectionAssist = undefined;
    const board = this.boardLayout();
    const gridX = Math.floor((x - board.innerX) / board.cell);
    const gridY = Math.floor((y - board.innerY) / board.cell);
    const snapshot = this.model.snapshot();
    const blocks = snapshot.blocks;
    const visibleBlocks = blocks.filter((block) => {
      if (!block.shutterId) return true;
      const shutter = snapshot.shutters.find((item) => item.id === block.shutterId);
      return !shutter || shutter.count <= 0;
    });
    for (let index = visibleBlocks.length - 1; index >= 0; index -= 1) {
      const block = visibleBlocks[index];
      if (this.model.blockCells(block).some(([cx, cy]) => cx === gridX && cy === gridY)) return this.model.getBlock(block.id);
    }

    const isPlayable = snapshot.playable.some(([cellX, cellY]) => cellX === gridX && cellY === gridY);
    const isBlocked = snapshot.blocked.some(([cellX, cellY]) => cellX === gridX && cellY === gridY);
    const isClosedShutterCell = snapshot.shutters.some((shutter) => shutter.count > 0
      && gridX >= shutter.x && gridX < shutter.x + shutter.width
      && gridY >= shutter.y && gridY < shutter.y + shutter.height);
    if (!isPlayable || isBlocked || isClosedShutterCell) return undefined;

    const cellCss = board.cell * this.viewportTransform().scale;
    const maximumDistanceCss = Math.max(0, (MINIMUM_BLOCK_PICK_TARGET_CSS - cellCss) / 2);
    if (maximumDistanceCss <= 0 || cellCss <= 0) return undefined;
    const result = pickNearbyBlock(
      {
        x: (x - board.innerX) / board.cell,
        y: (y - board.innerY) / board.cell,
      },
      visibleBlocks
        .filter((block) => this.model.isBlockActive(block))
        .map((block) => ({ id: block.id, cells: this.model.blockCells(block) })),
      maximumDistanceCss / cellCss,
      BLOCK_PICK_AMBIGUITY_CSS / cellCss,
    );
    if (!result) return undefined;
    this.selectionAssist = {
      blockId: result.blockId,
      distanceCss: result.distance * cellCss,
      maximumDistanceCss,
    };
    return this.model.getBlock(result.blockId);
  }

  private exitSideFromPointer(x: number, y: number, board: BoardLayout): Side | undefined {
    const pad = 6;
    if (y < board.innerY - pad) return "top";
    if (y > board.innerY + board.innerHeight + pad) return "bottom";
    if (x < board.innerX - pad) return "left";
    if (x > board.innerX + board.innerWidth + pad) return "right";
    return undefined;
  }

  private visualTouchesUsableExit(visual: DragVisualState, block: BlockState, side: Side): boolean {
    if (!isContinuousPoseAtEdge(
      visual,
      block.shape,
      this.model.level.width,
      this.model.level.height,
      side,
    )) return false;
    const activeColor = block.layers[0] ?? block.color;
    const minX = visual.x + Math.min(...block.shape.map(([x]) => x));
    const maxX = visual.x + Math.max(...block.shape.map(([x]) => x)) + 1;
    const minY = visual.y + Math.min(...block.shape.map(([, y]) => y));
    const maxY = visual.y + Math.max(...block.shape.map(([, y]) => y)) + 1;
    const tolerance = 0.04;
    return this.model.snapshot().gates.some((gate) => {
      if (gate.side !== side || gate.color !== activeColor || gate.frozen > 0) return false;
      if (block.star && !gate.star) return false;
      const minimum = side === "top" || side === "bottom" ? minX : minY;
      const maximum = side === "top" || side === "bottom" ? maxX : maxY;
      return minimum >= gate.offset - tolerance && maximum <= gate.offset + gate.size + tolerance;
    });
  }

  private boardLayout(): BoardLayout {
    const level = this.model.level;
    const maxWidth = 414;
    const maxHeight = 548;
    const cell = Math.min(maxWidth / level.width, maxHeight / level.height, 67);
    const innerWidth = level.width * cell;
    const innerHeight = level.height * cell;
    const innerX = (LOGICAL_WIDTH - innerWidth) / 2;
    const innerY = 344 + Math.min(56, Math.max(0, (maxHeight - innerHeight) * 0.28));
    return { x: innerX - 18, y: innerY - 18, width: innerWidth + 36, height: innerHeight + 36, cell, innerX, innerY, innerWidth, innerHeight };
  }

  private safeOffsets(): { top: number; bottom: number } {
    const viewport = this.host.viewport();
    const { scale, offsetY } = this.viewportTransform();
    return {
      top: Math.min(54, Math.max(0, (viewport.safeTop - offsetY) / Math.max(scale, 0.001))),
      bottom: Math.min(54, Math.max(0, (viewport.safeBottom - offsetY) / Math.max(scale, 0.001))),
    };
  }

  private homeCardOffset(bottom = this.safeOffsets().bottom): number {
    return -Math.max(0, bottom - 28);
  }

  private offsetRect(rect: Rect, x: number, y: number): Rect {
    return { x: rect.x + x, y: rect.y + y, width: rect.width, height: rect.height };
  }

  private interactionRect(rect: Rect, options: HitTargetOptions = {}): Rect {
    return expandInteractionTarget(rect, this.viewportTransform().scale, options);
  }

  private interactionHit(
    point: Pick<PointerSample, "x" | "y">,
    rect: Rect,
    options: HitTargetOptions = {},
  ): boolean {
    return inside(point.x, point.y, this.interactionRect(rect, options));
  }

  private interactionTargetEvidence(): Record<string, unknown> {
    const scale = this.viewportTransform().scale;
    const safe = this.safeOffsets();
    const targets: Record<string, { visual: Rect; hit: Rect; cssWidth: number; cssHeight: number }> = {};
    const add = (name: string, visual: Rect, options: HitTargetOptions = {}): void => {
      const hit = this.interactionRect(visual, options);
      targets[name] = {
        visual: { ...visual },
        hit,
        cssWidth: hit.width * scale,
        cssHeight: hit.height * scale,
      };
    };

    add("homeSupply", this.offsetRect(BUTTONS.homeSupply, 0, safe.top), { anchorY: "end" });
    add("homeSettings", this.offsetRect(BUTTONS.homeSettings, 0, safe.top), { anchorY: "end" });
    add("homePlay", this.offsetRect(BUTTONS.homePlay, 0, -safe.bottom));
    add("homeDaily", this.offsetRect(BUTTONS.homeDaily, 0, -safe.bottom));
    add("homePrev", this.offsetRect(BUTTONS.homePrev, 0, this.homeCardOffset(safe.bottom)));
    add("homeNext", this.offsetRect(BUTTONS.homeNext, 0, this.homeCardOffset(safe.bottom)));
    add("menuBack", this.offsetRect(BUTTONS.menuBack, 0, safe.top));
    add("settingsUpdates", this.offsetRect(BUTTONS.settingsUpdates, 0, safe.top));
    add("settingsReset", this.offsetRect(BUTTONS.settingsReset, 0, safe.top));
    (Object.keys(SETTINGS_RECTS) as SettingKind[]).forEach((kind) => add(`settings.${kind}`, this.settingRect(kind)));
    SUPPLY_ORDER.forEach((kind) => add(`supply.${kind}`, this.supplyBuyRect(kind)));
    add("leaderboardChapters", BUTTONS.leaderboardChapters);
    add("leaderboardEfficiency", BUTTONS.leaderboardEfficiency);
    add("leaderboardPrev", this.leaderboardFooterRect(BUTTONS.leaderboardPrev));
    add("leaderboardNext", this.leaderboardFooterRect(BUTTONS.leaderboardNext));
    add("journeyPrev", this.journeyFooterRect(BUTTONS.levelsPrev));
    add("journeyNext", this.journeyFooterRect(BUTTONS.levelsNext));
    JOURNEY_NODE_CENTERS.forEach((_, index) => add(`journeyNode.${index}`, this.journeyNodeRect(index)));
    add("collectionCategory.colors", this.collectionCategoryRect("colors"));
    add("collectionCategory.mechanisms", this.collectionCategoryRect("mechanisms"));
    this.collectionItems().forEach((_, index) => add(`collection.${index}`, this.collectionCardRect(index)));
    MAIN_NAVIGATION.forEach((_, index) => add(`navigation.${index}`, this.mainNavigationRect(index)));
    add("updateToast", this.offsetRect(BUTTONS.updateToast, 0, safe.top));
    add("boosterUnlockToast", this.boosterUnlockToastRect());
    add("undo", this.offsetRect(BUTTONS.undo, 0, safe.top));
    add("pause", this.offsetRect(BUTTONS.pause, 0, safe.top));
    add("booster.time", this.offsetRect(BUTTONS.time, 0, -safe.bottom));
    add("booster.rocket", this.offsetRect(BUTTONS.rocket, 0, -safe.bottom));
    add("booster.pulse", this.offsetRect(BUTTONS.pulse, 0, -safe.bottom));
    (Object.keys(PAUSE_SETTING_RECTS) as SettingKind[]).forEach((kind) => add(`pause.${kind}`, PAUSE_SETTING_RECTS[kind]));
    add("pauseResume", BUTTONS.pauseResume, { anchorY: "end" });
    add("pauseRestart", BUTTONS.pauseRestart, { anchorY: "start" });
    add("pauseHome", BUTTONS.pauseHome, { anchorY: "start" });
    add("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" });
    add("modalSecondary", BUTTONS.modalSecondary, { anchorY: "start" });

    return {
      minimumCssSize: MINIMUM_INTERACTION_TARGET_CSS,
      minimumLogicalSize: MINIMUM_INTERACTION_TARGET_CSS / Math.max(scale, 0.001),
      targets,
    };
  }

  private emitBlockParticles(block: BlockState, color: BlockColor, side: Side, count: number): void {
    const board = this.boardLayout();
    const cells = this.model.blockCells(block);
    let centerX = board.innerX + (cells.reduce((sum, [x]) => sum + x + 0.5, 0) / cells.length) * board.cell;
    let centerY = board.innerY + (cells.reduce((sum, [, y]) => sum + y + 0.5, 0) / cells.length) * board.cell;
    if (side === "top") centerY = board.innerY - 4;
    if (side === "bottom") centerY = board.innerY + board.innerHeight + 4;
    if (side === "left") centerX = board.innerX - 4;
    if (side === "right") centerX = board.innerX + board.innerWidth + 4;
    const [outX, outY] = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[side];
    const tangentX = -outY;
    const tangentY = outX;
    const actualCount = this.save.reducedMotion ? Math.max(2, Math.ceil(count * 0.25)) : count;
    for (let index = 0; index < actualCount; index += 1) {
      const outwardSpeed = (this.save.reducedMotion ? 66 : 128) + Math.random() * (this.save.reducedMotion ? 48 : 172);
      const spread = (Math.random() - 0.5) * (this.save.reducedMotion ? 76 : 260);
      const life = this.save.reducedMotion ? 0.22 + Math.random() * 0.18 : 0.34 + Math.random() * 0.32;
      const originSpread = (Math.random() - 0.5) * board.cell * 0.58;
      this.particles.push({
        x: centerX + tangentX * originSpread,
        y: centerY + tangentY * originSpread,
        vx: outX * outwardSpeed + tangentX * spread,
        vy: outY * outwardSpeed + tangentY * spread,
        life,
        maxLife: life,
        size: this.save.reducedMotion ? 3.5 + Math.random() * 2.5 : 3.5 + Math.random() * 4,
        color: COLOR_STYLE[color].base,
        spin: Math.random() * Math.PI,
        fragmentColor: color,
        fragmentIndex: index % 4,
      });
    }
    const cap = this.save.reducedMotion ? 90 : 260;
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
  }

  private exitGateForBlock(snapshot: PuzzleSnapshot, block: BlockState, color: BlockColor, side: Side): PuzzleSnapshot["gates"][number] | undefined {
    const cells = this.model.blockCells(block);
    const min = side === "top" || side === "bottom"
      ? Math.min(...cells.map(([x]) => x))
      : Math.min(...cells.map(([, y]) => y));
    const max = side === "top" || side === "bottom"
      ? Math.max(...cells.map(([x]) => x))
      : Math.max(...cells.map(([, y]) => y));
    return snapshot.gates.find((candidate) => (
      candidate.side === side
      && candidate.color === color
      && candidate.offset <= min
      && candidate.offset + candidate.size >= max + 1
    ));
  }

  private exitGateCenter(snapshot: PuzzleSnapshot, block: BlockState, color: BlockColor, side: Side): { x: number; y: number } | undefined {
    const gate = this.exitGateForBlock(snapshot, block, color, side);
    if (!gate) return undefined;
    const board = this.boardLayout();
    const thickness = 22;
    let x = board.innerX + gate.offset * board.cell;
    let y = board.innerY - thickness;
    let width = gate.size * board.cell;
    let height = thickness + 5;
    if (gate.side === "bottom") y = board.innerY + board.innerHeight - 5;
    if (gate.side === "left" || gate.side === "right") {
      x = gate.side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth - 5;
      y = board.innerY + gate.offset * board.cell;
      width = thickness + 5;
      height = gate.size * board.cell;
    }
    return { x: x + width / 2, y: y + height / 2 };
  }

  private emitExitPulse(snapshot: PuzzleSnapshot, block: BlockState, color: BlockColor, side: Side): void {
    const gate = this.exitGateForBlock(snapshot, block, color, side);
    if (!gate) return;
    this.exitPulses.push({
      side,
      offset: gate.offset,
      size: gate.size,
      color,
      age: 0,
      duration: this.save.reducedMotion ? 0.22 : 0.42,
    });
    if (this.exitPulses.length > 8) this.exitPulses.splice(0, this.exitPulses.length - 8);
  }

  private exitToMechanicDelay(): number {
    return this.save.reducedMotion ? EXIT_TO_MECHANIC_REDUCED_DELAY : EXIT_TO_MECHANIC_DELAY;
  }

  private emitMechanicFeedback(
    before: PuzzleSnapshot,
    after: PuzzleSnapshot,
    delay = 0,
    source?: { x: number; y: number },
  ): void {
    const board = this.boardLayout();
    const detectedEvents = detectMechanicEvents(before, after);
    const events = [
      ...detectedEvents.filter((event) => event.kind === "conveyor"),
      ...detectedEvents.filter((event) => event.kind !== "conveyor"),
    ].slice(0, 12);
    const importantRelayEvents = events.filter((event) => event.unlocked || event.kind === "conveyor");
    const fallbackRelayEvent = events.find((event) => event.kind === "shutter") ?? events[0];
    const relayEvents = new Set((importantRelayEvents.length ? importantRelayEvents : [fallbackRelayEvent])
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .slice(0, MAX_CAUSAL_RELAYS_PER_ACTION));
    let gateDelay = 0;
    for (const event of events) {
      let bounds: Rect | undefined;
      if (event.target === "gate") {
        const gate = after.gates.find((item) => item.id === event.id);
        if (!gate) continue;
        const thickness = 22;
        let x = board.innerX + gate.offset * board.cell;
        let y = board.innerY - thickness;
        let width = gate.size * board.cell;
        let height = thickness + 5;
        if (gate.side === "bottom") y = board.innerY + board.innerHeight - 5;
        if (gate.side === "left" || gate.side === "right") {
          x = gate.side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth - 5;
          y = board.innerY + gate.offset * board.cell;
          width = thickness + 5;
          height = gate.size * board.cell;
        }
        bounds = { x, y, width, height };
      } else if (event.target === "block") {
        const block = after.blocks.find((item) => item.id === event.id);
        if (!block) continue;
        const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const);
        const minX = Math.min(...cells.map(([x]) => x));
        const maxX = Math.max(...cells.map(([x]) => x));
        const minY = Math.min(...cells.map(([, y]) => y));
        const maxY = Math.max(...cells.map(([, y]) => y));
        bounds = {
          x: board.innerX + minX * board.cell,
          y: board.innerY + minY * board.cell,
          width: (maxX - minX + 1) * board.cell,
          height: (maxY - minY + 1) * board.cell,
        };
      } else {
        const shutter = after.shutters.find((item) => item.id === event.id);
        if (!shutter) continue;
        bounds = {
          x: board.innerX + shutter.x * board.cell,
          y: board.innerY + shutter.y * board.cell,
          width: shutter.width * board.cell,
          height: shutter.height * board.cell,
        };
      }

      const burstColor = event.kind === "ice"
        ? "#72f6ff"
        : event.kind === "layer"
          ? "#c76cff"
          : event.kind === "conveyor"
            ? "#8af7ff"
            : event.skin === "generator" ? "#76eaff" : "#ffb52e";
      const targetDelay = delay + (event.target === "gate" ? gateDelay++ * 0.14 : 0);
      const hasRelay = Boolean(source && targetDelay > 0 && relayEvents.has(event));
      const pulse: MechanicPulse = {
        kind: event.kind,
        target: event.target,
        targetId: event.id,
        shutterSkin: event.skin,
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        width: bounds.width,
        height: bounds.height,
        sourceX: hasRelay ? source!.x : undefined,
        sourceY: hasRelay ? source!.y : undefined,
        delay: targetDelay,
        fromX: event.from?.[0],
        fromY: event.from?.[1],
        toX: event.to?.[0],
        toY: event.to?.[1],
        motionDuration: event.kind === "conveyor" && !this.save.reducedMotion ? CONVEYOR_MOTION_DURATION : 0,
        age: -targetDelay,
        duration: event.kind === "layer" ? 0.82 : event.kind === "conveyor" ? 0.68 : event.unlocked ? 0.72 : 0.5,
        remaining: event.remaining,
        unlocked: event.unlocked,
        burstColor,
        burstCount: event.unlocked ? 15 : 5,
        burstSpeed: event.unlocked ? 115 : 68,
        shakeDuration: event.unlocked && !this.save.reducedMotion ? event.kind === "layer" ? 0.12 : 0.18 : 0,
        presented: false,
      };
      this.mechanicPulses.push(pulse);
      if (pulse.age >= 0) this.presentMechanicPulse(pulse);
    }
    if (this.mechanicPulses.length > 18) this.mechanicPulses.splice(0, this.mechanicPulses.length - 18);
  }

  private presentMechanicPulse(pulse: MechanicPulse): void {
    if (pulse.presented) return;
    pulse.presented = true;
    this.emitBurst(pulse.x, pulse.y, pulse.burstColor, pulse.burstCount, pulse.burstSpeed);
    this.boardShakeTime = Math.max(this.boardShakeTime, pulse.shakeDuration);
  }

  private showExitFailure(block: BlockState, status: Exclude<ExitAttemptStatus, "ok">): void {
    const board = this.boardLayout();
    const cells = this.model.blockCells(block);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const x = board.innerX + minX * board.cell;
    const y = board.innerY + minY * board.cell;
    const width = (maxX - minX + 1) * board.cell;
    const height = (maxY - minY + 1) * board.cell;
    const text: Record<Exclude<ExitAttemptStatus, "ok">, string> = {
      inactive: "暂时不能移动",
      "not-at-edge": "先对准出口",
      "no-gate": "这里没有出口",
      "wrong-color": "颜色不匹配",
      "frozen-gate": "出口仍冰封",
      "star-gate-required": "星块要走星门",
    };
    const repeated = this.exitFailure?.status === status && this.exitFailure.age < 0.16;
    this.exitFailure = { status, text: text[status], x, y, width, height, age: 0, duration: 0.72 };
    this.blockedBlockId = block.id;
    this.blockedFeedbackTime = BLOCKED_FEEDBACK_DURATION;
    if (!repeated) {
      const color = status === "frozen-gate" ? "#72f6ff" : status === "wrong-color" ? "#ff6d7a" : "#ffc857";
      this.emitBurst(x + width / 2, y + height / 2, color, 7, 62);
      if (this.elapsed - this.lastBlockedSoundAt > 0.22) {
        this.playSound(status === "frozen-gate" ? "ice" : "blocked");
        this.vibrate("light");
        this.lastBlockedSoundAt = this.elapsed;
      }
    }
    this.dirty = true;
    this.scheduleFrame();
  }

  private emitBurst(x: number, y: number, color: string, count: number, speed: number, addX = 0, addY = 0): void {
    const reduced = this.save.reducedMotion;
    const actualCount = reduced ? Math.max(2, Math.ceil(count * 0.25)) : count;
    const actualSpeed = reduced ? Math.min(speed, 55) : speed;
    const impulseScale = reduced ? 0.25 : 1;
    for (let index = 0; index < actualCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = actualSpeed * (0.35 + Math.random() * 0.8);
      const life = reduced ? 0.28 + Math.random() * 0.25 : 0.55 + Math.random() * 0.65;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity + addX * impulseScale,
        vy: Math.sin(angle) * velocity + addY * impulseScale,
        life,
        maxLife: life,
        size: reduced ? 3 + Math.random() * 4 : 4 + Math.random() * 8,
        color,
        spin: Math.random() * Math.PI,
      });
    }
    const cap = reduced ? 90 : 260;
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
  }

  private updateParticles(delta: number): void {
    for (const particle of this.particles) {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 180 * delta;
      particle.vx *= 0.992;
      particle.spin += delta * 5;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private updateExitGhosts(delta: number): void {
    for (const ghost of this.exitGhosts) ghost.age += delta;
    this.exitGhosts = this.exitGhosts.filter((ghost) => ghost.age < ghost.duration);
  }

  private updateExitPulses(delta: number): void {
    for (const pulse of this.exitPulses) pulse.age += delta;
    this.exitPulses = this.exitPulses.filter((pulse) => pulse.age < pulse.duration);
  }

  private updateMechanicPulses(delta: number): void {
    for (const pulse of this.mechanicPulses) {
      pulse.age += delta;
      if (pulse.age >= 0) this.presentMechanicPulse(pulse);
    }
    this.mechanicPulses = this.mechanicPulses.filter((pulse) => pulse.age < pulse.duration);
    this.boardShakeTime = Math.max(0, this.boardShakeTime - delta);
  }

  private updateExitFailure(delta: number): void {
    if (!this.exitFailure) return;
    this.exitFailure.age += delta;
    if (this.exitFailure.age >= this.exitFailure.duration) this.exitFailure = undefined;
  }

  private updateBoosterFeedback(delta: number): void {
    if (!this.boosterFeedback) return;
    this.boosterFeedback.age += delta;
    if (this.boosterFeedback.age >= this.boosterFeedback.duration) this.boosterFeedback = undefined;
  }

  private updateHudFeedback(delta: number): void {
    if (!this.hudFeedback) return;
    this.hudFeedback.age += delta;
    if (this.hudFeedback.age >= this.hudFeedback.duration) this.hudFeedback = undefined;
  }

  private render(): void {
    const viewport = this.host.viewport();
    const { scale, offsetX, offsetY } = this.viewportTransform();
    const pixelRatio = viewport.pixelRatio;
    const ctx = this.ctx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#090622";
    ctx.fillRect(0, 0, this.host.canvas.width, this.host.canvas.height);
    const updateOverHome = this.screen === "updates" && this.updateReturnScreen === "home";
    const backdrop = this.screen === "home" || this.screen === "feature" || updateOverHome ? this.art.home : this.art.gameplayBackground;
    if (backdrop) {
      const sourceWidth = backdrop.naturalWidth || backdrop.width;
      const sourceHeight = backdrop.naturalHeight || backdrop.height;
      const coverScale = Math.max(this.host.canvas.width / sourceWidth, this.host.canvas.height / sourceHeight);
      const drawWidth = sourceWidth * coverScale;
      const drawHeight = sourceHeight * coverScale;
      ctx.drawImage(backdrop, (this.host.canvas.width - drawWidth) / 2, (this.host.canvas.height - drawHeight) / 2, drawWidth, drawHeight);
    }
    ctx.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, offsetX * pixelRatio, offsetY * pixelRatio);
    this.drawBackground();

    // Shell art arrives before gameplay art. Keep every pre-ready screen on the
    // complete shell so a slow deferred image can never reach drawImage as an
    // undefined source (including debug/test level switches during startup).
    if (!this.artReady) {
      if (this.art.home) this.drawHome();
      this.drawStartupStatus();
      return;
    }

    if (this.navigationTransition && this.isMainNavigationScreen(this.screen)) {
      this.drawMainNavigationTransition(this.navigationTransition);
    } else if (this.screen === "updates") {
      if (this.updateReturnScreen === "home") this.drawHome();
      else this.drawSettings();
    } else if (this.screen === "home" || this.screen === "feature") this.drawHome();
    else if (this.screen === "supply") this.drawSupply();
    else if (this.screen === "leaderboard") this.drawLeaderboard();
    else if (this.screen === "settings" || this.screen === "resetConfirm") this.drawSettings();
    else if (this.screen === "levels") this.drawLevels();
    else if (this.screen === "records") this.drawRecords();
    else {
      this.drawHud();
      ctx.save();
      if (this.boardShakeTime > 0 && !this.save.reducedMotion) {
        const strength = Math.min(1, this.boardShakeTime / 0.18);
        ctx.translate(Math.sin(this.elapsed * 92) * strength * 2.8, Math.cos(this.elapsed * 77) * strength * 1.8);
      }
      this.drawBoard();
      this.drawMechanicPulses();
      this.drawExitFailure();
      ctx.restore();
      this.drawBoosters();
    }
    this.drawParticles();
    if (this.boosterUnlockToast && this.boosterUnlockToastEligible()) this.drawBoosterUnlockToast();
    if (this.screen === "paused") this.drawPause();
    if (this.screen === "feature") this.drawFeature();
    if (this.screen === "celebrating") this.drawCelebration();
    if (this.screen === "win") this.drawWin();
    if (this.screen === "failed") this.drawFailed();
    if (this.screen === "settlementFailed") this.drawSettlementFailed();
    if (this.screen === "updates") this.drawUpdateNotice();
    if (this.screen === "resetConfirm") this.drawResetConfirm();
    if (!this.storageBaselineReady) this.drawStorageUnavailable();
  }

  private drawStartupStatus(): void {
    const failed = Boolean(this.artLoadError);
    const message = failed ? "资源加载失败，请重新进入" : "正在准备游戏…";
    const pill = this.art.homeUi?.levelPill;
    if (pill) {
      this.ctx.drawImage(pill, 143, 148, 210, 54);
      this.label(message, 248, 182, 17, failed ? "#ffd0d0" : "#f8f6ff", "center", 900, "#2b275f", 2);
    } else {
      this.label(message, 248, 548, 20, failed ? "#ffd0d0" : "#f8f6ff", "center", 900, "#2b275f", 2);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    if (this.art.gameplayBackground) {
      ctx.drawImage(this.art.gameplayBackground, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
  }

  private drawHome(drawNavigation = true): void {
    if (this.art.home) this.drawGeneratedHome(drawNavigation);
  }

  private drawGeneratedHome(drawNavigation = true): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    const ui = this.art.homeUi;
    if (!ui) return;
    ctx.drawImage(this.art.home!, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.save();
    ctx.translate(0, safe.top);
    ctx.drawImage(ui.coinPanel, 42, 72, 110, 36);
    ctx.drawImage(ui.coinIcon, 10, 62, 51, 52);
    this.label(`${this.save.coins}`, 103, 90, 21, "#785149", "center", 900);
    ctx.drawImage(ui.levelPill, 181, 68, 134, 45);
    this.label(`关卡${this.model.level.id}`, 248, 91, 24, "#f8f6ff", "center", 900, "#2b275f", 2);
    ctx.drawImage(ui.settingsButton, 430, 62, 52, 53);
    ctx.restore();

    ctx.save();
    ctx.translate(0, this.homeCardOffset(safe.bottom));
    ctx.drawImage(ui.levelCard, 143, 646, 210, 101);
    this.label(`关卡${this.model.level.id}`, 248, 673, 24, "#fff2a5", "center", 950, "#52226d", 3);
    this.label(this.model.level.name, 248, 716, 20, "#fffaf2", "center", 900, "#55305e", 3);
    this.drawHomeLevelArrows();
    ctx.restore();

    ctx.save();
    ctx.translate(0, -safe.bottom);
    ctx.drawImage(ui.startButton, 132, 770, 232, 80);
    this.label("开始挑战", 248, 810, 30, "#fffef2", "center", 1000, "#20701a", 4);
    ctx.restore();
    this.drawDailyHomeButton(-safe.bottom);
    if (drawNavigation) this.drawMainNavigation("home");
    if (this.updateToastVisible) this.drawUpdateToast(safe.top);
  }

  private drawMainNavigationPage(screen: MainNavigationScreen, offsetX: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(offsetX, 0);
    if (screen === "home") this.drawHome(false);
    else if (screen === "supply") this.drawSupply(false);
    else if (screen === "leaderboard") this.drawLeaderboard(false);
    else if (screen === "levels") this.drawLevels(false);
    else this.drawRecords(false);
    ctx.restore();
  }

  private drawMainNavigationTransition(transition: MainNavigationTransition): void {
    const progress = this.mainNavigationVisualProgress(transition);
    this.drawMainNavigationPage(transition.from, -transition.direction * progress * LOGICAL_WIDTH);
    this.drawMainNavigationPage(transition.to, transition.direction * (1 - progress) * LOGICAL_WIDTH);
    this.drawMainNavigation(this.navigationPendingTarget ?? transition.to);
  }

  private drawMainNavigation(selected: MainNavigationScreen): void {
    const nav = this.art.navigationFive;
    if (!nav) return;
    const ctx = this.ctx;
    const y = 982 - this.safeOffsets().bottom;
    const slotWidth = LOGICAL_WIDTH / MAIN_NAVIGATION.length;
    const selectedIndex = MAIN_NAVIGATION.findIndex((tab) => tab.screen === selected);
    ctx.save();
    ctx.drawImage(nav.bar, 0, y, LOGICAL_WIDTH, 96);
    if (selectedIndex >= 0) {
      const selectedWidth = 90;
      const selectedHeight = 74;
      ctx.drawImage(
        nav.selected,
        selectedIndex * slotWidth + (slotWidth - selectedWidth) / 2,
        y - 3,
        selectedWidth,
        selectedHeight,
      );
    }
    MAIN_NAVIGATION.forEach((tab, index) => {
      const active = tab.screen === selected;
      const centerX = index * slotWidth + slotWidth / 2;
      const iconSize = active ? 50 : 44;
      this.drawAtlasCell(
        nav.icons,
        index,
        ART_ATLASES.navigationFive,
        { x: centerX - iconSize / 2, y: y + (active ? 1 : 5), width: iconSize, height: iconSize },
      );
      this.label(tab.label, centerX, y + 82, 14, active ? "#fff3a8" : "#eef5ff", "center", active ? 1000 : 850, "#24104d", 3);
    });
    if (this.pendingCollectionDiscoveryLevel() != null) {
      this.drawDiscoveryBadge(this.collectionDiscoveryBadgeRect());
    }
    ctx.restore();
  }

  private drawDiscoveryBadge(rect: Rect): void {
    if (!this.art.discoveryBadge) return;
    this.ctx.drawImage(this.art.discoveryBadge, rect.x, rect.y, rect.width, rect.height);
  }

  private drawUpdateToast(offsetY: number): void {
    const rect = this.offsetRect(BUTTONS.updateToast, 0, offsetY);
    const ctx = this.ctx;
    const fadeIn = Math.min(1, this.updateToastAge / 0.2);
    const fadeOut = Math.min(1, Math.max(0, UPDATE_TOAST_DURATION - this.updateToastAge) / 0.45);
    ctx.save();
    ctx.globalAlpha = fadeIn * fadeOut;
    this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, 28);
    this.drawOnboardingIcon(1, rect.x + 50, rect.y + rect.height / 2, 62);
    this.label("本次更新", rect.x + 94, rect.y + 30, 21, "#fff1a8", "left", 950, "#4d1d7a", 3);
    this.label(UPDATE_NOTICE.items[0], rect.x + 94, rect.y + 57, 16, "#efeaff", "left", 800);
    this.label("点击查看更新内容", rect.x + 94, rect.y + 80, 14, "#82e9ff", "left", 750);
    ctx.restore();
  }

  private drawHomeLevelArrows(): void {
    const ui = this.art.homeUi;
    if (!ui) return;
    if (this.model.level.id > 1) this.ctx.drawImage(ui.arrowLeft, 43, 664, 63, 71);
    if (this.model.level.id < this.save.highestLevel) this.ctx.drawImage(ui.arrowRight, 390, 664, 63, 71);
  }

  private drawDailyHomeButton(offsetY = 0): void {
    const daily = this.dailyStatus();
    this.homeDailyRenderedDayKey = daily.today;
    const rect = this.offsetRect(BUTTONS.homeDaily, 0, offsetY);
    const ctx = this.ctx;
    const ui = this.art.homeUi;
    if (!ui) return;
    ctx.save();
    // The supplied ribbon and calendar already communicate the locked state
    // through the live copy. Keep the approved art fully opaque in both states.
    ctx.globalAlpha = 1;
    ctx.drawImage(ui.dailyRibbon, 126, 868 + offsetY, 244, 68);
    ctx.drawImage(ui.dailyCalendar, 143, 868 + offsetY, 46, 47);
    const text = !daily.unlocked
      ? "通关 5 关解锁每日挑战"
      : this.dailyUnlockDiscoveryPending()
        ? "每日挑战已解锁 · 点击开始"
        : daily.completedToday
          ? `已完成 · 可重玩 · 连续 ${this.save.dailyStreak} 天`
          : `今日挑战 · 第 ${daily.levelId} 关`;
    this.label(text, 275, 906 + offsetY, 16, daily.unlocked ? "#68432f" : "#74676d", "center", 900, "#fff3dc", 2);
    if (this.dailyUnlockDiscoveryPending()) this.drawDiscoveryBadge(this.dailyDiscoveryBadgeRect(offsetY));
    ctx.restore();
  }

  private drawLevels(drawNavigation = true): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    ctx.save();
    ctx.translate(0, this.mainPageHeaderOffset());
    this.drawAtlasCell(this.art.navigationFive?.icons, 3, ART_ATLASES.navigationFive, { x: 34, y: 34, width: 68, height: 68 });
    this.label("旅程", 118, 78, 38, "#fff4c7", "left", 1000, "#4f218f", 6);
    this.drawPill(318, 48, 154, 48, "#171342", "#6a55c9", 22);
    this.drawSystemIcon(1, 344, 72, 28);
    this.label(`${this.totalStars()}/${LEVELS.length * 3}`, 366, 79, 20, "#fff4a8", "left", 900);
    ctx.restore();

    const firstId = this.levelPage * LEVELS_PER_PAGE + 1;
    const lastId = Math.min(LEVELS.length, firstId + LEVELS_PER_PAGE - 1);
    this.drawPill(151, 120, 194, 45, "rgba(23,16,68,.94)", "#7664da", 22);
    this.label(`航段 ${this.levelPage + 1}/10 · Lv ${firstId}–${lastId}`, 248, 150, 18, "#e9e5ff", "center", 850);
    if (this.art.journeyTrack) this.ctx.drawImage(this.art.journeyTrack, 0, 170, 496, 744);
    for (let id = firstId; id <= lastId; id += 1) {
      const localIndex = id - firstId;
      const [x, y] = JOURNEY_NODE_CENTERS[localIndex];
      const unlocked = id <= this.save.highestLevel;
      const selected = id === this.model.level.id;
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.48;
      if (selected) this.drawButtonChrome({ x: x - 31, y: y - 29, width: 62, height: 58 }, 2, false);
      if (unlocked) this.label(`${id}`, x, y + 8, 22, "white", "center", 1000, "#261562", 3);
      else this.drawSystemIcon(11, x, y, 24, 0.8);
      if (unlocked && this.save.bestStars[String(id)]) this.drawStarRating(x, y + 38, this.save.bestStars[String(id)] ?? 0, 5.2);
      ctx.restore();
    }
    const canGoBack = this.levelPage > 0;
    const canGoForward = this.levelPage < LEVEL_PAGE_COUNT - 1;
    const prevRect = this.journeyFooterRect(BUTTONS.levelsPrev);
    const nextRect = this.journeyFooterRect(BUTTONS.levelsNext);
    const footerOffset = -safe.bottom;
    ctx.save();
    ctx.globalAlpha = canGoBack ? 1 : 0.42;
    this.drawButtonChrome(prevRect, 1, false);
    this.label("‹ 上一段", prevRect.x + prevRect.width / 2, prevRect.y + 33, 18, "#fff", "center", 900, "#261562", 3);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = canGoForward ? 1 : 0.42;
    this.drawButtonChrome(nextRect, 1, false);
    this.label("下一段 ›", nextRect.x + nextRect.width / 2, nextRect.y + 33, 18, "#fff", "center", 900, "#261562", 3);
    ctx.restore();
    this.label("点击已解锁节点选择关卡", 248, 944 + footerOffset, 15, "#aaa3e9", "center", 750);
    if (drawNavigation) this.drawMainNavigation("levels");
  }

  private drawRecords(drawNavigation = true): void {
    const ctx = this.ctx;
    const items = this.collectionItems();
    const selectedIndex = this.collectionSelections[this.collectionCategory];
    const selected = items[selectedIndex] ?? items[0];
    const selectedUnlocked = this.collectionItemUnlocked(selected);
    const unlockedCount = items.filter((item) => this.collectionItemUnlocked(item)).length;
    const detailRect = this.collectionDetailRect();
    const scale = this.viewportTransform().scale;
    const readable = (base: number, minimumCss: number, cap: number): number => (
      Math.min(cap, Math.max(base, minimumCss / Math.max(scale, 0.001)))
    );

    ctx.save();
    ctx.translate(0, this.mainPageHeaderOffset());
    this.drawAtlasCell(this.art.navigationFive?.icons, 4, ART_ATLASES.navigationFive, { x: 34, y: 34, width: 68, height: 68 });
    this.label("收藏图鉴", 118, 78, 34, "#fff4c7", "left", 1000, "#4f218f", 6);
    this.drawPill(326, 48, 146, 48, "#171342", "#6e61d7", 22);
    this.label(`${unlockedCount}/${items.length}`, 399, 79, 21, "#fff4a8", "center", 900);
    ctx.restore();

    (["colors", "mechanisms"] as const).forEach((category) => {
      const rect = this.collectionCategoryRect(category);
      const active = this.collectionCategory === category;
      this.drawButtonChrome(rect, active ? 0 : 1, active);
      this.label(
        category === "colors" ? "色彩 8" : "机制 11",
        rect.x + rect.width / 2,
        rect.y + rect.height / 2 + 1,
        readable(17, 10.5, 21),
        active ? "#fff8c9" : "#ddd6ff",
        "center",
        950,
        "#30166b",
        3,
      );
    });

    items.forEach((item, index) => {
      const rect = this.collectionCardRect(index);
      const unlocked = this.collectionItemUnlocked(item);
      const isSelected = index === selectedIndex;
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.42;
      if (isSelected) {
        ctx.shadowColor = "#79efff";
        ctx.shadowBlur = 16;
      }
      this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, isSelected ? 22 : 34);
      if (item.kind === "color") {
        const art = this.art.blockCells?.[item.color];
        if (art) ctx.drawImage(art, rect.x + 32, rect.y + 10, 64, 64);
      } else {
        this.drawAtlasCell(this.art.mechanismGuideIcons, item.atlasIndex, ART_ATLASES.mechanismGuideIcons, {
          x: rect.x + 32, y: rect.y + 10, width: 64, height: 64,
        });
      }
      if (!unlocked) this.drawSystemIcon(11, rect.x + rect.width / 2, rect.y + 42, 28, 0.9);
      this.label(
        item.title,
        rect.x + rect.width / 2,
        rect.y + 88,
        readable(16, 10.5, 21),
        unlocked ? "#fff3ad" : "#b0aac2",
        "center",
        900,
        "#3a1b70",
        2,
      );
      this.label(
        unlocked ? (item.kind === "mechanism" ? "规则可查" : "已收集") : `Lv ${item.unlockLevel}`,
        rect.x + rect.width / 2,
        rect.y + 108,
        readable(13, 9, 18),
        unlocked ? "#78efb4" : "#8d86a5",
        "center",
        750,
      );
      ctx.restore();
    });

    this.drawChromePanel(
      detailRect.x,
      detailRect.y,
      detailRect.width,
      detailRect.height,
      selectedUnlocked ? 24 : 36,
    );
    this.label(
      selected.title,
      248,
      detailRect.y + 37,
      readable(22, 12, 24),
      selectedUnlocked ? "#fff3ad" : "#b8b2c8",
      "center",
      950,
      "#321565",
      3,
    );
    this.label(
      selected.kind === "mechanism" ? "机制效果" : "色彩标记",
      248,
      detailRect.y + 68,
      readable(15, 10, 20),
      selectedUnlocked ? "#78efb4" : "#8f89a6",
      "center",
      850,
    );
    this.wrapText(
      this.collectionDetailText(selected),
      248,
      detailRect.y + 104,
      348,
      Math.max(25, readable(17, 11.5, 23) + 4),
      readable(17, 11.5, 23),
      selectedUnlocked ? "#e5e0ff" : "#9d96b1",
    );
    if (drawNavigation) this.drawMainNavigation("records");
  }

  private drawSupply(drawNavigation = true): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    const pageOffset = this.supplyPageOffset();
    ctx.save();
    ctx.translate(0, this.mainPageHeaderOffset());
    this.drawAtlasCell(this.art.navigationFive?.icons, 0, ART_ATLASES.navigationFive, { x: 34, y: 34, width: 68, height: 68 });
    this.label("商店", 118, 78, 38, "#fff4c7", "left", 1000, "#4f218f", 6);
    this.drawPill(326, 44, 144, 52, "#171342", "#6e61d7", 22);
    this.drawCoin(350, 70, 16);
    this.label(`${this.save.coins}`, 378, 72, 25, "#eef4ff", "left", 850);

    if (this.art.supply) ctx.drawImage(this.art.supply, 48, 112, 400, 200);
    const caption = this.supplyFeedback?.text ?? "通关赚金币 · 按需补充道具";
    const captionColor = this.supplyFeedback?.color ?? "#d7d0ff";
    this.drawPill(90, 316, 316, 42, "rgba(23,16,68,.94)", captionColor, 20);
    this.label(caption, 248, 343, 17, "#fff9e8", "center", 850, "#24104d", 3);
    ctx.restore();

    SUPPLY_ORDER.forEach((kind, index) => {
      const item = SUPPLY_ITEMS[kind];
      const rect = this.offsetRect(SUPPLY_RECTS[kind], 0, pageOffset);
      const stock = this.save.boosters[kind];
      const unlocked = this.boosterUnlocked(kind);
      const full = stock >= item.maxStock;
      const affordable = unlocked && this.save.coins >= item.price;

      ctx.save();
      this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, 40);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.36;
      this.drawBoosterArtwork(index, rect.x + 39, rect.y + 30, 104, 100);
      ctx.restore();
      this.label(item.title, rect.x + 146, rect.y + 51, 27, unlocked ? "#fff3ae" : "#b7b0c8", "left", 950, "#4d1d7a", 4);
      this.label(item.effect, rect.x + 146, rect.y + 88, 17, unlocked ? "#d6d0ff" : "#8f89a6", "left", 750);
      this.label(unlocked ? `库存 ${stock}/${item.maxStock}` : `Lv ${item.unlockLevel} 解锁`, rect.x + 146, rect.y + 122, 17, unlocked && !full ? "#79ecbc" : "#aaa5bd", "left", 850);

      const buy = this.supplyBuyRect(kind);
      ctx.save();
      ctx.globalAlpha = !unlocked || full ? 0.52 : affordable ? 1 : 0.58;
      this.drawButtonChrome(buy, !unlocked || full ? 1 : 0);
      ctx.restore();
      if (!unlocked) {
        this.drawSystemIcon(11, buy.x + 35, buy.y + buy.height / 2, 24, 0.8);
        this.label(`Lv ${item.unlockLevel}`, buy.x + 73, buy.y + buy.height / 2 + 8, 18, "#c6c1d2", "center", 900);
      } else if (full) {
        this.label("已满", buy.x + buy.width / 2, buy.y + buy.height / 2 + 9, 23, "#c6c1d2", "center", 900);
      } else {
        ctx.save();
        ctx.globalAlpha = affordable ? 1 : 0.55;
        this.drawCoin(buy.x + 29, buy.y + buy.height / 2, 13);
        this.label(`${item.price}`, buy.x + 53, buy.y + buy.height / 2 + 9, 22, "white", "left", 950, "#1d5425", 3);
        ctx.restore();
      }
    });
    const contentBottom = SUPPLY_RECTS.pulse.y + SUPPLY_RECTS.pulse.height + pageOffset;
    this.label("金币购买 · 库存上限 9 · 不含广告", 248, contentBottom + 28, 15, "#8e87bd", "center", 700);
    if (drawNavigation) this.drawMainNavigation("supply");
  }

  private drawLeaderboard(drawNavigation = true): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    ctx.save();
    ctx.translate(0, this.mainPageHeaderOffset());
    this.drawAtlasCell(this.art.navigationFive?.icons, 1, ART_ATLASES.navigationFive, { x: 34, y: 34, width: 68, height: 68 });
    this.label("排行榜", 118, 78, 38, "#fff4c7", "left", 1000, "#4f218f", 6);
    this.label("按真实本机通关数据统计", 119, 108, 16, "#9beeff", "left", 800, "#25145d", 2);
    ctx.restore();

    this.drawChromePanel(54, 138, 388, 118, 34);
    this.drawAtlasCell(this.art.navigationFive?.icons, 1, ART_ATLASES.navigationFive, { x: 207, y: 132, width: 82, height: 82 });
    this.label(`${this.save.rewardedLevels.length}`, 130, 190, 31, "#7deeff", "center", 1000, "#173779", 4);
    this.label("已通关", 130, 224, 16, "#d6d0ff", "center", 800);
    this.label(`${this.totalStars()}`, 366, 190, 31, "#ffe667", "center", 1000, "#7c3f13", 4);
    this.label("累计星星", 366, 224, 16, "#d6d0ff", "center", 800);

    const modes: Array<{ mode: LeaderboardMode; rect: Rect; label: string }> = [
      { mode: "chapters", rect: BUTTONS.leaderboardChapters, label: "章节星级" },
      { mode: "efficiency", rect: BUTTONS.leaderboardEfficiency, label: "关卡效率" },
    ];
    modes.forEach(({ mode, rect, label }) => {
      const active = this.leaderboardMode === mode;
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.7;
      this.drawButtonChrome(rect, active ? 2 : 1, false);
      ctx.restore();
      this.label(label, rect.x + rect.width / 2, rect.y + 35, 19, active ? "#fff4a7" : "#e2ddff", "center", 950, "#291461", 3);
    });

    if (this.leaderboardMode === "chapters") {
      const view = paginateLeaderboard(this.chapterLeaderboard(), this.leaderboardPages.chapters);
      view.entries.forEach((entry, index) => {
        const y = 350 + index * 105;
        const rank = view.firstRank + index;
        this.drawChromePanel(42, y, 412, 88, 30);
        this.drawButtonChrome({ x: 55, y: y + 18, width: 52, height: 52 }, rank <= 3 ? 2 : 1, false);
        this.label(`${rank}`, 81, y + 52, 23, rank <= 3 ? "#fff2a3" : "#e1dcff", "center", 1000, "#331662", 3);
        this.label(`第 ${entry.chapter} 章`, 127, y + 37, 23, "#fff4b8", "left", 950, "#3d1a75", 3);
        this.label(`${entry.cleared}/${entry.total} 关`, 127, y + 67, 16, "#bdb6ec", "left", 750);
        this.drawSystemIcon(1, 350, y + 43, 29);
        this.label(`${entry.stars}/${entry.total * 3}`, 374, y + 51, 21, "#ffe76b", "left", 950, "#6d3513", 3);
      });
      this.drawLeaderboardPager(view, safe.bottom);
    } else {
      const view = paginateLeaderboard(this.efficiencyLeaderboard(), this.leaderboardPages.efficiency);
      if (!view.totalEntries) {
        this.drawChromePanel(74, 420, 348, 180, 38);
        this.drawAtlasCell(this.art.navigationFive?.icons, 1, ART_ATLASES.navigationFive, { x: 203, y: 430, width: 90, height: 90 });
        this.label("完成关卡后生成效率榜", 248, 552, 21, "#fff2a8", "center", 900, "#3d1a75", 3);
        this.label("仅记录未使用火箭或脉冲的最佳步数", 248, 582, 15, "#bdb6ec", "center", 700);
      } else {
        view.entries.forEach((entry, index) => {
          const y = 350 + index * 105;
          const rank = view.firstRank + index;
          this.drawChromePanel(42, y, 412, 88, 30);
          this.drawButtonChrome({ x: 55, y: y + 18, width: 52, height: 52 }, rank <= 3 ? 2 : 1, false);
          this.label(`${rank}`, 81, y + 52, 23, rank <= 3 ? "#fff2a3" : "#e1dcff", "center", 1000, "#331662", 3);
          this.label(`Lv ${entry.level}`, 127, y + 40, 23, "#fff4b8", "left", 950, "#3d1a75", 3);
          this.label(`三星目标 ${entry.par} 步`, 127, y + 68, 15, "#bdb6ec", "left", 750);
          this.label(`${entry.moves} 步`, 405, y + 52, 22, entry.delta <= 0 ? "#76f2b3" : "#ffe76b", "right", 950, "#2e185f", 3);
        });
      }
      this.drawLeaderboardPager(view, safe.bottom);
    }
    if (drawNavigation) this.drawMainNavigation("leaderboard");
  }

  private drawLeaderboardPager(
    view: Pick<LeaderboardPage<unknown>, "page" | "pageCount" | "totalEntries" | "canGoBack" | "canGoForward">,
    safeBottom: number,
  ): void {
    const prevRect = this.offsetRect(BUTTONS.leaderboardPrev, 0, -safeBottom);
    const nextRect = this.offsetRect(BUTTONS.leaderboardNext, 0, -safeBottom);
    this.ctx.save();
    this.ctx.globalAlpha = view.canGoBack ? 1 : 0.42;
    this.drawButtonChrome(prevRect, 1, false);
    this.label("‹ 上一页", prevRect.x + prevRect.width / 2, prevRect.y + 33, 18, "#fff", "center", 900, "#261562", 3);
    this.ctx.restore();
    this.ctx.save();
    this.ctx.globalAlpha = view.canGoForward ? 1 : 0.42;
    this.drawButtonChrome(nextRect, 1, false);
    this.label("下一页 ›", nextRect.x + nextRect.width / 2, nextRect.y + 33, 18, "#fff", "center", 900, "#261562", 3);
    this.ctx.restore();
    const summary = view.totalEntries
      ? `${view.page + 1}/${view.pageCount} · 共 ${view.totalEntries} 条`
      : "暂无纪录";
    this.label(summary, 248, prevRect.y + 33, 15, "#aaa3e9", "center", 750);
  }

  private drawSettings(): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    ctx.save();
    ctx.translate(0, safe.top);
    this.drawRoundIcon(BUTTONS.menuBack, "‹", "#5a55e8");
    this.label("设置", 248, 76, 38, "#fff4c7", "center", 1000, "#4f218f", 6);
    this.drawPill(104, 126, 288, 46, "rgba(23,16,68,.94)", "#796ae1", 22);
    this.label("进入关卡前即可调整", 248, 156, 18, "#ded8ff", "center", 800);

    const rows: Array<{ kind: SettingKind; title: string; detail: string; color: string }> = [
      { kind: "sound", title: "声音", detail: "按钮、移动与通关音效", color: "#57d9ff" },
      { kind: "haptic", title: "触觉", detail: "拖拽与机关轻震反馈", color: "#69ef8d" },
      { kind: "reducedMotion", title: "简化动效", detail: "减少摇晃、粒子与循环动画", color: "#c28bff" },
    ];
    rows.forEach(({ kind, title, detail, color }) => {
      const rect = SETTINGS_RECTS[kind];
      ctx.save();
      this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, 40);
      ctx.restore();
      this.drawSettingIcon(kind, rect.x + 58, rect.y + rect.height / 2, color);
      this.label(title, rect.x + 112, rect.y + 59, 27, "#fff3ae", "left", 950, "#4d1d7a", 4);
      this.label(detail, rect.x + 112, rect.y + 96, 17, "#d7d1ff", "left", 750);
      this.drawToggle(rect.x + rect.width - 65, rect.y + rect.height / 2, this.save[kind], () => {});
    });
    ctx.save();
    this.drawButtonChrome(BUTTONS.settingsUpdates, 1, false);
    this.drawOnboardingIcon(1, 126, 782, 46);
    this.label("版本更新 · 9月5日", 166, 788, 20, "#fff2b2", "left", 900, "#3d216f", 3);
    ctx.restore();
    this.drawButton(BUTTONS.settingsReset, "清除游戏进度", "#ec6073", "#9d1f45", 25);
    this.label("保留声音、触觉与简化动效偏好", 248, 951, 16, "#aaa4d4", "center", 750);
    ctx.restore();
  }

  private drawResetConfirm(): void {
    this.drawDim();
    this.drawModal(68, 252, 360, 660, "清除进度？");
    this.label("此操作无法撤销", 248, 392, 31, "#ffbdc6", "center", 1000, "#7e1832", 5);
    this.wrapText("关卡、星星、金币、道具、成就和每日记录将恢复初始状态。", 248, 477, 294, 34, 21, "#f3edff");
    this.drawPill(112, 610, 272, 46, "rgba(31,19,90,.9)", "#786ed0", 23);
    this.label("声音等设备偏好会保留", 248, 639, 18, "#b9f5ff", "center", 850);
    if (this.resetSaveFailed) {
      this.label("清档失败 · 请检查存储后重试", 248, 690, 17, "#ffb0bb", "center", 900, "#7e1832", 3);
    }
    this.drawButton(BUTTONS.modalPrimary, "确认清档", "#ec6073", "#9d1f45", 28);
    this.drawButton(BUTTONS.modalSecondary, "取消", "#7562c8", "#352878", 22);
  }

  private drawUpdateNotice(): void {
    this.drawDim();
    this.drawModal(68, 220, 360, 670, "版本更新");
    this.drawOnboardingIcon(1, 248, 365, 106);
    this.label(UPDATE_NOTICE.date, 248, 446, 22, "#8beaff", "center", 900, "#32206b", 3);
    UPDATE_NOTICE.items.forEach((item, index) => {
      const y = 510 + index * 62;
      this.drawSystemIcon(1, 118, y, 28);
      this.label(item, 145, y + 7, 18, "#f5f0ff", "left", 800);
    });
    this.drawButton(BUTTONS.modalPrimary, "知道了", "#43dc38", "#0a8122", 28);
  }

  private drawSettingIcon(kind: SettingKind, x: number, y: number, _color: string): void {
    const index = kind === "sound" ? 0 : kind === "haptic" ? 1 : 2;
    this.drawAtlasCell(
      this.art.settingsIcons,
      index,
      ART_ATLASES.settingsIcons,
      { x: x - 38, y: y - 38, width: 76, height: 76 },
    );
  }

  private totalStars(): number {
    return Object.values(this.save.bestStars).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  }

  private drawHud(): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    ctx.save();
    ctx.translate(0, safe.top);
    const snapshot = this.model.snapshot();
    const danger = snapshot.remainingSeconds <= 30 || this.model.level.difficulty === "super";
    this.drawPill(25, 44, 130, 48, "#16113f", "#40358f", 22);
    this.drawCoin(48, 68, 15);
    this.label(`${this.save.coins}`, 78, 70, 25, "#dbe5ff", "left", 850);
    this.drawPill(373, 44, 98, 48, "#16113f", "#40358f", 22);
    this.label(this.dailyMode ? "每日" : `Lv ${this.model.level.id}`, 422, 70, 22, this.dailyMode ? "#ffe263" : "#dbe5ff", "center", 900);
    this.drawRoundIcon(BUTTONS.undo, "↶", "#5a55e8", this.undoActions.length > 0);
    this.drawRoundIcon(BUTTONS.pause, "Ⅱ", danger ? "#e8384f" : "#5a55e8");
    this.drawPill(158, 111, 180, 58, danger ? "#6d122c" : "#13104a", danger ? "#ff435e" : "#2b6dff", 24);
    this.drawClockIcon(185, 140);
    this.label(this.formatTime(snapshot.remainingSeconds), 255, 143, 32, "#fff6db", "center", 950, "#090528", 4);
    const pace = `步数 ${snapshot.moves} · 三星 ${this.model.level.parMoves ?? Math.max(3, this.model.level.blocks.length + 2)}`;
    const paceText = this.dailyMode
      ? `每日挑战 · ${pace}`
      : this.model.level.difficulty === "normal" ? pace : `${this.difficultyText(this.model.level.difficulty)} · ${pace}`;
    this.label(paceText, 248, 190, 15, danger ? "#ff7f91" : "#c9bdff", "center", 850, "#171044", 3);
    if (this.hudFeedback) {
      const alpha = Math.min(1, (this.hudFeedback.duration - this.hudFeedback.age) / 0.16);
      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawPill(146, 211, 204, 40, "#171044", this.hudFeedback.color, 19);
      this.label(this.hudFeedback.text, 248, 237, 17, "#fff9e8", "center", 900, "#24104d", 3);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    const board = this.boardLayout();
    const snapshot = this.model.snapshot();
    const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
    const blocked = new Set(snapshot.blocked.map(([x, y]) => `${x},${y}`));
    const isFloor = (x: number, y: number): boolean => playable.has(`${x},${y}`) && !blocked.has(`${x},${y}`);
    const rim = buildBoardRimLayout(snapshot.playable, snapshot.blocked, snapshot.width, snapshot.height);
    const drawRimRail = (centerX: number, centerY: number, rotation: number): void => {
      if (!this.art.boardRimRail) return;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.drawImage(this.art.boardRimRail, board.cell * -0.55, board.cell * -0.29, board.cell * 1.1, board.cell * 0.46);
      ctx.restore();
    };
    const drawRimCorner = (x: number, y: number, rotation: number): void => {
      if (!this.art.boardRimCorner) return;
      const size = board.cell * 0.58;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(this.art.boardRimCorner, size * -0.5, size * -0.5, size, size);
      ctx.restore();
    };

    ctx.save();
    ctx.shadowColor = "rgba(3,1,20,.82)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 9;
    rim.rails.forEach((rail) => drawRimRail(
      board.innerX + rail.x * board.cell,
      board.innerY + rail.y * board.cell,
      rail.quarterTurns * Math.PI * 0.5,
    ));
    rim.convexCorners.forEach((corner) => drawRimCorner(
      board.innerX + corner.x * board.cell,
      board.innerY + corner.y * board.cell,
      corner.quarterTurns * Math.PI * 0.5,
    ));
    ctx.restore();
    for (let y = 0; y < snapshot.height; y += 1) {
      for (let x = 0; x < snapshot.width; x += 1) {
        if (!playable.has(`${x},${y}`) || blocked.has(`${x},${y}`)) continue;
        ctx.drawImage(this.art.emptyCell!, board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
      }
    }

    snapshot.conveyors.forEach((conveyor) => this.drawProgressionDevice("conveyor", conveyor.x, conveyor.y, conveyor.width, conveyor.height, board));
    snapshot.elevators.forEach((elevator) => {
      const targetX = elevator.direction > 0 ? elevator.toX : elevator.fromX;
      const targetY = elevator.direction > 0 ? elevator.toY : elevator.fromY;
      this.ctx.save();
      this.ctx.globalAlpha = 0.42;
      this.drawProgressionDevice("elevator", targetX, targetY, elevator.width, elevator.height, board);
      this.ctx.restore();
      this.drawProgressionDevice("elevator", elevator.x, elevator.y, elevator.width, elevator.height, board);
    });
    const strategyNudge = this.strategyNudgeGuideGeometry(board);
    snapshot.blocks.forEach((block) => {
      if (block.shutterId) {
        const shutter = snapshot.shutters.find((item) => item.id === block.shutterId);
        if (shutter && shutter.count > 0) return;
      }
      const visualBlock = this.mechanicVisualBlock(block);
      this.drawBlock(
        visualBlock,
        board,
        block.id === this.selectedId || block.id === this.dragVisual?.blockId,
        block.id === strategyNudge?.blockId,
      );
    });
    const adaptiveBlocker = strategyNudge?.reason === "blocker"
      ? snapshot.blocks.find((block) => block.id === strategyNudge.blockId)
      : undefined;
    if (adaptiveBlocker) this.drawBlockerFocus(adaptiveBlocker, board, true);
    const strategyFocusBlock = this.strategyFocusBlock();
    if (strategyFocusBlock) this.drawStrategyFocus(strategyFocusBlock, board);
    const focusedBlock = this.blockerFocusBlockId
      ? snapshot.blocks.find((block) => block.id === this.blockerFocusBlockId)
      : undefined;
    if (focusedBlock) this.drawBlockerFocus(focusedBlock, board);
    const selectedBlock = this.selectedId ? snapshot.blocks.find((block) => block.id === this.selectedId) : undefined;
    const gateReadinessById = gateReadinessMap(snapshot.gates, snapshot.blocks, snapshot.shutters);
    this.exitGhosts.forEach((ghost) => this.drawExitGhost(ghost, board));
    this.drawExitPulses(board);
    snapshot.gates.forEach((gate) => this.drawGate(
      gate.side,
      gate.offset,
      gate.size,
      gate.color,
      gate.frozen,
      gateReadinessById.get(gate.id) ?? "latent",
      board,
      gate.star,
      gateIsAvailableTarget(selectedBlock, gate),
    ));
    snapshot.shutters.forEach((shutter) => {
      if (shutter.count <= 0) return;
      if (shutter.skin === "generator") this.drawGenerator(shutter.x, shutter.y, shutter.width, shutter.height, shutter.count, board);
      else this.drawShutter(shutter.x, shutter.y, shutter.width, shutter.height, shutter.count, board);
    });

    if (this.shouldShowBasicTutorial()) {
      this.drawTutorialHand(board);
      this.label("拖动方块，送进同色同图形出口", 248, board.y + board.height + 54, 18, "#fff4b7", "center", 850, "#25135e", 4);
    } else if (strategyNudge) {
      this.drawGuideHand(strategyNudge, 76);
      const y = Math.max(252, board.y - 58);
      this.drawPill(93, y, 310, 42, "#171044", "#72f6ff", 18);
      this.label(
        strategyNudge.reason === "followup"
          ? "再挪一步，打开消除通路"
          : "卡住了？先挪开高亮方块",
        248,
        y + 22,
        17,
        "#fff4b7",
        "center",
        900,
        "#25135e",
        3,
      );
    } else if (strategyFocusBlock) {
      const y = Math.max(252, board.y - 58);
      this.drawPill(102, y, 292, 42, "#171044", "#72f6ff", 18);
      this.label(
        "卡住了？先观察发光方块",
        248,
        y + 22,
        17,
        "#fff4b7",
        "center",
        900,
        "#25135e",
        3,
      );
    }
  }

  private drawGate(
    side: Side,
    offset: number,
    size: number,
    color: BlockColor,
    frozen: number,
    readiness: GateReadiness,
    board: BoardLayout,
    star = false,
    focused = false,
  ): void {
    const ctx = this.ctx;
    const availability = gateReadinessVisual(readiness);
    const thickness = 22;
    let x = board.innerX + offset * board.cell;
    let y = board.innerY - thickness;
    let width = size * board.cell;
    let height = thickness + 5;
    if (side === "bottom") y = board.innerY + board.innerHeight - 5;
    if (side === "left" || side === "right") {
      x = side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth - 5;
      y = board.innerY + offset * board.cell;
      width = thickness + 5;
      height = size * board.cell;
    }
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const art = this.art.gates?.[color];
    if (art) {
      const horizontal = side === "top" || side === "bottom";
      const drawWidth = horizontal ? width : height;
      const drawHeight = horizontal ? height : width;
      const angle = side === "top" ? 0 : side === "bottom" ? Math.PI : side === "left" ? -Math.PI / 2 : Math.PI / 2;
      if (focused) {
        const wave = this.save.reducedMotion ? 0.5 : (Math.sin(this.elapsed * 5.4) + 1) * 0.5;
        const expandX = 1.05 + wave * 0.035;
        const expandY = 1.2 + wave * 0.16;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.globalAlpha = this.save.reducedMotion ? 0.34 : 0.28 + wave * 0.24;
        ctx.shadowColor = COLOR_STYLE[color].light;
        ctx.shadowBlur = this.save.reducedMotion ? 9 : 13 + wave * 7;
        ctx.drawImage(art, -drawWidth * expandX / 2, -drawHeight * expandY / 2, drawWidth * expandX, drawHeight * expandY);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.globalAlpha = availability.baseAlpha;
      ctx.shadowColor = frozen > 0 ? "rgba(121,241,255,.46)" : "rgba(8,2,34,.68)";
      ctx.shadowBlur = availability.shadowBlur;
      ctx.shadowOffsetY = frozen > 0 ? 0 : 2;
      ctx.drawImage(art, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }
    if (frozen > 0) {
      this.drawIceSurface(x - 2, y - 2, width + 4, height + 4, availability.overlayAlpha);
      this.label(`${frozen}`, centerX, centerY + 7, 23, "#633545", "center", 1000, "white", 3);
    }
    if (star) this.drawStarMark(centerX, centerY, Math.min(30, Math.max(18, thickness * 1.12)));
  }

  private drawExitPulses(board: BoardLayout): void {
    const ctx = this.ctx;
    const thickness = 22;
    for (const pulse of this.exitPulses) {
      const progress = Math.min(1, pulse.age / pulse.duration);
      const eased = 1 - (1 - progress) ** 3;
      const alpha = Math.sin(progress * Math.PI) * (this.save.reducedMotion ? 0.42 : 0.7);
      if (alpha <= 0) continue;
      let x = board.innerX + pulse.offset * board.cell;
      let y = board.innerY - thickness;
      let width = pulse.size * board.cell;
      let height = thickness + 5;
      if (pulse.side === "bottom") y = board.innerY + board.innerHeight - 5;
      if (pulse.side === "left" || pulse.side === "right") {
        x = pulse.side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth - 5;
        y = board.innerY + pulse.offset * board.cell;
        width = thickness + 5;
        height = pulse.size * board.cell;
      }
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const horizontal = pulse.side === "top" || pulse.side === "bottom";
      const drawWidth = horizontal ? width : height;
      const drawHeight = horizontal ? height : width;
      const angle = pulse.side === "top" ? 0 : pulse.side === "bottom" ? Math.PI : pulse.side === "left" ? -Math.PI / 2 : Math.PI / 2;
      const [outX, outY] = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[pulse.side];
      const art = this.art.gates?.[pulse.color];
      if (!art) continue;
      const trail = this.art.exitSuctionTrail;
      if (trail) {
        const trailSize = board.cell * (this.save.reducedMotion ? 2.2 : 3 + eased * 0.25);
        const trailAngle = pulse.side === "right" ? 0 : pulse.side === "bottom" ? Math.PI / 2 : pulse.side === "left" ? Math.PI : -Math.PI / 2;
        const trailAlpha = Math.sin(progress * Math.PI) * (this.save.reducedMotion ? 0.3 : 0.82);
        ctx.save();
        ctx.globalAlpha = trailAlpha;
        ctx.translate(
          centerX - outX * trailSize * 0.33 + outX * board.cell * eased * 0.08,
          centerY - outY * trailSize * 0.33 + outY * board.cell * eased * 0.08,
        );
        ctx.rotate(trailAngle);
        ctx.shadowColor = "rgba(125,235,255,.92)";
        ctx.shadowBlur = this.save.reducedMotion ? 5 : 12;
        ctx.drawImage(trail, -trailSize / 2, -trailSize / 2, trailSize, trailSize);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(centerX + outX * board.cell * eased * 0.2, centerY + outY * board.cell * eased * 0.2);
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(255,255,255,.9)";
      ctx.shadowBlur = this.save.reducedMotion ? 6 : 14;
      ctx.drawImage(
        art,
        -drawWidth * (1 + eased * 0.14) / 2,
        -drawHeight * (1 + eased * 0.9) / 2,
        drawWidth * (1 + eased * 0.14),
        drawHeight * (1 + eased * 0.9),
      );
      ctx.restore();
    }
  }

  private drawBlock(block: BlockState, board: BoardLayout, selected: boolean, hinted = false): void {
    const ctx = this.ctx;
    const availability = blockAvailabilityVisual(block.frozen);
    const color = block.layers[0] ?? block.color;
    const cells = this.model.blockCells(block);
    const [badgeX, badgeY] = chooseBlockBadgeCell(cells);
    const blockedFeedback = block.id === this.blockedBlockId && this.blockedFeedbackTime > 0;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const centerX = board.innerX + (minX + maxX + 1) * board.cell / 2;
    const centerY = board.innerY + (minY + maxY + 1) * board.cell / 2;
    const visual = block.id === this.dragVisual?.blockId ? this.dragVisual : undefined;
    const settleProgress = visual?.settling && visual.settleDuration > 0
      ? easeOutCubic(visual.settleElapsed / visual.settleDuration)
      : 0;
    ctx.save();
    if (visual) ctx.translate((visual.x - block.x) * board.cell, (visual.y - block.y) * board.cell);
    if (selected) ctx.translate(0, (this.save.reducedMotion ? -4 : -6) * (1 - settleProgress));
    if (selected && !this.save.reducedMotion) {
      const settle = Math.max(0, Math.min(1, 1 - this.grabFeedbackTime / 0.12));
      const heldScale = 0.985 + (1 - (1 - settle) ** 3) * 0.035;
      const scale = visual?.settling ? 1 + (heldScale - 1) * (1 - settleProgress) : heldScale;
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
    }
    if (blockedFeedback) {
      const phase = 1 - this.blockedFeedbackTime / BLOCKED_FEEDBACK_DURATION;
      const scale = 1 - Math.sin(phase * Math.PI) * 0.055;
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
    }
    const nudgeFeedback = hinted && !blockedFeedback && !selected;
    const feedbackArt = blockedFeedback ? this.art.blockBlockedHalo : selected || nudgeFeedback ? this.art.blockGrabHalo : undefined;
    if (feedbackArt) {
      const feedbackSize = board.cell * 1.34;
      ctx.save();
      ctx.globalAlpha = blockedFeedback ? 0.98 : nudgeFeedback
        ? this.save.reducedMotion ? 0.62 : 0.52 + (Math.sin(this.elapsed * 4.2) + 1) * 0.14
        : 0.9;
      for (const [x, y] of cells) {
        const cellCenterX = board.innerX + (x + 0.5) * board.cell;
        const cellCenterY = board.innerY + (y + 0.5) * board.cell;
        ctx.drawImage(
          feedbackArt,
          cellCenterX - feedbackSize / 2,
          cellCenterY - feedbackSize / 2,
          feedbackSize,
          feedbackSize,
        );
      }
      ctx.restore();
    }
    const outerArt = this.art.blockCells?.[color];
    const plainOuterArt = this.art.plainBlockCells?.[color] ?? outerArt;
    const layered = block.layers.length > 1;
    ctx.save();
    ctx.globalAlpha *= availability.baseAlpha;
    if (outerArt) {
      ctx.save();
      ctx.shadowColor = blockedFeedback ? "rgba(255,230,107,.96)" : selected ? "rgba(255,255,255,.88)" : "rgba(2,1,15,.72)";
      ctx.shadowBlur = blockedFeedback ? 14 : selected ? 12 : 7;
      ctx.shadowOffsetY = selected ? 0 : 4;
      for (const [x, y] of cells) {
        const px = board.innerX + x * board.cell + 1;
        const py = board.innerY + y * board.cell + 1;
        const size = board.cell - 2;
        ctx.drawImage(x === badgeX && y === badgeY ? outerArt : plainOuterArt ?? outerArt, px, py, size, size);
      }
      ctx.restore();
    }

    const connectorArt = this.art.blockConnectors?.[color];
    if (connectorArt) {
      const drawConnector = (centerX: number, centerY: number, rotation: number): void => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.drawImage(connectorArt, board.cell * -0.43, board.cell * -0.18, board.cell * 0.86, board.cell * 0.36);
        ctx.restore();
      };
      ctx.save();
      ctx.shadowColor = blockedFeedback ? "rgba(255,230,107,.9)" : selected ? "rgba(255,255,255,.78)" : "rgba(2,1,15,.56)";
      ctx.shadowBlur = blockedFeedback ? 10 : selected ? 8 : 4;
      buildBlockConnectorLayout(cells).forEach((connector) => drawConnector(
        board.innerX + connector.x * board.cell,
        board.innerY + connector.y * board.cell,
        connector.quarterTurns * Math.PI * 0.5,
      ));
      ctx.restore();
    }

    if (layered) {
      const previews = block.layers.slice(1, 3);
      const badgeSize = Math.max(17, Math.min(30, board.cell * 0.5));
      const baseX = board.innerX + (maxX + 1) * board.cell - badgeSize - board.cell * 0.08;
      const baseY = board.innerY + (maxY + 1) * board.cell - badgeSize - board.cell * 0.08;
      ctx.save();
      ctx.shadowColor = "rgba(12,4,38,.82)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      for (let index = previews.length - 1; index >= 0; index -= 1) {
        const color = previews[index];
        const depthScale = index === 0 ? 1 : 0.88;
        const size = badgeSize * depthScale;
        const offset = index * badgeSize * 0.24;
        this.drawAtlasCell(
          this.art.layerPreviewBadges,
          LAYER_BADGE_INDEX[color],
          ART_ATLASES.layerPreviewBadges,
          { x: baseX - offset, y: baseY - offset, width: size, height: size },
        );
      }
      ctx.restore();
    }
    ctx.restore();

    if (block.frozen > 0) {
      const x = board.innerX + minX * board.cell + 1;
      const y = board.innerY + minY * board.cell + 1;
      const width = (maxX - minX + 1) * board.cell - 2;
      const height = (maxY - minY + 1) * board.cell - 2;
      this.drawIceSurface(x, y, width, height, availability.overlayAlpha);
      this.label(`${block.frozen}`, x + width / 2, y + height / 2 + 8, 28, "white", "center", 1000, "#6a4251", 4);
    }
    if (block.star) {
      this.drawStarMark(board.innerX + (badgeX + 0.5) * board.cell, board.innerY + (badgeY + 0.5) * board.cell, board.cell * 0.62);
    }
    ctx.restore();
  }

  private drawBlockerFocus(block: BlockState, board: BoardLayout, persistent = false): void {
    const art = this.art.blockerFocusCorners;
    if (!art || (!persistent && this.blockerFocusTime <= 0) || block.frozen > 0) return;
    const cells = this.model.blockCells(block);
    if (!cells.length) return;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const padding = board.cell * 0.13;
    const left = board.innerX + minX * board.cell - padding;
    const top = board.innerY + minY * board.cell - padding;
    const right = board.innerX + (maxX + 1) * board.cell + padding;
    const bottom = board.innerY + (maxY + 1) * board.cell + padding;
    const cornerSize = board.cell * 0.72;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const duration = this.save.reducedMotion ? BLOCKER_FOCUS_REDUCED_DURATION : BLOCKER_FOCUS_DURATION;
    const remaining = persistent ? 1 : Math.max(0, Math.min(1, this.blockerFocusTime / duration));
    const fade = persistent ? 1 : Math.min(1, this.blockerFocusTime / 0.16);
    const pulsePhase = persistent ? this.elapsed * Math.PI * 1.6 : (1 - remaining) * Math.PI * 3;
    const pulse = this.save.reducedMotion ? 1 : 1 + Math.sin(pulsePhase) * 0.035;
    const corners = [
      { sx: 0, sy: 0, dx: left, dy: top },
      { sx: 128, sy: 0, dx: right - cornerSize, dy: top },
      { sx: 0, sy: 128, dx: left, dy: bottom - cornerSize },
      { sx: 128, sy: 128, dx: right - cornerSize, dy: bottom - cornerSize },
    ] as const;
    this.ctx.save();
    this.ctx.globalAlpha = fade * (this.save.reducedMotion ? 0.76 : persistent ? 0.86 : 0.82);
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(pulse, pulse);
    this.ctx.translate(-centerX, -centerY);
    for (const corner of corners) {
      this.ctx.drawImage(
        art,
        corner.sx,
        corner.sy,
        128,
        128,
        corner.dx,
        corner.dy,
        cornerSize,
        cornerSize,
      );
    }
    this.ctx.restore();
  }

  private drawStrategyFocus(block: BlockState, board: BoardLayout): void {
    const art = this.art.strategyFocusCorners;
    if (!art || block.frozen > 0) return;
    const cells = this.model.blockCells(block);
    if (!cells.length) return;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const padding = board.cell * 0.16;
    const left = board.innerX + minX * board.cell - padding;
    const top = board.innerY + minY * board.cell - padding;
    const right = board.innerX + (maxX + 1) * board.cell + padding;
    const bottom = board.innerY + (maxY + 1) * board.cell + padding;
    const cornerSize = board.cell * 0.82;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const pulse = this.save.reducedMotion ? 1 : 1 + Math.sin(this.elapsed * Math.PI * 1.6) * 0.035;
    const corners = [
      { sx: 0, sy: 0, dx: left, dy: top },
      { sx: 128, sy: 0, dx: right - cornerSize, dy: top },
      { sx: 0, sy: 128, dx: left, dy: bottom - cornerSize },
      { sx: 128, sy: 128, dx: right - cornerSize, dy: bottom - cornerSize },
    ] as const;
    this.ctx.save();
    this.ctx.globalAlpha = this.save.reducedMotion ? 0.74 : 0.82;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(pulse, pulse);
    this.ctx.translate(-centerX, -centerY);
    for (const corner of corners) {
      this.ctx.drawImage(art, corner.sx, corner.sy, 128, 128, corner.dx, corner.dy, cornerSize, cornerSize);
    }
    this.ctx.restore();
  }

  private drawExitGhost(ghost: ExitGhost, board: BoardLayout): void {
    const ctx = this.ctx;
    const progress = Math.min(1, ghost.age / ghost.duration);
    const eased = 1 - (1 - progress) ** 3;
    const distance = board.cell * 1.55 * eased;
    const vector: Record<Side, readonly [number, number]> = {
      top: [0, -distance], right: [distance, 0], bottom: [0, distance], left: [-distance, 0],
    };
    const alpha = progress < 0.24 ? 1 : Math.max(0, 1 - (progress - 0.24) / 0.62);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(vector[ghost.side][0], vector[ghost.side][1]);
    this.drawBlock(ghost.block, board, false);
    ctx.restore();
  }

  private drawShutter(x: number, y: number, width: number, height: number, count: number, board: BoardLayout): void {
    const px = board.innerX + x * board.cell + 3;
    const py = board.innerY + y * board.cell + 3;
    const w = width * board.cell - 6;
    const h = height * board.cell - 6;
    this.drawShutterSurface(px, py, w, h);
    this.drawPill(px + w / 2 - 28, py + h / 2 - 25, 56, 50, "#4a298f", "#ffad2e", 15);
    this.label(`${count}`, px + w / 2, py + h / 2 + 8, 28, "#fff0c6", "center", 1000);
  }

  private drawGenerator(x: number, y: number, width: number, height: number, count: number, board: BoardLayout): void {
    const px = board.innerX + x * board.cell;
    const py = board.innerY + y * board.cell;
    const w = width * board.cell;
    const h = height * board.cell;
    this.drawAtlasCell(this.art.progressionMechanics, 0, ART_ATLASES.progressionMechanics, { x: px, y: py, width: w, height: h });
    this.label(`${count}`, px + w / 2, py + h * 0.53, Math.max(20, Math.min(32, board.cell * 0.7)), "#fff4cf", "center", 1000, "#371061", 4);
  }

  private drawProgressionDevice(kind: "elevator" | "conveyor", x: number, y: number, width: number, height: number, board: BoardLayout): void {
    const image = this.art.progressionMechanics;
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const cellWidth = imageWidth / 2;
    const cellHeight = imageHeight / 2;
    const pad = board.cell * 0.18;
    const px = board.innerX + x * board.cell - pad;
    const py = board.innerY + y * board.cell - pad;
    const drawWidth = width * board.cell + pad * 2;
    const drawHeight = height * board.cell + pad * 2;
    // Crop the transparent margins inside the ImageGen atlas cells so the
    // machine rails remain visible around a carried block at small viewport sizes.
    if (kind === "elevator") {
      this.ctx.drawImage(
        image,
        cellWidth + cellWidth * 0.26,
        cellHeight * 0.02,
        cellWidth * 0.48,
        cellHeight * 0.96,
        px,
        py,
        drawWidth,
        drawHeight,
      );
      return;
    }
    this.ctx.drawImage(
      image,
      cellWidth * 0.04,
      cellHeight + cellHeight * 0.20,
      cellWidth * 0.92,
      cellHeight * 0.58,
      px,
      py,
      drawWidth,
      drawHeight,
    );
  }

  private drawStarMark(centerX: number, centerY: number, size: number): void {
    this.drawAtlasCell(this.art.progressionMechanics, 3, ART_ATLASES.progressionMechanics, {
      x: centerX - size / 2,
      y: centerY - size / 2,
      width: size,
      height: size,
    });
  }

  private drawIceSurface(x: number, y: number, width: number, height: number, alpha = 1): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(111,239,255,.78)";
    ctx.shadowBlur = 10;
    this.drawNineSlice(this.art.iceCover!, x, y, width, height, 150, Math.max(4, Math.min(width, height) * 0.44));
    ctx.restore();
  }

  private drawShutterSurface(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.68)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    this.drawNineSlice(this.art.shutter!, x, y, width, height, 112, Math.max(16, Math.min(width, height) * 0.2));
    ctx.restore();
  }

  private drawMechanicRelay(pulse: MechanicPulse): void {
    const art = this.art.mechanicRelayMote;
    if (this.save.reducedMotion || !art || pulse.sourceX == null || pulse.sourceY == null
      || pulse.delay <= 0 || pulse.age >= 0) return;
    const progress = Math.max(0, Math.min(1, 1 + pulse.age / pulse.delay));
    const eased = 1 - (1 - progress) ** 2;
    const x = pulse.sourceX + (pulse.x - pulse.sourceX) * eased;
    const y = pulse.sourceY + (pulse.y - pulse.sourceY) * eased;
    const size = Math.min(38, Math.max(24, Math.min(pulse.width, pulse.height) * 0.82));
    const alpha = Math.sin(progress * Math.PI) * 0.92;
    const angle = Math.atan2(pulse.y - pulse.sourceY, pulse.x - pulse.sourceX) + Math.PI / 4;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    this.ctx.drawImage(art, -size / 2, -size / 2, size, size);
    this.ctx.restore();
  }

  private mechanicPulseLabel(pulse: MechanicPulse): string {
    if (pulse.kind === "ice") return "已解冻";
    if (pulse.kind === "layer") return "外层剥离";
    if (pulse.kind === "conveyor") return "传送推进";
    return pulse.shutterSkin === "generator" ? "载荷放出" : "卷帘开启";
  }

  private drawMechanicPulses(): void {
    const ctx = this.ctx;
    const spriteIndex: Partial<Record<MechanicEventKind, number>> = { ice: 0, shutter: 1, layer: 2 };
    const ringColor: Record<MechanicEventKind, string> = {
      ice: "#9bfbff", shutter: "#ffc84d", layer: "#d77cff", conveyor: "#8af7ff",
    };
    const labelPriority = (pulse: MechanicPulse): number => (
      pulse.kind === "conveyor" ? 4
        : pulse.kind === "shutter" && pulse.shutterSkin === "generator" ? 3
          : pulse.kind === "shutter" ? 2
            : pulse.kind === "layer" ? 1
              : 0
    );
    const labelPulse = this.mechanicPulses
      .filter((pulse) => pulse.unlocked && pulse.age > 0 && pulse.age / pulse.duration > 0.08 && pulse.age / pulse.duration < 0.88)
      .sort((left, right) => labelPriority(right) - labelPriority(left))[0];
    for (const pulse of this.mechanicPulses) {
      if (pulse.age <= 0) {
        this.drawMechanicRelay(pulse);
        continue;
      }
      const progress = Math.min(1, pulse.age / pulse.duration);
      const fadeIn = Math.min(1, progress / 0.12);
      const fadeOut = Math.max(0, 1 - Math.max(0, progress - 0.48) / 0.52);
      const alpha = fadeIn * fadeOut * (pulse.unlocked ? 1 : 0.62);
      const eased = 1 - (1 - progress) ** 3;
      const scale = this.save.reducedMotion ? 1 : 0.68 + eased * 0.5;
      const sizeMultiplier = pulse.target === "gate" ? 0.6 : pulse.target === "shutter" ? 0.52 : pulse.kind === "layer" ? 0.72 : 0.86;
      const baseSize = Math.min(142, Math.max(68, Math.max(pulse.width, pulse.height) * sizeMultiplier));

      ctx.save();
      ctx.globalAlpha = alpha;
      const pulseColor = pulse.kind === "shutter" && pulse.shutterSkin === "generator"
        ? "#7df6ff"
        : ringColor[pulse.kind];
      ctx.shadowColor = pulseColor;
      ctx.shadowBlur = pulse.unlocked ? 18 : 9;

      const art = this.art.mechanics;
      const suppressLockedGateSprite = pulse.kind === "ice" && pulse.target === "gate" && !pulse.unlocked;
      const progressionIndex = pulse.kind === "conveyor"
        ? 2
        : pulse.kind === "shutter" && pulse.shutterSkin === "generator" ? 0 : undefined;
      if (progressionIndex != null) {
        const drawSize = baseSize * scale;
        this.drawAtlasCell(this.art.progressionMechanics, progressionIndex, ART_ATLASES.progressionMechanics, {
          x: pulse.x - drawSize / 2,
          y: pulse.y - drawSize / 2,
          width: drawSize,
          height: drawSize,
        });
      } else if (!suppressLockedGateSprite && spriteIndex[pulse.kind] != null
        && art && (art.naturalWidth || art.width) > 0 && (art.naturalHeight || art.height) > 0) {
        const imageWidth = art.naturalWidth || art.width;
        const imageHeight = art.naturalHeight || art.height;
        const sourceWidth = imageWidth / 3;
        const drawHeight = baseSize * (pulse.kind === "layer" ? 1.34 : 1.46) * scale;
        const drawWidth = drawHeight * sourceWidth / imageHeight;
        const sourceX = spriteIndex[pulse.kind]! * sourceWidth;
        const destinationX = pulse.x - drawWidth / 2;
        const destinationY = pulse.y - drawHeight / 2;
        if (pulse.kind === "layer") {
          const edge = 0.31;
          const middle = 1 - edge * 2;
          const drawSlice = (nx: number, ny: number, nw: number, nh: number): void => {
            ctx.drawImage(
              art,
              sourceX + nx * sourceWidth,
              ny * imageHeight,
              nw * sourceWidth,
              nh * imageHeight,
              destinationX + nx * drawWidth,
              destinationY + ny * drawHeight,
              nw * drawWidth,
              nh * drawHeight,
            );
          };
          drawSlice(0, 0, 1, edge);
          drawSlice(0, 1 - edge, 1, edge);
          drawSlice(0, edge, edge, middle);
          drawSlice(1 - edge, edge, edge, middle);
        } else {
          ctx.drawImage(art, sourceX, 0, sourceWidth, imageHeight, destinationX, destinationY, drawWidth, drawHeight);
        }
      }
      ctx.restore();

      if (pulse === labelPulse) {
        const text = this.mechanicPulseLabel(pulse);
        const width = pulse.kind === "layer" ? 112 : pulse.kind === "shutter" || pulse.kind === "conveyor" ? 114 : 96;
        const labelX = Math.max(width / 2 + 8, Math.min(LOGICAL_WIDTH - width / 2 - 8, pulse.x));
        const labelY = Math.max(264, pulse.y - Math.max(58, pulse.height / 2 + 28));
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha * 1.35);
        this.drawPill(labelX - width / 2, labelY - 21, width, 42, "#171044", pulseColor, 20);
        this.label(text, labelX, labelY + 1, 19, "#fff9e8", "center", 900, "#21104c", 3);
        ctx.restore();
      }
    }
  }

  private drawExitFailure(): void {
    const feedback = this.exitFailure;
    if (!feedback) return;
    const ctx = this.ctx;
    const progress = Math.min(1, feedback.age / feedback.duration);
    const alpha = Math.min(1, progress / 0.1) * Math.max(0, 1 - Math.max(0, progress - 0.5) / 0.5);
    const color = feedback.status === "frozen-gate" ? "#8af7ff" : feedback.status === "wrong-color" ? "#ff7784" : "#ffd05a";
    const centerX = feedback.x + feedback.width / 2;
    const chipWidth = feedback.text.length > 6 ? 148 : 132;
    const chipX = Math.max(chipWidth / 2 + 8, Math.min(LOGICAL_WIDTH - chipWidth / 2 - 8, centerX));
    const chipY = Math.max(264, feedback.y - 31);

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawPill(chipX - chipWidth / 2, chipY - 21, chipWidth, 42, "#171044", color, 20);
    this.label(feedback.text, chipX, chipY + 1, 18, "#fff9ea", "center", 900, "#24104d", 3);
    ctx.restore();
  }

  private drawBoosters(): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    ctx.save();
    ctx.translate(0, -safe.bottom);
    this.drawBooster(BUTTONS.time, 0, this.save.boosters.time, this.boosterTarget === "time", "time");
    this.drawBooster(BUTTONS.rocket, 1, this.save.boosters.rocket, this.boosterTarget === "rocket", "rocket");
    this.drawBooster(BUTTONS.pulse, 2, this.save.boosters.pulse, this.boosterTarget === "pulse", "pulse");
    const prompt = this.boosterFeedback ?? (this.boosterTarget === "rocket"
      ? { text: "点一个方块发射火箭", color: "#fff36b", age: 0, duration: 1 }
      : undefined);
    if (prompt) {
      const alpha = this.boosterFeedback ? Math.min(1, (prompt.duration - prompt.age) / 0.16) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawPill(126, 893, 244, 42, "#171044", prompt.color, 20);
      this.label(prompt.text, 248, 920, 18, "#fff9e8", "center", 900, "#2d1458", 3);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawBoosterUnlockToast(): void {
    const toast = this.boosterUnlockToast;
    const banner = this.art.boosterUnlockBanner;
    if (!toast || !banner) return;
    const item = SUPPLY_ITEMS[toast.kind];
    const rect = this.boosterUnlockToastRect();
    const intro = this.save.reducedMotion ? 1 : easeOutCubic(Math.min(1, toast.age / 0.22));
    const fadeOut = Math.max(0, (toast.age - (toast.duration - 0.55)) / 0.55);
    const alpha = Math.min(1, intro) * (1 - Math.min(1, fadeOut));
    const y = rect.y - (this.save.reducedMotion ? 0 : (1 - intro) * 18);
    const iconIndex = SUPPLY_ORDER.indexOf(toast.kind);
    const iconPulse = this.save.reducedMotion ? 1 : 1 + Math.sin(toast.age * 6.2) * 0.035;
    const iconSize = 78 * iconPulse;
    const iconCenterX = rect.x + 71;
    const iconCenterY = y + rect.height / 2 + 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(banner, rect.x, y, rect.width, rect.height);
    this.drawBoosterArtwork(iconIndex, iconCenterX - iconSize / 2, iconCenterY - iconSize / 2, iconSize, iconSize);
    this.label("新道具解锁", rect.x + 125, y + 34, 14, "#78efff", "left", 900, "#17205f", 2);
    this.label(item.title, rect.x + 125, y + 67, 23, "#fff06d", "left", 900, "#31116f", 3);
    this.label(item.effect, rect.x + 125, y + 96, 15, "#f7f5ff", "left", 800, "#171044", 2);
    this.ctx.restore();
  }

  private drawBoosterArtwork(iconIndex: number, x: number, y: number, width: number, height: number): boolean {
    return this.drawAtlasCell(this.art.boosters, iconIndex, ART_ATLASES.boosters, { x, y, width, height });
  }

  private drawBooster(rect: Rect, iconIndex: number, count: number, active: boolean, kind: Booster): void {
    const ctx = this.ctx;
    const unlocked = this.boosterUnlocked(kind);
    const enabled = unlocked && count > 0;
    active = active && enabled;
    ctx.save();
    ctx.shadowColor = active ? "#fff36b" : enabled ? "rgba(0,0,0,.6)" : "rgba(0,0,0,.35)";
    ctx.shadowBlur = active ? 16 : enabled ? 10 : 4;
    ctx.globalAlpha = unlocked ? enabled ? 1 : 0.42 : 0.3;
    this.drawButtonChrome(rect, enabled ? 0 : 1, false);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = unlocked ? enabled ? 1 : 0.34 : 0.22;
    this.drawBoosterArtwork(iconIndex, rect.x + 7, rect.y + 5, rect.width - 14, rect.height - 14);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = unlocked ? enabled ? 1 : 0.5 : 0.42;
    this.drawChromePanel(rect.x + rect.width - 23, rect.y + rect.height - 22, 34, 34, 12, false);
    ctx.restore();
    if (unlocked) {
      this.label(`${count}`, rect.x + rect.width - 6, rect.y + rect.height + 2, 19, enabled ? "white" : "#c5c0d3", "center", 900);
    } else {
      this.drawSystemIcon(11, rect.x + rect.width / 2, rect.y + rect.height / 2, 25, 0.88);
      this.label(`Lv${SUPPLY_ITEMS[kind].unlockLevel}`, rect.x + rect.width - 6, rect.y + rect.height - 1, 11, "#c5c0d3", "center", 900);
    }
  }

  private drawTutorialHand(board: BoardLayout): void {
    const guide = this.tutorialGuideGeometry(board);
    if (!guide || guide.points.length < 2) return;
    this.drawGuideHand(guide, 88);
  }

  private drawGuideHand(guide: TutorialGuideGeometry, size: number): void {
    const ctx = this.ctx;
    const motion = tutorialGuideMotion(this.elapsed, this.save.reducedMotion);
    const lengths = guide.points.slice(1).map((point, index) => Math.hypot(
      point.x - guide.points[index].x,
      point.y - guide.points[index].y,
    ));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    let remaining = totalLength * motion.progress;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) {
      remaining -= lengths[segment];
      segment += 1;
    }
    const from = guide.points[segment];
    const to = guide.points[segment + 1];
    const segmentProgress = lengths[segment] > 0 ? Math.min(1, remaining / lengths[segment]) : 0;
    const x = from.x + (to.x - from.x) * segmentProgress;
    const y = from.y + (to.y - from.y) * segmentProgress;
    const rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
    ctx.save();
    ctx.globalAlpha = motion.alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    this.drawOnboardingIcon(0, 0, 0, size);
    ctx.restore();
  }

  private shouldShowBasicTutorial(): boolean {
    return this.model.level.id === 1
      && !this.model.snapshot().started
      && this.screen === "playing"
      && !this.save.featureSeen.includes("basics");
  }

  private tutorialGuideGeometry(board: BoardLayout): TutorialGuideGeometry | undefined {
    const hint = this.model.level.onboardingHint;
    if (!hint?.path.length) return undefined;
    const block = this.model.getBlock(hint.blockId);
    if (!block?.shape.length) return undefined;
    const centerX = block.shape.reduce((sum, [x]) => sum + x + 0.5, 0) / block.shape.length;
    const centerY = block.shape.reduce((sum, [, y]) => sum + y + 0.5, 0) / block.shape.length;
    const origins: Point[] = [[block.x, block.y], ...hint.path];
    const points = origins.map(([x, y]) => ({
      x: board.innerX + (x + centerX) * board.cell,
      y: board.innerY + (y + centerY) * board.cell,
    }));
    return {
      blockId: block.id,
      origins,
      points,
      start: points[0],
      end: points[points.length - 1],
    };
  }

  private strategyNudgeGuideGeometry(board: BoardLayout): TutorialGuideGeometry | undefined {
    const rescue = this.strategyNudgeOrigins();
    if (!rescue) return undefined;
    const { block, origins } = rescue;
    const centerX = block.shape.reduce((sum, [x]) => sum + x + 0.5, 0) / block.shape.length;
    const centerY = block.shape.reduce((sum, [, y]) => sum + y + 0.5, 0) / block.shape.length;
    const points = origins.map(([x, y]) => ({
      x: board.innerX + (x + centerX) * board.cell,
      y: board.innerY + (y + centerY) * board.cell,
    }));
    return {
      blockId: block.id,
      origins,
      points,
      start: points[0],
      end: points[points.length - 1],
      reason: rescue.reason,
      focusBlockId: rescue.focusBlockId,
    };
  }

  private strategyNudgeOrigins(): {
    block: BlockState;
    origins: Point[];
    reason: "authored" | "blocker" | "followup";
    focusBlockId: string;
  } | undefined {
    if (this.screen !== "playing"
      || this.activePointer !== undefined
      || this.boosterTarget !== undefined
      || this.exitGhosts.length > 0
      || this.pendingCelebration > 0) return undefined;
    const followup = this.strategyFollowupAction;
    if (followup) {
      const block = this.model.getBlock(followup.blockId);
      if (!block || block.x !== followup.from[0] || block.y !== followup.from[1]) return undefined;
      return {
        block,
        origins: [followup.from, ...followup.path],
        reason: "followup",
        focusBlockId: followup.blockId,
      };
    }
    const hint = this.model.level.strategyNudge;
    if (!hint?.path.length
      || this.noClearMoveStreak < hint.afterMoves
      || this.strategyNudgeAcknowledged) return undefined;
    const rescue = adaptiveRescueAction(this.model, hint);
    if (!rescue) return undefined;
    const block = this.model.getBlock(rescue.blockId);
    if (!block) return undefined;
    return {
      block,
      origins: rescue.origins,
      reason: rescue.reason,
      focusBlockId: rescue.focusBlockId,
    };
  }

  private prepareStrategyFollowup(): void {
    const availableAt = this.strategyFollowupAvailableAt;
    if (availableAt == null
      || this.strategyFollowupDrags > 0
      || this.noClearMoveStreak < availableAt
      || this.model.snapshot().complete) return;
    const action = localBreakthroughAction(this.model, this.model.level.strategyFocus?.blockId);
    if (!action) {
      this.strategyFollowupAvailableAt = undefined;
      this.strategyFollowupAction = undefined;
      return;
    }
    const block = this.model.getBlock(action.blockId);
    if (!block) {
      this.strategyFollowupAvailableAt = undefined;
      return;
    }
    this.strategyFollowupAction = { ...action, from: [block.x, block.y] };
  }

  private strategyFocusBlock(): BlockState | undefined {
    const focus = this.model.level.strategyFocus;
    if (!focus
      || this.screen !== "playing"
      || this.noClearMoveStreak < focus.afterMoves
      || this.activePointer !== undefined
      || this.boosterTarget !== undefined
      || this.exitGhosts.length > 0
      || this.pendingCelebration > 0) return undefined;
    const block = this.model.getBlock(focus.blockId);
    if (!block || !this.model.isBlockActive(block)) return undefined;
    const nudge = this.model.level.strategyNudge;
    if (nudge && this.strategyNudgeAcknowledged) return undefined;
    if (nudge && this.noClearMoveStreak >= nudge.afterMoves && !this.strategyNudgeAcknowledged) {
      const target = nudge.path.at(-1);
      if ((target && block.x === target[0] && block.y === target[1]) || this.strategyNudgeOrigins()) return undefined;
    }
    return block;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.save();
      const lifeRatio = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = particle.fragmentColor ? Math.min(1, lifeRatio / 0.3) : lifeRatio;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      const drawSize = particle.size * 2.6;
      const fragmentArt = particle.fragmentColor ? this.art.blockCells?.[particle.fragmentColor] : undefined;
      if (fragmentArt) {
        const fragmentIndex = particle.fragmentIndex ?? 0;
        const sourceSize = 128;
        const sourceX = (fragmentIndex % 2) * sourceSize;
        const sourceY = Math.floor(fragmentIndex / 2) * sourceSize;
        ctx.scale(0.72, 1);
        ctx.drawImage(fragmentArt, sourceX, sourceY, sourceSize, sourceSize, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      } else {
        ctx.drawImage(this.art.particleSpark!, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      }
      ctx.restore();
    }
  }

  private drawPause(): void {
    this.drawDim();
    this.drawModal(86, 290, 324, 604, "暂停");
    this.label("声音", 180, 430, 21, "#fff", "center", 800);
    this.label("震动", 316, 430, 21, "#fff", "center", 800);
    this.drawToggle(180, 478, this.save.sound, () => { this.save.sound = !this.save.sound; this.persist(); });
    this.drawToggle(316, 478, this.save.haptic, () => { this.save.haptic = !this.save.haptic; this.persist(); });
    this.label("简化动效", 248, 575, 21, "#fff", "center", 800);
    this.drawToggle(248, 623, this.save.reducedMotion, () => { this.save.reducedMotion = !this.save.reducedMotion; this.persist(); });
    this.drawButton(BUTTONS.pauseResume, "继续游戏", "#42dc38", "#087c22", 29);
    this.drawButton(BUTTONS.pauseRestart, "重新开始", "#f19a2a", "#a94d16", 20);
    this.drawButton(BUTTONS.pauseHome, "返回主页", "#7562c8", "#352878", 20);
  }

  private drawToggle(x: number, y: number, enabled: boolean, _action: () => void): void {
    const image = this.art.toggles!;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const cellWidth = imageWidth / ART_ATLASES.toggles.columns;
    const cell = enabled ? 1 : 0;
    this.ctx.drawImage(
      image,
      cell * cellWidth + cellWidth * 0.05,
      imageHeight * 0.2,
      cellWidth * 0.9,
      imageHeight * 0.57,
      x - 44,
      y - 25,
      88,
      50,
    );
  }

  private drawFeature(): void {
    const intro = this.model.level.featureIntro;
    if (!intro) return;
    const visual = this.featureVisual();
    this.drawDim();
    this.drawModal(59, 212, 378, 650, intro.title);
    if (intro.kind === "shutter") this.drawShutterIcon(248, 450, visual.counter ?? 1);
    else if (intro.kind === "generator") this.drawAtlasCell(this.art.progressionMechanics, 0, ART_ATLASES.progressionMechanics, { x: 153, y: 348, width: 190, height: 190 });
    else if (intro.kind === "elevator") this.drawAtlasCell(this.art.progressionMechanics, 1, ART_ATLASES.progressionMechanics, { x: 153, y: 348, width: 190, height: 190 });
    else if (intro.kind === "conveyor") this.drawAtlasCell(this.art.progressionMechanics, 2, ART_ATLASES.progressionMechanics, { x: 143, y: 368, width: 210, height: 150 });
    else if (intro.kind === "star") this.drawAtlasCell(this.art.progressionMechanics, 3, ART_ATLASES.progressionMechanics, { x: 158, y: 353, width: 180, height: 180 });
    else if (intro.kind === "ice-door") this.drawIceGateIcon(248, 450, visual.counter ?? 1);
    else this.drawFeatureBlock(
      248,
      450,
      visual.outerColor ?? "cyan",
      intro.kind === "ice-block",
      visual.innerColor,
      visual.counter ?? 1,
    );
    this.wrapText(intro.description, 248, 600, 300, 28, 23, "#f8f1ff");
    this.drawButton(BUTTONS.modalPrimary, "我知道了", "#42dc38", "#087c22", 28);
  }

  private featureVisual(): { counter?: number; outerColor?: BlockColor; innerColor?: BlockColor } {
    const intro = this.model.level.featureIntro;
    const snapshot = this.model.snapshot();
    if (intro?.kind === "ice-door") {
      return { counter: Math.max(1, ...snapshot.gates.map((gate) => gate.frozen ?? 0)) };
    }
    if (intro?.kind === "ice-block") {
      const frozen = snapshot.blocks.reduce<BlockState | undefined>((highest, block) => (
        (block.frozen ?? 0) > (highest?.frozen ?? 0) ? block : highest
      ), undefined);
      return { counter: Math.max(1, frozen?.frozen ?? 0), outerColor: frozen?.color ?? "cyan" };
    }
    if (intro?.kind === "layer") {
      const layered = snapshot.blocks.find((block) => (block.layers?.length ?? 0) > 1);
      return {
        outerColor: layered?.layers?.[0] ?? layered?.color ?? "blue",
        innerColor: layered?.layers?.[1] ?? "yellow",
      };
    }
    if (intro?.kind === "shutter" || intro?.kind === "generator" || intro?.kind === "conveyor") {
      return { counter: Math.max(1, ...snapshot.shutters.map((shutter) => shutter.count)) };
    }
    return {};
  }

  private drawCelebration(): void {
    if (this.quickClear) {
      this.drawQuickCelebration();
      return;
    }
    const ctx = this.ctx;
    this.drawDim(0.72);
    const pulse = this.save.reducedMotion ? 1 : 1 + Math.sin(this.celebrationTime * 9) * 0.035;
    ctx.save();
    ctx.translate(248, 505);
    ctx.scale(pulse, pulse);
    ctx.drawImage(this.art.victoryHalo!, -176, -176, 352, 352);
    this.label("方块出逃!", 0, 0, 62, "#ffd329", "center", 1000, "#6a24aa", 10);
    this.label("CLEAR!", 0, 67, 39, "#ff7b22", "center", 1000, "#4a187d", 7);
    ctx.restore();
  }

  private drawQuickCelebration(): void {
    const ctx = this.ctx;
    const duration = this.save.reducedMotion ? QUICK_CLEAR_REDUCED_DURATION : QUICK_CLEAR_DURATION;
    const progress = Math.min(1, this.celebrationTime / duration);
    const alpha = Math.min(1, progress / 0.12) * Math.max(0, 1 - Math.max(0, progress - 0.7) / 0.3);
    const scale = this.save.reducedMotion ? 1 : 0.9 + Math.min(1, progress / 0.35) * 0.1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(248, 500);
    ctx.scale(scale, scale);
    ctx.drawImage(this.art.victoryHalo!, -116, -116, 232, 232);
    this.label(this.earnedStars === 3 ? "完美!" : "过关!", 0, -20, 48, "#ffe35a", "center", 1000, "#632494", 8);
    this.drawStarRating(0, 43, this.earnedStars, 17);
    this.drawCoin(-31, 92, 25);
    this.label(`+${this.model.level.reward}`, 1, 98, 24, "#fff3a8", "left", 900, "#5a224d", 3);
    ctx.restore();
  }

  private drawWin(): void {
    this.drawDim();
    this.drawModal(68, 232, 360, this.winSecondaryActionLabel() ? 680 : 630, this.dailyMode ? "每日挑战" : `第 ${this.model.level.id} 关`);
    const title = this.dailyMode
      ? this.earnedStars === 3 ? "完美达成!" : "挑战完成!"
      : this.earnedStars === 3 ? "完美通关!" : this.earnedStars === 2 ? "漂亮通关!" : "挑战成功!";
    this.label(title, 248, 372, 42, "#ffe35a", "center", 1000, "#7a2a97", 7);
    this.drawStarRating(248, 462, this.earnedStars, 25);
    const snapshot = this.model.snapshot();
    const moveText = this.assistedClear
      ? `道具助力 · 手动 ${snapshot.moves} 步`
      : `完成 ${snapshot.moves} 步 · 三星目标 ${this.model.level.parMoves ?? Math.max(3, this.model.level.blocks.length + 2)} 步`;
    this.label(moveText, 248, 528, 19, "#dfd7ff", "center", 800);
    const dailyDate = this.dailyChallengeDateLabel();
    const rewardText = this.dailyMode
      ? this.dailySettlementUnavailable
        ? "奖励未结算 · 请重新进入"
        : this.dailyReward > 0 ? `${dailyDate}奖励 +${this.dailyReward}` : `${dailyDate}奖励已领取`
      : this.firstClearReward ? `首次奖励 +${this.model.level.reward}` : this.assistedClear ? "最佳纪录未受影响" : "最佳纪录已保存";
    const hasCoinReward = (this.dailyMode && this.dailyReward > 0) || (!this.dailyMode && this.firstClearReward);
    if (hasCoinReward) {
      this.drawCoin(176, 603, 30);
      this.label(rewardText, 215, 607, 25, "#fff3a8", "left", 900, "#5a224d", 3);
    } else {
      this.label(rewardText, 248, 607, 25, "#fff3a8", "center", 900, "#5a224d", 3);
    }
    this.drawButton(BUTTONS.modalPrimary, this.winActionLabel(), "#43dc38", "#0a8122", 30);
    const secondary = this.winSecondaryActionLabel();
    if (secondary) this.drawButton(BUTTONS.modalSecondary, secondary, "#7562c8", "#352878", 22);
  }

  private winActionLabel(): string {
    if (this.dailyMode) return "返回主页";
    return this.model.level.id === LEVELS.length ? "赛季完成" : "下一关";
  }

  private winSecondaryActionLabel(): string | undefined {
    return !this.dailyMode && this.model.level.id < LEVELS.length ? "返回主页" : undefined;
  }

  private drawSettlementFailed(): void {
    const persistenceUnknown = this.settlementFailureKind === "unknown";
    const abandoning = Boolean(this.pendingSettlementAbandon);
    this.drawDim();
    const title = abandoning
      ? persistenceUnknown ? "正在确认返回" : "返回未保存"
      : persistenceUnknown ? "正在确认进度" : "进度未保存";
    this.drawModal(68, 232, 360, 680, title);
    this.label(
      persistenceUnknown ? (abandoning ? "返还结果暂无法确认" : "保存结果暂无法确认") : "设备存储暂不可用",
      248, 405, 31, "#ffb0bb", "center", 1000, "#7e1832", 5,
    );
    this.label(this.settlementFailureDetail(), 248, 485, 20, "#fff0ae", "center", 850, "#5b247a", 3);
    const instruction = abandoning
      ? "请重试返回，暂不可切换操作"
      : persistenceUnknown ? "请重试确认，暂不可放弃" : "可重试保存，或放弃本局";
    this.label(instruction, 248, 550, 18, "#e4dcff", "center", 750);
    this.drawButton(BUTTONS.modalPrimary, abandoning ? "重试返回" : "重试保存", "#43dc38", "#0a8122", 28);
    if (!abandoning && !persistenceUnknown) {
      this.drawButton(BUTTONS.modalSecondary, "放弃并返回", "#7562c8", "#352878", 22);
    }
  }

  private drawStorageUnavailable(): void {
    this.drawDim();
    this.drawModal(68, 232, 360, 680, "正在保护进度");
    this.label("暂时无法读取设备存档", 248, 405, 29, "#ffcf76", "center", 1000, "#7e3d18", 5);
    this.label("为避免覆盖已有进度，游戏已暂停", 248, 486, 19, "#fff0ae", "center", 850, "#5b247a", 3);
    this.label("存储恢复后可安全重试", 248, 550, 18, "#e4dcff", "center", 750);
    this.drawButton(BUTTONS.modalPrimary, "重试读取", "#43dc38", "#0a8122", 28);
  }

  private drawFailed(): void {
    this.drawDim();
    this.drawModal(68, 232, 360, 680, "时间到");
    const remaining = this.model.snapshot().blocks.length;
    this.label("差一点!", 248, 402, 42, "#ffb0bb", "center", 1000, "#7e1832", 6);
    this.label(`还剩 ${remaining} 个方块`, 248, 478, 29, "#fff0ae", "center", 950, "#5b247a", 4);
    this.label(remaining === 1 ? "最后一个，再试一次" : "调整出块顺序，再试一次", 248, 540, 20, "#e4dcff", "center", 750);
    this.drawButton(BUTTONS.modalPrimary, "重新挑战", "#43dc38", "#0a8122", 28);
    this.drawButton(BUTTONS.modalSecondary, "返回主页", "#7562c8", "#352878", 22);
  }

  private drawDim(alpha = 0.82): void {
    const image = this.art.uiPanel!;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const sampleSize = Math.max(2, Math.floor(Math.min(sourceWidth, sourceHeight) * 0.04));
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(
      image,
      (sourceWidth - sampleSize) / 2,
      (sourceHeight - sampleSize) / 2,
      sampleSize,
      sampleSize,
      0,
      0,
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
    );
    this.ctx.restore();
  }

  private drawModal(x: number, y: number, width: number, height: number, title: string): void {
    this.drawChromePanel(x, y, width, height, 50);
    this.drawChromePanel(x + 35, y - 36, width - 70, 72, 28, false);
    this.label(title, x + width / 2, y + 9, Math.min(36, 480 / Math.max(8, title.length)), "white", "center", 1000, "#3b126f", 5);
  }

  private drawButton(rect: Rect, text: string, top: string, _bottom: string, fontSize: number): void {
    const normalized = top.toLowerCase();
    const style = ["#41da35", "#42dc38", "#43dc38"].includes(normalized)
      ? 0
      : normalized === "#7562c8" ? 1 : 2;
    this.drawButtonChrome(rect, style);
    const shadow = style === 0 ? "#1c5b20" : style === 1 ? "#2b1465" : "#7e1b16";
    this.label(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + fontSize * 0.36, fontSize, "white", "center", 1000, shadow, 4);
  }

  private drawButtonChrome(rect: Rect, style: number, shadow = true): void {
    const ctx = this.ctx;
    const image = this.art.buttons!;
    const sourceWidth = (image.naturalWidth || image.width) / ART_ATLASES.buttons.columns;
    const sourceHeight = image.naturalHeight || image.height;
    const cropY = sourceHeight * 0.235;
    const cropHeight = sourceHeight * 0.53;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = "rgba(0,0,0,.65)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;
    }
    this.drawNineSliceRegion(
      image,
      style * sourceWidth,
      cropY,
      sourceWidth,
      cropHeight,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      sourceWidth * 0.235,
      cropHeight * 0.47,
      Math.min(rect.height * 0.55, rect.width / 3),
      (rect.height - 1) / 2,
    );
    ctx.restore();
  }

  private drawPill(x: number, y: number, width: number, height: number, _fill: string, _stroke: string, radius: number): void {
    this.drawChromePanel(x, y, width, height, radius, false);
  }

  private drawChromePanel(x: number, y: number, width: number, height: number, border = 48, shadow = true): void {
    const ctx = this.ctx;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = "rgba(0,0,0,.62)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
    }
    this.drawNineSlice(this.art.uiPanel!, x, y, width, height, 128, border);
    ctx.restore();
  }

  private drawNineSlice(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceBorder: number,
    destinationBorder: number,
  ): void {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    this.drawNineSliceRegion(
      image,
      0,
      0,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height,
      sourceBorder,
      sourceBorder,
      destinationBorder,
      destinationBorder,
    );
  }

  private drawNineSliceRegion(
    image: HTMLImageElement,
    sourceLeft: number,
    sourceTop: number,
    sourceWidth: number,
    sourceHeight: number,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceBorderX: number,
    sourceBorderY: number,
    destinationBorderX: number,
    destinationBorderY: number,
  ): void {
    const sourceEdgeX = Math.min(sourceBorderX, (sourceWidth - 1) / 2);
    const sourceEdgeY = Math.min(sourceBorderY, (sourceHeight - 1) / 2);
    const destinationEdgeX = Math.min(destinationBorderX, (width - 1) / 2);
    const destinationEdgeY = Math.min(destinationBorderY, (height - 1) / 2);
    const sourceX = [sourceLeft, sourceLeft + sourceEdgeX, sourceLeft + sourceWidth - sourceEdgeX];
    const sourceY = [sourceTop, sourceTop + sourceEdgeY, sourceTop + sourceHeight - sourceEdgeY];
    const sourceWidths = [sourceEdgeX, sourceWidth - sourceEdgeX * 2, sourceEdgeX];
    const sourceHeights = [sourceEdgeY, sourceHeight - sourceEdgeY * 2, sourceEdgeY];
    const destinationX = [x, x + destinationEdgeX, x + width - destinationEdgeX];
    const destinationY = [y, y + destinationEdgeY, y + height - destinationEdgeY];
    const destinationWidths = [destinationEdgeX, width - destinationEdgeX * 2, destinationEdgeX];
    const destinationHeights = [destinationEdgeY, height - destinationEdgeY * 2, destinationEdgeY];

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        this.ctx.drawImage(
          image,
          sourceX[column],
          sourceY[row],
          sourceWidths[column],
          sourceHeights[row],
          destinationX[column],
          destinationY[row],
          destinationWidths[column],
          destinationHeights[row],
        );
      }
    }
  }

  private drawRoundIcon(rect: Rect, text: string, _color: string, enabled = true): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.46;
    this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, 17);
    ctx.restore();
    const icon = text === "↶"
      ? { index: 3, rotation: 0 }
      : text === "Ⅱ"
        ? { index: 4, rotation: 0 }
        : text === "‹"
          ? { index: 5, rotation: 0 }
          : text === "›" ? { index: 5, rotation: Math.PI } : undefined;
    if (icon) {
      this.drawSystemIcon(icon.index, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.height * 0.62, enabled ? 1 : 0.5, icon.rotation);
    } else {
      this.label(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + 11, 34, enabled ? "white" : "#aaa6bd", "center", 1000, "#27206f", 3);
    }
  }

  private drawCoin(x: number, y: number, radius: number): void {
    this.drawSystemIcon(0, x, y, radius * 2.35);
  }

  private drawStarRating(centerX: number, y: number, count: number, size: number): void {
    const gap = size * 2.25;
    for (let index = 0; index < 3; index += 1) this.drawStar(centerX + (index - 1) * gap, y, size, index < count);
  }

  private drawStar(x: number, y: number, radius: number, enabled: boolean): void {
    this.drawSystemIcon(1, x, y, radius * 2.35, enabled ? 1 : 0.35);
  }

  private drawAchievementBadge(x: number, y: number, index: number, unlocked: boolean): void {
    const ctx = this.ctx;
    if (this.art.achievements) {
      const size = 92;
      ctx.save();
      if (!unlocked) ctx.globalAlpha *= 0.5;
      this.drawAtlasCell(
        this.art.achievements,
        index,
        ART_ATLASES.achievements,
        { x: x - size / 2, y: y - size / 2, width: size, height: size },
      );
      ctx.restore();
      return;
    }
  }

  private drawOnboardingIcon(index: 0 | 1, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    if (this.art.onboarding) {
      this.drawAtlasCell(
        this.art.onboarding,
        index,
        ART_ATLASES.onboardingDaily,
        { x: x - size / 2, y: y - size / 2, width: size, height: size },
      );
      return;
    }
  }

  private drawAtlasCell(
    image: HTMLImageElement | undefined,
    index: number,
    layout: { columns: number; rows: number },
    destination: Rect,
  ): boolean {
    if (!image || index < 0 || index >= layout.columns * layout.rows) return false;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (imageWidth <= 0 || imageHeight <= 0) return false;
    const sourceWidth = imageWidth / layout.columns;
    const sourceHeight = imageHeight / layout.rows;
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const scale = Math.min(destination.width / sourceWidth, destination.height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    this.ctx.drawImage(
      image,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      destination.x + (destination.width - drawWidth) / 2,
      destination.y + (destination.height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    return true;
  }

  private drawSystemIcon(index: number, x: number, y: number, size: number, alpha = 1, rotation = 0): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    this.drawAtlasCell(
      this.art.systemIcons,
      index,
      ART_ATLASES.systemIcons,
      { x: -size / 2, y: -size / 2, width: size, height: size },
    );
    ctx.restore();
  }

  private drawClockIcon(x: number, y: number): void {
    this.drawSystemIcon(2, x, y, 42);
  }

  private drawFeatureBlock(
    x: number,
    y: number,
    color: BlockColor,
    frozen: boolean,
    innerColor?: BlockColor,
    frozenCount = 1,
  ): void {
    const ctx = this.ctx;
    const size = 126;
    ctx.save();
    ctx.shadowColor = "#ffde4d";
    ctx.shadowBlur = 24;
    ctx.drawImage(this.art.blockCells![color], x - size / 2, y - size / 2, size, size);
    ctx.restore();
    if (innerColor) {
      ctx.drawImage(this.art.blockCells![innerColor], x - 38, y - 38, 76, 76);
    }
    if (frozen) {
      this.drawIceSurface(x - size / 2, y - size / 2, size, size);
      this.label(`${frozenCount}`, x, y + 17, 55, "white", "center", 1000, "#4d4260", 5);
    }
  }

  private drawIceGateIcon(x: number, y: number, count: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "#ffde4d";
    ctx.shadowBlur = 24;
    ctx.drawImage(this.art.gates!.blue, x - 90, y - 23, 180, 46);
    ctx.restore();
    this.drawIceSurface(x - 90, y - 48, 180, 96);
    this.label(`${count}`, x, y + 17, 47, "#76404e", "center", 1000, "white", 4);
  }

  private drawShutterIcon(x: number, y: number, count: number): void {
    this.drawShutterSurface(x - 75, y - 78, 150, 156);
    this.label(`${count}`, x, y + 17, 50, "#fff0c5", "center", 1000, "#3f176e", 4);
  }

  private drawHomeIcon(x: number, y: number): void {
    this.drawSystemIcon(6, x, y, 56);
  }

  private drawSupplyEntryBadge(x: number, y: number): void {
    this.drawSystemIcon(9, x, y, 34);
  }

  private drawSettingsEntryBadge(x: number, y: number): void {
    this.drawSystemIcon(10, x, y, 34);
  }

  private drawTrophyIcon(x: number, y: number): void {
    this.drawSystemIcon(8, x, y, 58);
  }

  private drawShopIcon(x: number, y: number): void {
    this.drawSystemIcon(9, x, y, 58);
  }

  private drawGridIcon(x: number, y: number): void {
    this.drawSystemIcon(7, x, y, 56);
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, size: number, color: string): void {
    const ctx = this.ctx;
    ctx.save(); ctx.font = `800 ${size}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color;
    const lines: string[] = []; let line = "";
    for (const character of text) {
      const next = line + character;
      if (ctx.measureText(next).width > maxWidth && line && !/[，。；：！？、）】》]/.test(character)) {
        lines.push(line);
        line = character;
      } else line = next;
    }
    if (line) lines.push(line);
    lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
    ctx.restore();
  }

  private label(text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", weight = 800, stroke?: string, strokeWidth = 0): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${weight} ${size}px system-ui, "Microsoft YaHei", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (stroke && strokeWidth) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private formatTime(seconds: number): string {
    const value = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  private difficultyText(difficulty: Difficulty): string {
    return difficulty === "normal" ? "经典关卡" : difficulty === "hard" ? "困难关卡" : "超级困难";
  }
}
