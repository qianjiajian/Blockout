export { PROFILE_SUPPLIED_ART } from "./profileSuppliedArt";
export { WELFARE_SUPPLIED_ART } from "./welfareSuppliedArt";

export interface CollectionAlbumArtUrls {
  readonly background: string;
  readonly topHeader: string;
  readonly titlePanel: string;
  readonly suppliedTabBlue: string;
  readonly suppliedTabPurple: string;
  readonly suppliedCardGray: string;
  readonly suppliedCardBlue: string;
  readonly suppliedCardPurple: string;
  readonly suppliedCardGold: string;
  readonly suppliedProgressIcon: string;
  readonly suppliedProgressPanel: string;
  readonly inspiration: string;
  readonly suppliedLock: string;
  readonly suppliedMask: string;
  readonly detailPanel: string;
  readonly detailClose: string;
  readonly pagePrevious: string;
  readonly pageNext: string;
  readonly pageIndicator: string;
  readonly starFilled: string;
  readonly starEmpty: string;
  readonly guideBook: string;
  readonly newBadge: string;
}

export interface AchievementArtUrls {
  readonly panel: string;
  readonly close: string;
  readonly rowActive: string;
  readonly rowInactive: string;
  readonly medalInactive: string;
  readonly medalActive: string;
  readonly claimedCheck: string;
  readonly summaryPanel: string;
  readonly buttonGreen: string;
  readonly buttonGrey: string;
  readonly progressTrack: string;
  readonly progressFillGreen: string;
  readonly progressFillBlue: string;
}

export interface MusicLibraryArtUrls {
  readonly background: string;
  readonly panel: string;
  readonly deck: string;
  readonly header: string;
  readonly vinyl: string;
  readonly vinylDisc: string;
  readonly tonearm: string;
  readonly progressTrack: string;
  readonly progressFill: string;
  readonly progressKnob: string;
  readonly rowSelected: string;
  readonly rowLocked: string;
  readonly statusUnlocked: string;
  readonly statusLocked: string;
  readonly lock: string;
  readonly equalizer: string;
  readonly close: string;
  readonly play: string;
  readonly previous: string;
  readonly next: string;
  readonly volume: string;
  readonly entry: string;
  readonly albums: readonly string[];
}

export const MUSIC_LIBRARY_ART_URLS = {
  background: "assets/art/ui/music-player-v1/music-background.png",
  panel: "assets/art/ui/music-player-v1/music-panel-frame.png",
  deck: "assets/art/ui/music-player-v1/music-player-deck.png",
  header: "assets/art/ui/music-player-v1/music-header-banner.png",
  vinyl: "assets/art/ui/music-player-v1/music-vinyl-overlay.png",
  vinylDisc: "assets/art/ui/music-player-v1/music-vinyl-disc.png",
  tonearm: "assets/art/ui/music-player-v1/music-vinyl-tonearm.png",
  progressTrack: "assets/art/ui/music-player-v1/music-progress-track.png",
  progressFill: "assets/art/ui/music-player-v1/music-progress-fill.png",
  progressKnob: "assets/art/ui/music-player-v1/music-progress-knob.png",
  rowSelected: "assets/art/ui/music-player-v1/music-row-selected.png",
  rowLocked: "assets/art/ui/music-player-v1/music-row-locked.png",
  statusUnlocked: "assets/art/ui/music-player-v1/music-status-unlocked.png",
  statusLocked: "assets/art/ui/music-player-v1/music-status-locked.png",
  lock: "assets/art/ui/music-player-v1/music-lock-icon.png",
  equalizer: "assets/art/ui/music-player-v1/music-equalizer-icon.png",
  close: "assets/art/ui/music-player-v1/music-close-button.png",
  play: "assets/art/ui/music-player-v1/music-play-button.png",
  previous: "assets/art/ui/music-player-v1/music-prev-button.png",
  next: "assets/art/ui/music-player-v1/music-skip-button.png",
  volume: "assets/art/ui/music-player-v1/music-volume-icon.png",
  entry: "assets/art/ui/music-player-v1/music-entry-icon.png",
  albums: [
    "assets/art/ui/music-player-v1/album-desert-dawn.png",
    "assets/art/ui/music-player-v1/album-lighthouse-bay.png",
    "assets/art/ui/music-player-v1/album-starry-journey.png",
    "assets/art/ui/music-player-v1/album-forest-stream.png",
  ],
} as const satisfies MusicLibraryArtUrls;

export const ACHIEVEMENT_ART_URLS = {
  panel: "assets/art/ui/formal-pages/achievements-v2/panel.png",
  close: "assets/art/ui/formal-pages/daily-tasks-v2/close.png",
  rowActive: "assets/art/ui/formal-pages/achievements-v2/row-active.png",
  rowInactive: "assets/art/ui/formal-pages/achievements-v2/row-inactive.png",
  medalInactive: "assets/art/ui/formal-pages/achievements-v2/medal-inactive.png",
  medalActive: "assets/art/ui/formal-pages/achievements-v2/medal-active.png",
  claimedCheck: "assets/art/ui/formal-pages/achievements-v2/claimed-check.png",
  summaryPanel: "assets/art/ui/formal-pages/achievements-v2/summary-panel.png",
  buttonGreen: "assets/art/ui/formal-pages/achievements-v2/button-green.png",
  buttonGrey: "assets/art/ui/formal-pages/daily-tasks-v2/button-grey.png",
  progressTrack: "assets/art/ui/formal-pages/achievements-v2/progress-track.png",
  progressFillGreen: "assets/art/ui/formal-pages/achievements-v2/progress-fill-green.png",
  progressFillBlue: "assets/art/ui/formal-pages/achievements-v2/progress-fill-blue.png",
} as const satisfies AchievementArtUrls;

export interface DailyTaskArtUrls {
  readonly panel: string;
  readonly close: string;
  readonly taskRow: string;
  readonly taskTrophy: string;
  readonly taskShield: string;
  readonly taskBooster: string;
  readonly claimedCheck: string;
  readonly chest: string;
  readonly calendar: string;
  readonly summaryPanel: string;
  readonly buttonGreen: string;
  readonly buttonGrey: string;
  readonly buttonYellow: string;
  readonly progressTrack: string;
  readonly progressFill: string;
  readonly bonusPanel: string;
}

export interface DailyChallengeArtUrls {
  readonly panelFrame: string;
  readonly closeButton: string;
  readonly rewardBanner: string;
  readonly difficultyDiamond: string;
  readonly difficultyDiamond2: string;
  readonly difficultyDiamond3: string;
  readonly rewardCard: string;
  readonly firstClearTag: string;
  readonly challengeButton: string;
  readonly coinIcon: string;
  readonly gemIcon: string;
  readonly claimedCheck: string;
}

export const DAILY_CHALLENGE_ART_URLS = {
  panelFrame: "assets/art/ui/daily-challenge-supplied-v1/panel-frame.png",
  closeButton: "assets/art/ui/daily-challenge-supplied-v1/close-button.png",
  rewardBanner: "assets/art/ui/daily-challenge-supplied-v1/reward-banner.png",
  difficultyDiamond: "assets/art/ui/daily-challenge-supplied-v1/difficulty-1.png",
  difficultyDiamond2: "assets/art/ui/daily-challenge-supplied-v1/difficulty-2.png",
  difficultyDiamond3: "assets/art/ui/daily-challenge-supplied-v1/difficulty-3.png",
  rewardCard: "assets/art/ui/daily-challenge-supplied-v1/reward-card.png",
  firstClearTag: "assets/art/ui/daily-challenge-supplied-v1/first-clear-tag.png",
  challengeButton: "assets/art/ui/daily-challenge-supplied-v1/challenge-button.png",
  coinIcon: "assets/art/ui/daily-challenge-supplied-v1/coin-icon.png",
  gemIcon: "assets/art/ui/daily-challenge-supplied-v1/inspiration-icon.png",
  claimedCheck: "assets/art/ui/formal-pages/daily-tasks-v2/claimed-check.png",
} as const satisfies DailyChallengeArtUrls;

