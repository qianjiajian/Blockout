import { LEVELS, getLevel } from "../core/levels";
import { MUSIC_CATALOG, isMusicTrack, musicCatalogEntry } from "../audio/musicCatalog";
import type { MusicCatalogEntry, MusicTrackId } from "../audio/musicCatalog";
import { PuzzleModel } from "../core/PuzzleModel";
import { drawContinuousGateStrip } from "./continuousGateStrip";
import { JourneyDeferredArt } from "./JourneyDeferredArt";
import { CollectionArtworkStore } from "./CollectionArtworkStore";
import {
  evaluateLevelStars,
  levelStarTargets,
  type LevelStarEvaluation,
} from "../core/levelStarConditions";
import { migrateLegacyCampaignCap } from "../core/campaignProgressMigration";
import { getCompletionCoinReward } from "../core/completionRewards";
import { detectMechanicEvents } from "../core/mechanicEvents";
import type { MechanicEvent, MechanicEventKind } from "../core/mechanicEvents";
import {
  buildAchievementProgressSummary,
  evaluateAchievements,
  hasClaimableAchievements,
  sanitizeAchievementProgress,
  sortAchievementEntries,
  type AchievementId,
  type AchievementProgressState,
  type AchievementResult,
} from "../core/achievements";
import {
  applyDailyTaskRun,
  claimDailyTask,
  claimDailyTaskBonus,
  createDailyTaskProgress,
  dailyTasksHaveNotification,
  localDayKey,
  millisecondsUntilNextLocalDay,
  reconcileDailyTaskProgress,
  summarizeDailyTasks,
  type DailyTaskId,
  type DailyTaskProgressState,
} from "../core/dailyTasks";
import {
  LEVEL_COLLECTION_CATALOG,
  MASTERPIECE_COLLECTION_CATALOG,
  collectionCatalogFor,
  findCollectionCatalogItem,
  levelCollectionArtworkTitleZh,
  masterpieceCollectionArtworkTitleZh,
  type CollectionCatalogCategory,
  type CollectionCatalogItem,
  type LevelCollectionCard,
  type MasterpieceCollectionCard,
} from "../core/collectionCatalog";
import {
  DEFAULT_COLLECTION_PROGRESS,
  collectionInspirationForResult,
  markCollectionItemsSeen,
  migrateCollectionProgress,
  restoreCollectionMasterpiece,
  summarizeCollectionProgress as summarizeAlbumProgress,
  type CollectionProgressCatalog,
  type CollectionProgressSave,
} from "../core/collectionProgress";
import { SUPPLY_ITEMS, SUPPLY_ORDER, TIME_FREEZE_SECONDS, nextUnseenUnlockedSupply, purchaseSupply, unlockedSupplyKinds } from "../core/supply";
import type { SupplyKind } from "../core/supply";
import {
  DEFAULT_META_DISCOVERY,
  acknowledgeCollectionItem,
  collectionItemHasBeenViewed,
  pendingCollectionItemIds,
  sanitizeMetaDiscovery,
  type MetaDiscoveryState,
} from "../core/metaDiscovery";
import {
  buildMetaLeaderboard,
  PLACEHOLDER_META_LEADERBOARD_SOURCE,
  type MetaLeaderboardAvatar,
  type MetaLeaderboardEntry,
  type MetaLeaderboardMode,
  type MetaLeaderboardSnapshot,
  type MetaLeaderboardSource,
} from "../core/metaLeaderboard";
import {
  JOURNEY_EPISODES,
  JOURNEY_MILESTONE_REWARDS,
  deriveLegacyJourneyProgress,
  findPendingJourneyEvent,
  getJourneyEpisode,
  getJourneyEpisodeThemeIndex,
  getJourneyReward,
  getJourneySegment,
  sanitizeJourneyEpisodeIndex,
  sanitizeJourneyProgressMemory,
  type JourneyEpisode,
  type JourneyPendingEvent,
  type JourneyProgressMemory,
  type JourneyReward,
  type JourneyRewardKind,
} from "../core/journeyProgress";
import {
  MAX_LIVES,
  completeLifeAttempt,
  createDefaultLifeState,
  formatLifeCountdown,
  getLifeRefillQuote,
  getNextLifeRecoveryRemainingMs,
  getUnlimitedLivesRemainingMs,
  grantLives,
  grantUnlimitedLives,
  hasPlayableLife,
  reconcileLifeState,
  refillLife,
  startLifeAttempt,
  type LifeState,
} from "../core/lives";
import {
  gatePortalRailKeys,
  gatePortals,
  portalBoundaryAnchor,
  portalTangentOffset,
} from "../core/gatePortals";
import { connectedBoardCompartment } from "./boardSeamVisualGeometry";
import { COLORS, type BlockColor, type BlockState, type ExitAttemptStatus, type GatePortalSpec, type GeneratorSpec, type Point, type PuzzleSnapshot, type Side } from "../core/types";
import type { GameHost, MusicScene, PointerSample, SoundKind, StorageReadResult } from "../platform/Host";
import { ART_ATLASES, GAME_ART, type CollectionAlbumArtUrls, type DailyTaskArtUrls, type AchievementArtUrls, type MusicLibraryArtUrls } from "./artManifest";
import {
  HOME_ARTBOARD,
  HOME_ART_LAYOUT,
  HOME_NAVIGATION_LAYOUT,
  HOME_TYPOGRAPHY,
  homeNavigationIconPlacement,
  homeNavigationTabCenterX,
  homeNavigationTabPlacement,
  type HomeArtPlacement,
} from "./homeArtLayout";
import {
  FORMAL_COLLECTION_LAYOUT,
  FORMAL_JOURNEY_LAYOUT,
  JOURNEY_PRESENTATION_LAYOUT,
  FORMAL_LEADERBOARD_LAYOUT,
  FORMAL_PAGE_CONTENT_BOTTOM,
  FORMAL_SHOP_LAYOUT,
  LANGUAGE_PICKER_LAYOUT,
  LIFE_REFILL_LAYOUT,
  PAUSE_SETTINGS_LAYOUT,
  STATUS_OVERLAY_LAYOUT,
  WIN_ART_LAYOUT,
  type FormalMetaPage,
} from "./formalPageLayout";
import {
  GAME_LANGUAGE_METADATA,
  isGameLanguage,
  resolvePreferredLanguage,
  translate,
  type GameLanguage,
  type TranslationKey,
  type TranslationParams,
} from "./localization";
import { chooseBlockBadgeCell } from "./blockBadge";
import { orderBlocksByDepth } from "./blockDepthOrder";
import { pickNearbyBlock } from "./blockPicker";
import { adaptiveRescueAction } from "./adaptiveRescue";
import { localBreakthroughAction, type LocalBreakthroughAction } from "./localBreakthroughFocus";
import {
  boardGateVisualTop,
  boardPortalRimRun,
  boardPortalVisualDepthTop,
  boardRimCornerVisualTop,
  boardRimRunVisualTop,
  buildBoardRimLayout,
  orderBoardRimLayersByDepth,
  splitBoardRimRunIntoSegments,
} from "./boardRim";
import { frozenGateCounterCenter } from "./frozenGateCounterGeometry";
import {
  KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS,
  KEY_LOCK_COUNT_VERTICAL_OFFSET_PX,
  keyLockMarkerColor,
  keyLockMarkerVerticalOffset,
  markerAspectRatio,
} from "./keyLockMarkerArt";
import { projectShutterVisualRect, shutterCounterLayout } from "./shutterVisualLayout";
import { ACTIVE_REVISED_MECHANISM_ART_PATHS, REVISED_MECHANISM_ART_URLS, missingMechanismArtPaths } from "./revisedMechanismArt";
import { SHUTTER_NINE_SLICE_PATHS, SHUTTER_NINE_SLICE_URLS, shutterFrameScale, type ShutterNineSliceImages } from "./shutterNineSlice";
import { sampleRevisedFlipGate, sampleRevisedKeyUnlock } from "./revisedMarkerAnimation";
import { sampleRevisedRegionAnimation, revisedRegionOpeningGeometry, sampleRevisedGeneratorExhaustion, sampleRevisedGeneratorSpawn } from "./revisedRegionAnimation";
import { consumeShutterOpenSound } from "./shutterOpenSound";
import { drawRevisedRegion, drawRevisedFlipPanels } from "./revisedMechanismDrawing";
import { isMechanismBlockVisible, isMechanismRegionBlocking, isMechanismRegionRevealed, usesReferenceRegionVisuals } from "./revisedMechanismPresentation";
import { usesImmediatePlayableClock, usesRevisedMechanisms } from "../core/mechanismRules";
import { monotonicGameTime, PlayableClockSlices } from "./playableClockSlices";
import { availableGateTargets, gateIsAvailableTarget } from "./gateFocus";
import { blockAvailabilityVisual, gateReadinessVisual } from "./availabilityVisuals";
import { gateReadinessMap, type GateReadiness } from "./gateReadiness";
import {
  expandInteractionTarget,
  MINIMUM_INTERACTION_TARGET_CSS,
  type HitTargetOptions,
} from "./hitTargets";
import {
  TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT,
  TEMPORARY_LEVEL_SELECTOR_HOME_RECT,
  temporaryLevelSelectorLayout,
  temporaryLevelSelectorPageForLevel,
  type TemporaryLevelSelectorLayout,
} from "./temporaryLevelSelector";
import {
  advanceContinuousDragPose,
  candidateGridSteps,
  chooseNearestReachableSnap,
  choosePortalReleaseCandidate,
  createContinuousCollisionValidator,
  easeOutCubic,
  isContinuousPoseAtPortal,
  matchingContinuousExitPortals,
  sweepContinuousPose,
  type ContinuousExitPortalMatch,
  type ContinuousPose,
  type ContinuousPoseValidator,
} from "./continuousDrag";
import {
  gatePortalExitLaneCenter,
  gatePortalExitTangentSpanCells,
  gatePortalExitTravelCells,
  gatePortalVisualRect,
  sliceGatePortal,
} from "./gatePortalVisualGeometry";
import {
  directLevelTransitionTiming,
  displayedCoinBalance,
  homeCoinFlightDuration,
  homeCoinFlightTiming,
  homeCoinLandedCount,
  homeCoinLocalProgress,
  sampleDirectLevelTransition,
  shouldDirectAdvanceAfterClear,
} from "./completionFlow";
import { tutorialGuideMotion } from "./tutorialGuideMotion";
import { winGlowRotation } from "./winGlowAnimation";
import { MECHANISM_GUIDE, MECHANISM_GUIDE_SAVE_IDS } from "../core/mechanismCatalog";
import { FeatureIntroIconArt } from "./featureIntroIcon";
import { getScheduledFeatureIntro } from "./featureIntroPolicy";
import {
  GAMEPLAY_ARTBOARD,
  GAMEPLAY_ART_LAYOUT,
  GAMEPLAY_BOARD_RIM_VISUAL_INSETS,
  fitGameplayBoard,
  type GameplayArtPlacement,
} from "./gameplayArtLayout";
import { matchFormalBlockShapeForLevel, type FormalBlockShapeId, type FormalBlockShapeMatch } from "./formalBlockShapes";
import { formalSelectionFrameBounds, traceSelectionFrameLoops } from "./selectionFrameGeometry";
import { canvasFont, centeredCanvasTextOrigin } from "./canvasTypography";
import {
  ACHIEVEMENT_LAYOUT,
  achievementBadgePlacement,
  achievementClaimPlacement,
  achievementRowBackgroundPlacement,
  achievementRowPlacement,
  achievementScrollMaximum,
} from "./achievementLayout";
import {
  COLLECTION_ALBUM_ART_LAYOUT,
  COLLECTION_ALBUM_PAGE_SIZE,
  COLLECTION_ALBUM_TYPOGRAPHY,
  collectionAlbumLevelFrame,
  collectionAlbumLatestLevelPage,
  createCollectionAlbumLayout,
  type CollectionAlbumLayout,
  type CollectionAlbumTab,
} from "./collectionAlbumLayout";
import { collectionAlbumText, type CollectionAlbumTextKey } from "./collectionAlbumLocalization";
import { createMechanismGuideLayout, mechanismGuideRect } from "./mechanismGuideLayout";
import { DAILY_TASK_LAYOUT, dailyTaskRows } from "./dailyTaskLayout";
import { dailyTaskText, type DailyTaskTextKey } from "./dailyTaskLocalization";
import {
  GENERATOR_RIM_METRICS,
  buildGeneratorRimGeometry,
  projectGeneratorRimGeometry,
  type GeneratorRimAnchor,
  type GeneratorRimGeometry,
} from "./generatorRimGeometry";
import {
  generatorSpawnAnimation,
  generatorSpawnBatchOffset,
  resolveGeneratorSpawnDisplay,
} from "./generatorSpawnAnimation";
import {
  buildNumericIceFracture,
  projectGateIceParticle,
  sampleNumericIceFracture,
  type NumericIceFractureLayout,
} from "./numericIceFracture";
import { sampleGateExitResponse, sampleShellPeel, shellPeelDuration } from "./exitMaterialAnimation";
import { WIN_CRITERION_KINDS, WIN_SETTLEMENT_LAYOUT, type WinCriterionKind } from "./winSettlementLayout";

const LOGICAL_WIDTH = 496;
const LOGICAL_HEIGHT = 1078;
const HOME_ARTBOARD_SCALE = LOGICAL_WIDTH / HOME_ARTBOARD.width;
const HOME_ARTBOARD_OFFSET_Y = (LOGICAL_HEIGHT - HOME_ARTBOARD.height * HOME_ARTBOARD_SCALE) / 2;
const GAMEPLAY_ARTBOARD_SCALE = LOGICAL_WIDTH / GAMEPLAY_ARTBOARD.width;
const GAMEPLAY_ARTBOARD_OFFSET_Y = (LOGICAL_HEIGHT - GAMEPLAY_ARTBOARD.height * GAMEPLAY_ARTBOARD_SCALE) / 2;
const SAVE_KEY = "color-escape-save-v1";
const BLOCKED_FEEDBACK_DURATION = 0.18;
const BLOCKER_FOCUS_DURATION = 0.62;
const BLOCKER_FOCUS_REDUCED_DURATION = 0.34;
const EXIT_TO_MECHANIC_DELAY = 0.2;
const EXIT_TO_MECHANIC_REDUCED_DELAY = 0.14;
// Keep the departing block readable long enough to perceive the pull into the
// exact exit lane. 120ms looked like a pop on 30/60Hz phones; 260ms preserves
// the same path and hard gate clipping while giving the suction motion weight.
const GATE_EXIT_INGEST_DURATION = 0.26;
const GATE_EXIT_FRAGMENT_DELAY = 0.18;
const GATE_EXIT_EMIT_DURATION = 0.45;
const GATE_EXIT_TOTAL_DURATION = 1.2;
const GATE_EXIT_FRAGMENT_COUNT = 48;
const GATE_EXIT_PULSE_DURATION = 0.6;
const GATE_EXIT_RETIRE_DELAY = 0.78;
const GATE_EXIT_RETIRE_DURATION = 0.4;
const GATE_EXIT_MECHANIC_DELAY = 0.14;
const CONVEYOR_MOTION_DURATION = 0.18;
const MAX_CAUSAL_RELAYS_PER_ACTION = 3;
const MAX_ADAPTIVE_RESCUE_DRAGS = 1;
const DRAG_DEAD_ZONE = 5;
const DRAG_SWEEP_STEP = 0.08;
const DRAG_GRID_HYSTERESIS = 0.08;
// The competitor begins the gate pull while the finger is still in the
// last fraction of a cell. Keep this small enough to require the complete
// rigid footprint, but large enough to absorb ordinary touch jitter.
const EXIT_CAPTURE_TOLERANCE = 0.14;
const DRAG_SETTLE_DURATION = 0.09;
const DRAG_RETURN_DURATION = 0.12;
const UPDATE_TOAST_DURATION = 6;
const BOOSTER_UNLOCK_TOAST_DURATION = 3.6;
const BOOSTER_UNLOCK_TOAST_REDUCED_DURATION = 2.4;
const MAIN_NAVIGATION_TRANSITION_DURATION = 0.2;
const STARTUP_DEFERRED_ART_DELAY_MS = 80;
const ART_LOAD_CONCURRENCY = 6;
const MINIMUM_BLOCK_PICK_TARGET_CSS = 44;
const BLOCK_PICK_AMBIGUITY_CSS = 4;
const BUTTON_PRESSED_SCALE = 0.95;

const traceRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const JOURNEY_SCROLL_DEAD_ZONE_CSS = 7;
const JOURNEY_SCROLL_MAX_VELOCITY = 2_800;
const JOURNEY_SCROLL_FRICTION = 6.2;
const JOURNEY_SCROLL_SPRING = 74;
const JOURNEY_SCROLL_SPRING_DAMPING = 13;
const JOURNEY_SCROLL_MAX_OVERSCROLL = 86;
const COLLECTION_SCROLL_DEAD_ZONE_CSS = 7;
const JOURNEY_PROGRESS_DURATION = 1.2;
const JOURNEY_PROGRESS_REDUCED_DURATION = 0.16;
const EPISODE_UNLOCK_HOME_DELAY = 0.2;
const JOURNEY_REWARD_FLIGHT_DURATION = 0.72;

const gentleReverseStep = (progress: number): number => {
  const t = Math.min(1, Math.max(0, progress));
  // Ninth-order smoothstep keeps the first 50 ms below 5% travel at 20 FPS,
  // while still reaching both endpoints with zero velocity and acceleration.
  return t ** 5 * (126 - 420 * t + 540 * t ** 2 - 315 * t ** 3 + 70 * t ** 4);
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Start with a restrained pull rather than a linear jump, then accelerate the
 * block into the exit. The longer ingest window keeps the piece readable on
 * 30/60Hz devices; the final frame still reaches the hard gate clip exactly on
 * time without changing its grid-lane alignment.
 */
const gateExitTravel = (progress: number): number => {
  const t = clampUnit(progress);
  const entryPull = 0.08 * (1 - (1 - Math.min(1, t * 6)) ** 3);
  return clampUnit(entryPull + 0.92 * t ** 2.35);
};

const stableStringSeed = (value: string): number => {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
};

const stableUnitRandom = (seed: number, index: number, stream: number): number => {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(stream + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};
const UPDATE_NOTICE = {
  id: "2026-09-10-r118",
  date: "2026-09-10",
  items: [
    "游戏界面已更换为正式美术",
    "色块、棋盘与冰冻显示更清晰",
    "暂停、通关与收藏界面焕新",
    "全部图片保持原比例显示",
  ],
} as const;
type Screen = "home" | "achievements" | "mechanismGuide" | "dailyTasks" | "levels" | "records" | "supply" | "leaderboard" | "settings" | "musicLibrary" | "language" | "updates" | "resetConfirm" | "feature" | "playing" | "paused" | "win" | "failed" | "settlementFailed";
type MainNavigationScreen = "supply" | "leaderboard" | "home" | "levels" | "records";

interface SettlementPresentation {
  assistedClear: boolean;
  earnedStars: number;
  coinReward: number;
  moves: number;
  elapsedSeconds: number;
  moveTarget: number;
  timeTargetSeconds: number;
  moveAchieved: boolean;
  timeAchieved: boolean;
}

type MusicLibraryArt = {
  [Key in Exclude<keyof MusicLibraryArtUrls, "albums">]: HTMLImageElement;
} & { albums: readonly HTMLImageElement[] };

// The supplied reference plate is 941×1672. The game home artboard is
// 720×1584, so use the same explicit x/y mapping as the reference preview
// rather than letting each control acquire a separate ad-hoc scale.
const MUSIC_PREVIEW_SIZE = { width: 941, height: 1672 } as const;
const MUSIC_PREVIEW_SCALE_X = HOME_ARTBOARD.width / MUSIC_PREVIEW_SIZE.width;
const MUSIC_PREVIEW_SCALE_Y = HOME_ARTBOARD.height / MUSIC_PREVIEW_SIZE.height;
const MUSIC_PREVIEW_OFFSET_X = 0;
const musicPreviewRect = (rect: { x: number; y: number; width: number; height: number }) => ({
  x: MUSIC_PREVIEW_OFFSET_X + rect.x * MUSIC_PREVIEW_SCALE_X,
  y: rect.y * MUSIC_PREVIEW_SCALE_Y,
  width: rect.width * MUSIC_PREVIEW_SCALE_X,
  height: rect.height * MUSIC_PREVIEW_SCALE_Y,
});

interface CompletionMetrics {
  moves: number;
  elapsedSeconds: number;
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
interface PendingSupplyPurchase {
  kind: Booster;
  baselineSave: SaveData;
  candidateSave: SaveData;
  resultingStock: number;
}
interface PendingJourneyClaim {
  eventLevel: number;
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface PendingAchievementClaim {
  id: AchievementId;
  rewardCoins: number;
  rewardSource: { x: number; y: number };
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface PendingDailyTaskClaim {
  id: DailyTaskId | "bonus";
  dayKey: string;
  rewardCoins: number;
  rewardInspiration: number;
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface PendingCollectionRestoration {
  id: string;
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface PendingJourneyThemeSelection {
  episodeIndex: number;
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface PendingLanguageSelection {
  language: GameLanguage;
  selectedMusicTrack?: MusicTrackId;
  baselineSave: SaveData;
  candidateSave: SaveData;
}
interface JourneyThemeArtCandidate {
  episodeIndex: number;
  image?: HTMLImageElement;
}
type PersistenceOutcome = "committed" | "rejected" | "unknown";
type TrustedStorageBaseline =
  | { status: "ok"; value: unknown }
  | { status: "missing" | "corrupt" };
type SettlementFailureKind = Exclude<PersistenceOutcome, "committed">;
type LeaderboardMode = MetaLeaderboardMode;
type Booster = SupplyKind;

interface LeaderboardScrollGesture {
  pointerId: number;
  lastY: number;
  mode: LeaderboardMode;
}

interface LeaderboardScrollView {
  entries: MetaLeaderboardEntry[];
  totalEntries: number;
  firstIndex: number;
  lastIndex: number;
  firstRank: number;
  lastRank: number;
  scrollOffset: number;
  maxScrollOffset: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  scrolling: boolean;
  viewport: Rect;
}

interface JourneyScrollGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  lastY: number;
  lastTimeMs: number;
  velocity: number;
  moved: boolean;
}

interface CollectionScrollGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  moved: boolean;
}

interface AchievementScrollGesture {
  pointerId: number;
  startY: number;
  startOffset: number;
  moved: boolean;
}

interface CollectionScrollEntry {
  item: CollectionItem;
  index: number;
  row: number;
  column: number;
  y: number;
}

interface JourneyRewardScrollEntry {
  kind: "reward";
  levelId: number;
  y: number;
  contentY: number;
  reward: JourneyReward;
}

interface JourneyEpisodeScrollEntry {
  kind: "episode";
  levelId: number;
  y: number;
  contentY: number;
  episode: JourneyEpisode;
}

interface JourneyFinaleScrollEntry {
  kind: "finale";
  levelId: number;
  y: number;
  contentY: number;
}

type JourneyScrollEntry = JourneyRewardScrollEntry | JourneyEpisodeScrollEntry | JourneyFinaleScrollEntry;

interface JourneyScrollView {
  entries: JourneyScrollEntry[];
  rewardRows: JourneyRewardScrollEntry[];
  episodeRows: JourneyEpisodeScrollEntry[];
  displayedLevels: number[];
  activeIndex: number;
  focusLevel: number;
  scrollOffset: number;
  minScrollOffset: number;
  maxScrollOffset: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  scrolling: boolean;
  viewport: Rect;
  contentOffset: number;
  segment: ReturnType<typeof getJourneySegment>;
}

interface FormalShopArt {
  screen: "supply";
  reference: HTMLImageElement;
  buyButton: HTMLImageElement;
  boosterTile: HTMLImageElement;
  priceCoin: HTMLImageElement;
  boosterIcons: Record<Booster, HTMLImageElement>;
}

interface FormalLeaderboardArt {
  screen: "leaderboard";
  background: HTMLImageElement;
  topHeader: HTMLImageElement;
  titlePanel: HTMLImageElement;
  title: HTMLImageElement;
  tabsFrame: HTMLImageElement;
  tabActive: HTMLImageElement;
  tabInactive: HTMLImageElement;
  podium: HTMLImageElement;
  avatars: Record<MetaLeaderboardAvatar, HTMLImageElement>;
  podiumNameplates: readonly [HTMLImageElement, HTMLImageElement, HTMLImageElement];
  podiumMedals: readonly [HTMLImageElement, HTMLImageElement, HTMLImageElement];
  rankMedals: readonly [HTMLImageElement, HTMLImageElement, HTMLImageElement];
  row: HTMLImageElement;
  levelPill: HTMLImageElement;
  playerRow: HTMLImageElement;
  playerLevelPill: HTMLImageElement;
  star: HTMLImageElement;
}

interface FormalJourneyArt {
  screen: "levels";
  background: HTMLImageElement;
  topHeader: HTMLImageElement;
  titlePanel: HTMLImageElement;
  title: HTMLImageElement;
  track: HTMLImageElement;
  trackProgress: HTMLImageElement;
  destination: HTMLImageElement;
  currentMarker: HTMLImageElement;
  levelCardLeft: HTMLImageElement;
  levelCardActiveLeft: HTMLImageElement;
  rewardCardRight: HTMLImageElement;
  rewardCardActiveRight: HTMLImageElement;
  deferred: JourneyDeferredArt;
  lockedShade: HTMLImageElement;
  episodeRangePanel: HTMLImageElement;
  episodeSelectedButton: HTMLImageElement;
  episodeActionButton: HTMLImageElement;
  lock: HTMLImageElement;
  rewards: Record<Exclude<JourneyRewardKind, "unlimited_lives"> | "complete", HTMLImageElement>;
}

interface FormalCollectionArt {
  screen: "records";
  panel: HTMLImageElement;
  close: HTMLImageElement;
  titleShadow: HTMLImageElement;
  card: HTMLImageElement;
  lockedOverlay: HTMLImageElement;
  lock: HTMLImageElement;
  selected: HTMLImageElement;
  detailPanel: HTMLImageElement;
  detailBody: HTMLImageElement;
  itemImages: readonly HTMLImageElement[];
}

type CollectionAlbumArt = {
  readonly [Key in keyof CollectionAlbumArtUrls]: HTMLImageElement;
};

type FormalPageArt = FormalShopArt | FormalLeaderboardArt | FormalJourneyArt | FormalCollectionArt;

interface PauseSettingsArt {
  panel: HTMLImageElement;
  close: HTMLImageElement;
  sound: HTMLImageElement;
  haptic: HTMLImageElement;
  effects: HTMLImageElement;
  toggleOn: HTMLImageElement;
  toggleOff: HTMLImageElement;
  replayButton: HTMLImageElement;
  homeButton: HTMLImageElement;
  clearProgressButton: HTMLImageElement;
}

interface StatusOverlayArt {
  remainingPanel: HTMLImageElement;
  clock: HTMLImageElement;
  featureIceDoor: HTMLImageElement;
}

type NativeStripSpan = 1 | 2 | 3;

interface DirectionalStripArt {
  horizontal: Record<NativeStripSpan, HTMLImageElement>;
  vertical: Record<NativeStripSpan, HTMLImageElement>;
}

type GateArt = DirectionalStripArt;
type IceStripArt = DirectionalStripArt;

const nativeStripSpans = (cells: number): NativeStripSpan[] => {
  const spans: NativeStripSpan[] = [];
  let remaining = Math.max(1, Math.round(cells));
  while (remaining > 0) {
    const span = Math.min(3, remaining) as NativeStripSpan;
    spans.push(span);
    remaining -= span;
  }
  return spans;
};

interface GameplayUiArt {
  backButton: HTMLImageElement;
  pauseButton: HTMLImageElement;
  levelPill: HTMLImageElement;
  timerIcon: HTMLImageElement;
  timerPanel: HTMLImageElement;
  boosterBase: HTMLImageElement;
  boosterCountBadge: HTMLImageElement;
  boosterPlus: HTMLImageElement;
  boosterTime: HTMLImageElement;
  boosterRocket: HTMLImageElement;
  boosterPulse: HTMLImageElement;
}

interface FormalBlockLayerArt {
  solid: Partial<Record<FormalBlockShapeId, HTMLImageElement>>;
  shell: Partial<Record<FormalBlockShapeId, HTMLImageElement>>;
}

type FormalBlockArt = Record<BlockColor, FormalBlockLayerArt>;
type FormalIceBlockArt = Partial<Record<FormalBlockShapeId, HTMLImageElement>>;
type StarBlockArt = Partial<Record<FormalBlockShapeId, HTMLImageElement>>;

interface FormalBlockAssetRequest {
  color: BlockColor;
  shapeId: FormalBlockShapeId;
  kind: "solid" | "shell";
  path: string;
}

interface FormalIceAssetRequest {
  shapeId: FormalBlockShapeId;
  path: string;
}

interface WinArt {
  panel: HTMLImageElement;
  glow: HTMLImageElement;
  rewardPill: HTMLImageElement;
  coinPile: HTMLImageElement;
  continueButton: HTMLImageElement;
  close: HTMLImageElement;
}

type DailyTaskArt = { [Key in keyof DailyTaskArtUrls]: HTMLImageElement };
type AchievementArt = { [Key in keyof AchievementArtUrls]: HTMLImageElement };

interface SaveData {
  schemaVersion: 1;
  currentLevel: number;
  highestLevel: number;
  coins: number;
  sound: boolean;
  haptic: boolean;
  reducedMotion: boolean;
  language: GameLanguage;
  selectedMusicTrack?: MusicTrackId;
  featureSeen: string[];
  boosterUnlockSeen: Booster[];
  metaDiscovery: MetaDiscoveryState;
  boosters: Record<Booster, number>;
  bestStars: Record<string, number>;
  bestMoves: Record<string, number>;
  rewardedLevels: number[];
  journeyProgress: JourneyProgressMemory;
  achievementProgress: AchievementProgressState;
  collectionProgress: CollectionProgressSave;
  dailyTaskProgress: DailyTaskProgressState;
  selectedJourneyEpisode: number;
  lifeState: LifeState;
  /** Legacy schema-v1 fields retained only for nondestructive save normalization. */
  dailyStreak: number;
  lastDailyCompletedDay: string;
  lastSeenUpdate: string;
  activeRun?: {
    levelId: number;
    returnLevelId: number;
    /** First valid player action settled this attempt's one-time life cost. */
    lifeStarted: boolean;
    /** Legacy markers are read only so interrupted retired-Daily runs refund safely. */
    daily: boolean;
    dailyDayKey?: string;
    boosterSpent: Record<Booster, number>;
  };
}

interface TemporaryLevelSelectorState {
  page: number;
  selectedLevel: number;
}

interface TemporaryLevelTestSession {
  baselineSave: SaveData;
  baselineLevelId: number;
}

interface JourneyPresentation {
  event: JourneyPendingEvent;
  phase: "progress" | "overlay" | "claiming";
  age: number;
  intent: "progress_event" | "theme_selection" | "reward_inspection";
  themeApplying?: boolean;
  error?: string;
  blockedGrant?: boolean;
}

interface Rect { x: number; y: number; width: number; height: number }
interface ButtonReleaseTarget { key: string; hit: Rect }
interface PendingButtonPress extends ButtonReleaseTarget {
  pointerId: number;
  screen: Screen;
  inside: boolean;
}
interface BoardLayout extends Rect {
  cell: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  visualBottom: number;
}
interface TutorialGuideGeometry {
  blockId: string;
  origins: Point[];
  points: { x: number; y: number }[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  exitSide?: Side;
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
  exitFragment?: boolean;
  ax?: number;
  ay?: number;
  angularVelocity?: number;
  fadePortion?: number;
  fragmentSpeck?: boolean;
  exitAnimationId?: string;
}
interface ExitGhost {
  mode: "gate" | "rocket" | "shell";
  shellReducedMotion?: boolean;
  block: BlockState;
  side: Side;
  age: number;
  duration: number;
  /** The model event belongs to this animation and this exact run. */
  exitAnimationId?: string;
  exitAnimationOwner?: PuzzleModel;
  exitCompletionDuration?: number;
  exitCompletionDone?: boolean;
  alignedX?: number;
  alignedY?: number;
  ingestDuration?: number;
  travelCells?: number;
  tangentSpanCells?: number;
  color?: BlockColor;
  sourceX?: number;
  sourceY?: number;
  fragmentCount?: number;
  emittedFragments?: number;
  fragmentDelay?: number;
  fragmentEmitDuration?: number;
  fragmentSeed?: number;
  gateId?: string;
  portalIndex?: number;
  portal?: GatePortalSpec;
}
interface ExitPulse {
  gateId: string;
  portalIndex: number;
  portal: GatePortalSpec;
  side: Side;
  offset: number;
  size: number;
  color: BlockColor;
  age: number;
  duration: number;
  retireGate: boolean;
}
interface GeneratorSpawnVisual {
  generatorId: string;
  block: BlockState;
  side: Side;
  age: number;
  timeOffsetSeconds: number;
  reducedMotion: boolean;
  travelDistance: number;
  startTranslation: { x: number; y: number };
  previousHead: number;
  currentHead: number;
  previousRemaining: number;
  currentRemaining: number;
  previousPreview?: BlockState;
  nextPreview?: BlockState;
}
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
  exitFeedbackPortalKeys: Set<string>;
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
  exitPortals: ContinuousExitPortalMatch[];
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
interface DirectLevelTransition {
  fromLevel: number;
  toLevel: number;
  age: number;
  reducedMotion: boolean;
  switched: boolean;
}
interface HomeCoinFlight {
  kind: "coins" | "inspiration";
  age: number;
  reward: number;
  start?: { x: number; y: number };
  startCoins: number;
  endCoins: number;
  reducedMotion: boolean;
  landedCount: number;
  arrivalPulseAge: number;
}
interface MechanicPulse {
  kind: MechanicEventKind;
  target: "gate" | "block" | "shutter";
  targetId: string;
  shutterSkin?: "shutter" | "generator" | "lift" | "staged-frame";
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
  previous: number;
  remaining: number;
  unlocked: boolean;
  blockCells?: Point[];
  iceFracture?: NumericIceFractureLayout;
  /** Geometry captured for a frozen exit while its ice is shattering. */
  gateSide?: Side;
  gateOffset?: number;
  gateSize?: number;
  gatePortals?: GatePortalSpec[];
  burstColor: string;
  burstCount: number;
  burstSpeed: number;
  shakeDuration: number;
  presented: boolean;
}

interface RevisedMechanicTransition {
  kind: "shutter" | "lift" | "flip" | "lock" | "generator";
  targetId: string;
  age: number;
  duration: number;
  fromOpen?: number;
  toOpen?: boolean;
  previousCount?: number;
  remainingCount?: number;
  color?: BlockColor;
  source?: { x: number; y: number };
  target?: { x: number; y: number };
  initial?: boolean;
  openingSoundPlayed?: boolean;
}

interface ResolvedExitPortal {
  gate: PuzzleSnapshot["gates"][number] | PuzzleSnapshot["flipDoors"][number];
  gateKind: "fixed" | "flipDoor";
  portalIndex: number;
  portal: GatePortalSpec;
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

const COLLECTION_PROGRESS_CATALOG: CollectionProgressCatalog = Object.freeze({
  levelCards: Object.freeze(LEVEL_COLLECTION_CATALOG.map((card) => ({
    id: card.id,
    level: card.levelId,
  }))),
  masterpieces: Object.freeze(MASTERPIECE_COLLECTION_CATALOG.map((card) => ({
    id: card.id,
    cost: card.inspirationCost,
  }))),
  milestoneIds: Object.freeze([]),
});

const DEFAULT_SAVE: SaveData = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: true,
  haptic: true,
  reducedMotion: false,
  language: "zh-CN",
  // Undefined preserves the original menu/gameplay scene mapping until the
  // player explicitly chooses a library track.
  selectedMusicTrack: undefined,
  featureSeen: [],
  boosterUnlockSeen: [],
  metaDiscovery: { ...DEFAULT_META_DISCOVERY },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  achievementProgress: { claimedIds: [] },
  collectionProgress: {
    ...DEFAULT_COLLECTION_PROGRESS,
    restoredMasterpieceIds: [],
    seenItemIds: [],
    claimedMilestoneIds: [],
  },
  dailyTaskProgress: createDailyTaskProgress(localDayKey(), 1),
  selectedJourneyEpisode: 1,
  lifeState: createDefaultLifeState(),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "",
};

const homeArtRect = (placement: { x: number; y: number; width: number; height: number }): Rect => ({
  x: placement.x * HOME_ARTBOARD_SCALE,
  y: HOME_ARTBOARD_OFFSET_Y + placement.y * HOME_ARTBOARD_SCALE,
  width: placement.width * HOME_ARTBOARD_SCALE,
  height: placement.height * HOME_ARTBOARD_SCALE,
});

const gameplayArtRect = (placement: GameplayArtPlacement): Rect => ({
  x: placement.x * GAMEPLAY_ARTBOARD_SCALE,
  y: GAMEPLAY_ARTBOARD_OFFSET_Y + placement.y * GAMEPLAY_ARTBOARD_SCALE,
  width: placement.width * GAMEPLAY_ARTBOARD_SCALE,
  height: placement.height * GAMEPLAY_ARTBOARD_SCALE,
});

const STARTUP_RETRY_ART_RECT = { x: 191, y: 276, width: 338, height: 155 } as const;
const STARTUP_RETRY_EMERGENCY_RECT = { x: 70, y: 500, width: 356, height: 96 } as const;

const BUTTONS = {
  startupRetry: homeArtRect(STARTUP_RETRY_ART_RECT),
  homeSupply: homeArtRect({ x: 16, y: 47, width: 196, height: 64 }),
  homeSettings: homeArtRect(HOME_ART_LAYOUT.settings),
  homeMusic: homeArtRect({ x: 580, y: 500, width: 118, height: 118 }),
  homeLife: homeArtRect(HOME_ART_LAYOUT.lifePanel),
  lifeRefillBuy: homeArtRect(LIFE_REFILL_LAYOUT.buyButton),
  lifeRefillDismiss: homeArtRect(LIFE_REFILL_LAYOUT.close),
  homeAchievements: homeArtRect(HOME_ART_LAYOUT.achievementEntry),
  homePlay: homeArtRect(HOME_ART_LAYOUT.start),
  homePrev: homeArtRect(HOME_ART_LAYOUT.previousLevel),
  homeNext: homeArtRect(HOME_ART_LAYOUT.nextLevel),
  temporaryLevelSelector: TEMPORARY_LEVEL_SELECTOR_HOME_RECT,
  menuBack: homeArtRect(PAUSE_SETTINGS_LAYOUT.close),
  leaderboardWeekly: homeArtRect(FORMAL_LEADERBOARD_LAYOUT.tabs[0]),
  leaderboardWorld: homeArtRect(FORMAL_LEADERBOARD_LAYOUT.tabs[1]),
  leaderboardCountry: homeArtRect(FORMAL_LEADERBOARD_LAYOUT.tabs[2]),
  formalPageRetry: { x: 151, y: 522, width: 194, height: 58 },
  journeyPresentationLater: { x: 151, y: 594, width: 194, height: 58 },
  updateToast: { x: 70, y: 130, width: 356, height: 96 },
  settingsLanguage: homeArtRect(PAUSE_SETTINGS_LAYOUT.languageButton),
  settingsReset: homeArtRect(PAUSE_SETTINGS_LAYOUT.settingsClearButton),
  musicClose: homeArtRect(musicPreviewRect({ x: 800, y: 60, width: 130, height: 145 })),
  languageBack: homeArtRect(LANGUAGE_PICKER_LAYOUT.close),
  achievementClose: homeArtRect(ACHIEVEMENT_LAYOUT.close),
  undo: gameplayArtRect(GAMEPLAY_ART_LAYOUT.back),
  pause: gameplayArtRect(GAMEPLAY_ART_LAYOUT.pause),
  time: gameplayArtRect(GAMEPLAY_ART_LAYOUT.boosters[0].base),
  rocket: gameplayArtRect(GAMEPLAY_ART_LAYOUT.boosters[1].base),
  pulse: gameplayArtRect(GAMEPLAY_ART_LAYOUT.boosters[2].base),
  modalPrimary: { x: 111, y: 720, width: 274, height: 70 },
  modalSecondary: { x: 111, y: 804, width: 274, height: 58 },
  featurePrimary: homeArtRect(STATUS_OVERLAY_LAYOUT.feature.button),
  failedReplay: homeArtRect(STATUS_OVERLAY_LAYOUT.timeout.replayButton),
  failedHome: homeArtRect(STATUS_OVERLAY_LAYOUT.timeout.homeButton),
  journeyPresentation: homeArtRect(JOURNEY_PRESENTATION_LAYOUT.button),
  journeyPresentationClose: homeArtRect(JOURNEY_PRESENTATION_LAYOUT.close),
  pauseResume: homeArtRect(PAUSE_SETTINGS_LAYOUT.close),
  pauseRestart: homeArtRect(PAUSE_SETTINGS_LAYOUT.replayButton),
  pauseHome: homeArtRect(PAUSE_SETTINGS_LAYOUT.homeButton),
  winPrimary: homeArtRect(WIN_ART_LAYOUT.continueButton),
  winClose: homeArtRect(WIN_ART_LAYOUT.close),
};

const MAIN_NAVIGATION: ReadonlyArray<{ screen: MainNavigationScreen; label: string }> = [
  { screen: "supply", label: "商店" },
  { screen: "leaderboard", label: "排行" },
  { screen: "home", label: "主页" },
  { screen: "levels", label: "旅程" },
  { screen: "records", label: "收藏" },
];

const MAIN_NAVIGATION_TRANSLATION: Record<MainNavigationScreen, TranslationKey> = {
  supply: "navigation.shop",
  leaderboard: "navigation.leaderboard",
  home: "navigation.home",
  levels: "navigation.journey",
  records: "navigation.collection",
};

const COLLECTION_MECHANISM_ITEMS = MECHANISM_GUIDE.map((item) => ({
  ...item,
  kind: "mechanism" as const,
  detail: `机制效果：${item.effect}`,
}));

type CollectionItem = (typeof COLLECTION_MECHANISM_ITEMS)[number];
const COLLECTION_ALL_ITEMS: readonly CollectionItem[] = COLLECTION_MECHANISM_ITEMS;

const LEGACY_COLLECTION_DISCOVERY_LEVELS = [1, 3, 6, 10, 15, 31, 35, 51, 100] as const;
const COLLECTION_COLUMN_COUNT = FORMAL_COLLECTION_LAYOUT.cardColumns.length;
// Render the supplied 39x39 discovery badge at its authored size. The anchor
// values preserve the previous badge centre, so this changes only its visual
// weight rather than making it jump between navigation and card states.
const NOTIFICATION_DOT_SIZE = 39;
const NOTIFICATION_DOT_RIGHT_INSET = 40.5;
const NOTIFICATION_DOT_TOP_OFFSET = 4.5;
const ACHIEVEMENT_TIER_LABELS = ["", "I", "II", "III", "IV", "V", "VI", "VII"] as const;

type SettingKind = "sound" | "haptic" | "reducedMotion";

const SETTINGS_RECTS: Record<SettingKind, Rect> = {
  sound: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[0].hit),
  haptic: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[1].hit),
  reducedMotion: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[2].hit),
};

const PAUSE_SETTING_RECTS: Record<SettingKind, Rect> = {
  sound: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[0].hit),
  haptic: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[1].hit),
  reducedMotion: homeArtRect(PAUSE_SETTINGS_LAYOUT.rows[2].hit),
};

const LANGUAGE_OPTION_RECTS: Readonly<Record<GameLanguage, Rect>> = Object.fromEntries(
  GAME_LANGUAGE_METADATA.map((entry, index) => [
    entry.language,
    homeArtRect(LANGUAGE_PICKER_LAYOUT.options[index]),
  ]),
) as Record<GameLanguage, Rect>;

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

const trustedStorageBaseline = (result: StorageReadResult<unknown>): TrustedStorageBaseline | undefined => {
  if (result.status === "unavailable") return undefined;
  return result.status === "ok"
    ? { status: "ok", value: canonicalStorageValue(result.value) }
    : { status: result.status };
};

const storedValueBaseline = (value: unknown): TrustedStorageBaseline => ({
  status: "ok",
  value: canonicalStorageValue(value),
});

const storageReadMatchesBaseline = (
  result: StorageReadResult<unknown>,
  baseline: TrustedStorageBaseline | undefined,
): boolean => {
  if (!baseline || result.status !== baseline.status) return false;
  return result.status !== "ok" || (baseline.status === "ok" && storageValuesEqual(result.value, baseline.value));
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
  private readonly playableClockSlices = new PlayableClockSlices();
  private readonly host: GameHost;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly leaderboardSource: MetaLeaderboardSource;
  private readonly deviceLanguage: GameLanguage;
  private save: SaveData;
  private model: PuzzleModel;
  private screen: Screen = "home";
  private selectedId?: string;
  private activePointer?: number;
  private pendingButtonPress?: PendingButtonPress;
  private renderedButtonPress?: { key: string; scale: number };
  private temporaryLevelSelector?: TemporaryLevelSelectorState;
  private temporaryLevelTestSession?: TemporaryLevelTestSession;
  private selectionAssist?: { blockId: string; distanceCss: number; maximumDistanceCss: number };
  private pointerDown = { x: 0, y: 0 };
  private pointerNow = { x: 0, y: 0 };
  private dragVisual?: DragVisualState;
  private particles: Particle[] = [];
  private exitGhosts: ExitGhost[] = [];
  private exitPulses: ExitPulse[] = [];
  private generatorSpawnAnimations: GeneratorSpawnVisual[] = [];
  private exitFailure?: ExitFailureFeedback;
  private mechanicPulses: MechanicPulse[] = [];
  private boardShakeTime = 0;
  private lastFrame = 0;
  private pendingCelebration = 0;
  private elapsed = 0;
  /** Active countdown time, excluding pauses and time-booster refunds. */
  private runElapsedSeconds = 0;
  private completionMetrics?: CompletionMetrics;
  private boosterTarget?: Booster;
  private boosterFeedback?: BoosterFeedback;
  private hudFeedback?: BoosterFeedback;
  private supplyFeedback?: { text: string; color: string };
  private updateToastVisible = false;
  private updateToastAge = 0;
  private boosterUnlockToast?: BoosterUnlockToast;
  private updateReturnScreen: "home" | "settings" = "home";
  private undoActions: UndoAction[] = [];
  private lastBlockedFeedbackAt = 0;
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
  private winCoinReward = 0;
  private winStarConditions?: LevelStarEvaluation;
  private winGlowAge = 0;
  private assistedClear = false;
  private lifeRefreshTimer?: number;
  private pendingLifeStart?: { baselineSave: SaveData; candidateSave: SaveData };
  private lifeRefillOpen = false;
  private lifeRefillFeedback?: string;
  private pendingLifeRefill?: { baselineSave: SaveData; candidateSave: SaveData; quote: ReturnType<typeof getLifeRefillQuote> };
  private appVisible: boolean;
  private storageBaselineReady: boolean;
  private durableStorageBaseline?: TrustedStorageBaseline;
  private storageReadAttempts = 0;
  private pendingSettlement?: PendingSettlement;
  private pendingSettlementAbandon?: PendingSettlementAbandon;
  private settlementSaveFailed = false;
  private settlementFailureKind?: SettlementFailureKind;
  private settlementSaveAttempts = 0;
  private resetSaveFailed = false;
  private languageSaveFailed = false;
  private pendingLanguageSelection?: PendingLanguageSelection;
  private pendingSupplyPurchase?: PendingSupplyPurchase;
  private pendingJourneyClaim?: PendingJourneyClaim;
  private pendingAchievementClaim?: PendingAchievementClaim;
  private pendingDailyTaskClaim?: PendingDailyTaskClaim;
  private pendingCollectionRestoration?: PendingCollectionRestoration;
  private pendingJourneyThemeSelection?: PendingJourneyThemeSelection;
  private leaderboardMode: LeaderboardMode = "world";
  private leaderboardScrollOffsets: Record<LeaderboardMode, number> = { weekly: 0, world: 0, country: 0 };
  private leaderboardScrollGesture?: LeaderboardScrollGesture;
  private journeyScrollOffset = 0;
  private journeyScrollVelocity = 0;
  private journeyScrollGesture?: JourneyScrollGesture;
  private journeyPresentation?: JourneyPresentation;
  private journeyHomeThemeArt?: HTMLImageElement;
  private journeyHomeThemeIndex?: number;
  private journeyHomeThemeRequestToken = 0;
  private journeyHomeThemeLoading = false;
  private collectionSelectedId: string = COLLECTION_ALL_ITEMS[0].id;
  private collectionScrollOffset = 0;
  private collectionScrollGesture?: CollectionScrollGesture;
  private achievementScrollOffset = 0;
  private achievementScrollGesture?: AchievementScrollGesture;
  private achievementFeedback?: { text: string; color: string };
  private achievementArt?: AchievementArt;
  private achievementArtLoading = false;
  private achievementArtRequestToken = 0;
  private achievementArtError?: string;
  private dailyTaskFeedback?: { text: string; color: string };
  private dailyTaskArt?: DailyTaskArt;
  private dailyTaskInspirationArt?: HTMLImageElement;
  private inspirationFlightArt?: HTMLImageElement;
  private dailyTaskArtLoading = false;
  private dailyTaskArtRequestToken = 0;
  private dailyTaskArtError?: string;
  private dailyTaskRefreshTimer?: number;
  private collectionAlbumTab: CollectionAlbumTab = "levels";
  private collectionAlbumPage: Record<CollectionAlbumTab, number> = { levels: 0, masterpieces: 0 };
  private collectionAlbumDetailId?: string;
  private collectionAlbumFeedback?: { text: string; color: string };
  private collectionAlbumArt?: CollectionAlbumArt;
  private collectionAlbumArtLoading = false;
  private collectionAlbumArtRequestToken = 0;
  private collectionAlbumArtError?: string;
  private collectionAlbumArtwork?: CollectionArtworkStore;
  private collectionAlbumArtworkPlan = "";
  private collectionAlbumArtworkRequestToken = 0;
  private navigationTransition?: MainNavigationTransition;
  private navigationPendingTarget?: MainNavigationScreen;
  private directLevelTransition?: DirectLevelTransition;
  private homeCoinFlight?: HomeCoinFlight;
  private shellArtReady = false;
  private artReady = false;
  private revisedArt = new Map<string, HTMLImageElement>();
  private revisedArtLoading = false;
  private revisedArtError?: string;
  private revisedArtRetryAt = 0;
  private revisedArtFailures = 0;
  private revisedTransitions: RevisedMechanicTransition[] = [];
  private readonly artLoadStartedAt = Date.now();
  private artShellLoadMs = 0;
  private artFullLoadMs = 0;
  private artLoadedImageCount = 0;
  private artLoadError?: string;
  private artLoadFailurePhase?: "shell" | "deferred";
  private formalBlockArtSignature = "";
  private formalBlockArtRequestToken = 0;
  private formalBlockArtRequestSignature?: string;
  private formalBlockArtFailedSignature?: string;
  private formalBlockArtError?: string;
  private formalBlockDynamicImages: HTMLImageElement[] = [];
  private formalIceArtSignature = "";
  private formalIceArtRequestToken = 0;
  private formalIceArtRequestSignature?: string;
  private formalIceArtFailedSignature?: string;
  private formalIceArtError?: string;
  private formalIceDynamicImages: HTMLImageElement[] = [];
  private formalStarDynamicImages: HTMLImageElement[] = [];
  private formalPageArt?: FormalPageArt;
  private readonly featureIntroIconArt: FeatureIntroIconArt;
  private formalPageArtCache: Partial<Record<FormalMetaPage, FormalPageArt>> = {};
  private formalPageArtRequest?: { screen: FormalMetaPage; token: number };
  private formalPageArtRequestToken = 0;
  private formalPageArtError?: string;
  private formalPageArtErrorScreen?: FormalMetaPage;
  private winArt?: WinArt;
  private winArtLoading = false;
  private winArtRequestToken = 0;
  private winArtError?: string;
  private lifeRefillArt?: Pick<WinArt, "coinPile" | "rewardPill">;
  private lifeRefillArtLoading = false;
  private lifeRefillArtRequestToken = 0;
  private lifeRefillArtError?: string;
  private musicEntryArt?: HTMLImageElement;
  private musicEntryArtLoading = false;
  private musicEntryArtRequestToken = 0;
  private musicEntryArtError?: string;
  private musicLibraryArt?: MusicLibraryArt;
  private musicLibraryArtLoading = false;
  private musicLibraryArtRequestToken = 0;
  private musicLibraryArtError?: string;
  private musicLibraryScrollOffset = 0;
  private art: {
    home?: HTMLImageElement;
    homeUi?: {
      topHeader: HTMLImageElement;
      resourcePanel: HTMLImageElement;
      coinIcon: HTMLImageElement;
      heartIcon: HTMLImageElement;
      addButton: HTMLImageElement;
      settingsButton: HTMLImageElement;
      levelPlate: HTMLImageElement;
      arrowLeft: HTMLImageElement;
      arrowRight: HTMLImageElement;
      starLeft: HTMLImageElement;
      starCenter: HTMLImageElement;
      starRight: HTMLImageElement;
      emptyStarLeft: HTMLImageElement;
      emptyStarCenter: HTMLImageElement;
      emptyStarRight: HTMLImageElement;
      startButton: HTMLImageElement;
      navigationBar: HTMLImageElement;
      navigationSelected: HTMLImageElement;
      navigationDivider: HTMLImageElement;
      shopIcon: HTMLImageElement;
      leaderboardIcon: HTMLImageElement;
      homeIcon: HTMLImageElement;
      journeyIcon: HTMLImageElement;
      collectionIcon: HTMLImageElement;
      collectionAlbumEntry: HTMLImageElement;
      dailyTaskEntry: HTMLImageElement;
      achievementEntry: HTMLImageElement;
    };
    gameplayBackground?: HTMLImageElement;
    gameplayUi?: GameplayUiArt;
    boosters?: HTMLImageElement;
    boosterUnlockBanner?: HTMLImageElement;
    discoveryBadge?: HTMLImageElement;
    onboarding?: HTMLImageElement;
    mechanics?: HTMLImageElement;
    uiPanel?: HTMLImageElement;
    buttons?: HTMLImageElement;
    systemIcons?: HTMLImageElement;
    pauseSettings?: PauseSettingsArt;
    statusOverlay?: StatusOverlayArt;
    blockCells?: Record<BlockColor, HTMLImageElement>;
    plainBlockCells?: Record<BlockColor, HTMLImageElement>;
    formalBlocks?: FormalBlockArt;
    gates?: Record<BlockColor, GateArt>;
    gateDirectionArrow?: HTMLImageElement;
    iceStrips?: IceStripArt;
    formalFloor?: HTMLImageElement;
    formalIceBlocks?: FormalIceBlockArt;
    formalIceCell?: HTMLImageElement;
    starBlocks?: StarBlockArt;
    starGates?: DirectionalStripArt;
    emptyCell?: HTMLImageElement;
    boardRim?: DirectionalStripArt & {
      corners: {
        southWest: HTMLImageElement;
        southEast: HTMLImageElement;
        northWest: HTMLImageElement;
        northEast: HTMLImageElement;
      };
    };
    shutter?: HTMLImageElement;
    iceCover?: HTMLImageElement;
    progressionMechanics?: HTMLImageElement;
    layerPreviewBadges?: HTMLImageElement;
    videoParity?: {
      movementAxis: HTMLImageElement;
      keyToken: HTMLImageElement;
      chainLock: HTMLImageElement;
      keyTokens: Record<BlockColor, HTMLImageElement>;
      chainLocks: Record<BlockColor, HTMLImageElement>;
      liftFrame: HTMLImageElement;
      stagedFrame: HTMLImageElement;
      sideGenerator: HTMLImageElement;
      sideGeneratorVertical?: HTMLImageElement;
      timedFeeder: HTMLImageElement;
    };
    particleSpark?: HTMLImageElement;
    blockGrabHalo?: HTMLImageElement;
    blockerFocusCorners?: HTMLImageElement;
    strategyFocusCorners?: HTMLImageElement;
    mechanicRelayMote?: HTMLImageElement;
    formalSelectionFrame?: HTMLImageElement;
    musicLibrary?: MusicLibraryArt;
  } = {};

  constructor(host: GameHost, leaderboardSource: MetaLeaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE) {
    this.host = host;
    this.ctx = host.context;
    this.featureIntroIconArt = new FeatureIntroIconArt(host, () => {
      this.dirty = true;
      this.scheduleFrame();
    });
    this.leaderboardSource = leaderboardSource;
    this.deviceLanguage = (() => {
      try { return resolvePreferredLanguage(host.preferredLocales?.() ?? []); } catch { return "en"; }
    })();
    this.appVisible = host.isVisible?.() ?? true;
    const initialStorage = host.storageRead<unknown>(SAVE_KEY);
    this.storageReadAttempts = 1;
    const loaded = initialStorage.status === "ok" ? initialStorage.value : undefined;
    this.save = this.recoverInterruptedRun(this.sanitizeSave(loaded ?? copyDefaultSave()));
    this.save.language = this.languageForStorageRead(initialStorage, loaded);
    this.updateCanvasLanguage();
    this.updateToastVisible = this.save.lastSeenUpdate !== UPDATE_NOTICE.id;
    const storedMotionPreference = isPlainRecord(loaded) && typeof loaded.reducedMotion === "boolean";
    if (!storedMotionPreference && host.prefersReducedMotion?.()) this.save.reducedMotion = true;
    this.storageBaselineReady = this.establishStorageBaseline(initialStorage, this.save);
    this.model = new PuzzleModel(getLevel(this.save.currentLevel), { deferExitCompletion: true });
    this.syncMusic();
    this.resetJourneyScrollToLevel(this.save.highestLevel);
    // The home entry is intentionally independent from the full player art.
    // It can arrive after the shell without delaying the first frame.
    void this.requestMusicEntryArt();
    void this.loadArt();
    host.onPointer({
      down: (sample) => this.handleDown(this.toLogical(sample)),
      move: (sample) => this.handleMove(this.toLogical(sample)),
      up: (sample) => this.handleUp(this.toLogical(sample)),
      cancel: (sample) => this.handleCancel(this.toLogical(sample)),
    });
    host.onHide(() => {
      this.advanceRevisedClockBeforeMutation();
      this.playableClockSlices.reset();
      this.appVisible = false;
      this.syncMusic();
      this.cancelLifeRefreshWatch();
      this.cancelDailyTaskRefreshWatch();
      this.temporaryLevelSelector = undefined;
      this.pendingButtonPress = undefined;
      this.leaderboardScrollGesture = undefined;
      this.journeyScrollGesture = undefined;
      this.journeyScrollVelocity = 0;
      this.collectionScrollGesture = undefined;
      this.achievementScrollGesture = undefined;
      if (this.activePointer !== undefined && this.selectedId) this.model.cancelAction();
      this.selectedId = undefined;
      this.activePointer = undefined;
      this.selectionAssist = undefined;
      this.dragVisual = undefined;
      this.generatorSpawnAnimations = [];
      this.reconcileRevisedMechanicTransitions(this.model.snapshot());
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
      this.syncMusic();
      if (!this.storageBaselineReady) this.retryStorageBaseline();
      this.ensureDailyTaskCycle();
      this.refreshLifeState();
      this.scheduleLifeRefreshWatch();
      this.scheduleDailyTaskRefreshWatch();
      this.lastFrame = 0;
      this.dirty = true;
      this.scheduleFrame();
    });
    host.onResize(() => {
      // Pointer samples received before and after a viewport change use different
      // coordinate scales. Cancel the in-flight action so the next sample cannot
      // turn that scale change into a synthetic drag.
      this.pendingButtonPress = undefined;
      this.leaderboardScrollGesture = undefined;
      this.journeyScrollGesture = undefined;
      this.journeyScrollVelocity = 0;
      this.collectionScrollGesture = undefined;
      this.achievementScrollGesture = undefined;
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
    this.scheduleLifeRefreshWatch();
  }

  private async loadImages(paths: readonly string[], concurrency = ART_LOAD_CONCURRENCY): Promise<HTMLImageElement[]> {
    const images = new Array<HTMLImageElement>(paths.length);
    let cursor = 0;
    let failed = false;
    let firstError: unknown;
    const workerCount = Math.min(Math.max(1, concurrency), paths.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (!failed && cursor < paths.length) {
        const index = cursor;
        cursor += 1;
        try {
          images[index] = await this.host.createImage(paths[index]);
          this.artLoadedImageCount += 1;
        } catch (error: unknown) {
          if (!failed) firstError = error;
          failed = true;
        }
      }
    }));
    if (failed) {
      let releasedCount = 0;
      for (const image of images) {
        if (image) {
          releasedCount += 1;
          this.host.releaseImage?.(image);
        }
      }
      this.artLoadedImageCount = Math.max(0, this.artLoadedImageCount - releasedCount);
      throw firstError;
    }
    return images;
  }

  private requestMusicEntryArt(): Promise<boolean> {
    if (this.musicEntryArt || this.musicEntryArtLoading) return Promise.resolve(Boolean(this.musicEntryArt));
    this.musicEntryArtLoading = true;
    const token = ++this.musicEntryArtRequestToken;
    return this.host.createImage(GAME_ART.ui.musicLibrary.entry).then((image) => {
      if (token !== this.musicEntryArtRequestToken) {
        this.host.releaseImage?.(image);
        return false;
      }
      this.musicEntryArt = image;
      this.musicEntryArtError = undefined;
      this.artLoadedImageCount += 1;
      return true;
    }).catch((error: unknown) => {
      this.musicEntryArtError = error instanceof Error ? error.message : String(error);
      return false;
    }).finally(() => {
      this.musicEntryArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private requestMusicLibraryArt(force = false): Promise<boolean> {
    if (this.musicLibraryArt && !force) return Promise.resolve(true);
    if (this.musicLibraryArtLoading) return Promise.resolve(false);
    this.musicLibraryArtLoading = true;
    const token = ++this.musicLibraryArtRequestToken;
    const paths = GAME_ART.ui.musicLibrary;
    // The full reference plate already contains the exact panel, controls and
    // cards. Load that single plate for the first screen; the split PNGs stay
    // available as replaceable authoring resources without adding a dozen
    // simultaneous decoded textures to the first library frame.
    return this.host.createImage(paths.preview).then((preview) => {
      if (token !== this.musicLibraryArtRequestToken) {
        this.host.releaseImage?.(preview);
        return false;
      }
      this.musicLibraryArt = {
        preview,
        panel: preview,
        header: preview,
        close: preview,
        play: preview,
        previous: preview,
        next: preview,
        volume: preview,
        entry: this.musicEntryArt ?? preview,
        albums: [preview],
      };
      this.musicLibraryArtError = undefined;
      this.artLoadedImageCount += 1;
      return true;
    }).catch((error: unknown) => {
      this.musicLibraryArtError = error instanceof Error ? error.message : String(error);
      return false;
    }).finally(() => {
      this.musicLibraryArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private ensureRevisedMechanismArt(): void {
    if (this.revisedArtLoading || monotonicGameTime() < this.revisedArtRetryAt) return;
    const paths = missingMechanismArtPaths(this.model.level, this.revisedArt);
    if (!paths.length) return;
    this.revisedArtLoading = true;
    void this.loadImages(paths).then((images) => {
      paths.forEach((path, index) => this.revisedArt.set(path, images[index]));
      this.revisedArtError = undefined;
      this.revisedArtFailures = 0;
      this.revisedArtRetryAt = 0;
    }).catch((error: unknown) => {
      this.revisedArtError = error instanceof Error ? error.message : String(error);
      // A transient strip/subpackage failure must not poison future scenes.
      this.revisedArtFailures += 1;
      this.revisedArtRetryAt = monotonicGameTime() + Math.min(30000, 1000 * 2 ** Math.min(5, this.revisedArtFailures - 1));
    }).finally(() => {
      this.revisedArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private revisedMechanismImage(path: string): HTMLImageElement | undefined {
    return usesRevisedMechanisms(this.model.level) || SHUTTER_NINE_SLICE_PATHS.includes(path)
      ? this.revisedArt.get(path) : undefined;
  }

  private captureRevisedMechanicTransitions(before: PuzzleSnapshot, after: PuzzleSnapshot, delay = 0): void {
    const add = (transition: RevisedMechanicTransition) => {
      this.revisedTransitions = this.revisedTransitions.filter((item) => (
        item.kind !== transition.kind || item.targetId !== transition.targetId
      ));
      this.revisedTransitions.push(transition);
    };
    for (const region of after.shutters) {
      const previous = before.shutters.find(({ id }) => id === region.id);
      if (!previous || isMechanismRegionRevealed(before, previous) || !isMechanismRegionRevealed(after, region)) continue;
      if (!usesReferenceRegionVisuals(after, region)) continue;
      add({ kind: region.skin === "lift" ? "lift" : "shutter", targetId: region.id,
        age: -delay, duration: sampleRevisedRegionAnimation(region.skin === "lift" ? "lift" : "shutter", 0, this.save.reducedMotion).durationSeconds });
    }
    if (!usesRevisedMechanisms(after)) return;
    for (const door of after.flipDoors) {
      const previous = before.flipDoors.find(({ id }) => id === door.id);
      if (previous && previous.open !== door.open) {
        const running = this.revisedTransitions.find((item) => item.kind === "flip" && item.targetId === door.id);
        add({ kind: "flip", targetId: door.id, age: -delay, duration: 0.2,
          fromOpen: running ? sampleRevisedFlipGate(running.age, Boolean(running.toOpen), this.save.reducedMotion, running.fromOpen).openness
            : previous.open ? 1 : 0, toOpen: door.open });
      }
    }
    const board = this.boardLayout();
    for (const block of before.blocks) {
      if (!block.lockedBy) continue;
      const remaining = after.blocks.find(({ id }) => id === block.id);
      if (!remaining || (remaining.lockCount ?? 0) >= (block.lockCount ?? 1)) continue;
      const key = before.blocks.find((item) => item.keyId === block.lockedBy
        && !after.blocks.some(({ id }) => id === item.id));
      if (!key) continue;
      const center = (item: BlockState) => {
        const cells = item.shape.map(([x, y]) => [item.x + x, item.y + y]);
        return { x: board.innerX + (Math.min(...cells.map(([x]) => x)) + Math.max(...cells.map(([x]) => x)) + 1) * board.cell / 2,
          y: board.innerY + (Math.min(...cells.map(([, y]) => y)) + Math.max(...cells.map(([, y]) => y)) + 1) * board.cell / 2 };
      };
      add({ kind: "lock", targetId: block.id, age: 0, duration: 1.35,
        previousCount: block.lockCount ?? 1, remainingCount: remaining.lockCount ?? 0,
        source: {
          x: board.innerX + (key.x + Math.min(...key.shape.map(([x]) => x)) + 0.5) * board.cell,
          y: board.innerY + (key.y + Math.max(...key.shape.map(([, y]) => y)) + 0.5) * board.cell + keyLockMarkerVerticalOffset(board.cell),
        }, target: { ...center(remaining), y: center(remaining).y + keyLockMarkerVerticalOffset(board.cell) },
        color: keyLockMarkerColor(block.lockedBy, this.model.level) });
    }
  }

  private reconcileRevisedMechanicTransitions(snapshot: PuzzleSnapshot): void {
    this.revisedTransitions = this.revisedTransitions.filter((item) => {
      if (item.kind === "generator") return snapshot.generators.some((generator) => generator.id === item.targetId && generator.remaining === 0);
      if (item.kind === "flip") return snapshot.flipDoors.some((door) => door.id === item.targetId && door.open === item.toOpen);
      if (item.kind === "lock") return snapshot.blocks.some((block) => block.id === item.targetId
        && (block.lockCount ?? 0) === item.remainingCount);
      const region = snapshot.shutters.find(({ id }) => id === item.targetId);
      return region && isMechanismRegionRevealed(snapshot, region);
    });
  }

  private drawRevisedKeyFlights(): void {
    if (!usesRevisedMechanisms(this.model.level) || !this.art.videoParity) return;
    const ctx = this.ctx;
    const cell = this.boardLayout().cell;
    for (const flight of this.revisedTransitions) {
      if (flight.kind !== "lock" || !flight.source || !flight.target || !flight.color) continue;
      const state = sampleRevisedKeyUnlock(flight.age, this.save.reducedMotion);
      const x = flight.source.x + (flight.target.x - flight.source.x) * state.flightProgress;
      const y = flight.source.y + (flight.target.y - flight.source.y) * state.flightProgress + state.popOffsetCells * cell;
      ctx.save();
      if (state.keyVisible) {
        const image = this.art.videoParity.keyTokens[flight.color] ?? this.art.videoParity.keyToken;
        const height = cell * 0.66 * state.keyScale;
        const width = height * markerAspectRatio(image);
        ctx.globalAlpha *= state.keyAlpha;
        ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
      }
      const flash = state.arrived ? state.lockFlashAlpha : state.sparkleAlpha;
      if (flash > 0) {
        ctx.globalAlpha *= flash;
        ctx.strokeStyle = "#fff4b5";
        ctx.lineWidth = cell * 0.035;
        const radius = cell * (state.arrived ? 0.28 + 0.32 * state.lockFlashProgress : 0.42);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i += 1) {
          const angle = i * Math.PI / 3;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          const size = cell * (state.arrived ? 0.1 : 0.055);
          ctx.fillStyle = i % 2 ? "#fff" : "#ffe16d";
          ctx.beginPath();
          ctx.moveTo(px, py - size); ctx.lineTo(px + size * 0.3, py);
          ctx.lineTo(px, py + size); ctx.lineTo(px - size * 0.3, py);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private drawRevisedMechanismRegion(region: PuzzleSnapshot["shutters"][number], board: BoardLayout): boolean {
    if (!usesReferenceRegionVisuals(this.model.level, region)) return false;
    // During the component load keep an opaque cover/counter, never flash the
    // retired ornate frame or expose the hidden cohort through a partial load.
    if (region.skin === "lift" && !this.revisedLiftArtReady()) return false;
    const transition = this.revisedTransitions.find((item) => item.targetId === region.id
      && (item.kind === "shutter" || item.kind === "lift"));
    const kind = region.skin === "lift" ? "lift" : "shutter";
    const sample = transition ? sampleRevisedRegionAnimation(kind, transition.age, this.save.reducedMotion) : undefined;
    drawRevisedRegion(this.ctx, projectShutterVisualRect(region.x, region.y, region.width, region.height, board), kind, {
      shutter: Object.fromEntries(Object.entries(SHUTTER_NINE_SLICE_URLS)
        .map(([part, path]) => [part, this.revisedMechanismImage(path)])) as ShutterNineSliceImages,
      shutterScale: shutterFrameScale(board.cell),
      frame: this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.lift.frame),
      left: this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.lift.left),
      right: this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.lift.right),
    }, sample, transition ? 0 : region.count);
    return true;
  }

  private revisedLiftArtReady(): boolean {
    return Object.values(REVISED_MECHANISM_ART_URLS.lift).every((path) => Boolean(this.revisedMechanismImage(path)));
  }

  private failArtLoad(phase: "shell" | "deferred", error: unknown): void {
    this.artLoadFailurePhase = phase;
    this.artLoadError = error instanceof Error ? error.message : String(error);
    this.artReady = false;
    this.dirty = true;
    this.scheduleFrame();
  }

  private startupRetryRect(): Rect {
    return this.shellArtReady ? BUTTONS.startupRetry : STARTUP_RETRY_EMERGENCY_RECT;
  }

  private retryStartupArt(): void {
    const phase = this.artLoadFailurePhase;
    if (!phase || !this.artLoadError || this.artReady) return;
    this.artLoadError = undefined;
    this.artLoadFailurePhase = undefined;
    this.lastFrame = 0;
    this.dirty = true;
    this.scheduleFrame();
    if (phase === "shell") {
      this.shellArtReady = false;
      this.art = {};
      void this.loadArt();
    } else {
      void this.loadDeferredArt();
    }
  }

  private async loadArt(): Promise<void> {
    try {
      const [home, homeTopHeader, homeResourcePanel, homeCoinIcon, homeHeartIcon, homeAddButton, homeSettingsButton, homeLevelPlate, homeArrowLeft, homeArrowRight, homeStarLeft, homeStarCenter, homeStarRight, homeEmptyStarLeft, homeEmptyStarCenter, homeEmptyStarRight, homeStartButton, homeNavigationBar, homeNavigationSelected, homeNavigationDivider, homeShopIcon, homeLeaderboardIcon, homeHomeIcon, homeJourneyIcon, homeCollectionIcon, homeCollectionAlbumEntry, missionsEntryImage, achievementEntryImage, onboarding, uiPanel] = await this.loadImages([
        GAME_ART.backgrounds.home,
        GAME_ART.ui.home.topHeader,
        GAME_ART.ui.home.resourcePanel,
        GAME_ART.ui.home.coinIcon,
        GAME_ART.ui.home.heartIcon,
        GAME_ART.ui.home.addButton,
        GAME_ART.ui.home.settingsButton,
        GAME_ART.ui.home.levelPlate,
        GAME_ART.ui.home.arrowLeft,
        GAME_ART.ui.home.arrowRight,
        GAME_ART.ui.home.starLeft,
        GAME_ART.ui.home.starCenter,
        GAME_ART.ui.home.starRight,
        GAME_ART.ui.home.emptyStarLeft,
        GAME_ART.ui.home.emptyStarCenter,
        GAME_ART.ui.home.emptyStarRight,
        GAME_ART.ui.home.startButton,
        GAME_ART.ui.home.navigationBar,
        GAME_ART.ui.home.navigationSelected,
        GAME_ART.ui.home.navigationDivider,
        GAME_ART.ui.home.shopIcon,
        GAME_ART.ui.home.leaderboardIcon,
        GAME_ART.ui.home.homeIcon,
        GAME_ART.ui.home.journeyIcon,
        GAME_ART.ui.home.collectionIcon,
        GAME_ART.ui.home.collectionAlbumEntry,
        GAME_ART.ui.home.dailyTaskEntry,
        GAME_ART.ui.home.achievementEntry,
        GAME_ART.ui.onboardingDaily,
        GAME_ART.ui.universalPanel,
      ]);
      this.art = {
        home,
        homeUi: {
          topHeader: homeTopHeader,
          resourcePanel: homeResourcePanel,
          coinIcon: homeCoinIcon,
          heartIcon: homeHeartIcon,
          addButton: homeAddButton,
          settingsButton: homeSettingsButton,
          levelPlate: homeLevelPlate,
          arrowLeft: homeArrowLeft,
          arrowRight: homeArrowRight,
          starLeft: homeStarLeft,
          starCenter: homeStarCenter,
          starRight: homeStarRight,
          emptyStarLeft: homeEmptyStarLeft,
          emptyStarCenter: homeEmptyStarCenter,
          emptyStarRight: homeEmptyStarRight,
          startButton: homeStartButton,
          navigationBar: homeNavigationBar,
          navigationSelected: homeNavigationSelected,
          navigationDivider: homeNavigationDivider,
          shopIcon: homeShopIcon,
          leaderboardIcon: homeLeaderboardIcon,
          homeIcon: homeHomeIcon,
          journeyIcon: homeJourneyIcon,
          collectionIcon: homeCollectionIcon,
          collectionAlbumEntry: homeCollectionAlbumEntry,
          dailyTaskEntry: missionsEntryImage,
          achievementEntry: achievementEntryImage,
        },
        onboarding,
        uiPanel,
      };
      // Chapter 1 uses the already-loaded Home shell image. Other chapters
      // still load on demand, after the shell exists, so startup never decodes
      // the same 720x1584 bitmap twice.
      void this.requestJourneyHomeThemeArt(this.save.selectedJourneyEpisode);
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

  private formalBlockAssetPath(
    color: BlockColor,
    kind: "solid" | "shell",
    shapeId: FormalBlockShapeId,
  ): string | undefined {
    const family = GAME_ART.gameplay.formalBlocks[color][kind] as Partial<Record<FormalBlockShapeId, string>>;
    return family[shapeId];
  }

  private formalBlockAssetPlan(): { signature: string; requests: FormalBlockAssetRequest[] } {
    const requests: FormalBlockAssetRequest[] = [];
    const seen = new Set<string>();
    const add = (color: BlockColor, kind: "solid" | "shell", shapeId: FormalBlockShapeId): void => {
      // All eight single-cell images are permanent shared art, so a level plan
      // only carries larger whole-piece and shell sprites.
      if (kind === "solid" && shapeId === 1) return;
      const path = this.formalBlockAssetPath(color, kind, shapeId);
      if (!path || seen.has(path)) return;
      seen.add(path);
      requests.push({ color, kind, shapeId, path });
    };
    for (const block of this.model.level.blocks) {
      const match = matchFormalBlockShapeForLevel(block.shape, this.model.level.id);
      if (!match) continue;
      const layers = block.layers?.length ? block.layers : [block.color];
      layers.forEach((color) => add(color, "solid", match.shapeId));
      if (layers.length > 1) add(layers[0], "shell", match.shapeId);
    }
    requests.sort((left, right) => `${left.kind}:${left.color}:${left.shapeId}`.localeCompare(
      `${right.kind}:${right.color}:${right.shapeId}`,
    ));
    return {
      signature: requests.map((request) => `${request.kind}:${request.color}:${request.shapeId}`).join("|"),
      requests,
    };
  }

  private buildFormalBlockArt(
    singles: Record<BlockColor, HTMLImageElement>,
    requests: readonly FormalBlockAssetRequest[],
    images: readonly HTMLImageElement[],
  ): FormalBlockArt {
    const art = Object.fromEntries(COLORS.map((color) => [color, {
      solid: { 1: singles[color] },
      shell: {},
    }])) as FormalBlockArt;
    requests.forEach((request, index) => {
      art[request.color][request.kind][request.shapeId] = images[index];
    });
    return art;
  }

  private ensureFormalBlockArtForCurrentLevel(): void {
    if (!this.artReady || !this.art.blockCells) return;
    const plan = this.formalBlockAssetPlan();
    if (plan.signature === this.formalBlockArtSignature
      || plan.signature === this.formalBlockArtRequestSignature
      || plan.signature === this.formalBlockArtFailedSignature) return;
    const token = ++this.formalBlockArtRequestToken;
    this.formalBlockArtRequestSignature = plan.signature;
    void this.loadImages(plan.requests.map((request) => request.path)).then((images) => {
      if (token !== this.formalBlockArtRequestToken || this.formalBlockArtRequestSignature !== plan.signature) {
        images.forEach((image) => this.host.releaseImage?.(image));
        return;
      }
      const previousImages = this.formalBlockDynamicImages;
      this.formalBlockDynamicImages = images;
      this.art.formalBlocks = this.buildFormalBlockArt(this.art.blockCells!, plan.requests, images);
      this.formalBlockArtSignature = plan.signature;
      this.formalBlockArtRequestSignature = undefined;
      this.formalBlockArtFailedSignature = undefined;
      this.formalBlockArtError = undefined;
      previousImages.forEach((image) => this.host.releaseImage?.(image));
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.formalBlockArtRequestToken) return;
      this.formalBlockArtRequestSignature = undefined;
      this.formalBlockArtFailedSignature = plan.signature;
      this.formalBlockArtError = error instanceof Error ? error.message : String(error);
      this.hudFeedback = { text: this.tr("startup.formalBlockLoadFailed"), color: "#ffbf5e", age: 0, duration: 3.2 };
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private formalIceAssetPath(shapeId: FormalBlockShapeId): string | undefined {
    const family = GAME_ART.gameplay.formalIceBlocks as Partial<Record<FormalBlockShapeId, string>>;
    return family[shapeId];
  }

  private formalIceAssetPlan(): { signature: string; requests: FormalIceAssetRequest[] } {
    const requests: FormalIceAssetRequest[] = [];
    const seen = new Set<FormalBlockShapeId>();
    for (const block of this.model.level.blocks) {
      if (!(Number(block.frozen ?? 0) > 0)) continue;
      const match = matchFormalBlockShapeForLevel(block.shape, this.model.level.id);
      if (!match || match.shapeId === 1 || seen.has(match.shapeId)) continue;
      const path = this.formalIceAssetPath(match.shapeId);
      if (!path) continue;
      seen.add(match.shapeId);
      requests.push({ shapeId: match.shapeId, path });
    }
    requests.sort((left, right) => left.shapeId - right.shapeId);
    return {
      signature: requests.map((request) => `${request.shapeId}`).join("|"),
      requests,
    };
  }

  private buildFormalIceBlockArt(
    single: HTMLImageElement,
    requests: readonly FormalIceAssetRequest[],
    images: readonly HTMLImageElement[],
  ): FormalIceBlockArt {
    const art: FormalIceBlockArt = { 1: single };
    requests.forEach((request, index) => {
      art[request.shapeId] = images[index];
    });
    return art;
  }

  private ensureFormalIceArtForCurrentLevel(): void {
    if (!this.artReady || !this.art.formalIceCell) return;
    const plan = this.formalIceAssetPlan();
    if (plan.signature === this.formalIceArtSignature
      || plan.signature === this.formalIceArtRequestSignature
      || plan.signature === this.formalIceArtFailedSignature) return;
    const token = ++this.formalIceArtRequestToken;
    this.formalIceArtRequestSignature = plan.signature;
    void this.loadImages(plan.requests.map((request) => request.path)).then((images) => {
      if (token !== this.formalIceArtRequestToken || this.formalIceArtRequestSignature !== plan.signature) {
        images.forEach((image) => this.host.releaseImage?.(image));
        return;
      }
      const previousImages = this.formalIceDynamicImages;
      this.formalIceDynamicImages = images;
      this.art.formalIceBlocks = this.buildFormalIceBlockArt(this.art.formalIceCell!, plan.requests, images);
      this.formalIceArtSignature = plan.signature;
      this.formalIceArtRequestSignature = undefined;
      this.formalIceArtFailedSignature = undefined;
      this.formalIceArtError = undefined;
      previousImages.forEach((image) => this.host.releaseImage?.(image));
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.formalIceArtRequestToken) return;
      this.formalIceArtRequestSignature = undefined;
      this.formalIceArtFailedSignature = plan.signature;
      this.formalIceArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private async loadDeferredArt(): Promise<void> {
    try {
      const initialPlan = this.formalBlockAssetPlan();
      const initialIcePlan = this.formalIceAssetPlan();
      const [
        gameplayBackground, boosters, boosterUnlockBanner, discoveryBadge, mechanics, buttons,
        pausePanel, pauseClose, pauseSound, pauseHaptic, pauseEffects, pauseToggleOn, pauseToggleOff,
        pauseReplay, pauseHome, pauseClear, statusRemainingPanel, statusClock, statusFeatureIceDoor, systemIcons,
        redBlock, blueBlock, greenBlock, yellowBlock, purpleBlock, orangeBlock, pinkBlock, cyanBlock,
        redGateHorizontal1, redGateHorizontal2, redGateHorizontal3,
        redGateVertical1, redGateVertical2, redGateVertical3,
        blueGateHorizontal1, blueGateHorizontal2, blueGateHorizontal3,
        blueGateVertical1, blueGateVertical2, blueGateVertical3,
        greenGateHorizontal1, greenGateHorizontal2, greenGateHorizontal3,
        greenGateVertical1, greenGateVertical2, greenGateVertical3,
        yellowGateHorizontal1, yellowGateHorizontal2, yellowGateHorizontal3,
        yellowGateVertical1, yellowGateVertical2, yellowGateVertical3,
        purpleGateHorizontal1, purpleGateHorizontal2, purpleGateHorizontal3,
        purpleGateVertical1, purpleGateVertical2, purpleGateVertical3,
        orangeGateHorizontal1, orangeGateHorizontal2, orangeGateHorizontal3,
        orangeGateVertical1, orangeGateVertical2, orangeGateVertical3,
        pinkGateHorizontal1, pinkGateHorizontal2, pinkGateHorizontal3,
        pinkGateVertical1, pinkGateVertical2, pinkGateVertical3,
        cyanGateHorizontal1, cyanGateHorizontal2, cyanGateHorizontal3,
        cyanGateVertical1, cyanGateVertical2, cyanGateVertical3,
        iceStripHorizontal1, iceStripHorizontal2, iceStripHorizontal3,
        iceStripVertical1, iceStripVertical2, iceStripVertical3,
        gateDirectionArrow, emptyCell,
        boardRimHorizontal1, boardRimHorizontal2, boardRimHorizontal3,
        boardRimVertical1, boardRimVertical2, boardRimVertical3,
        boardCornerSouthWest, boardCornerSouthEast, boardCornerNorthWest, boardCornerNorthEast,
        shutter, iceCover, progressionMechanics, layerPreviewBadges,
        movementAxisOverlay, keyToken, chainLock,
        redKeyToken, blueKeyToken, greenKeyToken, yellowKeyToken,
        orangeKeyToken, pinkKeyToken, cyanKeyToken,
        redChainLock, blueChainLock, greenChainLock, yellowChainLock,
        orangeChainLock, pinkChainLock, cyanChainLock,
        liftFrame, stagedFrame, sideGenerator, timedFeeder,
        particleSpark, blockGrabHalo,
        blockerFocusCorners, strategyFocusCorners, mechanicRelayMote,
        gameplayBackButton, gameplayPauseButton, gameplayLevelPill, gameplayTimerIcon, gameplayTimerPanel,
        gameplayBoosterBase, gameplayBoosterCountBadge, gameplayBoosterPlus,
        gameplayBoosterTime, gameplayBoosterRocket, gameplayBoosterPulse,
        formalFloor, formalIceCell, formalSelectionFrame,
        ...initialFormalGameplayImages
      ] = await this.loadImages([
        GAME_ART.backgrounds.gameplay,
        GAME_ART.ui.boosters,
        GAME_ART.ui.boosterUnlockBanner,
        GAME_ART.ui.discoveryBadge,
        GAME_ART.fx.mechanics,
        GAME_ART.ui.buttons,
        GAME_ART.ui.pauseSettings.panel,
        GAME_ART.ui.pauseSettings.close,
        GAME_ART.ui.pauseSettings.sound,
        GAME_ART.ui.pauseSettings.haptic,
        GAME_ART.ui.pauseSettings.effects,
        GAME_ART.ui.pauseSettings.toggleOn,
        GAME_ART.ui.pauseSettings.toggleOff,
        GAME_ART.ui.pauseSettings.replayButton,
        GAME_ART.ui.pauseSettings.homeButton,
        GAME_ART.ui.pauseSettings.clearProgressButton,
        GAME_ART.ui.statusOverlay.remainingPanel,
        GAME_ART.ui.statusOverlay.clock,
        GAME_ART.ui.statusOverlay.featureIceDoor,
        GAME_ART.ui.systemIcons,
        GAME_ART.gameplay.formalBlocks.red.solid[1],
        GAME_ART.gameplay.formalBlocks.blue.solid[1],
        GAME_ART.gameplay.formalBlocks.green.solid[1],
        GAME_ART.gameplay.formalBlocks.yellow.solid[1],
        GAME_ART.gameplay.formalBlocks.purple.solid[1],
        GAME_ART.gameplay.formalBlocks.orange.solid[1],
        GAME_ART.gameplay.formalBlocks.pink.solid[1],
        GAME_ART.gameplay.formalBlocks.cyan.solid[1],
        GAME_ART.gameplay.gates.red.horizontal[1],
        GAME_ART.gameplay.gates.red.horizontal[2],
        GAME_ART.gameplay.gates.red.horizontal[3],
        GAME_ART.gameplay.gates.red.vertical[1],
        GAME_ART.gameplay.gates.red.vertical[2],
        GAME_ART.gameplay.gates.red.vertical[3],
        GAME_ART.gameplay.gates.blue.horizontal[1],
        GAME_ART.gameplay.gates.blue.horizontal[2],
        GAME_ART.gameplay.gates.blue.horizontal[3],
        GAME_ART.gameplay.gates.blue.vertical[1],
        GAME_ART.gameplay.gates.blue.vertical[2],
        GAME_ART.gameplay.gates.blue.vertical[3],
        GAME_ART.gameplay.gates.green.horizontal[1],
        GAME_ART.gameplay.gates.green.horizontal[2],
        GAME_ART.gameplay.gates.green.horizontal[3],
        GAME_ART.gameplay.gates.green.vertical[1],
        GAME_ART.gameplay.gates.green.vertical[2],
        GAME_ART.gameplay.gates.green.vertical[3],
        GAME_ART.gameplay.gates.yellow.horizontal[1],
        GAME_ART.gameplay.gates.yellow.horizontal[2],
        GAME_ART.gameplay.gates.yellow.horizontal[3],
        GAME_ART.gameplay.gates.yellow.vertical[1],
        GAME_ART.gameplay.gates.yellow.vertical[2],
        GAME_ART.gameplay.gates.yellow.vertical[3],
        GAME_ART.gameplay.gates.purple.horizontal[1],
        GAME_ART.gameplay.gates.purple.horizontal[2],
        GAME_ART.gameplay.gates.purple.horizontal[3],
        GAME_ART.gameplay.gates.purple.vertical[1],
        GAME_ART.gameplay.gates.purple.vertical[2],
        GAME_ART.gameplay.gates.purple.vertical[3],
        GAME_ART.gameplay.gates.orange.horizontal[1],
        GAME_ART.gameplay.gates.orange.horizontal[2],
        GAME_ART.gameplay.gates.orange.horizontal[3],
        GAME_ART.gameplay.gates.orange.vertical[1],
        GAME_ART.gameplay.gates.orange.vertical[2],
        GAME_ART.gameplay.gates.orange.vertical[3],
        GAME_ART.gameplay.gates.pink.horizontal[1],
        GAME_ART.gameplay.gates.pink.horizontal[2],
        GAME_ART.gameplay.gates.pink.horizontal[3],
        GAME_ART.gameplay.gates.pink.vertical[1],
        GAME_ART.gameplay.gates.pink.vertical[2],
        GAME_ART.gameplay.gates.pink.vertical[3],
        GAME_ART.gameplay.gates.cyan.horizontal[1],
        GAME_ART.gameplay.gates.cyan.horizontal[2],
        GAME_ART.gameplay.gates.cyan.horizontal[3],
        GAME_ART.gameplay.gates.cyan.vertical[1],
        GAME_ART.gameplay.gates.cyan.vertical[2],
        GAME_ART.gameplay.gates.cyan.vertical[3],
        GAME_ART.gameplay.iceStrips.horizontal[1],
        GAME_ART.gameplay.iceStrips.horizontal[2],
        GAME_ART.gameplay.iceStrips.horizontal[3],
        GAME_ART.gameplay.iceStrips.vertical[1],
        GAME_ART.gameplay.iceStrips.vertical[2],
        GAME_ART.gameplay.iceStrips.vertical[3],
        GAME_ART.gameplay.gateDirectionArrow,
        GAME_ART.gameplay.emptyCell,
        GAME_ART.gameplay.boardRim.horizontal[1],
        GAME_ART.gameplay.boardRim.horizontal[2],
        GAME_ART.gameplay.boardRim.horizontal[3],
        GAME_ART.gameplay.boardRim.vertical[1],
        GAME_ART.gameplay.boardRim.vertical[2],
        GAME_ART.gameplay.boardRim.vertical[3],
        GAME_ART.gameplay.boardRim.corners.southWest,
        GAME_ART.gameplay.boardRim.corners.southEast,
        GAME_ART.gameplay.boardRim.corners.northWest,
        GAME_ART.gameplay.boardRim.corners.northEast,
        GAME_ART.gameplay.shutter,
        GAME_ART.gameplay.iceCover,
        GAME_ART.gameplay.progressionMechanics,
        GAME_ART.gameplay.layerPreviewBadges,
        GAME_ART.gameplay.videoParity.movementAxis,
        GAME_ART.gameplay.videoParity.keyToken,
        GAME_ART.gameplay.videoParity.chainLock,
        GAME_ART.gameplay.videoParity.keyTokens.red,
        GAME_ART.gameplay.videoParity.keyTokens.blue,
        GAME_ART.gameplay.videoParity.keyTokens.green,
        GAME_ART.gameplay.videoParity.keyTokens.yellow,
        GAME_ART.gameplay.videoParity.keyTokens.orange,
        GAME_ART.gameplay.videoParity.keyTokens.pink,
        GAME_ART.gameplay.videoParity.keyTokens.cyan,
        GAME_ART.gameplay.videoParity.chainLocks.red,
        GAME_ART.gameplay.videoParity.chainLocks.blue,
        GAME_ART.gameplay.videoParity.chainLocks.green,
        GAME_ART.gameplay.videoParity.chainLocks.yellow,
        GAME_ART.gameplay.videoParity.chainLocks.orange,
        GAME_ART.gameplay.videoParity.chainLocks.pink,
        GAME_ART.gameplay.videoParity.chainLocks.cyan,
        GAME_ART.gameplay.videoParity.liftFrame,
        GAME_ART.gameplay.videoParity.stagedFrame,
        GAME_ART.gameplay.videoParity.sideGenerator,
        GAME_ART.gameplay.videoParity.timedFeeder,
        GAME_ART.fx.particleSpark,
        GAME_ART.fx.blockGrabHalo,
        GAME_ART.fx.blockerFocusCorners,
        GAME_ART.fx.strategyFocusCorners,
        GAME_ART.fx.mechanicRelayMote,
        GAME_ART.ui.gameplay.backButton,
        GAME_ART.ui.gameplay.pauseButton,
        GAME_ART.ui.gameplay.levelPill,
        GAME_ART.ui.gameplay.timerIcon,
        GAME_ART.ui.gameplay.timerPanel,
        GAME_ART.ui.gameplay.boosterBase,
        GAME_ART.ui.gameplay.boosterCountBadge,
        GAME_ART.ui.gameplay.boosterPlus,
        GAME_ART.ui.gameplay.boosterTime,
        GAME_ART.ui.gameplay.boosterRocket,
        GAME_ART.ui.gameplay.boosterPulse,
        GAME_ART.gameplay.formalFloor,
        GAME_ART.gameplay.formalIceCell,
        GAME_ART.fx.formalSelectionFrame,
        ...initialPlan.requests.map((request) => request.path),
        ...initialIcePlan.requests.map((request) => request.path),
      ]);
      const singleBlocks: Record<BlockColor, HTMLImageElement> = {
        red: redBlock,
        blue: blueBlock,
        green: greenBlock,
        yellow: yellowBlock,
        purple: purpleBlock,
        orange: orangeBlock,
        pink: pinkBlock,
        cyan: cyanBlock,
      };
      const initialFormalBlockImages = initialFormalGameplayImages.slice(0, initialPlan.requests.length);
      const initialFormalIceImages = initialFormalGameplayImages.slice(initialPlan.requests.length);
      this.formalBlockDynamicImages = initialFormalBlockImages;
      this.formalBlockArtSignature = initialPlan.signature;
      this.formalBlockArtRequestSignature = undefined;
      this.formalBlockArtFailedSignature = undefined;
      this.formalBlockArtError = undefined;
      this.formalIceDynamicImages = initialFormalIceImages;
      this.formalIceArtSignature = initialIcePlan.signature;
      this.formalIceArtRequestSignature = undefined;
      this.formalIceArtFailedSignature = undefined;
      this.formalIceArtError = undefined;
      this.art = {
        ...this.art,
        gameplayBackground,
        gameplayUi: {
          backButton: gameplayBackButton,
          pauseButton: gameplayPauseButton,
          levelPill: gameplayLevelPill,
          timerIcon: gameplayTimerIcon,
          timerPanel: gameplayTimerPanel,
          boosterBase: gameplayBoosterBase,
          boosterCountBadge: gameplayBoosterCountBadge,
          boosterPlus: gameplayBoosterPlus,
          boosterTime: gameplayBoosterTime,
          boosterRocket: gameplayBoosterRocket,
          boosterPulse: gameplayBoosterPulse,
        },
        boosters,
        boosterUnlockBanner,
        discoveryBadge,
        mechanics,
        buttons,
        systemIcons,
        pauseSettings: {
          panel: pausePanel,
          close: pauseClose,
          sound: pauseSound,
          haptic: pauseHaptic,
          effects: pauseEffects,
          toggleOn: pauseToggleOn,
          toggleOff: pauseToggleOff,
          replayButton: pauseReplay,
          homeButton: pauseHome,
          clearProgressButton: pauseClear,
        },
        statusOverlay: {
          remainingPanel: statusRemainingPanel,
          clock: statusClock,
          featureIceDoor: statusFeatureIceDoor,
        },
        blockCells: singleBlocks,
        plainBlockCells: singleBlocks,
        formalBlocks: this.buildFormalBlockArt(singleBlocks, initialPlan.requests, initialFormalBlockImages),
        gateDirectionArrow,
        gates: {
          red: {
            horizontal: { 1: redGateHorizontal1, 2: redGateHorizontal2, 3: redGateHorizontal3 },
            vertical: { 1: redGateVertical1, 2: redGateVertical2, 3: redGateVertical3 },
          },
          blue: {
            horizontal: { 1: blueGateHorizontal1, 2: blueGateHorizontal2, 3: blueGateHorizontal3 },
            vertical: { 1: blueGateVertical1, 2: blueGateVertical2, 3: blueGateVertical3 },
          },
          green: {
            horizontal: { 1: greenGateHorizontal1, 2: greenGateHorizontal2, 3: greenGateHorizontal3 },
            vertical: { 1: greenGateVertical1, 2: greenGateVertical2, 3: greenGateVertical3 },
          },
          yellow: {
            horizontal: { 1: yellowGateHorizontal1, 2: yellowGateHorizontal2, 3: yellowGateHorizontal3 },
            vertical: { 1: yellowGateVertical1, 2: yellowGateVertical2, 3: yellowGateVertical3 },
          },
          purple: {
            horizontal: { 1: purpleGateHorizontal1, 2: purpleGateHorizontal2, 3: purpleGateHorizontal3 },
            vertical: { 1: purpleGateVertical1, 2: purpleGateVertical2, 3: purpleGateVertical3 },
          },
          orange: {
            horizontal: { 1: orangeGateHorizontal1, 2: orangeGateHorizontal2, 3: orangeGateHorizontal3 },
            vertical: { 1: orangeGateVertical1, 2: orangeGateVertical2, 3: orangeGateVertical3 },
          },
          pink: {
            horizontal: { 1: pinkGateHorizontal1, 2: pinkGateHorizontal2, 3: pinkGateHorizontal3 },
            vertical: { 1: pinkGateVertical1, 2: pinkGateVertical2, 3: pinkGateVertical3 },
          },
          cyan: {
            horizontal: { 1: cyanGateHorizontal1, 2: cyanGateHorizontal2, 3: cyanGateHorizontal3 },
            vertical: { 1: cyanGateVertical1, 2: cyanGateVertical2, 3: cyanGateVertical3 },
          },
        },
        iceStrips: {
          horizontal: { 1: iceStripHorizontal1, 2: iceStripHorizontal2, 3: iceStripHorizontal3 },
          vertical: { 1: iceStripVertical1, 2: iceStripVertical2, 3: iceStripVertical3 },
        },
        formalFloor,
        formalIceBlocks: this.buildFormalIceBlockArt(formalIceCell, initialIcePlan.requests, initialFormalIceImages),
        formalIceCell,
        emptyCell,
        boardRim: {
          horizontal: { 1: boardRimHorizontal1, 2: boardRimHorizontal2, 3: boardRimHorizontal3 },
          vertical: { 1: boardRimVertical1, 2: boardRimVertical2, 3: boardRimVertical3 },
          corners: {
            southWest: boardCornerSouthWest,
            southEast: boardCornerSouthEast,
            northWest: boardCornerNorthWest,
            northEast: boardCornerNorthEast,
          },
        },
        shutter,
        iceCover,
        progressionMechanics,
        layerPreviewBadges,
        videoParity: {
          movementAxis: movementAxisOverlay,
          keyToken,
          chainLock,
          keyTokens: {
            red: redKeyToken,
            blue: blueKeyToken,
            green: greenKeyToken,
            yellow: yellowKeyToken,
            purple: keyToken,
            orange: orangeKeyToken,
            pink: pinkKeyToken,
            cyan: cyanKeyToken,
          },
          chainLocks: {
            red: redChainLock,
            blue: blueChainLock,
            green: greenChainLock,
            yellow: yellowChainLock,
            purple: chainLock,
            orange: orangeChainLock,
            pink: pinkChainLock,
            cyan: cyanChainLock,
          },
          liftFrame,
          stagedFrame,
          sideGenerator,
          timedFeeder,
        },
        particleSpark,
        blockGrabHalo,
        blockerFocusCorners,
        strategyFocusCorners,
        mechanicRelayMote,
        formalSelectionFrame,
      };
      this.artReady = true;
      this.artLoadError = undefined;
      this.artLoadFailurePhase = undefined;
      this.artFullLoadMs = Date.now() - this.artLoadStartedAt;
      this.dirty = true;
      this.scheduleFrame();
      // The supplied star/generator cut-outs are optional overlays. Load them
      // after the critical gameplay shell so a missing replacement asset never
      // prevents a level from opening; the renderer keeps its existing atlas
      // fallback until this request completes.
      void this.loadFormalStarAndGeneratorArt();
    } catch (error) {
      this.failArtLoad("deferred", error);
    }
  }

  private async loadFormalStarAndGeneratorArt(): Promise<void> {
    const starShapeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
    const paths = [
      GAME_ART.gameplay.videoParity.sideGeneratorVertical,
      ...starShapeIds.map((shapeId) => GAME_ART.gameplay.starBlocks[shapeId]),
      GAME_ART.gameplay.starGates.horizontal[1],
      GAME_ART.gameplay.starGates.horizontal[2],
      GAME_ART.gameplay.starGates.horizontal[3],
      GAME_ART.gameplay.starGates.vertical[1],
      GAME_ART.gameplay.starGates.vertical[2],
      GAME_ART.gameplay.starGates.vertical[3],
    ];
    try {
      const images = await this.loadImages(paths);
      if (!this.artReady) {
        images.forEach((image) => this.host.releaseImage?.(image));
        return;
      }
      const [sideGeneratorVertical, ...overlays] = images;
      const starBlocks = Object.fromEntries(
        starShapeIds.map((shapeId, index) => [shapeId, overlays[index]]),
      ) as StarBlockArt;
      const gateImages = overlays.slice(starShapeIds.length);
      const starGates: DirectionalStripArt = {
        horizontal: { 1: gateImages[0], 2: gateImages[1], 3: gateImages[2] },
        vertical: { 1: gateImages[3], 2: gateImages[4], 3: gateImages[5] },
      };
      const previousImages = this.formalStarDynamicImages;
      this.formalStarDynamicImages = images;
      this.art.videoParity = this.art.videoParity
        ? { ...this.art.videoParity, sideGeneratorVertical }
        : undefined;
      this.art.starBlocks = starBlocks;
      this.art.starGates = starGates;
      previousImages.forEach((image) => this.host.releaseImage?.(image));
      this.dirty = true;
      this.scheduleFrame();
    } catch {
      // Optional art deliberately falls back to the existing generic star mark
      // and horizontal generator when a designer is replacing files.
    }
  }

  private formalPageImages(art: FormalPageArt): HTMLImageElement[] {
    if (art.screen === "supply") {
      return [
        art.reference,
        art.buyButton,
        art.boosterTile,
        art.priceCoin,
        ...Object.values(art.boosterIcons),
      ];
    }
    if (art.screen === "leaderboard") {
      return [
        art.background,
        art.topHeader,
        art.titlePanel,
        art.title,
        art.tabsFrame,
        art.tabActive,
        art.tabInactive,
        art.podium,
        ...Object.values(art.avatars),
        ...art.podiumNameplates,
        ...art.podiumMedals,
        ...art.rankMedals,
        art.row,
        art.levelPill,
        art.playerRow,
        art.playerLevelPill,
        art.star,
      ];
    }
    if (art.screen === "records") {
      return [
        art.panel,
        art.close,
        art.titleShadow,
        art.card,
        art.lockedOverlay,
        art.lock,
        art.selected,
        art.detailPanel,
        art.detailBody,
        ...art.itemImages,
      ];
    }
    return [
      art.background,
      art.topHeader,
      art.titlePanel,
      art.title,
      art.track,
      art.trackProgress,
      art.destination,
      art.currentMarker,
      art.levelCardLeft,
      art.levelCardActiveLeft,
      art.rewardCardRight,
      art.rewardCardActiveRight,
      ...art.deferred.images,
      art.lockedShade,
      art.episodeRangePanel,
      art.episodeSelectedButton,
      art.episodeActionButton,
      art.lock,
      ...Object.values(art.rewards),
    ];
  }

  private releaseFormalArt(art: FormalPageArt): void {
    // Deferred images own their pending requests; disposing prevents a late
    // completion from reviving art after this page has been left.
    if (art.screen === "levels") art.deferred.dispose();
    for (const image of this.formalPageImages(art)) this.host.releaseImage?.(image);
  }

  private releaseFormalPageArt(): void {
    this.formalPageArtRequestToken += 1;
    this.formalPageArtRequest = undefined;
    this.formalPageArtError = undefined;
    this.formalPageArtErrorScreen = undefined;
    const retained = new Set<FormalPageArt>();
    if (this.formalPageArt) retained.add(this.formalPageArt);
    for (const art of Object.values(this.formalPageArtCache)) {
      if (art) retained.add(art);
    }
    for (const art of retained) {
      this.releaseFormalArt(art);
    }
    this.formalPageArt = undefined;
    this.formalPageArtCache = {};
  }

  private winArtImages(art: WinArt): HTMLImageElement[] {
    return [
      art.panel,
      art.glow,
      art.rewardPill,
      art.coinPile,
      art.continueButton,
      art.close,
    ];
  }

  private releaseWinArt(): void {
    this.winArtRequestToken += 1;
    this.winArtLoading = false;
    this.winArtError = undefined;
    if (!this.winArt) return;
    for (const image of this.winArtImages(this.winArt)) this.host.releaseImage?.(image);
    this.winArt = undefined;
  }

  private releaseLifeRefillArt(): void {
    this.lifeRefillArtRequestToken += 1;
    this.lifeRefillArtLoading = false;
    this.lifeRefillArtError = undefined;
    if (!this.lifeRefillArt) return;
    for (const image of Object.values(this.lifeRefillArt)) this.host.releaseImage?.(image);
    this.lifeRefillArt = undefined;
  }

  private requestLifeRefillArt(): void {
    if (this.lifeRefillArt || this.lifeRefillArtLoading) return;
    const token = ++this.lifeRefillArtRequestToken;
    this.lifeRefillArtLoading = true;
    this.lifeRefillArtError = undefined;
    // Reuse the supplied coin pile and blue value plate without retaining the
    // full victory panel/glow on Home or changing positive victory rewards.
    void this.loadImages([GAME_ART.ui.win.coinPile, GAME_ART.ui.win.rewardPill]).then((images) => {
      if (token !== this.lifeRefillArtRequestToken || !this.lifeRefillOpen) {
        for (const image of images) this.host.releaseImage?.(image);
        return;
      }
      this.lifeRefillArt = { coinPile: images[0], rewardPill: images[1] };
      this.lifeRefillArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.lifeRefillArtRequestToken) return;
      this.lifeRefillArtLoading = false;
      this.lifeRefillArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private collectionAlbumArtImages(art: CollectionAlbumArt): HTMLImageElement[] {
    return Object.values(art);
  }

  private releaseCollectionAlbumArt(): void {
    this.collectionAlbumArtRequestToken += 1;
    this.collectionAlbumArtworkRequestToken += 1;
    this.collectionAlbumArtLoading = false;
    this.collectionAlbumArtError = undefined;
    this.collectionAlbumArtworkPlan = "";
    if (this.collectionAlbumArt) {
      for (const image of this.collectionAlbumArtImages(this.collectionAlbumArt)) {
        this.host.releaseImage?.(image);
      }
      this.collectionAlbumArt = undefined;
    }
    this.collectionAlbumArtwork?.dispose();
    this.collectionAlbumArtwork = undefined;
  }

  private releaseAchievementArt(): void {
    this.achievementArtRequestToken += 1;
    this.achievementArtLoading = false;
    this.achievementArtError = undefined;
    if (!this.achievementArt) return;
    for (const image of Object.values(this.achievementArt)) this.host.releaseImage?.(image);
    this.achievementArt = undefined;
  }

  private requestAchievementArt(): void {
    if (this.achievementArt || this.achievementArtLoading) return;
    const token = ++this.achievementArtRequestToken;
    this.achievementArtLoading = true;
    this.achievementArtError = undefined;
    const paths = GAME_ART.ui.achievements;
    const keys = Object.keys(paths) as (keyof AchievementArtUrls)[];
    void this.loadImages(keys.map((key) => paths[key])).then((images) => {
      if (token !== this.achievementArtRequestToken || this.screen !== "achievements") {
        for (const image of images) this.host.releaseImage?.(image);
        return;
      }
      this.achievementArt = Object.fromEntries(keys.map((key, index) => [key, images[index]])) as AchievementArt;
      this.achievementArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.achievementArtRequestToken) return;
      this.achievementArtLoading = false;
      this.achievementArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private dailyTaskArtImages(art: DailyTaskArt): HTMLImageElement[] {
    return Object.values(art);
  }

  private releaseDailyTaskArt(): void {
    this.dailyTaskArtRequestToken += 1;
    this.dailyTaskArtLoading = false;
    this.dailyTaskArtError = undefined;
    if (this.dailyTaskArt) {
      for (const image of this.dailyTaskArtImages(this.dailyTaskArt)) this.host.releaseImage?.(image);
    }
    this.dailyTaskArt = undefined;
    if (this.dailyTaskInspirationArt && this.dailyTaskInspirationArt !== this.inspirationFlightArt) {
      this.host.releaseImage?.(this.dailyTaskInspirationArt);
    }
    this.dailyTaskInspirationArt = undefined;
  }

  private requestDailyTaskArt(): void {
    if (this.dailyTaskArt || this.dailyTaskArtLoading) return;
    const token = ++this.dailyTaskArtRequestToken;
    this.dailyTaskArtLoading = true;
    this.dailyTaskArtError = undefined;
    const paths = GAME_ART.ui.dailyTasks;
    const keys = Object.keys(paths) as (keyof DailyTaskArtUrls)[];
    void this.loadImages([
      ...keys.map((key) => paths[key]),
      GAME_ART.ui.collectionAlbum.inspiration,
    ]).then((images) => {
      if (token !== this.dailyTaskArtRequestToken || this.screen !== "dailyTasks") {
        for (const image of images) this.host.releaseImage?.(image);
        return;
      }
      this.dailyTaskArt = Object.fromEntries(keys.map((key, index) => [key, images[index]])) as DailyTaskArt;
      this.dailyTaskInspirationArt = images[keys.length];
      this.dailyTaskArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.dailyTaskArtRequestToken) return;
      this.dailyTaskArtLoading = false;
      this.dailyTaskArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private collectionAlbumAtlasIndex(item: CollectionCatalogItem): number {
    const cell = item.category === "level" ? item.levelId - 1 : item.catalogNumber - 1;
    const offset = item.category === "level" ? 0 : GAME_ART.ui.collectionCardAtlases.levels.length;
    return offset + Math.floor(Math.max(0, cell) / 25);
  }

  private collectionAlbumPageAtlasIndexes(page: number, tab = this.collectionAlbumTab): number[] {
    const items = collectionCatalogFor(tab === "levels" ? "level" : "masterpiece");
    if (page < 0 || page >= Math.ceil(items.length / COLLECTION_ALBUM_PAGE_SIZE)) return [];
    return [...new Set(items.slice(page * COLLECTION_ALBUM_PAGE_SIZE, (page + 1) * COLLECTION_ALBUM_PAGE_SIZE)
      .map((item) => this.collectionAlbumAtlasIndex(item)))];
  }

  private collectionAlbumCurrentAtlasIndexes(): number[] {
    const indexes = this.collectionAlbumPageAtlasIndexes(this.collectionAlbumLayout().pagination.pageIndex);
    const detail = this.collectionAlbumDetailId ? findCollectionCatalogItem(this.collectionAlbumDetailId) : undefined;
    if (detail) indexes.push(this.collectionAlbumAtlasIndex(detail));
    return [...new Set(indexes)];
  }

  private collectionAlbumArtworkReady(): boolean {
    return Boolean(this.collectionAlbumArtwork)
      && this.collectionAlbumCurrentAtlasIndexes().every((index) => this.collectionAlbumArtwork?.image(index));
  }

  private collectionAlbumItemArtworkFailed(item: CollectionCatalogItem | undefined): boolean {
    return Boolean(item && this.collectionAlbumArtwork?.failedIndexes.includes(this.collectionAlbumAtlasIndex(item)));
  }

  private requestCollectionAlbumArtwork(retry = false): void {
    if (!this.collectionAlbumArtwork) {
      this.collectionAlbumArtwork = new CollectionArtworkStore({
        paths: [...GAME_ART.ui.collectionCardAtlases.levels, ...GAME_ART.ui.collectionCardAtlases.masterpieces],
        loadImage: async (path) => {
          const image = await this.host.createImage(path);
          this.artLoadedImageCount += 1;
          return image;
        },
        releaseImage: (image) => this.host.releaseImage?.(image),
        onChange: () => {
          this.dirty = true;
          this.scheduleFrame();
        },
      });
    }
    const store = this.collectionAlbumArtwork;
    const page = this.collectionAlbumLayout().pagination.pageIndex;
    const tab = this.collectionAlbumTab;
    const plan = `${tab}:${page}:${this.collectionAlbumDetailId ?? ""}`;
    if (!retry && this.collectionAlbumArtworkPlan === plan) return;
    this.collectionAlbumArtworkPlan = plan;
    const token = ++this.collectionAlbumArtworkRequestToken;
    // Publish each current-page atlas independently. Only then prefetch the
    // adjacent pages in this category; never pull in the other category.
    void store.request(this.collectionAlbumCurrentAtlasIndexes(), retry).then(() => {
      if (this.collectionAlbumArtwork !== store || token !== this.collectionAlbumArtworkRequestToken
        || !this.collectionAlbumVisible()) return;
      const neighbors = [...this.collectionAlbumPageAtlasIndexes(page + 1, tab),
        ...this.collectionAlbumPageAtlasIndexes(page - 1, tab)];
      void store.request(neighbors, false, false).catch(() => {});
    }).catch(() => {
      // Failed slots remain visible and retry only after an explicit click.
    });
  }

  private requestCollectionAlbumArt(): void {
    this.requestCollectionAlbumArtwork();
    if (this.collectionAlbumArt || this.collectionAlbumArtLoading) return;
    const token = ++this.collectionAlbumArtRequestToken;
    this.collectionAlbumArtLoading = true;
    this.collectionAlbumArtError = undefined;
    const paths = GAME_ART.ui.collectionAlbum;
    const keys = Object.keys(paths) as (keyof CollectionAlbumArtUrls)[];
    void this.loadImages(keys.map((key) => paths[key])).then((images) => {
      if (token !== this.collectionAlbumArtRequestToken || !this.collectionAlbumVisible()) {
        for (const image of images) this.host.releaseImage?.(image);
        return;
      }
      this.collectionAlbumArt = Object.fromEntries(keys.map((key, index) => [key, images[index]])) as CollectionAlbumArt;
      this.collectionAlbumArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.collectionAlbumArtRequestToken) return;
      this.collectionAlbumArtLoading = false;
      this.collectionAlbumArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private requestWinArt(): void {
    if (this.winArt || this.winArtLoading) return;
    const token = ++this.winArtRequestToken;
    this.winArtLoading = true;
    this.winArtError = undefined;
    const paths = GAME_ART.ui.win;
    void this.loadImages([
      paths.panel,
      paths.glow,
      paths.rewardPill,
      paths.coinPile,
      paths.continueButton,
      paths.close,
    ]).then((images) => {
      if (token !== this.winArtRequestToken) {
        for (const image of images) this.host.releaseImage?.(image);
        return;
      }
      let cursor = 0;
      const take = (): HTMLImageElement => images[cursor++];
      this.winArt = {
        panel: take(),
        glow: take(),
        rewardPill: take(),
        coinPile: take(),
        continueButton: take(),
        close: take(),
      };
      this.winArtLoading = false;
      this.dirty = true;
      this.scheduleFrame();
    }).catch((error: unknown) => {
      if (token !== this.winArtRequestToken) return;
      this.winArtLoading = false;
      this.winArtError = error instanceof Error ? error.message : String(error);
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private formalPageArtFor(screen: FormalMetaPage): FormalPageArt | undefined {
    return this.formalPageArt?.screen === screen
      ? this.formalPageArt
      : this.formalPageArtCache[screen];
  }

  private retainCurrentFormalPageArt(): void {
    const current = this.formalPageArt;
    if (!current) return;
    const previous = this.formalPageArtCache[current.screen];
    if (previous && previous !== current) {
      this.releaseFormalArt(previous);
    }
    this.formalPageArtCache[current.screen] = current;
    this.formalPageArt = undefined;
  }

  private pruneFormalPageArt(screen?: FormalMetaPage): void {
    if (!screen) {
      this.releaseFormalPageArt();
      return;
    }
    const keep = this.formalPageArtFor(screen);
    const releases = new Set<FormalPageArt>();
    if (this.formalPageArt && this.formalPageArt !== keep) releases.add(this.formalPageArt);
    for (const art of Object.values(this.formalPageArtCache)) {
      if (art && art !== keep) releases.add(art);
    }
    for (const art of releases) {
      this.releaseFormalArt(art);
    }
    this.formalPageArt = keep;
    this.formalPageArtCache = {};
    if (this.formalPageArtRequest && this.formalPageArtRequest.screen !== screen) {
      this.formalPageArtRequestToken += 1;
      this.formalPageArtRequest = undefined;
    }
    if (!this.formalPageArtRequest && this.formalPageArtErrorScreen !== screen) {
      this.formalPageArtError = undefined;
      this.formalPageArtErrorScreen = undefined;
    }
  }

  private requestFormalPageArt(screen: FormalMetaPage): void {
    const retained = this.formalPageArtCache[screen];
    if (this.formalPageArt?.screen === screen) return;
    if (retained) {
      this.retainCurrentFormalPageArt();
      delete this.formalPageArtCache[screen];
      this.formalPageArt = retained;
      if (this.formalPageArtRequest?.screen !== screen) {
        this.formalPageArtRequestToken += 1;
        this.formalPageArtRequest = undefined;
      }
      this.formalPageArtError = undefined;
      this.formalPageArtErrorScreen = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.formalPageArtRequest?.screen === screen) return;
    this.retainCurrentFormalPageArt();
    if (this.formalPageArtRequest) {
      this.formalPageArtRequestToken += 1;
      this.formalPageArtRequest = undefined;
    }
    const token = ++this.formalPageArtRequestToken;
    this.formalPageArtRequest = { screen, token };
    this.formalPageArtError = undefined;
    this.formalPageArtErrorScreen = undefined;

    void (async () => {
      let art: FormalPageArt;
      if (screen === "supply") {
        const paths = GAME_ART.ui.formalPages.shop;
        const [reference, buyButton, boosterTile, priceCoin, time, rocket, pulse] = await this.loadImages([
          paths.reference,
          paths.buyButton,
          paths.boosterTile,
          paths.priceCoin,
          paths.time,
          paths.rocket,
          paths.pulse,
        ]);
        art = { screen, reference, buyButton, boosterTile, priceCoin, boosterIcons: { time, rocket, pulse } };
      } else if (screen === "leaderboard") {
        const paths = GAME_ART.ui.formalPages.leaderboard;
        const images = await this.loadImages([
          paths.background,
          paths.topHeader,
          paths.titlePanel,
          paths.title,
          paths.tabsFrame,
          paths.tabActive,
          paths.tabInactive,
          paths.podium,
          paths.avatars.fox,
          paths.avatars.raccoon,
          paths.avatars.panda,
          paths.avatars.rabbit,
          paths.avatars.cat,
          paths.podiumNameplates.gold,
          paths.podiumNameplates.silver,
          paths.podiumNameplates.bronze,
          paths.podiumMedals.gold,
          paths.podiumMedals.silver,
          paths.podiumMedals.bronze,
          paths.rankMedals.gold,
          paths.rankMedals.silver,
          paths.rankMedals.bronze,
          paths.row,
          paths.levelPill,
          paths.playerRow,
          paths.playerLevelPill,
          paths.star,
        ]);
        let cursor = 0;
        const take = (): HTMLImageElement => images[cursor++];
        art = {
          screen,
          background: take(),
          topHeader: take(),
          titlePanel: take(),
          title: take(),
          tabsFrame: take(),
          tabActive: take(),
          tabInactive: take(),
          podium: take(),
          avatars: { fox: take(), raccoon: take(), panda: take(), rabbit: take(), cat: take() },
          podiumNameplates: [take(), take(), take()],
          podiumMedals: [take(), take(), take()],
          rankMedals: [take(), take(), take()],
          row: take(),
          levelPill: take(),
          playerRow: take(),
          playerLevelPill: take(),
          star: take(),
        };
      } else if (screen === "levels") {
        const paths = GAME_ART.ui.formalPages.journey;
        const initialEpisodeIndexes = this.journeyEpisodeIndexesInView();
        const images = await this.loadImages([
          paths.background,
          paths.topHeader,
          paths.titlePanel,
          paths.title,
          paths.track,
          paths.trackProgress,
          paths.destination,
          paths.currentMarker,
          paths.levelCardLeft,
          paths.levelCardActiveLeft,
          paths.rewardCardRight,
          paths.rewardCardActiveRight,
          paths.lockedShade,
          paths.episodeRangePanel,
          paths.episodeSelectedButton,
          paths.episodeActionButton,
          paths.lock,
          paths.rewards.time,
          paths.rewards.rocket,
          paths.rewards.pulse,
          paths.rewards.heart,
          paths.rewards.coins,
          paths.rewards.complete,
          ...initialEpisodeIndexes.map((index) => paths.episodes[index]),
        ]);
        let cursor = 0;
        const take = (): HTMLImageElement => images[cursor++];
        art = {
          screen,
          background: take(),
          topHeader: take(),
          titlePanel: take(),
          title: take(),
          track: take(),
          trackProgress: take(),
          destination: take(),
          currentMarker: take(),
          levelCardLeft: take(),
          levelCardActiveLeft: take(),
          rewardCardRight: take(),
          rewardCardActiveRight: take(),
          lockedShade: take(),
          episodeRangePanel: take(),
          episodeSelectedButton: take(),
          episodeActionButton: take(),
          lock: take(),
          rewards: {
            time: take(),
            rocket: take(),
            pulse: take(),
            heart: take(),
            coins: take(),
            complete: take(),
          },
          deferred: new JourneyDeferredArt({
            episodePaths: paths.episodes,
            presentationPaths: paths.presentation,
            initialEpisodes: initialEpisodeIndexes.map((index) => ({ index, image: take() })),
            loadImage: async (path) => {
              const image = await this.host.createImage(path);
              this.artLoadedImageCount += 1;
              return image;
            },
            releaseImage: (image) => this.host.releaseImage?.(image),
            onChange: () => {
              this.dirty = true;
              this.scheduleFrame();
            },
          }),
        };
      } else {
        const paths = GAME_ART.ui.formalPages.collection;
        const images = await this.loadImages([
          paths.panel,
          paths.close,
          paths.titleShadow,
          paths.card,
          paths.lockedOverlay,
          paths.lock,
          paths.selected,
          paths.detailPanel,
          paths.detailBody,
          ...paths.itemImages,
        ]);
        let cursor = 0;
        const take = (): HTMLImageElement => images[cursor++];
        art = {
          screen,
          panel: take(),
          close: take(),
          titleShadow: take(),
          card: take(),
          lockedOverlay: take(),
          lock: take(),
          selected: take(),
          detailPanel: take(),
          detailBody: take(),
          itemImages: Array.from({ length: paths.itemImages.length }, take),
        };
      }

      if (this.formalPageArtRequest?.token !== token || this.formalPageArtRequest.screen !== screen) {
        this.releaseFormalArt(art);
        return;
      }
      this.formalPageArt = art;
      this.formalPageArtRequest = undefined;
      this.dirty = true;
      this.scheduleFrame();
    })().catch((error: unknown) => {
      if (this.formalPageArtRequest?.token !== token) return;
      this.formalPageArtRequest = undefined;
      this.formalPageArtError = error instanceof Error ? error.message : String(error);
      this.formalPageArtErrorScreen = screen;
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private setFormalPageIntent(screen: MainNavigationScreen): void {
    if (screen === "records") this.requestCollectionAlbumArt();
    else if (screen === "supply" || screen === "leaderboard" || screen === "levels") {
      this.requestFormalPageArt(screen);
    }
  }

  private formalPageForScreen(): FormalMetaPage | undefined {
    if (this.screen === "mechanismGuide") return "records";
    return this.screen === "supply" || this.screen === "leaderboard" || this.screen === "levels"
      ? this.screen
      : undefined;
  }

  private formalPageReady(screen: FormalMetaPage): boolean {
    return Boolean(this.formalPageArtFor(screen));
  }

  private formalPageFailed(screen: FormalMetaPage): boolean {
    return this.formalPageArtErrorScreen === screen && Boolean(this.formalPageArtError);
  }

  private retryFormalPageArt(screen: FormalMetaPage): void {
    const homeEpisodeUnlock = screen === "levels" && this.isHomeEpisodeUnlockPending();
    if ((this.formalPageForScreen() !== screen && !homeEpisodeUnlock) || this.formalPageArtRequest) return;
    this.formalPageArtError = undefined;
    this.formalPageArtErrorScreen = undefined;
    this.requestFormalPageArt(screen);
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
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

  loadLevel(id: number, play = false, preserveDirectTransition = false): void {
    // Never let navigation clear an immutable candidate whose storage bridge
    // returned an ambiguous result. The owning button must retry that exact
    // candidate before any other save mutation can proceed.
    if (this.pendingLifeStart || this.pendingLifeRefill
      || this.pendingSettlementAbandon
      || this.pendingSettlement
      || this.pendingSupplyPurchase
      || this.pendingJourneyClaim
      || this.pendingAchievementClaim
      || this.pendingDailyTaskClaim
      || this.pendingCollectionRestoration
      || this.pendingJourneyThemeSelection) {
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    const normalized = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(id)) || 1));
    if (play && !this.canStartCampaignAttempt()) return;
    this.playableClockSlices.reset();
    this.temporaryLevelSelector = undefined;
    if (!preserveDirectTransition) this.directLevelTransition = undefined;
    this.homeCoinFlight = undefined;
    this.save.activeRun = undefined;
    this.save.currentLevel = normalized;
    this.model = new PuzzleModel(getLevel(normalized), { deferExitCompletion: true });
    this.pendingButtonPress = undefined;
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
    this.winCoinReward = 0;
    this.assistedClear = false;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.pendingLifeStart = undefined;
    this.pendingSupplyPurchase = undefined;
    this.pendingJourneyClaim = undefined;
    this.pendingAchievementClaim = undefined;
    this.pendingDailyTaskClaim = undefined;
    this.pendingCollectionRestoration = undefined;
    this.pendingJourneyThemeSelection = undefined;
    this.boosterUnlockToast = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.settlementSaveAttempts = 0;
    this.particles = [];
    this.exitGhosts = [];
    this.exitPulses = [];
    this.generatorSpawnAnimations = [];
    this.exitFailure = undefined;
    this.revisedTransitions = [];
    this.mechanicPulses = [];
    this.boardShakeTime = 0;
    this.pendingCelebration = 0;
    this.runElapsedSeconds = 0;
    this.completionMetrics = undefined;
    this.winStarConditions = undefined;
    this.journeyPresentation = undefined;
    this.achievementScrollGesture = undefined;
    this.achievementFeedback = undefined;
    this.collectionAlbumDetailId = undefined;
    this.collectionAlbumFeedback = undefined;
    this.navigationTransition = undefined;
    this.navigationPendingTarget = undefined;
    this.screen = play ? "playing" : "home";
    this.releaseFormalPageArt();
    this.releaseWinArt();
    this.releaseCollectionAlbumArt();
    this.releaseAchievementArt();
    this.cancelDailyTaskRefreshWatch();
    this.releaseDailyTaskArt();
    if (play) this.save.activeRun = this.createRunJournal(normalized);
    this.captureInitialGeneratorSpawns();
    this.dirty = true;
    this.persist();
    this.scheduleFrame();
  }

  getDebugState(): Record<string, unknown> {
    const strategyFocusBlock = this.strategyFocusBlock();
    const strategyNudgePlan = this.strategyNudgeOrigins();
    const leaderboardSnapshot = this.leaderboardSnapshot();
    const leaderboard = this.leaderboardScrollView();
    const collectionItems = this.collectionItems();
    const collectionSelection = Math.max(0, collectionItems.findIndex((item) => item.id === this.collectionSelectedId));
    const selectedCollectionItem = collectionItems[collectionSelection] ?? collectionItems[0];
    const collectionView = this.collectionScrollView();
    const collectionAlbumSummary = this.collectionAlbumProgressSummary();
    const collectionAlbumItems = this.collectionAlbumItems();
    const collectionAlbumLayout = this.collectionAlbumLayout();
    const journeyView = this.journeyScrollView();
    const journeyPageArt = this.formalPageArtFor("levels");
    const deferredJourneyArt = journeyPageArt?.screen === "levels" ? journeyPageArt.deferred : undefined;
    const pendingCollectionItems = this.pendingCollectionDiscoveryItems();
    const pendingCollectionItemIdSet = new Set(pendingCollectionItems.map(({ id }) => id));
    const claimableJourneyRewardLevels = JOURNEY_MILESTONE_REWARDS
      .filter((reward) => this.journeyRewardClaimable(reward))
      .map(({ level }) => level);
    const achievementSummary = buildAchievementProgressSummary(this.save, this.save.achievementProgress);
    const dailyTaskSummary = this.dailyTaskSummary();
    const dailyRows = dailyTaskRows(dailyTaskSummary.tasks.map((task) => task.id));
    const selectedNavigationTab = this.isMainNavigationScreen(this.screen) || this.screen === "mechanismGuide"
      ? this.mainNavigationSelectedScreen()
      : undefined;
    const nowMs = Date.now();
    const lifeState = this.currentLifeState(nowMs);
    const starTargets = levelStarTargets(this.model.level);
    const settledStarConditions = this.winStarConditions ?? (this.pendingSettlement
      ? {
        passed: true as const,
        moves: this.pendingSettlement.presentation.moves,
        elapsedSeconds: this.pendingSettlement.presentation.elapsedSeconds,
        moveTarget: this.pendingSettlement.presentation.moveTarget,
        timeTargetSeconds: this.pendingSettlement.presentation.timeTargetSeconds,
        moveAchieved: this.pendingSettlement.presentation.moveAchieved,
        timeAchieved: this.pendingSettlement.presentation.timeAchieved,
        earnedStars: this.pendingSettlement.presentation.earnedStars,
      }
      : undefined);
    return {
      screen: this.screen,
      temporaryLevelTest: {
        active: Boolean(this.temporaryLevelTestSession),
        selectorOpen: Boolean(this.temporaryLevelSelector),
        selectedLevel: this.temporaryLevelSelector?.selectedLevel,
        page: this.temporaryLevelSelector?.page,
        baselineLevelId: this.temporaryLevelTestSession?.baselineLevelId,
        storageSuppressed: Boolean(this.temporaryLevelTestSession),
      },
      storage: {
        baselineReady: this.storageBaselineReady,
        status: this.storageBaselineReady ? "ready" : "unavailable",
        readAttempts: this.storageReadAttempts,
        durableBaselineStatus: this.durableStorageBaseline?.status ?? "unknown",
        normalizationPending: !this.temporaryLevelTestSession && this.storageBaselineReady && !(
          this.durableStorageBaseline?.status === "ok"
          && storageValuesEqual(this.durableStorageBaseline.value, this.save)
        ),
      },
      viewportTransform: this.viewportTransform(),
      level: this.model.level,
      starTargets,
      puzzle: this.model.snapshot(),
      selectedId: this.selectedId,
      activePointer: this.activePointer,
      buttonPress: this.pendingButtonPress ? {
        key: this.pendingButtonPress.key,
        pointerId: this.pendingButtonPress.pointerId,
        screen: this.pendingButtonPress.screen,
        inside: this.pendingButtonPress.inside,
        visualScale: this.buttonPressVisualScale(this.pendingButtonPress.key),
        renderedScale: this.renderedButtonPress?.key === this.pendingButtonPress.key
          ? this.renderedButtonPress.scale
          : undefined,
      } : undefined,
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
      settings: {
        sound: this.save.sound,
        haptic: this.save.haptic,
        reducedMotion: this.save.reducedMotion,
        language: this.save.language,
        languageSaveFailed: this.languageSaveFailed,
        languagePersistence: this.pendingLanguageSelection
          ? { status: "unknown", requestedLanguage: this.pendingLanguageSelection.language }
          : { status: this.languageSaveFailed ? "rejected" : "idle" },
        deviceLanguage: this.deviceLanguage,
        supportedLanguages: GAME_LANGUAGE_METADATA.map((entry) => ({ ...entry })),
      },
      audio: { scene: this.musicScene(), enabled: this.save.sound && this.appVisible },
      progression: { highestLevel: this.save.highestLevel, bestStars: { ...this.save.bestStars }, bestMoves: { ...this.save.bestMoves } },
      achievements: {
        open: this.screen === "achievements",
        completedCount: achievementSummary.completedAchievementCount,
        claimedCount: achievementSummary.claimedAchievementCount,
        claimableIds: [...achievementSummary.claimableIds],
        claimedIds: [...this.save.achievementProgress.claimedIds],
        pendingClaimId: this.pendingAchievementClaim?.id,
        notificationVisible: achievementSummary.hasClaimableAchievements,
        scrollOffset: this.achievementScrollOffset,
        maxScrollOffset: achievementScrollMaximum(achievementSummary.entries.length),
        feedback: this.achievementFeedback ? { ...this.achievementFeedback } : undefined,
        entries: sortAchievementEntries(achievementSummary.entries).map((entry, index) => ({
          ...entry,
          rect: homeArtRect(achievementRowPlacement(index, this.achievementScrollOffset)),
          claimRect: this.achievementClaimRect(index),
          rewardRect: homeArtRect({
            ...ACHIEVEMENT_LAYOUT.reward,
            y: ACHIEVEMENT_LAYOUT.reward.y + index * ACHIEVEMENT_LAYOUT.rowPitch - this.achievementScrollOffset,
          }),
          rewardIconRect: homeArtRect({
            x: ACHIEVEMENT_LAYOUT.reward.x + 15,
            y: ACHIEVEMENT_LAYOUT.reward.y + index * ACHIEVEMENT_LAYOUT.rowPitch
              - this.achievementScrollOffset + ACHIEVEMENT_LAYOUT.reward.height / 2,
            width: 1,
            height: 1,
          }),
        })),
        entryRect: BUTTONS.homeAchievements,
        closeRect: BUTTONS.achievementClose,
        artReady: Boolean(this.achievementArt),
        art: {
          requested: this.achievementArtLoading,
          ready: Boolean(this.achievementArt),
          error: this.achievementArtError,
          splitAssetCount: Object.keys(GAME_ART.ui.achievements).length,
          loadedImages: this.achievementArt ? Object.keys(this.achievementArt).length : 0,
        },
      },
      dailyTasks: {
        open: this.screen === "dailyTasks",
        dayKey: dailyTaskSummary.dayKey,
        nextResetMs: millisecondsUntilNextLocalDay(new Date(nowMs)),
        completedCount: dailyTaskSummary.completedCount,
        claimedCount: dailyTaskSummary.claimedCount,
        bonusRewardInspiration: dailyTaskSummary.bonusRewardInspiration,
        bonusClaimable: dailyTaskSummary.bonusClaimable,
        bonusClaimed: dailyTaskSummary.bonusClaimed,
        inspiration: this.save.collectionProgress.inspiration,
        notificationVisible: this.dailyTaskHasNotification(),
        pendingClaimId: this.pendingDailyTaskClaim?.id,
        feedback: this.dailyTaskFeedback ? { ...this.dailyTaskFeedback } : undefined,
        entryRect: this.dailyTaskHomeEntryRect(),
        closeRect: this.dailyTaskCloseRect(),
        bonusClaimRect: this.dailyTaskBonusClaimRect(),
        bonusRewardRect: homeArtRect(DAILY_TASK_LAYOUT.bonusReward),
        bonusRewardIconRect: homeArtRect({
          x: DAILY_TASK_LAYOUT.bonusReward.x + 17.5,
          y: DAILY_TASK_LAYOUT.bonusReward.y + DAILY_TASK_LAYOUT.bonusReward.height / 2,
          width: 1,
          height: 1,
        }),
        art: {
          requested: this.dailyTaskArtLoading,
          ready: Boolean(this.dailyTaskArt),
          error: this.dailyTaskArtError,
          splitAssetCount: Object.keys(GAME_ART.ui.dailyTasks).length + 1,
          loadedImages: this.dailyTaskArt ? this.dailyTaskArtImages(this.dailyTaskArt).length : 0,
          inspirationReady: Boolean(this.dailyTaskInspirationArt),
          entryReady: Boolean(this.art.homeUi?.dailyTaskEntry),
        },
        entries: dailyTaskSummary.tasks.map((task, index) => ({
          ...task,
          rowRect: homeArtRect(dailyRows[index].row),
          rewardRect: homeArtRect(dailyRows[index].reward),
          rewardIconRect: homeArtRect({
            x: dailyRows[index].reward.x + 16.5,
            y: dailyRows[index].reward.y + 15.5,
            width: 1,
            height: 1,
          }),
          claimRect: homeArtRect(dailyRows[index].claim),
        })),
      },
      collectionAlbum: {
        open: this.screen === "records" || this.screen === "mechanismGuide",
        guideOpen: this.screen === "mechanismGuide",
        presentation: "page",
        tab: this.collectionAlbumTab,
        pageIndex: collectionAlbumLayout.pagination.pageIndex,
        pageNumber: collectionAlbumLayout.pagination.pageNumber,
        pageCount: collectionAlbumLayout.pagination.pageCount,
        detailId: this.collectionAlbumDetailId,
        pendingRestorationId: this.pendingCollectionRestoration?.id,
        feedback: this.collectionAlbumFeedback ? { ...this.collectionAlbumFeedback } : undefined,
        inspiration: this.save.collectionProgress.inspiration,
        restoredMasterpieceIds: [...this.save.collectionProgress.restoredMasterpieceIds],
        seenItemIds: [...this.save.collectionProgress.seenItemIds],
        obtainedLevelCardCount: collectionAlbumSummary.obtainedLevelCardCount,
        levelCardCount: collectionAlbumSummary.levelCards.length,
        restoredMasterpieceCount: collectionAlbumSummary.restoredMasterpieceCount,
        masterpieceCount: collectionAlbumSummary.masterpieces.length,
        notificationVisible: this.collectionAlbumHasNotification(),
        masterpieceTabNotificationVisible: this.collectionAlbumHasRestorableMasterpiece(collectionAlbumSummary),
        entryRect: this.mainNavigationRect(4),
        art: {
          requested: this.collectionAlbumArtLoading || Boolean(this.collectionAlbumArtwork?.pendingIndexes.length),
          ready: Boolean(this.collectionAlbumArt),
          artworkReady: this.collectionAlbumArtworkReady(),
          error: this.collectionAlbumArtError,
          artworkError: this.collectionAlbumCurrentAtlasIndexes().some((index) =>
            this.collectionAlbumArtwork?.failedIndexes.includes(index)) ? this.tr("page.loadFailed") : undefined,
          loadedImages: (this.collectionAlbumArt ? this.collectionAlbumArtImages(this.collectionAlbumArt).length : 0)
            + (this.collectionAlbumArtwork?.images.length ?? 0),
          splitAssetCount: Object.keys(GAME_ART.ui.collectionAlbum).length
            + GAME_ART.ui.collectionCardAtlases.levels.length
            + GAME_ART.ui.collectionCardAtlases.masterpieces.length,
          artworkAtlasCount: this.collectionAlbumArtwork?.images.length ?? 0,
          currentAtlasIndexes: this.collectionAlbumCurrentAtlasIndexes(),
          loadedAtlasIndexes: this.collectionAlbumArtwork?.loadedIndexes ?? [],
          pendingAtlasIndexes: this.collectionAlbumArtwork?.pendingIndexes ?? [],
          failedAtlasIndexes: this.collectionAlbumArtwork?.failedIndexes ?? [],
          artworkIllustrationCount: GAME_ART.ui.collectionCardAtlases.levels.length * 25
            + Math.min(40, GAME_ART.ui.collectionCardAtlases.masterpieces.length * 25),
          entryReady: Boolean(this.art.homeUi?.collectionAlbumEntry),
        },
        layout: collectionAlbumLayout,
        visibleItems: collectionAlbumLayout.cards.flatMap((card) => {
          const item = card.active ? collectionAlbumItems[card.itemIndex] : undefined;
          if (!item) return [];
          return [{
            id: item.id,
            category: item.category,
            artworkReady: Boolean(this.collectionAlbumArtwork?.image(this.collectionAlbumAtlasIndex(item))),
            rect: card.visual,
            collected: this.collectionAlbumItemCollected(item),
            unseen: this.collectionAlbumItemUnseen(item),
            ...(item.category === "level"
              ? { stars: this.collectionAlbumLevelProgress(item)?.frameStars ?? 0 }
              : {
                blueprintUnlocked: this.collectionAlbumMasterpieceProgress(item)?.blueprintUnlocked ?? false,
                cost: item.inspirationCost,
              }),
          }];
        }),
      },
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
      economy: {
        coins: this.save.coins,
        visualCoins: this.displayedHomeCoins(),
        boosters: { ...this.save.boosters },
        rewardedLevels: [...this.save.rewardedLevels],
      },
      completionFlow: {
        directTransition: this.directLevelTransition ? {
          ...this.directLevelTransition,
          ...sampleDirectLevelTransition(
            this.directLevelTransition.age,
            this.directLevelTransition.reducedMotion,
          ),
        } : undefined,
        coinFlight: this.homeCoinFlight ? {
          ...this.homeCoinFlight,
          duration: homeCoinFlightDuration(this.homeCoinFlight.reducedMotion),
          coinCount: homeCoinFlightTiming(this.homeCoinFlight.reducedMotion).coinCount,
          displayedCoins: this.displayedHomeCoins(),
          target: this.homeCoinFlight.kind === "inspiration" ? this.inspirationTarget() : this.homeCoinTarget(),
          start: this.homeCoinFlight.start ?? { x: LOGICAL_WIDTH * 0.52, y: LOGICAL_HEIGHT * 0.615 },
          coins: Array.from(
            { length: homeCoinFlightTiming(this.homeCoinFlight.reducedMotion).coinCount },
            (_, index) => ({
              index,
              progress: homeCoinLocalProgress(
                this.homeCoinFlight!.age,
                index,
                this.homeCoinFlight!.reducedMotion,
              ),
            }),
          ),
        } : undefined,
      },
      lives: {
        ...lifeState,
        playable: hasPlayableLife(lifeState, nowMs),
        attemptStarted: this.save.activeRun?.lifeStarted === true,
        startPersistence: this.pendingLifeStart ? "unknown" : "idle",
        refillOpen: this.lifeRefillOpen,
        refillFeedback: this.lifeRefillFeedback,
        refillPersistence: this.pendingLifeRefill ? "unknown" : "idle",
        unlimitedRemainingMs: getUnlimitedLivesRemainingMs(lifeState, nowMs),
        nextRecoveryRemainingMs: getNextLifeRecoveryRemainingMs(lifeState, nowMs),
      },
      supply: {
        feedback: this.supplyFeedback ? { ...this.supplyFeedback } : undefined,
        pendingPurchase: this.pendingSupplyPurchase ? {
          kind: this.pendingSupplyPurchase.kind,
          persistence: "unknown",
        } : undefined,
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
          : this.screen === "win" || this.directLevelTransition ? "committed" : "idle",
        kind: "normal",
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
        rewardPresented: !this.settlementSaveFailed && this.screen === "win",
        coinReward: this.winCoinReward,
        earnedStars: this.earnedStars,
        starConditions: settledStarConditions,
        pendingCoinDelta: this.pendingSettlementAbandon
          ? this.pendingSettlementAbandon.candidateSave.coins - this.save.coins
          : this.pendingSettlement
            ? this.pendingSettlement.candidateSave.coins - this.save.coins
          : 0,
      },
      reset: { saveFailed: this.resetSaveFailed },
      navigation: {
        selected: selectedNavigationTab,
        tabs: MAIN_NAVIGATION.map((tab) => {
          const layout = HOME_NAVIGATION_LAYOUT.find((candidate) => candidate.screen === tab.screen)
            ?? HOME_NAVIGATION_LAYOUT[2];
          const selected = tab.screen === selectedNavigationTab;
          const notificationVisible = tab.screen === "levels"
            ? claimableJourneyRewardLevels.length > 0
            : tab.screen === "records" && (pendingCollectionItems.length > 0 || this.collectionAlbumHasNotification());
          return {
            ...tab,
            icon: layout.icon,
            selected,
            labelVisible: selected,
            iconScale: selected ? layout.selectedScale : layout.unselectedScale,
            selectedScale: layout.selectedScale,
            unselectedScale: layout.unselectedScale,
            iconRect: selectedNavigationTab
              ? homeNavigationIconPlacement(tab.screen, selectedNavigationTab)
              : undefined,
            notificationVisible,
            notificationRect: notificationVisible && selectedNavigationTab
              ? this.navigationNotificationDotRect(tab.screen, selectedNavigationTab)
              : undefined,
          };
        }),
        artReady: Boolean(
          this.art.homeUi?.topHeader
          && this.art.homeUi?.navigationBar
          && this.art.homeUi.navigationSelected
          && this.art.homeUi.shopIcon
          && this.art.homeUi.leaderboardIcon
          && this.art.homeUi.homeIcon
          && this.art.homeUi.journeyIcon
          && this.art.homeUi.collectionIcon
        ),
        safe: this.safeOffsets(),
        headerOffset: this.mainPageHeaderOffset(),
        bar: { ...this.mainNavigationRect(0), width: LOGICAL_WIDTH },
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
        source: leaderboardSnapshot.source,
        player: { ...leaderboardSnapshot.player },
        totalPlayers: leaderboardSnapshot.totalPlayers,
      },
      collection: {
        guideOpen: this.screen === "mechanismGuide",
        modal: this.mechanismGuideLayout(),
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
        allTotal: COLLECTION_ALL_ITEMS.length,
        orderedItemIds: collectionItems.map((item) => item.id),
        unlockedItemIds: collectionItems.filter((item) => this.collectionItemUnlocked(item)).map((item) => item.id),
        lockedItemIds: collectionItems.filter((item) => !this.collectionItemUnlocked(item)).map((item) => item.id),
        visibleItemIds: collectionView.entries.map(({ item }) => item.id),
        visibleEntries: collectionView.entries.map((entry) => ({
          id: entry.item.id,
          index: entry.index,
          row: entry.row,
          column: entry.column,
          unlocked: this.collectionItemUnlocked(entry.item),
          rect: this.collectionCardRectForEntry(entry),
          notificationVisible: pendingCollectionItemIdSet.has(entry.item.id),
          notificationRect: pendingCollectionItemIdSet.has(entry.item.id)
            ? this.collectionNotificationDotRectForEntry(entry)
            : undefined,
        })),
        scrollOffset: collectionView.scrollOffset,
        maxScrollOffset: collectionView.maxScrollOffset,
        canScrollUp: collectionView.canScrollUp,
        canScrollDown: collectionView.canScrollDown,
        scrolling: collectionView.scrolling,
        hasCategoryTabs: false,
        hasPagination: false,
        artReady: this.formalPageArtFor("records")?.screen === "records",
        layout: {
          titlePanelRect: this.collectionGuideRect(homeArtRect(FORMAL_COLLECTION_LAYOUT.titlePanel)),
          listViewportRect: collectionView.viewport,
          firstVisibleCardRect: collectionView.entries[0]
            ? this.collectionCardRectForEntry(collectionView.entries[0])
            : undefined,
          lastVisibleCardRect: collectionView.entries.length
            ? this.collectionCardRectForEntry(collectionView.entries[collectionView.entries.length - 1])
            : undefined,
          detailRect: this.collectionDetailRect(),
          navigationTop: this.mainNavigationRect(0).y,
        },
      },
      discovery: {
        state: { ...this.save.metaDiscovery },
        collection: {
          pending: pendingCollectionItems.length > 0,
          pendingItemIds: pendingCollectionItems.map(({ id }) => id),
          newestUnseenLevel: this.pendingCollectionDiscoveryLevel(),
          badgeRect: selectedNavigationTab
            ? this.navigationNotificationDotRect("records", selectedNavigationTab)
            : undefined,
        },
        artReady: Boolean(this.art.discoveryBadge),
      },
      journey: {
        art: {
          baseReady: Boolean(deferredJourneyArt),
          loadedEpisodeIndexes: GAME_ART.ui.formalPages.journey.episodes.flatMap((_, index) => (
            deferredJourneyArt?.episode(index) ? [index] : []
          )),
          pendingEpisodeIndexes: deferredJourneyArt?.pendingEpisodeIndexes ?? [],
          failedEpisodeIndexes: deferredJourneyArt?.failedEpisodeIndexes ?? [],
          presentationReady: this.journeyPresentationArtReady(),
          presentationLoading: deferredJourneyArt?.presentationLoading ?? false,
          presentationError: deferredJourneyArt?.presentationError,
          presentationFailed: this.journeyPresentationArtFailed(),
        },
        displayedLevels: [...journeyView.displayedLevels],
        claimableRewardLevels: claimableJourneyRewardLevels,
        visibleRewards: journeyView.rewardRows.map(({ reward }) => ({
          level: reward.level,
          kind: reward.kind,
          amount: reward.amount,
          unlocked: this.journeyRewardEarned(reward),
          claimed: this.save.journeyProgress.claimedMilestoneLevels.includes(reward.level),
          claimable: this.journeyRewardClaimable(reward),
          targetKey: `journeyReward.${reward.level}`,
        })),
        visibleLevels: journeyView.entries.map(({ levelId }) => levelId),
        interactiveLevels: journeyView.rewardRows
          .filter((row) => this.journeyRowIsInteractive(row))
          .map(({ levelId }) => levelId),
        visibleEpisodes: journeyView.episodeRows.map(({ episode }) => episode.index),
        selectedEpisode: this.save.selectedJourneyEpisode,
        homeTheme: {
          selectedEpisode: this.save.selectedJourneyEpisode,
          loadedEpisode: this.journeyHomeThemeIndex,
          loading: this.journeyHomeThemeLoading,
        },
        activeIndex: journeyView.activeIndex,
        focusLevel: journeyView.focusLevel,
        scrollOffset: journeyView.scrollOffset,
        minScrollOffset: journeyView.minScrollOffset,
        maxScrollOffset: journeyView.maxScrollOffset,
        canScrollUp: journeyView.canScrollUp,
        canScrollDown: journeyView.canScrollDown,
        scrolling: journeyView.scrolling,
        velocity: this.journeyScrollVelocity,
        viewport: journeyView.viewport,
        renderViewport: homeArtRect(this.journeyRenderViewportArt()),
        contentOffset: journeyView.contentOffset,
        segment: journeyView.segment,
        unlocked: journeyView.displayedLevels.map((levelId) => levelId <= this.save.highestLevel),
        episode: getJourneyEpisode(this.save.highestLevel),
        progress: {
          claimedMilestoneLevels: [...this.save.journeyProgress.claimedMilestoneLevels],
          seenEpisodeUnlockLevels: [...this.save.journeyProgress.seenEpisodeUnlockLevels],
        },
        pendingEvent: findPendingJourneyEvent(
          this.save.highestLevel,
          this.save.journeyProgress,
          this.save.rewardedLevels,
        ),
        presentation: this.journeyPresentation ? {
          ...this.journeyPresentation,
          event: { ...this.journeyPresentation.event },
          claimed: this.journeyPresentationRewardClaimed(),
          locked: this.journeyPresentation.intent === "reward_inspection"
            && this.journeyPresentation.event.type === "milestone_reward"
            && !this.journeyRewardEarned(this.journeyPresentation.event.reward),
          primaryAction: this.journeyPresentation.phase !== "overlay"
            || !this.journeyPresentationArtReady()
            || this.journeyPresentationRewardReadOnlyText() !== undefined
            ? null
            : this.journeyPresentation.event.type === "episode_unlock"
              || this.journeyPresentation.blockedGrant
              ? "continue"
              : "claim",
          persistencePending: this.journeyPresentation.intent === "theme_selection"
            ? this.journeyPresentation.event.type === "episode_unlock"
              && this.pendingJourneyThemeSelection?.episodeIndex === this.journeyPresentation.event.episode.index
            : this.pendingJourneyClaim?.eventLevel === this.journeyPresentation.event.level,
        } : undefined,
      },
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
      exitFragments: this.particles.filter((particle) => particle.exitFragment).length,
      exitFragmentBreakdown: {
        chunks: this.particles.filter((particle) => particle.exitFragment && !particle.fragmentSpeck).length,
        specks: this.particles.filter((particle) => particle.exitFragment && particle.fragmentSpeck).length,
      },
      exitGhosts: this.exitGhosts.length,
      exitAnimations: this.exitGhosts.map((ghost) => ({
        mode: ghost.mode,
        blockId: ghost.block.id,
        shellSample: ghost.mode === "shell" ? sampleShellPeel(ghost.age, ghost.shellReducedMotion) : undefined,
        side: ghost.side,
        color: ghost.color,
        age: ghost.age,
        duration: ghost.duration,
        exitAnimationId: ghost.exitAnimationId,
        exitCompletionDuration: ghost.exitCompletionDuration,
        exitCompletionDone: ghost.exitCompletionDone ?? false,
        ingestDuration: ghost.ingestDuration,
        travelCells: ghost.travelCells,
        travelProgress: ghost.mode === "gate"
          ? gateExitTravel(ghost.age / (ghost.ingestDuration ?? GATE_EXIT_INGEST_DURATION))
          : undefined,
        emittedFragments: ghost.emittedFragments ?? 0,
        fragmentCount: ghost.fragmentCount ?? 0,
        fragmentDelay: ghost.fragmentDelay ?? 0,
        fragmentEmitDuration: ghost.fragmentEmitDuration ?? ghost.duration,
        gateId: ghost.gateId,
        portalIndex: ghost.portalIndex,
        portal: ghost.portal,
        sourceX: ghost.sourceX,
        sourceY: ghost.sourceY,
      })),
      revisedMechanismAnimations: this.revisedTransitions.map((item) => ({ ...item })),
      generatorSpawnAnimations: this.generatorSpawnAnimations.map((animation) => {
        const state = this.generatorSpawnVisualState(animation);
        const phase = state.phase === "delay"
          ? "response-delay"
          : state.phase === "preview-blank"
            ? "pre-roll"
            : state.phase === "emerging"
              ? "sliding"
              : state.phase === "settled"
                ? "settled-wait"
                : state.phase;
        return {
          generatorId: animation.generatorId,
          blockId: animation.block.id,
          side: animation.side,
          age: Math.max(0, state.localElapsedSeconds),
          phase,
          slideProgress: state.progress,
          startTranslation: { ...animation.startTranslation },
          translation: { ...state.translation },
          previousHead: animation.previousHead,
          currentHead: animation.currentHead,
          previousRemaining: animation.previousRemaining,
          currentRemaining: animation.currentRemaining,
          previousPreviewBlockId: animation.previousPreview?.id,
          nextPreviewBlockId: animation.nextPreview?.id,
          inputLocked: !state.complete,
        };
      }),
      exitPulses: this.exitPulses.map((pulse) => ({
        response: sampleGateExitResponse(pulse.age, this.save.reducedMotion),
        gateId: pulse.gateId,
        portalIndex: pulse.portalIndex,
        portal: pulse.portal,
        side: pulse.side,
        offset: pulse.offset,
        size: pulse.size,
        color: pulse.color,
        age: pulse.age,
        duration: pulse.duration,
        retireGate: pulse.retireGate,
      })),
      gateVisuals: (() => {
        const snapshot = this.model.snapshot();
        return snapshot.gates.map((gate) => ({
          id: gate.id,
          side: gate.side,
          offset: gate.offset,
          size: gate.size,
          portals: gatePortals(snapshot, gate),
          color: gate.color,
          targetPresent: this.snapshotContainsColor(snapshot, gate.color),
          opacity: this.gateExitOpacity(snapshot, gate.side, gate.offset, gate.size, gate.color, gate.id),
        }));
      })(),
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
      mechanicPulses: this.mechanicPulses.map((pulse) => {
        const fractureSample = pulse.iceFracture
          ? sampleNumericIceFracture(pulse.iceFracture, pulse.age)
          : undefined;
        return {
          kind: pulse.kind,
          target: pulse.target,
          targetId: pulse.targetId,
          shutterSkin: pulse.shutterSkin,
          previous: pulse.previous,
          remaining: pulse.remaining,
          unlocked: pulse.unlocked,
          gatePortals: pulse.gatePortals,
          label: pulse.unlocked && !pulse.iceFracture && pulse.kind !== "layer" ? this.mechanicPulseLabel(pulse) : undefined,
          phase: pulse.presented ? "visible" : "queued",
          delayRemaining: Math.max(0, -pulse.age),
          age: pulse.age,
          iceFracture: pulse.iceFracture && fractureSample ? {
            intensity: pulse.iceFracture.intensity,
            progress: fractureSample.progress,
            iceSheetAlpha: fractureSample.iceSheetAlpha,
            sheetLift: fractureSample.sheetLift,
            cellCount: pulse.iceFracture.cellCount,
            shardCount: pulse.iceFracture.shards.length,
            speckCount: pulse.iceFracture.specks.length,
            visibleShardCount: fractureSample.shards.filter((shard) => shard.visible).length,
            visibleSpeckCount: fractureSample.specks.filter((speck) => speck.visible).length,
          } : undefined,
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
        };
      }),
      boardShakeTime: this.boardShakeTime,
      selectionFeedback: this.selectedId || this.dragVisual?.settling ? {
        mode: this.blockedBlockId === (this.selectedId ?? this.dragVisual?.blockId) && this.blockedFeedbackTime > 0 ? "blocked" : "grabbed",
        settleRemaining: this.grabFeedbackTime,
        grabHaloReady: Boolean(this.art.blockGrabHalo),
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
      art: {
        shellReady: this.shellArtReady,
        revisedMechanisms: { ready: ACTIVE_REVISED_MECHANISM_ART_PATHS.every((path) => this.revisedArt.has(path)),
          currentSceneReady: missingMechanismArtPaths(this.model.level, this.revisedArt).length === 0,
          loading: this.revisedArtLoading, error: this.revisedArtError, loadedImages: this.revisedArt.size },
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
        formalGameplay: {
          uiReady: Boolean(this.art.gameplayUi),
          floorReady: Boolean(this.art.formalFloor),
          iceCellReady: Boolean(this.art.formalIceCell),
          iceSignature: this.formalIceArtSignature,
          requestedIceSignature: this.formalIceArtRequestSignature,
          iceError: this.formalIceArtError,
          loadedWholeIceShapes: Object.keys(this.art.formalIceBlocks ?? {}).map(Number).sort((left, right) => left - right),
          dynamicIceImages: this.formalIceDynamicImages.length,
          selectionFrameReady: Boolean(this.art.formalSelectionFrame),
          blockSignature: this.formalBlockArtSignature,
          requestedBlockSignature: this.formalBlockArtRequestSignature,
          blockError: this.formalBlockArtError,
          exactWholeBlockCoverage: this.model.level.blocks.filter((block) => Boolean(matchFormalBlockShapeForLevel(block.shape, this.model.level.id))).length,
          loadedWholeBlockCoverage: this.model.level.blocks.filter((block) => {
            const match = matchFormalBlockShapeForLevel(block.shape, this.model.level.id);
            const color = block.layers?.[0] ?? block.color;
            return Boolean(match && this.art.formalBlocks?.[color]?.solid[match.shapeId]);
          }).length,
          missingWholeBlockIds: this.model.level.blocks.flatMap((block) => {
            const match = matchFormalBlockShapeForLevel(block.shape, this.model.level.id);
            const color = block.layers?.[0] ?? block.color;
            return match && this.art.formalBlocks?.[color]?.solid[match.shapeId] ? [] : [block.id];
          }),
          totalBlocks: this.model.level.blocks.length,
          dynamicImages: this.formalBlockDynamicImages.length,
        },
        layerPreviewBadgesReady: Boolean(this.art.layerPreviewBadges),
        pauseSettingsReady: Boolean(this.art.pauseSettings),
        win: {
          ready: Boolean(this.winArt),
          loading: this.winArtLoading,
          error: this.winArtError,
          lazy: true,
          loadedImages: this.winArt ? this.winArtImages(this.winArt).length : 0,
        },
        formalPage: {
          loaded: this.formalPageArt?.screen,
          retained: Object.keys(this.formalPageArtCache),
          requested: this.formalPageArtRequest?.screen,
          error: this.formalPageArtError,
          errorScreen: this.formalPageArtErrorScreen,
          lazy: true,
          loadedImages: this.formalPageArt ? this.formalPageImages(this.formalPageArt).length : 0,
        },
      },
    };
  }

  private languageForStorageRead(result: StorageReadResult<unknown>, loaded: unknown): GameLanguage {
    if (result.status === "ok" && isPlainRecord(loaded) && loaded.schemaVersion === 1) {
      // A v1 save without a language predates localization and was necessarily
      // played in Simplified Chinese. Preserve that experience while fresh
      // installs follow the device preference.
      return isGameLanguage(loaded.language) ? loaded.language : "zh-CN";
    }
    return this.deviceLanguage;
  }

  private tr<Key extends TranslationKey>(key: Key, params?: TranslationParams<Key>): string {
    return params === undefined
      ? translate(this.save.language, key)
      : translate(this.save.language, key, params);
  }

  private boosterName(kind: Booster): string {
    const keys: Record<Booster, TranslationKey> = {
      time: "shop.booster.time.name",
      rocket: "shop.booster.rocket.name",
      pulse: "shop.booster.pulse.name",
    };
    return this.tr(keys[kind]);
  }

  private boosterEffect(kind: Booster): string {
    const keys: Record<Booster, TranslationKey> = {
      time: "shop.booster.time.effect",
      rocket: "shop.booster.rocket.effect",
      pulse: "shop.booster.pulse.effect",
    };
    return this.tr(keys[kind]);
  }

  private collectionItemTitle(item: CollectionItem): string {
    return this.tr(`collection.mechanism.${item.id}.name` as TranslationKey);
  }

  private collectionItemEffect(item: CollectionItem): string {
    return this.tr(`collection.mechanism.${item.id}.effect` as TranslationKey);
  }

  private journeyRewardName(kind: JourneyRewardKind): string {
    const keys: Record<JourneyRewardKind, TranslationKey> = {
      time: "journey.reward.time",
      rocket: "journey.reward.rocket",
      pulse: "journey.reward.pulse",
      coins: "journey.reward.coins",
      heart: "journey.reward.lives",
      unlimited_lives: "journey.reward.unlimitedLives",
    };
    return this.tr(keys[kind]);
  }

  private compactDuration(seconds: number): string {
    const hours = seconds >= 3600;
    const amount = hours ? seconds / 3600 : seconds / 60;
    const units: Record<GameLanguage, readonly [hour: string, minute: string, spaced: boolean]> = {
      "zh-CN": ["小时", "分钟", false],
      "zh-TW": ["小時", "分鐘", false],
      en: ["h", "min", false],
      ja: ["時間", "分", false],
      ko: ["시간", "분", false],
      es: ["h", "min", false],
      pt: ["h", "min", true],
      fr: ["h", "min", true],
      de: ["Std.", "Min.", true],
      ru: ["ч", "мин", true],
    };
    const [hourUnit, minuteUnit, spaced] = units[this.save.language];
    return `${amount}${spaced ? " " : ""}${hours ? hourUnit : minuteUnit}`;
  }

  private updateCanvasLanguage(): void {
    this.host.canvas.setAttribute?.("aria-label", this.tr("app.canvasLabel"));
  }

  private sanitizeSave(value: unknown): SaveData {
    if (!isPlainRecord(value) || value.schemaVersion !== 1) {
      return { ...copyDefaultSave(), dailyTaskProgress: createDailyTaskProgress(localDayKey(), 1) };
    }
    const source = migrateLegacyCampaignCap(value, LEVELS.length);
    const highestLevel = boundedInteger(source.highestLevel, 1, 1, LEVELS.length);
    const currentLevel = boundedInteger(source.currentLevel, 1, 1, highestLevel);
    const legacyRewards = Array.from({ length: Math.max(0, highestLevel - 1) }, (_, index) => index + 1);
    const rewardedLevels = Array.isArray(source.rewardedLevels) ? source.rewardedLevels : legacyRewards;
    const sanitizedRewardedLevels = [...new Set(rewardedLevels.filter((id): id is number => (
      typeof id === "number" && Number.isInteger(id) && id >= 1 && id <= LEVELS.length
    )))];
    const legacyCollectionLevel = Math.max(1, ...LEGACY_COLLECTION_DISCOVERY_LEVELS
      .filter((unlockLevel) => unlockLevel <= 1
        || sanitizedRewardedLevels.includes(unlockLevel)
        || highestLevel > unlockLevel));
    const metaDiscovery = sanitizeMetaDiscovery(
      source.metaDiscovery,
      legacyCollectionLevel,
      highestLevel >= 6 && sanitizedRewardedLevels.length > 0,
      LEVELS.length,
      MECHANISM_GUIDE_SAVE_IDS,
    );
    const boosterUnlockSeen = Array.isArray(source.boosterUnlockSeen)
      ? [...new Set(source.boosterUnlockSeen.filter((kind): kind is Booster => SUPPLY_ORDER.includes(kind as Booster)))]
      : unlockedSupplyKinds(highestLevel);
    const legacyJourneyProgress = deriveLegacyJourneyProgress(highestLevel, sanitizedRewardedLevels);
    const rawJourneyProgress = isPlainRecord(source.journeyProgress) ? source.journeyProgress : undefined;
    const normalizedJourneyProgress = sanitizeJourneyProgressMemory(rawJourneyProgress);
    const journeyProgress: JourneyProgressMemory = {
      claimedMilestoneLevels: (rawJourneyProgress && Array.isArray(rawJourneyProgress.claimedMilestoneLevels)
        ? normalizedJourneyProgress.claimedMilestoneLevels
        : legacyJourneyProgress.claimedMilestoneLevels)
        .filter((level) => level <= highestLevel),
      seenEpisodeUnlockLevels: (rawJourneyProgress && Array.isArray(rawJourneyProgress.seenEpisodeUnlockLevels)
        ? normalizedJourneyProgress.seenEpisodeUnlockLevels
        : legacyJourneyProgress.seenEpisodeUnlockLevels)
        .filter((level) => level <= highestLevel),
    };
    const storedBoosters = isPlainRecord(source.boosters) ? source.boosters : {};
    const safeCount = (count: unknown, fallback = 0, max = 99): number => boundedInteger(count, fallback, 0, max);
    const boosters = {
      time: safeCount(storedBoosters.time, DEFAULT_SAVE.boosters.time, SUPPLY_ITEMS.time.maxStock),
      rocket: safeCount(storedBoosters.rocket, DEFAULT_SAVE.boosters.rocket, SUPPLY_ITEMS.rocket.maxStock),
      pulse: safeCount(storedBoosters.pulse, DEFAULT_SAVE.boosters.pulse, SUPPLY_ITEMS.pulse.maxStock),
    };
    const bestStars = sanitizeLevelRecord(source.bestStars, 3);
    const bestMoves = sanitizeLevelRecord(source.bestMoves, 99999);
    const storedCollectionProgress = isPlainRecord(source.collectionProgress)
      ? source.collectionProgress
      : undefined;
    const legacyCollectionProgress: CollectionProgressSave = {
      version: 1,
      inspiration: Object.values(bestStars).reduce((sum, stars) => sum + stars, 0)
        + sanitizedRewardedLevels.filter((level) => level % 10 === 0).length * 2,
      restoredMasterpieceIds: [],
      // Existing players should not receive hundreds of artificial NEW dots
      // for level cards earned before this standalone album shipped.
      seenItemIds: LEVEL_COLLECTION_CATALOG
        .filter((card) => sanitizedRewardedLevels.includes(card.levelId))
        .map((card) => card.id),
      claimedMilestoneIds: [],
    };
    const collectionProgress = migrateCollectionProgress(
      storedCollectionProgress ?? legacyCollectionProgress,
      COLLECTION_PROGRESS_CATALOG,
    );
    const storedRun = isPlainRecord(source.activeRun) ? source.activeRun : undefined;
    const storedSpent = isPlainRecord(storedRun?.boosterSpent) ? storedRun.boosterSpent : {};
    const activeLevel = boundedInteger(storedRun?.levelId, currentLevel, 1, highestLevel);
    const returnLevel = boundedInteger(storedRun?.returnLevelId, currentLevel, 1, highestLevel);
    const activeRunDaily = typeof storedRun?.daily === "boolean" ? storedRun.daily : false;
    const activeRunDayKey = activeRunDaily ? validLocalDay(storedRun?.dailyDayKey) : "";
    const activeRun: SaveData["activeRun"] = storedRun ? {
      levelId: activeLevel,
      returnLevelId: returnLevel,
      lifeStarted: storedRun.lifeStarted === true,
      daily: activeRunDaily,
      ...(activeRunDayKey ? { dailyDayKey: activeRunDayKey } : {}),
      boosterSpent: {
        time: safeCount(storedSpent.time, 0, Math.max(0, SUPPLY_ITEMS.time.maxStock - Math.min(SUPPLY_ITEMS.time.maxStock, boosters.time))),
        rocket: safeCount(storedSpent.rocket, 0, Math.max(0, SUPPLY_ITEMS.rocket.maxStock - Math.min(SUPPLY_ITEMS.rocket.maxStock, boosters.rocket))),
        pulse: safeCount(storedSpent.pulse, 0, Math.max(0, SUPPLY_ITEMS.pulse.maxStock - Math.min(SUPPLY_ITEMS.pulse.maxStock, boosters.pulse))),
      },
    } : undefined;
    const storedMusicTrack = isMusicTrack(source.selectedMusicTrack)
      && MUSIC_CATALOG.some((entry) => entry.id === source.selectedMusicTrack && entry.unlockLevel <= highestLevel)
      ? source.selectedMusicTrack
      : DEFAULT_SAVE.selectedMusicTrack;
    return {
      schemaVersion: 1,
      currentLevel,
      highestLevel,
      coins: safeCount(source.coins, DEFAULT_SAVE.coins, 999999),
      sound: typeof source.sound === "boolean" ? source.sound : DEFAULT_SAVE.sound,
      haptic: typeof source.haptic === "boolean" ? source.haptic : DEFAULT_SAVE.haptic,
      reducedMotion: typeof source.reducedMotion === "boolean" ? source.reducedMotion : DEFAULT_SAVE.reducedMotion,
      language: isGameLanguage(source.language) ? source.language : DEFAULT_SAVE.language,
      selectedMusicTrack: storedMusicTrack,
      featureSeen: boundedStringSet(source.featureSeen),
      boosterUnlockSeen,
      metaDiscovery,
      boosters,
      activeRun,
      bestStars,
      bestMoves,
      rewardedLevels: sanitizedRewardedLevels,
      journeyProgress,
      achievementProgress: sanitizeAchievementProgress(source.achievementProgress),
      collectionProgress,
      dailyTaskProgress: reconcileDailyTaskProgress(source.dailyTaskProgress, new Date(), highestLevel),
      selectedJourneyEpisode: sanitizeJourneyEpisodeIndex(source.selectedJourneyEpisode, highestLevel),
      lifeState: reconcileLifeState(source.lifeState, Date.now()),
      dailyStreak: boundedInteger(source.dailyStreak, 0, 0, 999),
      lastDailyCompletedDay: validLocalDay(source.lastDailyCompletedDay),
      lastSeenUpdate: typeof source.lastSeenUpdate === "string" ? source.lastSeenUpdate.slice(0, 64) : "",
    };
  }

  private cloneSave(save: SaveData): SaveData {
    return {
      ...save,
      featureSeen: [...save.featureSeen],
      boosterUnlockSeen: [...save.boosterUnlockSeen],
      metaDiscovery: {
        ...save.metaDiscovery,
        ...(save.metaDiscovery.collectionViewedItemIds
          ? { collectionViewedItemIds: [...save.metaDiscovery.collectionViewedItemIds] }
          : {}),
      },
      boosters: { ...save.boosters },
      bestStars: { ...save.bestStars },
      bestMoves: { ...save.bestMoves },
      rewardedLevels: [...save.rewardedLevels],
      journeyProgress: {
        claimedMilestoneLevels: [...save.journeyProgress.claimedMilestoneLevels],
        seenEpisodeUnlockLevels: [...save.journeyProgress.seenEpisodeUnlockLevels],
      },
      achievementProgress: {
        claimedIds: [...save.achievementProgress.claimedIds],
      },
      dailyTaskProgress: {
        ...save.dailyTaskProgress,
        tasks: save.dailyTaskProgress.tasks.map((task) => ({ ...task })),
      },
      collectionProgress: {
        ...save.collectionProgress,
        restoredMasterpieceIds: [...save.collectionProgress.restoredMasterpieceIds],
        seenItemIds: [...save.collectionProgress.seenItemIds],
        claimedMilestoneIds: [...save.collectionProgress.claimedMilestoneIds],
      },
      lifeState: { ...save.lifeState },
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

  private createRunJournal(levelId: number): NonNullable<SaveData["activeRun"]> {
    return {
      levelId,
      returnLevelId: levelId,
      lifeStarted: false,
      daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    };
  }

  private beginRunJournal(): void {
    this.save.activeRun = this.createRunJournal(this.model.level.id);
    this.persist();
  }

  private currentLifeState(nowMs = Date.now()): LifeState {
    return reconcileLifeState(this.save.lifeState, nowMs);
  }

  private lifeHeaderText(nowMs = Date.now()): string {
    const state = this.currentLifeState(nowMs);
    const unlimitedRemaining = getUnlimitedLivesRemainingMs(state, nowMs);
    if (unlimitedRemaining > 0) {
      const countdown = formatLifeCountdown(unlimitedRemaining);
      const parts = countdown.split(":");
      const compactCountdown = parts.length === 3
        ? `${Number(parts[0]) * 60 + Number(parts[1])}:${parts[2]}`
        : countdown;
      return `∞ ${compactCountdown}`;
    }
    if (state.lives > MAX_LIVES) return `${state.lives}`;
    if (state.lives === MAX_LIVES) return this.tr("common.full");
    const recoveryRemaining = getNextLifeRecoveryRemainingMs(state, nowMs);
    return recoveryRemaining > 0
      ? `${state.lives} · ${formatLifeCountdown(recoveryRemaining)}`
      : `${state.lives}/${MAX_LIVES}`;
  }

  private refreshLifeState(nowMs = Date.now()): LifeState {
    const reconciled = this.currentLifeState(nowMs);
    if (reconciled.lives !== this.save.lifeState.lives
      || reconciled.nextLifeAtMs !== this.save.lifeState.nextLifeAtMs
      || reconciled.unlimitedLivesUntilMs !== this.save.lifeState.unlimitedLivesUntilMs) {
      if (this.pendingLifeStart || this.pendingLifeRefill || this.pendingSupplyPurchase || this.pendingJourneyClaim || this.pendingAchievementClaim
        || this.pendingDailyTaskClaim
        || this.pendingCollectionRestoration
        || this.pendingJourneyThemeSelection) {
        return reconciled;
      }
      this.save = { ...this.save, lifeState: reconciled };
      this.persist();
      this.dirty = true;
    }
    return reconciled;
  }

  private canStartCampaignAttempt(nowMs = Date.now()): boolean {
    if (this.temporaryLevelTestSession) return true;
    const lifeState = this.refreshLifeState(nowMs);
    if (hasPlayableLife(lifeState, nowMs)) return true;
    this.openLifeRefill();
    this.playSound("blocked");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
    return false;
  }

  private openLifeRefill(): void {
    this.lifeRefillOpen = true;
    this.lifeRefillFeedback = undefined;
    this.requestLifeRefillArt();
    this.playableClockSlices.reset();
    this.dirty = true;
    this.scheduleFrame();
  }

  private lifeRefillQuote(nowMs = Date.now()): ReturnType<typeof getLifeRefillQuote> {
    // An unknown save is a confirmation of this exact purchase, not a new
    // offer. Keep its pre-purchase state and price even across regeneration.
    return this.pendingLifeRefill?.quote ?? getLifeRefillQuote(this.save.lifeState, nowMs);
  }

  private buyLifeRefill(nowMs = Date.now()): void {
    const pending = this.pendingLifeRefill;
    const baselineSave = pending?.baselineSave ?? this.cloneSave(this.save);
    const candidateSave = pending?.candidateSave ?? this.cloneSave(baselineSave);
    if (!pending) {
      const quote = getLifeRefillQuote(candidateSave.lifeState, nowMs);
      if (quote.missingLives === 0) {
        this.lifeRefillFeedback = this.tr("gameplay.life.refillFull");
        this.playSound("blocked");
        return;
      }
      if (candidateSave.coins < quote.coinCost) {
        this.lifeRefillFeedback = this.tr("shop.insufficientCoins", { shortfall: quote.coinCost - candidateSave.coins });
        this.playSound("blocked");
        return;
      }
      candidateSave.lifeState = refillLife(quote.state, nowMs).state;
      candidateSave.coins -= quote.coinCost;
      this.pendingLifeRefill = { baselineSave, candidateSave, quote };
    }
    const outcome = this.persistVerified(candidateSave, baselineSave);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingLifeRefill = undefined;
      this.lifeRefillFeedback = this.tr(outcome === "unknown" ? "shop.saveUnknown" : "shop.saveFailed");
      this.playSound("blocked");
      return;
    }
    this.save = candidateSave;
    this.pendingLifeRefill = undefined;
    this.lifeRefillFeedback = this.tr("gameplay.life.refillSuccess");
    this.scheduleLifeRefreshWatch();
    this.playSound("reward");
  }

  private ensureCampaignLifeStarted(nowMs = Date.now()): boolean {
    if (this.temporaryLevelTestSession) return true;
    if (!this.pendingLifeStart && this.save.activeRun?.lifeStarted) return true;
    const pending = this.pendingLifeStart;
    const baseline = pending?.baselineSave ?? this.cloneSave(this.save);
    const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
    if (!pending) {
      const attempt = startLifeAttempt(candidate.lifeState, false, nowMs);
      if (!attempt.started) {
        this.openLifeRefill();
        this.showHudFeedback(this.tr("gameplay.life.empty"), "#ffbd55");
        this.playSound("blocked");
        return false;
      }
      candidate.lifeState = attempt.state;
      candidate.activeRun ??= this.createRunJournal(this.model.level.id);
      candidate.activeRun.lifeStarted = true;
      this.pendingLifeStart = { baselineSave: baseline, candidateSave: candidate };
    }
    const outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingLifeStart = undefined;
      this.showHudFeedback(this.tr(outcome === "unknown"
        ? "gameplay.life.startSaveUnknown" : "gameplay.life.startSaveFailed"), "#ffbd55");
      this.playSound("blocked");
      return false;
    }
    this.save = candidate;
    this.pendingLifeStart = undefined;
    if (pending) {
      this.playableClockSlices.reset();
      this.lastFrame = 0;
    }
    this.scheduleLifeRefreshWatch();
    return true;
  }

  private beginSelectedChallenge(): void {
    if (!this.canStartCampaignAttempt()) return;
    this.beginRunJournal();
    const intro = getScheduledFeatureIntro(this.model.level.id);
    this.screen = intro && !this.save.featureSeen.includes(intro.kind) ? "feature" : "playing";
    this.dirty = true;
    this.scheduleFrame();
  }

  private temporaryLevelSelectorLayout(): TemporaryLevelSelectorLayout {
    const selector = this.temporaryLevelSelector;
    return temporaryLevelSelectorLayout(
      LEVELS.length,
      selector?.page ?? temporaryLevelSelectorPageForLevel(this.model.level.id, LEVELS.length),
      selector?.selectedLevel ?? this.model.level.id,
    );
  }

  private openTemporaryLevelSelector(): void {
    this.temporaryLevelSelector = {
      page: temporaryLevelSelectorPageForLevel(this.model.level.id, LEVELS.length),
      selectedLevel: this.model.level.id,
    };
    this.pendingButtonPress = undefined;
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private closeTemporaryLevelSelector(): void {
    this.temporaryLevelSelector = undefined;
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private startTemporaryLevelTest(levelId: number): void {
    if (!this.temporaryLevelTestSession) {
      this.temporaryLevelTestSession = {
        baselineSave: this.cloneSave(this.save),
        baselineLevelId: this.model.level.id,
      };
    } else {
      // Every direct test begins from the same durable baseline, so a previous
      // test's rewards, failures or booster use cannot leak into the next one.
      this.save = this.cloneSave(this.temporaryLevelTestSession.baselineSave);
    }
    this.temporaryLevelSelector = undefined;
    this.loadLevel(levelId, false);
    this.beginSelectedChallenge();
    this.playSound("button");
  }

  private exitTemporaryLevelTest(): void {
    const session = this.temporaryLevelTestSession;
    if (!session) {
      this.closeTemporaryLevelSelector();
      return;
    }
    this.temporaryLevelSelector = undefined;
    this.temporaryLevelTestSession = undefined;
    this.save = this.cloneSave(session.baselineSave);
    this.updateCanvasLanguage();
    this.loadLevel(session.baselineLevelId, false);
    this.scheduleLifeRefreshWatch();
    this.syncMusic();
    this.playSound("button");
  }

  private handleTemporaryLevelSelector(point: PointerSample): void {
    const selector = this.temporaryLevelSelector;
    if (!selector) return;
    const layout = this.temporaryLevelSelectorLayout();
    if (this.interactionHit(point, layout.close)) {
      this.closeTemporaryLevelSelector();
      return;
    }
    if (this.temporaryLevelTestSession && this.interactionHit(point, layout.exit)) {
      this.exitTemporaryLevelTest();
      return;
    }
    if (layout.canPrevious && this.interactionHit(point, layout.previousPage)) {
      const page = layout.page - 1;
      const first = temporaryLevelSelectorLayout(LEVELS.length, page).cells[0]?.levelId ?? 1;
      this.temporaryLevelSelector = { page, selectedLevel: first };
      this.playSound("button");
      return;
    }
    if (layout.canNext && this.interactionHit(point, layout.nextPage)) {
      const page = layout.page + 1;
      const first = temporaryLevelSelectorLayout(LEVELS.length, page).cells[0]?.levelId ?? LEVELS.length;
      this.temporaryLevelSelector = { page, selectedLevel: first };
      this.playSound("button");
      return;
    }
    const cell = layout.cells.find((candidate) => this.interactionHit(point, candidate.rect));
    if (cell) {
      this.temporaryLevelSelector = { page: layout.page, selectedLevel: cell.levelId };
      this.playSound("button");
      return;
    }
    if (this.interactionHit(point, layout.start)) {
      this.startTemporaryLevelTest(selector.selectedLevel);
    }
  }

  private spendBooster(kind: Booster): void {
    this.save.activeRun ??= this.createRunJournal(this.model.level.id);
    this.save.boosters[kind] -= 1;
    this.save.activeRun.boosterSpent[kind] += 1;
  }

  private refundBooster(kind: Booster): void {
    this.save.boosters[kind] += 1;
    if (this.save.activeRun) {
      this.save.activeRun.boosterSpent[kind] = Math.max(0, this.save.activeRun.boosterSpent[kind] - 1);
    }
  }

  private pendingCollectionDiscoveryItems(): CollectionItem[] {
    const unlockedItems = COLLECTION_ALL_ITEMS.filter((item) => this.collectionItemUnlocked(item));
    const pendingIds = new Set(pendingCollectionItemIds(this.save.metaDiscovery, unlockedItems));
    return unlockedItems.filter((item) => pendingIds.has(item.id));
  }

  private pendingCollectionDiscoveryLevel(): number | undefined {
    const pending = this.pendingCollectionDiscoveryItems();
    return pending.length ? Math.max(...pending.map(({ unlockLevel }) => unlockLevel)) : undefined;
  }

  private collectionItemHasNotification(item: CollectionItem): boolean {
    return this.collectionItemUnlocked(item)
      && !collectionItemHasBeenViewed(this.save.metaDiscovery, item);
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

  private acknowledgeCollectionItemDiscovery(item: CollectionItem): PersistenceOutcome {
    if (!this.collectionItemUnlocked(item)) return "committed";
    return this.commitMetaDiscovery(acknowledgeCollectionItem(
      this.save.metaDiscovery,
      item,
      COLLECTION_ALL_ITEMS,
    ));
  }

  private cancelLifeRefreshWatch(): void {
    if (this.lifeRefreshTimer === undefined) return;
    this.host.cancelTimeout(this.lifeRefreshTimer);
    this.lifeRefreshTimer = undefined;
  }

  private scheduleLifeRefreshWatch(): void {
    this.cancelLifeRefreshWatch();
    if (!this.appVisible) return;
    const nowMs = Date.now();
    const state = this.currentLifeState(nowMs);
    if (state.lives >= MAX_LIVES && getUnlimitedLivesRemainingMs(state, nowMs) <= 0) return;
    this.lifeRefreshTimer = this.host.scheduleTimeout(() => {
      this.lifeRefreshTimer = undefined;
      if (!this.appVisible) return;
      this.refreshLifeState();
      this.dirty = true;
      this.scheduleFrame();
      this.scheduleLifeRefreshWatch();
    }, 1_000);
  }

  private settlementFailureDetail(): string {
    if (this.pendingSettlementAbandon) {
      return this.settlementFailureKind === "unknown"
        ? this.tr("settlement.failure.abandonRefundUnknown")
        : this.tr("settlement.failure.abandonRefundUnsaved");
    }
    if (this.settlementFailureKind === "unknown") {
      if (this.model.level.id === LEVELS.length) return this.tr("settlement.failure.seasonUnknown");
      return this.tr("settlement.failure.resultUnknown");
    }
    if (this.model.level.id === LEVELS.length) return this.tr("settlement.failure.seasonUnsaved");
    return this.tr("settlement.failure.rewardUncredited");
  }

  private supplyBuyRect(kind: Booster): Rect {
    const index = SUPPLY_ORDER.indexOf(kind);
    return homeArtRect(FORMAL_SHOP_LAYOUT.rows[Math.max(0, index)].buy);
  }

  private settingRect(kind: SettingKind): Rect {
    return SETTINGS_RECTS[kind];
  }

  private toggleSetting(kind: SettingKind): void {
    this.save[kind] = !this.save[kind];
    if (kind === "reducedMotion" && this.save.reducedMotion) this.boardShakeTime = 0;
    this.persist();
    this.syncMusic();
    if (kind === "haptic") this.vibrate("light");
    else this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private selectLanguage(language: GameLanguage): void {
    const pending = this.pendingLanguageSelection;
    if (pending && pending.language !== language) {
      this.languageSaveFailed = true;
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (language === this.save.language) {
      this.languageSaveFailed = false;
      this.pendingLanguageSelection = undefined;
      this.screen = "settings";
      this.playSound("button");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }

    const baseline = pending?.baselineSave ?? this.save;
    const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
    candidate.language = language;
    let outcome = this.persistVerified(candidate, baseline);
    if (outcome === "unknown") outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      this.pendingLanguageSelection = outcome === "unknown"
        ? { language, baselineSave: baseline, candidateSave: candidate }
        : undefined;
      this.languageSaveFailed = true;
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }

    this.save = candidate;
    this.pendingLanguageSelection = undefined;
    this.languageSaveFailed = false;
    this.updateCanvasLanguage();
    this.screen = "settings";
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private resetProgress(): void {
    const preferences = {
      sound: this.save.sound,
      haptic: this.save.haptic,
      reducedMotion: this.save.reducedMotion,
      language: this.save.language,
      lastSeenUpdate: this.save.lastSeenUpdate,
    };
    const candidate = {
      ...copyDefaultSave(),
      ...preferences,
      dailyTaskProgress: createDailyTaskProgress(localDayKey(), 1),
    };
    if (this.persistVerified(candidate) !== "committed") {
      this.resetSaveFailed = true;
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    this.save = candidate;
    void this.requestJourneyHomeThemeArt(this.save.selectedJourneyEpisode);
    this.resetJourneyScrollToLevel(this.save.highestLevel);
    this.journeyScrollVelocity = 0;
    this.scheduleLifeRefreshWatch();
    this.resetSaveFailed = false;
    this.boosterUnlockToast = undefined;
    this.loadLevel(1, false);
    this.playSound("button");
    this.vibrate("medium");
  }

  private buySupply(kind: Booster): void {
    const item = SUPPLY_ITEMS[kind];
    const pending = this.pendingSupplyPurchase;
    if (pending) {
      if (pending.kind !== kind) {
        this.supplyFeedback = { text: this.tr("shop.previousPurchasePending"), color: "#ffcf70" };
        this.playSound("blocked");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      this.finishSupplyPurchase(pending, this.persistVerified(pending.candidateSave, pending.baselineSave));
      return;
    }
    const result = purchaseSupply(this.save.coins, this.save.boosters[kind], kind, this.save.highestLevel);
    if (result.status === "purchased") {
      const baseline = this.cloneSave(this.save);
      const candidate: SaveData = {
        ...baseline,
        coins: result.coins,
        boosters: { ...baseline.boosters, [kind]: result.stock },
      };
      const transaction = { kind, baselineSave: baseline, candidateSave: candidate, resultingStock: result.stock };
      this.pendingSupplyPurchase = transaction;
      this.finishSupplyPurchase(transaction, this.persistVerified(candidate, baseline));
    } else if (result.status === "locked") {
      this.supplyFeedback = {
        text: this.tr("gameplay.booster.unlockAtLevel", {
          item: this.boosterName(kind),
          level: item.unlockLevel,
        }),
        color: "#bcb6dd",
      };
      this.playSound("blocked");
    } else if (result.status === "full") {
      this.supplyFeedback = {
        text: this.tr("shop.fullInventory", { item: this.boosterName(kind) }),
        color: "#bcb6dd",
      };
      this.playSound("blocked");
    } else {
      this.supplyFeedback = {
        text: this.tr("shop.insufficientCoins", { shortfall: result.shortfall }),
        color: "#ff9a86",
      };
      this.playSound("blocked");
    }
    this.dirty = true;
    this.scheduleFrame();
  }

  private finishSupplyPurchase(pending: PendingSupplyPurchase, outcome: PersistenceOutcome): void {
    const item = SUPPLY_ITEMS[pending.kind];
    if (outcome === "committed") {
      this.save = pending.candidateSave;
      this.pendingSupplyPurchase = undefined;
      this.supplyFeedback = {
        text: this.tr("shop.purchaseSuccess", {
          item: this.boosterName(pending.kind),
          stock: pending.resultingStock,
          max: item.maxStock,
        }),
        color: "#76f5b1",
      };
      const button = this.supplyBuyRect(pending.kind);
      this.emitBurst(button.x + button.width / 2, button.y + button.height / 2, "#ffe15c", 10, 72);
      this.playSound("reward");
      this.vibrate("light");
    } else {
      if (outcome === "rejected") this.pendingSupplyPurchase = undefined;
      this.supplyFeedback = {
        text: outcome === "unknown" ? this.tr("shop.saveUnknown") : this.tr("shop.saveFailed"),
        color: "#ff9a86",
      };
      this.playSound("blocked");
    }
    this.dirty = true;
    this.scheduleFrame();
  }

  private establishStorageBaseline(
    initial: StorageReadResult<unknown>,
    normalized: SaveData,
  ): boolean {
    const prior = trustedStorageBaseline(initial);
    if (!prior) {
      this.durableStorageBaseline = undefined;
      return false;
    }

    if (this.host.storageSet(SAVE_KEY, normalized)) {
      this.durableStorageBaseline = storedValueBaseline(normalized);
      return true;
    }

    // A storage bridge may reject normalization without changing the durable
    // bytes, or report failure after the normalized save actually landed. Read
    // back once so later transactions can distinguish either trusted baseline
    // from an ambiguous third value.
    try {
      this.storageReadAttempts += 1;
      const readBack = this.host.storageRead<unknown>(SAVE_KEY);
      if (readBack.status === "ok" && storageValuesEqual(readBack.value, normalized)) {
        this.durableStorageBaseline = storedValueBaseline(normalized);
        return true;
      }
      if (storageReadMatchesBaseline(readBack, prior)) {
        this.durableStorageBaseline = prior;
        return true;
      }
    } catch {
      // Fall through to protected startup mode. No transaction is allowed
      // until a later lifecycle retry establishes a trustworthy baseline.
    }

    this.durableStorageBaseline = undefined;
    return false;
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
    restored.language = this.languageForStorageRead(result, loaded);
    const storedMotionPreference = isPlainRecord(loaded) && typeof loaded.reducedMotion === "boolean";
    if (!storedMotionPreference && this.host.prefersReducedMotion?.()) restored.reducedMotion = true;

    if (!this.establishStorageBaseline(result, restored)) {
      this.storageBaselineReady = false;
      this.dirty = true;
      this.scheduleFrame();
      return false;
    }

    this.save = restored;
    this.updateCanvasLanguage();
    this.scheduleLifeRefreshWatch();
    this.model = new PuzzleModel(getLevel(this.save.currentLevel), { deferExitCompletion: true });
    this.generatorSpawnAnimations = [];
    this.revisedTransitions = [];
    this.storageBaselineReady = true;
    this.updateToastVisible = this.save.lastSeenUpdate !== UPDATE_NOTICE.id;
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.pendingLifeStart = undefined;
    this.pendingLifeRefill = undefined;
    this.lifeRefillOpen = false;
    this.releaseLifeRefillArt();
    this.pendingSupplyPurchase = undefined;
    this.pendingJourneyClaim = undefined;
    this.pendingAchievementClaim = undefined;
    this.pendingDailyTaskClaim = undefined;
    this.pendingCollectionRestoration = undefined;
    this.pendingJourneyThemeSelection = undefined;
    this.pendingLanguageSelection = undefined;
    this.boosterUnlockToast = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    this.screen = "home";
    void this.requestJourneyHomeThemeArt(this.save.selectedJourneyEpisode);
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private persist(save: SaveData = this.save): boolean {
    // A temporary level-test session deliberately runs against an in-memory
    // clone. Treat writes as committed for normal game-flow semantics while
    // leaving the trusted durable save byte-for-byte untouched.
    if (this.temporaryLevelTestSession) return true;
    const unresolvedCandidate = this.pendingSettlementAbandon?.candidateSave
      ?? this.pendingLifeStart?.candidateSave
      ?? this.pendingLifeRefill?.candidateSave
      ?? this.pendingSettlement?.candidateSave
      ?? this.pendingSupplyPurchase?.candidateSave
      ?? this.pendingJourneyClaim?.candidateSave
      ?? this.pendingAchievementClaim?.candidateSave
      ?? this.pendingDailyTaskClaim?.candidateSave
      ?? this.pendingCollectionRestoration?.candidateSave
      ?? this.pendingJourneyThemeSelection?.candidateSave
      ?? this.pendingLanguageSelection?.candidateSave;
    if (unresolvedCandidate && save !== unresolvedCandidate) return false;
    if (!this.storageBaselineReady || !this.host.storageSet(SAVE_KEY, save)) return false;
    this.durableStorageBaseline = storedValueBaseline(save);
    return true;
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
      this.storageReadAttempts += 1;
      const result = this.host.storageRead<unknown>(SAVE_KEY);
      if (result.status === "ok" && storageValuesEqual(result.value, save)) {
        this.durableStorageBaseline = storedValueBaseline(save);
        return "committed";
      }
      // The live transaction baseline can legitimately be newer than our last
      // confirmed durable baseline when an earlier ordinary save reached disk
      // but its bridge acknowledgement was lost. Matching that exact immutable
      // pre-write snapshot still proves this candidate did not land.
      if (result.status === "ok" && storageValuesEqual(result.value, baseline)) {
        this.durableStorageBaseline = storedValueBaseline(baseline);
        return "rejected";
      }
      if (storageReadMatchesBaseline(result, this.durableStorageBaseline)) return "rejected";
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  private boosterUnlocked(kind: Booster): boolean {
    return this.save.highestLevel >= SUPPLY_ITEMS[kind].unlockLevel;
  }

  private boosterUnlockToastEligible(): boolean {
    if (this.pendingLifeStart || this.lifeRefillOpen || this.pendingSupplyPurchase || this.pendingJourneyClaim || this.pendingAchievementClaim
      || this.pendingDailyTaskClaim
      || this.pendingCollectionRestoration
      || this.navigationTransition || this.directLevelTransition || this.homeCoinFlight
      || this.journeyPresentation || (this.screen === "home" && this.updateToastVisible)) return false;
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
      this.playSound("unlock");
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

  private musicScene(): MusicScene {
    if (this.screen === "paused" || this.screen === "settlementFailed") return "silent";
    if (this.screen === "win") return "victory";
    if (this.screen === "failed") return "defeat";
    if (this.screen === "playing") {
      const snapshot = this.model.snapshot();
      return snapshot.started && snapshot.remainingSeconds <= 20 ? "danger" : "gameplay";
    }
    if (this.screen === "feature") return "gameplay";
    return "menu";
  }

  private syncMusic(): void {
    this.host.music(this.musicScene(), this.save.sound && this.appVisible, this.save.selectedMusicTrack);
  }

  private playSound(kind: SoundKind): void {
    this.syncMusic();
    if (this.save.sound) this.host.sound(kind);
  }
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
    this.syncMusic();
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
        } else {
          this.pruneMainPageArt(settledScreen);
        }
      }
      this.dirty = true;
    }
    if (rawDelta > 0) {
      this.fpsSamples.push(1 / rawDelta);
      if (this.fpsSamples.length > 120) this.fpsSamples.shift();
    }

    this.updateJourneyPresentation(delta);
    this.updateJourneyScrollMotion(delta);
    this.updateDirectLevelTransition(delta);
    this.updateHomeCoinFlight(delta);
    if (this.screen !== "playing" || !this.appVisible || this.lifeRefillOpen) this.playableClockSlices.reset();
    const winGlowAnimating = this.appVisible
      && this.screen === "win"
      && Boolean(this.winArt)
      && !this.save.reducedMotion;
    if (winGlowAnimating) this.winGlowAge += delta;

    if (this.screen === "playing") {
      this.ensureRevisedMechanismArt();
      for (const transition of this.revisedTransitions) {
        transition.age += delta;
        if (this.appVisible && consumeShutterOpenSound(transition, this.save.reducedMotion)) this.playSound("shutter");
      }
      this.revisedTransitions = this.revisedTransitions.filter((transition) => transition.age < transition.duration);
      this.updateGeneratorSpawnAnimations(delta);
      this.blockedFeedbackTime = Math.max(0, this.blockedFeedbackTime - delta);
      this.blockerFocusTime = Math.max(0, this.blockerFocusTime - delta);
      this.grabFeedbackTime = Math.max(0, this.grabFeedbackTime - delta);
      if (this.blockedFeedbackTime === 0) this.blockedBlockId = undefined;
      if (this.blockerFocusTime === 0) this.blockerFocusBlockId = undefined;
      this.updateDragSettle(delta);
      const heldBlock = this.dragVisual?.started && this.selectedId
        ? this.model.getBlock(this.selectedId)
        : undefined;
      const beforeTick = this.model.snapshot();
      const beginsPlayableClock = usesImmediatePlayableClock(this.model.level)
        && !beforeTick.started && !this.pendingLifeStart && !this.lifeRefillOpen && !this.directLevelTransition && !this.hasActiveMechanicMotion()
        && !this.revisedArtLoading && !this.hasInitialRevisedRegionPresentation();
      if (beginsPlayableClock) this.model.startCountdown();
      // The first playable frame is the clock origin, not an interval spent
      // behind loading/intro/spawn animations. Subsequent active frames tick.
      const clockDelta = usesImmediatePlayableClock(this.model.level)
        ? this.playableClockSlices.sample(monotonicGameTime(), this.appVisible && this.model.snapshot().started && !this.directLevelTransition && !this.pendingLifeStart && !this.lifeRefillOpen)
        : delta;
      const spatialChanged = this.directLevelTransition || this.pendingLifeStart || this.lifeRefillOpen ? false : this.model.tick(beginsPlayableClock ? 0 : clockDelta, heldBlock && this.dragVisual ? {
          blockId: heldBlock.id,
          x: this.dragVisual.x,
          y: this.dragVisual.y,
          shape: heldBlock.shape,
          rollbackX: this.dragVisual.originX,
          rollbackY: this.dragVisual.originY,
        } : undefined);
      const afterTick = this.model.snapshot();
      this.captureGeneratorSpawns(beforeTick, afterTick);
      this.captureRevisedMechanicTransitions(beforeTick, afterTick);
      this.reconcileRevisedMechanicTransitions(afterTick);
      this.reconcileGeneratorSpawnAnimations(afterTick);
      if (beforeTick.started && !beforeTick.complete && !beforeTick.failed) {
        // Count the time actually charged to the countdown. A time freeze
        // pauses this existing measure without erasing earlier elapsed time.
        this.runElapsedSeconds += Math.max(0, beforeTick.remainingSeconds - afterTick.remainingSeconds);
      }
      if (spatialChanged) this.refreshActiveDragCollisionWorld();
      if (this.pendingCelebration > 0) {
        this.pendingCelebration -= delta;
        // The last clear may still have an older shell/exit event in flight.
        // Finish those valid events before changing screen and discarding FX.
        if (this.pendingCelebration <= 0) {
          if (this.model.snapshot().pendingExitAnimations?.length) this.pendingCelebration = 0.001;
          else this.beginCelebration();
        }
      }
      if (!this.directLevelTransition && this.model.snapshot().failed) {
        this.selectedId = undefined;
        this.activePointer = undefined;
        this.pendingButtonPress = undefined;
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
        this.generatorSpawnAnimations = [];
        this.exitFailure = undefined;
        this.revisedTransitions = [];
        this.mechanicPulses = [];
        this.boardShakeTime = 0;
        this.screen = "failed";
        this.dirty = true;
        this.playSound("fail");
        this.vibrate("medium");
      }
    } else if (this.screen === "home" && this.updateToastVisible && !this.journeyPresentation && !this.homeCoinFlight) {
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
    const journeyBounds = this.journeyScrollBounds();
    const journeyScrollAnimating = this.screen === "levels" && !this.journeyScrollGesture
      && (Math.abs(this.journeyScrollVelocity) > 0.1
        || this.journeyScrollOffset < journeyBounds.min - 0.1
        || this.journeyScrollOffset > journeyBounds.max + 0.1);
    const boardFxActive = this.screen === "playing" && this.appVisible;
    const particlesAnimating = this.particles.some((particle) => (
      boardFxActive || (!particle.exitAnimationId && !particle.exitFragment)
    ));
    const animated = this.screen === "playing"
      || (this.screen === "home" && this.updateToastVisible) || particlesAnimating
      || (boardFxActive && (this.exitGhosts.length > 0 || this.exitPulses.length > 0 || this.mechanicPulses.length > 0 || this.boardShakeTime > 0))
      || this.exitFailure != null || this.boosterFeedback != null || this.hudFeedback != null
      || this.navigationTransition != null || (this.boosterUnlockToast != null && this.boosterUnlockToastEligible())
      || (this.journeyPresentation != null && this.journeyPresentation.phase !== "overlay")
      || this.directLevelTransition != null || this.homeCoinFlight != null
      || (this.screen === "musicLibrary" && this.host.musicTransport().playing)
      || winGlowAnimating
      || journeyScrollAnimating;
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

  private generatorSpawnVisualState(animation: GeneratorSpawnVisual) {
    const options = {
      elapsedSeconds: animation.age,
      timeOffsetSeconds: animation.timeOffsetSeconds,
      direction: animation.side,
      travelDistance: animation.travelDistance,
      startTranslation: animation.startTranslation,
      reducedMotion: animation.reducedMotion,
    };
    return usesRevisedMechanisms(this.model.level)
      ? sampleRevisedGeneratorSpawn({ ...options, normalSpan: animation.travelDistance })
      : generatorSpawnAnimation(options);
  }

  private legacyGeneratorSpawnTravelDistance(block: BlockState, side: Side, snapshot: PuzzleSnapshot): number {
    const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as Point);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    if (side === "left") return Math.max(1, maxX + 1);
    if (side === "right") return Math.max(1, snapshot.width - minX);
    if (side === "top") return Math.max(1, maxY + 1);
    return Math.max(1, snapshot.height - minY);
  }

  private generatorSpawnStartTranslation(
    block: BlockState,
    generator: PuzzleSnapshot["generators"][number],
    snapshot: PuzzleSnapshot,
  ): { x: number; y: number } {
    const rimAnchor = this.generatorRimAnchor(generator);
    const outward = rimAnchor.quarterTurns === 0
      ? { x: 0, y: -1 }
      : rimAnchor.quarterTurns === 1
        ? { x: 1, y: 0 }
        : rimAnchor.quarterTurns === 2
          ? { x: 0, y: 1 }
          : { x: -1, y: 0 };
    const normalPositions = block.shape.map(([dx, dy]) => (
      outward.x === 0 ? dy : dx
    ));
    const normalSpan = Math.max(...normalPositions) - Math.min(...normalPositions) + 1;
    if (Number.isFinite(normalSpan) && normalSpan > 0) {
      return { x: outward.x * normalSpan, y: outward.y * normalSpan };
    }

    const distance = this.legacyGeneratorSpawnTravelDistance(block, generator.side, snapshot);
    return { x: outward.x * distance, y: outward.y * distance };
  }

  private captureGeneratorSpawns(before: PuzzleSnapshot, after: PuzzleSnapshot): void {
    if (before.levelId !== after.levelId) return;
    const cloneBlock = (block: BlockState): BlockState => ({
      ...block,
      shape: block.shape.map(([x, y]) => [x, y] as Point),
      layers: [...block.layers],
    });
    let captured = false;
    for (const afterGenerator of after.generators) {
      const beforeGenerator = before.generators.find(({ id }) => id === afterGenerator.id);
      if (!beforeGenerator || afterGenerator.head <= beforeGenerator.head) continue;
      const releasedCount = afterGenerator.head - beforeGenerator.head;
      const existingTailDelay = this.generatorSpawnAnimations
        .filter(({ generatorId }) => generatorId === afterGenerator.id)
        .reduce((maximum, animation) => {
          const state = this.generatorSpawnVisualState(animation);
          return Math.max(maximum, animation.timeOffsetSeconds + state.durationSeconds - animation.age);
        }, 0);
      const reducedMotion = this.save.reducedMotion;
      const duration = generatorSpawnAnimation({
        elapsedSeconds: 0,
        direction: afterGenerator.side,
        reducedMotion,
      }).durationSeconds;
      for (let index = 0; index < releasedCount; index += 1) {
        const previousHead = beforeGenerator.head + index;
        const blockId = beforeGenerator.queueBlockIds[previousHead];
        if (!blockId || this.generatorSpawnAnimations.some(({ block }) => block.id === blockId)) continue;
        const releasedBlock = after.blocks.find(({ id }) => id === blockId);
        if (!releasedBlock) continue;
        const nextBlockId = beforeGenerator.queueBlockIds[previousHead + 1];
        const previousPreview = before.queuedBlocks.find(({ id }) => id === blockId) ?? releasedBlock;
        const nextPreview = nextBlockId
          ? before.queuedBlocks.find(({ id }) => id === nextBlockId)
            ?? after.queuedBlocks.find(({ id }) => id === nextBlockId)
            ?? after.blocks.find(({ id }) => id === nextBlockId)
          : undefined;
        const block = cloneBlock(releasedBlock);
        const previousRemaining = Math.max(0, beforeGenerator.remaining - index);
        const startTranslation = this.generatorSpawnStartTranslation(block, afterGenerator, after);
        this.generatorSpawnAnimations.push({
          generatorId: afterGenerator.id,
          block,
          side: afterGenerator.side,
          age: 0,
          timeOffsetSeconds: existingTailDelay + generatorSpawnBatchOffset(index, duration),
          reducedMotion,
          travelDistance: Math.hypot(startTranslation.x, startTranslation.y),
          startTranslation,
          previousHead,
          currentHead: previousHead + 1,
          previousRemaining,
          currentRemaining: Math.max(0, previousRemaining - 1),
          previousPreview: cloneBlock(previousPreview),
          nextPreview: nextPreview ? cloneBlock(nextPreview) : undefined,
        });
        if (usesRevisedMechanisms(after) && previousRemaining === 1) {
          this.revisedTransitions = this.revisedTransitions.filter((item) => item.kind !== "generator" || item.targetId !== afterGenerator.id);
          this.revisedTransitions.push({ kind: "generator", targetId: afterGenerator.id,
            age: -(existingTailDelay + generatorSpawnBatchOffset(index, duration)),
            duration: sampleRevisedGeneratorExhaustion(0, reducedMotion).durationSeconds });
        }
        captured = true;
      }
    }
    if (captured) {
      this.dirty = true;
      this.scheduleFrame();
    }
  }

  private captureInitialGeneratorSpawns(): void {
    const snapshot = this.model.snapshot();
    if (!usesRevisedMechanisms(snapshot)) return;
    // Constructor-settled lifts/shutters need a visual reveal too. Reconstruct
    // a presentation-only pre-state; never reset the authoritative reveal.
    this.captureRevisedMechanicTransitions({ ...snapshot,
      shutters: snapshot.shutters.map((region) => ({ ...region, revealed: false })),
    }, snapshot);
    for (const item of this.revisedTransitions) {
      if (item.kind === "lift" || item.kind === "shutter") item.initial = true;
    }
    const queuedIds = new Set(snapshot.generators.flatMap((generator) => generator.queueBlockIds));
    if (!snapshot.generators.some(({ head }) => head > 0)) return;
    // The model settles initial vacancies synchronously. Reconstruct only the
    // presentation's pre-dispatch view, never the authoritative model state.
    this.captureGeneratorSpawns({
      ...snapshot,
      blocks: snapshot.blocks.filter(({ id }) => !queuedIds.has(id)),
      queuedBlocks: [...snapshot.blocks, ...snapshot.queuedBlocks].filter(({ id }) => queuedIds.has(id)),
      generators: snapshot.generators.map((generator) => ({
        ...generator, head: 0, remaining: generator.queueBlockIds.length, nextBlockId: generator.queueBlockIds[0],
      })),
    }, snapshot);
  }

  private updateGeneratorSpawnAnimations(delta: number): void {
    if (!this.generatorSpawnAnimations.length) return;
    for (const animation of this.generatorSpawnAnimations) animation.age += delta;
    const previousLength = this.generatorSpawnAnimations.length;
    this.generatorSpawnAnimations = this.generatorSpawnAnimations.filter((animation) => (
      !this.generatorSpawnVisualState(animation).complete
    ));
    if (this.generatorSpawnAnimations.length !== previousLength) this.dirty = true;
  }

  private reconcileGeneratorSpawnAnimations(snapshot: PuzzleSnapshot): void {
    if (!usesRevisedMechanisms(snapshot)) return;
    this.reconcileRevisedMechanicTransitions(snapshot);
    this.generatorSpawnAnimations = this.generatorSpawnAnimations.filter((animation) => (
      snapshot.blocks.some(({ id }) => id === animation.block.id)
      && (snapshot.generators.find(({ id }) => id === animation.generatorId)?.head ?? 0) > animation.previousHead
    ));
  }

  private moveBlockStepWithPresentation(blockId: string, x: number, y: number): boolean {
    if (!usesRevisedMechanisms(this.model.level)) return this.model.moveBlockStep(blockId, x, y);
    if (!this.advanceRevisedClockBeforeMutation()) return false;
    const before = this.model.snapshot();
    if (!this.model.moveBlockStep(blockId, x, y)) return false;
    const after = this.model.snapshot();
    this.emitMechanicFeedback(before, after);
    if (this.dragVisual?.blockId === blockId) {
      // This delta came from the pointer itself, not an autonomous platform.
      // Mark the new integer anchor before rebuilding collision constraints so
      // refreshActiveDragCollisionWorld does not apply the same travel twice.
      const moved = this.model.getBlock(blockId);
      if (moved) {
        this.dragVisual.modelX = moved.x;
        this.dragVisual.modelY = moved.y;
      }
    }
    this.refreshActiveDragCollisionWorld();
    return true;
  }

  /** Charge the old eligibility set up to the event, before it can enable a bomb. */
  private advanceRevisedClockBeforeMutation(): boolean {
    if (!usesImmediatePlayableClock(this.model.level)) return true;
    const before = this.model.snapshot();
    const active = this.screen === "playing" && this.appVisible && before.started && !this.directLevelTransition && !this.pendingLifeStart && !this.lifeRefillOpen;
    const delta = this.playableClockSlices.sample(monotonicGameTime(), Boolean(active));
    if (active && !before.complete && !before.failed && delta > 0) {
      this.model.tick(delta);
      const after = this.model.snapshot();
      this.runElapsedSeconds += Math.max(0, before.remainingSeconds - after.remainingSeconds);
      this.dirty = true;
      this.scheduleFrame();
    }
    const after = this.model.snapshot();
    return !after.failed && !after.complete;
  }

  private activeGeneratorSpawn(generatorId: string): GeneratorSpawnVisual | undefined {
    return this.generatorSpawnAnimations.find((animation) => (
      animation.generatorId === generatorId && !this.generatorSpawnVisualState(animation).complete
    ));
  }

  private hasActiveGeneratorSpawnMotion(): boolean {
    return this.generatorSpawnAnimations.some((animation) => !this.generatorSpawnVisualState(animation).complete);
  }

  private hasInitialRevisedRegionPresentation(): boolean {
    return this.revisedTransitions.some((item) => item.initial
      && (item.kind === "shutter" || item.kind === "lift")
      && !sampleRevisedRegionAnimation(item.kind, item.age, this.save.reducedMotion).complete);
  }

  private hasActiveMechanicMotion(): boolean {
    return this.hasActiveGeneratorSpawnMotion() || this.mechanicPulses.some((pulse) => (
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

  private syncDragGridCandidate(
    visual: DragVisualState,
    sweptPath: readonly ContinuousPose[] = [visual],
  ): DragGridSyncResult {
    let moved = false;
    let remainingSteps = this.model.level.width + this.model.level.height + 4;
    for (const pose of sweptPath) {
      while (remainingSteps > 0) {
        const block = this.model.getBlock(visual.blockId);
        if (!block) break;
        const candidates = candidateGridSteps(pose, block, DRAG_GRID_HYSTERESIS);
        if (!candidates.length) break;
        let advanced = false;
        for (const candidate of candidates) {
          if (!this.moveBlockStepWithPresentation(visual.blockId, candidate.x, candidate.y)) continue;
          remainingSteps -= 1;
          moved = true;
          advanced = true;
          const movedBlock = this.model.getBlock(visual.blockId);
          if (movedBlock) {
            visual.modelX = movedBlock.x;
            visual.modelY = movedBlock.y;
            // A refill owns its destination immediately, but its presentation
            // must not pause this gesture. Every grid step is validated by the
            // model and refreshes the held block's collision world above.
            const snapshot = this.model.snapshot();
            const exitPortals = matchingContinuousExitPortals(
              snapshot,
              movedBlock,
              this.model.possibleExitSides(movedBlock),
            );
            if (exitPortals.length > 0) {
              // Do not overwrite the floating presentation pose here. The
              // committed grid anchor may have crossed a gate threshold while
              // the finger is still between cells (or while a wide block is
              // only presenting its leading tip at the rail). Exit suction is
              // allowed only after the complete rigid pose is aligned; keeping
              // the swept pose lets the caller enforce that distinction.
              return { moved, exitPortals };
            }
          }
          break;
        }
        if (!advanced) break;
      }
    }
    const block = this.model.getBlock(visual.blockId);
    if (block && usesRevisedMechanisms(this.model.level)) {
      // The pointer path was swept before its first grid step could release
      // cargo or reveal a lift. Even a still-valid endpoint can now lie beyond
      // a new obstacle. Keep the render pose continuously reachable from the
      // authoritative anchor, not merely unoccupied at its endpoint.
      const projected = sweepContinuousPose(block, visual, visual.isPoseValid, DRAG_SWEEP_STEP);
      visual.x = projected.x;
      visual.y = projected.y;
    }
    const snapshot = this.model.snapshot();
    return {
      moved,
      exitPortals: block
        ? matchingContinuousExitPortals(snapshot, block, this.model.possibleExitSides(block))
        : [],
    };
  }

  private isMainNavigationScreen(screen: Screen): screen is MainNavigationScreen {
    return MAIN_NAVIGATION.some((tab) => tab.screen === screen);
  }

  private collectionAlbumVisible(): boolean {
    return this.screen === "records" || this.screen === "mechanismGuide"
      || this.navigationTransition?.from === "records" || this.navigationTransition?.to === "records"
      || this.navigationPendingTarget === "records";
  }

  private pruneMainPageArt(screen: MainNavigationScreen): void {
    this.pruneFormalPageArt(screen === "home" || screen === "records" ? undefined : screen);
    if (screen !== "records") this.releaseCollectionAlbumArt();
  }

  private mainNavigationInteractive(): boolean {
    return this.isMainNavigationScreen(this.screen)
      && !(this.screen === "records" && (this.collectionAlbumDetailId || this.pendingCollectionRestoration));
  }

  private mechanismGuideLayout() {
    const safe = this.safeOffsets();
    return createMechanismGuideLayout({
      width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT, logicalToCssScale: this.viewportTransform().scale,
      safeTop: safe.top, safeBottom: safe.bottom,
    });
  }

  private collectionGuideRect(rect: Rect): Rect {
    return this.screen === "mechanismGuide" ? mechanismGuideRect(rect, this.mechanismGuideLayout()) : rect;
  }

  private closeMechanismGuide(): void {
    this.collectionScrollGesture = undefined;
    this.pendingButtonPress = undefined;
    this.screen = "records";
    this.releaseFormalPageArt();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private mainNavigationSelectedScreen(): MainNavigationScreen {
    return this.navigationPendingTarget
      ?? this.navigationTransition?.to
      ?? (this.screen === "mechanismGuide" ? "records" : this.isMainNavigationScreen(this.screen) ? this.screen : "home");
  }

  private mainNavigationRect(index: number): Rect {
    const tab = MAIN_NAVIGATION[index] ?? MAIN_NAVIGATION[2];
    const placement = homeArtRect(homeNavigationTabPlacement(tab.screen, this.mainNavigationSelectedScreen()));
    const y = placement.y - this.safeOffsets().bottom;
    return { x: placement.x, y, width: placement.width, height: LOGICAL_HEIGHT - y };
  }

  private notificationDotArtRect(
    placement: Pick<HomeArtPlacement, "x" | "y" | "width">,
    topOffset = NOTIFICATION_DOT_TOP_OFFSET,
  ): HomeArtPlacement {
    return {
      x: placement.x + placement.width - NOTIFICATION_DOT_RIGHT_INSET,
      y: placement.y + topOffset,
      width: NOTIFICATION_DOT_SIZE,
      height: NOTIFICATION_DOT_SIZE,
    };
  }

  private navigationNotificationDotArtRect(
    screen: MainNavigationScreen,
    selected = this.mainNavigationSelectedScreen(),
  ): HomeArtPlacement {
    return this.notificationDotArtRect(homeNavigationIconPlacement(screen, selected));
  }

  private navigationNotificationDotRect(
    screen: MainNavigationScreen,
    selected = this.mainNavigationSelectedScreen(),
  ): Rect {
    return this.offsetRect(homeArtRect(this.navigationNotificationDotArtRect(screen, selected)), 0, -this.safeOffsets().bottom);
  }

  private mainPageHeaderOffset(): number {
    // Keep the icon/title below the unsafe top without pushing the fixed page
    // content into the bottom navigation on devices with two large insets.
    return Math.max(0, this.safeOffsets().top - 30);
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
      const enteringCollection = target === "records" && this.mainNavigationSelectedScreen() !== "records";
      if (target === "supply") this.supplyFeedback = undefined;
      if (target !== "levels") this.journeyScrollVelocity = 0;
      if (enteringCollection) {
        this.collectionScrollOffset = 0;
        this.collectionAlbumTab = "levels";
        this.collectionAlbumPage.levels = this.collectionAlbumDefaultLevelPage();
        this.collectionAlbumDetailId = undefined;
        this.collectionAlbumFeedback = undefined;
      }
      this.setFormalPageIntent(target);
      let changed = false;
      if (this.save.reducedMotion) {
        if (target !== this.screen || this.navigationTransition || this.navigationPendingTarget) {
          this.screen = target;
          this.navigationTransition = undefined;
          this.navigationPendingTarget = undefined;
          this.pruneMainPageArt(target);
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

  private leaderboardSnapshot(mode: LeaderboardMode = this.leaderboardMode): MetaLeaderboardSnapshot {
    return buildMetaLeaderboard(mode, {
      highestLevel: this.save.highestLevel,
      bestStars: this.save.bestStars,
    }, this.leaderboardSource);
  }

  private leaderboardEntries(mode: LeaderboardMode = this.leaderboardMode): readonly MetaLeaderboardEntry[] {
    return this.leaderboardSnapshot(mode).entries;
  }

  private leaderboardListViewportArt(): HomeArtPlacement {
    const viewport = FORMAL_LEADERBOARD_LAYOUT.listViewport;
    const safeBottomArt = this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    const visibleBottom = Math.min(
      viewport.y + viewport.height,
      FORMAL_LEADERBOARD_LAYOUT.playerRow.y
        + FORMAL_LEADERBOARD_LAYOUT.playerRowOverlap
        - safeBottomArt,
      FORMAL_PAGE_CONTENT_BOTTOM - safeBottomArt,
      HOME_ART_LAYOUT.navigationSelected.y - safeBottomArt,
    );
    return {
      ...viewport,
      height: Math.max(0, visibleBottom - viewport.y),
    };
  }

  private leaderboardRowTop(index: number): number {
    const layout = FORMAL_LEADERBOARD_LAYOUT;
    const safeIndex = Math.max(0, Math.floor(index));
    if (safeIndex < layout.rows.length) return layout.rows[safeIndex].y;
    const lastIndex = layout.rows.length - 1;
    return layout.rows[lastIndex].y + (safeIndex - lastIndex) * layout.rowPitch;
  }

  private leaderboardMaxScrollOffset(
    entries: readonly MetaLeaderboardEntry[],
    viewport: HomeArtPlacement = this.leaderboardListViewportArt(),
  ): number {
    if (!entries.length) return 0;
    const contentHeight = this.leaderboardRowTop(entries.length - 1)
      - FORMAL_LEADERBOARD_LAYOUT.rows[0].y
      + FORMAL_LEADERBOARD_LAYOUT.rows[0].height;
    return Math.max(0, contentHeight - viewport.height);
  }

  private leaderboardScrollView(mode: LeaderboardMode = this.leaderboardMode): LeaderboardScrollView {
    const allEntries = this.leaderboardEntries(mode);
    const viewportArt = this.leaderboardListViewportArt();
    const maxScrollOffset = this.leaderboardMaxScrollOffset(allEntries, viewportArt);
    const scrollOffset = Math.max(0, Math.min(maxScrollOffset, this.leaderboardScrollOffsets[mode]));
    this.leaderboardScrollOffsets[mode] = scrollOffset;

    const rowHeight = FORMAL_LEADERBOARD_LAYOUT.rows[0].height;
    let firstIndex = 0;
    let lastIndex = -1;
    for (let index = 0; index < allEntries.length; index += 1) {
      const rowTop = this.leaderboardRowTop(index) - FORMAL_LEADERBOARD_LAYOUT.rows[0].y;
      const visible = rowTop + rowHeight >= scrollOffset
        && rowTop <= scrollOffset + viewportArt.height;
      if (!visible) continue;
      if (lastIndex < 0) firstIndex = index;
      lastIndex = index;
    }
    const entries = lastIndex >= firstIndex ? allEntries.slice(firstIndex, lastIndex + 1) : [];

    return {
      entries,
      totalEntries: allEntries.length,
      firstIndex: entries.length ? firstIndex : -1,
      lastIndex: entries.length ? lastIndex : -1,
      firstRank: entries[0]?.rank ?? 0,
      lastRank: entries.at(-1)?.rank ?? 0,
      scrollOffset,
      maxScrollOffset,
      canScrollUp: scrollOffset > 0.5,
      canScrollDown: scrollOffset < maxScrollOffset - 0.5,
      scrolling: this.leaderboardScrollGesture?.mode === mode,
      viewport: homeArtRect(viewportArt),
    };
  }

  private beginLeaderboardScroll(point: PointerSample): boolean {
    if (!this.artReady || !this.storageBaselineReady || this.screen !== "leaderboard"
      || this.navigationTransition || !this.formalPageReady("leaderboard")) {
      return false;
    }
    const viewport = homeArtRect(this.leaderboardListViewportArt());
    if (!inside(point.x, point.y, viewport)) return false;
    this.pointerNow = { x: point.x, y: point.y };
    this.leaderboardScrollGesture = {
      pointerId: point.id,
      lastY: point.y,
      mode: this.leaderboardMode,
    };
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private updateLeaderboardScroll(point: PointerSample): boolean {
    const gesture = this.leaderboardScrollGesture;
    if (!gesture || point.id !== gesture.pointerId) return false;
    if (this.screen !== "leaderboard" || gesture.mode !== this.leaderboardMode) {
      this.leaderboardScrollGesture = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return true;
    }
    const entries = this.leaderboardEntries(gesture.mode);
    const maxScrollOffset = this.leaderboardMaxScrollOffset(entries);
    const deltaArt = (point.y - gesture.lastY) / HOME_ARTBOARD_SCALE;
    gesture.lastY = point.y;
    this.pointerNow = { x: point.x, y: point.y };
    this.leaderboardScrollOffsets[gesture.mode] = Math.max(
      0,
      Math.min(maxScrollOffset, this.leaderboardScrollOffsets[gesture.mode] - deltaArt),
    );
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private collectionItemUnlocked(item: CollectionItem): boolean {
    if (item.unlockLevel <= 1 || this.save.rewardedLevels.includes(item.unlockLevel)) return true;
    return this.save.highestLevel >= item.unlockLevel;
  }

  private collectionItems(): readonly CollectionItem[] {
    // Follow the workbook order regardless of player progress.
    return COLLECTION_ALL_ITEMS;
  }

  private collectionDetailText(item: CollectionItem): string {
    if (this.collectionItemUnlocked(item)) return this.collectionItemEffect(item);
    return this.tr("collection.unlockReachLevel", { level: item.unlockLevel });
  }

  private collectionDetailRect(): Rect {
    return this.collectionGuideRect(homeArtRect(FORMAL_COLLECTION_LAYOUT.detailPanel));
  }

  private collectionMaxScrollOffset(items: readonly CollectionItem[] = this.collectionItems()): number {
    const layout = FORMAL_COLLECTION_LAYOUT;
    const rowCount = Math.ceil(items.length / COLLECTION_COLUMN_COUNT);
    if (rowCount === 0) return 0;
    const selectedBottomOverhang = Math.max(
      0,
      layout.selectedOffset.y + layout.selectedOffset.height - layout.cardSize.height,
    );
    const contentBottom = layout.cardTop + (rowCount - 1) * layout.rowPitch
      + layout.cardSize.height + selectedBottomOverhang;
    return Math.max(0, contentBottom - (layout.listViewport.y + layout.listViewport.height));
  }

  private collectionScrollView(): {
    entries: CollectionScrollEntry[];
    scrollOffset: number;
    maxScrollOffset: number;
    canScrollUp: boolean;
    canScrollDown: boolean;
    scrolling: boolean;
    viewport: Rect;
  } {
    const layout = FORMAL_COLLECTION_LAYOUT;
    const items = this.collectionItems();
    const maxScrollOffset = this.collectionMaxScrollOffset(items);
    const scrollOffset = Math.max(0, Math.min(maxScrollOffset, this.collectionScrollOffset));
    this.collectionScrollOffset = scrollOffset;
    const viewportBottom = layout.listViewport.y + layout.listViewport.height;
    const entries: CollectionScrollEntry[] = [];
    items.forEach((item, index) => {
      const row = Math.floor(index / COLLECTION_COLUMN_COUNT);
      const column = index % COLLECTION_COLUMN_COUNT;
      const y = layout.cardTop + row * layout.rowPitch - scrollOffset;
      if (y + layout.cardSize.height <= layout.listViewport.y || y >= viewportBottom) return;
      entries.push({ item, index, row, column, y });
    });
    return {
      entries,
      scrollOffset,
      maxScrollOffset,
      canScrollUp: scrollOffset > 0.5,
      canScrollDown: scrollOffset < maxScrollOffset - 0.5,
      scrolling: Boolean(this.collectionScrollGesture),
      viewport: this.collectionGuideRect(homeArtRect(layout.listViewport)),
    };
  }

  private collectionCardArtRectForEntry(entry: CollectionScrollEntry): Rect {
    const layout = FORMAL_COLLECTION_LAYOUT;
    return {
      x: layout.cardColumns[entry.column],
      y: entry.y,
      width: layout.cardSize.width,
      height: layout.cardSize.height,
    };
  }

  private collectionCardRectForEntry(entry: CollectionScrollEntry): Rect {
    const card = homeArtRect(this.collectionCardArtRectForEntry(entry));
    const viewport = homeArtRect(FORMAL_COLLECTION_LAYOUT.listViewport);
    const left = Math.max(card.x, viewport.x);
    const top = Math.max(card.y, viewport.y);
    const right = Math.min(card.x + card.width, viewport.x + viewport.width);
    const bottom = Math.min(card.y + card.height, viewport.y + viewport.height);
    return this.collectionGuideRect({ x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) });
  }

  private collectionNotificationDotArtRectForEntry(entry: CollectionScrollEntry): HomeArtPlacement {
    return this.notificationDotArtRect(this.collectionCardArtRectForEntry(entry));
  }

  private collectionNotificationDotRectForEntry(entry: CollectionScrollEntry): Rect {
    return this.collectionGuideRect(homeArtRect(this.collectionNotificationDotArtRectForEntry(entry)));
  }

  private collectionEntryIsInteractive(entry: CollectionScrollEntry): boolean {
    const rect = this.collectionCardRectForEntry(entry);
    const cssScale = this.viewportTransform().scale;
    return rect.width * cssScale >= MINIMUM_INTERACTION_TARGET_CSS
      && rect.height * cssScale >= MINIMUM_INTERACTION_TARGET_CSS;
  }

  private beginCollectionScroll(point: PointerSample): boolean {
    if (!this.artReady || !this.storageBaselineReady || this.screen !== "mechanismGuide"
      || this.navigationTransition || !this.formalPageReady("records")) {
      return false;
    }
    const viewport = this.collectionGuideRect(homeArtRect(FORMAL_COLLECTION_LAYOUT.listViewport));
    if (!inside(point.x, point.y, viewport)) return false;
    this.pointerNow = { x: point.x, y: point.y };
    this.collectionScrollGesture = {
      pointerId: point.id,
      startX: point.x,
      startY: point.y,
      startOffset: this.collectionScrollOffset,
      moved: false,
    };
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private updateCollectionScroll(point: PointerSample): boolean {
    const gesture = this.collectionScrollGesture;
    if (!gesture || point.id !== gesture.pointerId) return false;
    if (this.screen !== "mechanismGuide") {
      this.collectionScrollGesture = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return true;
    }
    const distanceCss = Math.hypot(point.x - gesture.startX, point.y - gesture.startY)
      * this.viewportTransform().scale;
    if (!gesture.moved && distanceCss >= COLLECTION_SCROLL_DEAD_ZONE_CSS) gesture.moved = true;
    this.pointerNow = { x: point.x, y: point.y };
    if (gesture.moved) {
      const deltaArt = (point.y - gesture.startY) / (HOME_ARTBOARD_SCALE * this.mechanismGuideLayout().scale);
      this.collectionScrollOffset = Math.max(
        0,
        Math.min(this.collectionMaxScrollOffset(), gesture.startOffset - deltaArt),
      );
    }
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private albumText(key: CollectionAlbumTextKey, params: Record<string, string | number> = {}): string {
    return collectionAlbumText(this.save.language, key, params);
  }

  private collectionAlbumCategory(): CollectionCatalogCategory {
    return this.collectionAlbumTab === "levels" ? "level" : "masterpiece";
  }

  private collectionAlbumItems(): readonly CollectionCatalogItem[] {
    return collectionCatalogFor(this.collectionAlbumCategory());
  }

  private collectionAlbumProgressSummary() {
    return summarizeAlbumProgress(
      { rewardedLevels: this.save.rewardedLevels, bestStars: this.save.bestStars },
      this.save.collectionProgress,
      COLLECTION_PROGRESS_CATALOG,
    );
  }

  private collectionAlbumLayout(): CollectionAlbumLayout {
    const safe = this.safeOffsets();
    const items = this.collectionAlbumItems();
    return createCollectionAlbumLayout({
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
      safeInsets: { top: safe.top, right: 0, bottom: safe.bottom, left: 0 },
      logicalToCssScale: this.viewportTransform().scale,
      itemCount: items.length,
      pageIndex: this.collectionAlbumPage[this.collectionAlbumTab],
      tab: this.collectionAlbumTab,
      direction: "ltr",
    });
  }

  private collectionAlbumRetryRect(layout: CollectionAlbumLayout): Rect {
    const width = Math.min(220, layout.panel.width - 72);
    const height = 58;
    return {
      x: layout.panel.x + (layout.panel.width - width) / 2,
      y: layout.panel.y + layout.panel.height / 2 + 42,
      width,
      height,
    };
  }


  private collectionAlbumLevelProgress(item: LevelCollectionCard) {
    return this.collectionAlbumProgressSummary().levelCards.find(({ id }) => id === item.id);
  }

  private collectionAlbumMasterpieceProgress(item: MasterpieceCollectionCard) {
    return this.collectionAlbumProgressSummary().masterpieces.find(({ id }) => id === item.id);
  }

  private collectionAlbumItemCollected(item: CollectionCatalogItem): boolean {
    return item.category === "level"
      ? this.collectionAlbumLevelProgress(item)?.obtained === true
      : this.collectionAlbumMasterpieceProgress(item)?.restored === true;
  }

  private collectionAlbumItemUnseen(item: CollectionCatalogItem): boolean {
    return this.collectionAlbumItemCollected(item)
      && !this.save.collectionProgress.seenItemIds.includes(item.id);
  }

  private collectionAlbumHasRestorableMasterpiece(summary = this.collectionAlbumProgressSummary()): boolean {
    return summary.masterpieces.some((item) => item.blueprintUnlocked
      && !item.restored
      && item.cost <= summary.save.inspiration);
  }

  private collectionAlbumHasNotification(): boolean {
    const summary = this.collectionAlbumProgressSummary();
    const seen = new Set(this.save.collectionProgress.seenItemIds);
    return summary.levelCards.some((item) => item.obtained && !seen.has(item.id))
      || summary.masterpieces.some((item) => item.restored && !seen.has(item.id))
      || this.collectionAlbumHasRestorableMasterpiece(summary);
  }


  private collectionAlbumDefaultLevelPage(): number {
    return collectionAlbumLatestLevelPage(this.collectionAlbumProgressSummary().levelCards);
  }

  private selectCollectionAlbumTab(tab: CollectionAlbumTab): void {
    if (this.collectionAlbumTab === tab) return;
    this.collectionAlbumTab = tab;
    this.collectionAlbumPage[tab] = tab === "levels" ? this.collectionAlbumDefaultLevelPage() : 0;
    this.collectionAlbumDetailId = undefined;
    this.collectionAlbumFeedback = undefined;
    this.requestCollectionAlbumArtwork();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private changeCollectionAlbumPage(delta: number): void {
    const layout = this.collectionAlbumLayout();
    const nextPage = Math.max(0, Math.min(
      layout.pagination.pageCount - 1,
      layout.pagination.pageIndex + Math.sign(delta),
    ));
    if (nextPage === layout.pagination.pageIndex) {
      this.playSound("blocked");
      return;
    }
    this.collectionAlbumPage[this.collectionAlbumTab] = nextPage;
    this.collectionAlbumDetailId = undefined;
    this.collectionAlbumFeedback = undefined;
    this.requestCollectionAlbumArtwork();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private acknowledgeCollectionAlbumItem(item: CollectionCatalogItem): void {
    if (!this.collectionAlbumItemCollected(item)
      || this.save.collectionProgress.seenItemIds.includes(item.id)) return;
    this.commitTransientAcknowledgement((candidate) => {
      candidate.collectionProgress = markCollectionItemsSeen(
        candidate.collectionProgress,
        [item.id],
        COLLECTION_PROGRESS_CATALOG,
      );
    });
  }

  private openCollectionAlbumDetail(item: CollectionCatalogItem): void {
    this.collectionAlbumDetailId = item.id;
    this.collectionAlbumFeedback = undefined;
    this.requestCollectionAlbumArtwork();
    this.acknowledgeCollectionAlbumItem(item);
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private collectionAlbumDetailActionVisible(): boolean {
    const item = this.collectionAlbumDetailId ? findCollectionCatalogItem(this.collectionAlbumDetailId) : undefined;
    if (!item) return false;
    if (item.category === "level") return this.collectionAlbumLevelProgress(item)?.obtained === true;
    const progress = this.collectionAlbumMasterpieceProgress(item);
    return progress?.blueprintUnlocked === true && !progress.restored;
  }

  private activateCollectionAlbumDetail(): void {
    const item = this.collectionAlbumDetailId
      ? findCollectionCatalogItem(this.collectionAlbumDetailId)
      : undefined;
    if (!item) return;
    const pending = this.pendingCollectionRestoration;
    if (pending && pending.id !== item.id) {
      this.collectionAlbumFeedback = { text: this.albumText("saveFailed"), color: "#a5414b" };
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (item.category === "level") {
      if (pending) {
        this.collectionAlbumFeedback = { text: this.albumText("saveFailed"), color: "#a5414b" };
        this.playSound("blocked");
        return;
      }
      const progress = this.collectionAlbumLevelProgress(item);
      if (!progress?.obtained) {
        this.playSound("blocked");
        return;
      }
      this.collectionAlbumDetailId = undefined;
      this.loadLevel(item.levelId, false);
      this.beginSelectedChallenge();
      return;
    }

    const progress = this.collectionAlbumMasterpieceProgress(item);
    if (!progress || progress.restored || !progress.blueprintUnlocked) {
      this.playSound(progress?.restored ? "button" : "blocked");
      return;
    }
    const baseline = pending?.baselineSave ?? this.cloneSave(this.save);
    const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
    if (!pending) {
      const restored = restoreCollectionMasterpiece(
        baseline.collectionProgress,
        item.id,
        { rewardedLevels: baseline.rewardedLevels, bestStars: baseline.bestStars },
        COLLECTION_PROGRESS_CATALOG,
      );
      if (restored.status === "insufficient-inspiration") {
        this.collectionAlbumFeedback = {
          text: this.albumText("insufficientInspiration", { shortfall: restored.shortfall }),
          color: "#a5414b",
        };
        this.playSound("blocked");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      if (restored.status !== "restored") {
        this.playSound("blocked");
        return;
      }
      candidate.collectionProgress = markCollectionItemsSeen(
        restored.save,
        [item.id],
        COLLECTION_PROGRESS_CATALOG,
      );
      this.pendingCollectionRestoration = { id: item.id, baselineSave: baseline, candidateSave: candidate };
    }
    const outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingCollectionRestoration = undefined;
      this.collectionAlbumFeedback = { text: this.albumText("saveFailed"), color: "#a5414b" };
      this.playSound("blocked");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    this.save = candidate;
    this.pendingCollectionRestoration = undefined;
    // The detail view already changes to the collected state after a commit;
    // keep that state clear instead of adding a transient success caption.
    this.collectionAlbumFeedback = undefined;
    this.playSound("reward");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private dailyText(key: DailyTaskTextKey, params: Record<string, string | number> = {}): string {
    return dailyTaskText(this.save.language, key, params);
  }

  private dailyTaskHomeEntryRect(): Rect {
    return homeArtRect(DAILY_TASK_LAYOUT.homeEntryHit);
  }

  private dailyTaskCloseRect(): Rect {
    return homeArtRect(DAILY_TASK_LAYOUT.close);
  }

  private dailyTaskClaimRect(id: DailyTaskId): Rect | undefined {
    const row = dailyTaskRows(this.save.dailyTaskProgress.tasks.map((task) => task.id))
      .find((candidate) => candidate.id === id);
    return row ? homeArtRect(row.claim) : undefined;
  }

  private dailyTaskRewardSource(id: DailyTaskId | "bonus"): { x: number; y: number } | undefined {
    if (id === "bonus") {
      const reward = DAILY_TASK_LAYOUT.bonusReward;
      const rect = homeArtRect({ x: reward.x + 17.5, y: reward.y + reward.height / 2, width: 1, height: 1 });
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    const row = dailyTaskRows(this.save.dailyTaskProgress.tasks.map((task) => task.id))
      .find((candidate) => candidate.id === id);
    if (!row) return undefined;
    // The badge's coin is drawn at reward.x + 16.5, reward.y + 15.5.
    const rect = homeArtRect({ x: row.reward.x + 16.5, y: row.reward.y + 15.5, width: 1, height: 1 });
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  private dailyTaskBonusClaimRect(): Rect {
    return homeArtRect(DAILY_TASK_LAYOUT.bonusClaim);
  }

  private dailyTaskRetryRect(): Rect {
    return homeArtRect({ x: 226, y: 680, width: 268, height: 82 });
  }

  private dailyTaskSummary() {
    return summarizeDailyTasks(this.save.dailyTaskProgress);
  }

  private dailyTaskHasNotification(): boolean {
    return dailyTasksHaveNotification(this.save.dailyTaskProgress);
  }

  private ensureDailyTaskCycle(date = new Date()): boolean {
    if (this.pendingDailyTaskClaim) return false;
    const reconciled = reconcileDailyTaskProgress(this.save.dailyTaskProgress, date, this.save.highestLevel);
    if (storageValuesEqual(reconciled, this.save.dailyTaskProgress)) return false;
    this.save = { ...this.save, dailyTaskProgress: reconciled };
    this.persist();
    this.dailyTaskFeedback = undefined;
    return true;
  }

  private cancelDailyTaskRefreshWatch(): void {
    if (this.dailyTaskRefreshTimer === undefined) return;
    this.host.cancelTimeout(this.dailyTaskRefreshTimer);
    this.dailyTaskRefreshTimer = undefined;
  }

  private scheduleDailyTaskRefreshWatch(): void {
    this.cancelDailyTaskRefreshWatch();
    if (!this.appVisible || this.screen !== "dailyTasks") return;
    const remaining = millisecondsUntilNextLocalDay(new Date());
    const delay = Math.max(100, Math.min(1000, remaining + 20));
    this.dailyTaskRefreshTimer = this.host.scheduleTimeout(() => {
      this.dailyTaskRefreshTimer = undefined;
      this.ensureDailyTaskCycle();
      this.dirty = true;
      this.scheduleFrame();
      this.scheduleDailyTaskRefreshWatch();
    }, delay);
  }

  private dailyTaskResetCountdown(date = new Date()): string {
    const totalSeconds = Math.max(0, Math.ceil(millisecondsUntilNextLocalDay(date) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  private openDailyTasks(): void {
    this.ensureDailyTaskCycle();
    this.dailyTaskFeedback = undefined;
    this.screen = "dailyTasks";
    this.requestDailyTaskArt();
    this.scheduleDailyTaskRefreshWatch();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private closeDailyTasks(): void {
    this.cancelDailyTaskRefreshWatch();
    this.releaseDailyTaskArt();
    this.dailyTaskFeedback = undefined;
    this.screen = "home";
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private claimDailyTaskReward(id: DailyTaskId | "bonus"): void {
    const pending = this.pendingDailyTaskClaim;
    if (pending && (pending.id !== id || pending.dayKey !== this.save.dailyTaskProgress.dayKey)) {
      this.dailyTaskFeedback = { text: this.dailyText("claimUnknown"), color: "#a8671a" };
      this.playSound("blocked");
      return;
    }

    const baseline = pending?.baselineSave ?? this.cloneSave(this.save);
    const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
    let rewardCoins = pending?.rewardCoins ?? 0;
    let rewardInspiration = pending?.rewardInspiration ?? 0;
    if (!pending) {
      candidate.dailyTaskProgress = reconcileDailyTaskProgress(
        candidate.dailyTaskProgress,
        new Date(),
        candidate.highestLevel,
      );
      const result = id === "bonus"
        ? claimDailyTaskBonus(candidate.dailyTaskProgress)
        : claimDailyTask(candidate.dailyTaskProgress, id);
      if (result.status !== "claimed") {
        this.playSound("blocked");
        return;
      }
      rewardCoins = result.rewardCoins;
      rewardInspiration = result.rewardInspiration;
      if (rewardCoins > 0 && candidate.coins + rewardCoins > 999999) {
        this.dailyTaskFeedback = { text: this.dailyText("coinsFull"), color: "#a5414b" };
        this.playSound("blocked");
        this.vibrate("light");
        return;
      }
      candidate.dailyTaskProgress = result.state;
      candidate.coins += rewardCoins;
      if (rewardInspiration > 0) {
        candidate.collectionProgress = {
          ...candidate.collectionProgress,
          inspiration: Math.min(
            Number.MAX_SAFE_INTEGER,
            candidate.collectionProgress.inspiration + rewardInspiration,
          ),
        };
      }
      this.pendingDailyTaskClaim = {
        id,
        dayKey: candidate.dailyTaskProgress.dayKey,
        rewardCoins,
        rewardInspiration,
        baselineSave: baseline,
        candidateSave: candidate,
      };
    }

    const outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingDailyTaskClaim = undefined;
      this.dailyTaskFeedback = {
        text: this.dailyText(outcome === "unknown" ? "claimUnknown" : "claimFailed"),
        color: "#a5414b",
      };
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }

    this.save = candidate;
    this.pendingDailyTaskClaim = undefined;
    // A successful chest claim switches the bonus panel to its reset countdown.
    // Error and storage-state feedback still uses this field until a retry
    // commits successfully.
    this.dailyTaskFeedback = undefined;
    const rewardRect = id === "bonus" ? this.dailyTaskBonusClaimRect() : this.dailyTaskClaimRect(id);
    if (rewardRect) this.emitBurst(rewardRect.x + rewardRect.width / 2, rewardRect.y + rewardRect.height / 2, "#ffe15c", 14, 90);
    const rewardSource = this.dailyTaskRewardSource(id);
    if (rewardCoins > 0) this.beginHomeCoinFlight(rewardCoins, rewardSource);
    if (rewardInspiration > 0) this.beginInspirationFlight(rewardInspiration, rewardSource);
    this.playSound("reward");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private activateDailyTask(id: DailyTaskId): void {
    if (this.pendingDailyTaskClaim) {
      if (this.pendingDailyTaskClaim.id === id) this.claimDailyTaskReward(id);
      else {
        this.dailyTaskFeedback = { text: this.dailyText("claimUnknown"), color: "#a5414b" };
        this.playSound("blocked");
        this.vibrate("light");
        this.dirty = true;
        this.scheduleFrame();
      }
      return;
    }
    const entry = this.dailyTaskSummary().tasks.find((task) => task.id === id);
    if (!entry) return;
    if (entry.claimable) {
      this.claimDailyTaskReward(id);
      return;
    }
    if (!entry.completed) {
      this.cancelDailyTaskRefreshWatch();
      this.releaseDailyTaskArt();
      this.dailyTaskFeedback = undefined;
      this.screen = "home";
      this.beginSelectedChallenge();
      return;
    }
    this.playSound("button");
  }

  private achievementEntries(): AchievementResult[] {
    return sortAchievementEntries(evaluateAchievements(this.save, this.save.achievementProgress));
  }

  private achievementHasNotification(): boolean {
    return hasClaimableAchievements(this.save, this.save.achievementProgress);
  }

  private achievementMaxScrollOffset(): number {
    return achievementScrollMaximum(this.achievementEntries().length);
  }

  private achievementViewportRect(): Rect {
    return homeArtRect(ACHIEVEMENT_LAYOUT.viewport);
  }

  private achievementClaimRect(index: number): Rect {
    const claim = homeArtRect(achievementClaimPlacement(index, this.achievementScrollOffset));
    const viewport = this.achievementViewportRect();
    const left = Math.max(claim.x, viewport.x);
    const top = Math.max(claim.y, viewport.y);
    const right = Math.min(claim.x + claim.width, viewport.x + viewport.width);
    const bottom = Math.min(claim.y + claim.height, viewport.y + viewport.height);
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  private achievementRewardSource(index: number): { x: number; y: number } {
    const reward = {
      ...ACHIEVEMENT_LAYOUT.reward,
      y: ACHIEVEMENT_LAYOUT.reward.y + index * ACHIEVEMENT_LAYOUT.rowPitch - this.achievementScrollOffset,
    };
    const icon = homeArtRect({
      x: reward.x + 15,
      y: reward.y + reward.height / 2,
      width: 1,
      height: 1,
    });
    return { x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 };
  }

  private achievementVisibleEntries(): Array<{ entry: AchievementResult; index: number }> {
    const top = ACHIEVEMENT_LAYOUT.viewport.y;
    const bottom = top + ACHIEVEMENT_LAYOUT.viewport.height;
    return this.achievementEntries()
      .map((entry, index) => ({ entry, index, row: achievementRowPlacement(index, this.achievementScrollOffset) }))
      .filter(({ row }) => row.y + row.height > top && row.y < bottom)
      .map(({ entry, index }) => ({ entry, index }));
  }

  private beginAchievementScroll(point: PointerSample): boolean {
    if (!this.artReady || !this.storageBaselineReady || !this.achievementArt || this.screen !== "achievements") return false;
    if (!inside(point.x, point.y, this.achievementViewportRect())) return false;
    this.pointerNow = { x: point.x, y: point.y };
    this.achievementScrollGesture = {
      pointerId: point.id,
      startY: point.y,
      startOffset: this.achievementScrollOffset,
      moved: false,
    };
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private achievementEntryAt(point: Pick<PointerSample, "x" | "y">): { entry: AchievementResult; index: number } | undefined {
    const bounds = this.achievementViewportRect();
    if (!inside(point.x, point.y, bounds)) return undefined;
    // On short screens native rows are closer than the 44 CSS px hit target.
    // Resolve overlapping touch padding by nearest centre, not catalog order.
    // Both press and release dispatch use this exact same resolution.
    return this.achievementVisibleEntries()
      .filter(({ index }) => {
        const rect = this.achievementClaimRect(index);
        return rect.width > 0 && rect.height > 0 && this.interactionHit(point, rect, { bounds });
      })
      .sort((left, right) => {
        const distance = (index: number): number => {
          const rect = homeArtRect(achievementClaimPlacement(index, this.achievementScrollOffset));
          return Math.abs(point.y - rect.y - rect.height / 2);
        };
        return distance(left.index) - distance(right.index);
      })[0];
  }

  private updateAchievementScroll(point: PointerSample): boolean {
    const gesture = this.achievementScrollGesture;
    if (!gesture || point.id !== gesture.pointerId) return false;
    if (this.screen !== "achievements") {
      this.achievementScrollGesture = undefined;
      return true;
    }
    const distanceCss = Math.abs(point.y - gesture.startY) * this.viewportTransform().scale;
    if (!gesture.moved && distanceCss >= COLLECTION_SCROLL_DEAD_ZONE_CSS) gesture.moved = true;
    this.pointerNow = { x: point.x, y: point.y };
    if (gesture.moved) {
      const deltaArt = (point.y - gesture.startY) / HOME_ARTBOARD_SCALE;
      this.achievementScrollOffset = Math.max(
        0,
        Math.min(this.achievementMaxScrollOffset(), gesture.startOffset - deltaArt),
      );
    }
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private claimAchievement(id: AchievementId): void {
    const pending = this.pendingAchievementClaim;
    if (pending && pending.id !== id) {
      this.achievementFeedback = { text: this.tr("achievement.claimUnknown"), color: "#ffbd78" };
      this.playSound("blocked");
      return;
    }
    const entries = this.achievementEntries();
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry?.claimable && !pending) {
      this.playSound("blocked");
      return;
    }
    const entryIndex = entries.findIndex((candidate) => candidate.id === id);
    const rewardSource = pending?.rewardSource ?? this.achievementRewardSource(entryIndex);
    if (!pending && this.save.coins + entry!.rewardCoins > 999999) {
      this.achievementFeedback = { text: this.tr("achievement.coinsFull"), color: "#ffbd78" };
      this.playSound("blocked");
      this.vibrate("light");
      return;
    }

    const baseline = pending?.baselineSave ?? this.cloneSave(this.save);
    const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
    const rewardCoins = pending?.rewardCoins ?? entry!.rewardCoins;
    if (!pending) {
      candidate.coins += rewardCoins;
      candidate.achievementProgress = {
        claimedIds: [...candidate.achievementProgress.claimedIds, id],
      };
      this.pendingAchievementClaim = {
        id, rewardCoins, rewardSource, baselineSave: baseline, candidateSave: candidate,
      };
    }
    const outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingAchievementClaim = undefined;
      this.achievementFeedback = {
        text: outcome === "unknown" ? this.tr("achievement.claimUnknown") : this.tr("achievement.claimFailed"),
        color: "#ff9a86",
      };
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }

    this.save = candidate;
    this.pendingAchievementClaim = undefined;
    this.achievementFeedback = {
      text: this.tr("achievement.claimSuccess", { amount: rewardCoins }),
      color: "#78f5a6",
    };
    this.emitBurst(rewardSource.x, rewardSource.y, "#ffe15c", 12, 84);
    this.beginHomeCoinFlight(rewardCoins, rewardSource);
    this.playSound("reward");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private journeyAnchorLevel(): number {
    return this.journeyPresentation?.phase === "progress"
      ? this.journeyPresentation.event.level
      : this.save.highestLevel;
  }

  private journeyContentViewportArt(): HomeArtPlacement {
    const viewport = FORMAL_JOURNEY_LAYOUT.contentViewport;
    const safeBottomArt = this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    const visibleBottom = Math.min(
      viewport.y + viewport.height,
      FORMAL_PAGE_CONTENT_BOTTOM - safeBottomArt,
      HOME_ART_LAYOUT.navigationSelected.y - safeBottomArt,
    );
    return { ...viewport, height: Math.max(0, visibleBottom - viewport.y) };
  }

  private journeyRenderViewportArt(): HomeArtPlacement {
    const viewport = FORMAL_JOURNEY_LAYOUT.renderViewport;
    const safeBottomArt = this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    const visibleBottom = Math.min(
      viewport.y + viewport.height,
      FORMAL_PAGE_CONTENT_BOTTOM - safeBottomArt,
      HOME_ART_LAYOUT.navigationBar.y - safeBottomArt,
    );
    return { ...viewport, height: Math.max(0, visibleBottom - viewport.y) };
  }

  private drawJourneyVerticalTiles(
    image: HTMLImageElement,
    placement: HomeArtPlacement,
    contentOffset: number,
    viewport: HomeArtPlacement,
  ): void {
    const tileHeight = image.naturalHeight || image.height || placement.height;
    if (tileHeight <= 0 || viewport.height <= 0) return;
    const cycle = ((viewport.y - placement.y - contentOffset) % tileHeight + tileHeight) % tileHeight;
    const firstY = viewport.y - cycle;
    const bottom = viewport.y + viewport.height;
    for (let y = firstY; y < bottom; y += tileHeight) {
      this.ctx.drawImage(image, placement.x, y);
    }
  }

  private journeyScrollViewportArt(): HomeArtPlacement {
    const viewport = FORMAL_JOURNEY_LAYOUT.scrollViewport;
    const safeBottomArt = this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    const visibleBottom = Math.min(
      viewport.y + viewport.height,
      FORMAL_PAGE_CONTENT_BOTTOM - safeBottomArt,
      HOME_ART_LAYOUT.navigationSelected.y - safeBottomArt,
    );
    return { ...viewport, height: Math.max(0, visibleBottom - viewport.y) };
  }

  private journeyEntryHeight(entry: JourneyScrollEntry): number {
    const content = FORMAL_JOURNEY_LAYOUT.journeyContent;
    if (entry.kind === "episode") return content.episodeHeight;
    if (entry.kind === "finale") return content.finaleHeight;
    return content.rewardHeight;
  }

  private journeyContentModel(): { entries: JourneyScrollEntry[]; contentHeight: number } {
    const layout = FORMAL_JOURNEY_LAYOUT.journeyContent;
    const ordered: Array<
      | { kind: "reward"; levelId: number; reward: JourneyReward }
      | { kind: "episode"; levelId: number; episode: JourneyEpisode }
      | { kind: "finale"; levelId: number }
    > = [
      { kind: "finale" as const, levelId: LEVELS.length },
      ...JOURNEY_MILESTONE_REWARDS.map((reward) => ({ kind: "reward" as const, levelId: reward.level, reward })),
      ...JOURNEY_EPISODES.map((episode) => ({ kind: "episode" as const, levelId: episode.unlockLevel, episode })),
    ].sort((left, right) => right.levelId - left.levelId || (
      left.kind === "finale" ? -1 : right.kind === "finale" ? 1 : left.kind === "reward" ? -1 : 1
    ));
    let cursor = layout.paddingTop;
    const entries: JourneyScrollEntry[] = ordered.map((entry) => {
      const contentY = cursor;
      const height = entry.kind === "episode"
        ? layout.episodeHeight
        : entry.kind === "finale"
          ? layout.finaleHeight
          : layout.rewardHeight;
      cursor += height + layout.gap;
      return { ...entry, y: contentY, contentY } as JourneyScrollEntry;
    });
    return {
      entries,
      contentHeight: Math.max(0, cursor - layout.gap + layout.paddingBottom),
    };
  }

  private journeyContentPointForLevel(level: number): number {
    const model = this.journeyContentModel();
    const anchors = model.entries
      .map((entry) => ({
        level: entry.levelId,
        y: entry.contentY + this.journeyEntryHeight(entry) / 2,
      }))
      .sort((left, right) => left.level - right.level);
    const clamped = Math.max(1, Math.min(LEVELS.length, Math.floor(level)));
    const lower = [...anchors].reverse().find((anchor) => anchor.level <= clamped) ?? anchors[0];
    const upper = anchors.find((anchor) => anchor.level >= clamped) ?? anchors[anchors.length - 1];
    if (!lower || !upper || lower.level === upper.level) return lower?.y ?? upper?.y ?? 0;
    const progress = (clamped - lower.level) / (upper.level - lower.level);
    return lower.y + (upper.y - lower.y) * progress;
  }

  private journeyStartTrackEndContentPoint(): number {
    const model = this.journeyContentModel();
    const firstEpisode = JOURNEY_EPISODES[0];
    const startEpisode = firstEpisode
      ? model.entries.find(
        (entry): entry is JourneyEpisodeScrollEntry => entry.kind === "episode"
          && entry.episode.index === firstEpisode.index,
      )
      : undefined;
    if (!startEpisode) return model.contentHeight;
    const button = FORMAL_JOURNEY_LAYOUT.journeyContent.episodeButton;
    return startEpisode.contentY + button.yOffset + button.height / 2;
  }

  private journeyMarkerContentPointForLevel(level: number): number {
    const model = this.journeyContentModel();
    const episode = getJourneyEpisode(level);
    const content = FORMAL_JOURNEY_LAYOUT.journeyContent;
    const lowerEpisode = model.entries.find(
      (entry): entry is JourneyEpisodeScrollEntry => entry.kind === "episode"
        && entry.episode.index === episode.index,
    );
    if (!lowerEpisode) return this.journeyContentPointForLevel(level);

    const lowerTop = lowerEpisode.contentY + content.episodeImage.yOffset;
    let upperBottom: number | undefined;
    if (episode.index < JOURNEY_EPISODES.length) {
      const upperEpisode = model.entries.find(
        (entry): entry is JourneyEpisodeScrollEntry => entry.kind === "episode"
          && entry.episode.index === episode.index + 1,
      );
      if (upperEpisode) {
        upperBottom = upperEpisode.contentY
          + content.episodeButton.yOffset
          + content.episodeButton.height;
      }
    } else {
      const finale = model.entries.find(
        (entry): entry is JourneyFinaleScrollEntry => entry.kind === "finale",
      );
      if (finale) {
        upperBottom = finale.contentY
          + content.finaleImage.yOffset
          + content.finaleImage.height;
      }
    }

    // Keep the current marker in the exposed connector between chapters. It
    // must not use the level-interpolation point, which can fall inside the
    // lower chapter medallion when the player has just entered an episode.
    return upperBottom === undefined
      ? this.journeyContentPointForLevel(level)
      : (upperBottom + lowerTop) / 2;
  }

  private journeyScrollBounds(): { min: number; max: number } {
    const viewport = this.journeyContentViewportArt();
    const { contentHeight } = this.journeyContentModel();
    return { min: 0, max: Math.max(0, contentHeight - viewport.height) };
  }

  private journeyDefaultScrollOffset(level: number): number {
    const bounds = this.journeyScrollBounds();
    const viewport = this.journeyContentViewportArt();
    const desired = this.journeyContentPointForLevel(level)
      - (FORMAL_JOURNEY_LAYOUT.journeyContent.currentProgressAnchorY - viewport.y);
    return Math.max(bounds.min, Math.min(bounds.max, desired));
  }

  private resetJourneyScrollToLevel(level: number): void {
    this.journeyScrollVelocity = 0;
    this.journeyScrollOffset = this.journeyDefaultScrollOffset(level);
  }

  private journeyContentOffset(scrollOffset: number): number {
    return -scrollOffset;
  }

  private journeyScrollView(): JourneyScrollView {
    const bounds = this.journeyScrollBounds();
    const scrollOffset = Math.max(
      bounds.min - JOURNEY_SCROLL_MAX_OVERSCROLL,
      Math.min(bounds.max + JOURNEY_SCROLL_MAX_OVERSCROLL, this.journeyScrollOffset),
    );
    this.journeyScrollOffset = scrollOffset;
    const contentOffset = this.journeyContentOffset(scrollOffset);
    const contentViewport = this.journeyContentViewportArt();
    const model = this.journeyContentModel();
    const entries: JourneyScrollEntry[] = [];
    let focusLevel = this.journeyAnchorLevel();
    let focusDistance = Number.POSITIVE_INFINITY;
    for (const source of model.entries) {
      const y = contentViewport.y + source.contentY + contentOffset;
      const height = this.journeyEntryHeight(source);
      const rowBottom = y + height;
      const distance = Math.abs(y + height / 2 - FORMAL_JOURNEY_LAYOUT.journeyContent.currentProgressAnchorY);
      if (distance < focusDistance) {
        focusDistance = distance;
        focusLevel = source.levelId;
      }
      if (rowBottom < contentViewport.y || y > contentViewport.y + contentViewport.height) continue;
      entries.push({ ...source, y });
    }
    const rewardRows = entries.filter((entry): entry is JourneyRewardScrollEntry => entry.kind === "reward");
    const episodeRows = entries.filter((entry): entry is JourneyEpisodeScrollEntry => entry.kind === "episode");
    const anchorLevel = this.journeyAnchorLevel();
    const activeRewardLevel = JOURNEY_MILESTONE_REWARDS.reduce((nearest, reward) => (
      Math.abs(reward.level - anchorLevel) < Math.abs(nearest.level - anchorLevel) ? reward : nearest
    )).level;
    const activeIndex = rewardRows.findIndex(({ levelId }) => levelId === activeRewardLevel);
    return {
      entries,
      rewardRows,
      episodeRows,
      displayedLevels: rewardRows.map(({ levelId }) => levelId),
      activeIndex,
      focusLevel,
      scrollOffset,
      minScrollOffset: bounds.min,
      maxScrollOffset: bounds.max,
      canScrollUp: scrollOffset < bounds.max - 0.5,
      canScrollDown: scrollOffset > bounds.min + 0.5,
      scrolling: Boolean(this.journeyScrollGesture),
      viewport: homeArtRect(this.journeyScrollViewportArt()),
      contentOffset,
      segment: getJourneySegment(focusLevel),
    };
  }

  private journeyNodeArtRect(row: JourneyRewardScrollEntry): HomeArtPlacement {
    const layout = FORMAL_JOURNEY_LAYOUT;
    const levelCard = layout.levelCards[0];
    const cardY = row.y + (layout.journeyContent.rewardHeight - levelCard.height) / 2;
    return {
      x: levelCard.x - 9,
      y: cardY - 7,
      width: levelCard.width + 18,
      height: levelCard.height + 14,
    };
  }

  private journeyRewardArtRect(row: JourneyRewardScrollEntry): HomeArtPlacement {
    const layout = FORMAL_JOURNEY_LAYOUT;
    const rewardCard = layout.rewardCards[0];
    const cardY = row.y + (layout.journeyContent.rewardHeight - rewardCard.height) / 2;
    return {
      x: rewardCard.x - 9,
      y: cardY - 7,
      width: rewardCard.width + 18,
      height: rewardCard.height + 14,
    };
  }

  private journeyRewardNotificationDotArtRect(row: JourneyRewardScrollEntry): HomeArtPlacement {
    const rewardCard = FORMAL_JOURNEY_LAYOUT.rewardCards[0];
    const cardY = row.y + (FORMAL_JOURNEY_LAYOUT.journeyContent.rewardHeight - rewardCard.height) / 2;
    return this.notificationDotArtRect({ ...rewardCard, y: cardY }, -19.5);
  }

  private journeyNodeRect(index: number): Rect {
    const view = this.journeyScrollView();
    const reward = getJourneyReward(this.journeyAnchorLevel()) ?? JOURNEY_MILESTONE_REWARDS[0];
    const row = view.rewardRows[index] ?? view.rewardRows[0] ?? {
      kind: "reward" as const,
      levelId: reward.level,
      y: FORMAL_JOURNEY_LAYOUT.levelCards[2].y,
      contentY: 0,
      reward,
    };
    return this.journeyNodeRectForRow(row);
  }

  private journeyNodeRectForRow(row: JourneyRewardScrollEntry): Rect {
    const node = homeArtRect(this.journeyNodeArtRect(row));
    const viewport = homeArtRect(this.journeyContentViewportArt());
    const left = Math.max(node.x, viewport.x);
    const top = Math.max(node.y, viewport.y);
    const right = Math.min(node.x + node.width, viewport.x + viewport.width);
    const bottom = Math.min(node.y + node.height, viewport.y + viewport.height);
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  private journeyRewardRectForRow(row: JourneyRewardScrollEntry): Rect {
    const reward = homeArtRect(this.journeyRewardArtRect(row));
    const viewport = homeArtRect(this.journeyContentViewportArt());
    const left = Math.max(reward.x, viewport.x);
    const top = Math.max(reward.y, viewport.y);
    const right = Math.min(reward.x + reward.width, viewport.x + viewport.width);
    const bottom = Math.min(reward.y + reward.height, viewport.y + viewport.height);
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  private journeyRowIsInteractive(row: JourneyRewardScrollEntry): boolean {
    const rect = this.journeyNodeRectForRow(row);
    const cssScale = this.viewportTransform().scale;
    return rect.width * cssScale >= MINIMUM_INTERACTION_TARGET_CSS
      && rect.height * cssScale >= MINIMUM_INTERACTION_TARGET_CSS;
  }

  private journeyRewardIsInteractive(row: JourneyRewardScrollEntry): boolean {
    const rect = this.journeyRewardRectForRow(row);
    const cssScale = this.viewportTransform().scale;
    return rect.width * cssScale >= MINIMUM_INTERACTION_TARGET_CSS
      && rect.height * cssScale >= MINIMUM_INTERACTION_TARGET_CSS;
  }

  private beginJourneyScroll(point: PointerSample): boolean {
    if (!this.artReady || !this.storageBaselineReady || this.screen !== "levels"
      || this.navigationTransition || this.journeyPresentation || !this.formalPageReady("levels")) {
      return false;
    }
    const viewport = homeArtRect(this.journeyScrollViewportArt());
    if (!inside(point.x, point.y, viewport)) return false;
    this.journeyScrollVelocity = 0;
    this.pointerNow = { x: point.x, y: point.y };
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.journeyScrollGesture = {
      pointerId: point.id,
      startX: point.x,
      startY: point.y,
      startOffset: this.journeyScrollOffset,
      lastY: point.y,
      lastTimeMs: nowMs,
      velocity: 0,
      moved: false,
    };
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private updateJourneyScroll(point: PointerSample): boolean {
    const gesture = this.journeyScrollGesture;
    if (!gesture || point.id !== gesture.pointerId) return false;
    if (this.screen !== "levels" || this.journeyPresentation) {
      this.journeyScrollGesture = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return true;
    }
    const distanceCss = Math.hypot(point.x - gesture.startX, point.y - gesture.startY)
      * this.viewportTransform().scale;
    if (!gesture.moved && distanceCss >= JOURNEY_SCROLL_DEAD_ZONE_CSS) gesture.moved = true;
    this.pointerNow = { x: point.x, y: point.y };
    if (gesture.moved) {
      const bounds = this.journeyScrollBounds();
      const deltaArt = (point.y - gesture.startY) / HOME_ARTBOARD_SCALE;
      const rawOffset = gesture.startOffset - deltaArt;
      const rubberOffset = rawOffset < bounds.min
        ? bounds.min + (rawOffset - bounds.min) * 0.28
        : rawOffset > bounds.max
          ? bounds.max + (rawOffset - bounds.max) * 0.28
          : rawOffset;
      this.journeyScrollOffset = Math.max(
        bounds.min - JOURNEY_SCROLL_MAX_OVERSCROLL,
        Math.min(bounds.max + JOURNEY_SCROLL_MAX_OVERSCROLL, rubberOffset),
      );
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsedSeconds = Math.max(0.001, (nowMs - gesture.lastTimeMs) / 1000);
      const sampleDelta = -(point.y - gesture.lastY) / HOME_ARTBOARD_SCALE;
      if (Math.abs(sampleDelta) > 0.01) {
        const instantaneous = sampleDelta / elapsedSeconds;
        gesture.velocity = Math.max(
          -JOURNEY_SCROLL_MAX_VELOCITY,
          Math.min(JOURNEY_SCROLL_MAX_VELOCITY, gesture.velocity * 0.42 + instantaneous * 0.58),
        );
      }
      gesture.lastY = point.y;
      gesture.lastTimeMs = nowMs;
    }
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private updateJourneyScrollMotion(delta: number): void {
    if (this.journeyScrollGesture || this.journeyPresentation || this.screen !== "levels" || this.navigationTransition) return;
    const bounds = this.journeyScrollBounds();
    const target = this.journeyScrollOffset < bounds.min
      ? bounds.min
      : this.journeyScrollOffset > bounds.max
        ? bounds.max
        : undefined;
    if (this.save.reducedMotion) {
      if (target !== undefined || this.journeyScrollVelocity !== 0) {
        this.journeyScrollOffset = target ?? Math.max(bounds.min, Math.min(bounds.max, this.journeyScrollOffset));
        this.journeyScrollVelocity = 0;
        this.dirty = true;
      }
      return;
    }
    if (target !== undefined) {
      const acceleration = (target - this.journeyScrollOffset) * JOURNEY_SCROLL_SPRING
        - this.journeyScrollVelocity * JOURNEY_SCROLL_SPRING_DAMPING;
      this.journeyScrollVelocity += acceleration * delta;
    } else {
      this.journeyScrollVelocity *= Math.exp(-JOURNEY_SCROLL_FRICTION * delta);
    }
    if (target === undefined && Math.abs(this.journeyScrollVelocity) < 4) {
      this.journeyScrollVelocity = 0;
      return;
    }
    this.journeyScrollOffset += this.journeyScrollVelocity * delta;
    this.journeyScrollOffset = Math.max(
      bounds.min - JOURNEY_SCROLL_MAX_OVERSCROLL,
      Math.min(bounds.max + JOURNEY_SCROLL_MAX_OVERSCROLL, this.journeyScrollOffset),
    );
    const remainingTarget = this.journeyScrollOffset < bounds.min
      ? bounds.min
      : this.journeyScrollOffset > bounds.max
        ? bounds.max
        : undefined;
    if (remainingTarget !== undefined
      && Math.abs(this.journeyScrollOffset - remainingTarget) < 0.6
      && Math.abs(this.journeyScrollVelocity) < 12) {
      this.journeyScrollOffset = remainingTarget;
      this.journeyScrollVelocity = 0;
    }
    this.dirty = true;
  }

  private journeyEpisodeTitle(index: number): string {
    const title = JOURNEY_EPISODES.find((episode) => episode.index === index)?.title ?? `${index}`;
    return this.tr("journey.episodeTitle", { title });
  }

  private journeyEpisodeArtIndex(index: number): number {
    return getJourneyEpisodeThemeIndex(index);
  }

  private journeyEpisodeIndexesInView(extraScreens = 0): number[] {
    const viewport = this.journeyRenderViewportArt();
    const origin = this.journeyContentViewportArt().y;
    const margin = viewport.height * extraScreens;
    const indexes = new Set<number>();
    for (const entry of this.journeyContentModel().entries) {
      if (entry.kind !== "episode") continue;
      const y = origin + entry.contentY - this.journeyScrollOffset;
      if (y + this.journeyEntryHeight(entry) >= viewport.y - margin
        && y <= viewport.y + viewport.height + margin) {
        indexes.add(this.journeyEpisodeArtIndex(entry.episode.index));
      }
    }
    const event = this.journeyPresentation?.event;
    if (event?.type === "episode_unlock") indexes.add(this.journeyEpisodeArtIndex(event.episode.index));
    return [...indexes];
  }

  private requestJourneyPresentationArt(retry = false): void {
    const art = this.formalPageArtFor("levels");
    const presentation = this.journeyPresentation;
    if (!presentation || art?.screen !== "levels") return;
    void art.deferred.requestPresentation(retry).catch(() => { /* explicit popup retry */ });
    if (presentation.event.type === "episode_unlock") {
      void art.deferred.requestEpisodes([this.journeyEpisodeArtIndex(presentation.event.episode.index)], retry)
        .catch(() => { /* popup retry also retries its chapter image */ });
    }
  }

  private journeyPresentationArtReady(): boolean {
    const art = this.formalPageArtFor("levels");
    return art?.screen === "levels" && Boolean(art.deferred.presentation)
      && Boolean(this.journeyPresentationRewardImage(art));
  }

  private journeyPresentationArtFailed(): boolean {
    const art = this.formalPageArtFor("levels");
    if (art?.screen !== "levels") return this.formalPageFailed("levels");
    const event = this.journeyPresentation?.event;
    return Boolean(art.deferred.presentationError)
      || (event?.type === "episode_unlock"
        && art.deferred.failedEpisodeIndexes.includes(this.journeyEpisodeArtIndex(event.episode.index)));
  }

  private journeyEpisodeRetryRect(row: JourneyEpisodeScrollEntry): Rect {
    const placement = FORMAL_JOURNEY_LAYOUT.journeyContent.episodeImage;
    return homeArtRect({ x: placement.x, y: row.y + placement.yOffset,
      width: placement.width, height: placement.height });
  }

  private failedVisibleJourneyEpisodes(): JourneyEpisodeScrollEntry[] {
    const art = this.formalPageArtFor("levels");
    if (art?.screen !== "levels") return [];
    return this.journeyScrollView().episodeRows.filter((row) => (
      art.deferred.failedEpisodeIndexes.includes(this.journeyEpisodeArtIndex(row.episode.index))
    ));
  }

  private journeyEpisodeButtonArtRect(row: JourneyEpisodeScrollEntry): HomeArtPlacement {
    const button = FORMAL_JOURNEY_LAYOUT.journeyContent.episodeButton;
    return { x: button.x, y: row.y + button.yOffset, width: button.width, height: button.height };
  }

  private journeyEpisodeButtonRect(row: JourneyEpisodeScrollEntry): Rect {
    const button = homeArtRect(this.journeyEpisodeButtonArtRect(row));
    const viewport = homeArtRect(this.journeyContentViewportArt());
    const left = Math.max(button.x, viewport.x);
    const top = Math.max(button.y, viewport.y);
    const right = Math.min(button.x + button.width, viewport.x + viewport.width);
    const bottom = Math.min(button.y + button.height, viewport.y + viewport.height);
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  private journeyEpisodeIsInteractive(row: JourneyEpisodeScrollEntry): boolean {
    const button = homeArtRect(this.journeyEpisodeButtonArtRect(row));
    const viewport = homeArtRect(this.journeyContentViewportArt());
    return inside(
      button.x + button.width / 2,
      button.y + button.height / 2,
      viewport,
    );
  }

  private journeyEpisodeAt(x: number, y: number): JourneyEpisode | undefined {
    if (!inside(x, y, homeArtRect(this.journeyContentViewportArt()))) return undefined;
    return this.journeyScrollView().episodeRows.find((row) => {
      if (!this.journeyEpisodeIsInteractive(row)) return false;
      const rect = this.journeyEpisodeButtonRect(row);
      return this.interactionHit({ x, y }, rect);
    })?.episode;
  }

  private requestJourneyHomeThemeArt(index: number): Promise<boolean> {
    const episodeIndex = sanitizeJourneyEpisodeIndex(index, this.save.highestLevel);
    if (episodeIndex === 1 && this.art.home) {
      ++this.journeyHomeThemeRequestToken;
      if (this.journeyHomeThemeArt) this.host.releaseImage?.(this.journeyHomeThemeArt);
      this.journeyHomeThemeArt = undefined;
      this.journeyHomeThemeIndex = 1;
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return Promise.resolve(true);
    }
    if (this.journeyHomeThemeIndex === episodeIndex && this.journeyHomeThemeArt) {
      ++this.journeyHomeThemeRequestToken;
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return Promise.resolve(true);
    }
    const token = ++this.journeyHomeThemeRequestToken;
    this.journeyHomeThemeLoading = true;
    const artIndex = this.journeyEpisodeArtIndex(episodeIndex);
    return this.host.createImage(GAME_ART.ui.formalPages.journey.homeThemes[artIndex]).then((image) => {
      if (token !== this.journeyHomeThemeRequestToken) {
        this.host.releaseImage?.(image);
        return false;
      }
      if (this.journeyHomeThemeArt && this.journeyHomeThemeArt !== image) {
        this.host.releaseImage?.(this.journeyHomeThemeArt);
      }
      this.journeyHomeThemeArt = image;
      this.journeyHomeThemeIndex = episodeIndex;
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return true;
    }).catch(() => {
      if (token !== this.journeyHomeThemeRequestToken) return false;
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return false;
    });
  }

  private loadJourneyHomeThemeCandidate(index: number): Promise<JourneyThemeArtCandidate | undefined> {
    const episodeIndex = sanitizeJourneyEpisodeIndex(index, this.save.highestLevel);
    const token = ++this.journeyHomeThemeRequestToken;
    if (episodeIndex === 1 && this.art.home) {
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return Promise.resolve({ episodeIndex });
    }
    if (this.journeyHomeThemeIndex === episodeIndex && this.journeyHomeThemeArt) {
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return Promise.resolve({ episodeIndex, image: this.journeyHomeThemeArt });
    }
    this.journeyHomeThemeLoading = true;
    const artIndex = this.journeyEpisodeArtIndex(episodeIndex);
    return this.host.createImage(GAME_ART.ui.formalPages.journey.homeThemes[artIndex]).then((image) => {
      if (token !== this.journeyHomeThemeRequestToken) {
        this.host.releaseImage?.(image);
        return undefined;
      }
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return { episodeIndex, image };
    }).catch(() => {
      if (token !== this.journeyHomeThemeRequestToken) return undefined;
      this.journeyHomeThemeLoading = false;
      this.dirty = true;
      this.scheduleFrame();
      return undefined;
    });
  }

  private releaseJourneyHomeThemeCandidate(candidate: JourneyThemeArtCandidate | undefined): void {
    if (candidate?.image && candidate.image !== this.journeyHomeThemeArt) {
      this.host.releaseImage?.(candidate.image);
    }
  }

  private commitJourneyHomeThemeCandidate(candidate: JourneyThemeArtCandidate): void {
    if (candidate.episodeIndex === 1) {
      if (this.journeyHomeThemeArt) this.host.releaseImage?.(this.journeyHomeThemeArt);
      this.journeyHomeThemeArt = undefined;
      this.journeyHomeThemeIndex = 1;
      return;
    }
    if (!candidate.image) return;
    if (this.journeyHomeThemeArt && this.journeyHomeThemeArt !== candidate.image) {
      this.host.releaseImage?.(this.journeyHomeThemeArt);
    }
    this.journeyHomeThemeArt = candidate.image;
    this.journeyHomeThemeIndex = candidate.episodeIndex;
  }

  private selectJourneyEpisode(episode: JourneyEpisode): void {
    if (episode.unlockLevel > this.save.highestLevel) {
      this.playSound("blocked");
      this.vibrate("light");
      return;
    }
    if (this.save.selectedJourneyEpisode === episode.index) {
      this.playSound("button");
      return;
    }
    this.pendingJourneyThemeSelection = undefined;
    this.journeyScrollVelocity = 0;
    this.journeyPresentation = {
      event: { type: "episode_unlock", level: episode.unlockLevel, episode },
      phase: "overlay",
      age: 0,
      intent: "theme_selection",
    };
    this.playSound("button");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private openJourneyReward(reward: JourneyReward): void {
    if (this.pendingJourneyClaim && this.pendingJourneyClaim.eventLevel !== reward.level) {
      this.playSound("blocked");
      this.vibrate("light");
      return;
    }
    this.journeyScrollVelocity = 0;
    this.journeyPresentation = {
      event: { type: "milestone_reward", level: reward.level, reward },
      phase: "overlay",
      age: 0,
      intent: "reward_inspection",
    };
    this.playSound("button");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private journeyPresentationRewardClaimed(presentation = this.journeyPresentation): boolean {
    return presentation?.intent === "reward_inspection"
      && presentation.event.type === "milestone_reward"
      && this.save.journeyProgress.claimedMilestoneLevels.includes(presentation.event.level);
  }

  private journeyRewardEarned(reward: Pick<JourneyReward, "level">): boolean {
    return this.save.rewardedLevels.includes(reward.level);
  }

  private journeyRewardClaimable(reward: Pick<JourneyReward, "level">): boolean {
    return this.journeyRewardEarned(reward)
      && !this.save.journeyProgress.claimedMilestoneLevels.includes(reward.level);
  }

  private hasClaimableJourneyReward(): boolean {
    return JOURNEY_MILESTONE_REWARDS.some((reward) => this.journeyRewardClaimable(reward));
  }

  private journeyPresentationRewardReadOnlyText(presentation = this.journeyPresentation): string | undefined {
    if (presentation?.intent !== "reward_inspection" || presentation.event.type !== "milestone_reward") {
      return undefined;
    }
    if (this.journeyPresentationRewardClaimed(presentation)) return this.tr("journey.claimed");
    return !this.journeyRewardEarned(presentation.event.reward)
      ? this.tr("journey.claimAfterLevel", { level: presentation.event.reward.level })
      : undefined;
  }

  private beginPendingJourneyPresentation(): boolean {
    if (this.journeyPresentation) return true;
    // An earned introduction stays pending until the result action has returned
    // to Home (and its coin flight has finished). Never interrupt a board/result.
    if (this.screen !== "home" || this.homeCoinFlight || this.directLevelTransition
      || this.navigationTransition || this.lifeRefillOpen) return false;
    const event = findPendingJourneyEvent(
      this.save.highestLevel,
      this.save.journeyProgress,
      this.save.rewardedLevels,
    );
    if (!event) return false;

    // Milestone rewards stay pending for the Journey page. Completing a level
    // must not interrupt the result/home flow with an automatic Journey
    // navigation or reward modal; the Journey tab already exposes the pending
    // reward through its claim badge when the player chooses to open it.
    if (event.type === "milestone_reward") return false;

    this.journeyPresentation = { event, phase: "progress", age: 0, intent: "progress_event" };
    // Chapter unlocks belong on Home, not an automatic detour through Journey.
    this.navigationTransition = undefined;
    this.navigationPendingTarget = undefined;
    this.setFormalPageIntent("levels");
    this.lastFrame = 0;
    this.dirty = true;
    this.scheduleFrame();
    return true;
  }

  private isHomeEpisodeUnlockPending(): boolean {
    return this.screen === "home"
      && this.journeyPresentation?.intent === "progress_event"
      && this.journeyPresentation.phase === "progress"
      && this.journeyPresentation.event.type === "episode_unlock";
  }

  private updateJourneyPresentation(delta: number): void {
    const presentation = this.journeyPresentation;
    if (!presentation) return;
    this.requestJourneyPresentationArt();
    if (presentation.intent === "theme_selection") return;
    if (presentation.phase === "progress") {
      const episodeUnlock = presentation.event.type === "episode_unlock";
      if (!this.appVisible || this.screen !== (episodeUnlock ? "home" : "levels")
        || !this.formalPageReady("levels") || this.navigationTransition) return;
      const duration = episodeUnlock ? EPISODE_UNLOCK_HOME_DELAY
        : this.save.reducedMotion ? JOURNEY_PROGRESS_REDUCED_DURATION : JOURNEY_PROGRESS_DURATION;
      presentation.age = Math.min(duration, presentation.age + delta);
      if (presentation.age >= duration) {
        presentation.phase = "overlay";
        presentation.age = 0;
        this.screen = "home";
        this.navigationTransition = undefined;
        this.navigationPendingTarget = undefined;
      }
      this.dirty = true;
      return;
    }
    if (presentation.phase !== "claiming") return;
    presentation.age = Math.min(JOURNEY_REWARD_FLIGHT_DURATION, presentation.age + delta);
    if (presentation.age >= JOURNEY_REWARD_FLIGHT_DURATION) {
      this.journeyPresentation = undefined;
      if (presentation.intent === "reward_inspection") {
        // A reward opened from the Journey map returns to that exact map
        // position after its one-off claim animation.
        this.dirty = true;
        return;
      }
      // A partially migrated or long-unopened save can contain more than one
      // earned Journey event. Continue in chronological order instead of
      // leaving an invisible pending reward behind on Home.
      if (!this.beginPendingJourneyPresentation()) this.releaseFormalPageArt();
    }
    this.dirty = true;
  }

  private updateDirectLevelTransition(delta: number): void {
    const transition = this.directLevelTransition;
    if (!transition) return;
    const timing = directLevelTransitionTiming(transition.reducedMotion);
    transition.age = Math.min(timing.duration, transition.age + delta);
    const sample = sampleDirectLevelTransition(transition.age, transition.reducedMotion);
    if (sample.switchReady && !transition.switched) {
      // Unlimited lives can expire after settlement but before the next board
      // arrives. Keep the earned next level available on Home behind the refill
      // dialog instead of stranding a completed board on the playing screen.
      if (!this.canStartCampaignAttempt()) {
        this.directLevelTransition = undefined;
        this.loadLevel(transition.toLevel);
        return;
      }
      transition.switched = true;
      // Start the next run while it is still off-screen so its board can slide
      // in exactly like the reference. A first-time mechanic card waits until
      // the incoming board has settled.
      this.loadLevel(transition.toLevel, true, true);
      // loadLevel rechecks admission; the wall clock may cross the unlimited
      // deadline between the two checks even within this single frame.
      if (this.model.level.id !== transition.toLevel) {
        this.directLevelTransition = undefined;
        this.loadLevel(transition.toLevel);
        return;
      }
    }
    if (sample.finished) {
      this.directLevelTransition = undefined;
      const intro = getScheduledFeatureIntro(this.model.level.id);
      if (intro && !this.save.featureSeen.includes(intro.kind)) this.screen = "feature";
    }
    this.dirty = true;
  }

  private homeCoinTarget(): { x: number; y: number } {
    const icon = homeArtRect(HOME_ART_LAYOUT.coinIcon);
    return {
      x: icon.x + icon.width / 2,
      y: icon.y + icon.height / 2 + this.safeOffsets().top,
    };
  }

  private inspirationTarget(): { x: number; y: number } {
    const placement = homeNavigationIconPlacement("records", "home");
    const rect = homeArtRect(placement);
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2 - this.safeOffsets().bottom,
    };
  }

  private beginHomeCoinFlight(reward: number, start?: { x: number; y: number }): void {
    const safeReward = Math.max(0, Math.floor(reward));
    if (safeReward <= 0) {
      this.beginPendingJourneyPresentation();
      return;
    }
    this.homeCoinFlight = {
      kind: "coins",
      age: 0,
      reward: safeReward,
      start,
      startCoins: Math.max(0, this.save.coins - safeReward),
      endCoins: this.save.coins,
      reducedMotion: this.save.reducedMotion,
      landedCount: 0,
      arrivalPulseAge: Number.POSITIVE_INFINITY,
    };
    this.dirty = true;
    this.scheduleFrame();
  }

  private beginInspirationFlight(reward: number, start?: { x: number; y: number }): void {
    const safeReward = Math.max(0, Math.floor(reward));
    if (safeReward <= 0) return;
    this.homeCoinFlight = {
      kind: "inspiration",
      age: 0,
      reward: safeReward,
      start,
      startCoins: Math.max(0, this.save.collectionProgress.inspiration - safeReward),
      endCoins: this.save.collectionProgress.inspiration,
      reducedMotion: this.save.reducedMotion,
      landedCount: 0,
      arrivalPulseAge: Number.POSITIVE_INFINITY,
    };
    // Keep the exact inspiration icon alive if the player closes the daily
    // popup while the flight is still in progress.
    this.inspirationFlightArt = this.dailyTaskInspirationArt;
    this.dirty = true;
    this.scheduleFrame();
  }

  private updateHomeCoinFlight(delta: number): void {
    const flight = this.homeCoinFlight;
    if (!flight) return;
    flight.age = Math.min(homeCoinFlightDuration(flight.reducedMotion), flight.age + delta);
    flight.arrivalPulseAge += delta;
    const landedCount = homeCoinLandedCount(flight.age, flight.reducedMotion);
    if (landedCount > flight.landedCount) {
      const target = flight.kind === "inspiration" ? this.inspirationTarget() : this.homeCoinTarget();
      for (let index = flight.landedCount; index < landedCount; index += 1) {
        this.emitBurst(target.x, target.y, "#ffd83d", flight.reducedMotion ? 3 : 7, 82, -18, 8);
        this.playSound("reward");
      }
      flight.landedCount = landedCount;
      flight.arrivalPulseAge = 0;
      if (landedCount === homeCoinFlightTiming(flight.reducedMotion).coinCount) this.vibrate("light");
    }
    if (flight.age >= homeCoinFlightDuration(flight.reducedMotion)) {
      this.homeCoinFlight = undefined;
      if (flight.kind === "inspiration" && this.inspirationFlightArt) {
        if (this.inspirationFlightArt !== this.dailyTaskInspirationArt) {
          this.host.releaseImage?.(this.inspirationFlightArt);
        }
        this.inspirationFlightArt = undefined;
      }
      this.beginPendingJourneyPresentation();
    }
    this.dirty = true;
  }

  private displayedHomeCoins(): number {
    const flight = this.homeCoinFlight;
    if (!flight || flight.kind !== "coins") return this.save.coins;
    return displayedCoinBalance(
      flight.startCoins,
      flight.endCoins,
      flight.landedCount,
      homeCoinFlightTiming(flight.reducedMotion).coinCount,
    );
  }

  private homeCoinPulseScale(): number {
    const age = this.homeCoinFlight?.arrivalPulseAge;
    if (age === undefined || !Number.isFinite(age) || age >= 0.18) return 1;
    return 1 + Math.sin((age / 0.18) * Math.PI) * 0.15;
  }

  private directTransitionBoardOffset(): number {
    const transition = this.directLevelTransition;
    if (!transition) return 0;
    return sampleDirectLevelTransition(transition.age, transition.reducedMotion).boardOffsetScreens * LOGICAL_WIDTH;
  }

  private deferJourneyPresentation(): void {
    const presentation = this.journeyPresentation;
    if (!presentation || presentation.phase !== "progress") return;
    // The event remains absent from the claim/seen ledgers. A deferred reward
    // stays visibly claimable from its Journey icon instead of being consumed.
    this.loadLevel(this.save.currentLevel, false);
    this.playSound("button");
  }

  private dismissJourneyPresentation(): void {
    const presentation = this.journeyPresentation;
    if (!presentation || presentation.phase !== "overlay") return;
    if (!this.journeyPresentationArtReady() && presentation.intent === "progress_event") {
      // Closing a loading introduction uses Later without acknowledging it.
      presentation.phase = "progress";
      this.deferJourneyPresentation();
      return;
    }
    if (presentation.intent === "theme_selection") {
      if (this.pendingJourneyThemeSelection) {
        presentation.error = this.tr("journey.applyUnknown");
        this.playSound("blocked");
        this.vibrate("light");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      this.journeyPresentation = undefined;
      void this.requestJourneyHomeThemeArt(this.save.selectedJourneyEpisode);
      this.playSound("button");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.pendingJourneyClaim?.eventLevel === presentation.event.level) {
      presentation.error = presentation.event.type === "episode_unlock"
        ? this.tr("journey.confirmUnknown")
        : this.tr("journey.claimUnknown");
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (presentation.intent === "reward_inspection") {
      this.journeyPresentation = undefined;
      this.playSound("button");
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (presentation.event.type === "episode_unlock") {
      // Episode introductions carry no inventory grant. Closing acknowledges
      // the informational unlock exactly like Continue, so it will not loop.
      this.completeJourneyPresentation();
      return;
    }
    // A reward close is non-destructive: leave its ledger entry untouched so
    // entering Journey later presents the same claim again.
    this.journeyPresentation = undefined;
    this.releaseFormalPageArt();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private completeJourneyThemeSelection(presentation: JourneyPresentation): void {
    if (presentation.intent !== "theme_selection"
      || presentation.phase !== "overlay"
      || presentation.event.type !== "episode_unlock"
      || presentation.themeApplying) return;
    const episode = presentation.event.episode;
    presentation.themeApplying = true;
    presentation.error = undefined;
    this.dirty = true;
    this.scheduleFrame();

    void this.loadJourneyHomeThemeCandidate(episode.index).then((themeCandidate) => {
      if (this.journeyPresentation !== presentation
        || presentation.intent !== "theme_selection"
        || presentation.event.type !== "episode_unlock") {
        this.releaseJourneyHomeThemeCandidate(themeCandidate);
        return;
      }
      presentation.themeApplying = false;
      const themeReady = themeCandidate?.episodeIndex === episode.index
        && (episode.index === 1 ? Boolean(this.art.home) : Boolean(themeCandidate.image));
      if (!themeReady) {
        this.releaseJourneyHomeThemeCandidate(themeCandidate);
        presentation.error = this.tr("journey.backgroundLoadFailed");
        this.playSound("blocked");
        this.vibrate("light");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }

      const pending = this.pendingJourneyThemeSelection?.episodeIndex === episode.index
        ? this.pendingJourneyThemeSelection
        : undefined;
      const baseline = pending?.baselineSave ?? this.cloneSave(this.save);
      const candidate = pending?.candidateSave ?? this.cloneSave(baseline);
      if (!pending) candidate.selectedJourneyEpisode = episode.index;
      this.pendingJourneyThemeSelection = {
        episodeIndex: episode.index,
        baselineSave: baseline,
        candidateSave: candidate,
      };
      const outcome = this.persistVerified(candidate, baseline);
      if (outcome !== "committed") {
        this.releaseJourneyHomeThemeCandidate(themeCandidate);
        if (outcome === "rejected") this.pendingJourneyThemeSelection = undefined;
        presentation.error = outcome === "unknown"
          ? this.tr("journey.applyUnknown")
          : this.tr("journey.applyFailed");
        this.playSound("blocked");
        this.vibrate("light");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }

      this.save = candidate;
      this.commitJourneyHomeThemeCandidate(themeCandidate);
      this.pendingJourneyThemeSelection = undefined;
      this.refreshLifeState();
      this.scheduleLifeRefreshWatch();
      this.journeyPresentation = undefined;
      this.journeyScrollVelocity = 0;
      this.navigationTransition = undefined;
      this.navigationPendingTarget = undefined;
      this.screen = "home";
      this.lastFrame = 0;
      this.releaseFormalPageArt();
      this.playSound("reward");
      this.vibrate("light");
      this.dirty = true;
      this.scheduleFrame();
    });
  }

  private completeJourneyPresentation(): void {
    const presentation = this.journeyPresentation;
    if (!presentation || presentation.phase !== "overlay") return;
    if (presentation.intent === "theme_selection") {
      this.completeJourneyThemeSelection(presentation);
      return;
    }
    if (presentation.intent === "reward_inspection") {
      if (presentation.event.type !== "milestone_reward"
        || !this.journeyRewardEarned(presentation.event.reward)) {
        this.playSound("blocked");
        this.vibrate("light");
        return;
      }
      if (this.journeyPresentationRewardClaimed(presentation)) return;
    }
    if (this.pendingJourneyClaim && this.pendingJourneyClaim.eventLevel !== presentation.event.level) {
      this.playSound("blocked");
      this.vibrate("light");
      return;
    }
    if (presentation.blockedGrant) {
      // Keep the reward unclaimed so it can be collected after the player has
      // spent a capped resource; the second tap dismisses the explanatory view.
      this.pendingJourneyClaim = undefined;
      presentation.blockedGrant = false;
      this.dismissJourneyPresentation();
      return;
    }
    const pending = this.pendingJourneyClaim;
    let baseline: SaveData;
    let candidate: SaveData;
    if (pending?.eventLevel === presentation.event.level) {
      // An ambiguous storage bridge may already have committed this reward.
      // Retry the exact immutable value, including its original life deadline,
      // instead of calculating a second grant from a newer timestamp.
      baseline = pending.baselineSave;
      candidate = pending.candidateSave;
    } else {
      baseline = this.cloneSave(this.save);
      candidate = this.cloneSave(baseline);
      if (presentation.event.type === "episode_unlock") {
        candidate.journeyProgress = {
          ...candidate.journeyProgress,
          seenEpisodeUnlockLevels: [...new Set([
            ...candidate.journeyProgress.seenEpisodeUnlockLevels,
            presentation.event.level,
          ])].sort((left, right) => left - right),
        };
      } else {
        const reward = presentation.event.reward;
        const nowMs = Date.now();
        candidate.lifeState = reconcileLifeState(candidate.lifeState, nowMs);
        if (reward.kind === "coins" && candidate.coins + reward.amount > 999999) {
          presentation.error = this.tr("journey.coinsFull");
          presentation.blockedGrant = true;
          this.playSound("blocked");
          this.vibrate("light");
          this.dirty = true;
          return;
        }
        if ((reward.kind === "time" || reward.kind === "rocket" || reward.kind === "pulse")
          && candidate.boosters[reward.kind] + reward.amount > SUPPLY_ITEMS[reward.kind].maxStock) {
          presentation.error = this.tr("journey.boosterFull");
          presentation.blockedGrant = true;
          this.playSound("blocked");
          this.vibrate("light");
          this.dirty = true;
          return;
        }
        candidate.journeyProgress = {
          ...candidate.journeyProgress,
          claimedMilestoneLevels: [...new Set([
            ...candidate.journeyProgress.claimedMilestoneLevels,
            reward.level,
          ])].sort((left, right) => left - right),
        };
        if (reward.kind === "coins") {
          candidate.coins = Math.min(999999, candidate.coins + reward.amount);
        } else if (reward.kind === "time" || reward.kind === "rocket" || reward.kind === "pulse") {
          candidate.boosters[reward.kind] = Math.min(
            SUPPLY_ITEMS[reward.kind].maxStock,
            candidate.boosters[reward.kind] + reward.amount,
          );
        } else if (reward.kind === "heart") {
          candidate.lifeState = grantLives(candidate.lifeState, reward.amount, nowMs);
        } else if (reward.kind === "unlimited_lives") {
          candidate.lifeState = grantUnlimitedLives(candidate.lifeState, reward.amount * 1000, nowMs);
        }
      }
      this.pendingJourneyClaim = {
        eventLevel: presentation.event.level,
        baselineSave: baseline,
        candidateSave: candidate,
      };
    }
    const outcome = this.persistVerified(candidate, baseline);
    if (outcome !== "committed") {
      if (outcome === "rejected") this.pendingJourneyClaim = undefined;
      presentation.error = outcome === "unknown"
        ? presentation.event.type === "episode_unlock"
          ? this.tr("journey.confirmUnknown")
          : this.tr("journey.claimUnknown")
        : this.tr("journey.claimFailed");
      presentation.blockedGrant = false;
      this.playSound("blocked");
      this.vibrate("light");
      this.dirty = true;
      return;
    }
    this.save = candidate;
    this.pendingJourneyClaim = undefined;
    this.scheduleLifeRefreshWatch();
    presentation.error = undefined;
    presentation.phase = "claiming";
    presentation.age = 0;
    this.playSound("reward");
    this.vibrate("light");
    this.dirty = true;
    this.scheduleFrame();
  }

  private handleDown(point: PointerSample): void {
    if (this.directLevelTransition || this.homeCoinFlight) return;
    if (this.pendingButtonPress) return;
    if (this.leaderboardScrollGesture) return;
    if (this.journeyScrollGesture) return;
    if (this.collectionScrollGesture) return;
    if (this.achievementScrollGesture) return;
    // The board drag owns the gesture stream until its matching pointer ends.
    // In particular, a second finger must not press pause, undo, or a booster
    // while the first finger is still moving a block.
    if (this.activePointer !== undefined) return;
    const target = this.buttonReleaseTargetAt(point);
    const journeyNodeTarget = target?.key.startsWith("journeyNode.") === true
      || target?.key.startsWith("journeyReward.") === true
      || target?.key.startsWith("journeyEpisodeArtRetry.") === true
      || target?.key.startsWith("journeyEpisode.") === true;
    const collectionCardTarget = target?.key.startsWith("collection.") === true;
    const achievementClaimTarget = target?.key.startsWith("achievementClaim.") === true;
    if (journeyNodeTarget && this.beginJourneyScroll(point)) {
      this.pendingButtonPress = {
        ...target,
        pointerId: point.id,
        screen: this.screen,
        inside: true,
      };
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (collectionCardTarget && this.beginCollectionScroll(point)) {
      this.pendingButtonPress = {
        ...target,
        pointerId: point.id,
        screen: this.screen,
        inside: true,
      };
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (achievementClaimTarget && this.beginAchievementScroll(point)) {
      this.pendingButtonPress = {
        ...target,
        pointerId: point.id,
        screen: this.screen,
        inside: true,
      };
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (target) {
      this.pointerNow = { x: point.x, y: point.y };
      this.pendingButtonPress = {
        ...target,
        pointerId: point.id,
        screen: this.screen,
        inside: true,
      };
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.lifeRefillOpen || this.pendingLifeStart) {
      this.executePointerDown(point);
      return;
    }
    if (this.beginJourneyScroll(point)) return;
    if (this.beginLeaderboardScroll(point)) return;
    if (this.beginCollectionScroll(point)) return;
    if (this.beginAchievementScroll(point)) return;
    this.executePointerDown(point);
  }

  private executePointerDown(point: PointerSample): void {
    if (!this.artReady) {
      if (this.artLoadError && this.interactionHit(point, this.startupRetryRect())) {
        this.retryStartupArt();
      }
      return;
    }
    if (!this.storageBaselineReady) {
      if (this.interactionHit(point, BUTTONS.modalPrimary, { anchorY: "end" })) {
        const restored = this.retryStorageBaseline();
        if (restored) this.playSound("button");
        else this.playSound("blocked");
      }
      return;
    }
    this.dirty = true;
    this.scheduleFrame();
    // A second finger may still reach the platform host while one drag owns
    // the game. Never let that non-owner rewrite the active drag's delta base.
    if (this.activePointer === undefined || point.id === this.activePointer) {
      this.pointerNow = { x: point.x, y: point.y };
    }
    if (this.pendingLifeStart) {
      this.ensureCampaignLifeStarted();
      return;
    }
    if (this.lifeRefillOpen) {
      if (this.lifeRefillQuote().missingLives > 0 && this.interactionHit(point, BUTTONS.lifeRefillBuy)) this.buyLifeRefill();
      else if (!this.pendingLifeRefill && this.interactionHit(point, BUTTONS.lifeRefillDismiss)) {
        this.lifeRefillOpen = false;
        this.releaseLifeRefillArt();
        this.playableClockSlices.reset();
        this.lastFrame = 0;
        this.playSound("button");
      }
      return;
    }
    if (this.journeyPresentation) {
      if (this.journeyPresentation.phase === "overlay") {
        if (this.interactionHit(point, BUTTONS.journeyPresentationClose)) {
          this.dismissJourneyPresentation();
        } else if (!this.journeyPresentationArtReady()) {
          if (this.journeyPresentationArtFailed() && this.interactionHit(point, BUTTONS.formalPageRetry)) {
            this.requestJourneyPresentationArt(true);
            this.dirty = true;
            this.scheduleFrame();
          }
        } else if (this.journeyPresentationRewardReadOnlyText() === undefined
          && this.interactionHit(point, BUTTONS.journeyPresentation)) {
          this.completeJourneyPresentation();
        }
      } else if (this.journeyPresentation.phase === "progress"
        && (this.screen === "levels" || this.isHomeEpisodeUnlockPending())
        && this.formalPageFailed("levels")) {
        if (this.interactionHit(point, BUTTONS.formalPageRetry)) {
          this.retryFormalPageArt("levels");
        } else if (this.interactionHit(point, BUTTONS.journeyPresentationLater)) {
          this.deferJourneyPresentation();
        }
      }
      return;
    }
    if (this.pendingSupplyPurchase) {
      const pending = this.pendingSupplyPurchase;
      if (this.screen === "supply" && this.interactionHit(point, this.supplyBuyRect(pending.kind))) {
        this.buySupply(pending.kind);
      } else {
        this.supplyFeedback = { text: this.tr("shop.previousPurchasePending"), color: "#ffcf70" };
        this.playSound("blocked");
      }
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.temporaryLevelSelector) {
      this.handleTemporaryLevelSelector(point);
      this.dirty = true;
      this.scheduleFrame();
      return;
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
    if (this.screen === "mechanismGuide") {
      if (this.interactionHit(point, this.mechanismGuideLayout().close.hit)) {
        this.closeMechanismGuide();
      } else if (!this.formalPageReady("records")) {
        if (this.formalPageFailed("records") && this.interactionHit(point, this.collectionGuideRect(BUTTONS.formalPageRetry))) {
          this.retryFormalPageArt("records");
        }
      } else if (inside(point.x, point.y, this.collectionScrollView().viewport)) {
        for (const entry of this.collectionScrollView().entries) {
          if (!this.collectionEntryIsInteractive(entry)
            || !this.interactionHit(point, this.collectionCardRectForEntry(entry), { bounds: this.collectionScrollView().viewport })) continue;
          this.collectionSelectedId = entry.item.id;
          const unlocked = this.collectionItemUnlocked(entry.item);
          if (unlocked) this.acknowledgeCollectionItemDiscovery(entry.item);
          this.playSound(unlocked ? "button" : "blocked");
          break;
        }
      }
      return;
    }
    if (this.mainNavigationInteractive() && this.handleMainNavigation(point)) {
      if (this.updateToastVisible) this.acknowledgeUpdateNotice();
      return;
    }
    // Keep the fixed tab bar responsive during the brief slide, but do not let
    // a moving page turn the same tap into an unintended purchase or level pick.
    if (this.navigationTransition) return;
    const formalScreen = this.formalPageForScreen();
    if (formalScreen && !this.formalPageReady(formalScreen)) {
      if (this.formalPageFailed(formalScreen) && this.interactionHit(point, BUTTONS.formalPageRetry)) {
        this.retryFormalPageArt(formalScreen);
      }
      return;
    }
    if (this.screen === "home") {
      const safe = this.safeOffsets();
      const bottom = safe.bottom;
      const cardOffset = this.homeCardOffset(bottom);
      if (this.updateToastVisible && this.interactionHit(point, this.offsetRect(BUTTONS.updateToast, 0, safe.top))) {
        this.openUpdateNotice("home");
        return;
      }
      if (this.updateToastVisible) this.acknowledgeUpdateNotice();
      if (this.interactionHit(point, this.offsetRect(BUTTONS.homeLife, 0, safe.top))) {
        this.openLifeRefill();
        this.playSound("button");
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeSettings, 0, safe.top), { anchorY: "end" })) {
        this.screen = "settings";
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.homeMusic)) {
        this.screen = "musicLibrary";
        this.musicLibraryScrollOffset = 0;
        void this.requestMusicLibraryArt();
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.homeAchievements)) {
        const firstClaimable = this.achievementEntries().findIndex(({ claimable }) => claimable);
        this.achievementScrollOffset = firstClaimable >= 0
          ? Math.min(this.achievementMaxScrollOffset(), firstClaimable * ACHIEVEMENT_LAYOUT.rowPitch)
          : Math.min(this.achievementScrollOffset, this.achievementMaxScrollOffset());
        this.achievementFeedback = undefined;
        this.screen = "achievements";
        this.requestAchievementArt();
        this.playSound("button");
      } else if (this.interactionHit(point, this.dailyTaskHomeEntryRect())) {
        this.openDailyTasks();
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homeSupply, 0, safe.top), { anchorY: "end" })) {
        this.supplyFeedback = undefined;
        this.screen = "supply";
        this.setFormalPageIntent("supply");
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.temporaryLevelSelector)) {
        this.openTemporaryLevelSelector();
      } else if (this.interactionHit(point, this.offsetRect(BUTTONS.homePlay, 0, -bottom))) {
        this.playSound("button");
        this.beginSelectedChallenge();
      } else if (this.model.level.id > 1
        && this.interactionHit(point, this.offsetRect(BUTTONS.homePrev, 0, cardOffset))) {
        const previousLevel = this.model.level.id;
        this.loadLevel(this.model.level.id - 1, false);
        if (this.model.level.id !== previousLevel) this.playSound("button");
      } else if (this.model.level.id < this.save.highestLevel
        && this.interactionHit(point, this.offsetRect(BUTTONS.homeNext, 0, cardOffset))) {
        const previousLevel = this.model.level.id;
        this.loadLevel(this.model.level.id + 1, false);
        if (this.model.level.id !== previousLevel) this.playSound("button");
      }
      return;
    }
    if (this.screen === "musicLibrary") {
      const playRect = homeArtRect(musicPreviewRect({ x: 548, y: 515, width: 125, height: 125 }));
      const previousRect = homeArtRect(musicPreviewRect({ x: 420, y: 515, width: 125, height: 125 }));
      const nextRect = homeArtRect(musicPreviewRect({ x: 690, y: 515, width: 125, height: 125 }));
      const progressRect = homeArtRect(musicPreviewRect({ x: 430, y: 420, width: 450, height: 70 }));
      if (this.interactionHit(point, playRect)) {
        const transport = this.host.musicTransport();
        this.host.setMusicPaused(transport.playing);
        this.playSound("button");
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      if (this.interactionHit(point, previousRect)) {
        this.stepMusicTrack(-1);
        return;
      }
      if (this.interactionHit(point, nextRect)) {
        this.stepMusicTrack(1);
        return;
      }
      if (this.interactionHit(point, progressRect)) {
        const width = Math.max(1, progressRect.width);
        const ratio = Math.min(1, Math.max(0, (point.x - progressRect.x) / width));
        const duration = this.host.musicTransport().durationSeconds;
        if (duration > 0) this.host.seekMusic(duration * ratio);
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      if (inside(point.x, point.y, homeArtRect({ x: 650, y: 560, width: 35, height: 570 }))) {
        const midpoint = homeArtRect({ x: 650, y: 560, width: 35, height: 570 }).y + 285;
        this.musicLibraryScrollOffset = point.y > midpoint ? this.musicLibraryMaxScrollOffset() : 0;
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
      if (this.interactionHit(point, BUTTONS.musicClose)) {
        this.screen = "home";
        this.playSound("button");
        return;
      }
      for (const [index, entry] of MUSIC_CATALOG.entries()) {
        if (this.interactionHit(point, this.musicLibraryRowRect(index))) {
          this.selectMusicTrack(entry.id);
          return;
        }
      }
      return;
    }
    if (this.screen === "records") {
      const layout = this.collectionAlbumLayout();
      if (!this.collectionAlbumArt) {
        if (this.collectionAlbumArtError
          && this.interactionHit(point, this.collectionAlbumRetryRect(layout))) {
          this.requestCollectionAlbumArt();
          this.playSound("button");
        }
        return;
      }
      if (this.collectionAlbumDetailId) {
        if (this.interactionHit(point, layout.detail.close.hit)) {
          if (this.pendingCollectionRestoration) {
            this.collectionAlbumFeedback = { text: this.albumText("saveFailed"), color: "#a5414b" };
            this.playSound("blocked");
            this.dirty = true;
            this.scheduleFrame();
            return;
          }
          this.collectionAlbumDetailId = undefined;
          this.collectionAlbumFeedback = undefined;
          this.playSound("button");
        } else if (this.collectionAlbumItemArtworkFailed(findCollectionCatalogItem(this.collectionAlbumDetailId))
          && this.interactionHit(point, layout.detail.artwork)) {
          this.requestCollectionAlbumArtwork(true);
          this.playSound("button");
        } else if (this.collectionAlbumDetailActionVisible()
          && this.interactionHit(point, layout.detail.primaryAction.hit)) {
          this.activateCollectionAlbumDetail();
        }
        return;
      }
      if (this.interactionHit(point, layout.tabs.levels.hit)) {
        this.selectCollectionAlbumTab("levels");
        return;
      }
      if (this.interactionHit(point, layout.tabs.masterpieces.hit)) {
        this.selectCollectionAlbumTab("masterpieces");
        return;
      }
      if (this.interactionHit(point, layout.guide.hit)) {
        this.collectionScrollOffset = 0;
        this.screen = "mechanismGuide";
        this.requestFormalPageArt("records");
        this.playSound("button");
        return;
      }
      if (layout.pagination.previous.enabled && this.interactionHit(point, layout.pagination.previous.hit)) {
        this.changeCollectionAlbumPage(-1);
        return;
      }
      if (layout.pagination.next.enabled && this.interactionHit(point, layout.pagination.next.hit)) {
        this.changeCollectionAlbumPage(1);
        return;
      }
      const items = this.collectionAlbumItems();
      for (const card of layout.cards) {
        if (!card.active || !this.interactionHit(point, card.hit)) continue;
        const item = items[card.itemIndex];
        if (item && this.collectionAlbumItemArtworkFailed(item)) {
          this.requestCollectionAlbumArtwork(true);
          this.playSound("button");
        } else if (item) this.openCollectionAlbumDetail(item);
        return;
      }
      return;
    }
    if (this.screen === "dailyTasks") {
      if (!this.dailyTaskArt) {
        if (this.interactionHit(point, this.dailyTaskCloseRect())) {
          this.closeDailyTasks();
        } else if (this.dailyTaskArtError && this.interactionHit(point, this.dailyTaskRetryRect())) {
          this.requestDailyTaskArt();
          this.playSound("button");
        }
        return;
      }
      if (this.interactionHit(point, this.dailyTaskCloseRect())) {
        if (this.pendingDailyTaskClaim) {
          this.dailyTaskFeedback = { text: this.dailyText("claimUnknown"), color: "#a5414b" };
          this.playSound("blocked");
        } else {
          this.closeDailyTasks();
        }
        return;
      }
      for (const task of this.dailyTaskSummary().tasks) {
        const rect = this.dailyTaskClaimRect(task.id);
        if (!rect || !this.interactionHit(point, rect)) continue;
        this.activateDailyTask(task.id);
        return;
      }
      if (this.interactionHit(point, this.dailyTaskBonusClaimRect())) {
        this.claimDailyTaskReward("bonus");
      }
      return;
    }
    if (this.screen === "achievements") {
      if (this.interactionHit(point, BUTTONS.achievementClose)) {
        if (this.pendingAchievementClaim) {
          this.achievementFeedback = { text: this.tr("achievement.claimUnknown"), color: "#ffbd78" };
          this.playSound("blocked");
        } else {
          this.achievementScrollGesture = undefined;
          this.releaseAchievementArt();
          this.screen = "home";
          this.playSound("button");
        }
        return;
      }
      if (!this.achievementArt) {
        if (this.achievementArtError && this.interactionHit(point, homeArtRect(ACHIEVEMENT_LAYOUT.retry))) {
          this.requestAchievementArt();
          this.playSound("button");
        }
        return;
      }
      const achievement = this.achievementEntryAt(point);
      if (achievement) this.claimAchievement(achievement.entry.id);
      return;
    }
    if (this.screen === "settings") {
      if (this.interactionHit(point, BUTTONS.menuBack)) {
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
      if (this.interactionHit(point, BUTTONS.settingsLanguage)) {
        this.languageSaveFailed = false;
        this.screen = "language";
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.settingsReset)) {
        this.resetSaveFailed = false;
        this.screen = "resetConfirm";
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "language") {
      if (this.interactionHit(point, BUTTONS.languageBack)) {
        if (this.pendingLanguageSelection) {
          this.languageSaveFailed = true;
          this.playSound("blocked");
          this.dirty = true;
          this.scheduleFrame();
          return;
        }
        this.languageSaveFailed = false;
        this.screen = "settings";
        this.playSound("button");
        return;
      }
      for (const entry of GAME_LANGUAGE_METADATA) {
        if (!this.interactionHit(point, LANGUAGE_OPTION_RECTS[entry.language])) continue;
        this.selectLanguage(entry.language);
        return;
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
      if (this.interactionHit(point, BUTTONS.leaderboardWeekly)) {
        this.leaderboardMode = "weekly";
        this.leaderboardScrollView("weekly");
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.leaderboardWorld)) {
        this.leaderboardMode = "world";
        this.leaderboardScrollView("world");
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.leaderboardCountry)) {
        this.leaderboardMode = "country";
        this.leaderboardScrollView("country");
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "levels") {
      const retry = this.failedVisibleJourneyEpisodes().find((row) => (
        this.interactionHit(point, this.journeyEpisodeRetryRect(row), { bounds: this.journeyScrollView().viewport })
      ));
      if (retry) {
        const art = this.formalPageArtFor("levels");
        if (art?.screen === "levels") {
          void art.deferred.requestEpisodes([this.journeyEpisodeArtIndex(retry.episode.index)], true).catch(() => {});
          this.dirty = true;
          this.scheduleFrame();
        }
        return;
      }
      const episode = this.journeyEpisodeAt(point.x, point.y);
      if (episode) {
        this.selectJourneyEpisode(episode);
        return;
      }
      const reward = this.journeyRewardAt(point.x, point.y);
      if (reward) {
        this.openJourneyReward(reward);
        return;
      }
      const levelId = this.levelIdAt(point.x, point.y);
      if (levelId && levelId <= this.save.highestLevel) {
        this.loadLevel(levelId, false);
        this.playSound("button");
      } else if (levelId) this.playSound("blocked");
      return;
    }
    if (this.screen === "feature") {
      if (this.interactionHit(point, BUTTONS.featurePrimary)) {
        const intro = getScheduledFeatureIntro(this.model.level.id);
        if (intro && !this.featureIntroIconArt.image) {
          if (this.featureIntroIconArt.error) this.featureIntroIconArt.retry(intro.kind);
          return;
        }
        if (intro && !this.save.featureSeen.includes(intro.kind)) {
          this.commitTransientAcknowledgement((candidate) => {
            candidate.featureSeen = [
              intro.kind,
              ...candidate.featureSeen.filter((kind) => kind !== intro.kind),
            ].slice(0, 64);
          });
        }
        if (!usesImmediatePlayableClock(this.model.level)) this.model.startCountdown();
        this.playableClockSlices.reset();
        this.lastFrame = 0;
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
      } else if (this.interactionHit(point, BUTTONS.pauseResume)) {
        this.screen = "playing";
        this.lastFrame = 0;
        this.playableClockSlices.reset();
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.pauseRestart)) {
        this.loadLevel(this.model.level.id, true);
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.pauseHome)) {
        this.loadLevel(this.model.level.id, false);
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
      if (this.interactionHit(point, BUTTONS.winPrimary)) {
        const reward = this.winCoinReward;
        this.loadLevel(this.save.currentLevel, false);
        this.beginHomeCoinFlight(reward);
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.winClose)) {
        this.loadLevel(this.save.currentLevel, false);
        this.beginPendingJourneyPresentation();
        this.playSound("button");
      }
      return;
    }
    if (this.screen === "failed") {
      if (this.interactionHit(point, BUTTONS.failedReplay)) {
        if (!this.canStartCampaignAttempt()) return;
        this.loadLevel(this.model.level.id, true);
        this.playSound("button");
      } else if (this.interactionHit(point, BUTTONS.failedHome)) {
        this.loadLevel(this.model.level.id, false);
        this.playSound("button");
      }
      return;
    }
    if (this.screen !== "playing") return;
    if (this.model.snapshot().complete) return;
    if (!this.advanceRevisedClockBeforeMutation()) return;
    if (this.activePointer !== undefined) return;
    this.exitFailure = undefined;

    if (this.interactionHit(point, BUTTONS.undo)) {
      this.dragVisual = undefined;
      if (this.model.undo()) {
        const action = this.undoActions.pop();
        if (action?.booster) {
          this.refundBooster(action.booster);
          this.showBoosterFeedback(
            this.tr("gameplay.booster.refunded", { item: this.boosterName(action.booster) }),
            "#70f0b4",
          );
          this.persist();
        }
        // Earlier clears can still be animating when the latest move is
        // undone. Keep their owners; remove only events absent after restore.
        const pendingExits = new Set(this.model.snapshot().pendingExitAnimations ?? []);
        this.particles = this.particles.filter((particle) => (
          particle.exitAnimationId != null && pendingExits.has(particle.exitAnimationId)
        ));
        this.exitGhosts = this.exitGhosts.filter((ghost) => (
          ghost.exitAnimationOwner === this.model && ghost.exitAnimationId != null
          && pendingExits.has(ghost.exitAnimationId)
        ));
        this.exitPulses = [];
        this.generatorSpawnAnimations = [];
        this.mechanicPulses = [];
        this.revisedTransitions = [];
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
        this.showHudFeedback(this.tr("gameplay.undo.none"), "#aaa5ce");
        this.playSound("blocked");
      }
      return;
    }
    if (this.interactionHit(point, BUTTONS.pause)) {
      this.dragVisual = undefined;
      this.screen = "paused";
      this.playSound("button");
      return;
    }
    if (this.pendingCelebration > 0 || this.hasActiveMechanicMotion()) return;
    if (this.hasInitialRevisedRegionPresentation() || this.revisedArtLoading) return;
    if (this.interactionHit(point, BUTTONS.time)) { this.useBooster("time"); return; }
    if (this.interactionHit(point, BUTTONS.rocket)) { this.useBooster("rocket"); return; }
    if (this.interactionHit(point, BUTTONS.pulse)) { this.useBooster("pulse"); return; }
    if (this.dragVisual?.settling) return;

    const block = this.blockAt(point.x, point.y);
    if (!block) {
      this.boosterTarget = undefined;
      return;
    }
    if (this.boosterTarget === "rocket") {
      if (this.model.clone().removeBlockWithBooster(block.id).ok && !this.ensureCampaignLifeStarted()) return;
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
        this.emitBlockParticles(block, result.color!, "top", 26, false, undefined, result.exitAnimationId);
        this.exitGhosts.push({
          mode: "rocket",
          block: ghost,
          side: "top",
          age: 0,
          duration: this.save.reducedMotion ? 0.12 : 0.3,
          exitAnimationId: result.exitAnimationId,
          exitAnimationOwner: this.model,
          exitCompletionDuration: this.save.reducedMotion ? 0.12 : 0.3,
        });
        this.playSound("rocket");
        this.vibrate("medium");
        this.persist();
        this.showBoosterFeedback(this.tr("gameplay.booster.rocketFired"), "#ffcc55");
        if (result.complete) {
          const completed = this.model.snapshot();
          this.completionMetrics = this.captureCompletionMetrics(completed);
          this.requestWinArt();
          this.pendingCelebration = 0.42;
        }
        this.boosterTarget = undefined;
      } else {
        this.model.cancelAction();
        this.showBoosterFeedback(this.tr("gameplay.booster.blockStillFrozen"), "#ff7d8d");
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
    if (!this.ensureCampaignLifeStarted()) return;

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
      exitFeedbackPortalKeys: new Set(),
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
    // Selecting a block must never itself authorize an exit. The complete
    // footprint is validated only after a real drag sample reaches the gate;
    // this prevents a tap on a partially obstructed edge block from triggering
    // suction before the player has aligned and moved it through the aperture.
    this.vibrate("light");
  }

  private pendingButtonScreenIsValid(pending: PendingButtonPress): boolean {
    if (this.screen === pending.screen) return true;
    return pending.key.startsWith("navigation.")
      && this.isMainNavigationScreen(pending.screen)
      && this.isMainNavigationScreen(this.screen);
  }

  private buttonPressVisualScale(key: string): number {
    const pending = this.pendingButtonPress;
    if (
      key === "settings.sound"
      || key === "settings.haptic"
      || key === "settings.reducedMotion"
      || key === "pause.sound"
      || key === "pause.haptic"
      || key === "pause.reducedMotion"
    ) return 1;
    return pending
      && pending.key === key
      && pending.inside
      && this.pendingButtonScreenIsValid(pending)
      ? BUTTON_PRESSED_SCALE
      : 1;
  }

  private drawPressable(key: string, rect: Rect, draw: () => void): void {
    const scale = this.buttonPressVisualScale(key);
    if (this.pendingButtonPress?.key === key) this.renderedButtonPress = { key, scale };
    if (scale === 1) {
      draw();
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    draw();
    ctx.restore();
  }

  private handleMove(point: PointerSample): void {
    if (this.journeyScrollGesture) {
      if (point.id !== this.journeyScrollGesture.pointerId) return;
      this.updateJourneyScroll(point);
      const gesture = this.journeyScrollGesture;
      if (gesture?.moved && this.pendingButtonPress?.pointerId === point.id) {
        this.pendingButtonPress = undefined;
        this.dirty = true;
        this.scheduleFrame();
      } else if (this.pendingButtonPress?.pointerId === point.id) {
        const insideTarget = this.pendingButtonScreenIsValid(this.pendingButtonPress)
          && inside(point.x, point.y, this.pendingButtonPress.hit);
        if (insideTarget !== this.pendingButtonPress.inside) {
          this.pendingButtonPress.inside = insideTarget;
          this.dirty = true;
          this.scheduleFrame();
        }
      }
      return;
    }
    if (this.collectionScrollGesture) {
      if (point.id !== this.collectionScrollGesture.pointerId) return;
      this.updateCollectionScroll(point);
      const gesture = this.collectionScrollGesture;
      if (gesture?.moved && this.pendingButtonPress?.pointerId === point.id) {
        this.pendingButtonPress = undefined;
        this.dirty = true;
        this.scheduleFrame();
      } else if (this.pendingButtonPress?.pointerId === point.id) {
        const insideTarget = this.pendingButtonScreenIsValid(this.pendingButtonPress)
          && inside(point.x, point.y, this.pendingButtonPress.hit);
        if (insideTarget !== this.pendingButtonPress.inside) {
          this.pendingButtonPress.inside = insideTarget;
          this.dirty = true;
          this.scheduleFrame();
        }
      }
      return;
    }
    if (this.achievementScrollGesture) {
      if (point.id !== this.achievementScrollGesture.pointerId) return;
      this.updateAchievementScroll(point);
      const gesture = this.achievementScrollGesture;
      if (gesture?.moved && this.pendingButtonPress?.pointerId === point.id) {
        this.pendingButtonPress = undefined;
        this.dirty = true;
        this.scheduleFrame();
      } else if (this.pendingButtonPress?.pointerId === point.id) {
        const insideTarget = this.pendingButtonScreenIsValid(this.pendingButtonPress)
          && inside(point.x, point.y, this.pendingButtonPress.hit);
        if (insideTarget !== this.pendingButtonPress.inside) {
          this.pendingButtonPress.inside = insideTarget;
          this.dirty = true;
          this.scheduleFrame();
        }
      }
      return;
    }
    if (this.pendingButtonPress) {
      if (point.id !== this.pendingButtonPress.pointerId) return;
      this.pointerNow = { x: point.x, y: point.y };
      const insideTarget = this.pendingButtonScreenIsValid(this.pendingButtonPress)
        && inside(point.x, point.y, this.pendingButtonPress.hit);
      if (insideTarget !== this.pendingButtonPress.inside) {
        this.pendingButtonPress.inside = insideTarget;
        this.dirty = true;
        this.scheduleFrame();
      }
      return;
    }
    if (this.updateLeaderboardScroll(point)) return;
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
    const synced = this.syncDragGridCandidate(visual, swept.path);
    const moved = synced.moved;
    if (moved && this.model.level.id === 1 && !this.save.featureSeen.includes("basics")) {
      this.commitTransientAcknowledgement((candidate) => {
        candidate.featureSeen = [
          "basics",
          ...candidate.featureSeen.filter((kind) => kind !== "basics"),
        ].slice(0, 64);
      });
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
    // Start the pull as soon as the complete rigid footprint is within the
    // final touch-jitter band. captureAlignedExit snaps to the committed lane
    // before revalidating, so the wider capture band cannot admit a leading
    // tip or an obstructed shape.
    if (this.captureAlignedExit(point, board, intendedSide)) {
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
      // A collision only gives tactile feedback on the block being dragged.
      // Do not select or frame the other block that happened to stop it.
      this.blockerFocusBlockId = undefined;
      this.blockerFocusTime = 0;
      if (this.elapsed - this.lastBlockedFeedbackAt > 0.22) {
        this.vibrate("light");
        this.lastBlockedFeedbackAt = this.elapsed;
      }
    }
    // Latch failure feedback to the physical aperture, not merely its side.
    // Two independent local portals may face the same direction; visiting one
    // must never suppress the other. Legacy gates retain their former side key.
    const physicalPortals = currentBlock
      ? matchingContinuousExitPortals(
          this.model.snapshot(),
          currentBlock,
          ["top", "right", "bottom", "left"],
        ).filter(({ portal }) => isContinuousPoseAtPortal(visual, currentBlock.shape, portal, 0.04, this.model.level.mechanismRules))
      : [];
    const activePortalKeys = new Set(physicalPortals.map((candidate) => this.exitPortalFeedbackKey(candidate)));
    for (const key of visual.exitFeedbackPortalKeys) {
      if (!activePortalKeys.has(key)) visual.exitFeedbackPortalKeys.delete(key);
    }
    const activeLegacySides = new Set(physicalPortals
      .filter(({ authoredPortal }) => !authoredPortal)
      .map(({ portal }) => portal.side));
    for (const latchedSide of visual.exitFeedbackSides) {
      if (!activeLegacySides.has(latchedSide)) visual.exitFeedbackSides.delete(latchedSide);
    }
    const outwardPortals = physicalPortals.filter(({ portal }) => this.pointerIsPastPortal(point, portal, board));
    const failedPortal = choosePortalReleaseCandidate(outwardPortals, point, board, intendedSide);
    if (failedPortal) {
      const feedbackKey = this.exitPortalFeedbackKey(failedPortal);
      const alreadyLatched = failedPortal.authoredPortal
        ? visual.exitFeedbackPortalKeys.has(feedbackKey)
        : visual.exitFeedbackSides.has(failedPortal.portal.side);
      if (!alreadyLatched) {
        if (failedPortal.authoredPortal) visual.exitFeedbackPortalKeys.add(feedbackKey);
        else visual.exitFeedbackSides.add(failedPortal.portal.side);
        this.attemptExit(failedPortal.portal.side);
      }
    }
    this.dirty = true;
  }

  private handleUp(point: PointerSample): void {
    if (this.journeyScrollGesture) {
      if (point.id !== this.journeyScrollGesture.pointerId) return;
      this.updateJourneyScroll(point);
      const moved = this.journeyScrollGesture?.moved === true;
      const releaseVelocity = this.journeyScrollGesture?.velocity ?? 0;
      this.journeyScrollGesture = undefined;
      this.journeyScrollVelocity = moved && !this.save.reducedMotion
        ? Math.max(-JOURNEY_SCROLL_MAX_VELOCITY, Math.min(JOURNEY_SCROLL_MAX_VELOCITY, releaseVelocity))
        : 0;
      if (moved || !this.pendingButtonPress) {
        if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
        this.pointerNow = { x: point.x, y: point.y };
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
    }
    if (this.collectionScrollGesture) {
      if (point.id !== this.collectionScrollGesture.pointerId) return;
      this.updateCollectionScroll(point);
      const moved = this.collectionScrollGesture?.moved === true;
      this.collectionScrollGesture = undefined;
      if (moved || !this.pendingButtonPress) {
        if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
        this.pointerNow = { x: point.x, y: point.y };
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
    }
    if (this.achievementScrollGesture) {
      if (point.id !== this.achievementScrollGesture.pointerId) return;
      this.updateAchievementScroll(point);
      const moved = this.achievementScrollGesture?.moved === true;
      this.achievementScrollGesture = undefined;
      if (moved || !this.pendingButtonPress) {
        if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
        this.pointerNow = { x: point.x, y: point.y };
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
    }
    if (this.pendingButtonPress) {
      if (point.id !== this.pendingButtonPress.pointerId) return;
      const pending = this.pendingButtonPress;
      const current = this.buttonReleaseTargetAt(point);
      const activate = this.pendingButtonScreenIsValid(pending)
        && inside(point.x, point.y, pending.hit)
        && current?.key === pending.key;
      this.pendingButtonPress = undefined;
      this.pointerNow = { x: point.x, y: point.y };
      this.dirty = true;
      this.scheduleFrame();
      if (activate) this.executePointerDown(point);
      return;
    }
    if (this.leaderboardScrollGesture) {
      if (point.id !== this.leaderboardScrollGesture.pointerId) return;
      this.updateLeaderboardScroll(point);
      this.leaderboardScrollGesture = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
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
        if (!this.moveBlockStepWithPresentation(blockBeforeSnap.id, pose.x, pose.y)) break;
      }
      const snappedBlock = this.model.getBlock(blockBeforeSnap.id);
      if (snappedBlock) {
        visualBeforeSnap.modelX = snappedBlock.x;
        visualBeforeSnap.modelY = snappedBlock.y;
      }
    }
    const dx = point.x - this.pointerDown.x;
    const dy = point.y - this.pointerDown.y;
    const inferred: Side | undefined = Math.abs(dx) > Math.abs(dy)
      ? (dx < -board.cell * 0.7 ? "left" : dx > board.cell * 0.7 ? "right" : undefined)
      : (dy < -board.cell * 0.7 ? "top" : dy > board.cell * 0.7 ? "bottom" : undefined);
    // A release can be the first event carrying the final sub-cell sample.
    // Apply the same near-rail capture used during move events before the
    // ordinary pointerup bookkeeping commits or settles the drag.
    this.captureAlignedExit(point, board, inferred);
    if (this.selectedId) {
      const block = this.model.getBlock(this.selectedId);
      const visual = this.dragVisual;
      if (block && visual) {
        const physical = matchingContinuousExitPortals(
          this.model.snapshot(),
          block,
          ["top", "right", "bottom", "left"],
        );
        const outward = physical.filter(({ portal }) => (
          isContinuousPoseAtPortal(visual, block.shape, portal, 0.04, this.model.level.mechanismRules)
          && this.pointerIsPastPortal(point, portal, board)
        ));
        const explicitPortal = choosePortalReleaseCandidate(
          outward,
          point,
          board,
          this.exitSideFromPointer(point.x, point.y, board) ?? inferred,
        );
        if (explicitPortal) {
          const feedbackKey = this.exitPortalFeedbackKey(explicitPortal);
          const alreadyLatched = explicitPortal.authoredPortal
            ? visual.exitFeedbackPortalKeys.has(feedbackKey)
            : visual.exitFeedbackSides.has(explicitPortal.portal.side);
          if (!alreadyLatched) {
            if (explicitPortal.authoredPortal) visual.exitFeedbackPortalKeys.add(feedbackKey);
            else visual.exitFeedbackSides.add(explicitPortal.portal.side);
            this.attemptExit(explicitPortal.portal.side);
          }
        }
      }
    }
    if (this.selectedId) {
      const block = this.model.getBlock(this.selectedId);
      const visual = this.dragVisual;
      const possible = block
        && visual
        ? matchingContinuousExitPortals(
            this.model.snapshot(),
            block,
            this.model.possibleExitSides(block),
          ).filter(({ portal }) => (
            isContinuousPoseAtPortal(visual, block.shape, portal, 0.04, this.model.level.mechanismRules)
          ))
        : [];
      const releasePortal = choosePortalReleaseCandidate(possible, point, board, inferred);
      if (releasePortal) this.attemptExit(releasePortal.portal.side);
    }
    if (this.selectedId) {
      const wasDragged = this.dragVisual?.started === true;
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
      if (wasDragged) this.playSound("putdown");
    }
    this.selectedId = undefined;
    this.activePointer = undefined;
    this.selectionAssist = undefined;
    this.strategyNudgeDrag = undefined;
    this.grabFeedbackTime = 0;
  }

  private handleCancel(point: PointerSample): void {
    if (this.journeyScrollGesture?.pointerId === point.id) {
      this.journeyScrollGesture = undefined;
      this.journeyScrollVelocity = 0;
      if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.collectionScrollGesture?.pointerId === point.id) {
      this.collectionScrollGesture = undefined;
      if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.achievementScrollGesture?.pointerId === point.id) {
      this.achievementScrollGesture = undefined;
      if (this.pendingButtonPress?.pointerId === point.id) this.pendingButtonPress = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.pendingButtonPress?.pointerId === point.id) {
      this.pendingButtonPress = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (this.leaderboardScrollGesture?.pointerId === point.id) {
      this.leaderboardScrollGesture = undefined;
      this.dirty = true;
      this.scheduleFrame();
      return;
    }
    if (point.id !== this.activePointer) return;
    // pointercancel is common when a system gesture interrupts the final
    // touch sample. If the rigid piece is already in a legal portal lane,
    // finish the same suction the competitor shows instead of rolling back a
    // completed alignment. A non-aligned gesture still cancels normally.
    if (this.selectedId && this.dragVisual) {
      // Some WebKit/WeChat builds put the last finger coordinate on the
      // cancel event instead of sending a final move. Consume that sample once
      // before deciding whether this is a genuine interrupted drag.
      this.handleMove(point);
      const board = this.boardLayout();
      if (this.captureAlignedExit(undefined, board)) {
        this.reconcileGeneratorSpawnAnimations(this.model.snapshot());
        this.dirty = true;
        this.scheduleFrame();
        return;
      }
    }
    if (this.selectedId && this.advanceRevisedClockBeforeMutation()) this.model.cancelAction();
    this.reconcileGeneratorSpawnAnimations(this.model.snapshot());
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
    if (!this.advanceRevisedClockBeforeMutation()) return;
    if (!this.boosterUnlocked(kind)) {
      this.boosterTarget = undefined;
      const item = SUPPLY_ITEMS[kind];
      this.showBoosterFeedback(this.tr("gameplay.booster.unlockAtLevel", {
        item: this.boosterName(kind),
        level: item.unlockLevel,
      }), "#aaa5ce");
      this.playSound("blocked");
      return;
    }
    if (kind === "time" && (this.model.snapshot().timeFreezeSeconds ?? 0) > 0) {
      this.boosterTarget = undefined;
      this.showBoosterFeedback(this.tr("gameplay.booster.timeFull"), "#66d8ff");
      this.playSound("blocked");
      return;
    }
    if (this.save.boosters[kind] <= 0) {
      this.boosterTarget = undefined;
      this.showBoosterFeedback(
        this.tr("gameplay.booster.depleted", { item: this.boosterName(kind) }),
        "#ff7d8d",
      );
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
    const preview = this.model.clone();
    const wouldChange = kind === "time" ? preview.freezeTime(TIME_FREEZE_SECONDS) : preview.thawAll(2);
    if (wouldChange && !this.ensureCampaignLifeStarted()) return;
    const before = this.model.snapshot();
    this.model.beginAction();
    const changed = kind === "time"
      ? this.model.freezeTime(TIME_FREEZE_SECONDS)
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
      this.playSound(kind === "time" ? "time" : kind === "pulse" ? "pulse" : "booster");
      this.vibrate("light");
      if (kind === "pulse") this.emitBurst(248, 560, "#72f6ff", 28, 150);
      this.showBoosterFeedback(
        kind === "time" ? this.tr("gameplay.booster.timeAdded") : this.tr("gameplay.booster.mechanismReduced"),
        kind === "time" ? "#66d8ff" : "#bd91ff",
      );
    } else {
      this.model.cancelAction();
      this.showBoosterFeedback(
        kind === "time" ? this.tr("gameplay.booster.timeFull") : this.tr("gameplay.booster.noMechanism"),
        "#ffbd55",
      );
      this.playSound("blocked");
    }
  }

  private commitAction(booster?: Booster): boolean {
    const before = this.model.snapshot();
    const committed = this.model.commitAction(booster == null);
    if (committed) {
      this.captureGeneratorSpawns(before, this.model.snapshot());
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
    if (!inside(x, y, homeArtRect(this.journeyContentViewportArt()))) return undefined;
    const rows = this.journeyScrollView().rewardRows;
    for (let index = 0; index < rows.length; index += 1) {
      if (!this.journeyRowIsInteractive(rows[index])) continue;
      if (this.interactionHit({ x, y }, this.journeyNodeRect(index))) return rows[index].levelId;
    }
    return undefined;
  }

  private journeyRewardAt(x: number, y: number): JourneyReward | undefined {
    if (!inside(x, y, homeArtRect(this.journeyContentViewportArt()))) return undefined;
    return this.journeyScrollView().rewardRows.find((row) => (
      this.journeyRewardIsInteractive(row)
      && this.interactionHit({ x, y }, this.journeyRewardRectForRow(row))
    ))?.reward;
  }

  /**
   * Capture a fully aligned piece during the final touch fraction before the
   * pointer reaches the exact rail. When the floating pose has crossed the
   * half-cell boundary, probe the one legal grid step leading into a matching
   * portal so the pull starts at the same point as the reference game. The
   * model still decides whether the exit is legal; this never admits a partial
   * footprint through a narrow aperture.
   */
  private captureAlignedExit(
    point: PointerSample | undefined,
    board: BoardLayout,
    intendedSide?: Side,
  ): boolean {
    if (!this.selectedId || !this.dragVisual || this.dragVisual.blockId !== this.selectedId) return false;
    const block = this.model.getBlock(this.selectedId);
    const visual = this.dragVisual;
    if (!block || visual.settling || !visual.started) return false;
    const collectCandidates = (): ContinuousExitPortalMatch[] => {
      const current = this.model.getBlock(this.selectedId!);
      if (!current) return [];
      return matchingContinuousExitPortals(
        this.model.snapshot(),
        current,
        this.model.possibleExitSides(current),
      ).filter(({ portal }) => isContinuousPoseAtPortal(
        visual,
        current.shape,
        portal,
        EXIT_CAPTURE_TOLERANCE,
        this.model.level.mechanismRules,
      ));
    };
    let candidates = collectCandidates();
    if (candidates.length === 0) {
      // The normal drag grid keeps 0.08-cell hysteresis to prevent jitter.
      // Exit capture is the intentional exception: at exactly half a cell,
      // probe the next legal anchor, but only if that anchor is a complete,
      // same-colour, unobstructed portal match in a cloned model.
      const halfCellSteps = candidateGridSteps(visual, block, 0).filter((step) => {
        const stepSide: Side = step.x < block.x ? "left"
          : step.x > block.x ? "right"
            : step.y < block.y ? "top" : "bottom";
        if (intendedSide && intendedSide !== stepSide) return false;
        const probe = this.model.clone();
        const probeBlock = probe.getBlock(block.id);
        if (!probeBlock || !probe.moveBlockStep(block.id, step.x, step.y)) return false;
        const target = probe.getBlock(block.id);
        if (!target) return false;
        const targetPortals = matchingContinuousExitPortals(
          probe.snapshot(),
          target,
          probe.possibleExitSides(target),
        );
        return targetPortals.some(({ portal }) => isContinuousPoseAtPortal(
          { x: step.x, y: step.y },
          target.shape,
          portal,
          0.04,
          this.model.level.mechanismRules,
        ));
      });
      const halfCellStep = halfCellSteps[0];
      if (halfCellStep && this.moveBlockStepWithPresentation(
        block.id,
        halfCellStep.x,
        halfCellStep.y,
      )) {
        visual.x = halfCellStep.x;
        visual.y = halfCellStep.y;
        visual.modelX = halfCellStep.x;
        visual.modelY = halfCellStep.y;
        candidates = collectCandidates();
      }
    }
    if (candidates.length === 0) return false;
    const alignedBlock = this.model.getBlock(this.selectedId);
    if (!alignedBlock) return false;
    const candidate = point
      ? choosePortalReleaseCandidate(candidates, point, board, intendedSide)
      : candidates[0];
    if (!candidate) return false;

    // The committed integer anchor is the authoritative suction lane. Snap
    // only after the complete shape has matched that lane; no partial tip can
    // bypass the existing full-shape and path checks in attemptExit().
    const anchorAligned = isContinuousPoseAtPortal(
      { x: alignedBlock.x, y: alignedBlock.y },
      alignedBlock.shape,
      candidate.portal,
      0.04,
      this.model.level.mechanismRules,
    );
    if (!anchorAligned) return false;
    visual.x = alignedBlock.x;
    visual.y = alignedBlock.y;
    visual.modelX = alignedBlock.x;
    visual.modelY = alignedBlock.y;
    this.attemptExit(candidate.portal.side);
    return true;
  }

  private attemptExit(side: Side): void {
    if (!this.selectedId) return;
    if (!this.advanceRevisedClockBeforeMutation()) return;
    const block = this.model.getBlock(this.selectedId);
    if (!block) return;
    // Keep the model's integer frontier and the rendered drag pose in lockstep.
    // Several input paths converge here; re-check the complete rigid footprint
    // so a stale/early path cannot suck a block through a gate when only its
    // leading cell (or an obstructed presentation pose) has reached the edge.
    const dragVisualPose = this.dragVisual?.blockId === block.id ? this.dragVisual : undefined;
    if (dragVisualPose) {
      const aligned = matchingContinuousExitPortals(
        this.model.snapshot(),
        block,
        [side],
      ).some(({ portal }) => isContinuousPoseAtPortal(
        dragVisualPose,
        block.shape,
        portal,
        0.04,
        this.model.level.mechanismRules,
      ));
      if (!aligned) return;
    }
    const status = this.model.exitAttemptStatus(this.selectedId, side);
    if (status !== "ok") {
      this.showExitFailure(block, status);
      return;
    }
    this.exitFailure = undefined;
    // Exit eligibility is resolved on the model's integer grid. Start the
    // suction ghost from that same occupied lane instead of the pointer's
    // fractional drag pose: a wide gate can contain several valid lanes, and
    // the block must leave through the exact one it reached on the board.
    const ghost = JSON.parse(JSON.stringify(block)) as BlockState;
    // A layered block remains in the model after its outer shell is removed;
    // retain its drag pose only for that block's settle-back animation.
    const visual = this.dragVisual?.blockId === block.id ? this.dragVisual : undefined;
    const before = this.model.snapshot();
    const result = this.model.tryExit(this.selectedId, side);
    if (!result.ok) return;
    if (before.levelId === 1 && !this.save.featureSeen.includes("basics")) {
      this.commitTransientAcknowledgement((candidate) => {
        candidate.featureSeen = [
          "basics",
          ...candidate.featureSeen.filter((kind) => kind !== "basics"),
        ].slice(0, 64);
      });
    }
    const after = this.model.snapshot();
    this.noClearMoveStreak = 0;
    this.strategyNudgeAcknowledged = true;
    this.strategyFollowupAvailableAt = undefined;
    this.strategyFollowupAction = undefined;
    this.strategyFollowupDrags = 0;
    this.strategyRescueDrags = 0;
    const resolvedPortal = this.resolvedExitPortal(before, result.gateId, result.portalIndex);
    const exitCells = ghost.shape.map(([dx, dy]) => [ghost.x + dx, ghost.y + dy] as Point);
    const mechanismSource = resolvedPortal
      ? gatePortalExitLaneCenter(resolvedPortal.portal, exitCells, this.boardLayout())
      : undefined;
    const mechanicDelay = result.layerRemoved || this.save.reducedMotion
      ? this.exitToMechanicDelay()
      : GATE_EXIT_MECHANIC_DELAY;
    this.emitMechanicFeedback(before, after, mechanicDelay, mechanismSource);
    const retireGate = !this.snapshotContainsColor(after, result.color!);
    this.emitExitPulse(resolvedPortal, result.color!, retireGate);
    if (result.layerRemoved) {
      const reduced = this.save.reducedMotion;
      const duration = shellPeelDuration(reduced);
      const fallbackTravel = side === "top" ? Math.max(...exitCells.map(([, y]) => y)) + 1
        : side === "bottom" ? before.height - Math.min(...exitCells.map(([, y]) => y))
          : side === "left" ? Math.max(...exitCells.map(([x]) => x)) + 1
            : before.width - Math.min(...exitCells.map(([x]) => x));
      // Keep the removed material itself, including its true footprint. The
      // inner block remains the model's live block and never leaves the grid.
      this.exitGhosts.push({
        mode: "shell", shellReducedMotion: reduced, block: ghost, side, color: result.color!, age: 0,
        duration: reduced ? duration : Math.max(duration, GATE_EXIT_FRAGMENT_DELAY + GATE_EXIT_EMIT_DURATION),
        exitCompletionDuration: duration,
        travelCells: (resolvedPortal ? gatePortalExitTravelCells(resolvedPortal.portal, exitCells) : fallbackTravel) + 0.04,
        tangentSpanCells: resolvedPortal ? gatePortalExitTangentSpanCells(resolvedPortal.portal, exitCells) : 1,
        sourceX: mechanismSource?.x, sourceY: mechanismSource?.y,
        fragmentCount: reduced ? 4 : 28,
        emittedFragments: 0, fragmentDelay: reduced ? 0.03 : GATE_EXIT_FRAGMENT_DELAY,
        fragmentEmitDuration: reduced ? 0.08 : GATE_EXIT_EMIT_DURATION,
        fragmentSeed: stableStringSeed(`${before.levelId}:${before.moves}:${block.id}:shell`),
        exitAnimationId: result.exitAnimationId, exitAnimationOwner: this.model,
        gateId: result.gateId, portalIndex: result.portalIndex,
        portal: resolvedPortal ? { ...resolvedPortal.portal, origin: [...resolvedPortal.portal.origin] as Point } : undefined,
      });
    } else {
      const cells = exitCells;
      const minX = Math.min(...cells.map(([x]) => x));
      const maxX = Math.max(...cells.map(([x]) => x));
      const minY = Math.min(...cells.map(([, y]) => y));
      const maxY = Math.max(...cells.map(([, y]) => y));
      const travelCells = resolvedPortal
        ? gatePortalExitTravelCells(resolvedPortal.portal, cells)
        : side === "top"
          ? maxY + 1
          : side === "bottom"
            ? before.height - minY
            : side === "left"
              ? maxX + 1
              : before.width - minX;
      const tangentSpanCells = resolvedPortal
        ? gatePortalExitTangentSpanCells(resolvedPortal.portal, cells)
        : side === "top" || side === "bottom"
          ? maxX - minX + 1
          : maxY - minY + 1;
      const reduced = this.save.reducedMotion;
      this.exitGhosts.push({
        mode: "gate",
        block: ghost,
        side,
        color: result.color!,
        age: 0,
        duration: reduced ? 0.14 : GATE_EXIT_FRAGMENT_DELAY + GATE_EXIT_EMIT_DURATION,
        alignedX: block.x,
        alignedY: block.y,
        ingestDuration: reduced ? 0.14 : GATE_EXIT_INGEST_DURATION,
        exitAnimationId: result.exitAnimationId,
        exitAnimationOwner: this.model,
        // The block has fully crossed the gate at the end of ingestion.
        // Decorative fragment emission can continue after this event.
        exitCompletionDuration: reduced ? 0.14 : GATE_EXIT_INGEST_DURATION,
        travelCells: Math.max(0.2, travelCells + 0.04),
        tangentSpanCells,
        sourceX: mechanismSource?.x,
        sourceY: mechanismSource?.y,
        fragmentCount: reduced
          ? 6
          : result.color === "blue" || result.color === "cyan"
            ? GATE_EXIT_FRAGMENT_COUNT + 8
            : GATE_EXIT_FRAGMENT_COUNT,
        emittedFragments: 0,
        fragmentDelay: reduced ? 0 : GATE_EXIT_FRAGMENT_DELAY,
        fragmentEmitDuration: reduced ? 0.14 : GATE_EXIT_EMIT_DURATION,
        fragmentSeed: stableStringSeed(`${before.levelId}:${before.moves}:${block.id}:${result.gateId ?? side}:${result.portalIndex ?? 0}:${result.color}`),
        gateId: result.gateId,
        portalIndex: result.portalIndex,
        portal: resolvedPortal ? { ...resolvedPortal.portal, origin: [...resolvedPortal.portal.origin] as Point } : undefined,
      });
    }
    this.commitAction();
    // `tryExit` mutates the board before the action is committed. Capture the
    // final drag count after commit so the move-star condition includes the
    // exit that actually cleared the last block.
    if (result.complete) this.completionMetrics = this.captureCompletionMetrics(this.model.snapshot());
    this.playSound(result.layerRemoved ? "shell" : "exit");
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
    if (result.complete) {
      this.pendingCelebration = this.save.reducedMotion ? 0.24 : GATE_EXIT_TOTAL_DURATION;
      // Lv1-4 flow directly into the next challenge and never needs result art.
      // Later levels preload the result while the final block finishes exiting.
      if (!shouldDirectAdvanceAfterClear(this.model.level.id, LEVELS.length)) this.requestWinArt();
    }
  }

  private captureCompletionMetrics(snapshot: ReturnType<PuzzleModel["snapshot"]>): CompletionMetrics {
    const fallbackElapsed = Math.max(0, this.model.level.timeSeconds - snapshot.remainingSeconds);
    return {
      moves: snapshot.moves,
      // `runElapsedSeconds` is monotonic across time-booster use and excludes
      // the celebration delay that follows the final exit.
      elapsedSeconds: this.runElapsedSeconds > 0
        ? this.runElapsedSeconds
        : fallbackElapsed,
    };
  }

  private createPendingSettlement(): PendingSettlement {
    const snapshot = this.model.snapshot();
    const levelKey = String(this.model.level.id);
    const candidateSave = this.cloneSave(this.save);
    candidateSave.lifeState = completeLifeAttempt(candidateSave.lifeState, Date.now());
    const assistedClear = (candidateSave.activeRun?.boosterSpent.rocket ?? 0) > 0
      || (candidateSave.activeRun?.boosterSpent.pulse ?? 0) > 0;
    const completion = this.completionMetrics ?? this.captureCompletionMetrics(snapshot);
    const starEvaluation = evaluateLevelStars(this.model.level, completion);
    const earnedStars = starEvaluation.earnedStars;
    const previousBestStars = candidateSave.bestStars[levelKey] ?? 0;
    candidateSave.bestStars[levelKey] = Math.max(previousBestStars, earnedStars);
    const previousMoves = candidateSave.bestMoves[levelKey];
    if (!assistedClear && (!previousMoves || snapshot.moves < previousMoves)) candidateSave.bestMoves[levelKey] = snapshot.moves;
    const firstClearReward = !candidateSave.rewardedLevels.includes(this.model.level.id);
    if (firstClearReward) {
      candidateSave.rewardedLevels.push(this.model.level.id);
    }
    const inspirationReward = collectionInspirationForResult(
      this.model.level.id,
      previousBestStars,
      earnedStars,
      firstClearReward,
    );
    if (inspirationReward > 0) {
      candidateSave.collectionProgress = {
        ...candidateSave.collectionProgress,
        inspiration: Math.min(
          Number.MAX_SAFE_INTEGER,
          candidateSave.collectionProgress.inspiration + inspirationReward,
        ),
      };
    }

    const coinReward = getCompletionCoinReward(firstClearReward);
    candidateSave.coins += coinReward;

    const previousHighestLevel = candidateSave.highestLevel;
    const nextLevel = Math.min(LEVELS.length, this.model.level.id + 1);
    const advancesJourney = firstClearReward
      && this.model.level.id === previousHighestLevel
      && nextLevel > previousHighestLevel;
    if (advancesJourney) {
      candidateSave.highestLevel = nextLevel;
      candidateSave.currentLevel = nextLevel;
    }
    const boostersUsed = candidateSave.activeRun
      ? Object.values(candidateSave.activeRun.boosterSpent).reduce((sum, count) => sum + count, 0)
      : 0;
    candidateSave.dailyTaskProgress = applyDailyTaskRun(
      reconcileDailyTaskProgress(candidateSave.dailyTaskProgress, new Date(), candidateSave.highestLevel),
      {
        completedLevels: 1,
        earnedStars,
        perfectClears: earnedStars >= 3 ? 1 : 0,
        boosterFreeClears: boostersUsed === 0 ? 1 : 0,
        boostersUsed,
      },
    );
    candidateSave.activeRun = undefined;
    return {
      candidateSave,
      baselineSave: this.cloneSave(this.save),
      presentation: {
        assistedClear,
        earnedStars,
        coinReward,
        moves: starEvaluation.moves,
        elapsedSeconds: starEvaluation.elapsedSeconds,
        moveTarget: starEvaluation.moveTarget,
        timeTargetSeconds: starEvaluation.timeTargetSeconds,
        moveAchieved: starEvaluation.moveAchieved,
        timeAchieved: starEvaluation.timeAchieved,
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
      this.dirty = true;
      this.playSound("blocked");
      this.vibrate("light");
      this.scheduleFrame();
      return;
    }

    this.save = pending.candidateSave;
    this.assistedClear = pending.presentation.assistedClear;
    this.earnedStars = pending.presentation.earnedStars;
    this.winCoinReward = pending.presentation.coinReward;
    this.winStarConditions = {
      passed: true,
      moves: pending.presentation.moves,
      elapsedSeconds: pending.presentation.elapsedSeconds,
      moveTarget: pending.presentation.moveTarget,
      timeTargetSeconds: pending.presentation.timeTargetSeconds,
      moveAchieved: pending.presentation.moveAchieved,
      timeAchieved: pending.presentation.timeAchieved,
      earnedStars: pending.presentation.earnedStars,
    };
    this.pendingSettlement = undefined;
    this.pendingSettlementAbandon = undefined;
    this.settlementSaveFailed = false;
    this.settlementFailureKind = undefined;
    const clearedLevel = this.model.level.id;
    if (shouldDirectAdvanceAfterClear(clearedLevel, LEVELS.length)) {
      this.screen = "playing";
      this.directLevelTransition = {
        fromLevel: clearedLevel,
        toLevel: clearedLevel + 1,
        age: 0,
        reducedMotion: this.save.reducedMotion,
        switched: false,
      };
      this.releaseWinArt();
    } else {
      this.screen = "win";
      this.winGlowAge = 0;
      this.requestWinArt();
    }
    this.playSound("win");
    this.vibrate("medium");
    if (!this.directLevelTransition) {
      const burstCount = 7;
      for (let index = 0; index < burstCount; index += 1) {
        const x = 50 + Math.random() * 396;
        const y = 230 + Math.random() * 420;
        this.emitBurst(
          x,
          y,
          COLOR_STYLE[(["red", "blue", "green", "yellow", "purple", "pink"] as BlockColor[])[index % 6]].base,
          22,
          220,
        );
      }
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
    const generatorOccludesPoint = snapshot.generators.some((generator) => {
      if (generator.remaining <= 0 && !this.activeGeneratorSpawn(generator.id)) return false;
      const geometry = projectGeneratorRimGeometry(this.generatorRimGeometry(generator), board);
      return inside(x, y, geometry.visualBounds);
    });
    if (generatorOccludesPoint) return undefined;
    const blocks = snapshot.blocks;
    const visibleBlocks = blocks.filter((block) => {
      if (!isMechanismBlockVisible(snapshot, block)) return false;
      const opening = this.revisedTransitions.find((item) => item.targetId === block.shutterId
        && (item.kind === "shutter" || item.kind === "lift"));
      // Other blocks and the current held gesture stay usable. Only grabbing
      // the newly revealed cohort waits until its physical cover has cleared.
      return !opening || sampleRevisedRegionAnimation(opening.kind as "shutter" | "lift", opening.age, this.save.reducedMotion).coverFraction === 0;
    });
    const depthOrderedVisibleBlocks = orderBlocksByDepth(visibleBlocks, (block) => (
      block.id === this.dragVisual?.blockId
        ? this.dragVisual.y
        : this.mechanicVisualBlock(block).y
    ));
    for (let index = depthOrderedVisibleBlocks.length - 1; index >= 0; index -= 1) {
      const block = depthOrderedVisibleBlocks[index];
      if (this.model.blockCells(block).some(([cx, cy]) => cx === gridX && cy === gridY)) return this.model.getBlock(block.id);
    }

    const isPlayable = snapshot.playable.some(([cellX, cellY]) => cellX === gridX && cellY === gridY);
    const isBlocked = snapshot.blocked.some(([cellX, cellY]) => cellX === gridX && cellY === gridY);
    const isClosedShutterCell = snapshot.shutters.some((shutter) => isMechanismRegionBlocking(snapshot, shutter)
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
      depthOrderedVisibleBlocks
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

  private exitPortalFeedbackKey(candidate: ContinuousExitPortalMatch): string {
    return `${candidate.gateKind}:${candidate.gateId}:${candidate.portalIndex}`;
  }

  private pointerIsPastPortal(
    point: Pick<PointerSample, "x" | "y">,
    portal: GatePortalSpec,
    board: BoardLayout,
  ): boolean {
    const [anchorX, anchorY] = portalBoundaryAnchor(portal);
    const boundaryX = board.innerX + anchorX * board.cell;
    const boundaryY = board.innerY + anchorY * board.cell;
    const pad = 6;
    if (portal.side === "top") return point.y < boundaryY - pad;
    if (portal.side === "bottom") return point.y > boundaryY + pad;
    if (portal.side === "left") return point.x < boundaryX - pad;
    return point.x > boundaryX + pad;
  }

  private resolvedExitPortal(
    snapshot: PuzzleSnapshot,
    gateId: string | undefined,
    portalIndex: number | undefined,
  ): ResolvedExitPortal | undefined {
    if (!gateId || portalIndex == null) return undefined;
    const fixed = snapshot.gates.find((candidate) => candidate.id === gateId);
    const flipDoor = fixed ? undefined : snapshot.flipDoors.find((candidate) => candidate.id === gateId);
    const gate = fixed ?? flipDoor;
    if (!gate) return undefined;
    const portal = gatePortals(snapshot, gate)[portalIndex];
    if (!portal) return undefined;
    return {
      gate,
      gateKind: fixed ? "fixed" : "flipDoor",
      portalIndex,
      portal,
    };
  }

  private generatorRimAnchor(
    generator: Pick<GeneratorSpec, "side" | "offset" | "rimAnchor">,
  ): GeneratorRimAnchor {
    if (generator.rimAnchor) return { ...generator.rimAnchor };
    const level = this.model.level;
    if (generator.side === "top") {
      return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
    }
    if (generator.side === "right") {
      return { x: level.width, y: generator.offset + 0.5, quarterTurns: 1 };
    }
    if (generator.side === "bottom") {
      return { x: generator.offset + 0.5, y: level.height, quarterTurns: 2 };
    }
    return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
  }

  private generatorRimGeometry(
    generator: Pick<GeneratorSpec, "side" | "offset" | "rimAnchor">,
  ): GeneratorRimGeometry {
    return buildGeneratorRimGeometry(this.generatorRimAnchor(generator));
  }

  private generatorVisualInsets(): { top: number; right: number; bottom: number; left: number } {
    const level = this.model.level;
    if (!(level.generators?.length)) return { top: 0, right: 0, bottom: 0, left: 0 };
    const insets = { ...GAMEPLAY_BOARD_RIM_VISUAL_INSETS };
    for (const generator of level.generators ?? []) {
      const bounds = this.generatorRimGeometry(generator).visualBounds;
      insets.left = Math.max(insets.left, -bounds.x);
      insets.top = Math.max(insets.top, -bounds.y);
      insets.right = Math.max(insets.right, bounds.x + bounds.width - level.width);
      insets.bottom = Math.max(insets.bottom, bounds.y + bounds.height - level.height);
    }
    return insets;
  }

  private boardLayout(): BoardLayout {
    const level = this.model.level;
    const boosterTop = Math.min(BUTTONS.time.y, BUTTONS.rocket.y, BUTTONS.pulse.y);
    const fitted = fitGameplayBoard(
      level.width,
      level.height,
      boosterTop,
      this.generatorVisualInsets(),
    );
    const { cell, innerWidth, innerHeight, innerX, innerY, visualBottom } = fitted;
    return {
      x: innerX - 18,
      y: innerY - 18,
      width: innerWidth + 36,
      height: innerHeight + 36,
      cell,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      visualBottom,
    };
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
    return -bottom;
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

  private buttonReleaseTarget(
    point: Pick<PointerSample, "x" | "y">,
    key: string,
    rect: Rect,
    options: HitTargetOptions = {},
  ): ButtonReleaseTarget | undefined {
    const hit = this.interactionRect(rect, options);
    return inside(point.x, point.y, hit) ? { key, hit } : undefined;
  }

  private buttonReleaseTargetAt(point: PointerSample): ButtonReleaseTarget | undefined {
    const target = (key: string, rect: Rect, options: HitTargetOptions = {}) => (
      this.buttonReleaseTarget(point, key, rect, options)
    );
    if (!this.artReady) {
      return this.artLoadError ? target("startupRetry", this.startupRetryRect()) : undefined;
    }
    let matched: ButtonReleaseTarget | undefined;

    if (!this.storageBaselineReady) {
      return target("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" });
    }
    if (this.pendingLifeStart) return undefined;
    if (this.lifeRefillOpen) {
      return (this.lifeRefillQuote().missingLives > 0 ? target("lifeRefillBuy", BUTTONS.lifeRefillBuy) : undefined)
        ?? (!this.pendingLifeRefill ? target("lifeRefillDismiss", BUTTONS.lifeRefillDismiss) : undefined);
    }
    if (this.directLevelTransition || this.homeCoinFlight) return undefined;
    if (this.journeyPresentation) {
      if (this.journeyPresentation.phase === "overlay") {
        return target("journeyPresentationClose", BUTTONS.journeyPresentationClose)
          ?? (!this.journeyPresentationArtReady()
            ? this.journeyPresentationArtFailed() ? target("journeyPresentationArtRetry", BUTTONS.formalPageRetry) : undefined
            : this.journeyPresentationRewardReadOnlyText() !== undefined
              ? undefined
              : target("journeyPresentation", BUTTONS.journeyPresentation));
      }
      return this.journeyPresentation.phase === "progress"
        && (this.screen === "levels" || this.isHomeEpisodeUnlockPending()) && this.formalPageFailed("levels")
        ? target("formalPageRetry", BUTTONS.formalPageRetry)
          ?? target("journeyPresentationLater", BUTTONS.journeyPresentationLater)
        : undefined;
    }
    if (this.pendingSupplyPurchase) {
      return this.screen === "supply"
        ? target(`supply.${this.pendingSupplyPurchase.kind}`, this.supplyBuyRect(this.pendingSupplyPurchase.kind))
        : undefined;
    }
    if (this.temporaryLevelSelector) {
      const layout = this.temporaryLevelSelectorLayout();
      matched = target("temporaryLevel.close", layout.close);
      if (matched) return matched;
      if (this.temporaryLevelTestSession) {
        matched = target("temporaryLevel.exit", layout.exit);
        if (matched) return matched;
      }
      if (layout.canPrevious) {
        matched = target("temporaryLevel.previous", layout.previousPage);
        if (matched) return matched;
      }
      if (layout.canNext) {
        matched = target("temporaryLevel.next", layout.nextPage);
        if (matched) return matched;
      }
      for (const cell of layout.cells) {
        matched = target(`temporaryLevel.level.${cell.levelId}`, cell.rect);
        if (matched) return matched;
      }
      return target("temporaryLevel.start", layout.start);
    }
    if (this.screen === "updates") {
      return target("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" });
    }
    if (this.screen === "home" && this.updateToastVisible) {
      matched = target("updateToast", this.offsetRect(BUTTONS.updateToast, 0, this.safeOffsets().top));
      if (matched) return matched;
    }
    if (this.boosterUnlockToast && this.boosterUnlockToastEligible()) {
      matched = target("boosterUnlockToast", this.boosterUnlockToastRect());
      if (matched) return matched;
    }
    if (this.screen === "mechanismGuide") {
      matched = target("mechanismGuideClose", this.mechanismGuideLayout().close.hit);
      if (matched) return matched;
      if (!this.formalPageReady("records")) {
        return this.formalPageFailed("records") ? target("formalPageRetry", this.collectionGuideRect(BUTTONS.formalPageRetry)) : undefined;
      }
      const viewport = this.collectionScrollView().viewport;
      if (!inside(point.x, point.y, viewport)) return undefined;
      for (const entry of this.collectionScrollView().entries) {
        if (!this.collectionEntryIsInteractive(entry)) continue;
        matched = target(`collection.${entry.item.id}`, this.collectionCardRectForEntry(entry), { bounds: viewport });
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.mainNavigationInteractive()) {
      for (let index = 0; index < MAIN_NAVIGATION.length; index += 1) {
        matched = target(`navigation.${index}`, this.mainNavigationRect(index));
        if (matched) return matched;
      }
    }
    if (this.navigationTransition) return undefined;

    const formalScreen = this.formalPageForScreen();
    if (formalScreen && !this.formalPageReady(formalScreen)) {
      return this.formalPageFailed(formalScreen)
        ? target("formalPageRetry", BUTTONS.formalPageRetry)
        : undefined;
    }

    if (this.screen === "home") {
      const safe = this.safeOffsets();
      const homeTargets: Array<[string, Rect, HitTargetOptions?]> = [
        ["homeLife", this.offsetRect(BUTTONS.homeLife, 0, safe.top)],
        ["homeSettings", this.offsetRect(BUTTONS.homeSettings, 0, safe.top), { anchorY: "end" }],
        ["homeMusic", BUTTONS.homeMusic],
        ["homeAchievements", BUTTONS.homeAchievements],
        ["homeMissions", this.dailyTaskHomeEntryRect()],
        ["homeSupply", this.offsetRect(BUTTONS.homeSupply, 0, safe.top), { anchorY: "end" }],
        ["temporaryLevel.open", BUTTONS.temporaryLevelSelector],
        ["homePlay", this.offsetRect(BUTTONS.homePlay, 0, -safe.bottom)],
      ];
      if (this.model.level.id > 1) {
        homeTargets.push(["homePrev", this.offsetRect(BUTTONS.homePrev, 0, this.homeCardOffset(safe.bottom))]);
      }
      if (this.model.level.id < this.save.highestLevel) {
        homeTargets.push(["homeNext", this.offsetRect(BUTTONS.homeNext, 0, this.homeCardOffset(safe.bottom))]);
      }
      for (const [key, rect, options] of homeTargets) {
        matched = target(key, rect, options);
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "musicLibrary") {
      matched = target("musicClose", BUTTONS.musicClose);
      if (matched) return matched;
      for (const [index, entry] of MUSIC_CATALOG.entries()) {
        matched = target(`music.${entry.id}`, this.musicLibraryRowRect(index));
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "dailyTasks") {
      matched = target("dailyTaskClose", this.dailyTaskCloseRect());
      if (matched) return matched;
      if (!this.dailyTaskArt) {
        return this.dailyTaskArtError ? target("dailyTaskRetry", this.dailyTaskRetryRect()) : undefined;
      }
      for (const task of this.dailyTaskSummary().tasks) {
        const rect = this.dailyTaskClaimRect(task.id);
        if (!rect) continue;
        matched = target(`dailyTaskClaim.${task.id}`, rect);
        if (matched) return matched;
      }
      return this.dailyTaskSummary().bonusClaimed
        ? undefined
        : target("dailyTaskBonus", this.dailyTaskBonusClaimRect());
    }
    if (this.screen === "records") {
      const layout = this.collectionAlbumLayout();
      if (!this.collectionAlbumArt) {
        return (this.collectionAlbumArtError
            ? target("collectionAlbumRetry", this.collectionAlbumRetryRect(layout))
            : undefined);
      }
      if (this.collectionAlbumDetailId) {
        const detailItem = findCollectionCatalogItem(this.collectionAlbumDetailId);
        return target("collectionAlbumDetailClose", layout.detail.close.hit)
          ?? (detailItem && this.collectionAlbumItemArtworkFailed(detailItem)
            ? target("collectionAlbumArtworkRetry", layout.detail.artwork) : undefined)
          ?? (this.collectionAlbumDetailActionVisible()
            ? target("collectionAlbumDetailPrimary", layout.detail.primaryAction.hit) : undefined);
      }
      matched = target("collectionAlbumTab.levels", layout.tabs.levels.hit)
        ?? target("collectionAlbumTab.masterpieces", layout.tabs.masterpieces.hit)
        ?? target("collectionAlbumGuide", layout.guide.hit);
      if (matched) return matched;
      if (layout.pagination.previous.enabled) {
        matched = target("collectionAlbumPrevious", layout.pagination.previous.hit);
        if (matched) return matched;
      }
      if (layout.pagination.next.enabled) {
        matched = target("collectionAlbumNext", layout.pagination.next.hit);
        if (matched) return matched;
      }
      const items = this.collectionAlbumItems();
      for (const card of layout.cards) {
        const item = card.active ? items[card.itemIndex] : undefined;
        if (!item) continue;
        matched = target(`collectionAlbumCard.${item.id}`, card.hit);
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "achievements") {
      matched = target("achievementClose", BUTTONS.achievementClose);
      if (matched) return matched;
      if (!this.achievementArt) {
        return this.achievementArtError ? target("achievementRetry", homeArtRect(ACHIEVEMENT_LAYOUT.retry)) : undefined;
      }
      const achievement = this.achievementEntryAt(point);
      return achievement ? target(`achievementClaim.${achievement.entry.id}`, this.achievementClaimRect(achievement.index),
        { bounds: this.achievementViewportRect() }) : undefined;
    }
    if (this.screen === "settings") {
      matched = target("menuBack", BUTTONS.menuBack);
      if (matched) return matched;
      for (const kind of Object.keys(SETTINGS_RECTS) as SettingKind[]) {
        matched = target(`settings.${kind}`, this.settingRect(kind));
        if (matched) return matched;
      }
      return target("settingsLanguage", BUTTONS.settingsLanguage)
        ?? target("settingsReset", BUTTONS.settingsReset);
    }
    if (this.screen === "language") {
      matched = target("languageBack", BUTTONS.languageBack);
      if (matched) return matched;
      for (const entry of GAME_LANGUAGE_METADATA) {
        matched = target(`language.${entry.language}`, LANGUAGE_OPTION_RECTS[entry.language]);
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "resetConfirm") {
      return target("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" })
        ?? target("modalSecondary", BUTTONS.modalSecondary, { anchorY: "start" });
    }
    if (this.screen === "supply") {
      for (const kind of SUPPLY_ORDER) {
        matched = target(`supply.${kind}`, this.supplyBuyRect(kind));
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "leaderboard") {
      return target("leaderboardWeekly", BUTTONS.leaderboardWeekly)
        ?? target("leaderboardWorld", BUTTONS.leaderboardWorld)
        ?? target("leaderboardCountry", BUTTONS.leaderboardCountry);
    }
    if (this.screen === "levels") {
      if (!inside(point.x, point.y, homeArtRect(this.journeyContentViewportArt()))) return undefined;
      const view = this.journeyScrollView();
      for (const row of this.failedVisibleJourneyEpisodes()) {
        matched = target(`journeyEpisodeArtRetry.${row.episode.index}`, this.journeyEpisodeRetryRect(row), { bounds: view.viewport });
        if (matched) return matched;
      }
      for (const row of view.episodeRows) {
        if (!this.journeyEpisodeIsInteractive(row)) continue;
        matched = target(`journeyEpisode.${row.episode.index}`, this.journeyEpisodeButtonRect(row));
        if (matched) return matched;
      }
      for (const row of view.rewardRows) {
        if (!this.journeyRewardIsInteractive(row)) continue;
        matched = target(`journeyReward.${row.levelId}`, this.journeyRewardRectForRow(row));
        if (matched) return matched;
      }
      for (let index = 0; index < view.rewardRows.length; index += 1) {
        if (!this.journeyRowIsInteractive(view.rewardRows[index])) continue;
        matched = target(`journeyNode.${index}`, this.journeyNodeRect(index));
        if (matched) return matched;
      }
      return undefined;
    }
    if (this.screen === "feature") {
      return target("featurePrimary", BUTTONS.featurePrimary);
    }
    if (this.screen === "paused") {
      for (const kind of Object.keys(PAUSE_SETTING_RECTS) as SettingKind[]) {
        matched = target(`pause.${kind}`, PAUSE_SETTING_RECTS[kind]);
        if (matched) return matched;
      }
      return target("pauseResume", BUTTONS.pauseResume)
        ?? target("pauseRestart", BUTTONS.pauseRestart)
        ?? target("pauseHome", BUTTONS.pauseHome);
    }
    if (this.screen === "settlementFailed") {
      matched = target("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" });
      if (matched) return matched;
      return !this.pendingSettlementAbandon && this.settlementFailureKind !== "unknown"
        ? target("modalSecondary", BUTTONS.modalSecondary, { anchorY: "start" })
        : undefined;
    }
    if (this.screen === "win") {
      if (!this.winArt && !this.winArtError) return undefined;
      return target("modalPrimary", BUTTONS.winPrimary)
        ?? target("modalSecondary", BUTTONS.winClose);
    }
    if (this.screen === "failed") {
      return target("failedReplay", BUTTONS.failedReplay)
        ?? target("failedHome", BUTTONS.failedHome);
    }
    if (this.screen !== "playing" || this.model.snapshot().complete || this.activePointer !== undefined) {
      return undefined;
    }
    matched = target("undo", BUTTONS.undo)
      ?? target("pause", BUTTONS.pause);
    if (matched) return matched;
    if (this.pendingCelebration > 0 || this.hasActiveMechanicMotion()) return undefined;
    return target("booster.time", BUTTONS.time)
      ?? target("booster.rocket", BUTTONS.rocket)
      ?? target("booster.pulse", BUTTONS.pulse);
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
    add("homeLife", this.offsetRect(BUTTONS.homeLife, 0, safe.top));
    if (this.lifeRefillOpen) {
      if (this.lifeRefillQuote().missingLives > 0) add("lifeRefillBuy", BUTTONS.lifeRefillBuy);
      if (!this.pendingLifeRefill) {
        add("lifeRefillDismiss", BUTTONS.lifeRefillDismiss);
      }
    }
    add("homeSettings", this.offsetRect(BUTTONS.homeSettings, 0, safe.top), { anchorY: "end" });
    add("homeAchievements", BUTTONS.homeAchievements);
    add("homeMissions", this.dailyTaskHomeEntryRect());
    add("temporaryLevel.open", BUTTONS.temporaryLevelSelector);
    if (this.temporaryLevelSelector) {
      const layout = this.temporaryLevelSelectorLayout();
      add("temporaryLevel.close", layout.close);
      if (layout.canPrevious) add("temporaryLevel.previous", layout.previousPage);
      if (layout.canNext) add("temporaryLevel.next", layout.nextPage);
      layout.cells.forEach((cell) => add(`temporaryLevel.level.${cell.levelId}`, cell.rect));
      add("temporaryLevel.start", layout.start);
      if (this.temporaryLevelTestSession) add("temporaryLevel.exit", layout.exit);
    }
    if (!this.artReady && this.artLoadError) add("startupRetry", this.startupRetryRect());
    add("homePlay", this.offsetRect(BUTTONS.homePlay, 0, -safe.bottom));
    add("homePrev", this.offsetRect(BUTTONS.homePrev, 0, this.homeCardOffset(safe.bottom)));
    add("homeNext", this.offsetRect(BUTTONS.homeNext, 0, this.homeCardOffset(safe.bottom)));
    add("menuBack", BUTTONS.menuBack);
    add("settingsLanguage", BUTTONS.settingsLanguage);
    add("settingsReset", BUTTONS.settingsReset);
    (Object.keys(SETTINGS_RECTS) as SettingKind[]).forEach((kind) => add(`settings.${kind}`, this.settingRect(kind)));
    add("languageBack", BUTTONS.languageBack);
    add("achievementClose", BUTTONS.achievementClose);
    if (this.achievementArtError) add("achievementRetry", homeArtRect(ACHIEVEMENT_LAYOUT.retry));
    this.achievementVisibleEntries().forEach(({ entry, index }) => {
      const rect = this.achievementClaimRect(index);
      if (rect.width > 0 && rect.height > 0) add(`achievementClaim.${entry.id}`, rect, { bounds: this.achievementViewportRect() });
    });
    add("dailyTaskClose", this.dailyTaskCloseRect());
    this.dailyTaskSummary().tasks.forEach((task) => {
      const rect = this.dailyTaskClaimRect(task.id);
      if (rect) add(`dailyTaskClaim.${task.id}`, rect);
    });
    if (!this.dailyTaskSummary().bonusClaimed) add("dailyTaskBonus", this.dailyTaskBonusClaimRect());
    const albumLayout = this.collectionAlbumLayout();
    if (this.screen === "mechanismGuide") add("mechanismGuideClose", this.mechanismGuideLayout().close.visual);
    add("collectionAlbumTab.levels", albumLayout.tabs.levels.visual);
    add("collectionAlbumTab.masterpieces", albumLayout.tabs.masterpieces.visual);
    add("collectionAlbumGuide", albumLayout.guide.visual);
    add("collectionAlbumPrevious", albumLayout.pagination.previous.visual);
    add("collectionAlbumNext", albumLayout.pagination.next.visual);
    this.collectionAlbumItems().forEach((item, index) => {
      const card = albumLayout.cards.find((candidate) => candidate.itemIndex === index);
      if (card?.active) add(`collectionAlbumCard.${item.id}`, card.visual);
    });
    add("collectionAlbumDetailClose", albumLayout.detail.close.visual);
    const albumDetail = this.collectionAlbumDetailId ? findCollectionCatalogItem(this.collectionAlbumDetailId) : undefined;
    if (albumDetail && this.collectionAlbumItemArtworkFailed(albumDetail)) {
      add("collectionAlbumArtworkRetry", albumLayout.detail.artwork);
    }
    if (this.collectionAlbumDetailActionVisible()) {
      add("collectionAlbumDetailPrimary", albumLayout.detail.primaryAction.visual);
    }
    GAME_LANGUAGE_METADATA.forEach((entry) => add(
      `language.${entry.language}`,
      LANGUAGE_OPTION_RECTS[entry.language],
    ));
    SUPPLY_ORDER.forEach((kind) => add(`supply.${kind}`, this.supplyBuyRect(kind)));
    add("leaderboardWeekly", BUTTONS.leaderboardWeekly);
    add("leaderboardWorld", BUTTONS.leaderboardWorld);
    add("leaderboardCountry", BUTTONS.leaderboardCountry);
    add("formalPageRetry", this.collectionGuideRect(BUTTONS.formalPageRetry));
    add("journeyPresentationLater", BUTTONS.journeyPresentationLater);
    const journeyView = this.journeyScrollView();
    journeyView.rewardRows.forEach((row, index) => {
      if (this.journeyRowIsInteractive(row)) add(`journeyNode.${index}`, this.journeyNodeRect(index));
      if (this.journeyRewardIsInteractive(row)) {
        add(`journeyReward.${row.levelId}`, this.journeyRewardRectForRow(row));
      }
    });
    journeyView.episodeRows.forEach((row) => {
      if (this.journeyEpisodeIsInteractive(row)) {
        add(`journeyEpisode.${row.episode.index}`, this.journeyEpisodeButtonRect(row));
      }
    });
    this.failedVisibleJourneyEpisodes().forEach((row) => {
      add(`journeyEpisodeArtRetry.${row.episode.index}`, this.journeyEpisodeRetryRect(row), { bounds: journeyView.viewport });
    });
    this.collectionScrollView().entries.forEach((entry) => {
      if (this.collectionEntryIsInteractive(entry)) {
        add(`collection.${entry.item.id}`, this.collectionCardRectForEntry(entry), { bounds: this.collectionScrollView().viewport });
      }
    });
    MAIN_NAVIGATION.forEach((_, index) => add(`navigation.${index}`, this.mainNavigationRect(index)));
    add("updateToast", this.offsetRect(BUTTONS.updateToast, 0, safe.top));
    add("boosterUnlockToast", this.boosterUnlockToastRect());
    add("undo", BUTTONS.undo);
    add("pause", BUTTONS.pause);
    add("booster.time", BUTTONS.time);
    add("booster.rocket", BUTTONS.rocket);
    add("booster.pulse", BUTTONS.pulse);
    (Object.keys(PAUSE_SETTING_RECTS) as SettingKind[]).forEach((kind) => add(`pause.${kind}`, PAUSE_SETTING_RECTS[kind]));
    add("pauseResume", BUTTONS.pauseResume);
    add("pauseRestart", BUTTONS.pauseRestart);
    add("pauseHome", BUTTONS.pauseHome);
    if (this.screen === "win") {
      add("modalPrimary", BUTTONS.winPrimary);
      add("modalSecondary", BUTTONS.winClose);
    } else if (this.screen === "feature") {
      add("featurePrimary", BUTTONS.featurePrimary);
    } else if (this.screen === "failed") {
      add("failedReplay", BUTTONS.failedReplay);
      add("failedHome", BUTTONS.failedHome);
    } else {
      add("modalPrimary", BUTTONS.modalPrimary, { anchorY: "end" });
      add("modalSecondary", BUTTONS.modalSecondary, { anchorY: "start" });
    }
    if (this.journeyPresentation?.phase === "overlay") {
      if (!this.journeyPresentationArtReady() && this.journeyPresentationArtFailed()) {
        add("journeyPresentationArtRetry", BUTTONS.formalPageRetry);
      } else if (this.journeyPresentationArtReady() && this.journeyPresentationRewardReadOnlyText() === undefined) {
        add("journeyPresentation", BUTTONS.journeyPresentation);
      }
      add("journeyPresentationClose", BUTTONS.journeyPresentationClose);
    }

    return {
      minimumCssSize: MINIMUM_INTERACTION_TARGET_CSS,
      minimumLogicalSize: MINIMUM_INTERACTION_TARGET_CSS / Math.max(scale, 0.001),
      targets,
    };
  }

  private emitBlockParticles(
    block: BlockState,
    color: BlockColor,
    side: Side,
    count: number,
    exitFragment = true,
    source?: { x: number; y: number },
    exitAnimationId?: string,
  ): number {
    const board = this.boardLayout();
    const cells = this.model.blockCells(block);
    let centerX = board.innerX + (cells.reduce((sum, [x]) => sum + x + 0.5, 0) / cells.length) * board.cell;
    let centerY = board.innerY + (cells.reduce((sum, [, y]) => sum + y + 0.5, 0) / cells.length) * board.cell;
    if (source) {
      centerX = source.x;
      centerY = source.y;
    } else {
      if (side === "top") centerY = board.innerY - 4;
      if (side === "bottom") centerY = board.innerY + board.innerHeight + 4;
      if (side === "left") centerX = board.innerX - 4;
      if (side === "right") centerX = board.innerX + board.innerWidth + 4;
    }
    const [outX, outY] = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[side];
    const tangentX = -outY;
    const tangentY = outX;
    const actualCount = this.save.reducedMotion ? Math.max(2, Math.ceil(count * 0.25)) : count;
    let duration = 0;
    for (let index = 0; index < actualCount; index += 1) {
      const outwardSpeed = (this.save.reducedMotion ? 66 : 128) + Math.random() * (this.save.reducedMotion ? 48 : 172);
      const spread = (Math.random() - 0.5) * (this.save.reducedMotion ? 76 : 260);
      const life = this.save.reducedMotion ? 0.22 + Math.random() * 0.18 : 0.34 + Math.random() * 0.32;
      duration = Math.max(duration, life);
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
        exitFragment,
        exitAnimationId,
        ax: exitFragment ? -outX * board.cell * 10 : 0,
        ay: exitFragment ? -outY * board.cell * 10 : 180,
        angularVelocity: (Math.random() - 0.5) * 12,
        fadePortion: 0.26,
      });
    }
    const cap = this.save.reducedMotion ? 90 : 260;
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
    return duration;
  }

  private emitGateExitFragments(ghost: ExitGhost, count: number): void {
    if (ghost.mode === "rocket" || !ghost.color || count <= 0) return;
    const board = this.boardLayout();
    const [outX, outY] = {
      top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0],
    }[ghost.side];
    const tangentX = -outY;
    const tangentY = outX;
    const cells = ghost.block.shape.map(([dx, dy]) => [ghost.block.x + dx, ghost.block.y + dy] as const);
    const fallbackX = board.innerX + (cells.reduce((sum, [x]) => sum + x + 0.5, 0) / cells.length) * board.cell;
    const fallbackY = board.innerY + (cells.reduce((sum, [, y]) => sum + y + 0.5, 0) / cells.length) * board.cell;
    const gateX = ghost.sourceX ?? (ghost.side === "left"
      ? board.innerX
      : ghost.side === "right"
        ? board.innerX + board.innerWidth
        : fallbackX);
    const gateY = ghost.sourceY ?? (ghost.side === "top"
      ? board.innerY
      : ghost.side === "bottom"
        ? board.innerY + board.innerHeight
        : fallbackY);
    const seed = ghost.fragmentSeed ?? 0;
    const firstIndex = ghost.emittedFragments ?? 0;
    const reduced = this.save.reducedMotion;
    for (let localIndex = 0; localIndex < count; localIndex += 1) {
      const index = firstIndex + localIndex;
      const speckRatio = ghost.color === "blue" || ghost.color === "cyan"
        ? 0.44
        : ghost.color === "yellow" ? 0.36 : 0.28;
      const speck = !reduced && stableUnitRandom(seed, index, 9) < speckRatio;
      const tangentSpread = (stableUnitRandom(seed, index, 0) - 0.5)
        * (ghost.tangentSpanCells ?? 1) * board.cell * 0.82;
      const inwardOffset = board.cell * (0.08 + stableUnitRandom(seed, index, 1) * (reduced ? 0.05 : 0.12));
      const outwardSpeed = board.cell * (reduced
        ? 1.8 + stableUnitRandom(seed, index, 2) * 1.2
        : speck
          ? 6.5 + stableUnitRandom(seed, index, 2) * 3.5
          : 5 + stableUnitRandom(seed, index, 2) * 3);
      const tangentSpeed = board.cell * (stableUnitRandom(seed, index, 3) - 0.5)
        * (reduced ? 2 : speck ? 8 : 5.5);
      const returnAcceleration = board.cell * (reduced
        ? 4 + stableUnitRandom(seed, index, 4) * 2
        : speck
          ? 8 + stableUnitRandom(seed, index, 4) * 3
          : 10 + stableUnitRandom(seed, index, 4) * 4);
      const absoluteEnd = reduced
        ? 0.22 + stableUnitRandom(seed, index, 5) * 0.18
        : speck
          ? 0.78 + stableUnitRandom(seed, index, 5) * 0.36
          : 0.88 + stableUnitRandom(seed, index, 5) * 0.32;
      const life = Math.max(0.24, absoluteEnd - ghost.age);
      this.particles.push({
        x: gateX - outX * inwardOffset + tangentX * tangentSpread,
        y: gateY - outY * inwardOffset + tangentY * tangentSpread,
        vx: outX * outwardSpeed + tangentX * tangentSpeed,
        vy: outY * outwardSpeed + tangentY * tangentSpeed,
        ax: -outX * returnAcceleration,
        ay: -outY * returnAcceleration,
        life,
        maxLife: life,
        size: board.cell * (reduced
          ? 0.035 + stableUnitRandom(seed, index, 6) * 0.055
          : speck
            ? 0.01 + stableUnitRandom(seed, index, 6) * 0.03
            : 0.055 + stableUnitRandom(seed, index, 6) * 0.09),
        color: COLOR_STYLE[ghost.color].base,
        spin: stableUnitRandom(seed, index, 7) * Math.PI * 2,
        angularVelocity: (stableUnitRandom(seed, index, 8) - 0.5) * 14,
        fadePortion: reduced ? 0.4 : speck ? 0.54 : 0.72,
        fragmentColor: ghost.color,
        fragmentIndex: index % 4,
        exitFragment: true,
        fragmentSpeck: speck,
      });
    }
    const cap = this.save.reducedMotion ? 90 : 260;
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
  }

  private snapshotContainsColor(snapshot: PuzzleSnapshot, color: BlockColor): boolean {
    return [...snapshot.blocks, ...snapshot.queuedBlocks].some((block) => (
      block.color === color || block.layers.includes(color)
    ));
  }

  private retiringPulseForGate(
    side: Side,
    offset: number,
    size: number,
    color: BlockColor,
    gateId?: string,
  ): ExitPulse | undefined {
    return (gateId ? this.exitPulses.find((pulse) => pulse.retireGate && pulse.gateId === gateId) : undefined)
      ?? this.exitPulses.find((pulse) => (
      pulse.retireGate
      && pulse.side === side
      && pulse.offset === offset
      && pulse.size === size
      && pulse.color === color
    )) ?? this.exitPulses.find((pulse) => pulse.retireGate && pulse.color === color);
  }

  private gateExitOpacity(
    snapshot: PuzzleSnapshot,
    side: Side,
    offset: number,
    size: number,
    color: BlockColor,
    gateId?: string,
  ): number {
    if (this.snapshotContainsColor(snapshot, color)) return 1;
    const pulse = this.retiringPulseForGate(side, offset, size, color, gateId);
    if (!pulse) return 0;
    if (this.save.reducedMotion) return pulse.age < pulse.duration ? 1 : 0;
    const fade = clampUnit((pulse.age - GATE_EXIT_RETIRE_DELAY) / GATE_EXIT_RETIRE_DURATION);
    return (1 - fade) ** 2;
  }

  private emitExitPulse(
    resolved: ResolvedExitPortal | undefined,
    color: BlockColor,
    retireGate: boolean,
  ): void {
    if (!resolved) return;
    const { gate, portal, portalIndex } = resolved;
    this.exitPulses.push({
      gateId: gate.id,
      portalIndex,
      portal: { ...portal, origin: [...portal.origin] as Point },
      side: portal.side,
      offset: portalTangentOffset(portal),
      size: portal.size,
      color,
      age: 0,
      duration: this.save.reducedMotion
        ? 0.22
        : retireGate
          ? GATE_EXIT_RETIRE_DELAY + GATE_EXIT_RETIRE_DURATION
          : GATE_EXIT_PULSE_DURATION,
      retireGate,
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
    this.captureGeneratorSpawns(before, after);
    this.captureRevisedMechanicTransitions(before, after, delay);
    const board = this.boardLayout();
    // Flip doors share the same frozen counter semantics as fixed exits, but
    // the core event detector intentionally predates them. Synthesize only the
    // visual ice delta here so a logical multiportal door fractures at every
    // authored mouth without changing simulation/event contracts.
    const flipDoorIceEvents: MechanicEvent[] = after.flipDoors.flatMap((door) => {
      const previous = before.flipDoors.find((item) => item.id === door.id)?.frozen ?? door.frozen;
      return door.frozen < previous
        ? [{
            kind: "ice" as const,
            target: "gate" as const,
            id: door.id,
            previous,
            remaining: door.frozen,
            unlocked: door.frozen === 0,
          }]
        : [];
    });
    const detectedEvents = [...detectMechanicEvents(before, after), ...flipDoorIceEvents];
    const orderedEvents = [
      ...detectedEvents.filter((event) => event.kind === "conveyor"),
      ...detectedEvents.filter((event) => event.kind !== "conveyor"),
    ].filter((event) => event.skin !== "staging"
      && !(event.kind === "shutter" && (usesRevisedMechanisms(after)
        || usesReferenceRegionVisuals(after, event))));
    // Numeric ice is board-wide: Pulse can update every frozen block at once.
    // Never let the generic feedback budget turn those state changes invisible.
    const retainedOtherEvents = new Set(orderedEvents
      .filter((event) => !(event.kind === "ice" && event.target === "block"))
      .slice(0, 12));
    const events = orderedEvents.filter((event) => (
      event.kind === "ice" && event.target === "block"
    ) || retainedOtherEvents.has(event));
    const importantRelayEvents = events.filter((event) => event.unlocked || event.kind === "conveyor");
    const fallbackRelayEvent = events.find((event) => event.kind === "shutter") ?? events[0];
    const relayEvents = new Set((importantRelayEvents.length ? importantRelayEvents : [fallbackRelayEvent])
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .slice(0, MAX_CAUSAL_RELAYS_PER_ACTION));
    let gateDelay = 0;
    for (const event of events) {
      let bounds: Rect | undefined;
      let blockCells: Point[] | undefined;
      let gateGeometry: { side: Side; offset: number; size: number } | undefined;
      let gatePortalGeometry: GatePortalSpec[] | undefined;
      if (event.target === "gate") {
        const gate = after.gates.find((item) => item.id === event.id)
          ?? after.flipDoors.find((item) => item.id === event.id);
        if (!gate) continue;
        gatePortalGeometry = gatePortals(after, gate)
          .map((portal) => ({ ...portal, origin: [...portal.origin] as Point }));
        const portal = gatePortalGeometry[0];
        gateGeometry = {
          side: portal.side,
          offset: portalTangentOffset(portal),
          size: portal.size,
        };
        const thickness = 22;
        const [boundaryX, boundaryY] = portalBoundaryAnchor(portal);
        let x = board.innerX + portal.origin[0] * board.cell;
        let y = board.innerY + boundaryY * board.cell - thickness;
        let width = portal.size * board.cell;
        let height = thickness + 5;
        if (portal.side === "bottom") y = board.innerY + boundaryY * board.cell - 5;
        if (portal.side === "left" || portal.side === "right") {
          x = board.innerX + boundaryX * board.cell + (portal.side === "left" ? -thickness : -5);
          y = board.innerY + portal.origin[1] * board.cell;
          width = thickness + 5;
          height = portal.size * board.cell;
        }
        bounds = { x, y, width, height };
      } else if (event.target === "block") {
        const block = after.blocks.find((item) => item.id === event.id);
        if (!block) continue;
        blockCells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as Point);
        const minX = Math.min(...blockCells.map(([x]) => x));
        const maxX = Math.max(...blockCells.map(([x]) => x));
        const minY = Math.min(...blockCells.map(([, y]) => y));
        const maxY = Math.max(...blockCells.map(([, y]) => y));
        bounds = {
          x: board.innerX + minX * board.cell,
          y: board.innerY + minY * board.cell,
          width: (maxX - minX + 1) * board.cell,
          height: (maxY - minY + 1) * board.cell,
        };
      } else {
        const shutter = after.shutters.find((item) => item.id === event.id);
        if (!shutter) continue;
        bounds = projectShutterVisualRect(
          shutter.x,
          shutter.y,
          shutter.width,
          shutter.height,
          board,
        );
      }

      const burstColor = event.kind === "ice"
        ? "#72f6ff"
        : event.kind === "layer"
          ? "#c76cff"
          : event.kind === "conveyor"
            ? "#8af7ff"
            : event.skin === "generator" || event.skin === "staged-frame"
              ? "#76eaff"
              : "#ffb52e";
      const targetDelay = delay + (event.target === "gate" ? gateDelay++ * 0.14 : 0);
      const hasRelay = Boolean(source && targetDelay > 0 && relayEvents.has(event));
      // A terminal frozen gate uses the same deterministic fracture geometry as
      // a frozen block, but is rendered in the gate's one-dimensional strip.
      // Intermediate counter ticks retain the compact pulse so the exit never
      // looks like it has already unlocked before its final counter reaches 0.
      const iceFracture = event.kind === "ice"
        && ((event.target === "block" && Boolean(blockCells))
          || (event.target === "gate" && event.remaining === 0 && Boolean(gateGeometry)))
        ? buildNumericIceFracture({
          seed: `${after.levelId}:${after.moves}:${event.id}:${event.previous}>${event.remaining}`,
          cellCount: event.target === "block"
            ? blockCells!.length
            : Math.max(...(gatePortalGeometry ?? [{ size: gateGeometry!.size }]).map(({ size }) => size)),
          reducedMotion: this.save.reducedMotion,
          intensity: event.target === "gate" || event.remaining === 0 ? "shatter" : "decrement",
        })
        : undefined;
      const pulse: MechanicPulse = {
        kind: event.kind,
        target: event.target,
        targetId: event.id,
        shutterSkin: event.skin === "staging" ? undefined : event.skin,
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
        duration: iceFracture?.timing.duration
          ?? (event.kind === "layer" ? 0.82 : event.kind === "conveyor" ? 0.68 : event.unlocked ? 0.72 : 0.5),
        previous: event.previous,
        remaining: event.remaining,
        unlocked: event.unlocked,
        blockCells,
        iceFracture,
        gateSide: gateGeometry?.side,
        gateOffset: gateGeometry?.offset,
        gateSize: gateGeometry?.size,
        gatePortals: gatePortalGeometry,
        burstColor,
        burstCount: iceFracture ? 0 : event.unlocked ? 15 : 5,
        burstSpeed: iceFracture ? 0 : event.unlocked ? 115 : 68,
        shakeDuration: iceFracture
          ? 0
          : event.unlocked && !this.save.reducedMotion ? event.kind === "layer" ? 0.12 : 0.18 : 0,
        presented: false,
      };
      this.mechanicPulses.push(pulse);
      if (pulse.age >= 0) this.presentMechanicPulse(pulse);
    }
    const nonNumericIcePulses = this.mechanicPulses.filter((pulse) => !pulse.iceFracture);
    if (nonNumericIcePulses.length > 18) {
      const discarded = new Set(nonNumericIcePulses.slice(0, nonNumericIcePulses.length - 18));
      this.mechanicPulses = this.mechanicPulses.filter((pulse) => !discarded.has(pulse));
    }
  }

  private presentMechanicPulse(pulse: MechanicPulse): void {
    if (pulse.presented) return;
    pulse.presented = true;
    if (!pulse.iceFracture && pulse.kind !== "layer") {
      this.emitBurst(pulse.x, pulse.y, pulse.burstColor, pulse.burstCount, pulse.burstSpeed);
    }
    // Shell peeling already plays its dedicated recording at the successful exit.
    // Do not layer the generic mechanism sound over it when the delayed pulse appears.
    if (pulse.unlocked && pulse.kind !== "layer") this.playSound(pulse.kind === "ice" ? "thaw" : "mechanic");
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
    const text: Record<Exclude<ExitAttemptStatus, "ok">, TranslationKey> = {
      inactive: "gameplay.blocked.inactive",
      "not-at-edge": "gameplay.blocked.notAtEdge",
      "no-gate": "gameplay.blocked.noGate",
      "wrong-color": "gameplay.blocked.wrongColor",
      "frozen-gate": "gameplay.blocked.frozenGate",
      "star-gate-required": "gameplay.blocked.starGateRequired",
      "blocked-path": "gameplay.blocked.pathBlocked",
    };
    const repeated = this.exitFailure?.status === status && this.exitFailure.age < 0.16;
    this.exitFailure = { status, text: this.tr(text[status]), x, y, width, height, age: 0, duration: 0.72 };
    this.blockedBlockId = block.id;
    this.blockedFeedbackTime = BLOCKED_FEEDBACK_DURATION;
    if (!repeated) {
      const color = status === "frozen-gate" ? "#72f6ff" : status === "wrong-color" ? "#ff6d7a" : "#ffc857";
      this.emitBurst(x + width / 2, y + height / 2, color, 7, 62);
      if (this.elapsed - this.lastBlockedFeedbackAt > 0.22) {
        this.playSound(status === "frozen-gate" ? "ice" : "blocked");
        this.vibrate("light");
        this.lastBlockedFeedbackAt = this.elapsed;
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
      if ((particle.exitAnimationId || particle.exitFragment) && (this.screen !== "playing" || !this.appVisible)) continue;
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx += (particle.ax ?? 0) * delta;
      particle.vy += (particle.ay ?? 180) * delta;
      particle.vx *= 0.992 ** (delta * 60);
      particle.spin += delta * (particle.angularVelocity ?? 5);
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private updateExitGhosts(delta: number): void {
    // Pausing/freezing a view must also pause the gameplay event it owns.
    if (this.screen !== "playing" || !this.appVisible) return;
    for (const ghost of this.exitGhosts) {
      ghost.age += delta;
      if (ghost.exitAnimationId && !ghost.exitCompletionDone
        && ghost.age >= (ghost.exitCompletionDuration ?? ghost.duration)) {
        ghost.exitCompletionDone = true;
        if (ghost.exitAnimationOwner === this.model) {
          const before = this.model.snapshot();
          if (this.model.completeExitAnimation(ghost.exitAnimationId)) {
            this.captureRevisedMechanicTransitions(before, this.model.snapshot());
            this.refreshActiveDragCollisionWorld();
            this.dirty = true;
          }
        }
      }
      if (ghost.mode === "rocket") continue;
      const fragmentCount = ghost.fragmentCount ?? 0;
      const emitted = ghost.emittedFragments ?? 0;
      const fragmentDelay = ghost.fragmentDelay ?? 0;
      const fragmentEmitDuration = ghost.fragmentEmitDuration
        ?? Math.max(0.001, ghost.duration - fragmentDelay);
      const fragmentProgress = ghost.age < fragmentDelay
        ? 0
        : clampUnit((ghost.age - fragmentDelay) / fragmentEmitDuration);
      const target = Math.min(
        fragmentCount,
        Math.ceil(fragmentCount * fragmentProgress),
      );
      if (target > emitted) {
        this.emitGateExitFragments(ghost, target - emitted);
        ghost.emittedFragments = target;
      }
    }
    this.exitGhosts = this.exitGhosts.filter((ghost) => ghost.age < ghost.duration);
  }

  private updateExitPulses(delta: number): void {
    if (this.screen !== "playing" || !this.appVisible) return;
    for (const pulse of this.exitPulses) pulse.age += delta;
    this.exitPulses = this.exitPulses.filter((pulse) => pulse.age < pulse.duration);
  }

  private updateMechanicPulses(delta: number): void {
    if (this.screen !== "playing" || !this.appVisible) return;
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
    this.featureIntroIconArt.sync(this.screen === "feature" ? getScheduledFeatureIntro(this.model.level.id)?.kind : undefined);
    const viewport = this.host.viewport();
    const { scale, offsetX, offsetY } = this.viewportTransform();
    const pixelRatio = viewport.pixelRatio;
    const ctx = this.ctx;
    this.renderedButtonPress = undefined;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#090622";
    ctx.fillRect(0, 0, this.host.canvas.width, this.host.canvas.height);
    const updateOverHome = this.screen === "updates" && this.updateReturnScreen === "home";
    const updateOverSettings = this.screen === "updates" && this.updateReturnScreen === "settings";
    const nativeHomeBackdrop = this.screen === "home" || this.screen === "achievements" || this.screen === "dailyTasks"
      || this.screen === "settings" || this.screen === "musicLibrary" || this.screen === "resetConfirm"
      || updateOverHome || updateOverSettings;
    const backdrop = nativeHomeBackdrop ? undefined : this.art.gameplayBackground;
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
      else {
        this.drawHome();
        this.drawSettings();
      }
    } else if (this.screen === "home") this.drawHome();
    else if (this.screen === "achievements") {
      this.drawHome();
      this.drawAchievements();
    }
    else if (this.screen === "mechanismGuide") {
      this.drawCollectionPage();
      this.drawMechanismGuide();
    }
    else if (this.screen === "dailyTasks") {
      this.drawHome();
      this.drawDailyTasks();
    }
    else if (this.screen === "supply") this.drawSupply();
    else if (this.screen === "leaderboard") this.drawLeaderboard();
    else if (this.screen === "settings" || this.screen === "resetConfirm") {
      this.drawHome();
      this.drawSettings();
    }
    else if (this.screen === "musicLibrary") {
      this.drawHome();
      this.drawMusicLibrary();
    }
    else if (this.screen === "language") {
      this.drawHome();
      this.drawLanguagePicker();
    }
    else if (this.screen === "levels") this.drawLevels();
    else if (this.screen === "records") this.drawCollectionPage();
    else {
      this.drawHud();
      ctx.save();
      const transitionOffsetX = this.directTransitionBoardOffset();
      if (transitionOffsetX) ctx.translate(transitionOffsetX, 0);
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
    if ((this.screen === "home" || this.screen === "dailyTasks" || this.screen === "achievements")
      && this.homeCoinFlight) this.drawHomeCoinFlight();
    this.drawParticles(false);
    if (this.boosterUnlockToast && this.boosterUnlockToastEligible()) this.drawBoosterUnlockToast();
    if (this.temporaryLevelSelector) this.drawTemporaryLevelSelector();
    if (this.screen === "paused") this.drawPause();
    if (this.screen === "feature") this.drawFeature();
    if (this.screen === "win") this.drawWin();
    if (this.screen === "failed") this.drawFailed();
    if (this.screen === "settlementFailed") this.drawSettlementFailed();
    if (this.screen === "updates") this.drawUpdateNotice();
    if (this.screen === "resetConfirm") this.drawResetConfirm();
    if (this.isHomeEpisodeUnlockPending() && !this.formalPageReady("levels")) {
      this.drawFormalPageLoading("levels");
    }
    if (this.journeyPresentation && this.journeyPresentation.phase !== "progress"
      && (this.screen === "home"
        || (this.screen === "levels" && this.journeyPresentation.intent !== "progress_event"))) {
      this.drawJourneyPresentationOverlay();
    }
    if (this.lifeRefillOpen) this.drawLifeRefill();
    if (!this.storageBaselineReady) this.drawStorageUnavailable();
  }

  private drawStartupStatus(): void {
    const failed = Boolean(this.artLoadError);
    const message = failed ? this.tr("startup.loadFailed") : this.tr("startup.preparing");
    const panel = this.art.homeUi?.resourcePanel;
    if (!panel) {
      if (failed) {
        this.drawPressable("startupRetry", STARTUP_RETRY_EMERGENCY_RECT, () => {
          this.label(this.tr("startup.tapToRetry", { message }), 248, 548, 20, "#ffd0d0", "center", 900, "#2b275f", 2);
        });
      } else {
        this.label(message, 248, 548, 20, "#f8f6ff", "center", 900, "#2b275f", 2);
      }
      return;
    }
    this.withHomeArtboard(() => {
      this.ctx.drawImage(panel, 275, 188);
      this.label(message, 360, 212, 16, failed ? "#b52736" : "#68432f", "center", 900);
      if (failed && this.art.homeUi?.startButton) {
        this.drawPressable("startupRetry", STARTUP_RETRY_ART_RECT, () => {
          this.ctx.drawImage(this.art.homeUi!.startButton, STARTUP_RETRY_ART_RECT.x, STARTUP_RETRY_ART_RECT.y);
          this.label(this.tr("startup.retryLoad"), 360, 356, 38, "#fffef2", "center", 1000, "#173d1d", 5, 250);
        });
      }
    });
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#211f5e";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    if (this.art.gameplayBackground) {
      this.withGameplayArtboard(() => ctx.drawImage(this.art.gameplayBackground!, 0, 0));
    }
  }

  private withGameplayArtboard(draw: () => void, logicalOffsetY = 0): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, GAMEPLAY_ARTBOARD_OFFSET_Y + logicalOffsetY);
    ctx.scale(GAMEPLAY_ARTBOARD_SCALE, GAMEPLAY_ARTBOARD_SCALE);
    draw();
    ctx.restore();
  }

  private drawGameplayImage(image: HTMLImageElement, placement: GameplayArtPlacement, logicalOffsetY = 0): void {
    this.withGameplayArtboard(() => this.ctx.drawImage(image, placement.x, placement.y), logicalOffsetY);
  }

  private withHomeArtboard(draw: () => void): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, HOME_ARTBOARD_OFFSET_Y);
    ctx.scale(HOME_ARTBOARD_SCALE, HOME_ARTBOARD_SCALE);
    draw();
    ctx.restore();
  }

  private drawHome(drawNavigation = true): void {
    if (this.art.home) this.drawGeneratedHome(drawNavigation);
  }

  private drawHomeCoinFlight(): void {
    const flight = this.homeCoinFlight;
    if (!flight) return;
    const timing = homeCoinFlightTiming(flight.reducedMotion);
    const target = flight.kind === "inspiration" ? this.inspirationTarget() : this.homeCoinTarget();
    const offsets = [
      { x: -18, y: 10 },
      { x: 15, y: -7 },
      { x: -4, y: -14 },
      { x: 21, y: 9 },
      { x: 2, y: 3 },
    ] as const;
    const ctx = this.ctx;
    for (let index = 0; index < timing.coinCount; index += 1) {
      const localAge = flight.age - timing.delay - index * timing.stagger;
      if (localAge <= 0 || localAge >= timing.coinDuration) continue;
      const linear = homeCoinLocalProgress(flight.age, index, flight.reducedMotion);
      const progress = linear ** 3;
      const offset = offsets[index % offsets.length];
      const flightStart = flight.start ?? { x: LOGICAL_WIDTH * 0.52, y: LOGICAL_HEIGHT * 0.615 };
      const start = { x: flightStart.x + offset.x, y: flightStart.y + offset.y };
      const control = { x: flightStart.x * 0.62 + target.x * 0.18 + offset.x * 0.25, y: flightStart.y * 0.78 + target.y * 0.08 + offset.y * 0.18 };
      const inverse = 1 - progress;
      const x = inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * target.x;
      const y = inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * target.y;
      const birthScale = easeOutCubic(Math.min(1, linear / 0.14));
      const size = (flight.reducedMotion ? 40 : 46) * birthScale * (1 - progress * 0.12);
      const flip = Math.max(0.12, Math.abs(Math.cos(linear * Math.PI * (5 + (index % 2)))));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(linear * Math.PI * 2 + index) * 0.08);
      ctx.scale(flip, 1);
      ctx.shadowColor = "#ffd536";
      ctx.shadowBlur = 8 + progress * 10;
      const inspirationArt = flight.kind === "inspiration"
        ? this.inspirationFlightArt ?? this.dailyTaskInspirationArt
        : undefined;
      if (inspirationArt) {
        ctx.drawImage(inspirationArt, -size / 2, -size / 2, size, size);
      } else {
        this.drawSystemIcon(0, 0, 0, size);
      }
      ctx.restore();
    }

    if (Number.isFinite(flight.arrivalPulseAge) && flight.arrivalPulseAge < 0.3) {
      const progress = flight.arrivalPulseAge / 0.3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = "#ffe866";
      ctx.lineWidth = 5 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 24 + progress * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGeneratedHome(drawNavigation = true): void {
    const ctx = this.ctx;
    const safe = this.safeOffsets();
    const ui = this.art.homeUi;
    if (!ui) return;
    const topOffset = safe.top / HOME_ARTBOARD_SCALE;
    const bottomOffset = safe.bottom / HOME_ARTBOARD_SCALE;

    this.withHomeArtboard(() => {
      // In the reference interaction, a chapter's Use button changes the full
      // Home scene while every HUD/control remains fixed. Fall back to the
      // supplied default Home art until the selected theme finishes loading.
      if (this.journeyHomeThemeArt
        && this.journeyHomeThemeIndex === this.save.selectedJourneyEpisode) {
        ctx.drawImage(this.journeyHomeThemeArt, 0, 0);
      } else {
        ctx.drawImage(this.art.home!, HOME_ART_LAYOUT.background.x, HOME_ART_LAYOUT.background.y);
      }

      ctx.drawImage(ui.topHeader, HOME_ART_LAYOUT.header.x, HOME_ART_LAYOUT.header.y);

      ctx.save();
      ctx.translate(0, topOffset);
      this.drawPressable("homeSupply", { x: 16, y: 47, width: 196, height: 64 }, () => {
        ctx.drawImage(ui.resourcePanel, HOME_ART_LAYOUT.coinPanel.x, HOME_ART_LAYOUT.coinPanel.y);
        const coinPulseScale = this.homeCoinPulseScale();
        ctx.save();
        ctx.translate(
          HOME_ART_LAYOUT.coinIcon.x + HOME_ART_LAYOUT.coinIcon.width / 2,
          HOME_ART_LAYOUT.coinIcon.y + HOME_ART_LAYOUT.coinIcon.height / 2,
        );
        ctx.scale(coinPulseScale, coinPulseScale);
        ctx.drawImage(ui.coinIcon, -HOME_ART_LAYOUT.coinIcon.width / 2, -HOME_ART_LAYOUT.coinIcon.height / 2);
        ctx.restore();
        ctx.drawImage(ui.addButton, HOME_ART_LAYOUT.coinAdd.x, HOME_ART_LAYOUT.coinAdd.y);
        ctx.save();
        ctx.translate(HOME_TYPOGRAPHY.coin.x, HOME_TYPOGRAPHY.coin.y);
        ctx.scale(coinPulseScale, coinPulseScale);
        this.label(
          `${this.displayedHomeCoins()}`,
          0,
          0,
          HOME_TYPOGRAPHY.coin.size,
          "#723515",
          "center",
          950,
          undefined,
          0,
          HOME_TYPOGRAPHY.coin.maxWidth,
        );
        ctx.restore();
      });
      ctx.drawImage(ui.resourcePanel, HOME_ART_LAYOUT.lifePanel.x, HOME_ART_LAYOUT.lifePanel.y);
      ctx.drawImage(ui.heartIcon, HOME_ART_LAYOUT.heartIcon.x, HOME_ART_LAYOUT.heartIcon.y);
      this.drawPressable("homeLife", HOME_ART_LAYOUT.lifePanel, () => {
        ctx.drawImage(ui.addButton, HOME_ART_LAYOUT.lifeAdd.x, HOME_ART_LAYOUT.lifeAdd.y);
      });
      this.drawPressable("homeSettings", HOME_ART_LAYOUT.settings, () => {
        ctx.drawImage(ui.settingsButton, HOME_ART_LAYOUT.settings.x, HOME_ART_LAYOUT.settings.y);
      });
      const lifeText = this.lifeHeaderText();
      const compactLifeStatus = lifeText !== this.tr("common.full");
      this.label(
        lifeText,
        HOME_TYPOGRAPHY.life.x,
        HOME_TYPOGRAPHY.life.y,
        compactLifeStatus ? HOME_TYPOGRAPHY.life.statusSize : HOME_TYPOGRAPHY.life.size,
        "#723515",
        "center",
        950,
        undefined,
        0,
        compactLifeStatus ? HOME_TYPOGRAPHY.life.statusMaxWidth : HOME_TYPOGRAPHY.life.maxWidth,
      );
      ctx.restore();

      if (ui.achievementEntry) {
        const placement = HOME_ART_LAYOUT.achievementEntry;
        this.drawPressable("homeAchievements", placement, () => {
          ctx.drawImage(ui.achievementEntry, placement.x, placement.y);
        });
        if (this.achievementHasNotification()) {
          this.drawDiscoveryBadge({ x: placement.x + placement.width - 28, y: placement.y - 9, width: NOTIFICATION_DOT_SIZE, height: NOTIFICATION_DOT_SIZE });
        }
      }

      this.drawPressable("homeMusic", { x: 580, y: 500, width: 118, height: 118 }, () => {
        const entryArt = this.musicEntryArt ?? this.musicLibraryArt?.entry;
        if (entryArt) ctx.drawImage(entryArt, 580, 500, 118, 118);
      });

      const testEntry = TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT;
      this.drawTemporaryLevelButton(
        "temporaryLevel.open",
        testEntry,
        this.temporaryLevelTestSession
          ? this.temporaryLevelText(`测试中 Lv${this.model.level.id}`, `TEST Lv${this.model.level.id}`)
          : this.temporaryLevelText("临时测试选关", "TEST LEVEL"),
        this.temporaryLevelTestSession ? "primary" : "secondary",
        24,
      );

      ctx.save();
      ctx.translate(0, -bottomOffset);
      ctx.drawImage(ui.levelPlate, HOME_ART_LAYOUT.levelPlate.x, HOME_ART_LAYOUT.levelPlate.y);
      this.drawHomeLevelArrows();
      const stars = Math.max(0, Math.min(3, this.save.bestStars[String(this.model.level.id)] ?? 0));
      const earnedStarImages = [ui.starLeft, ui.starCenter, ui.starRight] as const;
      const emptyStarImages = [ui.emptyStarLeft, ui.emptyStarCenter, ui.emptyStarRight] as const;
      const earnedStarPlacements = [HOME_ART_LAYOUT.starLeft, HOME_ART_LAYOUT.starCenter, HOME_ART_LAYOUT.starRight] as const;
      const emptyStarPlacements = [HOME_ART_LAYOUT.emptyStarLeft, HOME_ART_LAYOUT.emptyStarCenter, HOME_ART_LAYOUT.emptyStarRight] as const;
      earnedStarImages.forEach((earnedImage, index) => {
        const earned = index < stars;
        const image = earned ? earnedImage : emptyStarImages[index];
        const placement = earned ? earnedStarPlacements[index] : emptyStarPlacements[index];
        ctx.drawImage(image, placement.x, placement.y);
      });
      this.label(
        this.tr("common.levelNumber", { level: this.model.level.id }).toUpperCase(),
        HOME_TYPOGRAPHY.level.x,
        HOME_TYPOGRAPHY.level.y,
        HOME_TYPOGRAPHY.level.size,
        "#fff8cf",
        "center",
        1000,
        "#35143f",
        5,
      );
      this.drawPressable("homePlay", HOME_ART_LAYOUT.start, () => {
        ctx.drawImage(ui.startButton, HOME_ART_LAYOUT.start.x, HOME_ART_LAYOUT.start.y);
        this.label(
          this.tr("navigation.start"),
          HOME_TYPOGRAPHY.start.x,
          HOME_TYPOGRAPHY.start.y,
          HOME_TYPOGRAPHY.start.size,
          "#fffef2",
          "center",
          1000,
          "#173d1d",
          5,
        );
      });
      ctx.restore();
    });
    this.drawDailyTaskHomeEntry();
    if (drawNavigation) this.drawMainNavigation("home");
    if (this.updateToastVisible && !this.homeCoinFlight) this.drawUpdateToast(safe.top);
  }


  private drawDailyTaskHomeEntry(): void {
    const ui = this.art.homeUi;
    if (!ui) return;
    const placement = DAILY_TASK_LAYOUT.homeEntry;
    this.withHomeArtboard(() => {
      this.drawPressable("homeMissions", placement, () => {
        this.ctx.drawImage(ui.dailyTaskEntry, placement.x, placement.y);
      });
      if (this.dailyTaskHasNotification()) {
        this.drawDiscoveryBadge({ x: placement.x + placement.width - 28, y: placement.y - 9, width: NOTIFICATION_DOT_SIZE, height: NOTIFICATION_DOT_SIZE });
      }
    });
  }

  private drawMainNavigationPage(screen: MainNavigationScreen, offsetX: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(offsetX, 0);
    if (screen === "home") this.drawHome(false);
    else if (screen === "supply") this.drawSupply(false);
    else if (screen === "leaderboard") this.drawLeaderboard(false);
    else if (screen === "levels") this.drawLevels(false);
    else this.drawCollectionPage(false);
    ctx.restore();
  }

  private drawMainNavigationTransition(transition: MainNavigationTransition): void {
    const progress = this.mainNavigationVisualProgress(transition);
    this.drawMainNavigationPage(transition.from, -transition.direction * progress * LOGICAL_WIDTH);
    this.drawMainNavigationPage(transition.to, transition.direction * (1 - progress) * LOGICAL_WIDTH);
    this.drawMainNavigation(this.navigationPendingTarget ?? transition.to);
  }

  private drawMainNavigation(selected: MainNavigationScreen): void {
    const ui = this.art.homeUi;
    if (!ui) return;
    const ctx = this.ctx;
    const bottomOffset = this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    const selectedLayout = HOME_NAVIGATION_LAYOUT.find((item) => item.screen === selected) ?? HOME_NAVIGATION_LAYOUT[2];
    this.withHomeArtboard(() => {
      ctx.save();
      ctx.translate(0, -bottomOffset);
      ctx.drawImage(ui.navigationBar, HOME_ART_LAYOUT.navigationBar.x, HOME_ART_LAYOUT.navigationBar.y);
      ctx.drawImage(ui.navigationDivider, HOME_ART_LAYOUT.navigationDividerLeft.x, HOME_ART_LAYOUT.navigationDividerLeft.y);
      ctx.drawImage(ui.navigationDivider, HOME_ART_LAYOUT.navigationDividerRight.x, HOME_ART_LAYOUT.navigationDividerRight.y);
      const selectedIndex = MAIN_NAVIGATION.findIndex((item) => item.screen === selected);
      const selectedKey = `navigation.${selectedIndex}`;
      const selectedRect = homeNavigationTabPlacement(selected, selected);
      this.drawPressable(selectedKey, selectedRect, () => {
        ctx.drawImage(
          ui.navigationSelected,
          homeNavigationTabCenterX(selected, selected) - HOME_ART_LAYOUT.navigationSelected.width / 2,
          HOME_ART_LAYOUT.navigationSelected.y,
        );
      });
      const navigationIcons = {
        shop: ui.shopIcon,
        leaderboard: ui.leaderboardIcon,
        home: ui.homeIcon,
        journey: ui.journeyIcon,
        collection: ui.collectionIcon,
      } as const;
      for (const [index, tab] of HOME_NAVIGATION_LAYOUT.entries()) {
        const icon = navigationIcons[tab.icon];
        const placement = homeNavigationIconPlacement(tab.screen, selected);
        const tabRect = homeNavigationTabPlacement(tab.screen, selected);
        this.drawPressable(`navigation.${index}`, tabRect, () => {
          ctx.save();
          ctx.translate(placement.x, placement.y);
          // The source PNG remains byte-identical and is still drawn at its
          // natural dimensions. Uniform context transforms supply selected
          // emphasis and the temporary pressed feedback without stretching.
          ctx.scale(placement.scale, placement.scale);
          ctx.drawImage(icon, 0, 0);
          ctx.restore();
        });
      }
      this.drawPressable(selectedKey, selectedRect, () => {
        this.label(
          this.tr(MAIN_NAVIGATION_TRANSLATION[selected]),
          homeNavigationTabCenterX(selected, selected),
          HOME_TYPOGRAPHY.navigationY,
          selectedLayout.labelSize,
          "#fff8d9",
          "center",
          1000,
          "#2d153f",
          4,
          HOME_ART_LAYOUT.navigationSelected.width - 20,
        );
      });
      if (this.hasClaimableJourneyReward()) {
        this.drawDiscoveryBadge(this.navigationNotificationDotArtRect("levels", selected));
      }
      if (this.pendingCollectionDiscoveryItems().length > 0 || this.collectionAlbumHasNotification()) {
        this.drawDiscoveryBadge(this.navigationNotificationDotArtRect("records", selected));
      }
      ctx.restore();
    });
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
    this.drawPressable("updateToast", rect, () => {
      ctx.save();
      ctx.globalAlpha = fadeIn * fadeOut;
      this.drawChromePanel(rect.x, rect.y, rect.width, rect.height, 28);
      this.drawOnboardingIcon(1, rect.x + 50, rect.y + rect.height / 2, 62);
      this.label(this.tr("update.toastTitle"), rect.x + 94, rect.y + 30, 21, "#fff1a8", "left", 950, "#4d1d7a", 3, 235);
      this.label(this.tr("update.item.formalArt"), rect.x + 94, rect.y + 57, 16, "#efeaff", "left", 800, undefined, 0, 235);
      this.label(this.tr("update.toastPrompt"), rect.x + 94, rect.y + 80, 14, "#82e9ff", "left", 750, undefined, 0, 235);
      ctx.restore();
    });
  }

  private drawHomeLevelArrows(): void {
    const ui = this.art.homeUi;
    if (!ui) return;
    if (this.model.level.id > 1) {
      this.drawPressable("homePrev", HOME_ART_LAYOUT.previousLevel, () => {
        this.ctx.drawImage(ui.arrowLeft, HOME_ART_LAYOUT.previousLevel.x, HOME_ART_LAYOUT.previousLevel.y);
      });
    }
    if (this.model.level.id < this.save.highestLevel) {
      this.drawPressable("homeNext", HOME_ART_LAYOUT.nextLevel, () => {
        this.ctx.drawImage(ui.arrowRight, HOME_ART_LAYOUT.nextLevel.x, HOME_ART_LAYOUT.nextLevel.y);
      });
    }
  }

  private drawFormalPageReference(reference: HTMLImageElement, drawOverlay: () => void): void {
    const ctx = this.ctx;
    const safeBottomArt = this.screen === "mechanismGuide" ? 0 : this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
    this.withHomeArtboard(() => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, HOME_ARTBOARD.width, FORMAL_PAGE_CONTENT_BOTTOM - safeBottomArt);
      ctx.clip();
      ctx.drawImage(reference, 0, 0);
      drawOverlay();
      ctx.restore();
    });
  }

  private drawFormalPageLoading(screen: FormalMetaPage): void {
    // During a navigation transition both the outgoing and incoming pages are
    // rendered. Only the selected destination may request its lazy asset group;
    // otherwise the outgoing page would reload itself after it was released.
    const failed = this.formalPageFailed(screen);
    if (this.screen === screen && !failed) this.requestFormalPageArt(screen);
    const canDefer = failed && screen === "levels" && this.journeyPresentation?.phase === "progress";
    this.drawChromePanel(82, 430, 332, canDefer ? 246 : failed ? 174 : 150, 36);
    this.label(failed ? this.tr("page.loadFailed") : this.tr("page.loading"), 248, 493, 22, "#fff4c7", "center", 900, "#4f218f", 4, 285);
    if (failed) {
      this.drawButton("formalPageRetry", BUTTONS.formalPageRetry, this.tr("page.retryLoad"), "#43dc38", "#0a8122", 22);
      if (canDefer) {
        this.drawButton("journeyPresentationLater", BUTTONS.journeyPresentationLater, this.tr("journey.later"), "#7867d8", "#3d2b8f", 20);
      }
    }
  }

  private drawLevels(drawNavigation = true): void {
    const art = this.formalPageArtFor("levels");
    if (!art || art.screen !== "levels") {
      this.drawFormalPageLoading("levels");
      if (drawNavigation) this.drawMainNavigation("levels");
      return;
    }

    if (this.screen === "levels") {
      void art.deferred.requestEpisodes(this.journeyEpisodeIndexesInView(0.75)).catch(() => { /* local chapter retry */ });
    }
    const ctx = this.ctx;
    const journeyView = this.journeyScrollView();
    const presentation = this.journeyPresentation;
    const progressDuration = this.save.reducedMotion ? JOURNEY_PROGRESS_REDUCED_DURATION : JOURNEY_PROGRESS_DURATION;
    const progress = presentation?.phase === "progress"
      ? easeOutCubic(Math.min(1, presentation.age / progressDuration))
      : 1;
    const claimed = new Set(this.save.journeyProgress.claimedMilestoneLevels);
    const anchorLevel = this.journeyAnchorLevel();
    const anchorRewardLevel = JOURNEY_MILESTONE_REWARDS.reduce((nearest, reward) => (
      Math.abs(reward.level - anchorLevel) < Math.abs(nearest.level - anchorLevel) ? reward : nearest
    )).level;

    this.drawFormalPageReference(art.background, () => {
      const layout = FORMAL_JOURNEY_LAYOUT;
      const contentViewport = this.journeyRenderViewportArt();
      const markerCenterY = contentViewport.y
        + this.journeyMarkerContentPointForLevel(anchorLevel)
        - journeyView.scrollOffset
        + (1 - progress) * 38;

      ctx.save();
      ctx.beginPath();
      ctx.rect(contentViewport.x, contentViewport.y, contentViewport.width, contentViewport.height);
      ctx.clip();

      // Video parity: the entire map plane moves, including its background.
      this.drawJourneyVerticalTiles(art.background, layout.background, journeyView.contentOffset, contentViewport);

      const movingTrack = { ...layout.track, y: contentViewport.y };
      const movingProgressTrack = { ...layout.trackProgress, y: contentViewport.y };
      const startTrackEndY = contentViewport.y
        + this.journeyStartTrackEndContentPoint()
        + journeyView.contentOffset;
      const trackClipBottom = Math.min(contentViewport.y + contentViewport.height, startTrackEndY);
      if (trackClipBottom > contentViewport.y) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          contentViewport.x,
          contentViewport.y,
          contentViewport.width,
          trackClipBottom - contentViewport.y,
        );
        ctx.clip();
        this.drawJourneyVerticalTiles(art.track, movingTrack, journeyView.contentOffset, contentViewport);
        // The green center rail follows the same start cap as its purple base:
        // Lv1-10 is the first stop, so neither rail may continue below it.
        this.drawJourneyVerticalTiles(art.trackProgress, movingProgressTrack, journeyView.contentOffset, contentViewport);
        ctx.restore();
      }

      journeyView.entries.forEach((entry) => {
        if (entry.kind === "reward") {
          const index = journeyView.rewardRows.indexOf(entry);
          const cardY = entry.y + (layout.journeyContent.rewardHeight - layout.levelCards[0].height) / 2;
          const card = { ...layout.levelCards[0], y: cardY };
          const rewardCard = { ...layout.rewardCards[0], y: cardY };
          const reachedDuringPresentation = presentation?.phase === "progress"
            && presentation.event.level === entry.levelId
            && progress >= 0.66;
          const completed = claimed.has(entry.levelId) || reachedDuringPresentation;
          const active = entry.levelId === anchorRewardLevel;
          // The active milestone card reports the player's live Journey level
          // (Lv16 in the supplement) while retaining the milestone's reward
          // identity and selection behavior underneath.
          const displayedLevel = entry.levelId === anchorRewardLevel ? anchorLevel : entry.levelId;
          this.drawPressable(`journeyNode.${index}`, this.journeyNodeArtRect(entry), () => {
            if (active) {
              ctx.drawImage(art.levelCardActiveLeft, card.x - 9, card.y - 7);
            }
            ctx.drawImage(art.levelCardLeft, card.x, card.y);
            this.label(
              this.tr("common.level"),
              layout.typography.levelLabel.x,
              card.y + layout.typography.levelLabel.centerYOffset,
              layout.typography.levelLabel.size,
              "#8b2d0a",
              "center",
              850,
              undefined,
              0,
            );
            this.label(
              `${displayedLevel}`,
              layout.typography.levelNumber.x,
              card.y + layout.typography.levelNumber.centerYOffset,
              layout.typography.levelNumber.size,
              "#fffaf0",
              "center",
              950,
              "#8b2d0a",
              4,
            );
          });
          this.drawPressable(`journeyReward.${entry.levelId}`, this.journeyRewardArtRect(entry), () => {
            if (active) {
              ctx.drawImage(art.rewardCardActiveRight, rewardCard.x - 9, rewardCard.y - 6);
            }
            ctx.drawImage(art.rewardCardRight, rewardCard.x, rewardCard.y);
            const rewardImage = entry.reward.kind === "unlimited_lives"
              ? art.rewards.heart
              : art.rewards[entry.reward.kind];
            const imageWidth = rewardImage.naturalWidth || rewardImage.width;
            const imageHeight = rewardImage.naturalHeight || rewardImage.height;
            const center = {
              x: layout.rewardCenters[0].x,
              y: card.y + (layout.rewardCenters[0].y - layout.rewardCards[0].y),
            };
            ctx.drawImage(rewardImage, center.x - imageWidth / 2, center.y - imageHeight / 2);
            const rewardAmount = entry.reward.kind === "unlimited_lives"
              ? `∞ ${this.compactDuration(entry.reward.amount)}`
              : entry.reward.kind === "coins"
                ? `${entry.reward.amount}`
                : `x${entry.reward.amount}`;
            if (!completed) {
              this.label(
                rewardAmount,
                layout.typography.rewardAmount.x,
                card.y + layout.typography.rewardAmount.centerYOffset,
                layout.typography.rewardAmount.size,
                "#fffaf0",
                "center",
                950,
                "#8b2d0a",
                4,
              );
            }
            if (completed) {
              ctx.drawImage(art.rewards.complete, rewardCard.x + 171, rewardCard.y + 85);
            }
          });
          if (this.journeyRewardClaimable(entry.reward)) {
            this.drawDiscoveryBadge(this.journeyRewardNotificationDotArtRect(entry));
          }
          return;
        }

        if (entry.kind === "episode") {
          const episode = entry.episode;
          const unlocked = episode.unlockLevel <= this.save.highestLevel;
          const selected = this.save.selectedJourneyEpisode === episode.index;
          const imagePlacement = layout.journeyContent.episodeImage;
          const imageIndex = this.journeyEpisodeArtIndex(episode.index);
          const image = art.deferred.episode(imageIndex);
          this.label(
            this.tr("journey.episodeTitle", { title: episode.title }),
            layout.typography.episodeTitle.x,
            entry.y + layout.typography.episodeTitle.centerYOffset,
            layout.typography.episodeTitle.size,
            "#fffaf3",
            "center",
            950,
            "#352080",
            6,
            600,
          );
          ctx.save();
          if (unlocked && presentation?.event.type === "episode_unlock"
            && presentation.event.episode.index === episode.index
            && presentation.phase === "progress") {
            ctx.filter = `grayscale(${Math.round((1 - progress) * 100)}%)`;
            ctx.globalAlpha = 0.62 + progress * 0.38;
          }
          if (image) {
            ctx.drawImage(image, imagePlacement.x, entry.y + imagePlacement.yOffset,
              imagePlacement.width, imagePlacement.height);
          } else {
            const failed = art.deferred.failedEpisodeIndexes.includes(imageIndex);
            this.label(this.tr(failed ? "page.retryLoad" : "page.loading"),
              imagePlacement.x + imagePlacement.width / 2,
              entry.y + imagePlacement.yOffset + imagePlacement.height / 2,
              26, "#fffaf3", "center", 850, "#352080", 3, imagePlacement.width - 12);
          }
          ctx.restore();
          if (!unlocked && image) {
            ctx.drawImage(
              art.lockedShade,
              imagePlacement.x,
              entry.y + imagePlacement.yOffset,
            );
            const lock = layout.journeyContent.episodeLock;
            ctx.drawImage(
              art.lock,
              imagePlacement.x + lock.xOffset,
              entry.y + imagePlacement.yOffset + lock.yOffset,
              lock.width,
              lock.height,
            );
          }
          const range = layout.journeyContent.episodeRange;
          ctx.drawImage(art.episodeRangePanel, range.x, entry.y + range.yOffset);
          this.label(
            this.tr("journey.levelRange", { start: episode.startLevel, end: episode.endLevel }),
            layout.typography.episodeRange.x,
            entry.y + layout.typography.episodeRange.centerYOffset,
            layout.typography.episodeRange.size,
            "#fffaf3",
            "center",
            950,
            "#352080",
            3,
          );
          const button = this.journeyEpisodeButtonArtRect(entry);
          this.drawPressable(`journeyEpisode.${episode.index}`, button, () => {
            const buttonImage = selected ? art.episodeSelectedButton : art.episodeActionButton;
            const imageWidth = buttonImage.naturalWidth || buttonImage.width;
            ctx.drawImage(buttonImage, button.x + (button.width - imageWidth) / 2, button.y);
            if (selected) {
              ctx.drawImage(art.rewards.complete, button.x + 47, button.y - 26);
            } else if (unlocked) {
              this.label(
                this.tr("common.use"),
                layout.typography.episodeButton.x,
                entry.y + layout.typography.episodeButton.centerYOffset,
                layout.typography.episodeButton.size,
                "#fffaf3",
                "center",
                950,
                "#145c1d",
                4,
              );
            } else {
              this.label(
                this.tr("journey.level", { level: episode.unlockLevel }),
                layout.typography.episodeButton.x,
                entry.y + layout.typography.episodeButton.centerYOffset,
                layout.typography.episodeButton.size,
                "#fffaf3",
                "center",
                950,
                "#145c1d",
                4,
              );
            }
          });
          return;
        }

        const finale = layout.journeyContent.finaleImage;
        const finished = this.save.rewardedLevels.includes(LEVELS.length);
        this.label(
          this.tr("journey.finaleTitle"),
          layout.typography.finaleTitle.x,
          entry.y + layout.typography.finaleTitle.centerYOffset,
          layout.typography.finaleTitle.size,
          "#fffaf3",
          "center",
          950,
          "#7b3c13",
          5,
        );
        ctx.save();
        if (!finished) {
          ctx.filter = "grayscale(1) brightness(.62)";
          ctx.globalAlpha = 0.9;
        }
        ctx.drawImage(art.destination, finale.x, entry.y + finale.yOffset, finale.width, finale.height);
        ctx.restore();
        if (!finished) this.drawSystemIcon(11, 360, entry.y + 225, 62, 0.96);
        else ctx.drawImage(art.rewards.complete, 319, entry.y + 330, 82, 73);
        this.label(
          finished ? this.tr("journey.complete") : this.tr("journey.level", { level: LEVELS.length }),
          layout.typography.finaleLevel.x,
          entry.y + layout.typography.finaleLevel.centerYOffset,
          layout.typography.finaleLevel.size,
          "#fffaf3",
          "center",
          950,
          "#352080",
          4,
        );
      });

      if (markerCenterY >= contentViewport.y - 80
        && markerCenterY <= contentViewport.y + contentViewport.height + 80) {
        ctx.drawImage(art.currentMarker, layout.marker.x, markerCenterY - layout.marker.height / 2);
      }
      ctx.restore();
      ctx.drawImage(art.topHeader, layout.topHeader.x, layout.topHeader.y);
      ctx.drawImage(art.titlePanel, layout.titlePanel.x, layout.titlePanel.y);
      ctx.drawImage(art.title, layout.title.x, layout.title.y);
    });
    if (drawNavigation) this.drawMainNavigation("levels");
  }

  private journeyPresentationRewardImage(art: FormalJourneyArt): HTMLImageElement | undefined {
    const presentation = this.journeyPresentation;
    if (!presentation) return undefined;
    if (presentation.event.type === "episode_unlock") {
      return art.deferred.episode(this.journeyEpisodeArtIndex(presentation.event.episode.index));
    }
    const kind = presentation.event.reward.kind;
    return art.deferred.presentation?.rewards[kind === "unlimited_lives" ? "heart" : kind];
  }

  private journeyPresentationRewardText(): string {
    const presentation = this.journeyPresentation;
    if (!presentation || presentation.event.type === "episode_unlock") return "";
    const { reward } = presentation.event;
    if (reward.kind === "unlimited_lives") {
      return this.tr("journey.reward.duration", {
        reward: this.journeyRewardName(reward.kind),
        amount: this.compactDuration(reward.amount),
        unit: "",
      });
    }
    return this.tr("journey.reward.quantity", {
      reward: this.journeyRewardName(reward.kind),
      amount: reward.amount,
    });
  }

  private drawJourneyPresentationOverlay(): void {
    const presentation = this.journeyPresentation;
    const art = this.formalPageArtFor("levels");
    if (!presentation || !art || art.screen !== "levels") return;
    this.requestJourneyPresentationArt();
    const popup = art.deferred.presentation;
    const event = presentation.event;
    const image = this.journeyPresentationRewardImage(art);
    if (!popup || !image) {
      const layout = JOURNEY_PRESENTATION_LAYOUT;
      this.ctx.save();
      this.ctx.fillStyle = `rgba(0,0,0,${layout.overlay.alpha})`;
      this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      this.ctx.restore();
      const panel = homeArtRect(layout.panel);
      this.drawChromePanel(panel.x, panel.y, panel.width, panel.height, 36);
      this.label(this.tr(this.journeyPresentationArtFailed() ? "page.loadFailed" : "page.loading"),
        LOGICAL_WIDTH / 2, 493, 22, "#fff4c7", "center", 900, "#4f218f", 3, 285);
      this.drawButton("journeyPresentationClose", BUTTONS.journeyPresentationClose, "×", "#ff7160", "#aa2828", 35);
      if (this.journeyPresentationArtFailed()) {
        this.drawButton("journeyPresentationArtRetry", BUTTONS.formalPageRetry, this.tr("page.retryLoad"), "#43dc38", "#0a8122", 22);
      }
      return;
    }
    const imageWidth = (image.naturalWidth || image.width) * HOME_ARTBOARD_SCALE;
    const imageHeight = (image.naturalHeight || image.height) * HOME_ARTBOARD_SCALE;

    if (presentation.phase === "claiming") {
      const linear = Math.min(1, presentation.age / JOURNEY_REWARD_FLIGHT_DURATION);
      const progress = easeOutCubic(linear);
      if (event.type === "episode_unlock") {
        this.ctx.save();
        this.ctx.globalAlpha = 1 - linear;
        const scale = 1 + progress * 0.26;
        const centerX = LOGICAL_WIDTH / 2;
        const centerY = 520;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(scale, scale);
        this.ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
        this.ctx.restore();
        return;
      }
      const start = { x: LOGICAL_WIDTH / 2, y: 530 };
      const end = event.reward.kind === "coins"
        ? { x: 45, y: 55 }
        : event.reward.kind === "heart" || event.reward.kind === "unlimited_lives"
          ? { x: 331, y: 55 }
          : { x: this.mainNavigationRect(0).x + this.mainNavigationRect(0).width / 2, y: 1020 };
      const x = start.x + (end.x - start.x) * progress;
      const y = start.y + (end.y - start.y) * progress - Math.sin(progress * Math.PI) * 80;
      const scale = 1 - progress * 0.55;
      this.ctx.save();
      this.ctx.globalAlpha = 1 - Math.max(0, linear - 0.72) / 0.28;
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      this.ctx.restore();
      return;
    }

    const layout = JOURNEY_PRESENTATION_LAYOUT;
    this.ctx.save();
    this.ctx.globalAlpha = layout.overlay.alpha;
    this.ctx.fillStyle = layout.overlay.color;
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.ctx.restore();
    this.withHomeArtboard(() => {
      const episodeUnlock = event.type === "episode_unlock";
      this.ctx.drawImage(popup.panel, layout.panel.x, layout.panel.y);
      this.drawPressable("journeyPresentationClose", layout.close, () => {
        this.ctx.drawImage(popup.close, layout.close.x, layout.close.y);
      });
      if (this.save.language === "en") {
        this.ctx.drawImage(
          episodeUnlock ? popup.titleEpisodeUnlocked : popup.titleJourneyRewards,
          episodeUnlock ? layout.episodeTitle.x : layout.rewardsTitle.x,
          episodeUnlock ? layout.episodeTitle.y : layout.rewardsTitle.y,
        );
      } else {
        this.label(
          episodeUnlock ? this.tr("journey.episodeUnlocked") : this.tr("journey.rewardsTitle"),
          360,
          356,
          44,
          "#fffaf3",
          "center",
          950,
          "#352080",
          6,
          480,
        );
      }
      if (episodeUnlock) {
        const { episode } = event;
        this.ctx.drawImage(image, layout.episodeImage.x, layout.episodeImage.y, layout.episodeImage.width, layout.episodeImage.height);
        this.label(this.tr("journey.levelRange", { start: episode.startLevel, end: episode.endLevel }), layout.typography.level.x, layout.typography.level.y, layout.typography.level.size, layout.typography.level.fill, "center", 750);
        this.label(this.tr("journey.episodeTitle", { title: episode.title }), layout.typography.name.x, layout.typography.name.y, layout.typography.name.size, layout.typography.name.fill, "center", 950, layout.typography.name.stroke, layout.typography.name.lineWidth, 520);
      } else {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        this.ctx.drawImage(image, layout.rewardCenter.x - width / 2, layout.rewardCenter.y - height / 2);
        this.label(this.tr("journey.level", { level: event.level }), layout.typography.level.x, layout.typography.level.y, layout.typography.level.size, layout.typography.level.fill, "center", 750);
        this.label(this.journeyPresentationRewardText(), layout.typography.name.x, layout.typography.name.y, layout.typography.name.size, layout.typography.name.fill, "center", 950, layout.typography.name.stroke, layout.typography.name.lineWidth);
      }
      const readOnlyText = this.journeyPresentationRewardReadOnlyText(presentation);
      const style = episodeUnlock ? layout.typography.episodeButton : layout.typography.rewardButton;
      if (readOnlyText) {
        this.label(
          readOnlyText,
          style.x,
          style.y,
          style.size,
          style.fill,
          "center",
          950,
          style.stroke,
          style.lineWidth,
        );
      } else {
        this.drawPressable("journeyPresentation", layout.button, () => {
          this.ctx.drawImage(
            episodeUnlock ? popup.episodeButton : popup.rewardButton,
            layout.button.x,
            layout.button.y,
          );
          this.label(
            episodeUnlock || presentation.blockedGrant
              ? this.tr("journey.tapToContinue")
              : this.tr("journey.tapToClaim"),
            style.x,
            style.y,
            style.size,
            style.fill,
            "center",
            950,
            style.stroke,
            style.lineWidth,
          );
        });
      }
      if (presentation.error) {
        const error = layout.typography.error;
        this.label(presentation.error, error.x, error.y, error.size, error.fill, "center", 900, error.stroke, error.lineWidth);
      }
    });
  }

  private drawRecords(drawNavigation = true): void {
    const art = this.formalPageArtFor("records");
    if (!art || art.screen !== "records") {
      this.drawFormalPageLoading("records");
      if (drawNavigation) this.drawMainNavigation("records");
      return;
    }

    const ctx = this.ctx;
    const items = this.collectionItems();
    const selectedIndex = Math.max(0, items.findIndex((item) => item.id === this.collectionSelectedId));
    const selected = items[selectedIndex] ?? items[0];
    const selectedUnlocked = this.collectionItemUnlocked(selected);
    const layout = FORMAL_COLLECTION_LAYOUT;
    const visibleEntries = this.collectionScrollView().entries;

    this.withHomeArtboard(() => {
      ctx.drawImage(art.panel, layout.panel.x, layout.panel.y);
      const heading = layout.typography.title;
      this.label(this.albumText("gameplayGuide"), heading.x, heading.y, heading.size,
        heading.fill, "center", 950, heading.stroke, heading.lineWidth, heading.maxWidth);

      ctx.save();
      ctx.beginPath();
      ctx.rect(layout.listViewport.x, layout.listViewport.y, layout.listViewport.width, layout.listViewport.height);
      ctx.clip();
      visibleEntries.forEach((entry) => {
        const { item, index } = entry;
        const rect = this.collectionCardArtRectForEntry(entry);
        const unlocked = this.collectionItemUnlocked(item);
        const isSelected = index === selectedIndex;
        this.drawPressable(`collection.${item.id}`, rect, () => {
          ctx.drawImage(art.card, rect.x, rect.y);
          const icon = art.itemImages[item.atlasIndex];
          // Keep the mechanism visible beneath the locked overlay and padlock.
          // Unlocking controls the detail text and selection, not the artwork.
          if (icon) {
            const width = icon.naturalWidth || icon.width;
            const height = icon.naturalHeight || icon.height;
            const slot = layout.cardIcon;
            const scale = Math.min(1, slot.maxWidth / width, slot.maxHeight / height);
            const drawWidth = width * scale;
            const drawHeight = height * scale;
            const drawX = rect.x + slot.centerX - drawWidth / 2;
            const drawY = rect.y + slot.centerY - drawHeight / 2;
            if (scale === 1) ctx.drawImage(icon, drawX, drawY);
            else ctx.drawImage(icon, drawX, drawY, drawWidth, drawHeight);
          }
          this.label(
            this.collectionItemTitle(item),
            rect.x + rect.width / 2,
            rect.y + layout.typography.cardTitle.centerYOffset,
            layout.typography.cardTitle.size,
            layout.typography.cardTitle.fill,
            "center",
            1000,
            layout.typography.cardTitle.stroke,
            layout.typography.cardTitle.lineWidth,
            rect.width - 16,
          );
          if (!unlocked) {
            ctx.drawImage(art.lockedOverlay, rect.x + layout.lockedOverlayOffset.x, rect.y + layout.lockedOverlayOffset.y);
            ctx.drawImage(art.lock, rect.x + layout.cardLock.x, rect.y + layout.cardLock.y);
          }
          if (isSelected && unlocked) {
            ctx.drawImage(
              art.selected,
              rect.x + layout.selectedOffset.x,
              rect.y + layout.selectedOffset.y,
            );
          }
        });
        if (this.collectionItemHasNotification(item)) {
          this.drawDiscoveryBadge(this.collectionNotificationDotArtRectForEntry(entry));
        }
      });
      ctx.restore();

      ctx.drawImage(art.detailPanel, layout.detailPanel.x, layout.detailPanel.y);
      ctx.drawImage(art.titleShadow, layout.detailTitleShade.x, layout.detailTitleShade.y);
      ctx.drawImage(art.detailBody, layout.detailBody.x, layout.detailBody.y);
      this.label(
        this.collectionItemTitle(selected),
        layout.typography.detailTitle.x,
        layout.typography.detailTitle.y,
        layout.typography.detailTitle.size,
        layout.typography.detailTitle.fill,
        "center",
        1000,
        layout.typography.detailTitle.stroke,
        layout.typography.detailTitle.lineWidth,
        layout.detailTitleShade.width - 20,
      );
      this.wrapText(
        this.collectionDetailText(selected),
        layout.typography.detailBody.x,
        layout.typography.detailBody.y,
        layout.typography.detailBody.maxWidth,
        layout.typography.detailBody.lineHeight,
        layout.typography.detailBody.size,
        selectedUnlocked ? layout.typography.detailBody.fill : "#75666a",
        layout.typography.detailBody.align,
        undefined,
        0,
        layout.detailBody.y + layout.detailBody.height - 12 - (selectedUnlocked ? 0 : 24),
      );
      if (!selectedUnlocked) {
        this.label(
          this.tr("common.lvNumber", { level: selected.unlockLevel }),
          layout.detailBody.x + layout.detailBody.width + layout.typography.lockedLevel.xOffset,
          layout.detailBody.y + layout.detailBody.height + layout.typography.lockedLevel.yOffset,
          layout.typography.lockedLevel.size,
          "#9b5d45",
          "right",
          900,
        );
      }
    });
    if (drawNavigation) this.drawMainNavigation("records");
  }

  private drawSupply(drawNavigation = true): void {
    const art = this.formalPageArtFor("supply");
    if (!art || art.screen !== "supply") {
      this.drawFormalPageLoading("supply");
      if (drawNavigation) this.drawMainNavigation("supply");
      return;
    }

    const ctx = this.ctx;
    const ui = this.art.homeUi;
    this.drawFormalPageReference(art.reference, () => {
      FORMAL_SHOP_LAYOUT.referenceCleanup.forEach(({ source, target }) => {
        ctx.drawImage(
          art.reference,
          source.x,
          source.y,
          source.width,
          source.height,
          target.x,
          target.y,
          target.width,
          target.height,
        );
      });
      if (this.save.language !== "en") {
        ctx.fillStyle = "#4f2dc8";
        ctx.fillRect(300, 102, 120, 53);
        this.label(this.tr("shop.title"), 360, 130, 42, "#fffaf3", "center", 950, "#352080", 5, 190);
      }

      if (ui) {
        ctx.drawImage(ui.resourcePanel, FORMAL_SHOP_LAYOUT.coinPanel.x, FORMAL_SHOP_LAYOUT.coinPanel.y);
        ctx.drawImage(ui.coinIcon, FORMAL_SHOP_LAYOUT.coinIcon.x, FORMAL_SHOP_LAYOUT.coinIcon.y);
        const coinText = FORMAL_SHOP_LAYOUT.typography.coin;
        this.label(
          `${this.save.coins}`,
          coinText.x,
          coinText.y,
          coinText.size,
          "#723515",
          "center",
          950,
          undefined,
          0,
          coinText.maxWidth,
        );
      }

      SUPPLY_ORDER.forEach((kind, index) => {
        const item = SUPPLY_ITEMS[kind];
        const row = FORMAL_SHOP_LAYOUT.rows[index];
        const stock = this.save.boosters[kind];
        const unlocked = this.boosterUnlocked(kind);
        const full = stock >= item.maxStock;
        const affordable = unlocked && this.save.coins >= item.price;

        // The supplied composite contains placeholder copy. Its card shell is
        // the only formal shell exported, so clear only the flat, editable text
        // wells before painting live inventory/economy values over it.
        ctx.fillStyle = "#fdedd4";
        ctx.fillRect(258, row.card.y + 58, 397, 132);
        ctx.fillStyle = "#409af5";
        ctx.fillRect(64, row.card.y + 229, 350, 78);
        ctx.fillRect(row.buy.x - 7, row.buy.y - 7, row.buy.width + 14, row.buy.height + 14);

        ctx.drawImage(art.boosterTile, row.tile.x, row.tile.y);
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.48;
        ctx.drawImage(art.boosterIcons[kind], row.icon.x, row.icon.y);
        ctx.restore();
        this.label(
          this.boosterEffect(kind),
          FORMAL_SHOP_LAYOUT.typography.effect.x,
          row.effectY,
          FORMAL_SHOP_LAYOUT.typography.effect.size,
          "#fff8ee",
          "left",
          700,
          "#5d2615",
          3,
          FORMAL_SHOP_LAYOUT.typography.effect.maxWidth,
        );
        this.label(
          unlocked
            ? this.tr("shop.inventory", { count: stock, max: item.maxStock })
            : this.tr("shop.unlocksAtLevel", { level: item.unlockLevel }),
          FORMAL_SHOP_LAYOUT.typography.stock.x,
          row.stockY,
          FORMAL_SHOP_LAYOUT.typography.stock.size,
          unlocked ? "#fff8ee" : "#d6c8c2",
          "left",
          700,
          unlocked ? "#5d2615" : "#765d56",
          3,
          FORMAL_SHOP_LAYOUT.typography.stock.maxWidth,
        );
        this.label(
          this.boosterName(kind),
          FORMAL_SHOP_LAYOUT.typography.title.x,
          row.titleY,
          FORMAL_SHOP_LAYOUT.typography.title.size,
          "#ffffff",
          "left",
          950,
          "#263f88",
          4,
          285,
        );

        this.drawPressable(`supply.${kind}`, row.buy, () => {
          ctx.save();
          ctx.globalAlpha = !unlocked || full ? 0.58 : affordable ? 1 : 0.68;
          ctx.drawImage(art.buyButton, row.buy.x, row.buy.y);
          ctx.restore();
          if (!unlocked) {
            this.label(
              this.tr("common.lvNumber", { level: item.unlockLevel }),
              row.buy.x + row.buy.width / 2,
              row.buy.y + FORMAL_SHOP_LAYOUT.typography.buy.centerYOffset,
              FORMAL_SHOP_LAYOUT.typography.buy.lockedSize,
              "#ffffff",
              "center",
              900,
              "#1a6f19",
              3,
            );
          } else if (full) {
            this.label(
              this.tr("shop.full"),
              row.buy.x + row.buy.width / 2,
              row.buy.y + FORMAL_SHOP_LAYOUT.typography.buy.centerYOffset,
              FORMAL_SHOP_LAYOUT.typography.buy.fullSize,
              "#ffffff",
              "center",
              950,
              "#1a6f19",
              3,
            );
          } else {
            ctx.save();
            ctx.globalAlpha = affordable ? 1 : 0.62;
            ctx.drawImage(art.priceCoin, row.buy.x + 28, row.buy.y + 19);
            this.label(
              `${item.price}`,
              row.buy.x + FORMAL_SHOP_LAYOUT.typography.buy.priceXOffset,
              row.buy.y + FORMAL_SHOP_LAYOUT.typography.buy.centerYOffset,
              FORMAL_SHOP_LAYOUT.typography.buy.priceSize,
              "#ffffff",
              "center",
              950,
              "#1a6f19",
              3,
            );
            ctx.restore();
          }
        });
      });

      if (this.supplyFeedback) {
        const feedbackText = FORMAL_SHOP_LAYOUT.typography.feedback;
        this.label(
          this.supplyFeedback.text,
          feedbackText.x,
          feedbackText.y,
          feedbackText.size,
          this.supplyFeedback.color,
          "center",
          900,
          "#2d155f",
          4,
        );
      }
    });
    if (drawNavigation) this.drawMainNavigation("supply");
  }

  private drawLeaderboard(drawNavigation = true): void {
    const art = this.formalPageArtFor("leaderboard");
    if (!art || art.screen !== "leaderboard") {
      this.drawFormalPageLoading("leaderboard");
      if (drawNavigation) this.drawMainNavigation("leaderboard");
      return;
    }

    const ctx = this.ctx;
    const ui = this.art.homeUi;
    const modes: Array<{ mode: LeaderboardMode; key: string; label: string }> = [
      { mode: "weekly", key: "leaderboardWeekly", label: this.tr("leaderboard.weekly") },
      { mode: "world", key: "leaderboardWorld", label: this.tr("leaderboard.world") },
      { mode: "country", key: "leaderboardCountry", label: this.tr("leaderboard.country") },
    ];
    const snapshot = this.leaderboardSnapshot();
    const allEntries = snapshot.entries;
    const view = this.leaderboardScrollView();
    const leaders = allEntries.slice(0, 3);
    const layout = FORMAL_LEADERBOARD_LAYOUT;
    const drawContainedCentered = (image: HTMLImageElement, placement: HomeArtPlacement): void => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const scale = Math.min(placement.width / width, placement.height / height);
      const drawWidth = width * scale;
      const drawHeight = height * scale;
      ctx.drawImage(
        image,
        placement.x + (placement.width - drawWidth) / 2,
        placement.y + (placement.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    };

    this.drawFormalPageReference(art.background, () => {
      ctx.drawImage(art.topHeader, layout.topHeader.x, layout.topHeader.y);
      ctx.drawImage(art.titlePanel, layout.titlePanel.x, layout.titlePanel.y);
      if (this.save.language === "en") ctx.drawImage(art.title, layout.title.x, layout.title.y);
      else this.label(this.tr("leaderboard.title"), 360, 142, 42, "#fffaf3", "center", 950, "#352080", 6, 294);
      if (ui) {
        ctx.drawImage(ui.resourcePanel, FORMAL_SHOP_LAYOUT.coinPanel.x, FORMAL_SHOP_LAYOUT.coinPanel.y);
        ctx.drawImage(ui.coinIcon, FORMAL_SHOP_LAYOUT.coinIcon.x, FORMAL_SHOP_LAYOUT.coinIcon.y);
        const coinText = layout.typography.coin;
        this.label(
          `${this.save.coins}`,
          coinText.x,
          coinText.y,
          coinText.size,
          "#723515",
          "center",
          950,
          undefined,
          0,
          coinText.maxWidth,
        );
      }
      ctx.drawImage(art.tabsFrame, layout.tabsFrame.x, layout.tabsFrame.y);
      modes.forEach(({ mode, key, label }, index) => {
        const rect = layout.tabs[index];
        const active = this.leaderboardMode === mode;
        this.drawPressable(key, rect, () => {
          ctx.drawImage(active ? art.tabActive : art.tabInactive, rect.x, rect.y);
          this.label(
            label,
            rect.x + rect.width / 2,
            rect.y + layout.typography.tab.centerYOffset,
            layout.typography.tab.size,
            active ? "#fff7cc" : "#f0e8ff",
            "center",
            900,
            "#3d2368",
            3,
          );
        });
      });

      ctx.drawImage(art.podium, layout.podium.x, layout.podium.y);
      leaders.forEach((entry, index) => {
        const slot = layout.podiumSlots[index];
        drawContainedCentered(art.avatars[entry.avatar], slot.avatar);
        ctx.drawImage(art.podiumNameplates[index], slot.nameplate.x, slot.nameplate.y);
        ctx.drawImage(art.podiumMedals[index], slot.medal.x, slot.medal.y);
        this.label(
          entry.name,
          slot.nameplate.x + slot.nameplate.width / 2,
          slot.nameY,
          layout.typography.podiumName.size,
          "#4c2918",
          "center",
          900,
          undefined,
          0,
          layout.typography.podiumName.maxWidth,
        );
      });

      const viewport = this.leaderboardListViewportArt();
      const rowTemplate = layout.rows[0];
      ctx.save();
      ctx.beginPath();
      ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
      ctx.clip();
      if (!view.totalEntries) {
        ctx.drawImage(art.row, rowTemplate.x, rowTemplate.y);
        this.label(
          this.tr("leaderboard.noData"),
          layout.typography.empty.x,
          rowTemplate.y + layout.typography.empty.rowYOffset,
          layout.typography.empty.size,
          "#5b331f",
          "center",
          900,
        );
      }
      view.entries.forEach((entry, visibleIndex) => {
        const rank = entry.rank;
        const absoluteIndex = view.firstIndex + visibleIndex;
        const slotIndex = absoluteIndex < layout.rows.length
          ? absoluteIndex
          : absoluteIndex % layout.rows.length;
        const sourceRow = layout.rows[slotIndex];
        const rowY = this.leaderboardRowTop(absoluteIndex) - view.scrollOffset;
        const rowShift = rowY - sourceRow.y;
        const sourceAvatar = layout.rowAvatars[slotIndex];
        const sourceLevelPill = layout.rowLevelPills[slotIndex];
        const sourceStar = layout.rowStars[slotIndex];
        const avatar: HomeArtPlacement = {
          ...sourceAvatar,
          y: sourceAvatar.y + rowShift,
        };
        const levelPill: HomeArtPlacement = {
          ...sourceLevelPill,
          y: sourceLevelPill.y + rowShift,
        };
        const star: HomeArtPlacement = {
          ...sourceStar,
          y: sourceStar.y + rowShift,
        };
        ctx.drawImage(art.row, sourceRow.x, rowY);
        if (rank <= art.rankMedals.length) {
          const medalTemplate = layout.rowRankMedals[rank - 1];
          ctx.drawImage(
            art.rankMedals[rank - 1],
            medalTemplate.x,
            medalTemplate.y + rowShift,
          );
        } else {
          this.label(
            `${rank}`,
            layout.typography.rowRank.x,
            layout.rowRankCenters[slotIndex] + rowShift,
            layout.typography.rowRank.size,
            "#ffffff",
            "center",
            900,
            "#2a1b11",
            3,
          );
        }
        drawContainedCentered(art.avatars[entry.avatar], avatar);
        ctx.drawImage(art.levelPill, levelPill.x, levelPill.y);
        ctx.drawImage(art.star, star.x, star.y);
        const nameCenter = layout.rowNameCenters[slotIndex] + rowShift;
        this.label(
          entry.name,
          layout.typography.rowTitle.x,
          nameCenter,
          layout.typography.rowTitle.size,
          "#452415",
          "left",
          900,
        );
        this.label(
          `${entry.totalStars}`,
          layout.typography.rowMetric.x,
          layout.rowMetricCenters[slotIndex] + rowShift,
          layout.typography.rowMetric.size,
          "#452415",
          "left",
          900,
        );
      });
      ctx.restore();

      // The green row belongs to the signed-in player. It is deliberately
      // outside the scrolling clip so the player's rank stays fixed exactly
      // above the bottom navigation, as in the supplied reference.
      const playerOffsetY = -this.safeOffsets().bottom / HOME_ARTBOARD_SCALE;
      const offsetPlacement = (placement: HomeArtPlacement): HomeArtPlacement => ({
        ...placement,
        y: placement.y + playerOffsetY,
      });
      const player = snapshot.player;
      const playerRow = offsetPlacement(layout.playerRow);
      const playerAvatar = offsetPlacement(layout.playerAvatar);
      const playerLevelPill = offsetPlacement(layout.playerLevelPill);
      const playerStar = offsetPlacement(layout.playerStar);
      ctx.drawImage(art.playerRow, playerRow.x, playerRow.y);
      this.label(
        `${player.rank}`,
        layout.typography.rowRank.x,
        layout.playerRankCenterY + playerOffsetY,
        layout.typography.rowRank.size,
        "#ffffff",
        "center",
        900,
        "#2a1b11",
        3,
      );
      drawContainedCentered(art.avatars[player.avatar], playerAvatar);
      ctx.drawImage(art.playerLevelPill, playerLevelPill.x, playerLevelPill.y);
      ctx.drawImage(art.star, playerStar.x, playerStar.y);
      this.label(
        player.name,
        layout.typography.rowTitle.x,
        layout.playerNameCenterY + playerOffsetY,
        layout.typography.rowTitle.size,
        "#452415",
        "left",
        900,
      );
      this.label(
        `${player.totalStars}`,
        layout.typography.rowMetric.x,
        layout.playerMetricCenterY + playerOffsetY,
        layout.typography.rowMetric.size,
        "#452415",
        "left",
        900,
      );
    });
    if (drawNavigation) this.drawMainNavigation("leaderboard");
  }

  private collectionAlbumItemTitle(item: CollectionCatalogItem): string {
    if (item.category === "level") {
      return this.save.language === "zh-CN" || this.save.language === "zh-TW"
        ? levelCollectionArtworkTitleZh(item)
        : this.tr("common.levelNumber", { level: item.levelId });
    }
    return this.save.language === "zh-CN" || this.save.language === "zh-TW"
      ? masterpieceCollectionArtworkTitleZh(item)
      : `${this.albumText("number")} ${String(item.catalogNumber).padStart(2, "0")}`;
  }

  private drawCollectionAlbumArtwork(
    item: CollectionCatalogItem,
    rect: Rect,
    state: "full" | "preview" | "locked",
    cardWindow = false,
  ): void {
    const ctx = this.ctx;
    const cellIndex = item.category === "level"
      ? Math.max(0, item.levelId - 1)
      : Math.max(0, item.catalogNumber - 1);
    const atlasIndex = this.collectionAlbumAtlasIndex(item);
    const atlasCellIndex = cellIndex % 25;
    const atlasImage = this.collectionAlbumArtwork?.image(atlasIndex);
    const image = atlasImage;
    ctx.save();
    ctx.beginPath();
    if (cardWindow) {
      // The latest supplied card has a rounded-rectangle picture well.
      traceRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.width * (8 / 159));
    } else {
      traceRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.width * 0.055);
    }
    ctx.clip();
    ctx.fillStyle = item.themeColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    if (!image) {
      ctx.restore();
      this.label(this.tr(this.collectionAlbumItemArtworkFailed(item) ? "page.retryLoad" : "page.loading"),
        rect.x + rect.width / 2, rect.y + rect.height / 2,
        Math.min(18, rect.width * .12), "#ffffff", "center", 900, "#35266e", 2, rect.width - 8);
      return;
    }
    if (image) {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const isAtlas = image === atlasImage;
      const sourceCellWidth = isAtlas ? sourceWidth / 5 : sourceWidth;
      const sourceCellHeight = isAtlas ? sourceHeight / 5 : sourceHeight;
      const sourceColumn = atlasCellIndex % 5;
      const sourceRow = Math.floor(atlasCellIndex / 5);
      // ImageGen atlases have a deliberately narrow separator. Crop just
      // inside it so every card is a clean, independently replaceable scene.
      const gutterX = isAtlas ? Math.max(1, sourceCellWidth * 0.013) : 0;
      const gutterY = isAtlas ? Math.max(1, sourceCellHeight * 0.013) : 0;
      let sourceX = isAtlas ? sourceColumn * sourceCellWidth + gutterX : 0;
      let sourceY = isAtlas ? sourceRow * sourceCellHeight + gutterY : 0;
      let sourceCropWidth = isAtlas ? sourceCellWidth - gutterX * 2 : sourceWidth;
      let sourceCropHeight = isAtlas ? sourceCellHeight - gutterY * 2 : sourceHeight;
      const destinationRatio = rect.width / Math.max(1, rect.height);
      const sourceRatio = sourceCropWidth / Math.max(1, sourceCropHeight);
      if (sourceRatio > destinationRatio) {
        const nextWidth = sourceCropHeight * destinationRatio;
        sourceX += (sourceCropWidth - nextWidth) / 2;
        sourceCropWidth = nextWidth;
      } else {
        const nextHeight = sourceCropWidth / destinationRatio;
        const variation = isAtlas ? 0.5 : 0.3 + (atlasCellIndex % 5) * 0.1;
        sourceY += Math.max(0, sourceCropHeight - nextHeight) * variation;
        sourceCropHeight = nextHeight;
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceCropWidth,
        sourceCropHeight,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
      );
      ctx.globalAlpha = 1;
    }

    if (state === "locked" && this.collectionAlbumArt) {
      // The official mask already contains its authored opacity.
      ctx.drawImage(this.collectionAlbumArt.suppliedMask, rect.x, rect.y, rect.width, rect.height);
    }
    ctx.restore();
  }


  private drawCollectionImageContained(image: HTMLImageElement, rect: Rect): void {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(rect.width / width, rect.height / height);
    this.ctx.drawImage(image, rect.x + (rect.width - width * scale) / 2,
      rect.y + (rect.height - height * scale) / 2, width * scale, height * scale);
  }

  private drawCollectionAlbumCard(item: CollectionCatalogItem, rect: Rect): void {
    const ctx = this.ctx;
    const art = this.collectionAlbumArt;
    if (!art) return;
    const level = item.category === "level" ? this.collectionAlbumLevelProgress(item) : undefined;
    const masterpiece = item.category === "masterpiece" ? this.collectionAlbumMasterpieceProgress(item) : undefined;
    const collected = level?.obtained === true || masterpiece?.restored === true;
    const preview = masterpiece?.blueprintUnlocked === true && !masterpiece.restored;
    const scale = rect.width / COLLECTION_ALBUM_ART_LAYOUT.card.width;
    const textScale = scale / COLLECTION_ALBUM_ART_LAYOUT.card.displayScale;
    const localRect = (local: Rect): Rect => ({
      x: rect.x + local.x * scale, y: rect.y + local.y * scale,
      width: local.width * scale, height: local.height * scale,
    });
    const frame = item.category === "level"
      ? {
        gray: art.suppliedCardGray,
        blue: art.suppliedCardBlue,
        purple: art.suppliedCardPurple,
        gold: art.suppliedCardGold,
      }[collectionAlbumLevelFrame(level?.obtained === true, level?.frameStars ?? 0)]
      : collected ? art.suppliedCardPurple : preview ? art.suppliedCardBlue : art.suppliedCardGray;
    this.drawCollectionImageContained(frame, rect);
    const artwork = localRect(COLLECTION_ALBUM_ART_LAYOUT.cardArtwork);
    this.drawCollectionAlbumArtwork(item, artwork, collected ? "full" : preview ? "preview" : "locked", true);
    if (!collected && !preview && this.collectionAlbumArtwork?.image(this.collectionAlbumAtlasIndex(item))) {
      const lock = localRect(COLLECTION_ALBUM_ART_LAYOUT.cardLock);
      ctx.drawImage(art.suppliedLock, lock.x, lock.y, lock.width, lock.height);
    }
    // Keep the card-level notification in step with the collection entry
    // notification: a blueprint is actionable once it is unlocked, still
    // unrestored, and the current inspiration balance can pay for it.
    if (item.category === "masterpiece"
      && preview
      && item.inspirationCost <= this.save.collectionProgress.inspiration) {
      this.drawDiscoveryBadge({
        x: rect.x + rect.width - NOTIFICATION_DOT_RIGHT_INSET * scale,
        y: rect.y + NOTIFICATION_DOT_TOP_OFFSET * scale,
        width: NOTIFICATION_DOT_SIZE * scale,
        height: NOTIFICATION_DOT_SIZE * scale,
      });
    }
    if (level?.obtained) {
      const stars = COLLECTION_ALBUM_ART_LAYOUT.cardStars;
      for (let index = 0; index < stars.count; index += 1) {
        this.drawCollectionImageContained(index < level.frameStars ? art.starFilled : art.starEmpty,
          localRect({ x: stars.x + index * stars.step, y: stars.y, width: stars.width, height: stars.height }));
      }
    } else {
      const label = localRect(COLLECTION_ALBUM_ART_LAYOUT.cardLabel);
      const stateText = collected ? this.albumText("collected")
        : preview ? this.albumText("needsRestoration")
          : this.albumText("cardUnlockAfterLevel", { level: item.unlockLevel });
      this.label(stateText, label.x + label.width / 2, label.y + label.height / 2,
        COLLECTION_ALBUM_TYPOGRAPHY.cardLabel * textScale, "#ffffff", "center", 950,
        "#794836", 2.5 * scale, label.width);
    }
    if (this.collectionAlbumItemUnseen(item)) {
      const badge = { x: rect.x + rect.width - 52 * scale, y: rect.y + 6 * scale, width: 50 * scale, height: 22 * scale };
      ctx.drawImage(art.newBadge, 11, 5, 50, 18, badge.x, badge.y, badge.width, badge.height);
      this.label(this.albumText("new"), badge.x + badge.width / 2, badge.y + badge.height / 2,
        12 * scale, "#ffffff", "center", 950, "#a2182e", scale, badge.width - 4 * scale);
    }
  }

  private drawCollectionAlbumDetail(layout: CollectionAlbumLayout, item: CollectionCatalogItem): void {
    const ctx = this.ctx;
    const art = this.collectionAlbumArt;
    if (!art) return;
    const detail = layout.detail;
    const scale = layout.artTransform.scale;
    ctx.save();
    ctx.fillStyle = "rgba(10, 7, 34, .66)";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.drawImage(art.detailPanel, detail.panel.x, detail.panel.y, detail.panel.width, detail.panel.height);
    ctx.restore();
    this.label(this.collectionAlbumItemTitle(item),
      detail.title.x + detail.title.width / 2, detail.title.y + detail.title.height / 2,
      COLLECTION_ALBUM_TYPOGRAPHY.detailTitle * scale, "#4e2bcc", "center", 950,
      undefined, 0, detail.title.width);
    this.drawPressable("collectionAlbumDetailClose", detail.close.visual, () => {
      const close = detail.close.visual;
      ctx.drawImage(art.detailClose, close.x, close.y, close.width, close.height);
    });

    const level = item.category === "level" ? this.collectionAlbumLevelProgress(item) : undefined;
    const masterpiece = item.category === "masterpiece" ? this.collectionAlbumMasterpieceProgress(item) : undefined;
    // The detail reference previews the full picture even before unlocking;
    // its caption and action, not a second lock overlay, express ownership.
    this.drawCollectionAlbumArtwork(item, detail.artwork, "full");
    const centerX = detail.body.x + detail.body.width / 2;
    const bodyFont = COLLECTION_ALBUM_TYPOGRAPHY.detailBody * scale;
    let enabled = false;
    let actionText = "";
    if (item.category === "level") {
      const condition = level?.obtained
        ? this.albumText("bestStars")
        : this.albumText("unlockAfterLevel", { level: item.unlockLevel });
      this.label(condition, centerX, detail.body.y + (level?.obtained ? 30 : 70) * scale, bodyFont,
        "#4e2bcc", "center", 950, undefined, 0, detail.body.width);
      if (level?.obtained) {
        for (let index = 0; index < 3; index += 1) {
          this.drawCollectionImageContained(index < level.frameStars ? art.starFilled : art.starEmpty, {
            x: centerX + (index * 50 - 69) * scale, y: detail.body.y + 56 * scale,
            width: 38 * scale, height: 38 * scale,
          });
        }
      }
      enabled = level?.obtained === true;
      actionText = this.albumText("replayLevel");
    } else {
      this.label(`${this.albumText("artist")}：${item.defaultArtistZh}`,
        centerX, detail.body.y + 3 * scale, 23 * scale, "#6a538d", "center", 850,
        undefined, 0, detail.body.width);
      this.label(`${this.albumText("era")}：${item.defaultEraZh}`,
        centerX, detail.body.y + 36 * scale, 21 * scale, "#6a538d", "center", 850,
        undefined, 0, detail.body.width);
      const condition = masterpiece?.restored ? this.albumText("collected")
        : masterpiece?.blueprintUnlocked ? ""
          : this.albumText("unlockAfterLevel", { level: item.unlockLevel });
      if (condition) {
        this.label(condition, centerX, detail.body.y + 83 * scale, bodyFont,
          "#4e2bcc", "center", 950, undefined, 0, detail.body.width);
      }
      enabled = this.collectionAlbumDetailActionVisible() && this.save.collectionProgress.inspiration >= item.inspirationCost;
      actionText = this.albumText("restoreAction");
    }
    if (this.collectionAlbumFeedback) {
      this.label(this.collectionAlbumFeedback.text, centerX, detail.body.y + 127 * scale,
        21 * scale, this.collectionAlbumFeedback.color, "center", 900, undefined, 0, detail.body.width);
    }
    if (this.collectionAlbumDetailActionVisible()) {
      this.drawPressable("collectionAlbumDetailPrimary", detail.primaryAction.visual, () => {
        const button = detail.primaryAction.visual;
        ctx.save();
        ctx.globalAlpha = enabled ? 1 : .6;
        this.drawCollectionImageContained(art.suppliedTabBlue, button);
        if (item.category === "masterpiece") {
          this.drawCollectionImageContained(art.inspiration, detail.restorationIcon);
          const cost = detail.restorationCost;
          this.label(String(item.inspirationCost), cost.x + cost.width / 2, cost.y + cost.height / 2,
            30 * scale, "#254783", "center", 950, undefined, 0, cost.width - 8 * scale);
          const caption = detail.restorationLabel;
          this.label(actionText, caption.x + caption.width / 2, caption.y + caption.height / 2,
            COLLECTION_ALBUM_TYPOGRAPHY.detailAction * scale, "#ffffff", "center", 950,
            "#254783", 2 * scale, caption.width - 8 * scale);
        }
        ctx.restore();
        if (item.category === "level") {
          this.label(actionText, button.x + button.width / 2, button.y + button.height / 2,
            COLLECTION_ALBUM_TYPOGRAPHY.detailAction * scale, "#ffffff", "center", 950,
            "#254783", 2 * scale, button.width - 20 * scale);
        }
      });
    }
  }

  private drawCollectionPage(drawNavigation = true): void {
    this.ctx.fillStyle = "#35266e";
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.drawCollectionAlbum();
    if (drawNavigation) this.drawMainNavigation("records");
    const detailItem = this.collectionAlbumDetailId ? findCollectionCatalogItem(this.collectionAlbumDetailId) : undefined;
    if (detailItem) this.drawCollectionAlbumDetail(this.collectionAlbumLayout(), detailItem);
  }

  private drawMechanismGuide(): void {
    const ctx = this.ctx;
    const layout = this.mechanismGuideLayout();
    this.drawDim(0.74, "#130c29");
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    this.drawRecords(false);
    ctx.restore();
    this.drawPressable("mechanismGuideClose", layout.close.visual, () => {
      const art = this.formalPageArtFor("records");
      const close = art?.screen === "records" ? art.close : this.collectionAlbumArt?.detailClose ?? this.art.pauseSettings?.close;
      if (close) this.drawCollectionImageContained(close, layout.close.visual);
    });
  }

  private drawCollectionAlbum(): void {
    const ctx = this.ctx;
    const layout = this.collectionAlbumLayout();
    const art = this.collectionAlbumArt;
    if (this.collectionAlbumVisible()) this.requestCollectionAlbumArtwork();

    if (!art) {
      if (!this.collectionAlbumArtLoading && !this.collectionAlbumArtError) {
        this.requestCollectionAlbumArt();
      }
      const statusPanel = {
        x: layout.panel.x + Math.max(24, layout.panel.width * 0.12),
        y: layout.panel.y + layout.panel.height / 2 - 118,
        width: layout.panel.width - Math.max(48, layout.panel.width * 0.24),
        height: 236,
      };
      this.drawChromePanel(statusPanel.x, statusPanel.y, statusPanel.width, statusPanel.height, 34);
      const entry = this.art.homeUi?.collectionAlbumEntry;
      if (entry) {
        const iconSize = 72;
        ctx.drawImage(
          entry,
          statusPanel.x + (statusPanel.width - iconSize) / 2,
          statusPanel.y + 30,
          iconSize,
          iconSize,
        );
      }
      this.label(
        this.collectionAlbumArtError ? this.tr("page.loadFailed") : this.tr("page.loading"),
        statusPanel.x + statusPanel.width / 2,
        statusPanel.y + 128,
        20,
        "#fff4c7",
        "center",
        950,
        "#4f218f",
        3,
        statusPanel.width - 38,
      );
      if (this.collectionAlbumArtError) {
        const retry = this.collectionAlbumRetryRect(layout);
        this.drawPressable("collectionAlbumRetry", retry, () => {
          this.drawChromePanel(retry.x, retry.y, retry.width, retry.height, 22, false);
          this.label(this.tr("page.retryLoad"), retry.x + retry.width / 2, retry.y + retry.height / 2, 18, "#fff4c7", "center", 1000, "#4f218f", 3, retry.width - 24);
        });
      }
      return;
    }

    const items = this.collectionAlbumItems();
    const summary = this.collectionAlbumProgressSummary();
    const categoryProgress = this.collectionAlbumTab === "levels"
      ? { owned: summary.obtainedLevelCardCount, total: summary.levelCards.length }
      : { owned: summary.restoredMasterpieceCount, total: summary.masterpieces.length };

    const scale = layout.artTransform.scale;
    this.drawFormalPageReference(art.background, () => {
      ctx.drawImage(art.topHeader, FORMAL_COLLECTION_LAYOUT.topHeader.x, FORMAL_COLLECTION_LAYOUT.topHeader.y);
      // The album title uses the fixed formal-page header anchor shared by
      // Journey and Leaderboard. FORMAL_COLLECTION_LAYOUT.titlePanel belongs
      // to the legacy mechanism-guide modal and would place this background
      // below the visible "收藏" heading.
      ctx.drawImage(art.titlePanel, COLLECTION_ALBUM_ART_LAYOUT.title.x, COLLECTION_ALBUM_ART_LAYOUT.title.y);
      this.label(this.albumText("entry"), 360, 132, 48, "#ffe235", "center", 950, "#623d16", 3, 302);
    });

    const drawTab = (key: string, rect: Rect, text: string, selected: boolean, notification = false): void => {
      this.drawPressable(key, rect, () => {
        this.drawCollectionImageContained(selected ? art.suppliedTabPurple : art.suppliedTabBlue, rect);
        this.label(text, rect.x + rect.width / 2, rect.y + rect.height / 2,
          COLLECTION_ALBUM_TYPOGRAPHY.tab * scale, "#ffffff", "center", 950,
          "#253762", 3 * scale, rect.width - 24 * scale);
        if (selected) {
          ctx.fillStyle = "#fff0aa";
          ctx.beginPath();
          ctx.arc(rect.x + rect.width / 2, rect.y + rect.height - 8 * scale, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        if (notification) {
          this.drawDiscoveryBadge({
            x: rect.x + rect.width - NOTIFICATION_DOT_RIGHT_INSET * scale,
            y: rect.y - NOTIFICATION_DOT_SIZE * scale / 4,
            width: NOTIFICATION_DOT_SIZE * scale,
            height: NOTIFICATION_DOT_SIZE * scale,
          });
        }
      });
    };
    drawTab("collectionAlbumTab.masterpieces", layout.tabs.masterpieces.visual,
      this.albumText("masterpieceCollection"), this.collectionAlbumTab === "masterpieces",
      this.collectionAlbumHasRestorableMasterpiece(summary));
    drawTab("collectionAlbumTab.levels", layout.tabs.levels.visual,
      this.albumText("levelCollection"), this.collectionAlbumTab === "levels");

    const progress = layout.progress;
    ctx.drawImage(art.suppliedProgressPanel, progress.x, progress.y, progress.width, progress.height);
    ctx.drawImage(art.suppliedProgressIcon, progress.icon.x, progress.icon.y, progress.icon.width, progress.icon.height);
    this.label(this.albumText("collectionProgress", categoryProgress),
      progress.text.x + progress.text.width / 2, progress.text.y + progress.text.height / 2,
      COLLECTION_ALBUM_TYPOGRAPHY.progress * scale, "#ffffff", "center", 950,
      undefined, 0, progress.text.width);
    if (this.collectionAlbumTab === "masterpieces") {
      const balance = progress.inspiration;
      ctx.drawImage(art.suppliedProgressPanel, balance.x, balance.y, balance.width, balance.height);
      this.drawCollectionImageContained(art.inspiration, progress.inspirationIcon);
      const balanceText = progress.inspirationText;
      this.label(this.albumText("inspirationBalance", { amount: this.save.collectionProgress.inspiration }),
        balanceText.x + balanceText.width / 2, balanceText.y + balanceText.height / 2,
        COLLECTION_ALBUM_TYPOGRAPHY.inspiration * scale, "#ffffff", "center", 950,
        // Leave ink-bearing room for long localized labels at the width cap.
        undefined, 0, balanceText.width - 8 * scale);
    }
    for (const card of layout.cards) {
      if (!card.active) continue;
      const item = items[card.itemIndex];
      if (!item) continue;
      this.drawPressable(`collectionAlbumCard.${item.id}`, card.visual, () => {
        this.drawCollectionAlbumCard(item, card.visual);
      });
    }
    const drawPageButton = (key: string, control: typeof layout.pagination.previous, image: HTMLImageElement): void => {
      const rect = control.visual;
      this.drawPressable(key, rect, () => {
        ctx.save();
        ctx.globalAlpha = control.enabled ? 1 : .42;
        this.drawCollectionImageContained(image, rect);
        ctx.restore();
      });
    };
    drawPageButton("collectionAlbumPrevious", layout.pagination.previous, art.pagePrevious);
    drawPageButton("collectionAlbumNext", layout.pagination.next, art.pageNext);
    this.drawCollectionImageContained(art.pageIndicator, layout.pagination.indicator);
    this.label(`${layout.pagination.pageNumber}/${layout.pagination.pageCount}`,
      layout.pagination.indicator.x + layout.pagination.indicator.width / 2,
      layout.pagination.indicator.y + layout.pagination.indicator.height / 2,
      COLLECTION_ALBUM_TYPOGRAPHY.pagination * scale, "#ffffff", "center", 950, "#594883", scale,
      layout.pagination.indicator.width - 20 * scale);

    this.drawPressable("collectionAlbumGuide", layout.guide.visual, () => {
      const guide = layout.guide.visual;
      this.drawCollectionImageContained(art.guideBook, {
        x: guide.x, y: guide.y, width: guide.width, height: guide.height - 22 * scale,
      });
      this.label(this.albumText("gameplayGuide"), guide.x + guide.width / 2,
        guide.y + guide.height - 10 * scale, 24 * scale,
        "#ffffff", "center", 950, "#794836", 2 * scale, guide.width);
    });

    if (this.pendingCollectionDiscoveryItems().length > 0) {
      const guide = layout.guide.visual;
      this.drawDiscoveryBadge({ x: guide.x + guide.width - 24 * scale, y: guide.y, width: 24 * scale, height: 24 * scale });
    }
  }

  private drawDailyTasks(): void {
    const chrome = this.art.pauseSettings;
    if (!chrome) return;
    const ctx = this.ctx;
    const summary = this.dailyTaskSummary();
    const layout = DAILY_TASK_LAYOUT;
    const typography = layout.typography;
    this.drawDim(layout.overlay.alpha, layout.overlay.color);
    this.withHomeArtboard(() => {
      const art = this.dailyTaskArt;
      ctx.drawImage(art?.panel ?? chrome.panel, layout.panel.x, layout.panel.y);
      this.label(this.dailyText("title"), layout.title.x, layout.title.y,
        layout.title.size, "#ffffff", "center", 950, "#7852cb", 2, layout.title.maxWidth);

      if (!art) {
        this.label(
          this.dailyTaskArtError ? this.tr("page.loadFailed") : this.tr("page.loading"),
          360, 660, 26, "#88584d", "center", 850, undefined, 0, 420,
        );
        if (this.dailyTaskArtError) {
          const retry = { x: 226, y: 680, width: 268, height: 82 };
          this.drawPressable("dailyTaskRetry", retry, () => {
            this.drawButtonChrome(retry, 0, false);
            this.label(this.tr("page.retryLoad"), 360, 722, 25, "#ffffff", "center", 950, "#176e21", 3, 220);
          });
        }
        this.drawPressable("dailyTaskClose", layout.close, () => {
          ctx.drawImage(chrome.close, layout.close.x, layout.close.y);
        });
        return;
      }

      // The supplied PNGs contain their own outlines, highlights and shadows.
      // Keep them at authored size; only the progress fill is clipped.
      ctx.drawImage(art.summaryPanel, layout.summary.x, layout.summary.y);
      ctx.drawImage(art.calendar, layout.summaryIcon.x, layout.summaryIcon.y);
      this.label(
        this.dailyText("summary", { completed: summary.completedCount, total: summary.tasks.length }),
        layout.summaryText.x,
        layout.summaryText.y + layout.summaryText.height / 2,
        typography.summary, "#ffffff", "left", 950, "#6052cd", 2, layout.summaryText.width,
      );

      const drawProgress = (rect: Rect, progress: number, text: string): void => {
        ctx.drawImage(art.progressTrack, rect.x, rect.y);
        const clamped = Math.max(0, Math.min(1, progress));
        if (clamped > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(rect.x + 4, rect.y + 4, art.progressFill.width * clamped, art.progressFill.height);
          ctx.clip();
          ctx.drawImage(art.progressFill, rect.x + 4, rect.y + 4);
          ctx.restore();
        }
        this.label(text, rect.x + rect.width / 2, rect.y + rect.height / 2,
          typography.progress, "#ffffff", "center", 900, "#6b5046", 2, rect.width - 12);
      };

      const rows = dailyTaskRows(summary.tasks.map((task) => task.id));
      summary.tasks.forEach((task, index) => {
        const row = rows[index];
        if (!row) return;
        ctx.drawImage(art.taskRow, row.row.x, row.row.y);
        const taskIcon = task.icon === "booster" ? art.taskBooster
          : task.icon === "shield" ? art.taskShield
            : task.icon === "flag" ? art.calendar : art.taskTrophy;
        ctx.drawImage(taskIcon, row.icon.x, row.icon.y);
        this.label(
          this.dailyText(`task.${task.id}.title`),
          row.title.x, row.title.y + row.title.height / 2,
          typography.taskTitle, "#89574b", "left", 950, undefined, 0, row.title.width,
        );
        this.label(
          this.dailyText(`task.${task.id}.description`, { target: task.target }),
          row.description.x, row.description.y + row.description.height / 2,
          typography.description, "#89574b", "left", 850, undefined, 0, row.description.width,
        );
        drawProgress(row.progress, task.target > 0 ? task.progress / task.target : 0,
          `${task.progress}/${task.target}`);
        const rewardBadge = {
          x: row.reward.x + 13,
          y: row.reward.y + 4,
          width: 96,
          height: 23,
        };
        ctx.save();
        ctx.fillStyle = "#79b9e4";
        ctx.strokeStyle = "#4b8fbe";
        ctx.lineWidth = 2;
        ctx.beginPath();
        traceRoundedRect(ctx, rewardBadge.x, rewardBadge.y, rewardBadge.width, rewardBadge.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this.drawSystemIcon(0, rewardBadge.x + 3, rewardBadge.y + rewardBadge.height / 2, 31);
        this.label(
          this.dailyText("reward", { amount: task.rewardCoins }),
          rewardBadge.x + 52, rewardBadge.y + rewardBadge.height / 2,
          16, "#ffffff", "center", 950, "#4b7d9f", 1, 58,
        );
        this.drawPressable(`dailyTaskClaim.${task.id}`, row.claim, () => {
          const button = task.completed ? art.buttonYellow : art.buttonGreen;
          ctx.drawImage(button, row.claim.x, row.claim.y);
          const text = task.claimed ? this.dailyText("claimed")
            : task.claimable ? this.dailyText("claim") : this.dailyText("incomplete");
          this.label(text, row.claim.x + row.claim.width / 2, row.claim.y + row.claim.height / 2,
            typography.button, "#ffffff", "center", 950,
            task.completed ? "#d19222" : "#398e18", 2, row.claim.width - 18);
        });
      });

      ctx.drawImage(art.bonusPanel, layout.bonus.x, layout.bonus.y);
      ctx.drawImage(art.chest, layout.bonusChest.x, layout.bonusChest.y);
      this.label(this.dailyText("bonusTitle"), layout.bonusTitle.x,
        layout.bonusTitle.y + layout.bonusTitle.height / 2,
        typography.bonusTitle, "#89574b", "left", 950, undefined, 0, layout.bonusTitle.width);
      drawProgress(layout.bonusTrack, summary.tasks.length ? summary.completedCount / summary.tasks.length : 0,
        `${summary.completedCount}/${summary.tasks.length}`);
      if (!summary.bonusClaimed) {
        const inspirationReward = layout.bonusReward;
        ctx.save();
        ctx.fillStyle = "#79b9e4";
        ctx.strokeStyle = "#4b8fbe";
        ctx.lineWidth = 2;
        ctx.beginPath();
        traceRoundedRect(ctx, inspirationReward.x, inspirationReward.y, inspirationReward.width, inspirationReward.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (this.dailyTaskInspirationArt) {
          ctx.drawImage(this.dailyTaskInspirationArt, inspirationReward.x + 1, inspirationReward.y + 1, 29, 29);
        } else {
          this.drawSystemIcon(0, inspirationReward.x + 17, inspirationReward.y + inspirationReward.height / 2, 25);
        }
        this.label(
          this.dailyText("reward", { amount: summary.bonusRewardInspiration }),
          inspirationReward.x + 50, inspirationReward.y + inspirationReward.height / 2,
          15, "#ffffff", "center", 950, "#4b7d9f", 1, 42,
        );
        this.drawPressable("dailyTaskBonus", layout.bonusClaim, () => {
          const button = summary.bonusClaimable ? art.buttonGreen : art.buttonGrey;
          ctx.drawImage(button, layout.bonusClaim.x, layout.bonusClaim.y);
          const text = this.dailyText("bonusOpen");
          this.label(text, layout.bonusClaim.x + layout.bonusClaim.width / 2,
            layout.bonusClaim.y + layout.bonusClaim.height / 2,
            typography.button, "#ffffff", "center", 950, "#957156", 2, layout.bonusClaim.width - 18);
        });
      } else {
        const resetText = this.dailyTaskFeedback?.text
          ?? this.dailyText("resetsIn", { time: this.dailyTaskResetCountdown() });
        this.label(resetText, layout.reset.x + layout.reset.width / 2,
          layout.reset.y + layout.reset.height / 2,
          typography.reset, this.dailyTaskFeedback?.color ?? "#89574b",
          "center", 900, undefined, 0, layout.reset.width);
      }
      if (!summary.bonusClaimed && this.dailyTaskFeedback) {
        this.label(this.dailyTaskFeedback.text, layout.reset.x + layout.reset.width / 2,
          layout.reset.y + layout.reset.height / 2, typography.reset,
          this.dailyTaskFeedback.color, "center", 900, undefined, 0, layout.reset.width);
      }
      this.drawPressable("dailyTaskClose", layout.close, () => {
        ctx.drawImage(art.close, layout.close.x, layout.close.y);
      });
    });
  }

  private drawAchievements(): void {
    const chrome = this.art.pauseSettings;
    if (!chrome) return;
    const ctx = this.ctx;
    const layout = ACHIEVEMENT_LAYOUT;
    const typography = layout.typography;
    const art = this.achievementArt;
    const summary = buildAchievementProgressSummary(this.save, this.save.achievementProgress);
    const entries = sortAchievementEntries(summary.entries);
    this.achievementScrollOffset = Math.max(
      0,
      Math.min(achievementScrollMaximum(entries.length), this.achievementScrollOffset),
    );
    this.drawDim(layout.overlay.alpha, layout.overlay.color);
    this.withHomeArtboard(() => {
      ctx.drawImage(art?.panel ?? chrome.panel, layout.panel.x, layout.panel.y);
      this.label(this.tr("achievement.title"), layout.title.x, layout.title.y,
        layout.title.size, "#ffffff", "center", 950, "#7852cb", 2, 330);
      if (!art) {
        this.label(this.achievementArtError ? this.tr("page.loadFailed") : this.tr("page.loading"),
          360, 660, 26, "#88584d", "center", 850, undefined, 0, 420);
        if (this.achievementArtError) {
          this.drawPressable("achievementRetry", layout.retry, () => {
            this.drawButtonChrome(layout.retry, 0, false);
            this.label(this.tr("page.retryLoad"), 360, 722, 25, "#ffffff", "center", 950, "#176e21", 3, 220);
          });
        }
        this.drawPressable("achievementClose", layout.close, () => {
          ctx.drawImage(chrome.close, layout.close.x, layout.close.y);
        });
        return;
      }

      // Supplied cutouts are drawn at native size. Progress fill is clipped,
      // not stretched; the annotated reference is never a runtime texture.
      ctx.drawImage(art.summaryPanel, layout.summary.x, layout.summary.y);
      this.label(
        `${this.tr("achievement.progress")} ${summary.completedAchievementCount}/${summary.entries.length}`,
        layout.summary.x + layout.summary.width / 2, layout.summary.y + layout.summary.height / 2,
        typography.summary, "#ffffff", "center", 950, "#6552cb", 2, layout.summary.width - 30,
      );

      const viewport = layout.viewport;
      ctx.save();
      ctx.beginPath();
      ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
      ctx.clip();
      entries.forEach((entry, index) => {
        const row = achievementRowPlacement(index, this.achievementScrollOffset);
        const background = achievementRowBackgroundPlacement(index, this.achievementScrollOffset, entry.claimable);
        if (background.y + background.height <= viewport.y || background.y >= viewport.y + viewport.height) return;
        const badge = achievementBadgePlacement(index, this.achievementScrollOffset);
        const claim = achievementClaimPlacement(index, this.achievementScrollOffset);
        const progress = entry.target > 0 ? Math.min(1, entry.progress / entry.target) : 0;
        // Each supplied plate already contains its outline and drop shadow.
        ctx.drawImage(entry.claimable ? art.rowActive : art.rowInactive, background.x, background.y);

        ctx.drawImage(entry.completed ? art.medalActive : art.medalInactive, badge.x, badge.y);
        const categoryName = this.tr(`achievement.${entry.category}.name` as TranslationKey);
        const description = this.tr(
          `achievement.${entry.category}.description` as TranslationKey, { target: entry.target },
        );
        this.label(`${categoryName} ${ACHIEVEMENT_TIER_LABELS[entry.tier]}`,
          row.x + 110, row.y + 21, typography.name, "#88564b", "left", 950, undefined, 0, 232);
        this.label(description, row.x + 110, row.y + 48,
          typography.description, "#88564b", "left", 800, undefined, 0, 232);

        const barX = layout.progress.x;
        const barY = row.y + layout.progress.y - layout.row.y;
        ctx.drawImage(art.progressTrack, barX, barY);
        if (progress > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(barX + 3, barY + 3, 223 * progress, 15);
          ctx.clip();
          ctx.drawImage(entry.completed ? art.progressFillGreen : art.progressFillBlue, barX + 3, barY + 3);
          ctx.restore();
        }
        this.label(`${entry.progress}/${entry.target}`, barX + layout.progress.width / 2,
          barY + layout.progress.height / 2, typography.progress, "#ffffff", "center", 950, "#705c52", 2);

        const reward = { ...layout.reward, y: layout.reward.y + index * layout.rowPitch - this.achievementScrollOffset };
        ctx.save();
        ctx.fillStyle = "#79b9e4";
        ctx.strokeStyle = "#4b8fbe";
        ctx.lineWidth = 2;
        ctx.beginPath();
        traceRoundedRect(ctx, reward.x, reward.y, reward.width, reward.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this.drawSystemIcon(0, reward.x + 15, reward.y + reward.height / 2, 26);
        this.label(
          `+${entry.rewardCoins}`,
          reward.x + 57, reward.y + reward.height / 2,
          14, "#ffffff", "center", 950, "#4b7d9f", 1, 48,
        );

        this.drawPressable(`achievementClaim.${entry.id}`, claim, () => {
          ctx.drawImage(entry.claimable ? art.buttonGreen : art.buttonGrey, claim.x, claim.y);
          this.label(
            entry.claimed ? this.tr("achievement.claimed")
              : entry.claimable ? this.tr("achievement.claim") : this.tr("achievement.locked"),
            claim.x + claim.width / 2, claim.y + claim.height / 2,
            typography.button, "#ffffff", "center", 950, entry.claimable ? "#3d8e18" : "#807970",
            1.5, claim.width - 16,
          );
        });
      });
      ctx.restore();

      const maxScroll = achievementScrollMaximum(entries.length);
      if (maxScroll > 0) {
        const thumbHeight = Math.max(54, viewport.height * viewport.height / (viewport.height + maxScroll));
        const thumbY = viewport.y + (this.achievementScrollOffset / maxScroll) * (viewport.height - thumbHeight);
        ctx.save();
        ctx.fillStyle = "rgba(107, 84, 212, .35)";
        ctx.beginPath();
        traceRoundedRect(ctx, 620, thumbY, 4, thumbHeight, 2);
        ctx.fill();
        ctx.restore();
      }

      this.drawPressable("achievementClose", layout.close, () => {
        ctx.drawImage(art.close, layout.close.x, layout.close.y);
      });
    });
  }

  private drawSettings(): void {
    const art = this.art.pauseSettings;
    if (!art) return;
    const ctx = this.ctx;
    this.drawDim(PAUSE_SETTINGS_LAYOUT.overlay.alpha, PAUSE_SETTINGS_LAYOUT.overlay.color);
    this.withHomeArtboard(() => {
      ctx.drawImage(art.panel, PAUSE_SETTINGS_LAYOUT.panel.x, PAUSE_SETTINGS_LAYOUT.panel.y);
      const titleText = PAUSE_SETTINGS_LAYOUT.typography.title;
      this.label(
        this.tr("settings.title"),
        titleText.x,
        titleText.settingsY,
        titleText.size,
        titleText.fill,
        "center",
        850,
        titleText.stroke,
        titleText.lineWidth,
        330,
      );
      this.drawPauseSettingsRows("settings", art);
      this.drawPressable("settingsLanguage", PAUSE_SETTINGS_LAYOUT.languageButton, () => {
        ctx.drawImage(
          art.replayButton,
          PAUSE_SETTINGS_LAYOUT.languageButton.x,
          PAUSE_SETTINGS_LAYOUT.languageButton.y,
        );
        this.label(
          this.tr("settings.language"),
          PAUSE_SETTINGS_LAYOUT.typography.action.pauseX[0],
          PAUSE_SETTINGS_LAYOUT.typography.action.y,
          30,
          "#fffdf5",
          "center",
          900,
          "#a85b10",
          3,
          PAUSE_SETTINGS_LAYOUT.languageButton.width - 30,
        );
      });
      this.drawPressable("settingsReset", PAUSE_SETTINGS_LAYOUT.settingsClearButton, () => {
        this.drawNineSlice(
          art.clearProgressButton,
          PAUSE_SETTINGS_LAYOUT.settingsClearButton.x,
          PAUSE_SETTINGS_LAYOUT.settingsClearButton.y,
          PAUSE_SETTINGS_LAYOUT.settingsClearButton.width,
          PAUSE_SETTINGS_LAYOUT.settingsClearButton.height,
          38,
          38,
        );
        this.label(
          this.tr("settings.clearProgress"),
          PAUSE_SETTINGS_LAYOUT.typography.action.pauseX[1],
          PAUSE_SETTINGS_LAYOUT.typography.action.y,
          26,
          "#fffdf5",
          "center",
          900,
          "#83161b",
          3,
          PAUSE_SETTINGS_LAYOUT.settingsClearButton.width - 28,
        );
      });
      this.drawPressable("menuBack", PAUSE_SETTINGS_LAYOUT.close, () => {
        ctx.drawImage(art.close, PAUSE_SETTINGS_LAYOUT.close.x, PAUSE_SETTINGS_LAYOUT.close.y);
      });
    });
  }

  private musicLibraryRowRect(index: number): Rect {
    return homeArtRect(musicPreviewRect({
      x: 52,
      y: 690 + index * 186 - this.musicLibraryScrollOffset / MUSIC_PREVIEW_SCALE_Y,
      width: 836,
      height: 178,
    }));
  }

  private musicLibraryUnlockLevel(entry: MusicCatalogEntry, index: number): number {
    // The first four library cards follow the supplied reference contract.
    // Audio scene defaults remain catalog-driven; only the player-facing
    // library gates use these illustrated milestone labels.
    return [1, 15, 30, 45][index] ?? entry.unlockLevel;
  }

  private musicLibraryMaxScrollOffset(): number {
    return Math.max(0, (MUSIC_CATALOG.length - 4) * 186 * MUSIC_PREVIEW_SCALE_Y);
  }

  private selectMusicTrack(track: MusicTrackId): void {
    const entry = musicCatalogEntry(track);
    const entryIndex = MUSIC_CATALOG.findIndex((candidate) => candidate.id === track);
    if (this.save.highestLevel < this.musicLibraryUnlockLevel(entry, entryIndex)) {
      this.playSound("blocked");
      return;
    }
    if (this.save.selectedMusicTrack === track) {
      this.playSound("button");
      return;
    }
    const candidate = this.cloneSave(this.save);
    candidate.selectedMusicTrack = track;
    const outcome = this.persistVerified(candidate);
    if (outcome !== "committed") {
      this.playSound("blocked");
      return;
    }
    this.save = candidate;
    this.syncMusic();
    this.playSound("button");
    this.dirty = true;
    this.scheduleFrame();
  }

  private stepMusicTrack(direction: -1 | 1): void {
    const current = this.save.selectedMusicTrack ?? "menu";
    const currentIndex = Math.max(0, MUSIC_CATALOG.findIndex((entry) => entry.id === current));
    for (let offset = 1; offset <= MUSIC_CATALOG.length; offset += 1) {
      const index = (currentIndex + direction * offset + MUSIC_CATALOG.length) % MUSIC_CATALOG.length;
      const entry = MUSIC_CATALOG[index];
      if (this.save.highestLevel < this.musicLibraryUnlockLevel(entry, index)) continue;
      this.selectMusicTrack(entry.id);
      return;
    }
    this.playSound("blocked");
  }

  private drawMusicLibrary(): void {
    const ctx = this.ctx;
    const art = this.musicLibraryArt;
    // The music screen is a full-page composition.  Drawing it over the home
    // page keeps the navigation state intact, while the reference plate fixes
    // every visual edge (background, title, vinyl, buttons and card geometry)
    // to the supplied design instead of approximating it with a second set of
    // rounded rectangles.
    this.withHomeArtboard(() => {
      if (!art) {
        this.label(
          this.musicLibraryArtError ? "音乐资源加载失败，请重新打开" : "音乐资源加载中…",
          360,
          740,
          25,
          "#fff8e9",
          "center",
          900,
          "#352078",
          3,
          600,
        );
        const fallbackClose = this.art.pauseSettings?.close;
        if (fallbackClose) ctx.drawImage(fallbackClose, 584, 172, 94, 94);
        return;
      }
      if (art.preview) {
        ctx.drawImage(
          art.preview,
          0,
          0,
          HOME_ARTBOARD.width,
          HOME_ARTBOARD.height,
        );
        ctx.save();
        ctx.scale(MUSIC_PREVIEW_SCALE_X, MUSIC_PREVIEW_SCALE_Y);
        const selectedTrack = this.save.selectedMusicTrack ?? "menu";
        const selectedEntry = musicCatalogEntry(selectedTrack);
        const playback = this.host.musicTransport();
        const position = playback.track === selectedTrack ? Math.max(0, playback.positionSeconds) : 0;
        const duration = playback.track === selectedTrack ? Math.max(0, playback.durationSeconds) : selectedEntry.loopEndSeconds;
        const progress = duration > 0 ? Math.min(1, position / duration) : 0;

        // Mask only the dynamic portions of the reference plate.  The plate
        // remains the source for all supplied artwork, including controls.
        ctx.fillStyle = "#4c49c4";
        ctx.beginPath();
        traceRoundedRect(ctx, 425, 292, 455, 245, 18);
        ctx.fill();
        this.label(selectedEntry.title, 445, 358, 41, "#fffdf5", "left", 950, "#352078", 3, 405);
        this.label(selectedEntry.artist, 445, 397, 26, "#d9d4ff", "left", 750, "#352078", 2, 405);
        ctx.strokeStyle = "#51ddf1";
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(445, 449);
        ctx.lineTo(862, 449);
        ctx.stroke();
        ctx.strokeStyle = "#e8fbff";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(445, 449);
        ctx.lineTo(445 + 417 * progress, 449);
        ctx.stroke();
        ctx.fillStyle = "#f3fbff";
        ctx.beginPath();
        ctx.arc(445 + 417 * progress, 449, 16, 0, Math.PI * 2);
        ctx.fill();
        const formatTime = (seconds: number): string => {
          const total = Math.max(0, Math.floor(seconds));
          return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
        };
        this.label(formatTime(position), 445, 487, 22, "#ece8ff", "left", 800);
        this.label(formatTime(duration), 862, 487, 22, "#ece8ff", "right", 800);

        // Status buttons are dynamic, while the card fills and the supplied
        // lock/equalizer artwork remain untouched from the reference image.
        MUSIC_CATALOG.slice(0, 4).forEach((entry, index) => {
          const unlockLevel = this.musicLibraryUnlockLevel(entry, index);
          const unlocked = this.save.highestLevel >= unlockLevel;
          const selected = selectedTrack === entry.id;
          // At the reference state (level 1, menu track selected) the plate
          // already contains the exact supplied status buttons. Do not paint
          // a second approximation over them; only redraw when live state
          // differs from that reference state.
          if (unlocked === (index === 0) && selected === (index === 0)) return;
          const row = { x: 52, y: 690 + index * 186 - this.musicLibraryScrollOffset / MUSIC_PREVIEW_SCALE_Y, width: 836, height: 178 };
          const button = { x: 610, y: row.y + 61, width: 170, height: 70 };
          ctx.fillStyle = unlocked ? (selected ? "#25bb5b" : "#6b5ad4") : "#9698bd";
          ctx.beginPath();
          traceRoundedRect(ctx, button.x, button.y, button.width, button.height, 18);
          ctx.fill();
          this.label(
            unlocked ? (selected ? "已解锁" : "选择") : `第${unlockLevel}关解锁`,
            button.x + button.width / 2,
            button.y + 39,
            23,
            "#ffffff",
            "center",
            900,
            undefined,
            0,
            button.width - 10,
          );
        });
        ctx.restore();
        // The close button is already part of the reference plate. Keep the
        // hit target above it without painting a second scaled copy.
        return;
      }
      const panel = { x: 34, y: 160, width: 652, height: 978 };
      const header = { x: 76, y: 188, width: 570, height: 190 };
      const close = { x: 584, y: 172, width: 94, height: 94 };
      const selectedTrack = this.save.selectedMusicTrack ?? "menu";
      const selectedEntry = musicCatalogEntry(selectedTrack);
      const selectedIndex = Math.max(0, MUSIC_CATALOG.findIndex((entry) => entry.id === selectedEntry.id));
      const album = art.albums[selectedIndex % art.albums.length];

      ctx.save();
      ctx.drawImage(art.panel, panel.x, panel.y, panel.width, panel.height);
      ctx.drawImage(art.header, header.x, header.y, header.width, header.height);
      this.label("背景音乐", 360, 282, 47, "#fff6c2", "center", 950, "#5b219f", 4, 520);
      ctx.fillStyle = "rgba(92, 86, 205, .52)";
      ctx.beginPath();
      traceRoundedRect(ctx, 52, 340, 616, 792, 28);
      ctx.fill();
      ctx.fillStyle = "rgba(76, 73, 196, .88)";
      ctx.strokeStyle = "rgba(148, 170, 255, .95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      traceRoundedRect(ctx, 55, 350, 610, 225, 26);
      ctx.fill();
      ctx.stroke();
      ctx.drawImage(album, 72, 375, 145, 145);
      this.label(selectedEntry.title, 240, 410, 29, "#fffdf5", "left", 950, "#352078", 3, 365);
      this.label(selectedEntry.artist, 240, 444, 20, "#d9d4ff", "left", 750, "#352078", 2, 365);
      ctx.strokeStyle = "#51ddf1";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(240, 475);
      ctx.lineTo(615, 475);
      ctx.stroke();
      ctx.fillStyle = "#f3fbff";
      ctx.beginPath();
      ctx.arc(420, 475, 13, 0, Math.PI * 2);
      ctx.fill();
      this.label("00:00", 240, 505, 16, "#ece8ff", "left", 800);
      this.label("--:--", 615, 505, 16, "#ece8ff", "right", 800);
      ctx.drawImage(art.previous, 270, 515, 48, 48);
      ctx.drawImage(art.play, 342, 502, 76, 76);
      ctx.drawImage(art.next, 440, 515, 48, 48);
      ctx.drawImage(art.volume, 540, 517, 48, 48);

      ctx.save();
      ctx.beginPath();
      ctx.rect(55, 560, 610, 570);
      ctx.clip();
      MUSIC_CATALOG.forEach((entry, index) => {
        const row = { x: 70, y: 570 + index * 145 - this.musicLibraryScrollOffset, width: 580, height: 126 };
        const unlocked = this.save.highestLevel >= entry.unlockLevel;
        const selected = selectedTrack === entry.id;
        this.drawPressable(`music.${entry.id}`, row, () => {
          ctx.shadowColor = selected ? "rgba(255, 222, 79, .78)" : "rgba(21, 17, 96, .25)";
          ctx.shadowBlur = selected ? 14 : 5;
          ctx.fillStyle = selected ? "#fff4d2" : unlocked ? "#fffdfb" : "#e3e6ff";
          ctx.strokeStyle = selected ? "#ffd84d" : "#c6caf0";
          ctx.lineWidth = selected ? 5 : 3;
          ctx.beginPath();
          traceRoundedRect(ctx, row.x, row.y, row.width, row.height, 18);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.drawImage(art.albums[index % art.albums.length], row.x + 12, row.y + 12, 102, 102);
          this.label(entry.title, row.x + 135, row.y + 46, 25, unlocked ? "#30206f" : "#706c8e", "left", 900, undefined, 0, 260);
          this.label(entry.artist, row.x + 135, row.y + 82, 17, unlocked ? "#615a98" : "#8583a0", "left", 700, undefined, 0, 260);
          const status = unlocked ? (selected ? "播放中" : "选择") : `第${entry.unlockLevel}关`;
          ctx.fillStyle = unlocked ? (selected ? "#25bb5b" : "#6b5ad4") : "#9698bd";
          ctx.beginPath();
          traceRoundedRect(ctx, row.x + row.width - 150, row.y + 36, 134, 54, 18);
          ctx.fill();
          this.label(status, row.x + row.width - 83, row.y + 63, 17, "#ffffff", "center", 900, undefined, 0, 128);
        });
      });
      ctx.restore();
      // A small rail indicates that the remaining unlocked/locked songs are
      // below the four reference rows; the same list can be extended with a
      // drag gesture without changing row geometry.
      ctx.fillStyle = "rgba(210, 218, 255, .42)";
      ctx.beginPath();
      traceRoundedRect(ctx, 670, 560, 6, 570, 3);
      ctx.fill();
      this.drawPressable("musicClose", close, () => ctx.drawImage(art.close, close.x, close.y, close.width, close.height));
      ctx.restore();
    });
  }

  private drawLanguagePicker(): void {
    const art = this.art.pauseSettings;
    if (!art) return;
    const ctx = this.ctx;
    this.drawDim(LANGUAGE_PICKER_LAYOUT.overlay.alpha, LANGUAGE_PICKER_LAYOUT.overlay.color);
    this.withHomeArtboard(() => {
      ctx.drawImage(art.panel, LANGUAGE_PICKER_LAYOUT.panel.x, LANGUAGE_PICKER_LAYOUT.panel.y);
      const title = LANGUAGE_PICKER_LAYOUT.title;
      this.label(
        this.tr("settings.chooseLanguage"),
        title.x,
        title.y,
        Math.min(title.size, 52),
        title.fill,
        "center",
        850,
        title.stroke,
        title.lineWidth,
        330,
      );
      GAME_LANGUAGE_METADATA.forEach((entry, index) => {
        const option = LANGUAGE_PICKER_LAYOUT.options[index];
        const selected = entry.language === this.save.language;
        this.drawPressable(`language.${entry.language}`, option, () => {
          ctx.drawImage(
            selected ? art.homeButton : art.replayButton,
            option.x,
            option.y + 8,
            option.width,
            84,
          );
          this.label(
            entry.nativeName,
            option.x + option.width / 2 - (selected ? 8 : 0),
            option.y + option.height / 2 + 1,
            29,
            "#fffdf5",
            "center",
            900,
            selected ? "#176e21" : "#a85b10",
            3,
            option.width - (selected ? 62 : 30),
          );
          if (selected) {
            this.label(
              "✓",
              option.x + option.width - 29,
              option.y + option.height / 2 + 1,
              29,
              "#ffffff",
              "center",
              1000,
              "#176e21",
              3,
            );
          }
        });
      });
      if (this.languageSaveFailed) {
        this.label(
          this.tr("settings.languageSaveFailed"),
          360,
          451,
          18,
          "#ffcad0",
          "center",
          900,
          "#7e1832",
          3,
          500,
        );
      }
      this.drawPressable("languageBack", LANGUAGE_PICKER_LAYOUT.close, () => {
        ctx.drawImage(art.close, LANGUAGE_PICKER_LAYOUT.close.x, LANGUAGE_PICKER_LAYOUT.close.y);
      });
    });
  }

  private drawResetConfirm(): void {
    this.drawDim();
    this.drawModal(68, 252, 360, 660, this.tr("settings.clearTitle"));
    this.label(this.tr("settings.clearIrreversible"), 248, 392, 31, "#ffbdc6", "center", 1000, "#7e1832", 5, 315);
    this.wrapText(this.tr("settings.clearDescription"), 248, 477, 294, 34, 21, "#f3edff");
    this.drawPill(112, 610, 272, 46, "rgba(31,19,90,.9)", "#786ed0", 23);
    this.label(this.tr("settings.preferencesRetained"), 248, 639, 18, "#b9f5ff", "center", 850, undefined, 0, 250);
    if (this.resetSaveFailed) {
      this.label(this.tr("settings.clearFailed"), 248, 690, 17, "#ffb0bb", "center", 900, "#7e1832", 3, 310);
    }
    this.drawButton("modalPrimary", BUTTONS.modalPrimary, this.tr("settings.confirmClear"), "#ec6073", "#9d1f45", 28);
    this.drawButton("modalSecondary", BUTTONS.modalSecondary, this.tr("common.cancel"), "#7562c8", "#352878", 22);
  }

  private drawUpdateNotice(): void {
    this.drawDim();
    this.drawModal(68, 220, 360, 670, this.tr("update.title"));
    this.drawOnboardingIcon(1, 248, 365, 106);
    this.label(this.tr("update.date", { date: UPDATE_NOTICE.date }), 248, 446, 22, "#8beaff", "center", 900, "#32206b", 3);
    const updateItems: readonly TranslationKey[] = [
      "update.item.formalArt",
      "update.item.clearerBoard",
      "update.item.refreshedScreens",
      "update.item.aspectRatio",
    ];
    updateItems.forEach((item, index) => {
      const y = 510 + index * 62;
      this.drawSystemIcon(1, 118, y, 28);
      this.label(this.tr(item), 145, y + 7, 18, "#f5f0ff", "left", 800, undefined, 0, 280);
    });
    this.drawButton("modalPrimary", BUTTONS.modalPrimary, this.tr("common.gotIt"), "#43dc38", "#0a8122", 28);
  }

  private drawPauseSettingsRows(prefix: "settings" | "pause", art: PauseSettingsArt): void {
    const rows: ReadonlyArray<{ kind: SettingKind; label: string; image: HTMLImageElement; enabled: boolean }> = [
      { kind: "sound", label: this.tr("settings.music"), image: art.sound, enabled: this.save.sound },
      { kind: "haptic", label: this.tr("settings.haptics"), image: art.haptic, enabled: this.save.haptic },
      // The supplied third icon is a positive Effects state, whereas the save
      // stores the inverse accessibility preference (reducedMotion).
      { kind: "reducedMotion", label: this.tr("settings.effects"), image: art.effects, enabled: !this.save.reducedMotion },
    ];
    rows.forEach(({ kind, label, image, enabled }, index) => {
      const row = PAUSE_SETTINGS_LAYOUT.rows[index];
      const rowText = PAUSE_SETTINGS_LAYOUT.typography.rowLabel;
      this.drawPressable(`${prefix}.${kind}`, row.hit, () => {
        this.ctx.drawImage(image, row.icon.x, row.icon.y);
        this.label(
          label,
          rowText.x,
          row.labelY,
          rowText.size,
          rowText.fill,
          "left",
          850,
          rowText.stroke,
          rowText.lineWidth,
          160,
        );
        this.ctx.drawImage(enabled ? art.toggleOn : art.toggleOff, row.toggle.x, row.toggle.y);
      });
    });
  }

  private totalStars(): number {
    return Object.values(this.save.bestStars).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  }

  private drawHud(): void {
    const ctx = this.ctx;
    const snapshot = this.model.snapshot();
    const timeFrozen = (snapshot.timeFreezeSeconds ?? 0) > 0;
    const danger = snapshot.remainingSeconds <= 30 || this.model.level.difficulty === "super";
    const ui = this.art.gameplayUi;
    const homeUi = this.art.homeUi;
    if (homeUi) {
      this.drawGameplayImage(homeUi.resourcePanel, GAMEPLAY_ART_LAYOUT.coin.panel);
      this.drawGameplayImage(homeUi.coinIcon, GAMEPLAY_ART_LAYOUT.coin.icon);
      this.drawGameplayImage(homeUi.addButton, GAMEPLAY_ART_LAYOUT.coin.add);
    }
    if (ui) {
      this.drawPressable("undo", BUTTONS.undo, () => {
        ctx.save();
        ctx.globalAlpha *= this.undoActions.length > 0 ? 1 : 0.48;
        this.drawGameplayImage(ui.backButton, GAMEPLAY_ART_LAYOUT.back);
        ctx.restore();
      });
      this.drawPressable("pause", BUTTONS.pause, () => {
        this.drawGameplayImage(ui.pauseButton, GAMEPLAY_ART_LAYOUT.pause);
      });
      this.drawGameplayImage(ui.levelPill, GAMEPLAY_ART_LAYOUT.level);
      this.drawGameplayImage(ui.timerPanel, GAMEPLAY_ART_LAYOUT.timer.panel);
      this.drawGameplayImage(ui.timerIcon, GAMEPLAY_ART_LAYOUT.timer.icon);
    }
    this.withGameplayArtboard(() => {
      this.label(
        `${this.save.coins}`,
        GAMEPLAY_ART_LAYOUT.coin.label.x,
        GAMEPLAY_ART_LAYOUT.coin.label.y,
        GAMEPLAY_ART_LAYOUT.typography.coin,
        "#6b3015",
        "center",
        950,
        "#fff4d8",
        2,
        GAMEPLAY_ART_LAYOUT.coin.label.maxWidth,
      );
      this.label(
        this.tr("common.levelNumber", { level: this.model.level.id }).toUpperCase(),
        GAMEPLAY_ART_LAYOUT.levelLabel.x,
        GAMEPLAY_ART_LAYOUT.levelLabel.y,
        GAMEPLAY_ART_LAYOUT.typography.level,
        "#f8fbff",
        "center",
        950,
        "#174c9a",
        3,
      );
      this.label(
        this.formatTime(snapshot.remainingSeconds),
        GAMEPLAY_ART_LAYOUT.timer.label.x,
        GAMEPLAY_ART_LAYOUT.timer.label.y,
        GAMEPLAY_ART_LAYOUT.typography.timer,
        timeFrozen ? "#78efff" : danger ? "#ff8e9d" : "#ffffff",
        "center",
        900,
        "#171044",
        3,
      );
      if (timeFrozen) {
        this.drawPill(450, 264, 186, 40, "#173f62", "#78efff", 18);
        this.label(
          this.tr("gameplay.timeFrozenStatus", { seconds: Math.ceil(snapshot.timeFreezeSeconds ?? 0) }),
          543, 285, 20, "#b8f6ff", "center", 900, "#173652", 2, 166,
        );
      }
    });
    if (this.hudFeedback) {
      const alpha = Math.min(1, (this.hudFeedback.duration - this.hudFeedback.age) / 0.16);
      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawPill(146, 211, 204, 40, "#171044", this.hudFeedback.color, 19);
      this.label(this.hudFeedback.text, 248, 237, 17, "#fff9e8", "center", 900, "#24104d", 3);
      ctx.restore();
    }
  }

  private visibleFlipDoorsOnRim(
    snapshot: Pick<PuzzleSnapshot, "width" | "height" | "seams" | "gates" | "flipDoors">,
  ): PuzzleSnapshot["flipDoors"] {
    const fixedRails = new Set(snapshot.gates.flatMap((gate) => gatePortalRailKeys(snapshot, gate)));
    return snapshot.flipDoors.flatMap((door) => {
      const authoredPortals = door.portals?.length ? door.portals : undefined;
      const visiblePortals = gatePortals(snapshot, door).filter((portal) => (
        gatePortalRailKeys(snapshot, { ...door, portals: [portal] })
          .every((rail) => !fixedRails.has(rail))
      ));
      if (!visiblePortals.length) return [];
      if (!authoredPortals) return [door];
      return [{
        ...door,
        portals: visiblePortals.map((portal) => ({
          ...portal,
          origin: [...portal.origin] as Point,
        })),
      }];
    });
  }

  private drawBoard(): void {
    this.ensureFormalBlockArtForCurrentLevel();
    this.ensureFormalIceArtForCurrentLevel();
    const ctx = this.ctx;
    const board = this.boardLayout();
    const snapshot = this.model.snapshot();
    const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
    const blocked = new Set(snapshot.blocked.map(([x, y]) => `${x},${y}`));
    const isFloor = (x: number, y: number): boolean => playable.has(`${x},${y}`) && !blocked.has(`${x},${y}`);
    // Preserve each authored gate span even after retirement. Its neutral
    // replacement is drawn in the gate layer, so a two-cell exit stays a
    // two-cell rim instead of merging into a neighboring three-cell strip.
    const gatesOwningRim = snapshot.gates;
    // A fixed exit owns its rail even when a source-authored flip door happens
    // to reuse the same span. PuzzleModel gives fixed exits the same priority;
    // mirroring that rule here prevents a flip-door overlay from hiding a
    // normal gate while still allowing every non-conflicting door to replace
    // the neutral rim below it.
    const visibleFlipDoors = this.visibleFlipDoorsOnRim(snapshot);
    const activeGeneratorGeometries = snapshot.generators
      .filter((generator) => generator.remaining > 0 || this.activeGeneratorSpawn(generator.id) != null)
      .map((generator) => ({
        mount: generator.rimMount ?? "rim",
        geometry: this.generatorRimGeometry(generator),
      }));
    const rim = buildBoardRimLayout(
      snapshot.playable,
      snapshot.blocked,
      snapshot.width,
      snapshot.height,
      [...gatesOwningRim, ...visibleFlipDoors],
      activeGeneratorGeometries.flatMap(({ mount, geometry }) => (
        mount === "rim" ? geometry.reservedRails : []
      )),
      snapshot.seams,
    );
    const borderArt = this.art.boardRim;
    const authoredCell = 95;
    const borderScale = board.cell / authoredCell;
    const runEndPoint = (run: (typeof rim.runs)[number]): [number, number] => (
      run.quarterTurns === 0
        ? [run.x + run.length, run.y]
        : run.quarterTurns === 1
          ? [run.x, run.y + run.length]
          : run.quarterTurns === 2
            ? [run.x - run.length, run.y]
            : [run.x, run.y - run.length]
    );
    const drawRimRun = (run: (typeof rim.runs)[number]): void => {
      if (!borderArt) return;
      const end = runEndPoint(run);
      const minX = Math.min(run.x, end[0]);
      const minY = Math.min(run.y, end[1]);
      const horizontal = run.quarterTurns === 0 || run.quarterTurns === 2;
      const span = run.length as NativeStripSpan;
      const image = (horizontal ? borderArt.horizontal : borderArt.vertical)[span];
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      ctx.save();
      ctx.translate(
        board.innerX + minX * board.cell,
        board.innerY + minY * board.cell,
      );
      ctx.scale(borderScale, borderScale);
      if (horizontal) {
        // Preserve the supplied 1/2/3-cell bitmap at native proportions. Any
        // authored half-pixel bleed is centered over the exact grid footprint.
        const endpointOverlap = (width - authoredCell * span) / 2;
        const y = run.quarterTurns === 0 ? -height : 0;
        ctx.drawImage(image, -endpointOverlap, y);
      } else {
        // Vertical sources include their own lower bevel/shadow. Adjacent
        // native segments are painted top-to-bottom so the lower one owns the
        // seam, matching the global board-resource depth rule.
        const x = run.quarterTurns === 3 ? -width : 0;
        ctx.drawImage(image, x, 0);
      }
      ctx.restore();
    };
    const cornerImages = borderArt ? [
      borderArt.corners.southWest,
      borderArt.corners.northWest,
      borderArt.corners.northEast,
      borderArt.corners.southEast,
    ] as const : undefined;
    const drawRimCorner = (
      corner: (typeof rim.convexCorners)[number],
      inner: boolean,
    ): void => {
      const image = cornerImages?.[corner.quarterTurns];
      if (!image) return;
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const placements = inner
        ? [[0, -height], [0, 0], [-width, 0], [-width, -height]] as const
        : [[-width, 0], [-width, -height], [0, -height], [0, 0]] as const;
      const [x, y] = placements[corner.quarterTurns];
      ctx.save();
      ctx.translate(board.innerX + corner.x * board.cell, board.innerY + corner.y * board.cell);
      ctx.scale(borderScale, borderScale);
      ctx.drawImage(image, x, y);
      ctx.restore();
    };

    const selectedBlock = this.selectedId ? snapshot.blocks.find((block) => block.id === this.selectedId) : undefined;
    const gateReadinessById = gateReadinessMap(snapshot.gates, snapshot.blocks, snapshot.shutters, snapshot);
    const rimLayers: Array<{ paintY: number; draw: () => void }> = [];
    const addRimRunLayer = (run: (typeof rim.runs)[number]): void => {
      if (!borderArt) return;
      const horizontal = run.quarterTurns === 0 || run.quarterTurns === 2;
      const span = run.length as NativeStripSpan;
      const image = (horizontal ? borderArt.horizontal : borderArt.vertical)[span];
      rimLayers.push({
        paintY: boardRimRunVisualTop(run, image.naturalHeight || image.height, authoredCell),
        draw: () => drawRimRun(run),
      });
    };
    rim.runs.flatMap((run) => splitBoardRimRunIntoSegments(run)).forEach(addRimRunLayer);
    const addRetiringGateBacking = (portal: GatePortalSpec, opacity: number): void => {
      if (opacity >= 1) return;
      // A retired aperture restores normal rim, including its corner order.
      // Keep each native strip at neutral depth, separate from the colored
      // portal's mouth-depth priority, response transform and fading alpha.
      splitBoardRimRunIntoSegments(boardPortalRimRun(portal)).forEach(addRimRunLayer);
    };
    snapshot.gates.forEach((gate) => {
      const opacity = this.gateExitOpacity(snapshot, gate.side, gate.offset, gate.size, gate.color, gate.id);
      const gateArt = this.art.gates?.[gate.color];
      const lv17Continuous = this.model.level.id === 17
        && !gate.portals?.length
        && gate.side === "bottom"
        && gate.offset === 0
        && gate.size === 6
        && gate.color === "yellow";
      if (lv17Continuous && gateArt) {
        const sprite = gateArt.horizontal[3];
        const portal = gatePortals(snapshot, gate)[0];
        addRetiringGateBacking(portal, opacity);
        rimLayers.push({
          paintY: boardGateVisualTop(
            gate,
            snapshot.height,
            sprite.naturalHeight || sprite.height,
            authoredCell,
          ),
          draw: () => {
            if (opacity <= 0) return;
            this.withGateExitResponse(portal, board, () => this.drawLv17ContinuousGate(
              gate.side,
              gate.offset,
              gate.size,
              gate.color,
              gate.frozen,
              gateReadinessById.get(gate.id) ?? "latent",
              board,
              gateIsAvailableTarget(selectedBlock, gate),
              opacity,
            ));
          },
        });
        return;
      }
      for (const portal of gatePortals(snapshot, gate)) {
        const horizontal = portal.side === "top" || portal.side === "bottom";
        const nativeSpan = Math.min(3, portal.size) as NativeStripSpan;
        const sprite = gateArt ? (horizontal ? gateArt.horizontal : gateArt.vertical)[nativeSpan] : undefined;
        addRetiringGateBacking(portal, opacity);
        // One physical aperture is one visual gate. Repeating complete 3-cell
        // sprites repeats their end caps and falsely advertises several exits.
        rimLayers.push({
          paintY: boardPortalVisualDepthTop(
            portal,
            sprite ? sprite.naturalHeight || sprite.height : 58,
            authoredCell,
          ),
          draw: () => {
            if (opacity <= 0) return;
            this.withGateExitResponse(portal, board, () => this.drawGateSegment(
              portal.side,
              portalTangentOffset(portal),
              portal.size,
              gate.color,
              gate.frozen,
              gateReadinessById.get(gate.id) ?? "latent",
              board,
              gateIsAvailableTarget(selectedBlock, gate),
              opacity,
              Boolean(gate.star),
              portal,
            ));
          },
        });
      }
    });
    visibleFlipDoors.forEach((door) => {
      const gateArt = this.art.gates?.[door.color];
      for (const portal of gatePortals(snapshot, door)) {
        const horizontal = portal.side === "top" || portal.side === "bottom";
        let consumed = 0;
        for (const span of nativeStripSpans(portal.size)) {
          const segmentPortal = sliceGatePortal(portal, consumed, span);
          const sprite = gateArt ? (horizontal ? gateArt.horizontal : gateArt.vertical)[span] : undefined;
          rimLayers.push({
            paintY: boardPortalVisualDepthTop(
              segmentPortal,
              sprite ? sprite.naturalHeight || sprite.height : 58,
              authoredCell,
            ),
            draw: () => this.withGateExitResponse(portal, board, () => this.drawFlipDoorSegment(
              segmentPortal.side,
              portalTangentOffset(segmentPortal),
              span,
              door.color,
              door.frozen,
              door.open,
              board,
              Boolean(door.star),
              segmentPortal,
              door.id,
              portal,
            )),
          });
          consumed += span;
        }
      }
    });
    // Exit glow is another rendition of the same gate artwork. Add it after
    // every fixed/flip-door base layer but before corners, all within the same
    // depth-sorted pass. It shares the gate's priority over overlapping caps,
    // while the departing block remains in its later drawing pass.
    this.exitPulses.forEach((pulse) => {
      const pulseDuration = this.save.reducedMotion ? pulse.duration : GATE_EXIT_PULSE_DURATION;
      if (pulse.age >= pulseDuration) return;
      const alpha = sampleGateExitResponse(pulse.age, this.save.reducedMotion).glow * 0.38;
      const gateArt = this.art.gates?.[pulse.color];
      if (alpha <= 0 || !gateArt) return;
      const horizontal = pulse.portal.side === "top" || pulse.portal.side === "bottom";
      const nativeSpan = Math.min(3, pulse.portal.size) as NativeStripSpan;
      const sprite = (horizontal ? gateArt.horizontal : gateArt.vertical)[nativeSpan];
      rimLayers.push({
        paintY: boardPortalVisualDepthTop(
          pulse.portal,
          sprite.naturalHeight || sprite.height,
          authoredCell,
        ),
        draw: () => this.withGateExitResponse(pulse.portal, board, () => {
          this.drawGateBorderSegmentSprite(
            gateArt,
            pulse.portal.side,
            portalTangentOffset(pulse.portal),
            pulse.portal.size,
            board,
            {
              alpha,
              shadowColor: COLOR_STYLE[pulse.color].light,
              shadowBlur: this.save.reducedMotion ? 5 : 11,
              filter: this.save.reducedMotion ? "brightness(1.08)" : "brightness(1.16)",
            },
            pulse.portal,
          );
        }),
      });
    });
    if (borderArt && cornerImages) {
      rim.convexCorners.forEach((corner) => {
        const image = cornerImages[corner.quarterTurns];
        rimLayers.push({
          paintY: boardRimCornerVisualTop(corner, image.naturalHeight || image.height, false, authoredCell),
          draw: () => drawRimCorner(corner, false),
        });
      });
      rim.concaveCorners.forEach((corner) => {
        const image = cornerImages[corner.quarterTurns];
        rimLayers.push({
          paintY: boardRimCornerVisualTop(corner, image.naturalHeight || image.height, true, authoredCell),
          draw: () => drawRimCorner(corner, true),
        });
      });
    }
    const drawRimAndGateDecorations = (): void => {
      ctx.save();
      // Every supplied slice already contains its own edge lighting and shadow.
      // Keep the rim pass neutral so overlapping pieces cannot cast repeated seams.
      // Share one depth-sorted list; portal mouth ownership takes priority
      // over corner caps while neutral pieces retain their top-edge order.
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      orderBoardRimLayersByDepth(rimLayers).forEach(({ draw }) => draw());
      ctx.restore();
      snapshot.gates.forEach((gate) => {
        const opacity = this.gateExitOpacity(snapshot, gate.side, gate.offset, gate.size, gate.color, gate.id);
        if (opacity <= 0) return;
        for (const portal of gatePortals(snapshot, gate)) {
          this.withGateExitResponse(portal, board, () => this.drawGateDecorations(
            portal.side,
            portalTangentOffset(portal),
            portal.size,
            gate.frozen,
            board,
            Boolean(gate.star),
            opacity,
            portal,
          ));
        }
      });
      visibleFlipDoors.forEach((door) => {
        for (const portal of gatePortals(snapshot, door)) {
          this.withGateExitResponse(portal, board, () => this.drawFlipDoorDecorations(
            portal.side,
            portalTangentOffset(portal),
            portal.size,
            door.frozen,
            door.open,
            board,
            Boolean(door.star),
            portal,
          ));
        }
      });
    };
    // Legacy levels retain their exact painter order. A seam level represents
    // physically separate board chambers, so its paired rails and any portals
    // mounted on them are deferred until after chamber contents. This prevents
    // the floor or a block in the opposite chamber from painting over the gap.
    const hasBoardSeams = snapshot.seams.length > 0;
    if (!hasBoardSeams) drawRimAndGateDecorations();
    if (this.art.formalFloor) {
      ctx.save();
      ctx.beginPath();
      for (let y = 0; y < snapshot.height; y += 1) {
        for (let x = 0; x < snapshot.width; x += 1) {
          if (!isFloor(x, y)) continue;
          ctx.rect(board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
        }
      }
      ctx.clip();
      ctx.translate(board.innerX, board.innerY);
      ctx.scale(borderScale, borderScale);
      for (let y = 0; y < snapshot.height; y += 2) {
        for (let x = 0; x < snapshot.width; x += 2) {
          ctx.drawImage(this.art.formalFloor, x * authoredCell, y * authoredCell);
        }
      }
      ctx.restore();
    } else {
      for (let y = 0; y < snapshot.height; y += 1) {
        for (let x = 0; x < snapshot.width; x += 1) {
          if (!isFloor(x, y)) continue;
          ctx.drawImage(this.art.emptyCell!, board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
        }
      }
    }

    snapshot.coloredGrids.forEach((grid) => this.drawColoredGrid(grid, board));

    // A closed lift is the floor beneath its current occupants. Once revealed,
    // its opening doors move in front of the arriving whole next layer.
    if (usesRevisedMechanisms(snapshot)) {
      for (const region of snapshot.shutters) {
        if (region.skin === "lift" && !isMechanismRegionRevealed(snapshot, region)) {
          this.drawRevisedMechanismRegion(region, board);
        } else if (region.skin === "lift" && this.revisedTransitions.some((item) => item.kind === "lift" && item.targetId === region.id)) {
          const rect = projectShutterVisualRect(region.x, region.y, region.width, region.height, board);
          const transition = this.revisedTransitions.find((item) => item.kind === "lift" && item.targetId === region.id)!;
          ctx.save();
          ctx.globalAlpha *= sampleRevisedRegionAnimation("lift", transition.age, this.save.reducedMotion).frameAlpha;
          ctx.fillStyle = "#100d1b";
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          ctx.restore();
        }
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
    const spawnVisuals = this.generatorSpawnAnimations.map((animation) => ({
      animation,
      state: this.generatorSpawnVisualState(animation),
    }));
    const hiddenSpawnBlockIds = new Set(spawnVisuals
      .filter(({ state }) => state.hideNormalBlock)
      .map(({ animation }) => animation.block.id));
    const spawnProxyEntries = spawnVisuals
      .filter(({ state }) => state.spawnProxyVisible)
      .map(({ animation, state }) => ({
        // Keep the proxy on its integer model anchor. Formal whole-piece art
        // matching rejects fractional cells; sub-cell motion belongs in the
        // Canvas transform applied below, not in BlockState coordinates.
        block: {
          ...animation.block,
          shape: animation.block.shape.map(([x, y]) => [x, y] as Point),
          layers: [...animation.block.layers],
        },
        translation: state.translation,
      }));
    const spawnProxyBlocks = spawnProxyEntries.map(({ block }) => block);
    const spawnProxyBlockIds = new Set(spawnProxyBlocks.map(({ id }) => id));
    const spawnProxyTranslations = new Map(spawnProxyEntries.map(({ block, translation }) => (
      [block.id, translation] as const
    )));
    const visualBlocks = snapshot.blocks
      .filter((block) => {
        if (hiddenSpawnBlockIds.has(block.id)) return false;
        return isMechanismBlockVisible(snapshot, block);
      })
      .map((block) => this.mechanicVisualBlock(block))
      .concat(spawnProxyBlocks);
    orderBlocksByDepth(visualBlocks, (block) => (
      block.id === this.dragVisual?.blockId
        ? this.dragVisual.y
        : block.y + (spawnProxyTranslations.get(block.id)?.y ?? 0)
    )).forEach((block) => {
      const liftTransition = block.shutterId && block.id !== this.dragVisual?.blockId
        ? this.revisedTransitions.find((item) => item.kind === "lift" && item.targetId === block.shutterId
          && sampleRevisedRegionAnimation("lift", item.age, this.save.reducedMotion).coverFraction > 0) : undefined;
      if (liftTransition) {
        const region = snapshot.shutters.find(({ id }) => id === liftTransition.targetId)!;
        const sample = sampleRevisedRegionAnimation("lift", liftTransition.age, this.save.reducedMotion);
        const rect = projectShutterVisualRect(region.x, region.y, region.width, region.height, board);
        const geometry = revisedRegionOpeningGeometry(rect, sample);
        ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.width, rect.height); ctx.clip();
        ctx.translate(geometry.revealOrigin.x, geometry.revealOrigin.y);
        ctx.scale(sample.revealScale, sample.revealScale);
        ctx.translate(-geometry.revealOrigin.x, -geometry.revealOrigin.y);
      }
      const clippedSpawnProxy = spawnProxyBlockIds.has(block.id);
      if (clippedSpawnProxy) {
        ctx.save();
        ctx.beginPath();
        for (let y = 0; y < snapshot.height; y += 1) {
          for (let x = 0; x < snapshot.width; x += 1) {
            if (isFloor(x, y)) ctx.rect(board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
          }
        }
        ctx.clip();
        const translation = spawnProxyTranslations.get(block.id);
        // The floor clip stays fixed in board space while the integer-matched
        // sprite is translated out of the machine mouth underneath it.
        if (translation) ctx.translate(translation.x * board.cell, translation.y * board.cell);
      }
      this.drawBlock(
        block,
        board,
        block.id === this.selectedId || block.id === this.dragVisual?.blockId,
        block.id === strategyNudge?.blockId,
      );
      if (clippedSpawnProxy) ctx.restore();
      if (liftTransition) ctx.restore();
    });
    const selectedVisualBlockId = this.selectedId ?? this.dragVisual?.blockId;
    const selectedVisualBlock = selectedVisualBlockId
      ? visualBlocks.find((block) => block.id === selectedVisualBlockId)
      : undefined;
    const adaptiveBlocker = strategyNudge?.reason === "blocker"
      ? snapshot.blocks.find((block) => block.id === strategyNudge.blockId)
      : undefined;
    const strategyFocusBlock = this.strategyFocusBlock();
    const focusedBlock = this.blockerFocusBlockId
      ? snapshot.blocks.find((block) => block.id === this.blockerFocusBlockId)
      : undefined;
    const drawBlockInteractionOverlay = (): void => {
      // The selected block keeps normal depth ownership, while its interaction
      // outline is a UI overlay. Drawing it after every block prevents a lower
      // neighbor from hiding one side and making the frame appear displaced.
      if (selectedVisualBlock) this.drawSelectedBlockSelection(selectedVisualBlock, board);
      if (adaptiveBlocker) this.drawBlockerFocus(adaptiveBlocker, board, true);
      if (strategyFocusBlock) this.drawStrategyFocus(strategyFocusBlock, board);
      if (focusedBlock) this.drawBlockerFocus(focusedBlock, board);
    };
    if (!hasBoardSeams) drawBlockInteractionOverlay();
    const drawExitAnimationOverlay = (): void => {
      this.exitGhosts.forEach((ghost) => this.drawExitGhost(ghost, board));
      if (!this.save.reducedMotion) {
        this.exitPulses.forEach((pulse) => {
          if (pulse.age >= GATE_EXIT_PULSE_DURATION) return;
          const strength = sampleGateExitResponse(pulse.age, this.save.reducedMotion).glow;
          this.withGateExitResponse(pulse.portal, board, () => this.drawGateExitFlash(
            pulse.portal.side,
            portalTangentOffset(pulse.portal),
            pulse.portal.size,
            board,
            strength,
            pulse.color,
            pulse.portal,
          ));
        });
      }
      this.drawParticles(true);
    };
    if (!hasBoardSeams) drawExitAnimationOverlay();
    snapshot.shutters.forEach((shutter) => {
      if (usesReferenceRegionVisuals(snapshot, shutter)) {
        const animating = this.revisedTransitions.some((item) => item.targetId === shutter.id
          && (item.kind === "lift" || item.kind === "shutter"));
        const revealed = isMechanismRegionRevealed(snapshot, shutter);
        if (revealed && !animating) return;
        if (shutter.skin === "lift" && !revealed && this.revisedLiftArtReady()) return;
        if (this.drawRevisedMechanismRegion(shutter, board)) return;
      }
      if (isMechanismRegionRevealed(snapshot, shutter) || shutter.skin === "staging") return;
      if (shutter.skin === "generator") this.drawGenerator(shutter.x, shutter.y, shutter.width, shutter.height, shutter.count, board);
      else if (shutter.skin === "lift") this.drawLiftFrame(shutter.x, shutter.y, shutter.width, shutter.height, board);
      else if (shutter.skin === "staged-frame") this.drawStagedFrame(shutter.x, shutter.y, shutter.width, shutter.height, board);
      else this.drawShutter(shutter.x, shutter.y, shutter.width, shutter.height, shutter.count, board);
    });
    if (hasBoardSeams) {
      // A seam is the shared outside edge of two independent chambers. Paint
      // chamber-covering devices first, then restore the paired rails/gates;
      // the departing ghost remains last so it still passes above its exit.
      drawRimAndGateDecorations();
      drawBlockInteractionOverlay();
      drawExitAnimationOverlay();
    }
    snapshot.generators.forEach((generator) => {
      const animation = this.activeGeneratorSpawn(generator.id);
      const exhaustion = this.revisedTransitions.some((item) => item.kind === "generator" && item.targetId === generator.id);
      if (generator.remaining <= 0 && !animation && !exhaustion) return;
      if (!animation) {
        const preview = snapshot.queuedBlocks.find((block) => block.id === generator.nextBlockId);
        this.drawIndependentGenerator(generator, preview, board);
        return;
      }
      const state = this.generatorSpawnVisualState(animation);
      const display = resolveGeneratorSpawnDisplay(state.display, {
        outgoingHead: animation.previousPreview ?? null,
        nextHead: animation.nextPreview ?? null,
        remainingBefore: animation.previousRemaining,
        remainingAfter: animation.currentRemaining,
      });
      const visualGenerator = {
        ...generator,
        head: state.display.head === "outgoing" ? animation.previousHead : animation.currentHead,
        remaining: display.remaining,
        nextBlockId: display.preview?.id,
      };
      this.drawIndependentGenerator(visualGenerator, display.preview ?? undefined, board);
    });

    if (this.shouldShowBasicTutorial()) {
      this.drawTutorialHand(board);
      this.wrapText(
        this.tr("gameplay.tutorial.dragToExit"),
        248,
        board.y + board.height + 42,
        420,
        24,
        18,
        "#fff4b7",
        "center",
        "#25135e",
        4,
      );
    } else if (strategyNudge) {
      this.drawGuideHand(strategyNudge, 76);
      const y = Math.max(252, board.y - 58);
      this.drawPill(93, y, 310, 42, "#171044", "#72f6ff", 18);
      this.label(
        strategyNudge.reason === "followup"
          ? this.tr("gameplay.strategy.followup")
          : this.tr("gameplay.strategy.blocker"),
        248,
        y + 22,
        17,
        "#fff4b7",
        "center",
        900,
        "#25135e",
        3,
        284,
      );
    } else if (strategyFocusBlock) {
      const y = Math.max(252, board.y - 58);
      this.drawPill(102, y, 292, 42, "#171044", "#72f6ff", 18);
      this.label(
        this.tr("gameplay.strategy.focus"),
        248,
        y + 22,
        17,
        "#fff4b7",
        "center",
        900,
        "#25135e",
        3,
        266,
      );
    }
  }

  private gateRect(
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    portal?: GatePortalSpec,
  ): Rect {
    if (portal) return gatePortalVisualRect(portal, board);
    const thickness = board.cell * 58 / 95;
    let x = board.innerX + offset * board.cell;
    let y = board.innerY - thickness;
    let width = size * board.cell;
    let height = thickness;
    if (side === "bottom") y = board.innerY + board.innerHeight;
    if (side === "left" || side === "right") {
      x = side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth;
      y = board.innerY + offset * board.cell;
      width = thickness;
      height = size * board.cell;
    }
    return { x, y, width, height };
  }

  private frozenGateCounterPosition(
    side: Side,
    rect: Readonly<Rect>,
    board: BoardLayout,
  ): { x: number; y: number } {
    const horizontalIce = this.art.iceStrips?.horizontal[1];
    return frozenGateCounterCenter(
      side,
      rect,
      board.cell,
      horizontalIce ? horizontalIce.naturalHeight || horizontalIce.height : undefined,
    );
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
    opacity = 1,
    portal?: GatePortalSpec,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= opacity;
    const availability = gateReadinessVisual(readiness);
    const { x, y, width, height } = this.gateRect(side, offset, size, board, portal);
    const thickness = board.cell * 58 / 95;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const art = this.art.gates?.[color];
    if (art) {
      if (focused) {
        const wave = this.save.reducedMotion ? 0.5 : (Math.sin(this.elapsed * 5.4) + 1) * 0.5;
        this.drawGateBorderSprite(art, side, offset, size, board, {
          alpha: this.save.reducedMotion ? 0.34 : 0.28 + wave * 0.24,
          shadowColor: COLOR_STYLE[color].light,
          shadowBlur: this.save.reducedMotion ? 9 : 13 + wave * 7,
        }, portal);
      }
      this.drawGateBorderSprite(art, side, offset, size, board, {
        alpha: availability.baseAlpha,
        // The formal gate slice already carries its own shadow. Availability
        // remains encoded by alpha/ice; only the explicit focus pass adds glow.
        shadowColor: "rgba(0,0,0,0)",
        shadowBlur: 0,
      }, portal);
    }
    if (frozen > 0) {
      if (!this.drawGateIceStrip(side, offset, size, board, availability.overlayAlpha, portal)) {
        this.drawIceSurface(x - 2, y - 2, width + 4, height + 4, availability.overlayAlpha);
      }
      const counter = this.frozenGateCounterPosition(side, { x, y, width, height }, board);
      this.label(`${frozen}`, counter.x, counter.y, 23, "#633545", "center", 1000, "white", 3);
    }
    const starOverlayDrawn = star && this.art.starGates
      ? this.drawStarGateBorder(side, offset, size, board, availability.baseAlpha, portal)
      : false;
    if (star && !starOverlayDrawn) {
      this.drawStarMark(centerX, centerY, Math.min(30, Math.max(18, thickness * 1.12)));
    }
    ctx.restore();
  }

  private drawGateSegment(
    side: Side,
    offset: number,
    span: number,
    color: BlockColor,
    frozen: number,
    readiness: GateReadiness,
    board: BoardLayout,
    focused: boolean,
    opacity: number,
    star = false,
    portal?: GatePortalSpec,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= opacity;
    const availability = gateReadinessVisual(readiness);
    const art = this.art.gates?.[color];
    if (art) {
      if (focused) {
        const wave = this.save.reducedMotion ? 0.5 : (Math.sin(this.elapsed * 5.4) + 1) * 0.5;
        this.drawGateBorderSegmentSprite(art, side, offset, span, board, {
          alpha: this.save.reducedMotion ? 0.34 : 0.28 + wave * 0.24,
          shadowColor: COLOR_STYLE[color].light,
          shadowBlur: this.save.reducedMotion ? 9 : 13 + wave * 7,
        }, portal);
      }
      this.drawGateBorderSegmentSprite(art, side, offset, span, board, {
        alpha: availability.baseAlpha,
        shadowColor: "rgba(0,0,0,0)",
        shadowBlur: 0,
      }, portal);
    }
    if (frozen > 0 && !this.drawGateIceStripSegment(side, offset, span, board, availability.overlayAlpha, portal)) {
      const rect = this.gateRect(side, offset, span, board, portal);
      this.drawIceSurface(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4, availability.overlayAlpha);
    }
    if (star && this.art.starGates) {
      this.drawStarGateBorderSegment(side, offset, span, board, availability.baseAlpha, portal);
    }
    ctx.restore();
  }

  private drawGateDirectionArrow(side: Side, rect: Readonly<Rect>, board: BoardLayout): void {
    const arrow = this.art.gateDirectionArrow;
    if (!arrow) return;
    const scale = board.cell / 95;
    const width = (arrow.naturalWidth || arrow.width) * scale;
    const height = (arrow.naturalHeight || arrow.height) * scale;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.rotate(({ top: 0, right: Math.PI / 2, bottom: Math.PI, left: -Math.PI / 2 })[side]);
    ctx.drawImage(arrow, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  private drawGateDecorations(
    side: Side,
    offset: number,
    size: number,
    frozen: number,
    board: BoardLayout,
    star: boolean,
    opacity: number,
    portal?: GatePortalSpec,
    showArrow = true,
  ): void {
    const { x, y, width, height } = this.gateRect(side, offset, size, board, portal);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const thickness = board.cell * 58 / 95;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= opacity;
    // Frozen gates keep their centered counter readable; the arrow is revealed
    // when the ice clears. The supplied star frame leaves its center open.
    if (showArrow && frozen <= 0 && (!star || this.art.starGates)) {
      this.drawGateDirectionArrow(side, { x, y, width, height }, board);
    }
    if (frozen > 0) {
      const counter = this.frozenGateCounterPosition(side, { x, y, width, height }, board);
      this.label(`${frozen}`, counter.x, counter.y, 23, "#633545", "center", 1000, "white", 3);
    }
    if (star && !this.art.starGates) {
      this.drawStarMark(centerX, centerY, Math.min(30, Math.max(18, thickness * 1.12)));
    }
    ctx.restore();
  }

  private drawFlipDoorSegment(
    side: Side,
    offset: number,
    span: NativeStripSpan,
    color: BlockColor,
    frozen: number,
    open: boolean,
    board: BoardLayout,
    star = false,
    portal?: GatePortalSpec,
    doorId?: string,
    completePortal?: GatePortalSpec,
  ): void {
    if (frozen > 0) {
      // Ice owns the frozen face regardless of the retained open/closed phase.
      // Do not paint moving leaves over the opaque ice or select an alpha-zero
      // actionable/latent treatment while this door is frozen.
      this.drawGateSegment(side, offset, span, color, frozen, "frozen", board, false, 1, star, portal);
      return;
    }
    const horizontal = side === "top" || side === "bottom";
    const image = this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.flipDoors[color][horizontal ? "horizontal" : "vertical"][span]);
    if (image) {
      // Split the supplied hollow frame into its two moving leaves. Nothing
      // from the closed cover stays across the open coloured gate face.
      this.drawGateSegment(side, offset, span, color, frozen, "actionable", board, false, 1, star, portal);
      const rect = this.gateRect(side, offset, span, board, portal);
      const transition = this.revisedTransitions.find((item) => item.kind === "flip" && item.targetId === doorId);
      const openness = transition ? sampleRevisedFlipGate(transition.age, Boolean(transition.toOpen),
        this.save.reducedMotion, transition.fromOpen).openness : open ? 1 : 0;
      const scale = board.cell / 95;
      const width = image.width * scale;
      const height = image.height * scale;
      if (frozen <= 0) {
        // One arrow belongs to the whole aperture, even when its moving cover
        // uses multiple native strips. Paint below the leaves so they mask it.
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.clip();
        this.drawGateDirectionArrow(side, completePortal ? gatePortalVisualRect(completePortal, board) : rect, board);
        ctx.restore();
      }
      drawRevisedFlipPanels(this.ctx, { x: rect.x + (rect.width - width) / 2,
        y: rect.y + (rect.height - height) / 2, width, height }, horizontal, openness, image);
      return;
    }
    // Reuse the exact formal gate slice and its ice treatment. The state mark
    // is rendered once across the complete door by drawFlipDoorDecorations,
    // so a 3-cell door never receives three unrelated badges.
    this.drawGateSegment(
      side,
      offset,
      span,
      color,
      frozen,
      open ? "actionable" : "latent",
      board,
      false,
      1,
      star,
      portal,
    );
  }

  private drawFlipDoorDecorations(
    side: Side,
    offset: number,
    size: number,
    frozen: number,
    open: boolean,
    board: BoardLayout,
    star: boolean,
    portal?: GatePortalSpec,
  ): void {
    if (frozen > 0) {
      this.drawGateDecorations(side, offset, size, frozen, board, star, 1, portal, false);
      return;
    }
    if (usesRevisedMechanisms(this.model.level) && ACTIVE_REVISED_MECHANISM_ART_PATHS.every((path) => this.revisedArt.has(path))) {
      this.drawGateDecorations(side, offset, size, frozen, board, star, 1, portal, false);
      return;
    }
    const { x, y, width, height } = this.gateRect(side, offset, size, board, portal);
    const ctx = this.ctx;
    const horizontal = side === "top" || side === "bottom";
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const faceInset = Math.max(2, board.cell * 0.045);
    const faceX = x + faceInset;
    const faceY = y + faceInset;
    const faceWidth = Math.max(1, width - faceInset * 2);
    const faceHeight = Math.max(1, height - faceInset * 2);
    const shortSpan = Math.min(faceWidth, faceHeight);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (!open) {
      ctx.globalAlpha *= 0.9;
      ctx.fillStyle = "rgba(24,13,61,.72)";
      ctx.fillRect(faceX, faceY, faceWidth, faceHeight);
      ctx.strokeStyle = "rgba(255,222,120,.96)";
      ctx.lineWidth = Math.max(2, shortSpan * 0.105);
      const radius = shortSpan * 0.23;
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.moveTo(centerX + radius, centerY - radius);
      ctx.lineTo(centerX - radius, centerY + radius);
      ctx.stroke();
    } else if (frozen <= 0) {
      this.drawGateDirectionArrow(side, { x, y, width, height }, board);
    }
    ctx.restore();

    // State marks sit below the authoritative ice/star counters, keeping a
    // frozen flip door readable in the same way as a normal frozen gate.
    this.drawGateDecorations(side, offset, size, frozen, board, star, 1, portal, false);
  }

  private drawColoredGrid(
    grid: PuzzleSnapshot["coloredGrids"][number],
    board: BoardLayout,
  ): void {
    const ctx = this.ctx;
    const tile = this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.coloredGrids[grid.color]);
    if (tile) {
      for (const [x, y] of grid.cells) {
        ctx.drawImage(tile, board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
      }
      return;
    }
    const style = COLOR_STYLE[grid.color];
    const inset = Math.max(2, board.cell * 0.07);
    const lineInset = Math.max(1, board.cell * 0.16);
    ctx.save();
    for (const [cellX, cellY] of grid.cells) {
      const x = board.innerX + cellX * board.cell + inset;
      const y = board.innerY + cellY * board.cell + inset;
      const size = board.cell - inset * 2;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = style.base;
      ctx.fillRect(x, y, size, size);
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = style.light;
      ctx.lineWidth = Math.max(1.5, board.cell * 0.035);
      ctx.strokeRect(x, y, size, size);
      ctx.globalAlpha = 0.36;
      ctx.lineWidth = Math.max(1, board.cell * 0.018);
      ctx.beginPath();
      ctx.moveTo(x + lineInset, y);
      ctx.lineTo(x + lineInset, y + size);
      ctx.moveTo(x + size - lineInset, y);
      ctx.lineTo(x + size - lineInset, y + size);
      ctx.moveTo(x, y + lineInset);
      ctx.lineTo(x + size, y + lineInset);
      ctx.moveTo(x, y + size - lineInset);
      ctx.lineTo(x + size, y + size - lineInset);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStarGateBorder(
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    alpha: number,
    portal?: GatePortalSpec,
  ): boolean {
    if (!this.art.starGates) return false;
    this.drawStarGateBorderSegment(side, offset, size, board, alpha, portal);
    return true;
  }

  private drawStarGateBorderSegment(
    side: Side,
    offset: number,
    span: number,
    board: BoardLayout,
    alpha: number,
    portal?: GatePortalSpec,
  ): void {
    const starGates = this.art.starGates;
    if (!starGates) return;
    this.drawGateBorderSegmentSprite(starGates, side, offset, span, board, {
      alpha,
      shadowColor: "rgba(255, 205, 72, .3)",
      shadowBlur: this.save.reducedMotion ? 2 : 5,
    }, portal);
  }

  private drawGateBorderSprite(
    image: GateArt,
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    options: {
      alpha: number;
      shadowColor: string;
      shadowBlur: number;
      outwardOffset?: number;
      filter?: string;
    },
    portal?: GatePortalSpec,
  ): void {
    this.drawGateBorderSegmentSprite(image, side, offset, size, board, options, portal);
  }

  private drawGateBorderSegmentSprite(
    image: GateArt,
    side: Side,
    offset: number,
    span: number,
    board: BoardLayout,
    options: {
      alpha: number;
      shadowColor: string;
      shadowBlur: number;
      outwardOffset?: number;
      filter?: string;
    },
    portal?: GatePortalSpec,
  ): void {
    const authoredCell = 95;
    const scale = board.cell / authoredCell;
    const outwardOffset = options.outwardOffset ?? 0;
    const outward = {
      top: [0, -1],
      right: [1, 0],
      bottom: [0, 1],
      left: [-1, 0],
    }[side];
    const horizontal = side === "top" || side === "bottom";
    const portalRect = portal ? gatePortalVisualRect(portal, board) : undefined;
    const anchorX = portalRect
      ? horizontal
        ? portalRect.x
        : side === "left" ? portalRect.x + portalRect.width : portalRect.x
      : horizontal
        ? board.innerX + offset * board.cell
        : side === "left" ? board.innerX : board.innerX + board.innerWidth;
    const anchorY = portalRect
      ? horizontal
        ? side === "top" ? portalRect.y + portalRect.height : portalRect.y
        : portalRect.y
      : horizontal
        ? side === "top" ? board.innerY : board.innerY + board.innerHeight
        : board.innerY + offset * board.cell;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= options.alpha;
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur;
    if (options.filter) ctx.filter = options.filter;
    ctx.translate(anchorX + outward[0] * outwardOffset, anchorY + outward[1] * outwardOffset);
    ctx.scale(scale, scale);
    const nativeSpan = Math.min(3, span) as NativeStripSpan;
    const sprite = (horizontal ? image.horizontal : image.vertical)[nativeSpan];
    const width = sprite.naturalWidth || sprite.width;
    const height = sprite.naturalHeight || sprite.height;
    const nominalSpan = span * authoredCell;
    if (span > 3) {
      // Preserve the authored cap sizes and shadow overhang. Only the middle
      // extends, so the single aperture cannot acquire false internal caps.
      const sourceLength = horizontal ? width : height;
      drawContinuousGateStrip(ctx, sprite, horizontal,
        horizontal ? (nativeSpan * authoredCell - width) / 2 : side === "left" ? -width : 0,
        horizontal && side === "top" ? -height : 0,
        nominalSpan + sourceLength - nativeSpan * authoredCell);
    } else if (horizontal) {
      const y = side === "top" ? -height : 0;
      ctx.drawImage(sprite, (nominalSpan - width) / 2, y);
    } else {
      const x = side === "left" ? -width : 0;
      ctx.drawImage(sprite, x, 0);
    }
    ctx.restore();
  }

  /**
   * The Lv17 yellow bottom exit is authored as one six-cell gate. Its formal
   * atlas only has 1/2/3-cell strips, so drawing two 3-cell slices creates a
   * false centre seam that reads like a duplicate exit. Stretch the supplied
   * three-cell strip across the single logical gate for that one contract.
   */
  private drawLv17ContinuousGateSprite(
    image: GateArt,
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    options: {
      alpha: number;
      shadowColor: string;
      shadowBlur: number;
      filter?: string;
    },
  ): void {
    const authoredCell = 95;
    const scale = board.cell / authoredCell;
    const horizontal = side === "top" || side === "bottom";
    const anchorX = horizontal
      ? board.innerX + offset * board.cell
      : side === "left" ? board.innerX : board.innerX + board.innerWidth;
    const anchorY = horizontal
      ? side === "top" ? board.innerY : board.innerY + board.innerHeight
      : board.innerY + offset * board.cell;
    const sprite = (horizontal ? image.horizontal : image.vertical)[3];
    const sourceWidth = sprite.naturalWidth || sprite.width;
    const sourceHeight = sprite.naturalHeight || sprite.height;
    const destinationSpan = size * authoredCell;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= options.alpha;
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur;
    if (options.filter) ctx.filter = options.filter;
    ctx.translate(anchorX, anchorY);
    ctx.scale(scale, scale);
    if (horizontal) {
      ctx.drawImage(
        sprite,
        0,
        0,
        sourceWidth,
        sourceHeight,
        0,
        side === "top" ? -sourceHeight : 0,
        destinationSpan,
        sourceHeight,
      );
    } else {
      ctx.drawImage(
        sprite,
        0,
        0,
        sourceWidth,
        sourceHeight,
        side === "left" ? -sourceWidth : 0,
        0,
        sourceWidth,
        destinationSpan,
      );
    }
    ctx.restore();
  }

  private drawLv17ContinuousGate(
    side: Side,
    offset: number,
    size: number,
    color: BlockColor,
    frozen: number,
    readiness: GateReadiness,
    board: BoardLayout,
    focused: boolean,
    opacity: number,
  ): void {
    const art = this.art.gates?.[color];
    if (!art) {
      let consumed = 0;
      for (const span of nativeStripSpans(size)) {
        this.drawGateSegment(side, offset + consumed, span, color, frozen, readiness, board, focused, opacity);
        consumed += span;
      }
      return;
    }
    const availability = gateReadinessVisual(readiness);
    if (focused) {
      const wave = this.save.reducedMotion ? 0.5 : (Math.sin(this.elapsed * 5.4) + 1) * 0.5;
      this.drawLv17ContinuousGateSprite(art, side, offset, size, board, {
        alpha: opacity * (this.save.reducedMotion ? 0.34 : 0.28 + wave * 0.24),
        shadowColor: COLOR_STYLE[color].light,
        shadowBlur: this.save.reducedMotion ? 9 : 13 + wave * 7,
      });
    }
    this.drawLv17ContinuousGateSprite(art, side, offset, size, board, {
      alpha: opacity * availability.baseAlpha,
      shadowColor: "rgba(0,0,0,0)",
      shadowBlur: 0,
    });
    if (frozen > 0) {
      if (!this.drawLv17ContinuousIceStrip(side, offset, size, board, opacity * availability.overlayAlpha)
        && !this.drawGateIceStrip(side, offset, size, board, opacity * availability.overlayAlpha)) {
        const rect = this.gateRect(side, offset, size, board);
        this.drawIceSurface(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4, opacity * availability.overlayAlpha);
      }
    }
  }

  private drawLv17ContinuousIceStrip(
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    alpha: number,
  ): boolean {
    const horizontal = side === "top" || side === "bottom";
    const ice = this.art.iceStrips?.[horizontal ? "horizontal" : "vertical"][3];
    if (!ice) return false;
    const authoredCell = 95;
    const scale = board.cell / authoredCell;
    const width = ice.naturalWidth || ice.width;
    const height = ice.naturalHeight || ice.height;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(111,239,255,.64)";
    ctx.shadowBlur = 5;
    ctx.translate(
      horizontal
        ? board.innerX + offset * board.cell
        : side === "left" ? board.innerX : board.innerX + board.innerWidth,
      horizontal
        ? side === "top" ? board.innerY : board.innerY + board.innerHeight
        : board.innerY + offset * board.cell,
    );
    ctx.scale(scale, scale);
    if (horizontal) {
      ctx.drawImage(ice, 0, side === "top" ? -height : 0, size * authoredCell, height);
    } else {
      ctx.drawImage(ice, side === "left" ? -width : 0, 0, width, size * authoredCell);
    }
    ctx.restore();
    return true;
  }

  private withGateExitResponse(portal: GatePortalSpec, board: BoardLayout, draw: () => void): void {
    let displacement = 0;
    for (const pulse of this.exitPulses) {
      if (pulse.portal.side !== portal.side || pulse.portal.size !== portal.size
        || pulse.portal.origin[0] !== portal.origin[0] || pulse.portal.origin[1] !== portal.origin[1]) continue;
      const next = sampleGateExitResponse(pulse.age, this.save.reducedMotion).displacement;
      if (Math.abs(next) > Math.abs(displacement)) displacement = next;
    }
    const dx = portal.side === "left" ? -1 : portal.side === "right" ? 1 : 0;
    const dy = portal.side === "top" ? -1 : portal.side === "bottom" ? 1 : 0;
    this.ctx.save();
    this.ctx.translate(dx * board.cell * displacement, dy * board.cell * displacement);
    draw();
    this.ctx.restore();
  }

  private drawGateExitFlash(
    side: Side,
    offset: number,
    span: number,
    board: BoardLayout,
    strength: number,
    color: BlockColor,
    portal?: GatePortalSpec,
  ): void {
    const intensity = clampUnit(strength);
    if (intensity <= 0) return;
    const horizontal = side === "top" || side === "bottom";
    const outwardX = side === "right" ? 1 : side === "left" ? -1 : 0;
    const outwardY = side === "bottom" ? 1 : side === "top" ? -1 : 0;
    const tangentX = horizontal ? 1 : 0;
    const tangentY = horizontal ? 0 : 1;
    const portalAnchor = portal ? portalBoundaryAnchor(portal) : undefined;
    const centerX = portalAnchor
      ? board.innerX + portalAnchor[0] * board.cell
      : horizontal
        ? board.innerX + (offset + span / 2) * board.cell
        : side === "left" ? board.innerX : board.innerX + board.innerWidth;
    const centerY = portalAnchor
      ? board.innerY + portalAnchor[1] * board.cell
      : horizontal
        ? side === "top" ? board.innerY : board.innerY + board.innerHeight
        : board.innerY + (offset + span / 2) * board.cell;
    const halfSpan = span * board.cell * 0.42;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const style = COLOR_STYLE[color];
    ctx.shadowColor = style.light;
    ctx.shadowBlur = board.cell * (0.1 + intensity * 0.13);
    ctx.globalAlpha *= intensity * 0.86;
    // A shallow curtain of the exit's own colour sits on the inner lip.
    // Its depth stays bounded by cell size even for long apertures.
    ctx.save();
    ctx.transform(tangentX, tangentY, -outwardX, -outwardY, centerX, centerY);
    const depth = board.cell * (0.16 + intensity * 0.2);
    const glow = ctx.createLinearGradient(0, -board.cell * 0.08, 0, depth);
    const rgb = [1, 3, 5].map((offset) => parseInt(style.base.slice(offset, offset + 2), 16)).join(",");
    glow.addColorStop(0, `rgba(${rgb},0)`);
    glow.addColorStop(0.22, style.light);
    glow.addColorStop(0.48, `rgba(${rgb},.5)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(-halfSpan, -board.cell * 0.08, halfSpan * 2, depth + board.cell * 0.08);
    ctx.restore();
    ctx.strokeStyle = style.light;
    ctx.lineWidth = Math.max(2, board.cell * (0.025 + intensity * 0.025));
    ctx.beginPath();
    ctx.moveTo(centerX - tangentX * halfSpan, centerY - tangentY * halfSpan);
    ctx.lineTo(centerX + tangentX * halfSpan, centerY + tangentY * halfSpan);
    ctx.stroke();

    ctx.shadowBlur *= 0.6;
    ctx.strokeStyle = "rgba(255,255,255,.84)";
    ctx.lineWidth = Math.max(1, board.cell * 0.014);
    const rayPattern = [
      [-0.43, 0.32, -0.025],
      [-0.28, 0.58, 0.038],
      [-0.12, 0.4, -0.03],
      [0, 1, 0],
      [0.15, 0.46, 0.028],
      [0.3, 0.67, -0.042],
      [0.44, 0.34, 0.022],
    ] as const;
    for (const [position, lengthScale, skew] of rayPattern) {
      const spread = halfSpan * position * 2;
      const rayLength = board.cell * (0.09 + intensity * 0.19) * lengthScale;
      const startX = centerX + tangentX * spread - outwardX * board.cell * 0.01;
      const startY = centerY + tangentY * spread - outwardY * board.cell * 0.01;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX - outwardX * rayLength + tangentX * board.cell * skew,
        startY - outwardY * rayLength + tangentY * board.cell * skew,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGateIceStrip(
    side: Side,
    offset: number,
    size: number,
    board: BoardLayout,
    alpha: number,
    portal?: GatePortalSpec,
  ): boolean {
    if (!this.art.iceStrips) return false;
    return this.drawGateIceStripSegment(side, offset, size, board, alpha, portal);
  }

  private drawGateIceStripSegment(
    side: Side,
    offset: number,
    span: number,
    board: BoardLayout,
    alpha: number,
    portal?: GatePortalSpec,
  ): boolean {
    if (!this.art.iceStrips) return false;
    const authoredCell = 95;
    const scale = board.cell / authoredCell;
    const horizontal = side === "top" || side === "bottom";
    const portalRect = portal ? gatePortalVisualRect(portal, board) : undefined;
    const anchorX = portalRect
      ? horizontal
        ? portalRect.x
        : side === "left" ? portalRect.x + portalRect.width : portalRect.x
      : horizontal
        ? board.innerX + offset * board.cell
        : side === "left" ? board.innerX : board.innerX + board.innerWidth;
    const anchorY = portalRect
      ? horizontal
        ? side === "top" ? portalRect.y + portalRect.height : portalRect.y
        : portalRect.y
      : horizontal
        ? side === "top" ? board.innerY : board.innerY + board.innerHeight
        : board.innerY + offset * board.cell;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(111,239,255,.64)";
    ctx.shadowBlur = 5;
    ctx.translate(anchorX, anchorY);
    ctx.scale(scale, scale);
    const nativeSpan = Math.min(3, span) as NativeStripSpan;
    const image = (horizontal ? this.art.iceStrips.horizontal : this.art.iceStrips.vertical)[nativeSpan];
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const nominalSpan = span * authoredCell;
    if (span > 3) {
      const sourceLength = horizontal ? width : height;
      drawContinuousGateStrip(ctx, image, horizontal,
        horizontal ? (nativeSpan * authoredCell - width) / 2 : side === "left" ? -width : 0,
        horizontal && side === "top" ? -height : 0,
        nominalSpan + sourceLength - nativeSpan * authoredCell);
    } else if (horizontal) {
      const y = side === "top" ? -height : 0;
      ctx.drawImage(image, (nominalSpan - width) / 2, y);
    } else {
      const x = side === "left" ? -width : 0;
      ctx.drawImage(image, x, 0);
    }
    ctx.restore();
    return true;
  }

  private drawBlockIceStrip(cells: Point[], board: BoardLayout, alpha: number): boolean {
    if (!this.art.iceStrips || !cells.length) return false;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (cells.length !== width * height) return false;
    return this.drawFormalFrozenCells(cells, board, alpha);
  }

  private drawFormalWholeBlock(
    image: HTMLImageElement,
    match: FormalBlockShapeMatch,
    board: BoardLayout,
  ): void {
    this.drawFormalWholeBlockAt(
      image,
      match,
      board.cell,
      board.innerX + match.minX * board.cell,
      board.innerY + match.minY * board.cell,
    );
  }

  private drawStarBlockOverlay(
    match: FormalBlockShapeMatch,
    board: BoardLayout,
  ): boolean {
    const image = this.art.starBlocks?.[match.shapeId];
    if (!image) return false;
    // The gold triangle is a transparent, whole-piece overlay. Reuse the same
    // authored shape transform as the base block so every occupied cell stays
    // aligned, including rotated L/S/T pieces.
    this.ctx.save();
    this.ctx.globalAlpha *= 0.98;
    this.drawFormalWholeBlock(image, match, board);
    this.ctx.restore();
    return true;
  }

  private drawFormalWholeBlockAt(
    image: HTMLImageElement,
    match: FormalBlockShapeMatch,
    cell: number,
    originX: number,
    originY: number,
  ): void {
    const authoredCell = 95;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const sourceWidth = match.canonicalWidth * authoredCell;
    const sourceHeight = match.canonicalHeight * authoredCell;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(cell / authoredCell, cell / authoredCell);
    if (match.quarterTurns === 1) {
      ctx.translate(match.targetWidth * authoredCell, 0);
      ctx.rotate(Math.PI / 2);
    } else if (match.quarterTurns === 2) {
      ctx.translate(match.targetWidth * authoredCell, match.targetHeight * authoredCell);
      ctx.rotate(Math.PI);
    } else if (match.quarterTurns === 3) {
      ctx.translate(0, match.targetHeight * authoredCell);
      ctx.rotate(-Math.PI / 2);
    }
    // The supplied formal sprites can extend below their nominal grid to carry
    // the lower bevel/shadow. Bottom-align that artwork with occupied cells;
    // retain centering only for exact-size or near-exact legacy special art.
    const sourceY = imageHeight - sourceHeight >= 3
      ? sourceHeight - imageHeight
      : (sourceHeight - imageHeight) / 2;
    ctx.drawImage(image, (sourceWidth - imageWidth) / 2, sourceY);
    ctx.restore();
  }

  private formalSelectionBlockImage(
    block: BlockState,
    match: FormalBlockShapeMatch,
  ): HTMLImageElement | undefined {
    const color = block.layers[0] ?? block.color;
    const art = this.art.formalBlocks?.[color];
    if (!art) return undefined;
    return (block.layers.length > 1 ? art.shell[match.shapeId] : undefined)
      ?? art.solid[match.shapeId];
  }

  private drawSelectionFrameTiledEdge(
    image: HTMLImageElement,
    side: 0 | 1 | 2 | 3,
    start: Point,
    end: Point,
    sourceBorder: number,
  ): void {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const horizontal = side === 0 || side === 2;
    const length = horizontal ? Math.abs(end[0] - start[0]) : Math.abs(end[1] - start[1]);
    if (length <= 0.001) return;
    const sourceRun = horizontal ? imageWidth - sourceBorder * 2 : imageHeight - sourceBorder * 2;
    if (sourceRun <= 0) return;
    const destinationX = horizontal
      ? Math.min(start[0], end[0])
      : start[0] - (side === 1 ? sourceBorder : 0);
    const destinationY = horizontal
      ? start[1] - (side === 2 ? sourceBorder : 0)
      : Math.min(start[1], end[1]);
    let consumed = 0;
    while (consumed < length - 0.001) {
      const chunk = Math.min(sourceRun, length - consumed);
      if (horizontal) {
        this.ctx.drawImage(
          image,
          sourceBorder,
          side === 0 ? 0 : imageHeight - sourceBorder,
          chunk,
          sourceBorder,
          destinationX + consumed,
          destinationY,
          chunk,
          sourceBorder,
        );
      } else {
        this.ctx.drawImage(
          image,
          side === 3 ? 0 : imageWidth - sourceBorder,
          sourceBorder,
          sourceBorder,
          chunk,
          destinationX,
          destinationY + consumed,
          sourceBorder,
          chunk,
        );
      }
      consumed += chunk;
    }
  }

  private drawSelectionFrameCorner(
    image: HTMLImageElement,
    outgoingDirection: 0 | 1 | 2 | 3,
    point: Point,
    sourceBorder: number,
  ): void {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const sourceX = outgoingDirection === 0 || outgoingDirection === 3
      ? 0
      : imageWidth - sourceBorder;
    const sourceY = outgoingDirection === 0 || outgoingDirection === 1
      ? 0
      : imageHeight - sourceBorder;
    const destinationX = point[0] - (outgoingDirection === 1 || outgoingDirection === 2 ? sourceBorder : 0);
    const destinationY = point[1] - (outgoingDirection === 2 || outgoingDirection === 3 ? sourceBorder : 0);
    this.ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceBorder,
      sourceBorder,
      destinationX,
      destinationY,
      sourceBorder,
      sourceBorder,
    );
  }

  private drawFormalSelection(block: BlockState, cells: readonly Point[], board: BoardLayout): void {
    const image = this.art.formalSelectionFrame;
    if (!image || !cells.length) return;
    const authoredCell = 95;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const sourceBorder = Math.min(12, Math.floor((Math.min(imageWidth, imageHeight) - 1) / 2));
    const padding = Math.max(0, (imageWidth - authoredCell) / 2);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const targetWidth = maxX - minX + 1;
    const targetHeight = maxY - minY + 1;
    const match = matchFormalBlockShapeForLevel(cells, this.model.level.id);
    const blockImage = match ? this.formalSelectionBlockImage(block, match) : undefined;
    const bounds = match && blockImage
      ? formalSelectionFrameBounds(
        match,
        blockImage.naturalWidth || blockImage.width,
        blockImage.naturalHeight || blockImage.height,
        padding,
        authoredCell,
      )
      : {
        x: -padding,
        y: -padding,
        width: targetWidth * authoredCell + padding * 2,
        height: targetHeight * authoredCell + padding * 2,
      };
    const normalizedCells = cells.map(([x, y]) => [x - minX, y - minY] as const);
    const loops = traceSelectionFrameLoops(normalizedCells);
    const mapPoint = ([x, y]: Point): Point => [
      bounds.x + bounds.width * x / targetWidth,
      bounds.y + bounds.height * y / targetHeight,
    ];
    const direction = (start: Point, end: Point): 0 | 1 | 2 | 3 => {
      if (end[0] > start[0]) return 0;
      if (end[1] > start[1]) return 1;
      if (end[0] < start[0]) return 2;
      return 3;
    };
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(board.innerX + minX * board.cell, board.innerY + minY * board.cell);
    ctx.scale(board.cell / authoredCell, board.cell / authoredCell);
    for (const loop of loops) {
      const points = loop.map(mapPoint);
      const signedArea = points.reduce((area, point, index) => {
        const next = points[(index + 1) % points.length];
        return area + point[0] * next[1] - next[0] * point[1];
      }, 0);
      const clockwise = signedArea >= 0;
      const directions = points.map((point, index) => direction(point, points[(index + 1) % points.length]));
      const convex = points.map((_point, index) => {
        const incoming = directions[(index - 1 + directions.length) % directions.length];
        const outgoing = directions[index];
        const turn = (outgoing - incoming + 4) % 4;
        return clockwise ? turn === 1 : turn === 3;
      });
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const edgeDirection = directions[index];
        const unit: Point = edgeDirection === 0
          ? [1, 0]
          : edgeDirection === 1
            ? [0, 1]
            : edgeDirection === 2
              ? [-1, 0]
              : [0, -1];
        const nextIndex = (index + 1) % points.length;
        const startTrim = convex[index] ? sourceBorder : 0;
        const endTrim = convex[nextIndex] ? sourceBorder : 0;
        const start: Point = [point[0] + unit[0] * startTrim, point[1] + unit[1] * startTrim];
        const end: Point = [next[0] - unit[0] * endTrim, next[1] - unit[1] * endTrim];
        const side = (clockwise ? edgeDirection : (edgeDirection + 2) % 4) as 0 | 1 | 2 | 3;
        this.drawSelectionFrameTiledEdge(image, side, start, end, sourceBorder);
      });
      points.forEach((point, index) => {
        if (!convex[index]) return;
        const outgoing = directions[index];
        const cornerDirection = (clockwise ? outgoing : (outgoing + 3) % 4) as 0 | 1 | 2 | 3;
        this.drawSelectionFrameCorner(image, cornerDirection, point, sourceBorder);
      });
    }
    ctx.restore();
  }

  private drawFormalFrozenBlock(
    match: FormalBlockShapeMatch | undefined,
    board: BoardLayout,
    alpha: number,
  ): boolean {
    const image = match ? this.art.formalIceBlocks?.[match.shapeId] : undefined;
    if (!match || !image) return false;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(111,239,255,.72)";
    ctx.shadowBlur = 7;
    this.drawFormalWholeBlock(image, match, board);
    ctx.restore();
    return true;
  }

  private drawFormalFrozenCells(cells: readonly Point[], board: BoardLayout, alpha: number): boolean {
    const image = this.art.formalIceCell;
    if (!image || !cells.length) return false;
    const authoredCell = 95;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const scale = board.cell / authoredCell;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(111,239,255,.72)";
    ctx.shadowBlur = 7;
    ctx.scale(scale, scale);
    for (const [x, y] of cells) {
      const px = (board.innerX + x * board.cell) / scale;
      const py = (board.innerY + y * board.cell) / scale;
      ctx.drawImage(image, px + (authoredCell - imageWidth) / 2, py + authoredCell - imageHeight);
    }
    ctx.restore();
    return true;
  }

  private applyBlockInteractionTransform(block: BlockState, board: BoardLayout, selected: boolean): void {
    const cells = this.model.blockCells(block);
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
    if (visual) this.ctx.translate((visual.x - block.x) * board.cell, (visual.y - block.y) * board.cell);
    if (selected) this.ctx.translate(0, (this.save.reducedMotion ? -4 : -6) * (1 - settleProgress));
    if (selected && !this.save.reducedMotion) {
      const settle = Math.max(0, Math.min(1, 1 - this.grabFeedbackTime / 0.12));
      const heldScale = 0.985 + (1 - (1 - settle) ** 3) * 0.035;
      const scale = visual?.settling ? 1 + (heldScale - 1) * (1 - settleProgress) : heldScale;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-centerX, -centerY);
    }
    if (block.id === this.blockedBlockId && this.blockedFeedbackTime > 0) {
      const phase = 1 - this.blockedFeedbackTime / BLOCKED_FEEDBACK_DURATION;
      const scale = 1 - Math.sin(phase * Math.PI) * 0.055;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-centerX, -centerY);
    }
  }

  private drawSelectedBlockSelection(block: BlockState, board: BoardLayout): void {
    if (!this.art.formalSelectionFrame) return;
    const ctx = this.ctx;
    ctx.save();
    this.applyBlockInteractionTransform(block, board, true);
    this.drawFormalSelection(block, this.model.blockCells(block), board);
    ctx.restore();
  }

  private latestNumericIcePulse(blockId: string): MechanicPulse | undefined {
    for (let index = this.mechanicPulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.mechanicPulses[index];
      if (pulse.targetId === blockId && pulse.iceFracture) return pulse;
    }
    return undefined;
  }

  private drawBlock(block: BlockState, board: BoardLayout, selected: boolean, hinted = false): void {
    const ctx = this.ctx;
    const icePulse = this.latestNumericIcePulse(block.id);
    const fractureSample = icePulse?.iceFracture
      ? sampleNumericIceFracture(icePulse.iceFracture, icePulse.age)
      : undefined;
    const displayedFrozen = icePulse && fractureSample?.counter.showPrevious
      ? icePulse.previous
      : block.frozen;
    const availability = blockAvailabilityVisual(displayedFrozen);
    const color = block.layers[0] ?? block.color;
    const cells = this.model.blockCells(block);
    const [badgeX, badgeY] = chooseBlockBadgeCell(cells);
    const blockedFeedback = block.id === this.blockedBlockId && this.blockedFeedbackTime > 0;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    ctx.save();
    this.applyBlockInteractionTransform(block, board, selected);
    const nudgeFeedback = hinted && !blockedFeedback && !selected;
    const feedbackArt = nudgeFeedback || (selected && !this.art.formalSelectionFrame)
      ? this.art.blockGrabHalo
      : undefined;
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
    const shapeMatch = matchFormalBlockShapeForLevel(cells, this.model.level.id);
    const layered = block.layers.length > 1;
    let usedFormalWholeBlock = false;
    let usedFormalShell = false;
    ctx.save();
    ctx.globalAlpha *= availability.baseAlpha;
    ctx.save();
    ctx.shadowColor = selected ? "rgba(255,255,255,.72)" : "rgba(2,1,15,.72)";
    ctx.shadowBlur = selected ? 8 : 7;
    ctx.shadowOffsetY = selected ? 0 : 4;
    if (shapeMatch && this.art.formalBlocks) {
      if (layered) {
        const innerColor = block.layers[1];
        const inner = this.art.formalBlocks[innerColor]?.solid[shapeMatch.shapeId];
        const shell = this.art.formalBlocks[color]?.shell[shapeMatch.shapeId];
        if (inner && shell) {
          this.drawFormalWholeBlock(inner, shapeMatch, board);
          this.drawFormalWholeBlock(shell, shapeMatch, board);
          usedFormalWholeBlock = true;
          usedFormalShell = true;
        }
        if (!usedFormalWholeBlock) {
          const outer = this.art.formalBlocks[color]?.solid[shapeMatch.shapeId];
          if (outer) {
            this.drawFormalWholeBlock(outer, shapeMatch, board);
            usedFormalWholeBlock = true;
          }
        }
      } else {
        const solid = this.art.formalBlocks[color]?.solid[shapeMatch.shapeId];
        if (solid) {
          this.drawFormalWholeBlock(solid, shapeMatch, board);
          usedFormalWholeBlock = true;
        }
      }
    }
    ctx.restore();

    if (layered && !usedFormalShell) {
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

    if (displayedFrozen > 0) {
      const x = board.innerX + minX * board.cell + 1;
      const y = board.innerY + minY * board.cell + 1;
      const width = (maxX - minX + 1) * board.cell - 2;
      const height = (maxY - minY + 1) * board.cell - 2;
      if (!this.drawFormalFrozenBlock(shapeMatch, board, availability.overlayAlpha)
        && !this.drawFormalFrozenCells(cells, board, availability.overlayAlpha)
        && !this.drawBlockIceStrip(cells, board, availability.overlayAlpha)) {
        this.drawIceSurface(x, y, width, height, availability.overlayAlpha);
      }
      this.label(`${displayedFrozen}`, x + width / 2, y + height / 2 + 8, 28, "white", "center", 1000, "#6a4251", 4);
    }
    if (block.star) {
      const overlayDrawn = shapeMatch ? this.drawStarBlockOverlay(shapeMatch, board) : false;
      if (!overlayDrawn) {
        this.drawStarMark(
          board.innerX + (badgeX + 0.5) * board.cell,
          board.innerY + (badgeY + 0.5) * board.cell,
          board.cell * 0.62,
        );
      }
    }
    this.drawBlockMechanicMarkers(block, cells, board);
    ctx.restore();
  }

  private drawBlockMechanicMarkers(block: BlockState, cells: Point[], board: BoardLayout): void {
    const art = this.art.videoParity;
    const lockTransition = this.revisedTransitions.find((item) => item.kind === "lock" && item.targetId === block.id);
    const pendingLock = lockTransition && !sampleRevisedKeyUnlock(lockTransition.age, this.save.reducedMotion).arrived
      ? lockTransition : undefined;
    const hasFormalMarker = Boolean(block.movementAxis || block.keyId || block.lockedBy || pendingLock);
    const hasProgrammaticMarker = block.timedBombSeconds !== undefined || Boolean(block.rotationBadge);
    if ((!hasFormalMarker && !hasProgrammaticMarker) || cells.length === 0) return;
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const centerX = board.innerX + (minX + maxX + 1) * board.cell / 2;
    const centerY = board.innerY + (minY + maxY + 1) * board.cell / 2;
    const keyLockCenterYOffset = keyLockMarkerVerticalOffset(board.cell);
    const ctx = this.ctx;

    const axisImage = block.movementAxis
      ? this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.axis[block.movementAxis]) : undefined;
    if (axisImage) {
      // The supplied horizontal/vertical marks have distinct silhouettes: do
      // not rotate the old temporary single-arrow texture to fake the other.
      const scale = board.cell * 0.78 / Math.max(axisImage.width, axisImage.height);
      ctx.drawImage(axisImage, centerX - axisImage.width * scale / 2,
        centerY - axisImage.height * scale / 2, axisImage.width * scale, axisImage.height * scale);
    } else if (block.movementAxis && art) {
      const size = board.cell * (cells.length === 1 ? 0.66 : 0.78);
      ctx.save();
      ctx.globalAlpha *= 0.96;
      ctx.translate(centerX, centerY);
      if (block.movementAxis === "vertical") ctx.rotate(Math.PI / 2);
      ctx.drawImage(art.movementAxis, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    if (block.keyId && art) {
      const markerColor = keyLockMarkerColor(block.keyId, this.model.level);
      const keyImage = art.keyTokens[markerColor] ?? art.keyToken;
      const height = board.cell * (block.movementAxis ? 0.48 : 0.66);
      const width = height * markerAspectRatio(keyImage);
      const x = board.innerX + (minX + 0.5) * board.cell;
      const y = board.innerY + (maxY + 0.5) * board.cell + keyLockCenterYOffset;
      ctx.drawImage(keyImage, x - width / 2, y - height / 2, width, height);
    }

    if ((block.lockedBy || pendingLock) && art) {
      const remainingLockCount = pendingLock?.previousCount ?? block.lockCount ?? 1;
      const markerColor = pendingLock?.color ?? keyLockMarkerColor(block.lockedBy!, this.model.level);
      const lockImage = art.chainLocks[markerColor] ?? art.chainLock;
      const height = board.cell * 0.78;
      const width = height * markerAspectRatio(lockImage);
      ctx.save();
      ctx.shadowColor = "rgba(14,3,48,.88)";
      ctx.shadowBlur = board.cell * 0.12;
      ctx.drawImage(
        lockImage,
        centerX - width / 2,
        centerY + keyLockCenterYOffset - height / 2,
        width,
        height,
      );
      ctx.restore();
      this.label(
        `${remainingLockCount}`,
        centerX,
        centerY + keyLockCenterYOffset
          + board.cell * (0.17 + KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS)
          + KEY_LOCK_COUNT_VERTICAL_OFFSET_PX,
        Math.max(16, board.cell * 0.34),
        "white",
        "center",
        900,
        "#261350",
        Math.max(2, board.cell * 0.045),
      );
    }

    const markerRadius = Math.max(10, Math.min(20, board.cell * 0.255));
    const oneCellWithBothMarkers = minX === maxX
      && minY === maxY
      && block.timedBombSeconds !== undefined
      && block.rotationBadge;
    const topCellY = board.innerY + (minY + 0.5) * board.cell;
    const rotationX = board.innerX + (minX + 0.5) * board.cell
      - (oneCellWithBothMarkers ? board.cell * 0.18 : 0);
    const bombX = board.innerX + (maxX + 0.5) * board.cell
      + (oneCellWithBothMarkers ? board.cell * 0.18 : 0);

    if (block.rotationBadge) {
      const rotationY = topCellY;
      ctx.save();
      ctx.fillStyle = "rgba(32,18,82,.9)";
      ctx.strokeStyle = "rgba(123,245,255,.98)";
      ctx.lineWidth = Math.max(2, markerRadius * 0.14);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.arc(rotationX, rotationY, markerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const arcRadius = markerRadius * 0.54;
      const arrowSize = markerRadius * 0.25;
      ctx.strokeStyle = "white";
      ctx.lineWidth = Math.max(1.8, markerRadius * 0.13);
      ctx.beginPath();
      ctx.arc(rotationX, rotationY, arcRadius, Math.PI * 1.12, Math.PI * 1.92);
      ctx.stroke();
      const upperTipX = rotationX + Math.cos(Math.PI * 1.92) * arcRadius;
      const upperTipY = rotationY + Math.sin(Math.PI * 1.92) * arcRadius;
      ctx.beginPath();
      ctx.moveTo(upperTipX - arrowSize, upperTipY - arrowSize * 0.15);
      ctx.lineTo(upperTipX, upperTipY);
      ctx.lineTo(upperTipX - arrowSize * 0.15, upperTipY + arrowSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rotationX, rotationY, arcRadius, Math.PI * 0.12, Math.PI * 0.92);
      ctx.stroke();
      const lowerTipX = rotationX + Math.cos(Math.PI * 0.92) * arcRadius;
      const lowerTipY = rotationY + Math.sin(Math.PI * 0.92) * arcRadius;
      ctx.beginPath();
      ctx.moveTo(lowerTipX + arrowSize, lowerTipY + arrowSize * 0.15);
      ctx.lineTo(lowerTipX, lowerTipY);
      ctx.lineTo(lowerTipX + arrowSize * 0.15, lowerTipY - arrowSize);
      ctx.stroke();
      ctx.restore();
    }

    if (block.timedBombSeconds !== undefined) {
      const face = this.revisedMechanismImage(REVISED_MECHANISM_ART_URLS.bombFace);
      if (face) {
        const height = board.cell * 0.76;
        const width = height * face.width / face.height;
        ctx.drawImage(face, centerX - width / 2, centerY - height / 2, width, height);
        // Face and digits are separate; the reference face is static. There is
        // no supplied zero/explosion sample from which to invent a flash.
        this.label(`${Math.ceil(Math.max(0, block.timedBombSeconds))}`, centerX,
          centerY + height * 0.12, board.cell * 0.28, "white", "center", 900, "#10203e", 1);
        return;
      }
      const bombY = topCellY;
      const displaySeconds = Math.ceil(Math.max(0, block.timedBombSeconds));
      ctx.save();
      ctx.fillStyle = "rgba(77,12,36,.94)";
      ctx.strokeStyle = "#ffb74f";
      ctx.lineWidth = Math.max(2, markerRadius * 0.14);
      ctx.beginPath();
      ctx.arc(bombX, bombY, markerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      this.label(
        `${displaySeconds}`,
        bombX,
        bombY + markerRadius * 0.05,
        Math.max(14, markerRadius * 0.94),
        "white",
        "center",
        1000,
        "#451028",
        Math.max(2, markerRadius * 0.13),
      );
    }
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

  private drawShellPeel(ghost: ExitGhost, board: BoardLayout): void {
    const sample = sampleShellPeel(ghost.age, ghost.shellReducedMotion);
    if (sample.materialAlpha <= 0) return;
    const cells = ghost.block.shape.map(([x, y]) => [ghost.block.x + x, ghost.block.y + y] as Point);
    const match = matchFormalBlockShapeForLevel(cells, this.model.level.id);
    const shell = match && this.art.formalBlocks?.[ghost.color ?? ghost.block.color]?.shell[match.shapeId];
    if (!match || !shell) return;
    const ctx = this.ctx;
    const distance = (ghost.travelCells ?? 1) * board.cell * sample.travelProgress;
    const outX = ghost.side === "left" ? -1 : ghost.side === "right" ? 1 : 0;
    const outY = ghost.side === "top" ? -1 : ghost.side === "bottom" ? 1 : 0;
    const clipCells = connectedBoardCompartment(this.model.snapshot(), cells, ghost.portal);
    ctx.save();
    ctx.beginPath();
    for (const [x, y] of clipCells) {
      ctx.rect(board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
    }
    ctx.clip();
    ctx.translate(outX * distance, outY * distance);
    // Draw only the supplied hollow shell, never another copy of its core.
    this.drawFormalWholeBlock(shell, match, board);
    if (sample.glint > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= sample.glint;
      this.drawFormalWholeBlock(shell, match, board);
    }
    ctx.restore();
  }

  private drawExitGhost(ghost: ExitGhost, board: BoardLayout): void {
    if (ghost.mode === "shell") {
      this.drawShellPeel(ghost, board);
      return;
    }
    const ctx = this.ctx;
    if (ghost.mode === "rocket") {
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
      return;
    }

    const ingestDuration = ghost.ingestDuration ?? GATE_EXIT_INGEST_DURATION;
    const progress = clampUnit(ghost.age / ingestDuration);
    const distance = board.cell * (ghost.travelCells ?? 1) * gateExitTravel(progress);
    const vector: Record<Side, readonly [number, number]> = {
      top: [0, -distance], right: [distance, 0], bottom: [0, distance], left: [-distance, 0],
    };
    const baseX = Math.round(ghost.alignedX ?? ghost.block.x);
    const baseY = Math.round(ghost.alignedY ?? ghost.block.y);
    const visualX = ghost.side === "top" || ghost.side === "bottom"
      ? baseX
      : ghost.block.x;
    const visualY = ghost.side === "left" || ghost.side === "right"
      ? baseY
      : ghost.block.y;
    // Formal whole-piece matching is intentionally grid-based. Keep an integer
    // render block even if a future animation supplies a sub-cell normal-axis
    // offset; the canvas transform owns that visual displacement.
    const renderBlock: BlockState = {
      ...ghost.block,
      x: baseX,
      y: baseY,
    };
    const snapshot = this.model.snapshot();
    const sourceCells = renderBlock.shape.map(([dx, dy]) => [baseX + dx, baseY + dy] as Point);
    const clipCells = connectedBoardCompartment(snapshot, sourceCells, ghost.portal);
    ctx.save();
    ctx.beginPath();
    for (const [x, y] of clipCells) {
      ctx.rect(board.innerX + x * board.cell, board.innerY + y * board.cell, board.cell, board.cell);
    }
    ctx.clip();
    ctx.translate(
      vector[ghost.side][0] + (visualX - baseX) * board.cell,
      vector[ghost.side][1] + (visualY - baseY) * board.cell,
    );
    this.drawBlock(renderBlock, board, false);
    // The reference keeps the just-released piece's white pickup frame for
    // one short beat before the body disappears behind the gate.
    if (this.art.formalSelectionFrame && ghost.age < Math.min(0.1, ingestDuration * 0.78)) {
      this.drawFormalSelection(renderBlock, this.model.blockCells(renderBlock), board);
    }
    ctx.restore();
  }

  private drawShutter(x: number, y: number, width: number, height: number, count: number, board: BoardLayout): void {
    const rect = projectShutterVisualRect(x, y, width, height, board);
    const counter = shutterCounterLayout(rect);
    this.drawShutterSurface(rect.x, rect.y, rect.width, rect.height);
    this.drawPill(counter.x, counter.y, counter.width, counter.height, "#4a298f", "#ffad2e", 15);
    this.label(
      `${count}`,
      counter.centerX,
      counter.centerY + counter.labelSize * 0.28,
      counter.labelSize,
      "#fff0c6",
      "center",
      1000,
    );
  }

  private drawLiftFrame(x: number, y: number, width: number, height: number, board: BoardLayout): void {
    const image = this.art.videoParity?.liftFrame;
    if (!image) return;
    const inset = Math.max(2, board.cell * 0.035);
    const px = board.innerX + x * board.cell + inset;
    const py = board.innerY + y * board.cell + inset;
    const w = width * board.cell - inset * 2;
    const h = height * board.cell - inset * 2;
    const border = Math.max(7, Math.min(board.cell * 0.18, Math.min(w, h) * 0.3));
    this.ctx.save();
    this.ctx.shadowColor = "rgba(255,191,46,.62)";
    this.ctx.shadowBlur = Math.max(4, board.cell * 0.1);
    // The source has a transparent center. Nine-slicing preserves that opening,
    // so the current lift layer remains fully readable and interactive.
    this.drawNineSlice(image, px, py, w, h, 112, border);
    this.ctx.restore();
  }

  private drawStagedFrame(x: number, y: number, width: number, height: number, board: BoardLayout): void {
    const image = this.art.videoParity?.stagedFrame;
    if (!image) return;
    const inset = Math.max(2, board.cell * 0.035);
    const px = board.innerX + x * board.cell + inset;
    const py = board.innerY + y * board.cell + inset;
    const w = width * board.cell - inset * 2;
    const h = height * board.cell - inset * 2;
    const border = Math.max(7, Math.min(board.cell * 0.18, Math.min(w, h) * 0.3));
    this.ctx.save();
    this.ctx.shadowColor = "rgba(102,235,255,.58)";
    this.ctx.shadowBlur = Math.max(4, board.cell * 0.1);
    this.drawNineSlice(image, px, py, w, h, 63, border);
    this.ctx.restore();
  }

  private drawFormalBlockPreview(
    block: BlockState,
    centerX: number,
    centerY: number,
    maxWidth: number,
    maxHeight: number,
  ): boolean {
    const match = matchFormalBlockShapeForLevel(block.shape, this.model.level.id);
    const color = block.layers[0] ?? block.color;
    const image = match && this.art.formalBlocks?.[color]?.solid[match.shapeId];
    if (!match || !image) return false;
    const cell = Math.max(3, Math.min(
      maxWidth / match.targetWidth,
      maxHeight / match.targetHeight,
    ));
    this.drawFormalWholeBlockAt(
      image,
      match,
      cell,
      centerX - match.targetWidth * cell / 2,
      centerY - match.targetHeight * cell / 2,
    );
    return true;
  }

  private drawGenerator(
    x: number,
    y: number,
    width: number,
    height: number,
    count: number,
    board: BoardLayout,
    preview?: BlockState,
  ): void {
    const px = board.innerX + x * board.cell;
    const py = board.innerY + y * board.cell;
    const w = width * board.cell;
    const h = height * board.cell;
    this.drawAtlasCell(this.art.progressionMechanics, 0, ART_ATLASES.progressionMechanics, { x: px, y: py, width: w, height: h });
    if (!preview) {
      this.label(`${count}`, px + w / 2, py + h * 0.53, Math.max(20, Math.min(32, board.cell * 0.7)), "#fff4cf", "center", 1000, "#371061", 4);
      return;
    }

    const previewWidth = w * 0.5;
    const previewHeight = h * 0.44;
    this.drawFormalBlockPreview(
      preview,
      px + w / 2,
      py + h * 0.12 + previewHeight / 2,
      previewWidth,
      previewHeight,
    );
    this.label(`${count}`, px + w / 2, py + h * 0.76, Math.max(15, Math.min(24, board.cell * 0.48)), "#fff4cf", "center", 1000, "#371061", 3);
  }

  private drawIndependentGenerator(
    generator: PuzzleSnapshot["generators"][number],
    preview: BlockState | undefined,
    board: BoardLayout,
  ): void {
    const geometry = projectGeneratorRimGeometry(
      this.generatorRimGeometry(generator),
      board,
    );
    const vertical = Math.abs(Math.sin(geometry.rotation)) > 0.5;
    const image = vertical
      ? this.art.videoParity?.sideGeneratorVertical ?? this.art.videoParity?.sideGenerator
      : this.art.videoParity?.sideGenerator;
    if (!image) return;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const deviceSpan = board.cell * GENERATOR_RIM_METRICS.span;
    const exhausted = this.revisedTransitions.find((item) => item.kind === "generator" && item.targetId === generator.id);
    const breakState = exhausted ? sampleRevisedGeneratorExhaustion(exhausted.age, this.save.reducedMotion) : undefined;
    if (breakState && breakState.bodyAlpha === 0) {
      // Native chassis fragments only: no resizing/fading of the emitted cargo.
      const width = vertical ? deviceSpan * sourceWidth / sourceHeight : deviceSpan;
      const height = vertical ? deviceSpan : deviceSpan * sourceHeight / sourceWidth;
      const originX = vertical ? 0 : -width / 2;
      const originY = vertical ? -height / 2 : -height;
      this.ctx.save();
      this.ctx.translate(geometry.anchor.x, geometry.anchor.y);
      if (vertical && geometry.rotation < 0) this.ctx.scale(-1, 1);
      if (!vertical) this.ctx.rotate(geometry.rotation);
      this.ctx.globalAlpha *= breakState.fragmentAlpha;
      for (let row = 0; row < 3; row += 1) for (let col = 0; col < 6; col += 1) {
        const progress = breakState.fragmentProgress;
        const dx = (col - 2.5) * board.cell * progress * 0.28;
        const dy = (row - 1.6) * board.cell * progress * 0.34 + board.cell * progress * progress * 0.3;
        this.ctx.save();
        this.ctx.translate(originX + (col + 0.5) * width / 6 + dx, originY + (row + 0.5) * height / 3 + dy);
        this.ctx.rotate(((col + row) % 2 ? 1 : -1) * progress * 0.65);
        this.ctx.drawImage(image, col * sourceWidth / 6, row * sourceHeight / 3, sourceWidth / 6, sourceHeight / 3,
          -width / 12, -height / 6, width / 6, height / 3);
        this.ctx.restore();
      }
      this.ctx.restore();
      return;
    }
    this.ctx.save();
    if (vertical) {
      // The vertical cut-out is authored in its final screen orientation. It
      // spans the three reserved rails and grows away from the left/right rim;
      // mirror the left mount so its bevel remains on the outside edge.
      const deviceHeight = deviceSpan;
      const deviceWidth = deviceHeight * sourceWidth / Math.max(1, sourceHeight);
      const rightMounted = geometry.rotation > 0;
      this.ctx.translate(geometry.anchor.x, geometry.anchor.y);
      if (!rightMounted) this.ctx.scale(-1, 1);
      this.ctx.drawImage(image, 0, -deviceHeight / 2, deviceWidth, deviceHeight);
    } else {
      // The horizontal cut-out is authored top-facing. Rotating this native
      // orientation keeps the top/bottom bevels and the three-cell alignment
      // intact without stretching the supplied aspect ratio.
      const deviceWidth = deviceSpan;
      const deviceHeight = deviceWidth * sourceHeight / Math.max(1, sourceWidth);
      this.ctx.translate(geometry.anchor.x, geometry.anchor.y);
      this.ctx.rotate(geometry.rotation);
      this.ctx.drawImage(image, -deviceWidth / 2, -deviceHeight, deviceWidth, deviceHeight);
    }
    this.ctx.restore();

    // The original timed-feeder bitmap is 4:3. Keep it as a contained status
    // plate on the shared 3-cell chassis instead of stretching it to 3×1.35.
    if (generator.trigger === "time" && this.art.videoParity?.timedFeeder) {
      const plate = this.art.videoParity.timedFeeder;
      const plateHeight = board.cell * 0.66;
      const sourceWidth = plate.naturalWidth || plate.width;
      const sourceHeight = plate.naturalHeight || plate.height;
      const plateWidth = plateHeight * sourceWidth / Math.max(1, sourceHeight);
      this.ctx.save();
      this.ctx.translate(geometry.anchor.x, geometry.anchor.y);
      this.ctx.rotate(geometry.rotation);
      this.ctx.drawImage(
        plate,
        -plateWidth / 2,
        -board.cell * 0.76,
        plateWidth,
        plateHeight,
      );
      this.ctx.restore();
    }

    if (preview) {
      this.drawFormalBlockPreview(
        preview,
        geometry.previewAnchor.x,
        geometry.previewAnchor.y,
        board.cell * 0.66,
        board.cell * 0.52,
      );
    }

    // The formal generator skins already contain a dedicated cyan counter
    // cell. Draw only the glyph inside that authored cell: adding a generic
    // pill here both covered the artwork and left the number floating over
    // the preview window on vertical machines.
    this.label(
      `${generator.remaining}`,
      geometry.countAnchor.x,
      geometry.countAnchor.y,
      Math.max(12, board.cell * 0.34),
      "#a8ffff",
      "center",
      1000,
      "#183477",
      Math.max(2, board.cell * 0.045),
      board.cell * 0.44,
    );
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
    const alpha = Math.sin(progress * Math.PI) * 0.92;
    const board = this.boardLayout();
    const targets = pulse.target === "gate" && pulse.gatePortals?.length
      ? pulse.gatePortals.map((portal) => {
          const rect = gatePortalVisualRect(portal, board);
          return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            width: rect.width,
            height: rect.height,
          };
        })
      : [{ x: pulse.x, y: pulse.y, width: pulse.width, height: pulse.height }];
    for (const target of targets) {
      const x = pulse.sourceX + (target.x - pulse.sourceX) * eased;
      const y = pulse.sourceY + (target.y - pulse.sourceY) * eased;
      const size = Math.min(38, Math.max(24, Math.min(target.width, target.height) * 0.82));
      const angle = Math.atan2(target.y - pulse.sourceY, target.x - pulse.sourceX) + Math.PI / 4;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      this.ctx.drawImage(art, -size / 2, -size / 2, size, size);
      this.ctx.restore();
    }
  }

  private mechanicPulseLabel(pulse: MechanicPulse): string {
    if (pulse.kind === "ice") return this.tr("gameplay.pulse.thawed");
    if (pulse.kind === "layer") return this.tr("gameplay.pulse.shellRemoved");
    if (pulse.kind === "conveyor") return this.tr("gameplay.pulse.conveyorAdvanced");
    if (pulse.shutterSkin === "generator") return this.tr("gameplay.pulse.cargoReleased");
    if (pulse.shutterSkin === "lift") return this.tr("gameplay.pulse.liftOpened");
    if (pulse.shutterSkin === "staged-frame") return this.tr("gameplay.pulse.frameReleased");
    return this.tr("gameplay.pulse.shutterOpened");
  }

  /** Render a terminal frozen-exit break without promoting the gate above the board rim. */
  private drawGateNumericIceFracture(pulse: MechanicPulse): void {
    const fracture = pulse.iceFracture;
    if (!fracture || fracture.intensity !== "shatter" || pulse.age < 0) return;
    const snapshot = this.model.snapshot();
    const gate = snapshot.gates.find((candidate) => candidate.id === pulse.targetId)
      ?? snapshot.flipDoors.find((candidate) => candidate.id === pulse.targetId);
    const portals = pulse.gatePortals?.length
      ? pulse.gatePortals
      : gate ? [...gatePortals(snapshot, gate)] : [];
    if (!portals.length) return;
    const board = this.boardLayout();
    const ctx = this.ctx;
    for (const [portalIndex, portal] of portals.entries()) {
      const side = portal.side;
      const offset = portalTangentOffset(portal);
      const size = portal.size;
      // A shared logical gate can expose differently sized physical mouths.
      // Build each mouth at its own cell count so a one-cell portal receives a
      // one-cell fracture density instead of all fragments from the widest one.
      const portalFracture = size === fracture.cellCount
        ? fracture
        : buildNumericIceFracture({
            seed: fracture.seed ^ Math.imul(portalIndex + 1, 0x9e3779b1),
            cellCount: size,
            reducedMotion: fracture.reducedMotion,
            intensity: fracture.intensity,
          });
      const sample = sampleNumericIceFracture(portalFracture, pulse.age);
      if (sample.finished) continue;
      const rect = this.gateRect(side, offset, size, board, portal);
      const horizontal = side === "top" || side === "bottom";
      const tangentScale = board.cell;
      const normalScale = horizontal ? rect.height : rect.width;
    const localPoint = (cellIndex: number, x: number, y: number): [number, number] => {
      const index = ((cellIndex % size) + size) % size;
      const point = projectGateIceParticle({ side, cellIndex: index, origin: { x, y },
        velocity: { x: 0, y: 0 }, age: 0, cellSize: board.cell, normalSize: normalScale });
      return horizontal
        ? [rect.x + point.tangent, rect.y + rect.height / 2 + point.normal]
        : [rect.x + rect.width / 2 + point.normal, rect.y + point.tangent];
    };
    const movingPoint = (
      cellIndex: number,
      x: number,
      y: number,
      velocityX: number,
      velocityY: number,
      age: number,
      gravity = 0,
    ): [number, number] => {
      const point = projectGateIceParticle({ side, cellIndex,
        origin: { x, y }, velocity: { x: velocityX, y: velocityY }, gravity,
        age, cellSize: board.cell, normalSize: normalScale });
      return horizontal
        ? [rect.x + point.tangent, rect.y + rect.height / 2 + point.normal]
        : [rect.x + rect.width / 2 + point.normal, rect.y + point.tangent];
    };

    // Keep the ice readable for the opening frames, then let it clear as the
    // fragments leave. The active gate underneath is never reordered.
    const iceAlpha = sample.iceSheetAlpha;
    if (iceAlpha > 0.001) {
      const continuousLv17 = this.model.level.id === 17
        && !gate?.portals?.length
        && side === "bottom"
        && offset === 0
        && size === 6
        && gate?.color === "yellow";
      if (!continuousLv17 || !this.drawLv17ContinuousIceStrip(side, offset, size, board, iceAlpha)) {
        this.drawGateIceStrip(side, offset, size, board, iceAlpha, portal);
      }
    }

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    // Keep the last frozen counter readable through the first crack frames,
    // then let it leave with the ice rather than popping off on the state tick.
    const counterFade = sample.counter.showPrevious
      ? 1
      : Math.max(0, 1 - easeOutCubic(sample.progress / 0.24));
    if (counterFade > 0.001) {
      const counter = this.frozenGateCounterPosition(side, rect, board);
      ctx.save();
      ctx.globalAlpha *= counterFade;
      this.label(`${pulse.previous}`, counter.x, counter.y, 23, "#633545", "center", 1000, "white", 3);
      ctx.restore();
    }
    if (sample.flashAlpha > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = sample.flashAlpha * (this.save.reducedMotion ? 0.48 : 0.76);
      ctx.translate(centerX, centerY);
      ctx.scale(rect.width / 2 + board.cell * 0.18, rect.height / 2 + board.cell * 0.18);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, "rgba(246,255,255,.92)");
      glow.addColorStop(0.25, "rgba(120,239,255,.78)");
      glow.addColorStop(1, "rgba(15,118,225,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const crack of sample.cracks) {
      if (!crack.visible) continue;
      const start = localPoint(crack.geometry.cellIndex, crack.geometry.start.x, crack.geometry.start.y);
      const elbow = localPoint(crack.geometry.cellIndex, crack.geometry.elbow.x, crack.geometry.elbow.y);
      const end = localPoint(crack.geometry.cellIndex, crack.geometry.end.x, crack.geometry.end.y);
      ctx.save();
      ctx.globalAlpha = crack.alpha * 0.92;
      ctx.strokeStyle = "#efffff";
      ctx.shadowColor = "#46ddff";
      ctx.shadowBlur = 5;
      ctx.lineWidth = Math.max(1, Math.min(rect.width, rect.height) * 0.06);
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      if (crack.reveal <= 0.5) {
        const reveal = crack.reveal * 2;
        ctx.lineTo(start[0] + (elbow[0] - start[0]) * reveal, start[1] + (elbow[1] - start[1]) * reveal);
      } else {
        const reveal = (crack.reveal - 0.5) * 2;
        ctx.lineTo(elbow[0], elbow[1]);
        ctx.lineTo(elbow[0] + (end[0] - elbow[0]) * reveal, elbow[1] + (end[1] - elbow[1]) * reveal);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    const shardTints = [
      ["#f4ffff", "#5feaff", "#0870c3"],
      ["#d8fbff", "#36cfff", "#0756ad"],
      ["#b9f5ff", "#22aeee", "#073c91"],
    ] as const;
    for (const shard of sample.shards) {
      if (!shard.visible) continue;
      const geometry = shard.geometry;
      const age = Math.max(0, sample.age - portalFracture.timing.counterRevealAt - geometry.delay);
      const [x, y] = movingPoint(
        geometry.cellIndex,
        geometry.origin.x,
        geometry.origin.y,
        geometry.velocity.x,
        geometry.velocity.y,
        age,
        geometry.gravity,
      );
      const tint = shardTints[geometry.tint];
      const scaleX = horizontal ? tangentScale : normalScale;
      const scaleY = horizontal ? normalScale : tangentScale;
      ctx.save();
      ctx.globalAlpha = shard.alpha;
      ctx.translate(x, y);
      ctx.rotate(shard.rotation);
      ctx.scale(shard.scale, shard.scale);
      ctx.shadowColor = "rgba(4,67,151,.72)";
      ctx.shadowBlur = Math.max(2, Math.min(rect.width, rect.height) * 0.11);
      const fill = ctx.createLinearGradient(0, -normalScale * 0.1, 0, normalScale * 0.12);
      fill.addColorStop(0, tint[0]);
      fill.addColorStop(0.28, tint[1]);
      fill.addColorStop(1, tint[2]);
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#07529d";
      ctx.lineWidth = Math.max(0.8, Math.min(rect.width, rect.height) * 0.018);
      ctx.beginPath();
      geometry.vertices.forEach((vertex, index) => {
        const px = vertex.x * scaleX;
        const py = vertex.y * scaleY;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha *= 0.78;
      ctx.strokeStyle = "#efffff";
      ctx.lineWidth = Math.max(0.55, Math.min(rect.width, rect.height) * 0.01);
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x * scaleX, geometry.vertices[0].y * scaleY);
      ctx.lineTo(geometry.vertices[1].x * scaleX, geometry.vertices[1].y * scaleY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const speck of sample.specks) {
      if (!speck.visible) continue;
      const geometry = speck.geometry;
      const age = Math.max(0, sample.age - portalFracture.timing.counterRevealAt - geometry.delay);
      const [x, y] = movingPoint(geometry.cellIndex, geometry.origin.x, geometry.origin.y, geometry.velocity.x, geometry.velocity.y, age);
      const radius = Math.max(0.8, speck.radius * Math.min(tangentScale, Math.max(6, normalScale)));
      ctx.save();
      ctx.globalAlpha = speck.alpha;
      ctx.shadowColor = "#78f4ff";
      ctx.shadowBlur = radius * 2.4;
      if (geometry.kind === "glint") {
        ctx.strokeStyle = "#f4ffff";
        ctx.lineWidth = Math.max(0.8, radius * 0.42);
        ctx.beginPath();
        ctx.moveTo(x - radius * 2.2, y);
        ctx.lineTo(x + radius * 2.2, y);
        ctx.moveTo(x, y - radius * 2.2);
        ctx.lineTo(x, y + radius * 2.2);
        ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
        glow.addColorStop(0, "rgba(255,255,255,1)");
        glow.addColorStop(0.35, "rgba(107,239,255,.95)");
        glow.addColorStop(1, "rgba(18,143,239,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    }
  }

  private drawNumericIceFracture(pulse: MechanicPulse): void {
    const fracture = pulse.iceFracture;
    if (!fracture || fracture.intensity !== "shatter" || pulse.age < 0) return;
    const sample = sampleNumericIceFracture(fracture, pulse.age);
    if (sample.finished) return;

    const block = this.model.getBlock(pulse.targetId);
    // Debris belongs to the impact location, not to the now-movable block.
    const cells = pulse.blockCells ?? (block ? this.model.blockCells(block) : []);
    if (cells.length === 0) return;
    const board = this.boardLayout();
    const ctx = this.ctx;
    const cellAt = (index: number): Point => cells[index % cells.length];
    const boardPoint = (cellIndex: number, x: number, y: number): Point => {
      const [cellX, cellY] = cellAt(cellIndex);
      return [
        board.innerX + (cellX + x) * board.cell,
        board.innerY + (cellY + y) * board.cell,
      ];
    };
    const minCellX = Math.min(...cells.map(([x]) => x));
    const maxCellX = Math.max(...cells.map(([x]) => x));
    const minCellY = Math.min(...cells.map(([, y]) => y));
    const maxCellY = Math.max(...cells.map(([, y]) => y));
    const blockSpanWidth = (maxCellX - minCellX + 1) * board.cell;
    const blockSpanHeight = (maxCellY - minCellY + 1) * board.cell;
    const blockCenterX = board.innerX + (minCellX + maxCellX + 1) * board.cell / 2;
    const blockCenterY = board.innerY + (minCellY + maxCellY + 1) * board.cell / 2;

    ctx.save();
    // A short-lived sheet lifts away before the larger facets fly. Keep the
    // true shape (including holes) and leave the live coloured body untouched.
    if (sample.counter.showNext && sample.iceSheetAlpha > 0.001) {
      ctx.save();
      ctx.translate(0, -sample.sheetLift * board.cell);
      const match = matchFormalBlockShapeForLevel(cells, this.model.level.id);
      if (!this.drawFormalFrozenBlock(match, board, sample.iceSheetAlpha)) {
        this.drawFormalFrozenCells(cells, board, sample.iceSheetAlpha);
      }
      ctx.restore();
    }

    if (sample.flashAlpha > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // One block-scale cyan core joins adjacent cells into a continuous
      // fracture cloud. The benchmark never reads as a row of white bulbs.
      const maxSpan = Math.max(blockSpanWidth, blockSpanHeight);
      const mergedRadius = maxSpan * 0.56 * sample.flashScale;
      ctx.save();
      ctx.globalAlpha = sample.flashAlpha * 0.58;
      ctx.translate(blockCenterX, blockCenterY);
      ctx.scale(blockSpanWidth / maxSpan, blockSpanHeight / maxSpan);
      const mergedGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, mergedRadius);
      mergedGlow.addColorStop(0, "rgba(236,255,255,.78)");
      mergedGlow.addColorStop(0.1, block ? COLOR_STYLE[block.layers[0] ?? block.color].light : "rgba(138,247,255,.78)");
      mergedGlow.addColorStop(0.44, "rgba(35,192,255,.54)");
      mergedGlow.addColorStop(1, "rgba(8,78,190,0)");
      ctx.fillStyle = mergedGlow;
      ctx.beginPath();
      ctx.arc(0, 0, mergedRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Keep small local impact glints for texture, but subordinate them to
      // the blue block-scale burst so multi-cell pieces remain visually whole.
      ctx.globalAlpha = sample.flashAlpha * 0.24;
      for (const impact of fracture.impacts) {
        const [x, y] = boardPoint(impact.cellIndex, impact.x, impact.y);
        const radius = board.cell * impact.radius * sample.flashScale * 0.68;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(232,255,255,.72)");
        gradient.addColorStop(0.28, "rgba(116,241,255,.66)");
        gradient.addColorStop(1, "rgba(15,118,225,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const crack of sample.cracks) {
      if (!crack.visible) continue;
      const geometry = crack.geometry;
      const start = boardPoint(geometry.cellIndex, geometry.start.x, geometry.start.y);
      const elbow = boardPoint(geometry.cellIndex, geometry.elbow.x, geometry.elbow.y);
      const end = boardPoint(geometry.cellIndex, geometry.end.x, geometry.end.y);
      ctx.save();
      ctx.globalAlpha = crack.alpha;
      ctx.strokeStyle = "#e8fdff";
      ctx.lineWidth = Math.max(1, geometry.width * board.cell);
      ctx.shadowColor = "#42ddff";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      if (crack.reveal <= 0.5) {
        const reveal = crack.reveal * 2;
        ctx.lineTo(
          start[0] + (elbow[0] - start[0]) * reveal,
          start[1] + (elbow[1] - start[1]) * reveal,
        );
      } else {
        const reveal = (crack.reveal - 0.5) * 2;
        ctx.lineTo(elbow[0], elbow[1]);
        ctx.lineTo(
          elbow[0] + (end[0] - elbow[0]) * reveal,
          elbow[1] + (end[1] - elbow[1]) * reveal,
        );
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    const shardTints = [
      ["#f4ffff", "#5feaff", "#0870c3"],
      ["#d8fbff", "#36cfff", "#0756ad"],
      ["#b9f5ff", "#22aeee", "#073c91"],
    ] as const;
    for (const shard of sample.shards) {
      if (!shard.visible) continue;
      const geometry = shard.geometry;
      const [x, y] = boardPoint(geometry.cellIndex, shard.x, shard.y);
      const tint = shardTints[geometry.tint];
      ctx.save();
      ctx.globalAlpha = shard.alpha;
      ctx.translate(x, y);
      ctx.rotate(shard.rotation);
      ctx.scale(shard.scale, shard.scale);
      ctx.shadowColor = "rgba(4,67,151,.72)";
      ctx.shadowBlur = Math.max(2, board.cell * 0.075);
      ctx.shadowOffsetY = Math.max(1, board.cell * 0.018);
      const fill = ctx.createLinearGradient(0, -board.cell * 0.1, 0, board.cell * 0.12);
      fill.addColorStop(0, tint[0]);
      fill.addColorStop(0.28, tint[1]);
      fill.addColorStop(1, tint[2]);
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#07529d";
      ctx.lineWidth = Math.max(0.8, board.cell * 0.018);
      ctx.beginPath();
      geometry.vertices.forEach((vertex, index) => {
        const px = vertex.x * board.cell;
        const py = vertex.y * board.cell;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha *= 0.78;
      ctx.strokeStyle = "#efffff";
      ctx.lineWidth = Math.max(0.55, board.cell * 0.01);
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x * board.cell, geometry.vertices[0].y * board.cell);
      ctx.lineTo(geometry.vertices[1].x * board.cell, geometry.vertices[1].y * board.cell);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const speck of sample.specks) {
      if (!speck.visible) continue;
      const [x, y] = boardPoint(speck.geometry.cellIndex, speck.x, speck.y);
      const radius = Math.max(0.8, speck.radius * board.cell);
      ctx.save();
      ctx.globalAlpha = speck.alpha;
      ctx.shadowColor = "#78f4ff";
      ctx.shadowBlur = radius * 2.4;
      if (speck.geometry.kind === "glint") {
        ctx.strokeStyle = "#f4ffff";
        ctx.lineWidth = Math.max(0.8, radius * 0.42);
        ctx.beginPath();
        ctx.moveTo(x - radius * 2.2, y);
        ctx.lineTo(x + radius * 2.2, y);
        ctx.moveTo(x, y - radius * 2.2);
        ctx.lineTo(x, y + radius * 2.2);
        ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
        glow.addColorStop(0, "rgba(255,255,255,1)");
        glow.addColorStop(0.35, "rgba(107,239,255,.95)");
        glow.addColorStop(1, "rgba(18,143,239,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  private drawMechanicPulses(): void {
    this.drawRevisedKeyFlights();
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
      .filter((pulse) => !pulse.iceFracture && pulse.kind !== "layer"
        && pulse.unlocked && pulse.age > 0
        && pulse.age / pulse.duration > 0.08 && pulse.age / pulse.duration < 0.88)
      .sort((left, right) => labelPriority(right) - labelPriority(left))[0];
    for (const pulse of this.mechanicPulses) {
      // The actual outer-shell sprite now supplies the peel feedback. A large
      // generic purple badge would cover the newly exposed inner colour.
      if (pulse.kind === "layer") continue;
      if (pulse.age <= 0) {
        this.drawMechanicRelay(pulse);
        continue;
      }
      if (pulse.iceFracture) {
        if (pulse.target === "gate") this.drawGateNumericIceFracture(pulse);
        else this.drawNumericIceFracture(pulse);
        continue;
      }
      const progress = Math.min(1, pulse.age / pulse.duration);
      const fadeIn = Math.min(1, progress / 0.12);
      const fadeOut = Math.max(0, 1 - Math.max(0, progress - 0.48) / 0.52);
      const alpha = fadeIn * fadeOut * (pulse.unlocked ? 1 : 0.62);
      const eased = 1 - (1 - progress) ** 3;
      const scale = this.save.reducedMotion ? 1 : 0.68 + eased * 0.5;
      const sizeMultiplier = pulse.target === "gate" ? 0.6 : pulse.target === "shutter" ? 0.52 : 0.86;
      const baseSize = Math.min(142, Math.max(68, Math.max(pulse.width, pulse.height) * sizeMultiplier));

      ctx.save();
      ctx.globalAlpha = alpha;
      const pulseColor = pulse.kind === "shutter" && pulse.shutterSkin === "generator"
        ? "#7df6ff"
        : pulse.kind === "shutter" && pulse.shutterSkin === "staged-frame"
          ? "#9bb8ff"
        : ringColor[pulse.kind];
      ctx.shadowColor = pulseColor;
      ctx.shadowBlur = pulse.unlocked ? 18 : 9;

      const art = this.art.mechanics;
      const suppressLockedGateSprite = pulse.kind === "ice" && pulse.target === "gate" && !pulse.unlocked;
      const progressionIndex = pulse.kind === "conveyor"
        ? 2
        : pulse.kind === "shutter" && pulse.shutterSkin === "generator" ? 0 : undefined;
      const stagedFramePulse = pulse.kind === "shutter"
        && pulse.shutterSkin === "staged-frame"
        && this.art.videoParity?.stagedFrame;
      if (stagedFramePulse) {
        const drawSize = baseSize * scale;
        const pulseBorder = Math.max(8, drawSize * 0.2);
        this.drawNineSlice(
          this.art.videoParity!.stagedFrame,
          pulse.x - drawSize / 2,
          pulse.y - drawSize / 2,
          drawSize,
          drawSize,
          63,
          pulseBorder,
        );
      } else if (progressionIndex != null) {
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
        const drawHeight = baseSize * 1.46 * scale;
        const drawWidth = drawHeight * sourceWidth / imageHeight;
        const sourceX = spriteIndex[pulse.kind]! * sourceWidth;
        const destinationX = pulse.x - drawWidth / 2;
        const destinationY = pulse.y - drawHeight / 2;
        ctx.drawImage(art, sourceX, 0, sourceWidth, imageHeight, destinationX, destinationY, drawWidth, drawHeight);
      }
      ctx.restore();

      if (pulse === labelPulse) {
        const text = this.mechanicPulseLabel(pulse);
        const width = pulse.kind === "shutter" || pulse.kind === "conveyor" ? 114 : 96;
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
    this.drawBooster(BUTTONS.time, 0, this.save.boosters.time, this.boosterTarget === "time", "time");
    this.drawBooster(BUTTONS.rocket, 1, this.save.boosters.rocket, this.boosterTarget === "rocket", "rocket");
    this.drawBooster(BUTTONS.pulse, 2, this.save.boosters.pulse, this.boosterTarget === "pulse", "pulse");
    const prompt = this.boosterFeedback ?? (this.boosterTarget === "rocket"
      ? { text: this.tr("gameplay.booster.selectRocketTarget"), color: "#fff36b", age: 0, duration: 1 }
      : undefined);
    if (prompt) {
      const alpha = this.boosterFeedback ? Math.min(1, (prompt.duration - prompt.age) / 0.16) : 1;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawPill(126, 846, 244, 42, "#171044", prompt.color, 20);
      this.label(prompt.text, 248, 873, 18, "#fff9e8", "center", 900, "#2d1458", 3);
      this.ctx.restore();
    }
  }

  private drawBoosterUnlockToast(): void {
    const toast = this.boosterUnlockToast;
    const banner = this.art.boosterUnlockBanner;
    if (!toast || !banner) return;
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

    this.drawPressable("boosterUnlockToast", { ...rect, y }, () => {
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(banner, rect.x, y, rect.width, rect.height);
      this.drawBoosterArtwork(iconIndex, iconCenterX - iconSize / 2, iconCenterY - iconSize / 2, iconSize, iconSize);
      this.label(this.tr("shop.newBoosterUnlocked"), rect.x + 125, y + 34, 14, "#78efff", "left", 900, "#17205f", 2, 285);
      this.label(this.boosterName(toast.kind), rect.x + 125, y + 67, 23, "#fff06d", "left", 900, "#31116f", 3, 285);
      this.label(this.boosterEffect(toast.kind), rect.x + 125, y + 96, 15, "#f7f5ff", "left", 800, "#171044", 2, 285);
      this.ctx.restore();
    });
  }

  private drawBoosterArtwork(iconIndex: number, x: number, y: number, width: number, height: number): boolean {
    return this.drawAtlasCell(this.art.boosters, iconIndex, ART_ATLASES.boosters, { x, y, width, height });
  }

  private drawBooster(rect: Rect, iconIndex: number, count: number, active: boolean, kind: Booster): void {
    const unlocked = this.boosterUnlocked(kind);
    const enabled = unlocked && count > 0;
    active = active && enabled;
    const formalUi = this.art.gameplayUi;
    if (formalUi) {
      const layout = GAMEPLAY_ART_LAYOUT.boosters[iconIndex];
      const icon = [formalUi.boosterTime, formalUi.boosterRocket, formalUi.boosterPulse][iconIndex];
      this.drawPressable(`booster.${kind}`, rect, () => {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = unlocked ? enabled ? 1 : 0.5 : 0.32;
        ctx.shadowColor = active ? "#fff36b" : "rgba(5,2,32,.7)";
        ctx.shadowBlur = active ? 18 : 7;
        this.drawGameplayImage(formalUi.boosterBase, layout.base);
        ctx.shadowBlur = 0;
        this.drawGameplayImage(icon, layout.icon);
        this.drawGameplayImage(formalUi.boosterCountBadge, layout.badge);
        if (unlocked) {
          if (count > 0) {
            this.withGameplayArtboard(() => this.label(
              `${count}`,
              layout.countLabel.x,
              layout.countLabel.y,
              GAMEPLAY_ART_LAYOUT.typography.boosterCount,
              "#ffffff",
              "center",
              950,
              "#7e2d21",
              3,
            ));
          } else {
            const plusPlacement = {
              x: layout.badge.x + (layout.badge.width - 28) / 2,
              y: layout.badge.y + (layout.badge.height - 28) / 2,
              width: 28,
              height: 28,
            };
            this.drawGameplayImage(formalUi.boosterPlus, plusPlacement);
          }
        } else {
          const center = gameplayArtRect(layout.badge);
          this.drawSystemIcon(11, center.x + center.width / 2, center.y + center.height / 2, 20, 0.9);
          this.label(this.tr("common.lvNumber", { level: SUPPLY_ITEMS[kind].unlockLevel }), center.x + center.width / 2, center.y + center.height + 12, 11, "#ddd6ef", "center", 900);
        }
        ctx.restore();
      });
      return;
    }
    this.drawPressable(`booster.${kind}`, rect, () => {
      const ctx = this.ctx;
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
        this.label(this.tr("common.lvNumber", { level: SUPPLY_ITEMS[kind].unlockLevel }), rect.x + rect.width - 6, rect.y + rect.height - 1, 11, "#c5c0d3", "center", 900);
      }
    });
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
    if (!hint) return undefined;
    const block = this.model.getBlock(hint.blockId);
    if (!block?.shape.length) return undefined;
    const centerX = block.shape.reduce((sum, [x]) => sum + x + 0.5, 0) / block.shape.length;
    const centerY = block.shape.reduce((sum, [, y]) => sum + y + 0.5, 0) / block.shape.length;
    let exitSide: Side | undefined;
    let path = hint.path;
    if (path.length === 0) {
      exitSide = this.model.possibleExitSides(block)[0];
      if (!exitSide) return undefined;
      const minShapeX = Math.min(...block.shape.map(([x]) => x));
      const maxShapeX = Math.max(...block.shape.map(([x]) => x));
      const minShapeY = Math.min(...block.shape.map(([, y]) => y));
      const maxShapeY = Math.max(...block.shape.map(([, y]) => y));
      const exitOrigin: Point = exitSide === "top"
        ? [block.x, -maxShapeY - 1]
        : exitSide === "bottom"
          ? [block.x, this.model.level.height - minShapeY]
          : exitSide === "left"
            ? [-maxShapeX - 1, block.y]
            : [this.model.level.width - minShapeX, block.y];
      path = [exitOrigin];
    }
    const origins: Point[] = [[block.x, block.y], ...path];
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
      exitSide,
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

  private drawParticles(exitFragments: boolean): void {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      if (Boolean(particle.exitFragment) !== exitFragments) continue;
      ctx.save();
      const lifeRatio = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = particle.fragmentColor
        ? Math.min(1, lifeRatio / (particle.fadePortion ?? 0.3))
        : lifeRatio;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      const drawSize = particle.size * 2.6;
      const fragmentArt = particle.fragmentColor ? this.art.blockCells?.[particle.fragmentColor] : undefined;
      if (fragmentArt) {
        const fragmentIndex = particle.fragmentIndex ?? 0;
        const imageWidth = fragmentArt.naturalWidth || fragmentArt.width;
        const imageHeight = fragmentArt.naturalHeight || fragmentArt.height;
        const sourceSize = Math.floor(Math.min(imageWidth, imageHeight) * 0.48);
        const sourceX = fragmentIndex % 2 === 0 ? 0 : imageWidth - sourceSize;
        const sourceY = fragmentIndex < 2 ? 0 : imageHeight - sourceSize;
        ctx.scale(particle.fragmentSpeck ? 0.52 : 0.78, particle.fragmentSpeck ? 1.15 : 1);
        ctx.drawImage(fragmentArt, sourceX, sourceY, sourceSize, sourceSize, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      } else {
        ctx.drawImage(this.art.particleSpark!, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      }
      ctx.restore();
    }
  }

  private drawPause(): void {
    const art = this.art.pauseSettings;
    if (!art) return;
    const ctx = this.ctx;
    this.drawDim(PAUSE_SETTINGS_LAYOUT.overlay.alpha, PAUSE_SETTINGS_LAYOUT.overlay.color);
    this.withHomeArtboard(() => {
      ctx.drawImage(art.panel, PAUSE_SETTINGS_LAYOUT.panel.x, PAUSE_SETTINGS_LAYOUT.panel.y);
      const titleText = PAUSE_SETTINGS_LAYOUT.typography.title;
      this.label(
        this.tr("pause.title"),
        titleText.x,
        titleText.pauseY,
        titleText.size,
        titleText.fill,
        "center",
        850,
        titleText.stroke,
        titleText.lineWidth,
        330,
      );
      this.drawPauseSettingsRows("pause", art);
      this.drawPressable("pauseRestart", PAUSE_SETTINGS_LAYOUT.replayButton, () => {
        ctx.drawImage(art.replayButton, PAUSE_SETTINGS_LAYOUT.replayButton.x, PAUSE_SETTINGS_LAYOUT.replayButton.y);
        this.label(
          this.tr("pause.replay"),
          PAUSE_SETTINGS_LAYOUT.typography.action.pauseX[0],
          PAUSE_SETTINGS_LAYOUT.typography.action.y,
          PAUSE_SETTINGS_LAYOUT.typography.action.size,
          "#fffdf5",
          "center",
          900,
          "#a85b10",
          3,
          PAUSE_SETTINGS_LAYOUT.replayButton.width - 28,
        );
      });
      this.drawPressable("pauseHome", PAUSE_SETTINGS_LAYOUT.homeButton, () => {
        ctx.drawImage(art.homeButton, PAUSE_SETTINGS_LAYOUT.homeButton.x, PAUSE_SETTINGS_LAYOUT.homeButton.y);
        this.label(
          this.tr("pause.home"),
          PAUSE_SETTINGS_LAYOUT.typography.action.pauseX[1],
          PAUSE_SETTINGS_LAYOUT.typography.action.y,
          PAUSE_SETTINGS_LAYOUT.typography.action.size,
          "#fffdf5",
          "center",
          900,
          "#176e21",
          3,
          PAUSE_SETTINGS_LAYOUT.homeButton.width - 28,
        );
      });
      this.drawPressable("pauseResume", PAUSE_SETTINGS_LAYOUT.close, () => {
        ctx.drawImage(art.close, PAUSE_SETTINGS_LAYOUT.close.x, PAUSE_SETTINGS_LAYOUT.close.y);
      });
    });
  }

  private drawFeature(): void {
    const intro = getScheduledFeatureIntro(this.model.level.id);
    const panelArt = this.art.pauseSettings;
    if (!intro || !panelArt) return;
    const layout = STATUS_OVERLAY_LAYOUT;
    const center = layout.feature.visualCenter;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = layout.overlay.alpha;
    ctx.fillStyle = layout.overlay.color;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
    this.withHomeArtboard(() => {
      ctx.drawImage(panelArt.panel, layout.panel.x, layout.panel.y);
      this.label(this.tr("feature.title"), layout.title.x, layout.title.y, layout.title.size, layout.title.fill, "center", 900, layout.title.stroke, layout.title.lineWidth, 430);
      if (this.featureIntroIconArt.image) {
        this.drawCollectionImageContained(this.featureIntroIconArt.image, {
          x: center.x - 95, y: center.y - 95, width: 190, height: 190,
        });
      } else {
        this.label(this.tr(this.featureIntroIconArt.error ? "page.loadFailed" : "page.loading"),
          center.x, center.y, 24, "#965718", "center", 900, undefined, 0, 400);
      }
      const description = layout.feature.description;
      this.wrapText(
        this.tr(`collection.mechanism.${intro.mechanismId}.effect` as TranslationKey),
        description.x,
        description.y,
        description.maxWidth,
        description.lineHeight,
        description.size,
        description.fill,
        "left",
        undefined,
        0,
        layout.feature.button.y - 20,
      );
      this.drawPressable("featurePrimary", layout.feature.button, () => {
        ctx.drawImage(panelArt.homeButton, layout.feature.button.x, layout.feature.button.y);
        const text = layout.feature.buttonText;
        this.label(this.tr(this.featureIntroIconArt.error ? "page.retryLoad" : "feature.confirm"), text.x, text.y, text.size, text.fill, "center", 900, text.stroke, text.lineWidth, layout.feature.button.width - 36);
      });
    });
  }

  private featureVisual(): { counter?: number; outerColor?: BlockColor; innerColor?: BlockColor } {
    const intro = getScheduledFeatureIntro(this.model.level.id);
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
    if (intro?.kind === "shutter" || intro?.kind === "conveyor") {
      return { counter: Math.max(1, ...snapshot.shutters.map((shutter) => shutter.count)) };
    }
    if (intro?.kind === "generator") {
      const moveGenerators = snapshot.generators.filter((candidate) => (candidate.trigger ?? "move") === "move");
      return { counter: Math.max(1, ...moveGenerators.map((candidate) => candidate.remaining)) };
    }
    if (intro?.kind === "timed-generator") {
      const generator = snapshot.generators.find((candidate) => candidate.trigger === "time");
      return { counter: Math.max(1, generator?.remaining ?? 1) };
    }
    return {};
  }

  private drawWin(): void {
    const rewardAmount = this.winCoinReward;
    const art = this.winArt;
    if (!art) {
      if (!this.winArtLoading && !this.winArtError) this.requestWinArt();
      this.drawDim();
      this.drawModal(68, 278, 360, 500, this.tr("settlement.levelComplete"));
      this.label(this.winArtError ? this.tr("settlement.loadFailed") : this.tr("settlement.loading"), 248, 510, 22, "#fff4c7", "center", 900, "#4f218f", 4, 315);
      if (this.winArtError) {
        this.drawButton("modalPrimary", BUTTONS.winPrimary, this.winActionLabel(), "#43dc38", "#0a8122", 25);
        this.drawRoundIcon("modalSecondary", BUTTONS.winClose, "×", "#e6515f");
      }
      return;
    }

    const ctx = this.ctx;
    const conditions = this.winStarConditions ?? evaluateLevelStars(
      this.model.level,
      this.captureCompletionMetrics(this.model.snapshot()),
    );
    ctx.save();
    ctx.globalAlpha = WIN_ART_LAYOUT.overlay.alpha;
    ctx.fillStyle = WIN_ART_LAYOUT.overlay.color;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
    this.withHomeArtboard(() => {
      ctx.drawImage(art.panel, WIN_SETTLEMENT_LAYOUT.panel.x, WIN_SETTLEMENT_LAYOUT.panel.y);
      if (this.save.reducedMotion) {
        ctx.drawImage(art.glow, WIN_ART_LAYOUT.glow.x, WIN_ART_LAYOUT.glow.y);
      } else {
        const glowCenterX = WIN_ART_LAYOUT.glow.x + WIN_ART_LAYOUT.glow.width / 2;
        const glowCenterY = WIN_ART_LAYOUT.glow.y + WIN_ART_LAYOUT.glow.height / 2;
        ctx.save();
        ctx.translate(glowCenterX, glowCenterY);
        ctx.rotate(winGlowRotation(this.winGlowAge, false));
        ctx.translate(-glowCenterX, -glowCenterY);
        ctx.drawImage(art.glow, WIN_ART_LAYOUT.glow.x, WIN_ART_LAYOUT.glow.y);
        ctx.restore();
      }
      // Localized title, level number, stars and criteria use Canvas text/shapes.
      this.label(
        this.tr("settlement.levelComplete"),
        WIN_SETTLEMENT_LAYOUT.title.x,
        WIN_SETTLEMENT_LAYOUT.title.y,
        WIN_SETTLEMENT_LAYOUT.title.size,
        "#fff6a1",
        "center",
        1000,
        "#8b3bdb",
        7,
        WIN_SETTLEMENT_LAYOUT.title.maxWidth,
      );
      this.drawWinLevelBadge();
      this.drawWinStars(conditions);
      this.drawWinCriteria(conditions);

      ctx.drawImage(
        art.coinPile,
        WIN_SETTLEMENT_LAYOUT.coinPile.x,
        WIN_SETTLEMENT_LAYOUT.coinPile.y,
        WIN_SETTLEMENT_LAYOUT.coinPile.width,
        WIN_SETTLEMENT_LAYOUT.coinPile.height,
      );
      ctx.drawImage(art.rewardPill, WIN_SETTLEMENT_LAYOUT.rewardPill.x, WIN_SETTLEMENT_LAYOUT.rewardPill.y);
      this.drawFormalWinText(`+${rewardAmount}`, {
        x: WIN_SETTLEMENT_LAYOUT.rewardPill.x + WIN_SETTLEMENT_LAYOUT.rewardPill.width / 2,
        y: WIN_SETTLEMENT_LAYOUT.rewardPill.y + WIN_SETTLEMENT_LAYOUT.rewardPill.height / 2 + 2,
        renderSize: 34,
        fill: "#ffffff",
        stroke: "#415ca4",
        lineWidth: 5,
      });
      this.drawPressable("modalPrimary", WIN_SETTLEMENT_LAYOUT.continueButton, () => {
        ctx.drawImage(art.continueButton, WIN_SETTLEMENT_LAYOUT.continueButton.x, WIN_SETTLEMENT_LAYOUT.continueButton.y);
        this.drawFormalWinText(this.tr("settlement.continue"), {
          x: WIN_SETTLEMENT_LAYOUT.continueButton.x + WIN_SETTLEMENT_LAYOUT.continueButton.width / 2,
          y: WIN_SETTLEMENT_LAYOUT.continueButton.y + WIN_SETTLEMENT_LAYOUT.continueButton.height / 2 + 8,
          renderSize: 42,
          fill: "#ffffff",
          stroke: "#10520b",
          lineWidth: 6,
        });
      });
      this.drawPressable("modalSecondary", WIN_SETTLEMENT_LAYOUT.close, () => {
        ctx.drawImage(art.close, WIN_SETTLEMENT_LAYOUT.close.x, WIN_SETTLEMENT_LAYOUT.close.y);
      });
    });
  }

  private drawWinLevelBadge(): void {
    const ctx = this.ctx;
    const badge = WIN_SETTLEMENT_LAYOUT.levelBadge;
    ctx.save();
    ctx.shadowColor = "rgba(45, 24, 135, .55)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    const gradient = ctx.createLinearGradient(badge.x, badge.y, badge.x, badge.y + badge.height);
    gradient.addColorStop(0, "#6d57dc");
    gradient.addColorStop(1, "#3922a8");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    traceRoundedRect(ctx, badge.x, badge.y, badge.width, badge.height, 28);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#b79bff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    this.label(
      this.tr("common.levelNumber", { level: this.model.level.id }),
      WIN_SETTLEMENT_LAYOUT.levelText.x,
      WIN_SETTLEMENT_LAYOUT.levelText.y,
      WIN_SETTLEMENT_LAYOUT.levelText.size,
      "#fffdf7",
      "center",
      950,
      "#2d1a96",
      4,
      WIN_SETTLEMENT_LAYOUT.levelText.maxWidth,
    );
  }

  private drawWinStars(conditions: LevelStarEvaluation): void {
    const ui = this.art.homeUi;
    const active = ui ? [ui.starLeft, ui.starCenter, ui.starRight] : [];
    const inactive = ui ? [ui.emptyStarLeft, ui.emptyStarCenter, ui.emptyStarRight] : [];
    const achieved = [true, conditions.moveAchieved, conditions.timeAchieved];
    WIN_SETTLEMENT_LAYOUT.stars.forEach((placement, index) => {
      const image = achieved[index] ? active[index] : inactive[index];
      if (image) this.ctx.drawImage(image, placement.x, placement.y);
      else this.drawFallbackWinStar(placement.x + placement.width / 2, placement.y + placement.height / 2, placement.width * 0.42, achieved[index]);
    });
  }

  private drawFallbackWinStar(x: number, y: number, radius: number, active: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = active ? "#ffd337" : "#b7b3c3";
    ctx.strokeStyle = active ? "#d47412" : "#817a98";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const distance = index % 2 === 0 ? radius : radius * 0.45;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawWinCriteria(conditions: LevelStarEvaluation): void {
    const ctx = this.ctx;
    const panel = WIN_SETTLEMENT_LAYOUT.criteriaPanel;
    ctx.save();
    ctx.shadowColor = "rgba(72, 39, 138, .18)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(255, 250, 244, .86)";
    ctx.beginPath();
    traceRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, 30);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(203, 177, 229, .8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const labels: Record<WinCriterionKind, string> = {
      clear: this.tr("settlement.criteria.clear"),
      moves: this.tr("settlement.criteria.moves", { target: conditions.moveTarget }),
      time: this.tr("settlement.criteria.time", { target: conditions.timeTargetSeconds }),
    };
    const achieved: Record<WinCriterionKind, boolean> = {
      clear: true,
      moves: conditions.moveAchieved,
      time: conditions.timeAchieved,
    };
    WIN_CRITERION_KINDS.forEach((kind, index) => {
      const row = WIN_SETTLEMENT_LAYOUT.criteriaRows[index];
      const pass = achieved[kind];
      ctx.save();
      const rowGradient = ctx.createLinearGradient(row.x, row.y, row.x + row.width, row.y);
      rowGradient.addColorStop(0, pass ? "#fff9ff" : "#efecf5");
      rowGradient.addColorStop(1, pass ? "#e8e0ff" : "#ddd9e8");
      ctx.fillStyle = rowGradient;
      ctx.strokeStyle = pass ? "#c8b3ee" : "#bcb6ce";
      ctx.lineWidth = 2;
      ctx.beginPath();
      traceRoundedRect(ctx, row.x, row.y, row.width, row.height, 25);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const iconX = row.x + 42;
      const iconY = row.y + row.height / 2;
      ctx.save();
      ctx.fillStyle = pass ? "#ffb719" : "#aaa7b8";
      ctx.strokeStyle = pass ? "#d56b0e" : "#777287";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(iconX, iconY, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fffdf4";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (pass) {
        ctx.moveTo(iconX - 9, iconY);
        ctx.lineTo(iconX - 2, iconY + 8);
        ctx.lineTo(iconX + 11, iconY - 9);
      } else {
        ctx.moveTo(iconX - 8, iconY - 8);
        ctx.lineTo(iconX + 8, iconY + 8);
        ctx.moveTo(iconX + 8, iconY - 8);
        ctx.lineTo(iconX - 8, iconY + 8);
      }
      ctx.stroke();
      ctx.restore();
      this.label(
        labels[kind],
        row.x + 78,
        iconY + 1,
        22,
        pass ? "#3f2a91" : "#716b82",
        "left",
        850,
        undefined,
        0,
        row.width - 92,
      );
    });
  }

  private drawFormalWinText(
    text: string,
    style: {
      readonly x: number;
      readonly y: number;
      readonly renderSize: number;
      readonly fill: string;
      readonly stroke: string;
      readonly lineWidth: number;
    },
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = canvasFont(950, style.renderSize, "Arial, sans-serif");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.strokeText(text, style.x, style.y);
    ctx.fillStyle = style.fill;
    ctx.fillText(text, style.x, style.y);
    ctx.restore();
  }

  private winActionLabel(): string {
    return this.tr("settlement.returnHome");
  }

  private winSecondaryActionLabel(): string {
    return this.tr("common.close");
  }

  private drawSettlementFailed(): void {
    const persistenceUnknown = this.settlementFailureKind === "unknown";
    const abandoning = Boolean(this.pendingSettlementAbandon);
    this.drawDim();
    const title = abandoning
      ? persistenceUnknown ? this.tr("settlement.failure.confirmingReturn") : this.tr("settlement.failure.returnUnsaved")
      : persistenceUnknown ? this.tr("settlement.failure.confirmingProgress") : this.tr("settlement.failure.progressUnsaved");
    this.drawModal(68, 232, 360, 680, title);
    this.label(
      persistenceUnknown
        ? abandoning
          ? this.tr("settlement.failure.refundUnknown")
          : this.tr("settlement.failure.saveUnknown")
        : this.tr("settlement.storageUnavailable"),
      248, 405, 31, "#ffb0bb", "center", 1000, "#7e1832", 5,
    );
    this.label(this.settlementFailureDetail(), 248, 485, 20, "#fff0ae", "center", 850, "#5b247a", 3);
    const instruction = abandoning
      ? this.tr("settlement.failure.retryReturnBusy")
      : persistenceUnknown
        ? this.tr("settlement.failure.retryConfirmBusy")
        : this.tr("settlement.failure.retryOrAbandon");
    this.label(instruction, 248, 550, 18, "#e4dcff", "center", 750);
    this.drawButton(
      "modalPrimary",
      BUTTONS.modalPrimary,
      abandoning ? this.tr("settlement.retryReturn") : this.tr("settlement.retrySave"),
      "#43dc38",
      "#0a8122",
      28,
    );
    if (!abandoning && !persistenceUnknown) {
      this.drawButton("modalSecondary", BUTTONS.modalSecondary, this.tr("settlement.abandonAndReturn"), "#7562c8", "#352878", 22);
    }
  }

  private drawLifeRefill(): void {
    const chrome = this.art.pauseSettings;
    if (!chrome) return;
    const layout = LIFE_REFILL_LAYOUT;
    const nowMs = Date.now();
    const quote = this.lifeRefillQuote(nowMs);
    const state = quote.state;
    const full = quote.missingLives === 0;
    const recovery = getNextLifeRecoveryRemainingMs(state, nowMs);
    const ctx = this.ctx;
    this.drawDim(layout.overlay.alpha, layout.overlay.color);
    this.withHomeArtboard(() => {
      ctx.drawImage(chrome.panel, layout.panel.x, layout.panel.y);
      this.label(this.tr("gameplay.life.refill"), layout.title.x, layout.title.y, layout.title.size,
        "#ffffff", "center", 950, "#381ea2", 4, layout.title.maxWidth);
      this.label(`${state.lives} / ${MAX_LIVES}`, layout.lives.x, layout.lives.y, layout.lives.size,
        "#a74770", "center", 950, undefined, 0, layout.lives.maxWidth);
      if (!full && !this.pendingLifeRefill) {
        this.label(formatLifeCountdown(recovery), layout.recovery.x, layout.recovery.y, layout.recovery.size,
          "#8c523d", "center", 850, undefined, 0, layout.recovery.maxWidth);
      }
      if (this.lifeRefillArt) {
        const pile = layout.coinPile;
        ctx.drawImage(this.lifeRefillArt.coinPile, pile.x, pile.y, pile.width, pile.height);
        ctx.drawImage(this.lifeRefillArt.rewardPill, layout.costPill.x, layout.costPill.y);
      } else {
        const pile = layout.coinPile;
        this.label(this.tr(this.lifeRefillArtError ? "page.loadFailed" : "page.loading"),
          pile.x + pile.width / 2, pile.y + pile.height / 2, 24, "#8c523d", "center", 800, undefined, 0, pile.width);
      }
      this.label(quote.coinCost > 0 ? `-${quote.coinCost}` : "0", layout.cost.x, layout.cost.y, layout.cost.size,
        "#ffffff", "center", 950, "#415ca4", 4, layout.cost.maxWidth);
      if (this.lifeRefillFeedback) {
        this.label(this.lifeRefillFeedback, layout.feedback.x, layout.feedback.y, layout.feedback.size,
          "#8c523d", "center", 850, undefined, 0, layout.feedback.maxWidth);
      }
      if (full) {
        this.label(this.tr("common.full"), layout.buyButton.x + layout.buyButton.width / 2,
          layout.action.y, layout.action.size, "#8c523d", "center", 900, undefined, 0, layout.buyButton.width - 28);
      } else {
        this.drawPressable("lifeRefillBuy", layout.buyButton, () => {
          ctx.drawImage(chrome.homeButton, layout.buyButton.x, layout.buyButton.y);
          this.label(this.tr("gameplay.life.refill"), layout.buyButton.x + layout.buyButton.width / 2,
            layout.action.y, layout.action.size, "#ffffff", "center", 900, "#176e21", 3, layout.buyButton.width - 28);
        });
      }
      if (!this.pendingLifeRefill) {
        this.drawPressable("lifeRefillDismiss", layout.close, () => {
          ctx.drawImage(chrome.close, layout.close.x, layout.close.y);
        });
      }
    });
  }

  private drawStorageUnavailable(): void {
    this.drawDim();
    this.drawModal(68, 232, 360, 680, this.tr("settlement.progressProtection"));
    this.label(this.tr("settlement.storageUnavailable"), 248, 405, 29, "#ffcf76", "center", 1000, "#7e3d18", 5, 315);
    this.label(this.tr("settlement.storagePaused"), 248, 486, 19, "#fff0ae", "center", 850, "#5b247a", 3, 315);
    this.label(this.tr("settlement.storageRetryHint"), 248, 550, 18, "#e4dcff", "center", 750, undefined, 0, 310);
    this.drawButton("modalPrimary", BUTTONS.modalPrimary, this.tr("settlement.retryRead"), "#43dc38", "#0a8122", 28);
  }

  private drawFailed(): void {
    const panelArt = this.art.pauseSettings;
    const statusArt = this.art.statusOverlay;
    if (!panelArt || !statusArt) return;
    const layout = STATUS_OVERLAY_LAYOUT;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = layout.overlay.alpha;
    ctx.fillStyle = layout.overlay.color;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
    const remaining = this.model.snapshot().blocks.length;
    this.withHomeArtboard(() => {
      ctx.drawImage(panelArt.panel, layout.panel.x, layout.panel.y);
      this.drawTimeoutTitle();
      ctx.drawImage(statusArt.clock, layout.timeout.clock.x, layout.timeout.clock.y);
      ctx.drawImage(statusArt.remainingPanel, layout.timeout.remainingPanel.x, layout.timeout.remainingPanel.y);
      const remainingText = layout.timeout.remainingText;
      this.label(this.tr("timeout.blocksRemaining", { count: remaining }), remainingText.x, remainingText.y, remainingText.size, remainingText.fill, "center", 850, undefined, 0, 400);
      this.drawPressable("failedReplay", layout.timeout.replayButton, () => {
        ctx.drawImage(panelArt.replayButton, layout.timeout.replayButton.x, layout.timeout.replayButton.y);
        this.label(this.tr("timeout.replay"), layout.timeout.replayButton.x + layout.timeout.replayButton.width / 2, layout.timeout.actionText.y, layout.timeout.actionText.size, "#ffffff", "center", 900, "#a85b10", 3, layout.timeout.replayButton.width - 28);
      });
      this.drawPressable("failedHome", layout.timeout.homeButton, () => {
        ctx.drawImage(panelArt.homeButton, layout.timeout.homeButton.x, layout.timeout.homeButton.y);
        this.label(this.tr("timeout.home"), layout.timeout.homeButton.x + layout.timeout.homeButton.width / 2, layout.timeout.actionText.y, layout.timeout.actionText.size, "#ffffff", "center", 900, "#176e21", 3, layout.timeout.homeButton.width - 28);
      });
    });
  }

  private drawTimeoutTitle(): void {
    const ctx = this.ctx;
    const title = STATUS_OVERLAY_LAYOUT.timeout.title;
    const text = this.tr("timeout.title");
    ctx.save();
    ctx.font = canvasFont(900, title.size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = ctx.measureText(text).width;
    if (width > title.maxWidth) ctx.font = canvasFont(900, title.size * title.maxWidth / width);
    const origin = centeredCanvasTextOrigin(ctx.measureText(text), title.x, title.y);
    ctx.lineJoin = "round";
    ctx.strokeStyle = title.stroke;
    ctx.lineWidth = title.lineWidth;
    ctx.fillStyle = title.fill;
    ctx.strokeText(text, origin.x, origin.y);
    ctx.fillText(text, origin.x, origin.y);
    ctx.restore();
  }

  private temporaryLevelText(chinese: string, fallback: string): string {
    return this.save.language === "zh-CN" || this.save.language === "zh-TW" ? chinese : fallback;
  }

  private drawTemporaryLevelSelector(): void {
    const selector = this.temporaryLevelSelector;
    if (!selector) return;
    const layout = this.temporaryLevelSelectorLayout();
    const selected = Math.max(1, Math.min(LEVELS.length, selector.selectedLevel));
    this.drawDim(0.78, "#08051f");
    this.drawModal(
      layout.panel.x,
      layout.panel.y,
      layout.panel.width,
      layout.panel.height,
      this.temporaryLevelText("临时测试关卡", "TEST LEVEL"),
    );
    this.drawRoundIcon("temporaryLevel.close", layout.close, "×", "#e6515f");

    this.label(
      this.temporaryLevelText(`已选择：第 ${selected} 关`, `SELECTED: LEVEL ${selected}`),
      LOGICAL_WIDTH / 2,
      153,
      25,
      "#fff4ae",
      "center",
      950,
      "#3b126f",
      4,
      320,
    );

    for (const cell of layout.cells) {
      this.drawTemporaryLevelButton(
        `temporaryLevel.level.${cell.levelId}`,
        cell.rect,
        `${cell.levelId}`,
        cell.selected ? "primary" : "secondary",
        24,
      );
    }

    this.drawRoundIcon("temporaryLevel.previous", layout.previousPage, "‹", "#7562c8", layout.canPrevious);
    this.drawRoundIcon("temporaryLevel.next", layout.nextPage, "›", "#7562c8", layout.canNext);
    this.label(
      `${layout.page + 1} / ${layout.pageCount}`,
      LOGICAL_WIDTH / 2,
      layout.previousPage.y + layout.previousPage.height / 2 + 9,
      24,
      "#ffffff",
      "center",
      900,
      "#3b126f",
      3,
    );

    this.drawTemporaryLevelButton(
      "temporaryLevel.start",
      layout.start,
      this.temporaryLevelText("开始测试", "START TEST"),
      "primary",
      27,
    );
    if (this.temporaryLevelTestSession) {
      this.drawTemporaryLevelButton(
        "temporaryLevel.exit",
        layout.exit,
        this.temporaryLevelText("退出测试并恢复进度", "EXIT TEST"),
        "secondary",
        20,
      );
    }
    this.label(
      this.temporaryLevelText("测试中的进度、金币、生命和道具不会写入存档", "TEST CHANGES ARE NOT SAVED"),
      LOGICAL_WIDTH / 2,
      1002,
      15,
      "#dcd6ff",
      "center",
      750,
      undefined,
      0,
      layout.panel.width - 54,
    );
  }

  private drawTemporaryLevelButton(
    key: string,
    rect: Rect,
    text: string,
    style: "primary" | "secondary" | "danger",
    fontSize: number,
  ): void {
    this.drawPressable(key, rect, () => {
      const ctx = this.ctx;
      const colors = style === "primary"
        ? { top: "#65ef4e", bottom: "#1a9e2f", stroke: "#0f6822", shadow: "#18551d" }
        : style === "danger"
          ? { top: "#ff7575", bottom: "#c43e58", stroke: "#81203d", shadow: "#6d1732" }
          : { top: "#8f78ff", bottom: "#5140c4", stroke: "#31238a", shadow: "#2b1465" };
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, .46)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 5;
      const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
      gradient.addColorStop(0, colors.top);
      gradient.addColorStop(1, colors.bottom);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = Math.max(3, Math.min(6, rect.height * 0.08));
      ctx.beginPath();
      traceRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, Math.min(18, rect.height * 0.28));
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();
      ctx.restore();
      this.label(
        text,
        rect.x + rect.width / 2,
        rect.y + rect.height / 2 + fontSize * 0.34,
        fontSize,
        "#ffffff",
        "center",
        1000,
        colors.shadow,
        Math.max(3, fontSize * 0.15),
        rect.width - 14,
      );
    });
  }

  private drawDim(alpha = 0.82, color = "#000000"): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.ctx.restore();
  }

  private drawModal(x: number, y: number, width: number, height: number, title: string): void {
    this.drawChromePanel(x, y, width, height, 50);
    this.drawChromePanel(x + 35, y - 36, width - 70, 72, 28, false);
    this.label(title, x + width / 2, y + 9, Math.min(36, 480 / Math.max(8, title.length)), "white", "center", 1000, "#3b126f", 5);
  }

  private drawButton(key: string, rect: Rect, text: string, top: string, _bottom: string, fontSize: number): void {
    const normalized = top.toLowerCase();
    const style = ["#41da35", "#42dc38", "#43dc38"].includes(normalized)
      ? 0
      : normalized === "#7562c8" ? 1 : 2;
    this.drawPressable(key, rect, () => {
      this.drawButtonChrome(rect, style);
      const shadow = style === 0 ? "#1c5b20" : style === 1 ? "#2b1465" : "#7e1b16";
      this.label(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + fontSize * 0.36, fontSize, "white", "center", 1000, shadow, 4);
    });
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

  private drawRoundIcon(key: string, rect: Rect, text: string, _color: string, enabled = true): void {
    this.drawPressable(key, rect, () => {
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
    });
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
      const ice = this.art.formalIceCell;
      if (ice) {
        const authoredCell = 95;
        const iceWidth = ice.naturalWidth || ice.width;
        const iceHeight = ice.naturalHeight || ice.height;
        const scale = size / authoredCell;
        ctx.save();
        ctx.translate(x - size / 2, y - size / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(ice, (authoredCell - iceWidth) / 2, authoredCell - iceHeight);
        ctx.restore();
      } else {
        this.drawIceSurface(x - size / 2, y - size / 2, size, size);
      }
      this.label(`${frozenCount}`, x, y + 17, 55, "white", "center", 1000, "#4d4260", 5);
    }
  }

  private drawIceGateIcon(x: number, y: number, count: number): void {
    const ctx = this.ctx;
    const gate = this.art.gates!.blue.horizontal[2];
    const gateWidth = gate.naturalWidth || gate.width;
    const gateHeight = gate.naturalHeight || gate.height;
    const scale = 180 / gateWidth;
    ctx.save();
    ctx.shadowColor = "#ffde4d";
    ctx.shadowBlur = 24;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.drawImage(gate, -gateWidth / 2, -gateHeight / 2);
    ctx.restore();
    const ice = this.art.iceStrips?.horizontal[2];
    if (ice) {
      const iceWidth = ice.naturalWidth || ice.width;
      const iceHeight = ice.naturalHeight || ice.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.drawImage(ice, -iceWidth / 2, -iceHeight / 2);
      ctx.restore();
    } else {
      this.drawIceSurface(x - 90, y - 48, 180, 96);
    }
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

  private wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    size: number,
    color: string,
    align: CanvasTextAlign = "center",
    stroke?: string,
    strokeWidth = 0,
    maxY?: number,
  ): void {
    const ctx = this.ctx;
    ctx.save(); ctx.font = canvasFont(800, size); ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color;
    const tokens = text.match(/[A-Za-zÀ-ÖØ-öø-ÿĀ-žА-Яа-яЁё0-9]+(?:['’.-][A-Za-zÀ-ÖØ-öø-ÿĀ-žА-Яа-яЁё0-9]+)*|\s+|./gu) ?? [];
    const wrappedLines = (): string[] => {
      const lines: string[] = [];
      let line = "";
      for (const token of tokens) {
        if (token === "\n") {
          lines.push(line.trimEnd());
          line = "";
          continue;
        }
        const next = line + token;
        const closingPunctuation = /^[，。；：！？、）】》,.!?;:%)]$/.test(token);
        if (ctx.measureText(next).width > maxWidth && line.trim() && !closingPunctuation) {
          lines.push(line.trimEnd());
          line = token.trimStart();
        } else {
          line = next;
        }
      }
      if (line.trim()) lines.push(line.trimEnd());
      return lines;
    };
    let lines = wrappedLines();
    let fittedSize = size;
    let fittedLineHeight = lineHeight;
    // Only fixed-height description boxes opt into fitting. Other callers
    // keep their existing line breaks, font sizes and baseline positions.
    const bounded = maxY !== undefined && Number.isFinite(maxY) && maxY > y;
    while (bounded && fittedSize > 1
      && y + Math.max(0, lines.length - 1) * fittedLineHeight + fittedSize / 2 > maxY!) {
      fittedSize = Math.max(1, fittedSize - 0.5);
      fittedLineHeight = lineHeight * fittedSize / size;
      ctx.font = canvasFont(800, fittedSize);
      lines = wrappedLines();
    }
    if (stroke && strokeWidth) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
    }
    lines.forEach((value, index) => {
      const lineY = y + index * fittedLineHeight;
      if (stroke && strokeWidth) {
        if (bounded) ctx.strokeText(value, x, lineY, maxWidth);
        else ctx.strokeText(value, x, lineY);
      }
      if (bounded) ctx.fillText(value, x, lineY, maxWidth);
      else ctx.fillText(value, x, lineY);
    });
    ctx.restore();
  }

  private label(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = "center",
    weight = 800,
    stroke?: string,
    strokeWidth = 0,
    maxWidth?: number,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = canvasFont(weight, size);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (stroke && strokeWidth) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      if (maxWidth == null) ctx.strokeText(text, x, y);
      else ctx.strokeText(text, x, y, maxWidth);
    }
    ctx.fillStyle = color;
    if (maxWidth == null) ctx.fillText(text, x, y);
    else ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  private formatTime(seconds: number): string {
    const value = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

}
