import type { HomeArtPlacement } from "./homeArtLayout";

export type FormalMetaPage = "supply" | "leaderboard" | "levels" | "records";

// All coordinates below are authored against the supplied 720×1584 mockups.
// Runtime rendering keeps supplied bitmaps at their mockup placements and
// applies only the single, uniform 720-wide artboard transform. Reused
// leaderboard portraits are aspect-preserving contained into their measured
// row slots because the first three source files are podium-sized.
export const FORMAL_PAGE_CONTENT_BOTTOM = 1448;

export const FORMAL_SHOP_LAYOUT = {
  // The supplied Shop composite includes the top 48 px of an old selected
  // Home tab. Copy two phase-matched, clean strips from the same background
  // over that baked fragment before the live five-tab navigation is drawn.
  referenceCleanup: [
    {
      source: { x: 616, y: 1400, width: 104, height: 48 },
      target: { x: 256, y: 1400, width: 104, height: 48 },
    },
    {
      source: { x: 0, y: 1400, width: 100, height: 48 },
      target: { x: 360, y: 1400, width: 100, height: 48 },
    },
  ],
  coinPanel: { x: 42, y: 56, width: 170, height: 48 },
  coinIcon: { x: 16, y: 47, width: 62, height: 64 },
  coinAdd: { x: 172, y: 61, width: 36, height: 36 },
  rows: [
    {
      card: { x: 38, y: 230, width: 640, height: 320 },
      tile: { x: 82, y: 262, width: 164, height: 164 },
      icon: { x: 106, y: 288, width: 111, height: 117 },
      effectY: 322,
      stockY: 372,
      titleY: 497,
      buy: { x: 463, y: 456, width: 193, height: 76 },
    },
    {
      card: { x: 38, y: 572, width: 640, height: 320 },
      tile: { x: 82, y: 604, width: 164, height: 164 },
      icon: { x: 104, y: 625, width: 109, height: 124 },
      effectY: 664,
      stockY: 714,
      titleY: 839,
      buy: { x: 463, y: 798, width: 193, height: 76 },
    },
    {
      card: { x: 38, y: 915, width: 640, height: 320 },
      tile: { x: 82, y: 947, width: 164, height: 164 },
      icon: { x: 104, y: 968, width: 122, height: 120 },
      effectY: 1007,
      stockY: 1057,
      titleY: 1182,
      buy: { x: 463, y: 1141, width: 193, height: 76 },
    },
  ],
  typography: {
    coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
    effect: { x: 279, size: 30, maxWidth: 363 },
    stock: { x: 279, size: 31, maxWidth: 218 },
    title: { x: 84, size: 39 },
    buy: { centerYOffset: 40, priceXOffset: 113, lockedSize: 28, fullSize: 30, priceSize: 32 },
    feedback: { x: 360, y: 1300, size: 25 },
  },
} as const satisfies {
  referenceCleanup: ReadonlyArray<{
    source: HomeArtPlacement;
    target: HomeArtPlacement;
  }>;
  coinPanel: HomeArtPlacement;
  coinIcon: HomeArtPlacement;
  coinAdd: HomeArtPlacement;
  rows: ReadonlyArray<{
    card: HomeArtPlacement;
    tile: HomeArtPlacement;
    icon: HomeArtPlacement;
    effectY: number;
    stockY: number;
    titleY: number;
    buy: HomeArtPlacement;
  }>;
  typography: {
    coin: { x: number; y: number; size: number; maxWidth: number };
    effect: { x: number; size: number; maxWidth: number };
    stock: { x: number; size: number; maxWidth: number };
    title: { x: number; size: number };
    buy: { centerYOffset: number; priceXOffset: number; lockedSize: number; fullSize: number; priceSize: number };
    feedback: { x: number; y: number; size: number };
  };
};

