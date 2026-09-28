export interface TemporaryLevelSelectorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemporaryLevelSelectorCell {
  slotIndex: number;
  row: number;
  column: number;
  levelId: number;
  rect: TemporaryLevelSelectorRect;
  selected: boolean;
}

export interface TemporaryLevelSelectorLayout {
  page: number;
  pageCount: number;
  canPrevious: boolean;
  canNext: boolean;
  cells: TemporaryLevelSelectorCell[];
  overlay: TemporaryLevelSelectorRect;
  panel: TemporaryLevelSelectorRect;
  close: TemporaryLevelSelectorRect;
  previousPage: TemporaryLevelSelectorRect;
  nextPage: TemporaryLevelSelectorRect;
  start: TemporaryLevelSelectorRect;
  exit: TemporaryLevelSelectorRect;
}

export const TEMPORARY_LEVEL_SELECTOR_COLUMNS = 4;
export const TEMPORARY_LEVEL_SELECTOR_ROWS = 5;
export const TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE = (
  TEMPORARY_LEVEL_SELECTOR_COLUMNS * TEMPORARY_LEVEL_SELECTOR_ROWS
);

export const TEMPORARY_LEVEL_SELECTOR_LOGICAL_SIZE = { width: 496, height: 1078 } as const;
export const TEMPORARY_LEVEL_SELECTOR_HOME_ARTBOARD_SIZE = { width: 720, height: 1584 } as const;

/**
 * Temporary Home entry in the native 720x1584 Home coordinate system.
 * It sits below the left Collection shortcut and above the level plate.
 */
export const TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT = {
  x: 16,
  y: 820,
  width: 196,
  height: 64,
} as const satisfies TemporaryLevelSelectorRect;

