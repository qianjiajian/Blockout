export const HOME_ARTBOARD = {
  width: 720,
  height: 1584,
} as const;

export interface HomeArtPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HomeNavigationScreen = "supply" | "leaderboard" | "home" | "levels" | "records";
export type HomeNavigationIcon = "shop" | "leaderboard" | "home" | "journey" | "collection";

export interface HomeNavigationIconPlacement extends HomeArtPlacement {
  scale: number;
}

export interface HomeTextPlacement {
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
}

// Coordinates and dimensions are copied from the supplied 720×1584 layout.
// Rendering uses drawImage(image, x, y), so these dimensions are evidence and
// hit-test geometry only; they are never passed back to drawImage as a resize.
export const HOME_ART_LAYOUT = {
  background: { x: 0, y: 0, width: 720, height: 1584 },
  header: { x: 0, y: 0, width: 720, height: 201 },
  coinPanel: { x: 42, y: 56, width: 170, height: 48 },
  lifePanel: { x: 242, y: 56, width: 170, height: 48 },
  coinIcon: { x: 16, y: 47, width: 62, height: 64 },
  heartIcon: { x: 225, y: 47, width: 75, height: 67 },
  coinAdd: { x: 172, y: 61, width: 36, height: 36 },
  lifeAdd: { x: 371, y: 61, width: 36, height: 36 },
  settings: { x: 592, y: 58, width: 82, height: 85 },
  dailyTaskEntry: { x: 582, y: 226, width: 118, height: 118 },
  achievementEntry: { x: 580, y: 360, width: 118, height: 118 },
  levelPlate: { x: 228, y: 1122, width: 257, height: 91 },
  previousLevel: { x: 123, y: 1132, width: 76, height: 89 },
  nextLevel: { x: 514, y: 1132, width: 75, height: 87 },
  starLeft: { x: 275, y: 1105, width: 55, height: 55 },
  starCenter: { x: 329, y: 1096, width: 60, height: 59 },
  starRight: { x: 391, y: 1105, width: 53, height: 55 },
  // The supplied empty stars use different native crops. These origins keep
  // their visible centers aligned with the existing earned-star artwork.
  emptyStarLeft: { x: 274, y: 1106, width: 54, height: 54 },
  emptyStarCenter: { x: 330, y: 1098, width: 58, height: 56 },
  emptyStarRight: { x: 390, y: 1105, width: 54, height: 55 },
  start: { x: 185, y: 1233, width: 338, height: 155 },
  navigationBar: { x: 0, y: 1448, width: 720, height: 136 },
  navigationSelected: { x: 256, y: 1420, width: 204, height: 164 },
  navigationDividerLeft: { x: 110, y: 1455, width: 9, height: 125 },
  navigationDividerRight: { x: 589, y: 1455, width: 9, height: 125 },
  shop: { x: 6, y: 1479, width: 96, height: 93 },
  leaderboard: { x: 136, y: 1472, width: 111, height: 104 },
  home: { x: 285, y: 1400, width: 146, height: 162 },
  journey: { x: 476, y: 1481, width: 94, height: 97 },
  collection: { x: 614, y: 1483, width: 90, height: 96 },
} as const satisfies Record<string, HomeArtPlacement>;

// Text anchors are calibrated against the visible glyph bounds in the
// supplied 720x1584 composition. Canvas uses a middle baseline, so these are
// deliberately not the Photoshop alphabetic-baseline values.
export const HOME_TYPOGRAPHY = {
  coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
  life: { x: 334, y: 80, size: 27, maxWidth: 36, statusSize: 17, statusMaxWidth: 68 },
  level: { x: 356, y: 1180, size: 34 },
  start: { x: 354, y: 1315, size: 43 },
  navigationY: 1567,
} as const satisfies {
  coin: HomeTextPlacement;
  life: HomeTextPlacement & { statusSize: number; statusMaxWidth: number };
  level: HomeTextPlacement;
  start: HomeTextPlacement;
  navigationY: number;
};

export const HOME_NAVIGATION_LAYOUT = [
  {
    screen: "supply",
    label: "SHOP",
    icon: "shop",
    selectedCenterY: 1478,
    unselectedCenterY: 1525.5,
    selectedScale: 1.5,
    unselectedScale: 1,
    labelSize: 26,
  },
  {
    screen: "leaderboard",
    label: "LEADERBOARD",
    icon: "leaderboard",
    selectedCenterY: 1478,
    unselectedCenterY: 1524,
    selectedScale: 1.4,
    unselectedScale: 1,
    labelSize: 26,
  },
  {
    screen: "home",
    label: "HOME",
    icon: "home",
    selectedCenterY: 1481,
    unselectedCenterY: 1528,
    selectedScale: 1,
    unselectedScale: 0.6,
    labelSize: 26,
  },
  {
    screen: "levels",
    label: "JOURNEY",
    icon: "journey",
    selectedCenterY: 1478,
    unselectedCenterY: 1529.5,
    selectedScale: 1.46,
    unselectedScale: 1,
    labelSize: 26,
  },
  {
    screen: "records",
    label: "COLLECTION",
    icon: "collection",
    selectedCenterY: 1478,
    unselectedCenterY: 1531,
    selectedScale: 1.46,
    unselectedScale: 1,
    labelSize: 26,
  },
] as const;

export const HOME_NAVIGATION_SELECTED_SLOT_WIDTH = HOME_ART_LAYOUT.navigationSelected.width;
export const HOME_NAVIGATION_UNSELECTED_SLOT_WIDTH = (
  HOME_ARTBOARD.width - HOME_NAVIGATION_SELECTED_SLOT_WIDTH
) / (HOME_NAVIGATION_LAYOUT.length - 1);

export const homeNavigationTabPlacement = (
  screen: HomeNavigationScreen,
  selectedScreen: HomeNavigationScreen,
): HomeArtPlacement => {
  let cursor = 0;
  for (const tab of HOME_NAVIGATION_LAYOUT) {
    const width = tab.screen === selectedScreen
      ? HOME_NAVIGATION_SELECTED_SLOT_WIDTH
      : HOME_NAVIGATION_UNSELECTED_SLOT_WIDTH;
    if (tab.screen === screen) {
      const y = tab.screen === selectedScreen
        ? HOME_ART_LAYOUT.navigationSelected.y
        : HOME_ART_LAYOUT.navigationBar.y;
      return { x: cursor, y, width, height: HOME_ARTBOARD.height - y };
    }
    cursor += width;
  }
  return { ...HOME_ART_LAYOUT.navigationBar };
};

export const homeNavigationTabCenterX = (
  screen: HomeNavigationScreen,
  selectedScreen: HomeNavigationScreen,
): number => {
  const placement = homeNavigationTabPlacement(screen, selectedScreen);
  return placement.x + placement.width / 2;
};

export const homeNavigationIconPlacement = (
  screen: HomeNavigationScreen,
  selectedScreen: HomeNavigationScreen,
): HomeNavigationIconPlacement => {
  const tab = HOME_NAVIGATION_LAYOUT.find((candidate) => candidate.screen === screen) ?? HOME_NAVIGATION_LAYOUT[2];
  const selected = tab.screen === selectedScreen;
  const native = HOME_ART_LAYOUT[tab.icon];
  const scale = selected ? tab.selectedScale : tab.unselectedScale;
  const centerY = selected ? tab.selectedCenterY : tab.unselectedCenterY;
  const width = native.width * scale;
  const height = native.height * scale;
  return {
    x: homeNavigationTabCenterX(tab.screen, selectedScreen) - width / 2,
    y: centerY - height / 2,
    width,
    height,
    scale,
  };
};