export const FORMAL_LEADERBOARD_LAYOUT = {
  background: { x: 0, y: 0, width: 720, height: 1584 },
  topHeader: { x: 0, y: 0, width: 720, height: 201 },
  titlePanel: { x: 208, y: 102, width: 324, height: 56 },
  title: { x: 228, y: 108, width: 294, height: 48 },
  tabsFrame: { x: 64, y: 168, width: 552, height: 110 },
  tabs: [
    { x: 129, y: 184, width: 151, height: 73 },
    { x: 285, y: 184, width: 151, height: 73 },
    { x: 441, y: 184, width: 151, height: 73 },
  ],
  podium: { x: 130, y: 410, width: 466, height: 136 },
  podiumSlots: [
    {
      avatar: { x: 309, y: 307, width: 112, height: 112 },
      nameplate: { x: 303, y: 412, width: 122, height: 73 },
      medal: { x: 329, y: 475, width: 76, height: 86 },
      nameY: 442,
    },
    {
      avatar: { x: 158, y: 340, width: 102, height: 99 },
      nameplate: { x: 147, y: 437, width: 122, height: 74 },
      medal: { x: 172, y: 485, width: 70, height: 85 },
      nameY: 474,
    },
    {
      avatar: { x: 462, y: 344, width: 107, height: 104 },
      nameplate: { x: 452, y: 439, width: 122, height: 73 },
      medal: { x: 487, y: 484, width: 70, height: 82 },
      nameY: 472,
    },
  ],
  rows: [
    { x: 32, y: 599, width: 655, height: 121 },
    { x: 32, y: 727, width: 655, height: 121 },
    { x: 32, y: 860, width: 655, height: 121 },
    { x: 32, y: 987, width: 655, height: 121 },
    { x: 32, y: 1117, width: 655, height: 121 },
    { x: 32, y: 1251, width: 655, height: 121 },
  ],
  rowAvatars: [
    { x: 112, y: 614, width: 81, height: 81 },
    { x: 108, y: 745, width: 80, height: 78 },
    { x: 111, y: 878, width: 80, height: 77 },
    { x: 110, y: 1006, width: 80, height: 79 },
    { x: 110, y: 1136, width: 80, height: 79 },
    { x: 110, y: 1268, width: 80, height: 79 },
  ],
  rowLevelPills: [
    { x: 450, y: 631, width: 210, height: 56 },
    { x: 450, y: 757, width: 210, height: 56 },
    { x: 450, y: 889, width: 210, height: 56 },
    { x: 450, y: 1019, width: 210, height: 56 },
    { x: 450, y: 1147, width: 210, height: 56 },
    { x: 450, y: 1281, width: 210, height: 56 },
  ],
  rowStars: [
    { x: 463, y: 639, width: 36, height: 35 },
    { x: 463, y: 764, width: 36, height: 35 },
    { x: 463, y: 898, width: 36, height: 35 },
    { x: 463, y: 1028, width: 36, height: 35 },
    { x: 463, y: 1156, width: 36, height: 35 },
    { x: 463, y: 1289, width: 36, height: 35 },
  ],
  rowRankMedals: [
    { x: 52, y: 600, width: 55, height: 78 },
    { x: 50, y: 727, width: 50, height: 79 },
    { x: 50, y: 862, width: 50, height: 77 },
  ],
  rowNameCenters: [657, 785, 918, 1045, 1175, 1309],
  rowRankCenters: [661, 789, 922, 1049, 1179, 1313],
  rowMetricCenters: [663, 788, 921, 1051, 1178, 1313],
  listViewport: { x: 32, y: 599, width: 655, height: 773 },
  rowPitch: 130,
  playerRow: { x: 32, y: 1340, width: 655, height: 121 },
  playerRowOverlap: 32,
  playerAvatar: { x: 110, y: 1356, width: 80, height: 79 },
  playerLevelPill: { x: 450, y: 1366, width: 210, height: 56 },
  playerStar: { x: 463, y: 1377, width: 36, height: 35 },
  playerRankCenterY: 1398,
  playerNameCenterY: 1398,
  playerMetricCenterY: 1397,
  typography: {
    coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
    tab: { centerYOffset: 36, size: 30 },
    status: { x: 360, y: 296, size: 19 },
    podiumName: { size: 35, maxWidth: 108 },
    empty: { x: 360, rowYOffset: 70, size: 26 },
    rowRank: { x: 75, size: 32 },
    rowTitle: { x: 205, size: 30 },
    rowDetail: { x: 205, centerYOffset: 32, size: 19 },
    rowMetric: { x: 503, size: 29 },
  },
} as const satisfies {
  background: HomeArtPlacement;
  topHeader: HomeArtPlacement;
  titlePanel: HomeArtPlacement;
  title: HomeArtPlacement;
  tabsFrame: HomeArtPlacement;
  tabs: ReadonlyArray<HomeArtPlacement>;
  podium: HomeArtPlacement;
  podiumSlots: ReadonlyArray<{
    avatar: HomeArtPlacement;
    nameplate: HomeArtPlacement;
    medal: HomeArtPlacement;
    nameY: number;
  }>;
  rows: ReadonlyArray<HomeArtPlacement>;
  rowAvatars: ReadonlyArray<HomeArtPlacement>;
  rowLevelPills: ReadonlyArray<HomeArtPlacement>;
  rowStars: ReadonlyArray<HomeArtPlacement>;
  rowRankMedals: ReadonlyArray<HomeArtPlacement>;
  rowNameCenters: readonly number[];
  rowRankCenters: readonly number[];
  rowMetricCenters: readonly number[];
  listViewport: HomeArtPlacement;
  rowPitch: number;
  playerRow: HomeArtPlacement;
  playerRowOverlap: number;
  playerAvatar: HomeArtPlacement;
  playerLevelPill: HomeArtPlacement;
  playerStar: HomeArtPlacement;
  playerRankCenterY: number;
  playerNameCenterY: number;
  playerMetricCenterY: number;
  typography: {
    coin: { x: number; y: number; size: number; maxWidth: number };
    tab: { centerYOffset: number; size: number };
    status: { x: number; y: number; size: number };
    podiumName: { size: number; maxWidth: number };
    empty: { x: number; rowYOffset: number; size: number };
    rowRank: { x: number; size: number };
    rowTitle: { x: number; size: number };
    rowDetail: { x: number; centerYOffset: number; size: number };
    rowMetric: { x: number; size: number };
  };
};