export const temporaryLevelSelectorHomeRectToLogical = (
  rect: TemporaryLevelSelectorRect = TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT,
): TemporaryLevelSelectorRect => {
  const scale = TEMPORARY_LEVEL_SELECTOR_LOGICAL_SIZE.width
    / TEMPORARY_LEVEL_SELECTOR_HOME_ARTBOARD_SIZE.width;
  const offsetY = (
    TEMPORARY_LEVEL_SELECTOR_LOGICAL_SIZE.height
    - TEMPORARY_LEVEL_SELECTOR_HOME_ARTBOARD_SIZE.height * scale
  ) / 2;
  return {
    x: rect.x * scale,
    y: offsetY + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
};

export const TEMPORARY_LEVEL_SELECTOR_HOME_RECT = temporaryLevelSelectorHomeRectToLogical();
export const TEMPORARY_LEVEL_SELECTOR_OVERLAY_RECT = {
  x: 0,
  y: 0,
  width: 496,
  height: 1078,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_PANEL_RECT = {
  x: 20,
  y: 50,
  width: 456,
  height: 978,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_CLOSE_RECT = {
  x: 400,
  y: 68,
  width: 60,
  height: 60,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_PREVIOUS_PAGE_RECT = {
  x: 54,
  y: 716,
  width: 140,
  height: 64,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_NEXT_PAGE_RECT = {
  x: 302,
  y: 716,
  width: 140,
  height: 64,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_START_RECT = {
  x: 94,
  y: 816,
  width: 308,
  height: 68,
} as const satisfies TemporaryLevelSelectorRect;
export const TEMPORARY_LEVEL_SELECTOR_EXIT_RECT = {
  x: 158,
  y: 918,
  width: 180,
  height: 60,
} as const satisfies TemporaryLevelSelectorRect;

const CELL_ORIGIN_X = 54;
const CELL_ORIGIN_Y = 188;
const CELL_WIDTH = 76;
const CELL_HEIGHT = 64;
export const TEMPORARY_LEVEL_SELECTOR_COLUMN_PITCH = 104;
export const TEMPORARY_LEVEL_SELECTOR_ROW_PITCH = 104;

const nonNegativeInteger = (value: number): number => (
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
);

export const temporaryLevelSelectorPageCount = (totalLevels: number): number => (
  Math.max(1, Math.ceil(nonNegativeInteger(totalLevels) / TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE))
);

export const clampTemporaryLevelSelectorPage = (page: number, totalLevels: number): number => {
  const lastPage = temporaryLevelSelectorPageCount(totalLevels) - 1;
  const normalized = Number.isFinite(page) ? Math.floor(page) : 0;
  return Math.max(0, Math.min(lastPage, normalized));
};

export const temporaryLevelSelectorPageForLevel = (levelId: number, totalLevels: number): number => {
  const count = nonNegativeInteger(totalLevels);
  if (count === 0) return 0;
  const normalizedLevel = Math.max(1, Math.min(count, Math.floor(Number(levelId)) || 1));
  return Math.floor((normalizedLevel - 1) / TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE);
};

export const temporaryLevelSelectorLevelAt = (
  page: number,
  slotIndex: number,
  totalLevels: number,
): number | undefined => {
  const count = nonNegativeInteger(totalLevels);
  const slot = Math.floor(slotIndex);
  if (!Number.isFinite(slotIndex) || slot < 0 || slot >= TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE || count === 0) {
    return undefined;
  }
  const normalizedPage = clampTemporaryLevelSelectorPage(page, count);
  const levelId = normalizedPage * TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE + slot + 1;
  return levelId <= count ? levelId : undefined;
};

export const temporaryLevelSelectorLevelCells = (
  totalLevels: number,
  page: number,
  selectedLevel?: number,
): TemporaryLevelSelectorCell[] => {
  const normalizedPage = clampTemporaryLevelSelectorPage(page, totalLevels);
  const cells: TemporaryLevelSelectorCell[] = [];
  for (let slotIndex = 0; slotIndex < TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE; slotIndex += 1) {
    const levelId = temporaryLevelSelectorLevelAt(normalizedPage, slotIndex, totalLevels);
    if (levelId === undefined) continue;
    const row = Math.floor(slotIndex / TEMPORARY_LEVEL_SELECTOR_COLUMNS);
    const column = slotIndex % TEMPORARY_LEVEL_SELECTOR_COLUMNS;
    cells.push({
      slotIndex,
      row,
      column,
      levelId,
      rect: {
        x: CELL_ORIGIN_X + column * TEMPORARY_LEVEL_SELECTOR_COLUMN_PITCH,
        y: CELL_ORIGIN_Y + row * TEMPORARY_LEVEL_SELECTOR_ROW_PITCH,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
      },
      selected: levelId === selectedLevel,
    });
  }
  return cells;
};

export const temporaryLevelSelectorLayout = (
  totalLevels: number,
  page: number,
  selectedLevel?: number,
): TemporaryLevelSelectorLayout => {
  const normalizedPage = clampTemporaryLevelSelectorPage(page, totalLevels);
  const pageCount = temporaryLevelSelectorPageCount(totalLevels);
  return {
    page: normalizedPage,
    pageCount,
    canPrevious: normalizedPage > 0,
    canNext: normalizedPage + 1 < pageCount,
    cells: temporaryLevelSelectorLevelCells(totalLevels, normalizedPage, selectedLevel),
    overlay: { ...TEMPORARY_LEVEL_SELECTOR_OVERLAY_RECT },
    panel: { ...TEMPORARY_LEVEL_SELECTOR_PANEL_RECT },
    close: { ...TEMPORARY_LEVEL_SELECTOR_CLOSE_RECT },
    previousPage: { ...TEMPORARY_LEVEL_SELECTOR_PREVIOUS_PAGE_RECT },
    nextPage: { ...TEMPORARY_LEVEL_SELECTOR_NEXT_PAGE_RECT },
    start: { ...TEMPORARY_LEVEL_SELECTOR_START_RECT },
    exit: { ...TEMPORARY_LEVEL_SELECTOR_EXIT_RECT },
  };
};