/** Historical art retained for archived layouts; never loaded by the daily page. */
export const LEGACY_DAILY_CHALLENGE_ART_URLS = [
  "assets/art/ui/daily-challenge-v1/entry-icon.png",
  "assets/art/ui/daily-challenge-v1/lock-icon.png",
  "assets/art/ui/daily-challenge-v1/plus-icon.png",
  "assets/art/ui/daily-challenge-v2/panel-frame.png",
  "assets/art/ui/daily-challenge-v2/header-bar.png",
  "assets/art/ui/daily-challenge-v2/reward-banner.png",
  "assets/art/ui/daily-challenge-v2/row-frame.png",
  "assets/art/ui/daily-challenge-v2/reward-card.png",
  "assets/art/ui/daily-challenge-v2/first-clear-tag.png",
  "assets/art/ui/daily-challenge-v2/challenge-button.png",
  "assets/art/ui/daily-challenge-v2/locked-button.png",
  "assets/art/ui/daily-challenge-v2/close-button.png",
  "assets/art/ui/daily-challenge-v2/attempt-badge.png",
  "assets/art/ui/daily-challenge-v2/difficulty-diamond.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-15.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-16.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-17.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-18.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-19.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-20.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-21.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-22.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-23.png"
,
  "assets/art/ui/profile-unlocks-v1/avatar-24.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-9.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-10.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-11.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-12.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-13.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-14.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-15.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-16.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-17.png"
,
  "assets/art/ui/profile-unlocks-v1/frame-18.png"
] as const;

export const DAILY_TASK_ART_URLS = {
  panel: "assets/art/ui/formal-pages/daily-tasks-v2/panel.png",
  close: "assets/art/ui/formal-pages/daily-tasks-v2/close.png",
  taskRow: "assets/art/ui/formal-pages/daily-tasks-v2/task-row.png",
  taskTrophy: "assets/art/ui/formal-pages/daily-tasks-v2/task-trophy.png",
  taskShield: "assets/art/ui/formal-pages/daily-tasks-v2/task-shield.png",
  taskBooster: "assets/art/ui/formal-pages/daily-tasks-v2/task-booster.png",
  claimedCheck: "assets/art/ui/formal-pages/daily-tasks-v2/claimed-check.png",
  chest: "assets/art/ui/formal-pages/daily-tasks-v2/chest.png",
  calendar: "assets/art/ui/formal-pages/daily-tasks-v2/calendar.png",
  summaryPanel: "assets/art/ui/formal-pages/daily-tasks-v2/summary-panel.png",
  buttonGreen: "assets/art/ui/formal-pages/daily-tasks-v2/button-green.png",
  buttonGrey: "assets/art/ui/formal-pages/daily-tasks-v2/button-grey.png",
  buttonYellow: "assets/art/ui/formal-pages/daily-tasks-v2/button-yellow.png",
  progressTrack: "assets/art/ui/formal-pages/daily-tasks-v2/progress-track.png",
  progressFill: "assets/art/ui/formal-pages/daily-tasks-v2/progress-fill.png",
  bonusPanel: "assets/art/ui/formal-pages/daily-tasks-v2/bonus-panel.png",
} as const satisfies DailyTaskArtUrls;

export const COLLECTION_ALBUM_ART_URLS = {
  background: "assets/art/ui/formal-pages/collection/background.png",
  topHeader: "assets/art/ui/formal-pages/collection/top-header.png",
  titlePanel: "assets/art/ui/formal-pages/collection/title-panel.png",
  suppliedTabBlue: "assets/art/ui/formal-pages/collection-album-v3/tab-blue.png",
  suppliedTabPurple: "assets/art/ui/formal-pages/collection-album-v3/tab-purple.png",
  suppliedCardGray: "assets/art/ui/formal-pages/collection-album-v3/card-gray.png",
  suppliedCardBlue: "assets/art/ui/formal-pages/collection-album-v3/card-blue.png",
  suppliedCardPurple: "assets/art/ui/formal-pages/collection-album-v3/card-purple.png",
  suppliedCardGold: "assets/art/ui/formal-pages/collection-album-v3/card-gold.png",
  suppliedProgressIcon: "assets/art/ui/formal-pages/collection-album-v3/progress-icon.png",
  suppliedProgressPanel: "assets/art/ui/formal-pages/collection-album-v2/progress-panel.png",
  inspiration: "assets/art/ui/formal-pages/collection-album-v1/inspiration.webp",
  suppliedLock: "assets/art/ui/formal-pages/collection-album-v3/lock.png",
  suppliedMask: "assets/art/ui/formal-pages/collection-album-v3/mask.png",
  detailPanel: "assets/art/ui/formal-pages/collection-album-v2/detail-panel.png",
  detailClose: "assets/art/ui/formal-pages/daily-tasks-v2/close.png",
  pagePrevious: "assets/art/ui/formal-pages/collection-album-v3/page-previous.png",
  pageNext: "assets/art/ui/formal-pages/collection-album-v3/page-next.png",
  pageIndicator: "assets/art/ui/formal-pages/collection-album-v3/page-indicator.png",
  starFilled: "assets/art/ui/formal-pages/collection-album-v3/star-filled.png",
  starEmpty: "assets/art/ui/formal-pages/collection-album-v3/star-empty.png",
  guideBook: "assets/art/ui/formal-pages/collection-album-v3/guide-book.png",
  newBadge: "assets/art/ui/formal-pages/collection-album-v1/new-badge.webp",
} as const satisfies CollectionAlbumArtUrls;

export interface CollectionCardAtlasUrls {
  readonly levels: readonly string[];
  readonly masterpieces: readonly string[];
}

export const COLLECTION_CARD_ATLAS_URLS = {
  levels: [
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-01.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-02.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-03.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-04.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-05.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-06.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-07.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/level-08.jpg",
  ],
  masterpieces: [
    "assets/art/ui/formal-pages/collection-card-atlases-v1/masterpiece-01.jpg",
    "assets/art/ui/formal-pages/collection-card-atlases-v1/masterpiece-02.jpg",
  ],
} as const satisfies CollectionCardAtlasUrls;