export const FORMAL_JOURNEY_LAYOUT = {
  background: { x: 0, y: 0, width: 720, height: 1584 },
  topHeader: { x: 0, y: 0, width: 720, height: 201 },
  titlePanel: { x: 208, y: 102, width: 324, height: 56 },
  title: { x: 236, y: 108, width: 266, height: 48 },
  track: { x: 325, y: 0, width: 68, height: 1250 },
  trackProgress: { x: 338, y: 233, width: 41, height: 1250 },
  trackProgressVisible: { x: 338, y: 841, width: 41, height: 228 },
  destination: { x: 206, y: 1069, width: 299, height: 288 },
  marker: { x: 322, y: 764, width: 73, height: 77 },
  levelCards: [
    { x: 92, y: 365, width: 228, height: 141 },
    { x: 92, y: 554, width: 228, height: 141 },
    { x: 92, y: 736, width: 228, height: 141 },
  ],
  currentLevelActive: { x: 83, y: 729, width: 246, height: 163 },
  currentRewardActive: { x: 389, y: 730, width: 246, height: 162 },
  rewardCards: [
    { x: 398, y: 365, width: 228, height: 141 },
    { x: 398, y: 554, width: 228, height: 141 },
    { x: 398, y: 736, width: 228, height: 141 },
  ],
  rewardCenters: [
    { x: 522.5, y: 435.5 },
    { x: 522.5, y: 624.5 },
    { x: 522.5, y: 806.5 },
  ],
  // The scrolling scene renders beneath the 28 px protruding selected tab and
  // meets the navigation bar itself, so no fixed-background band is exposed.
  renderViewport: { x: 0, y: 180, width: 720, height: 1268 },
  // Nodes and scroll gestures stop at the selected tab's upper edge; the
  // extra rendered strip is visual-only and cannot steal navigation input.
  contentViewport: { x: 0, y: 180, width: 720, height: 1240 },
  // The three reference cards keep their authored order/interaction indices.
  // Edge rows are still rendered anywhere inside contentViewport so a scroll
  // never makes a whole card pop in or out at this reference boundary.
  referenceCardViewport: { x: 83, y: 350, width: 552, height: 549 },
  scrollViewport: { x: 0, y: 180, width: 720, height: 1240 },
  rowPitch: 186,
  scenePitch: 1860,
  journeyContent: {
    paddingTop: 90,
    paddingBottom: 180,
    gap: 22,
    rewardHeight: 154,
    episodeHeight: 430,
    finaleHeight: 430,
    currentProgressAnchorY: 785,
    // Journey supplement uses every source bitmap at natural size. The dark
    // locked shade shares the medallion origin; its range strip, lock and
    // state button are authored overlaps measured from the supplied mockup.
    episodeImage: { x: 207, yOffset: 70, width: 299, height: 288 },
    episodeLock: { xOffset: 123, yOffset: 100, width: 60, height: 77 },
    episodeButton: { x: 278, yOffset: 352, width: 157, height: 58 },
    episodeRange: { x: 252, yOffset: 91, width: 208, height: 36 },
    finaleImage: { x: 210, yOffset: 72, width: 299, height: 288 },
    progressBadge: { x: 394, width: 78, height: 48 },
  },
  typography: {
    segment: { x: 360, y: 1054, size: 24 },
    levelLabel: { x: 197, centerYOffset: 39, size: 28 },
    levelNumber: { x: 197, centerYOffset: 90, size: 48 },
    play: { x: 512, centerYOffset: 70, size: 24 },
    rewardAmount: { x: 522.5, centerYOffset: 105, size: 47 },
    episodeTitle: { x: 360, centerYOffset: 39, size: 35 },
    episodeRange: { x: 356, centerYOffset: 119, size: 24 },
    episodeButton: { x: 356, centerYOffset: 385, size: 24 },
    finaleTitle: { x: 360, centerYOffset: 43, size: 32 },
    finaleLevel: { x: 360, centerYOffset: 381, size: 25 },
    progressLevel: { x: 433, centerYOffset: 0, size: 23 },
  },
} as const satisfies {
  background: HomeArtPlacement;
  topHeader: HomeArtPlacement;
  titlePanel: HomeArtPlacement;
  title: HomeArtPlacement;
  track: HomeArtPlacement;
  trackProgress: HomeArtPlacement;
  trackProgressVisible: HomeArtPlacement;
  destination: HomeArtPlacement;
  marker: HomeArtPlacement;
  levelCards: ReadonlyArray<HomeArtPlacement>;
  currentLevelActive: HomeArtPlacement;
  currentRewardActive: HomeArtPlacement;
  rewardCards: ReadonlyArray<HomeArtPlacement>;
  rewardCenters: ReadonlyArray<{ x: number; y: number }>;
  renderViewport: HomeArtPlacement;
  contentViewport: HomeArtPlacement;
  referenceCardViewport: HomeArtPlacement;
  scrollViewport: HomeArtPlacement;
  rowPitch: number;
  scenePitch: number;
  journeyContent: {
    paddingTop: number;
    paddingBottom: number;
    gap: number;
    rewardHeight: number;
    episodeHeight: number;
    finaleHeight: number;
    currentProgressAnchorY: number;
    episodeImage: { x: number; yOffset: number; width: number; height: number };
    episodeLock: { xOffset: number; yOffset: number; width: number; height: number };
    episodeButton: { x: number; yOffset: number; width: number; height: number };
    episodeRange: { x: number; yOffset: number; width: number; height: number };
    finaleImage: { x: number; yOffset: number; width: number; height: number };
    progressBadge: { x: number; width: number; height: number };
  };
  typography: {
    segment: { x: number; y: number; size: number };
    levelLabel: { x: number; centerYOffset: number; size: number };
    levelNumber: { x: number; centerYOffset: number; size: number };
    play: { x: number; centerYOffset: number; size: number };
    rewardAmount: { x: number; centerYOffset: number; size: number };
    episodeTitle: { x: number; centerYOffset: number; size: number };
    episodeRange: { x: number; centerYOffset: number; size: number };
    episodeButton: { x: number; centerYOffset: number; size: number };
    finaleTitle: { x: number; centerYOffset: number; size: number };
    finaleLevel: { x: number; centerYOffset: number; size: number };
    progressLevel: { x: number; centerYOffset: number; size: number };
  };
};