const formalBlockArt = (color: string) => ({
  solid: {
    1: `assets/art/gameplay/blocks/formal-v1/${color}-single.png`,
    2: `assets/art/gameplay/blocks/formal-v1/${color}-vertical-2.png`,
    3: `assets/art/gameplay/blocks/formal-v1/${color}-vertical-3.png`,
    4: `assets/art/gameplay/blocks/formal-v1/${color}-l-triomino.png`,
    5: `assets/art/gameplay/blocks/formal-v1/${color}-s-tetromino.png`,
    6: `assets/art/gameplay/blocks/formal-v1/${color}-t-tetromino.png`,
    7: `assets/art/gameplay/blocks/formal-v1/${color}-square-2x2.png`,
    8: `assets/art/gameplay/blocks/formal-v1/${color}-horizontal-2.png`,
    9: `assets/art/gameplay/blocks/formal-v1/${color}-horizontal-3.png`,
    10: `assets/art/gameplay/blocks/formal-v1/${color}-l-tetromino.png`,
    ...(color === "red" || color === "purple" || color === "cyan" ? {
      11: `assets/art/gameplay/blocks/formal-v1/${color}-z-tetromino.png`,
    } : {}),
    ...(color === "yellow" ? {
      12: "assets/art/gameplay/blocks/formal-v1/yellow-plus-pentomino-generated.png",
    } : color === "green" ? {
      12: "assets/art/gameplay/blocks/formal-v1/green-plus-pentomino-generated.png",
    } : color === "blue" || color === "pink" || color === "purple"
      || color === "cyan" || color === "red" ? {
        12: `assets/art/gameplay/blocks/formal-v1/${color}-plus-pentomino.png`,
      } : {}),
    13: `assets/art/gameplay/blocks/formal-v1/${color}-rectangle-2x3.png`,
    14: `assets/art/gameplay/blocks/formal-v1/${color}-square-3x3.png`,
    21: `assets/art/gameplay/blocks/formal-v1/${color}-rectangle-3x2.png`,
    ...(color === "blue" || color === "pink" ? {
      15: `assets/art/gameplay/blocks/formal-v1/${color}-horizontal-4.png`,
    } : {}),
    ...(color === "pink" ? {
      16: `assets/art/gameplay/blocks/formal-v1/${color}-t-pentomino.png`,
    } : {}),
    ...(color === "green" ? {
      17: "assets/art/gameplay/blocks/formal-v1/green-l-pentomino-generated.png",
    } : {}),
    ...(color === "yellow" ? {
      18: "assets/art/gameplay/blocks/formal-v1/yellow-t-hexomino-generated.png",
    } : {}),
    19: `assets/art/gameplay/blocks/formal-v1/${color}-mirrored-l-tetromino.png`,
    ...(color === "cyan" ? {
      20: "assets/art/gameplay/blocks/formal-v1/cyan-square-3x3-corner-notch-generated.png",
    } : {}),
  },
  shell: {
    1: `assets/art/gameplay/blocks/formal-v1/${color}-shell-single.png`,
    2: `assets/art/gameplay/blocks/formal-v1/${color}-shell-vertical-2.png`,
    3: `assets/art/gameplay/blocks/formal-v1/${color}-shell-vertical-3.png`,
    7: `assets/art/gameplay/blocks/formal-v1/${color}-shell-square-2x2.png`,
    8: `assets/art/gameplay/blocks/formal-v1/${color}-shell-horizontal-2.png`,
    9: `assets/art/gameplay/blocks/formal-v1/${color}-shell-horizontal-3.png`,
  },
});

const formalGateArt = (color: string) => ({
  horizontal: {
    1: `assets/art/gameplay/board/formal-border-v2/gate-${color}-horizontal-1.png`,
    2: `assets/art/gameplay/board/formal-border-v2/gate-${color}-horizontal-2.png`,
    3: `assets/art/gameplay/board/formal-border-v2/gate-${color}-horizontal-3.png`,
  },
  vertical: {
    1: `assets/art/gameplay/board/formal-border-v2/gate-${color}-vertical-1.png`,
    2: `assets/art/gameplay/board/formal-border-v2/gate-${color}-vertical-2.png`,
    3: `assets/art/gameplay/board/formal-border-v2/gate-${color}-vertical-3.png`,
  },
});

// Numeric-ice overlays are authored as whole-piece silhouettes so their
// bevels, highlights, and translucent body remain continuous across cells.
// Shapes without a supplied whole-piece image fall back to the single-cell
// overlay in the renderer.
const FORMAL_ICE_BLOCK_ART = {
  1: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-cell.png",
  2: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-vertical-2.png",
  3: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-vertical-3.png",
  4: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-l-triomino.png",
  5: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-s-tetromino.png",
  6: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-t-tetromino.png",
  7: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-square-2x2.png",
  8: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-horizontal-2.png",
  9: "assets/art/gameplay/mechanics/formal-gameplay-v1/ice-horizontal-3.png",
} as const;

// Gold overlays supplied for the authored star-block and star-gate variants.
// They are kept separate from the coloured base art so designers can replace
// the overlays without touching gameplay rendering or level data.
const FORMAL_STAR_BLOCK_ART = {
  1: "assets/art/gameplay/mechanics/formal-star-v1/star-block-single.png",
  2: "assets/art/gameplay/mechanics/formal-star-v1/star-block-vertical-2.png",
  3: "assets/art/gameplay/mechanics/formal-star-v1/star-block-vertical-3.png",
  4: "assets/art/gameplay/mechanics/formal-star-v1/star-block-l-triomino.png",
  5: "assets/art/gameplay/mechanics/formal-star-v1/star-block-s-tetromino.png",
  6: "assets/art/gameplay/mechanics/formal-star-v1/star-block-t-tetromino.png",
  7: "assets/art/gameplay/mechanics/formal-star-v1/star-block-square-2x2.png",
  8: "assets/art/gameplay/mechanics/formal-star-v1/star-block-horizontal-2.png",
  9: "assets/art/gameplay/mechanics/formal-star-v1/star-block-horizontal-3.png",
  10: "assets/art/gameplay/mechanics/formal-star-v1/star-block-l-tetromino.png",
  19: "assets/art/gameplay/mechanics/formal-star-v1/star-block-mirrored-l-tetromino.png",
} as const;

const FORMAL_STAR_GATE_ART = {
  horizontal: {
    1: "assets/art/gameplay/board/formal-star-v1/star-gate-horizontal-1.png",
    2: "assets/art/gameplay/board/formal-star-v1/star-gate-horizontal-2.png",
    3: "assets/art/gameplay/board/formal-star-v1/star-gate-horizontal-3.png",
  },
  vertical: {
    1: "assets/art/gameplay/board/formal-star-v1/star-gate-vertical-1.png",
    2: "assets/art/gameplay/board/formal-star-v1/star-gate-vertical-2.png",
    3: "assets/art/gameplay/board/formal-star-v1/star-gate-vertical-3.png",
  },
} as const;

// Runtime paths live in one place so project owners can replace artwork
// without searching through rendering code. Keep filenames stable when only
// swapping art; update this manifest only when the path or atlas layout changes.
export const GAME_ART = {
  backgrounds: {
    home: "assets/art/ui/home-v3/background.jpg",
    gameplay: "assets/art/backgrounds/gameplay-formal-v1.png",
    startup: "assets/art/ui/startup-v1/loading-background.jpg",
  },
  ui: {
    gameplay: {
      backButton: "assets/art/ui/gameplay-v1/back-button.png",
      pauseButton: "assets/art/ui/gameplay-v1/pause-button.png",
      levelPill: "assets/art/ui/gameplay-v1/level-pill.png",
      timerIcon: "assets/art/ui/gameplay-v1/timer-icon.png",
      timerPanel: "assets/art/ui/gameplay-v1/timer-panel.png",
      boosterBase: "assets/art/ui/gameplay-v1/booster-base.png",
      boosterCountBadge: "assets/art/ui/gameplay-v1/booster-count-badge.png",
      boosterPlus: "assets/art/ui/gameplay-v1/booster-plus.png",
      boosterTime: "assets/art/ui/gameplay-v1/booster-time.png",
      boosterRocket: "assets/art/ui/gameplay-v1/booster-rocket.png",
      boosterPulse: "assets/art/ui/gameplay-v1/booster-pulse.png",
    },
    home: {
      topHeader: "assets/art/ui/home-v3/top-header.png",
      resourcePanel: "assets/art/ui/home-v3/resource-panel.png",
      coinIcon: "assets/art/ui/home-v3/coin-icon.png",
      heartIcon: "assets/art/ui/home-v3/heart-icon.png",
      addButton: "assets/art/ui/home-v3/add-button.png",
      settingsButton: "assets/art/ui/home-v3/settings-icon.png",
      levelPlate: "assets/art/ui/home-v3/level-plate.png",
      arrowLeft: "assets/art/ui/home-v3/arrow-left.png",
      arrowRight: "assets/art/ui/home-v3/arrow-right.png",
      starLeft: "assets/art/ui/home-v3/star-left.png",
      starCenter: "assets/art/ui/home-v3/star-center.png",
      starRight: "assets/art/ui/home-v3/star-right.png",
      emptyStarLeft: "assets/art/ui/home-v3/star-empty-left.png",
      emptyStarCenter: "assets/art/ui/home-v3/star-empty-center.png",
      emptyStarRight: "assets/art/ui/home-v3/star-empty-right.png",
      startButton: "assets/art/ui/home-v3/start-button.png",
      navigationBar: "assets/art/ui/home-v3/navigation-bar.png",
      navigationSelected: "assets/art/ui/home-v3/navigation-selected.png",
      navigationDivider: "assets/art/ui/home-v3/navigation-divider.png",
      shopIcon: "assets/art/ui/home-v3/shop-icon.png",
      featureLock: "assets/art/ui/home-v3/feature-lock.png",
      shopIconLocked: "assets/art/ui/home-v3/shop-icon-locked.png",
      leaderboardIcon: "assets/art/ui/home-v3/leaderboard-icon.png",
      leaderboardIconLocked: "assets/art/ui/home-v3/leaderboard-icon-locked.png",
      homeIcon: "assets/art/ui/home-v3/home-icon.png",
      journeyIcon: "assets/art/ui/home-v3/journey-icon.png",
      journeyIconLocked: "assets/art/ui/home-v3/journey-icon-locked.png",
      collectionIcon: "assets/art/ui/home-v3/collection-icon.png",
      collectionAlbumEntry: "assets/art/ui/home-v3/collection-album-entry.png",
      dailyTaskEntry: "assets/art/ui/home-v3/daily-tasks-entry.png",
      sideEntryBase: "assets/art/ui/home-v3/side-entry-base.png",
      leagueEntry: "assets/art/ui/home-v3/league-entry.png",
      dailyChallengeEntry: "assets/art/ui/home-v3/daily-challenge-entry.png",
      achievementEntry: "assets/art/ui/home-v3/achievements-entry.png",
    },
    collectionAlbum: COLLECTION_ALBUM_ART_URLS,
    collectionCardAtlases: COLLECTION_CARD_ATLAS_URLS,
    dailyTasks: DAILY_TASK_ART_URLS,
    dailyChallenge: DAILY_CHALLENGE_ART_URLS,
    achievements: ACHIEVEMENT_ART_URLS,
    musicLibrary: MUSIC_LIBRARY_ART_URLS,
    formalPages: {
      shop: {
        reference: "assets/art/ui/formal-pages/shop/reference.png",
        buyButton: "assets/art/ui/formal-pages/shop/buy-button.png",
        boosterTile: "assets/art/ui/formal-pages/shop/booster-tile.png",
        priceCoin: "assets/art/ui/formal-pages/shop/price-coin.png",
        time: "assets/art/ui/formal-pages/shop/time.png",
        rocket: "assets/art/ui/formal-pages/shop/rocket.png",
        pulse: "assets/art/ui/formal-pages/shop/pulse.png",
      },
      leaderboard: {
        background: "assets/art/ui/formal-pages/leaderboard/background.png",
        topHeader: "assets/art/ui/formal-pages/leaderboard/top-header.png",
        titlePanel: "assets/art/ui/formal-pages/leaderboard/title-panel.png",
        title: "assets/art/ui/formal-pages/leaderboard/title.png",
        tabsFrame: "assets/art/ui/formal-pages/leaderboard/tabs-frame.png",
        tabActive: "assets/art/ui/formal-pages/leaderboard/tab-active.png",
        tabInactive: "assets/art/ui/formal-pages/leaderboard/tab-inactive.png",
        podium: "assets/art/ui/formal-pages/leaderboard/podium.png",
        avatars: {
          fox: "assets/art/ui/formal-pages/leaderboard/avatar-fox.png",
          raccoon: "assets/art/ui/formal-pages/leaderboard/avatar-raccoon.png",
          panda: "assets/art/ui/formal-pages/leaderboard/avatar-panda.png",
          rabbit: "assets/art/ui/formal-pages/leaderboard/avatar-rabbit.png",
          cat: "assets/art/ui/formal-pages/leaderboard/avatar-cat.png",
        },
        podiumNameplates: {
          gold: "assets/art/ui/formal-pages/leaderboard/podium-nameplate-gold.png",
          silver: "assets/art/ui/formal-pages/leaderboard/podium-nameplate-silver.png",
          bronze: "assets/art/ui/formal-pages/leaderboard/podium-nameplate-bronze.png",
        },
        podiumMedals: {
          gold: "assets/art/ui/formal-pages/leaderboard/podium-medal-gold.png",
          silver: "assets/art/ui/formal-pages/leaderboard/podium-medal-silver.png",
          bronze: "assets/art/ui/formal-pages/leaderboard/podium-medal-bronze.png",
        },
        rankMedals: {
          gold: "assets/art/ui/formal-pages/leaderboard/rank-medal-gold.png",
          silver: "assets/art/ui/formal-pages/leaderboard/rank-medal-silver.png",
          bronze: "assets/art/ui/formal-pages/leaderboard/rank-medal-bronze.png",
        },
        row: "assets/art/ui/formal-pages/leaderboard/row.png",
        levelPill: "assets/art/ui/formal-pages/leaderboard/level-pill.png",
        playerRow: "assets/art/ui/formal-pages/leaderboard/player-row.png",
        playerLevelPill: "assets/art/ui/formal-pages/leaderboard/player-level-pill.png",
        star: "assets/art/ui/formal-pages/leaderboard/star.png",
      },
      journey: {
        background: "assets/art/ui/formal-pages/journey/background.jpg",
        topHeader: "assets/art/ui/formal-pages/journey/top-header.png",
        titlePanel: "assets/art/ui/formal-pages/journey/title-panel.png",
        title: "assets/art/ui/formal-pages/journey/title.png",
        track: "assets/art/ui/formal-pages/journey/track.png",
        trackProgress: "assets/art/ui/formal-pages/journey/track-progress.png",
        destination: "assets/art/ui/formal-pages/journey/destination.png",
        currentMarker: "assets/art/ui/formal-pages/journey/current-marker.png",
        episodes: [
          "assets/art/ui/formal-pages/journey/episode-01.webp",
          "assets/art/ui/formal-pages/journey/episode-02.webp",
          "assets/art/ui/formal-pages/journey/episode-03.webp",
          "assets/art/ui/formal-pages/journey/episode-04.webp",
          "assets/art/ui/formal-pages/journey/episode-05.webp",
          "assets/art/ui/formal-pages/journey/episode-06.webp",
          "assets/art/ui/formal-pages/journey/episode-07.webp",
          "assets/art/ui/formal-pages/journey/episode-08.webp",
          "assets/art/ui/formal-pages/journey/episode-09.webp",
          "assets/art/ui/formal-pages/journey/episode-10.webp",
        ],
        homeThemes: [
          "assets/art/ui/home-v3/background.jpg",
          "assets/art/ui/formal-pages/journey/home-02.jpg",
          "assets/art/ui/formal-pages/journey/home-03.jpg",
          "assets/art/ui/formal-pages/journey/home-04.jpg",
          "assets/art/ui/formal-pages/journey/home-05.jpg",
          "assets/art/ui/formal-pages/journey/home-06.jpg",
          "assets/art/ui/formal-pages/journey/home-07.jpg",
          "assets/art/ui/formal-pages/journey/home-08.jpg",
          "assets/art/ui/formal-pages/journey/home-09.jpg",
          "assets/art/ui/formal-pages/journey/home-10.jpg",
        ],
        lockedShade: "assets/art/ui/formal-pages/journey/episode-locked-shade.png",
        episodeRangePanel: "assets/art/ui/formal-pages/journey/episode-range-panel.png",
        episodeSelectedButton: "assets/art/ui/formal-pages/journey/episode-selected-button.png",
        episodeActionButton: "assets/art/ui/formal-pages/journey/episode-action-button.png",
        lock: "assets/art/ui/formal-pages/journey/lock.png",
        presentation: {
          panel: "assets/art/ui/formal-pages/journey/presentation-panel.png",
          close: "assets/art/ui/formal-pages/journey/presentation-close.png",
          episodeButton: "assets/art/ui/formal-pages/journey/presentation-episode-button.png",
          rewardButton: "assets/art/ui/formal-pages/journey/presentation-reward-button.png",
          titleEpisodeUnlocked: "assets/art/ui/formal-pages/journey/title-episode-unlocked.png",
          titleJourneyRewards: "assets/art/ui/formal-pages/journey/title-journey-rewards.png",
          rewards: {
            pulse: "assets/art/ui/formal-pages/journey/presentation-reward-pulse.png",
            time: "assets/art/ui/formal-pages/journey/presentation-reward-time.png",
            rocket: "assets/art/ui/formal-pages/journey/presentation-reward-rocket.png",
            heart: "assets/art/ui/formal-pages/journey/presentation-reward-heart.png",
            coins: "assets/art/ui/formal-pages/journey/presentation-reward-coins.png",
          },
        },
        levelCardLeft: "assets/art/ui/formal-pages/journey/level-card-left.png",
        levelCardActiveLeft: "assets/art/ui/formal-pages/journey/level-card-active-left.png",
        rewardCardRight: "assets/art/ui/formal-pages/journey/reward-card-right.png",
        rewardCardActiveRight: "assets/art/ui/formal-pages/journey/reward-card-active-right.png",
        rewards: {
          time: "assets/art/ui/formal-pages/journey/reward-time.png",
          rocket: "assets/art/ui/formal-pages/journey/reward-rocket.png",
          pulse: "assets/art/ui/formal-pages/journey/reward-pulse.png",
          heart: "assets/art/ui/formal-pages/journey/reward-heart.png",
          coins: "assets/art/ui/formal-pages/journey/reward-coins.png",
          complete: "assets/art/ui/formal-pages/journey/reward-complete.png",
        },
      },
      collection: {
        background: "assets/art/ui/formal-pages/collection/background.png",
        topHeader: "assets/art/ui/formal-pages/collection/top-header.png",
        titlePanel: "assets/art/ui/formal-pages/collection/title-panel.png",
        panel: "assets/art/ui/formal-pages/mechanism-guide-v2/panel.png",
        close: "assets/art/ui/formal-pages/daily-tasks-v2/close.png",
        titleShadow: "assets/art/ui/formal-pages/mechanism-guide-v2/detail-title.png",
        detailPanel: "assets/art/ui/formal-pages/mechanism-guide-v2/detail-panel.png",
        detailBody: "assets/art/ui/formal-pages/mechanism-guide-v2/detail-body.png",
        card: "assets/art/ui/formal-pages/mechanism-guide-v2/card.png",
        lockedOverlay: "assets/art/ui/formal-pages/mechanism-guide-v2/locked-overlay.png",
        lock: "assets/art/ui/formal-pages/mechanism-guide-v2/lock.png",
        selected: "assets/art/ui/formal-pages/mechanism-guide-v2/selected.png",
        itemImages: [
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-generator.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-axis-block.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-key-lock.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-star.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-flip-door.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-colored-grid.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-bomb.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-shutter.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-layered-lift.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-color-exit.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-irregular-block.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-irregular-board.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-frozen-exit.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-numeric-ice.png",
          "assets/art/ui/formal-pages/mechanism-guide-v2/icon-multilayer-shell.png",
        ],
        // Source originals remain archived; unused icons are not runtime loads.
        retiredItemImages: [],
      },
    },
    pauseSettings: {
      panel: "assets/art/ui/formal-pages/overlays/pause-settings/panel.png",
      close: "assets/art/ui/formal-pages/overlays/pause-settings/close.png",
      sound: "assets/art/ui/formal-pages/overlays/pause-settings/sound.png",
      haptic: "assets/art/ui/formal-pages/overlays/pause-settings/haptic.png",
      effects: "assets/art/ui/formal-pages/overlays/pause-settings/reduced-motion.png",
      toggleOn: "assets/art/ui/formal-pages/overlays/pause-settings/toggle-on.png",
      toggleOff: "assets/art/ui/formal-pages/overlays/pause-settings/toggle-off.png",
      replayButton: "assets/art/ui/formal-pages/overlays/pause-settings/replay-button.png",
      homeButton: "assets/art/ui/formal-pages/overlays/pause-settings/home-button.png",
      clearProgressButton: "assets/art/ui/formal-pages/overlays/pause-settings/clear-progress-button.png",
    },
    statusOverlay: {
      remainingPanel: "assets/art/ui/formal-pages/overlays/status/remaining-panel.png",
      clock: "assets/art/ui/formal-pages/overlays/status/clock.png",
      featureIceDoor: "assets/art/ui/formal-pages/overlays/status/feature-ice-door.png",
    },
    win: {
      panel: "assets/art/ui/formal-pages/overlays/win/panel.png",
      glow: "assets/art/ui/formal-pages/overlays/win/glow.png",
      rewardPill: "assets/art/ui/formal-pages/overlays/win/reward-pill.png",
      coinPile: "assets/art/ui/formal-pages/overlays/win/coin-pile.png",
      continueButton: "assets/art/ui/formal-pages/overlays/win/continue-button.png",
      close: "assets/art/ui/formal-pages/overlays/win/close.png",
    },
    boosters: "assets/art/ui/icons/booster-icons-v1.png",
    boosterUnlockBanner: "assets/art/ui/notifications/booster-unlock-banner-v1.png",
    discoveryBadge: "assets/art/ui/notifications/discovery-badge-v1.png",
    lockedHintPanel: "assets/art/ui/formal-pages/supplied-popups-v1/scene/locked-hint-panel.png",
    onboardingDaily: "assets/art/ui/icons/onboarding-daily-icons-v1.png",
    tutorialHand: "assets/art/ui/icons/tutorial-hand-supplied-v2.png",
    universalPanel: "assets/art/ui/chrome/universal-panel-v2.png",
    buttons: "assets/art/ui/chrome/buttons-v2.png",
    systemIcons: "assets/art/ui/icons/system-icons-v1.png",
  },
  gameplay: {
    formalBlocks: {
      red: formalBlockArt("red"),
      blue: formalBlockArt("blue"),
      green: formalBlockArt("green"),
      yellow: formalBlockArt("yellow"),
      purple: formalBlockArt("purple"),
      orange: formalBlockArt("orange"),
      pink: formalBlockArt("pink"),
      cyan: formalBlockArt("cyan"),
    },
    gates: {
      red: formalGateArt("red"),
      blue: formalGateArt("blue"),
      green: formalGateArt("green"),
      yellow: formalGateArt("yellow"),
      purple: formalGateArt("purple"),
      orange: formalGateArt("orange"),
      pink: formalGateArt("pink"),
      cyan: formalGateArt("cyan"),
    },
    iceStrips: {
      horizontal: {
        1: "assets/art/gameplay/mechanics/formal-ice-v1/ice-horizontal-1.png",
        2: "assets/art/gameplay/mechanics/formal-ice-v1/ice-horizontal-2.png",
        3: "assets/art/gameplay/mechanics/formal-ice-v1/ice-horizontal-3.png",
      },
      vertical: {
        1: "assets/art/gameplay/mechanics/formal-ice-v1/ice-vertical-1.png",
        2: "assets/art/gameplay/mechanics/formal-ice-v1/ice-vertical-2.png",
        3: "assets/art/gameplay/mechanics/formal-ice-v1/ice-vertical-3.png",
      },
    },
    gateDirectionArrow: "assets/art/gameplay/board/formal-border-v1/direction-arrow.png",
    formalFloor: "assets/art/gameplay/board/formal-floor-v1/empty-cells-2x2.png",
    emptyCell: "assets/art/gameplay/board/empty-cell-v1.png",
    boardRim: {
      railOneCell: "assets/art/gameplay/board/formal-border-v1/neutral-rail-1-cell.png",
      innerCorner: "assets/art/gameplay/board/formal-border-v1/neutral-corner-inner.png",
      outerCorner: "assets/art/gameplay/board/formal-border-v1/neutral-corner-outer.png",
      horizontal: {
        1: "assets/art/gameplay/board/formal-border-v2/neutral-horizontal-1.png",
        2: "assets/art/gameplay/board/formal-border-v2/neutral-horizontal-2.png",
        3: "assets/art/gameplay/board/formal-border-v2/neutral-horizontal-3.png",
      },
      vertical: {
        1: "assets/art/gameplay/board/formal-border-v2/neutral-vertical-1.png",
        2: "assets/art/gameplay/board/formal-border-v2/neutral-vertical-2.png",
        3: "assets/art/gameplay/board/formal-border-v2/neutral-vertical-3.png",
      },
      corners: {
        southWest: "assets/art/gameplay/board/formal-border-v2/corner-south-west.png",
        southEast: "assets/art/gameplay/board/formal-border-v2/corner-south-east.png",
        northWest: "assets/art/gameplay/board/formal-border-v2/corner-north-west.png",
        northEast: "assets/art/gameplay/board/formal-border-v2/corner-north-east.png",
      },
    },
    shutter: "assets/art/gameplay/mechanics/shutter-v1.png",
    iceCover: "assets/art/gameplay/mechanics/ice-cover-v1.png",
    formalIceBlocks: FORMAL_ICE_BLOCK_ART,
    formalIceCell: FORMAL_ICE_BLOCK_ART[1],
    starBlocks: FORMAL_STAR_BLOCK_ART,
    starGates: FORMAL_STAR_GATE_ART,
    progressionMechanics: "assets/art/gameplay/mechanics/progression-mechanics-atlas-v1.png",
    layerPreviewBadges: "assets/art/gameplay/mechanics/layer-preview-badges-v1.png",
    videoParity: {
      movementAxis: "assets/art/gameplay/mechanics/video-parity-v1/arrow-axis-overlay-v1.png",
      keyToken: "assets/art/gameplay/mechanics/video-parity-v1/key-token-v1.png",
      chainLock: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-v1.png",
      keyTokens: {
        red: "assets/art/gameplay/mechanics/video-parity-v1/key-token-red-v1.png",
        blue: "assets/art/gameplay/mechanics/video-parity-v1/key-token-blue-v1.png",
        green: "assets/art/gameplay/mechanics/video-parity-v1/key-token-green-v1.png",
        yellow: "assets/art/gameplay/mechanics/video-parity-v1/key-token-yellow-v1.png",
        purple: "assets/art/gameplay/mechanics/video-parity-v1/key-token-v1.png",
        orange: "assets/art/gameplay/mechanics/video-parity-v1/key-token-orange-v1.png",
        pink: "assets/art/gameplay/mechanics/video-parity-v1/key-token-pink-v1.png",
        cyan: "assets/art/gameplay/mechanics/video-parity-v1/key-token-cyan-v1.png",
      },
      chainLocks: {
        red: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-red-v1.png",
        blue: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-blue-v1.png",
        green: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-green-v1.png",
        yellow: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-yellow-v1.png",
        purple: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-v1.png",
        orange: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-orange-v1.png",
        pink: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-pink-v1.png",
        cyan: "assets/art/gameplay/mechanics/video-parity-v1/chain-lock-cyan-v1.png",
      },
      liftFrame: "assets/art/gameplay/mechanics/video-parity-v1/lift-frame-v1.png",
      stagedFrame: "assets/art/gameplay/mechanics/video-parity-v1/staged-frame-v1.png",
      sideGenerator: "assets/art/gameplay/mechanics/formal-generator-v1/generator-horizontal.png",
      sideGeneratorVertical: "assets/art/gameplay/mechanics/formal-generator-v1/generator-vertical.png",
      timedFeeder: "assets/art/gameplay/mechanics/video-parity-v1/timed-feeder-v1.png",
    },
  },
  fx: {
    formalSelectionFrame: "assets/art/fx/formal-gameplay-v1/selection-frame.png",
    mechanics: "assets/art/fx/mechanic-fx-v1.png",
    particleSpark: "assets/art/fx/particle-spark-v1.png",
    blockGrabHalo: "assets/art/fx/block-grab-halo-v1.png",
    blockerFocusCorners: "assets/art/fx/blocker-focus-corners-v1.png",
    strategyFocusCorners: "assets/art/fx/strategy-focus-corners-v1.png",
    mechanicRelayMote: "assets/art/fx/mechanic-relay-mote-v1.png",
  },
} as const;