/** Fixed Cut 3 composition shared by episode-unlock and reward popups. */
export const JOURNEY_PRESENTATION_LAYOUT = {
  overlay: { color: "#000000", alpha: 199 / 255 },
  panel: { x: 25, y: 287, width: 671, height: 867 },
  close: { x: 616, y: 336, width: 94, height: 98 },
  button: { x: 199, y: 943, width: 322, height: 125 },
  episodeTitle: { x: 105, y: 310, width: 510, height: 95 },
  rewardsTitle: { x: 99, y: 301, width: 518, height: 98 },
  episodeImage: { x: 237, y: 476, width: 246, height: 237 },
  rewardCenter: { x: 360, y: 603 },
  typography: {
    level: { x: 360, y: 765, size: 38, fill: "#8c432a" },
    name: { x: 360, y: 854, size: 55, fill: "#fff5c9", stroke: "#d24600", lineWidth: 3 },
    episodeButton: { x: 360, y: 1006, size: 31, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
    rewardButton: { x: 360, y: 1006, size: 40, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
    error: { x: 360, y: 1106, size: 22, fill: "#b82f45", stroke: "#fff4e4", lineWidth: 2 },
  },
} as const;

/** Cut 3 status/modal compositions use the same authored pause panel shell. */
export const STATUS_OVERLAY_LAYOUT = {
  overlay: { color: "#000000", alpha: 0.5 },
  panel: { x: 59, y: 298, width: 594, height: 889 },
  title: { x: 356, y: 360, size: 30, fill: "#ffffff", stroke: "#381ea2", lineWidth: 3 },
  timeout: {
    // Centre of the reused title plaque; match pause/settings' 60px heading.
    title: { x: 356, y: 363, size: 60, maxWidth: 330, fill: "#ffffff", stroke: "#381ea2", lineWidth: 4 },
    clock: { x: 272, y: 516, width: 188, height: 203 },
    remainingPanel: { x: 143, y: 779, width: 427, height: 57 },
    remainingText: { x: 356, y: 808, size: 30, fill: "#673817" },
    replayButton: { x: 114, y: 994, width: 225, height: 84 },
    homeButton: { x: 377, y: 994, width: 225, height: 84 },
    actionText: { y: 1037, size: 36 },
  },
  feature: {
    iceDoor: { x: 194, y: 574, width: 315, height: 97 },
    visualCenter: { x: 352, y: 622 },
    description: { x: 158, y: 806, maxWidth: 410, lineHeight: 44, size: 30, fill: "#713a19" },
    button: { x: 242, y: 1003, width: 225, height: 84 },
    buttonText: { x: 354, y: 1045, size: 30, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
  },
} as const;

// Collection, pause/settings and settlement coordinates are measured directly
// from the supplied Cut 2 mockups. Every slice is drawn at its authored pixel
// size; the renderer applies only the shared, uniform 720-wide artboard
// transform used by the rest of the formal UI.
export const FORMAL_COLLECTION_LAYOUT = {
  background: { x: 0, y: 0, width: 720, height: 1584 },
  topHeader: { x: 0, y: 0, width: 720, height: 201 },
  // The supplied panel includes its title plaque; titlePanel is its measured
  // text area, retained for debug/hit geometry rather than a second bitmap.
  panel: { x: 22, y: 226, width: 677, height: 1152 },
  close: { x: 624, y: 253, width: 94, height: 98 },
  titlePanel: { x: 155, y: 226, width: 411, height: 159 },
  title: { x: 212, y: 266, width: 296, height: 56 },
  // Selected frames extend 8px left/right and 7px above/below each card.
  // The fixed detail panel stays outside both the list clip and its hit area.
  listViewport: { x: 79, y: 393, width: 560, height: 628 },
  cardColumns: [87, 279, 471],
  cardTop: 400,
  cardSize: { x: 0, y: 0, width: 158, height: 198 },
  rowPitch: 234,
  selectedOffset: { x: -8, y: -7, width: 174, height: 212 },
  cardIcon: { centerX: 79, centerY: 88, maxWidth: 140, maxHeight: 130 },
  cardLock: { x: 47, y: 49.5, width: 64, height: 77 },
  lockedOverlayOffset: { x: 0, y: 0, width: 159, height: 197 },
  detailPanel: { x: 80, y: 1030, width: 571, height: 294 },
  detailTitleShade: { x: 229, y: 1063, width: 281, height: 49 },
  detailBody: { x: 122, y: 1130, width: 484, height: 157 },
  // The four sizes are annotated in the supplied 720×1584 reference. All
  // dimensions are native art pixels and receive the artboard transform once.
  typography: {
    title: { size: 51, x: 360, y: 294, maxWidth: 370, fill: "#ffffff", stroke: "#263646", lineWidth: 4 },
    cardTitle: { size: 27, centerYOffset: 176, fill: "#fefffe", stroke: "#5d2815", lineWidth: 4 },
    detailTitle: { size: 30, x: 369.5, y: 1087.5, fill: "#ffffff", stroke: "#592b12", lineWidth: 4 },
    detailBody: { size: 26, x: 134, y: 1165, maxWidth: 460, lineHeight: 44, align: "left", fill: "#753d1b" },
    lockedLevel: { size: 20, xOffset: -18, yOffset: -16 },
  },
} as const satisfies {
  background: HomeArtPlacement;
  topHeader: HomeArtPlacement;
  panel: HomeArtPlacement;
  close: HomeArtPlacement;
  titlePanel: HomeArtPlacement;
  title: HomeArtPlacement;
  listViewport: HomeArtPlacement;
  cardColumns: readonly number[];
  cardTop: number;
  cardSize: HomeArtPlacement;
  rowPitch: number;
  selectedOffset: HomeArtPlacement;
  cardIcon: { centerX: number; centerY: number; maxWidth: number; maxHeight: number };
  cardLock: HomeArtPlacement;
  lockedOverlayOffset: HomeArtPlacement;
  detailPanel: HomeArtPlacement;
  detailTitleShade: HomeArtPlacement;
  detailBody: HomeArtPlacement;
  typography: {
    title: { size: number; x: number; y: number; maxWidth: number; fill: string; stroke: string; lineWidth: number };
    cardTitle: { size: number; centerYOffset: number; fill: string; stroke: string; lineWidth: number };
    detailTitle: { size: number; x: number; y: number; fill: string; stroke: string; lineWidth: number };
    detailBody: { size: number; x: number; y: number; maxWidth: number; lineHeight: number; align: CanvasTextAlign; fill: string };
    lockedLevel: { size: number; xOffset: number; yOffset: number };
  };
};

export const PAUSE_SETTINGS_LAYOUT = {
  overlay: { color: "#000000", alpha: 0.72 },
  panel: { x: 63, y: 310, width: 594, height: 889 },
  close: { x: 574, y: 342, width: 94, height: 98 },
  rows: [
    {
      hit: { x: 145, y: 528, width: 425, height: 105 },
      icon: { x: 168, y: 549, width: 75, height: 61 },
      toggle: { x: 439, y: 555, width: 111, height: 53 },
      labelY: 586,
    },
    {
      hit: { x: 145, y: 653, width: 425, height: 111 },
      icon: { x: 156, y: 667, width: 90, height: 80 },
      toggle: { x: 439, y: 686, width: 111, height: 53 },
      labelY: 716,
    },
    {
      hit: { x: 145, y: 787, width: 425, height: 108 },
      icon: { x: 160, y: 802, width: 88, height: 77 },
      toggle: { x: 439, y: 818, width: 111, height: 53 },
      labelY: 848,
    },
  ],
  replayButton: { x: 116, y: 1017, width: 225, height: 84 },
  homeButton: { x: 380, y: 1017, width: 225, height: 84 },
  languageButton: { x: 116, y: 1017, width: 225, height: 84 },
  settingsClearButton: { x: 380, y: 1017, width: 225, height: 84 },
  // Retained until the Settings renderer has switched to the two-button row.
  clearProgressButton: { x: 136, y: 1020, width: 448, height: 84 },
  typography: {
    title: { x: 360, settingsY: 381, pauseY: 375, size: 60, fill: "#ffffff", stroke: "#381ea2", lineWidth: 4 },
    rowLabel: { x: 263, size: 46, fill: "#699ee9", stroke: "#4a7cc3", lineWidth: 2 },
    action: { y: 1065, size: 36, settingsX: 360, pauseX: [228.5, 492.5] },
  },
} as const;

export const LIFE_REFILL_LAYOUT = {
  overlay: PAUSE_SETTINGS_LAYOUT.overlay,
  panel: PAUSE_SETTINGS_LAYOUT.panel,
  close: PAUSE_SETTINGS_LAYOUT.close,
  title: { x: 360, y: 381, size: 60, maxWidth: 310 },
  lives: { x: 360, y: 566, size: 64, maxWidth: 420 },
  recovery: { x: 360, y: 634, size: 34, maxWidth: 420 },
  coinPile: { x: 145, y: 687, width: 194.4, height: 162.4 },
  costPill: { x: 380, y: 734, width: 178, height: 69 },
  cost: { x: 469, y: 770, size: 40, maxWidth: 150 },
  feedback: { x: 360, y: 891, size: 28, maxWidth: 442 },
  buyButton: { x: 247.5, y: 1017, width: 225, height: 84 },
  action: { y: 1065, size: 36 },
} as const;

export const LANGUAGE_PICKER_LAYOUT = {
  overlay: PAUSE_SETTINGS_LAYOUT.overlay,
  panel: PAUSE_SETTINGS_LAYOUT.panel,
  close: PAUSE_SETTINGS_LAYOUT.close,
  title: {
    x: PAUSE_SETTINGS_LAYOUT.typography.title.x,
    y: PAUSE_SETTINGS_LAYOUT.typography.title.settingsY,
    size: PAUSE_SETTINGS_LAYOUT.typography.title.size,
    fill: PAUSE_SETTINGS_LAYOUT.typography.title.fill,
    stroke: PAUSE_SETTINGS_LAYOUT.typography.title.stroke,
    lineWidth: PAUSE_SETTINGS_LAYOUT.typography.title.lineWidth,
  },
  options: [
    { x: 116, y: 480, width: 225, height: 100 },
    { x: 380, y: 480, width: 225, height: 100 },
    { x: 116, y: 604, width: 225, height: 100 },
    { x: 380, y: 604, width: 225, height: 100 },
    { x: 116, y: 728, width: 225, height: 100 },
    { x: 380, y: 728, width: 225, height: 100 },
    { x: 116, y: 852, width: 225, height: 100 },
    { x: 380, y: 852, width: 225, height: 100 },
    { x: 116, y: 976, width: 225, height: 100 },
    { x: 380, y: 976, width: 225, height: 100 },
  ],
} as const;

export const WIN_ART_LAYOUT = {
  overlay: { color: "#000000", alpha: 199 / 255 },
  panel: { x: 25, y: 287, width: 671, height: 867 },
  perfectTitle: { x: 134, y: 316, width: 452, height: 100 },
  close: { x: 616, y: 336, width: 94, height: 98 },
  glow: { x: 108, y: 398, width: 483, height: 483 },
  coinPile: { x: 239, y: 566, width: 243, height: 203 },
  rewardPill: { x: 271, y: 802, width: 178, height: 69 },
  continueButton: { x: 199, y: 964, width: 322, height: 125 },
  // Photoshop's annotated 28-point labels rasterize to this 44px Canvas size.
  // The coordinates below are calibrated against the actual text pixels in 1.png.
  rewardText: { x: 360, y: 838, designSize: 28, renderSize: 44, fill: "#ffffff", stroke: "#415ca4", lineWidth: 6 },
  continueText: { x: 360, y: 1027, designSize: 28, renderSize: 44, fill: "#ffffff", stroke: "#10520b", lineWidth: 6 },
} as const satisfies {
  overlay: { color: string; alpha: number };
  panel: HomeArtPlacement;
  perfectTitle: HomeArtPlacement;
  close: HomeArtPlacement;
  glow: HomeArtPlacement;
  coinPile: HomeArtPlacement;
  rewardPill: HomeArtPlacement;
  continueButton: HomeArtPlacement;
  rewardText: { x: number; y: number; designSize: number; renderSize: number; fill: string; stroke: string; lineWidth: number };
  continueText: { x: number; y: number; designSize: number; renderSize: number; fill: string; stroke: string; lineWidth: number };
};