export const ART_ATLASES = {
  boosters: { columns: 3, rows: 1, order: ["time", "rocket", "pulse"] },
  achievements: { columns: 3, rows: 1, order: ["ice", "layer", "command"] },
  onboardingDaily: { columns: 2, rows: 1, order: ["drag-hand", "daily-medal"] },
  mechanics: { columns: 3, rows: 1, order: ["ice-break", "shutter-open", "layer-peel"] },
  progressionMechanics: { columns: 2, rows: 2, order: ["generator", "elevator", "conveyor", "star"] },
  layerPreviewBadges: { columns: 4, rows: 2, order: ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] },
  buttons: { columns: 3, rows: 1, order: ["primary", "secondary", "danger"] },
  systemIcons: { columns: 4, rows: 3, order: ["coin", "star", "clock", "undo", "pause", "back", "home", "grid", "trophy", "shop", "settings", "lock"] },
} as const;

export const BOOSTER_PURCHASE_ART = {
  panel: "assets/art/ui/formal-pages/supplied-popups-v1/booster/panel.png",
  adButton: "assets/art/ui/formal-pages/supplied-popups-v1/booster/ad-button.png",
  buyButton: "assets/art/ui/formal-pages/supplied-popups-v1/booster/buy-button.png",
  close: "assets/art/ui/formal-pages/supplied-popups-v1/booster/close.png",
  time: "assets/art/ui/formal-pages/supplied-popups-v1/booster/time.png",
  rocket: "assets/art/ui/formal-pages/supplied-popups-v1/booster/rocket.png",
  pulse: "assets/art/ui/formal-pages/supplied-popups-v1/booster/pulse.png",
  coinIcon: "assets/art/ui/formal-pages/supplied-popups-v1/booster/coin-icon.png",
  videoIcon: "assets/art/ui/formal-pages/supplied-popups-v1/booster/video-icon.png",
} as const;

// Reuse the purchase artwork, with independently owned popup image handles.
export const LIFE_REFILL_ART = {
  panel: BOOSTER_PURCHASE_ART.panel,
  adButton: BOOSTER_PURCHASE_ART.adButton,
  buyButton: BOOSTER_PURCHASE_ART.buyButton,
  close: BOOSTER_PURCHASE_ART.close,
  heartIcon: GAME_ART.ui.home.heartIcon,
  coinIcon: BOOSTER_PURCHASE_ART.coinIcon,
  videoIcon: BOOSTER_PURCHASE_ART.videoIcon,
} as const;

// User-supplied unlock card slices, loaded only for its reveal phase.
export const FEATURE_UNLOCK_ART = {
  panel: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/panel.png",
  titleZh: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/title-zh.png",
  titleEn: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/title-en.png",
  glow: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/glow.png",
  sparkles: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/sparkles.png",
  rankIcon: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/rank-icon.png",
  nameLeft: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/name-left.png",
  nameRight: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/name-right.png",
  divider: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/divider.png",
  button: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/button.png",
  laterLine: "assets/art/ui/formal-pages/feature-unlock-supplied-v1/later-line.png",
} as const;

// Generated league art is loaded only on the league screen and released on exit.
export const LEAGUE_VIDEO_ART = {
  "bronze": "assets/art/ui/league-rank-badges-v2/bronze.png",
  "silver": "assets/art/ui/league-rank-badges-v2/silver.png",
  "gold": "assets/art/ui/league-rank-badges-v2/gold.png",
  "platinum": "assets/art/ui/league-rank-badges-v2/platinum.png",
  "emerald": "assets/art/ui/league-rank-badges-v2/emerald.png",
  "diamond": "assets/art/ui/league-rank-badges-v2/diamond.png",
  "master": "assets/art/ui/league-rank-badges-v2/master.png",
  "glory": "assets/art/ui/league-rank-badges-v2/glory.png",
  "row": "assets/art/ui/league-supplied-v1/row-regular.png",
  "round-button": "assets/art/ui/league-video-v1/round-button.png",
  "score-token": "assets/art/ui/league-supplied-v1/score-token.png",
  "continue-button": "assets/art/ui/league-video-v1/continue-button.png",
  "self-row": "assets/art/ui/league-supplied-v1/self-row.png",
  "parchment": "assets/art/ui/league-video-v1/parchment.png",
  "coin-reward": "assets/art/ui/league-supplied-v1/coin-reward.png",
  "glory-star": "assets/art/ui/league-video-v1/glory-star.png",
  "background": "assets/art/ui/league-video-v1/background.png",
  "stage-background": "assets/art/ui/league-supplied-v1/stage-background.png",
  "top-header": "assets/art/ui/league-supplied-v1/top-header.png",
  "bottom-footer": "assets/art/ui/league-supplied-v1/bottom-footer.png",
  "list-panel": "assets/art/ui/league-supplied-v1/list-panel.png",
  "title-base": "assets/art/ui/league-supplied-v1/title-base.png",
  "timer-panel": "assets/art/ui/league-supplied-v1/timer-panel.png",
  "tier-name-base": "assets/art/ui/league-supplied-v1/tier-name-base.png",
  "row-first": "assets/art/ui/league-supplied-v1/row-first.png",
  "row-second": "assets/art/ui/league-supplied-v1/row-second.png",
  "row-third": "assets/art/ui/league-supplied-v1/row-third.png",
  "back-button": "assets/art/ui/league-supplied-v1/back-button.png",
  "info-button": "assets/art/ui/league-supplied-v1/info-button.png",
  "challenge-button": "assets/art/ui/league-supplied-v1/challenge-button.png",
  "arrow-left": "assets/art/ui/league-supplied-v1/arrow-left.png",
  "arrow-right": "assets/art/ui/league-supplied-v1/arrow-right.png",
  "level-star": "assets/art/ui/league-supplied-v1/level-star.png",
  "detail-panel": "assets/art/ui/league-supplied-v1/detail-panel.png",
  "close-button": "assets/art/ui/league-supplied-v1/close-button.png",
} as const;

/** Archived trophies stay declared for provenance; the league loads the v2 badges above. */
export const LEGACY_LEAGUE_TROPHY_ART_URLS = [
  "assets/art/ui/league-video-v1/row.png",
  "assets/art/ui/league-video-v1/self-row.png",
  "assets/art/ui/league-video-v1/score-token.png",
  "assets/art/ui/league-video-v1/coin-reward.png",
  "assets/art/ui/league-video-v1/bronze.png",
  "assets/art/ui/league-video-v1/silver.png",
  "assets/art/ui/league-video-v1/gold.png",
  "assets/art/ui/league-video-v1/platinum.png",
  "assets/art/ui/league-video-v1/emerald.png",
  "assets/art/ui/league-video-v1/diamond.png",
  "assets/art/ui/league-video-v1/master.png",
  "assets/art/ui/league-video-v1/glory.png",
] as const;

/** Supplied season-settlement artwork; the stage background reuses the blue geometric collection background. */
export const LEAGUE_SETTLEMENT_ART = {
  "back-button": "assets/art/ui/league-settlement-supplied-v1/back-button.png",
  "glow": "assets/art/ui/league-settlement-supplied-v1/glow.png",
  "divider": "assets/art/ui/league-settlement-supplied-v1/divider.png",
  "bronze": "assets/art/ui/league-settlement-supplied-v1/bronze.png",
  "silver": "assets/art/ui/league-settlement-supplied-v1/silver.png",
  "silver-hero": "assets/art/ui/league-settlement-supplied-v1/silver-hero.png",
  "gold": "assets/art/ui/league-settlement-supplied-v1/gold.png",
  "platinum": "assets/art/ui/league-settlement-supplied-v1/platinum.png",
  "emerald": "assets/art/ui/league-settlement-supplied-v1/emerald.png",
  "diamond": "assets/art/ui/league-settlement-supplied-v1/diamond.png",
  "master": "assets/art/ui/league-settlement-supplied-v1/master.png",
  "glory": "assets/art/ui/league-settlement-supplied-v1/glory.png",
  "stage-panel": "assets/art/ui/league-settlement-supplied-v1/stage-panel.png",
  "result-panel": "assets/art/ui/league-settlement-supplied-v1/result-panel.png",
  "claim-button": "assets/art/ui/league-settlement-supplied-v1/claim-button.png",
  "rank-icon": "assets/art/ui/league-settlement-supplied-v1/rank-icon.png",
  "star": "assets/art/ui/league-settlement-supplied-v1/star.png",
  "sparkles": "assets/art/ui/league-settlement-supplied-v1/sparkles.png",
  "score-icon": "assets/art/ui/league-settlement-supplied-v1/score-icon.png",
  "arrow": "assets/art/ui/league-settlement-supplied-v1/arrow.png",
  "coin": "assets/art/ui/league-settlement-supplied-v1/coin.png",
  "background": "assets/art/ui/formal-pages/collection/background.png",
} as const;

export const PROFILE_REFERENCE_ART = [
  "assets/art/ui/profile-reference-v1/avatar-0.png",
  "assets/art/ui/profile-reference-v1/avatar-1.png",
  "assets/art/ui/profile-reference-v1/avatar-10.png",
  "assets/art/ui/profile-reference-v1/avatar-11.png",
  "assets/art/ui/profile-reference-v1/avatar-12.png",
  "assets/art/ui/profile-reference-v1/avatar-13.png",
  "assets/art/ui/profile-reference-v1/avatar-14.png",
  "assets/art/ui/profile-reference-v1/avatar-2.png",
  "assets/art/ui/profile-reference-v1/avatar-3.png",
  "assets/art/ui/profile-reference-v1/avatar-4.png",
  "assets/art/ui/profile-reference-v1/avatar-5.png",
  "assets/art/ui/profile-reference-v1/avatar-6.png",
  "assets/art/ui/profile-reference-v1/avatar-7.png",
  "assets/art/ui/profile-reference-v1/avatar-8.png",
  "assets/art/ui/profile-reference-v1/avatar-9.png",
  "assets/art/ui/profile-reference-v1/coin.png",
  "assets/art/ui/profile-reference-v1/edit.png",
  "assets/art/ui/profile-reference-v1/frame-0.png",
  "assets/art/ui/profile-reference-v1/frame-1.png",
  "assets/art/ui/profile-reference-v1/frame-2.png",
  "assets/art/ui/profile-reference-v1/frame-3.png",
  "assets/art/ui/profile-reference-v1/frame-4.png",
  "assets/art/ui/profile-reference-v1/frame-5.png",
  "assets/art/ui/profile-reference-v1/frame-6.png",
  "assets/art/ui/profile-reference-v1/frame-7.png",
  "assets/art/ui/profile-reference-v1/frame-8.png",
  "assets/art/ui/profile-reference-v1/header.png",
  "assets/art/ui/profile-reference-v1/panel.png",
  "assets/art/ui/profile-reference-v1/save.png",
  "assets/art/ui/profile-reference-v1/stat-0.png",
  "assets/art/ui/profile-reference-v1/stat-1.png",
  "assets/art/ui/profile-reference-v1/stat-2.png"
] as const;

/** Approved profile slices and stable-ID replacement avatars; originals above remain archived. */
export const PROFILE_SUPPLIED_ART_URLS = [
  "assets/art/ui/profile-supplied-v2/stats-panel.png",
  "assets/art/ui/profile-supplied-v2/editor-panel.png",
  "assets/art/ui/profile-supplied-v2/rename-panel.png",
  "assets/art/ui/profile-supplied-v2/title-zh.png",
  "assets/art/ui/profile-supplied-v2/title-en.png",
  "assets/art/ui/profile-supplied-v2/close.png",
  "assets/art/ui/profile-supplied-v2/id-field.png",
  "assets/art/ui/profile-supplied-v2/stat-card.png",
  "assets/art/ui/profile-supplied-v2/stat-value.png",
  "assets/art/ui/profile-supplied-v2/stat-highest.png",
  "assets/art/ui/profile-supplied-v2/stat-stars.png",
  "assets/art/ui/profile-supplied-v2/stat-rank.png",
  "assets/art/ui/profile-supplied-v2/edit-badge.png",
  "assets/art/ui/profile-supplied-v2/edit-name.png",
  "assets/art/ui/profile-supplied-v2/copy.png",
  "assets/art/ui/profile-supplied-v2/sparkle.png",
  "assets/art/ui/profile-supplied-v2/joined.png",
  "assets/art/ui/profile-supplied-v2/avatar-page.png",
  "assets/art/ui/profile-supplied-v2/frame-page.png",
  "assets/art/ui/profile-supplied-v2/catalog-panel.png",
  "assets/art/ui/profile-supplied-v2/tab-button.png",
  "assets/art/ui/profile-supplied-v2/selected.png",
  "assets/art/ui/profile-supplied-v2/save-button.png",
  "assets/art/ui/profile-supplied-v2/rename-button.png",
  "assets/art/ui/profile-supplied-v2/rename-input.png",
  "assets/art/ui/profile-supplied-v2/coin.png",
  "assets/art/ui/profile-supplied-v2/avatar-0.png",
  "assets/art/ui/profile-supplied-v2/avatar-1.png",
  "assets/art/ui/profile-supplied-v2/avatar-2.png",
  "assets/art/ui/profile-supplied-v2/avatar-3.png",
  "assets/art/ui/profile-supplied-v2/avatar-4.png",
  "assets/art/ui/profile-supplied-v2/avatar-5.png",
  "assets/art/ui/profile-supplied-v2/avatar-6.png",
  "assets/art/ui/profile-supplied-v2/avatar-7.png",
  "assets/art/ui/profile-supplied-v2/avatar-8.png",
  "assets/art/ui/profile-supplied-v2/avatar-9.png",
  "assets/art/ui/profile-supplied-v2/avatar-10.png",
  "assets/art/ui/profile-supplied-v2/avatar-11.png",
  "assets/art/ui/profile-supplied-v2/avatar-12.png",
  "assets/art/ui/profile-supplied-v2/avatar-13.png",
  "assets/art/ui/profile-supplied-v2/avatar-14.png",
  "assets/art/ui/profile-supplied-v2/avatar-15.png",
  "assets/art/ui/profile-supplied-v2/avatar-16.png",
  "assets/art/ui/profile-supplied-v2/avatar-17.png",
  "assets/art/ui/profile-supplied-v2/avatar-18.png",
  "assets/art/ui/profile-supplied-v2/avatar-19.png",
] as const;

/** Supplied PNGs 1..19 keep frame IDs 0..18; PNG 20 is archive-only. */
export const PROFILE_SUPPLIED_FRAME_ART_URLS = [
  "assets/art/ui/profile-frames-supplied-v1/frame-0.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-1.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-2.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-3.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-4.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-5.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-6.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-7.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-8.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-9.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-10.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-11.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-12.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-13.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-14.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-15.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-16.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-17.png",
  "assets/art/ui/profile-frames-supplied-v1/frame-18.png",
] as const;

export const DAILY_SUCCESS_ART_URLS = {
  panel: "assets/art/ui/daily-success-supplied-v1/panel.png",
  continueButton: "assets/art/ui/daily-success-supplied-v1/continue.png",
  close: "assets/art/ui/formal-pages/daily-tasks-v2/close.png",
} as const;

// User-supplied independent popup slices; all dynamic values remain runtime data.
export const SUPPLIED_SETTLEMENT_ART = {
  panel: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/panel.png",
  titleEn: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/title-en.png",
  titleZh: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/title-zh.png",
  levelBadge: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/level-badge.png",
  starCenter: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/star-center.png",
  starSide: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/star-side.png",
  starEmpty: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/star-empty.png",
  criterionRow: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/criterion-row.png",
  criterionPass: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/criterion-pass.png",
  criterionIdle: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/criterion-idle.png",
  coinPile: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/coin-pile.png",
  rewardPill: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/reward-pill.png",
  coinIcon: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/coin-icon.png",
  continueButton: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/continue-button.png",
  close: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/close.png",
  unlockPanel: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/unlock-panel.png",
  progressTrack: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/progress-track.png",
  progressFill: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/progress-fill.png",
  unlockCrown: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/unlock-crown.png",
  unlockCheck: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/unlock-check.png",
  artworkFrame: "assets/art/ui/formal-pages/supplied-popups-v1/settlement/artwork-frame.png",
} as const;

export const SUPPLIED_RANK_ART = {
  panel: "assets/art/ui/formal-pages/supplied-popups-v1/rank/panel.png",
  titleZh: "assets/art/ui/formal-pages/supplied-popups-v1/rank/title-zh.png",
  titleEn: "assets/art/ui/formal-pages/supplied-popups-v1/rank/title-en.png",
  rankArrow: "assets/art/ui/formal-pages/supplied-popups-v1/rank/rank-arrow.png",
  gainArrow: "assets/art/ui/formal-pages/supplied-popups-v1/rank/gain-arrow.png",
} as const;


// Superseded source is retained for artwork provenance, never requested by the popup.
export const LEGACY_SUPPLIED_POPUP_ART_URLS = [
  "assets/art/ui/formal-pages/booster-purchase-reference-v1/panel.png",
] as const;

export const SUPPLIED_REVEAL_ART = {
  painting: {
    banner: "assets/art/ui/formal-pages/supplied-popups-v1/painting/banner.png",
    titleZh: "assets/art/ui/formal-pages/supplied-popups-v1/painting/title-zh.png",
    titleEn: "assets/art/ui/formal-pages/supplied-popups-v1/painting/title-en.png",
    button: "assets/art/ui/formal-pages/supplied-popups-v1/painting/continue-button.png",
    close: "assets/art/ui/formal-pages/supplied-popups-v1/painting/close.png",
  },
  scene: {
    titleZh: "assets/art/ui/formal-pages/supplied-popups-v1/scene/title-zh.png",
    titleEn: "assets/art/ui/formal-pages/supplied-popups-v1/scene/title-en.png",
    button: "assets/art/ui/formal-pages/supplied-popups-v1/scene/confirm-button.png",
    range: "assets/art/ui/formal-pages/supplied-popups-v1/scene/range-panel.png",
  },
} as const;
