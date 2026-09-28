import { expandInteractionTarget, MINIMUM_INTERACTION_TARGET_CSS } from "./hitTargets";
import { HOME_ARTBOARD, HOME_ART_LAYOUT } from "./homeArtLayout";

export interface CollectionAlbumRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollectionAlbumPoint {
  x: number;
  y: number;
}

export interface CollectionAlbumInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type CollectionAlbumDirection = "ltr" | "rtl";
export type CollectionAlbumTab = "levels" | "masterpieces";
export type CollectionAlbumArrow = "left" | "right";

export const COLLECTION_ALBUM_PAGE_SIZE = 9;
export const COLLECTION_ALBUM_GRID_COLUMNS = 3;
export const COLLECTION_ALBUM_GRID_ROWS = 3;

export type CollectionAlbumLevelFrame = "gray" | "blue" | "purple" | "gold";

/** Select the supplied level-card frame from ownership and the saved stars. */
export const collectionAlbumLevelFrame = (
  obtained: boolean,
  frameStars: number,
): CollectionAlbumLevelFrame => {
  if (!obtained) return "gray";
  const stars = Math.max(1, Math.min(3, Math.floor(Number(frameStars) || 0)));
  return stars === 1 ? "blue" : stars === 2 ? "purple" : "gold";
};

/** Native supplied-image coordinates on the same 720×1584 artboard as Home. */
export const COLLECTION_ALBUM_ART_LAYOUT = {
  panel: { x: 0, y: 201, width: 720, height: 1211 },
  title: { x: 208, y: 102, width: 324, height: 56 },
  guide: { x: 24, y: 1300, width: 128, height: 112 },
  guideBook: { width: 96, height: 103 },
  masterpieces: { x: 394, y: 210, width: 241, height: 241 * 80 / 203 },
  levels: { x: 90, y: 210, width: 242, height: 242 * 77 / 204 },
  progress: { x: 192, y: 332, width: 320, height: 60 },
  progressIcon: { x: 236, y: 340, width: 45, height: 46 },
  progressText: { x: 292, y: 332, width: 202, height: 60 },
  masterpieceProgress: { x: 32, y: 332, width: 320, height: 60 },
  inspiration: { x: 368, y: 332, width: 320, height: 60 },
  inspirationIcon: { x: 384, y: 338, width: 48, height: 48 },
  inspirationText: { x: 444, y: 332, width: 228, height: 60 },
  grid: { x: 12, y: 420, width: 705, height: 600 + 242 * 211.5 / 194 },
  // The new source frame is 194×242, uniformly fit to the approved 211.5px
  // displayed width. The old 225px slot stays fixed, keeping all nine centers.
  card: { width: 194, height: 242, slotWidth: 225, columnStep: 240, rowStep: 300, displayScale: 211.5 / 194 },
  // Card content coordinates are relative to each native frame's origin.
  cardArtwork: { x: 17, y: 27, width: 159, height: 157 },
  cardArtworkRadius: 8,
  cardLabel: { x: 8, y: 187, width: 178, height: 42 },
  cardStars: { x: 40, y: 189.5, width: 36, height: 37, step: 39, count: 3 },
  cardLock: { x: 64.5, y: 68, width: 64, height: 75 },
  previous: { x: 204, y: 1330, width: 64, height: 64 },
  next: { x: 456, y: 1330, width: 64, height: 64 },
  previousImage: { width: 50, height: 58 },
  nextImage: { width: 49, height: 57 },
  pageIndicator: { x: 282, y: 1340, width: 156, height: 44 },
  pageIndicatorImage: { width: 116, height: 45 },
  footerHitBounds: { x: 0, y: 1290, width: 720, height: 122 },
  detail: {
    panel: { x: 21, y: 342, width: 679, height: 960 },
    close: { x: 625, y: 300, width: 94, height: 98 },
    title: { x: 100, y: 400, width: 520, height: 70 },
    artwork: { x: 126, y: 509, width: 473, height: 473 },
    body: { x: 80, y: 1050, width: 560, height: 130 },
    primaryAction: { x: 238, y: 1198, width: 242, height: 90 },
    // Keep the icon and cost as one compact, centered group inside the
    // action button. The narrow cost slot keeps the number visually beside
    // the palette instead of leaving a wide empty text area between them.
    restorationIcon: { x: 325, y: 1205, width: 40, height: 40 },
    restorationCost: { x: 361, y: 1208, width: 32, height: 40 },
    restorationLabel: { x: 250, y: 1242, width: 218, height: 40 },
  },
} as const;

export const COLLECTION_ALBUM_TYPOGRAPHY = {
  tab: 38,
  progress: 21,
  cardLabel: 28,
  pagination: 24,
  inspiration: 21,
  detailTitle: 41,
  detailBody: 34,
  detailAction: 28,
} as const;

export interface CollectionAlbumArtTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Map native cutout geometry without importing the main renderer. */
export const collectionAlbumArtRect = (
  rect: Readonly<CollectionAlbumRect>,
  transform: Readonly<CollectionAlbumArtTransform>,
): CollectionAlbumRect => ({
  x: transform.offsetX + rect.x * transform.scale,
  y: transform.offsetY + rect.y * transform.scale,
  width: rect.width * transform.scale,
  height: rect.height * transform.scale,
});

/** Preserve a source image's full aspect ratio inside a display/hit-test slot. */
export const collectionAlbumContainRect = (
  source: Readonly<Pick<CollectionAlbumRect, "width" | "height">>,
  slot: Readonly<CollectionAlbumRect>,
): CollectionAlbumRect => {
  const scale = Math.min(slot.width / source.width, slot.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height };
};

export interface CollectionAlbumViewportOptions {
  /** Canvas scene width in logical units. */
  width?: number;
  /** Canvas scene height in logical units. */
  height?: number;
  /** Safe-area insets converted into the same logical units as width/height. */
  safeInsets?: Partial<CollectionAlbumInsets>;
  /** Scale from one logical scene unit to one physical CSS pixel. */
  logicalToCssScale?: number;
  minimumCssTarget?: number;
  direction?: CollectionAlbumDirection;
}

export interface CollectionAlbumOptions extends CollectionAlbumViewportOptions {
  tab?: CollectionAlbumTab;
  itemCount?: number;
  pageIndex?: number;
}

export interface CollectionAlbumControl {
  visual: CollectionAlbumRect;
  hit: CollectionAlbumRect;
}

export interface CollectionAlbumPageControl extends CollectionAlbumControl {
  enabled: boolean;
  arrow: CollectionAlbumArrow;
}

export interface CollectionAlbumCardPlacement {
  slotIndex: number;
  itemIndex: number;
  active: boolean;
  visual: CollectionAlbumRect;
  hit: CollectionAlbumRect;
  artwork: CollectionAlbumRect;
  label: CollectionAlbumRect;
  stars: readonly CollectionAlbumRect[];
  lock: CollectionAlbumRect;
}

export interface CollectionAlbumPagination {
  pageIndex: number;
  pageNumber: number;
  pageCount: number;
  itemCount: number;
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  canPrevious: boolean;
  canNext: boolean;
}

export interface CollectionHomeEntryLayout {
  side: "left" | "right";
  visual: CollectionAlbumRect;
  hit: CollectionAlbumRect;
  safeBounds: CollectionAlbumRect;
  minimumHitSizeLogical: number;
}

export interface CollectionAlbumLayout {
  direction: CollectionAlbumDirection;
  viewport: CollectionAlbumRect;
  safeBounds: CollectionAlbumRect;
  minimumHitSizeLogical: number;
  artTransform: CollectionAlbumArtTransform;
  /** Extra logical Y translation of the full grid to clear safe-area footer hits. */
  gridOffsetY: number;
  backdrop: CollectionAlbumRect;
  panel: CollectionAlbumRect;
  title: CollectionAlbumRect;
  /** Legacy geometry only: the main page has no close control. */
  close: CollectionAlbumControl;
  tabs: Readonly<Record<CollectionAlbumTab, CollectionAlbumControl>>;
  progress: CollectionAlbumRect & {
    collected: CollectionAlbumRect;
    inspiration: CollectionAlbumRect;
    inspirationIcon: CollectionAlbumRect;
    inspirationText: CollectionAlbumRect;
    icon: CollectionAlbumRect;
    text: CollectionAlbumRect;
  };
  grid: CollectionAlbumRect;
  cards: readonly CollectionAlbumCardPlacement[];
  guide: CollectionAlbumControl & { artwork: CollectionAlbumRect };
  pagination: CollectionAlbumPagination & {
    previous: CollectionAlbumPageControl;
    next: CollectionAlbumPageControl;
    indicator: CollectionAlbumRect;
    indicatorImage: CollectionAlbumRect;
  };
  detail: {
    backdrop: CollectionAlbumRect;
    panel: CollectionAlbumRect;
    title: CollectionAlbumRect;
    close: CollectionAlbumControl;
    artwork: CollectionAlbumRect;
    body: CollectionAlbumRect;
    primaryAction: CollectionAlbumControl;
    restorationIcon: CollectionAlbumRect;
    restorationCost: CollectionAlbumRect;
    restorationLabel: CollectionAlbumRect;
  };
}

export type CollectionAlbumHit =
  | { kind: "close" }
  | { kind: "tab"; tab: CollectionAlbumTab }
  | { kind: "card"; slotIndex: number; itemIndex: number }
  | { kind: "previous-page" }
  | { kind: "next-page" }
  | { kind: "guide" }
  | { kind: "panel" }
  | { kind: "backdrop" }
  | { kind: "detail-close" }
  | { kind: "detail-primary" }
  | { kind: "detail-panel" }
  | { kind: "detail-backdrop" };

const DEFAULT_WIDTH = 496;
const DEFAULT_HEIGHT = 1078;
const DEFAULT_INSETS: CollectionAlbumInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const finitePositive = (value: number | undefined, fallback: number): number => (
  Number.isFinite(value) && (value ?? 0) > 0 ? value! : fallback
);

const finiteNonNegative = (value: number | undefined, fallback = 0): number => (
  Number.isFinite(value) && (value ?? 0) >= 0 ? value! : fallback
);

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
);

const normaliseInsets = (
  insets: Partial<CollectionAlbumInsets> | undefined,
  width: number,
  height: number,
): CollectionAlbumInsets => {
  const top = clamp(finiteNonNegative(insets?.top), 0, height / 3);
  const bottom = clamp(finiteNonNegative(insets?.bottom), 0, height / 3);
  const left = clamp(finiteNonNegative(insets?.left), 0, width / 3);
  const right = clamp(finiteNonNegative(insets?.right), 0, width / 3);
  return { top, right, bottom, left };
};

const pointInRect = (point: CollectionAlbumPoint, rect: CollectionAlbumRect): boolean => (
  point.x >= rect.x
  && point.x <= rect.x + rect.width
  && point.y >= rect.y
  && point.y <= rect.y + rect.height
);

const control = (
  visual: CollectionAlbumRect,
  logicalToCssScale: number,
  bounds: CollectionAlbumRect,
  minimumCssTarget: number,
): CollectionAlbumControl => ({
  visual,
  hit: expandInteractionTarget(visual, logicalToCssScale, {
    minimumCssSize: minimumCssTarget,
    bounds,
  }),
});

const viewportMetrics = (options: CollectionAlbumViewportOptions) => {
  const width = finitePositive(options.width, DEFAULT_WIDTH);
  const height = finitePositive(options.height, DEFAULT_HEIGHT);
  const logicalToCssScale = finitePositive(options.logicalToCssScale, 1);
  const minimumCssTarget = finitePositive(options.minimumCssTarget, MINIMUM_INTERACTION_TARGET_CSS);
  const safeInsets = normaliseInsets(options.safeInsets, width, height);
  const viewport = { x: 0, y: 0, width, height };
  const safeBounds = {
    x: safeInsets.left,
    y: safeInsets.top,
    width: Math.max(1, width - safeInsets.left - safeInsets.right),
    height: Math.max(1, height - safeInsets.top - safeInsets.bottom),
  };
  return {
    width,
    height,
    logicalToCssScale,
    minimumCssTarget,
    minimumHitSizeLogical: minimumCssTarget / logicalToCssScale,
    viewport,
    safeBounds,
  };
};

/** Use actual obtained cards, not the next unlocked campaign level. */
export const collectionAlbumLatestLevelPage = (
  cards: readonly { readonly level: number; readonly obtained: boolean }[],
): number => {
  let highestLevel = 0;
  let highestIndex = 0;
  cards.forEach((card, index) => {
    if (card.obtained && Number.isInteger(card.level) && card.level > highestLevel) {
      highestLevel = card.level;
      highestIndex = index;
    }
  });
  return Math.floor(highestIndex / COLLECTION_ALBUM_PAGE_SIZE);
};

export const collectionAlbumPagination = (
  itemCount: number,
  requestedPageIndex = 0,
): CollectionAlbumPagination => {
  const safeItemCount = Math.max(0, Math.floor(finiteNonNegative(itemCount)));
  const pageCount = Math.max(1, Math.ceil(safeItemCount / COLLECTION_ALBUM_PAGE_SIZE));
  const pageIndex = clamp(
    Math.floor(finiteNonNegative(requestedPageIndex)),
    0,
    pageCount - 1,
  );
  const startIndex = pageIndex * COLLECTION_ALBUM_PAGE_SIZE;
  const endIndex = Math.min(safeItemCount, startIndex + COLLECTION_ALBUM_PAGE_SIZE);
  return {
    pageIndex,
    pageNumber: pageIndex + 1,
    pageCount,
    itemCount: safeItemCount,
    startIndex,
    endIndex,
    visibleCount: Math.max(0, endIndex - startIndex),
    canPrevious: pageIndex > 0,
    canNext: pageIndex + 1 < pageCount,
  };
};

/**
 * Legacy shortcut geometry retained for callers outside the current page.
 * The current Home does not render a duplicate shortcut; Collection owns its
 * bottom-navigation slot and opens the mechanism guide as an overlay.
 */
export const createCollectionHomeEntryLayout = (
  options: CollectionAlbumViewportOptions & { side?: "left" | "right" } = {},
): CollectionHomeEntryLayout => {
  const metrics = viewportMetrics(options);
  const side = options.side ?? "left";
  const visualSize = Math.min(76, Math.max(56, metrics.safeBounds.width * 0.16));
  const horizontalMargin = Math.max(8, Math.min(14, metrics.safeBounds.width * 0.025));
  const x = side === "left"
    ? metrics.safeBounds.x + horizontalMargin
    : metrics.safeBounds.x + metrics.safeBounds.width - horizontalMargin - visualSize;
  const minimumY = metrics.safeBounds.y + Math.min(170, metrics.safeBounds.height * 0.18);
  const maximumY = metrics.safeBounds.y + metrics.safeBounds.height
    - Math.min(220, metrics.safeBounds.height * 0.23)
    - visualSize;
  const preferredY = metrics.safeBounds.y + metrics.safeBounds.height * 0.35;
  const visual = {
    x,
    y: clamp(preferredY, minimumY, maximumY),
    width: visualSize,
    height: visualSize,
  };
  return {
    side,
    visual,
    hit: control(
      visual,
      metrics.logicalToCssScale,
      metrics.safeBounds,
      metrics.minimumCssTarget,
    ).hit,
    safeBounds: metrics.safeBounds,
    minimumHitSizeLogical: metrics.minimumHitSizeLogical,
  };
};

export const createCollectionAlbumLayout = (
  options: CollectionAlbumOptions = {},
): CollectionAlbumLayout => {
  const metrics = viewportMetrics(options);
  const direction = options.direction ?? "ltr";
  const page = collectionAlbumPagination(options.itemCount ?? 0, options.pageIndex ?? 0);

  const native = COLLECTION_ALBUM_ART_LAYOUT;
  const sceneScale = metrics.width / HOME_ARTBOARD.width;
  const sceneOffsetY = (metrics.height - HOME_ARTBOARD.height * sceneScale) / 2;
  const safeBottom = metrics.height - metrics.safeBounds.y - metrics.safeBounds.height;
  const navigationTop = sceneOffsetY + HOME_ART_LAYOUT.navigationSelected.y * sceneScale - safeBottom;
  const contentTop = Math.max(metrics.safeBounds.y, sceneOffsetY + native.panel.y * sceneScale);
  const contentBottom = Math.max(contentTop + 1, Math.min(
    metrics.safeBounds.y + metrics.safeBounds.height,
    navigationTop - 8 * sceneScale,
  ));
  const artScale = Math.min(
    sceneScale,
    metrics.safeBounds.width / HOME_ARTBOARD.width,
    (contentBottom - contentTop) / native.panel.height,
  );
  const artTransform = {
    scale: artScale,
    offsetX: metrics.safeBounds.x + (metrics.safeBounds.width - HOME_ARTBOARD.width * artScale) / 2,
    offsetY: clamp(
      sceneOffsetY,
      contentTop - native.panel.y * artScale,
      contentBottom - (native.panel.y + native.panel.height) * artScale,
    ),
  };
  const referenceRect = (rect: Readonly<CollectionAlbumRect>): CollectionAlbumRect => (
    collectionAlbumArtRect(rect, artTransform)
  );
  const mirrored = (rect: Readonly<CollectionAlbumRect>): CollectionAlbumRect => (
    direction === "rtl" ? { ...rect, x: HOME_ARTBOARD.width - rect.x - rect.width } : { ...rect }
  );
  const panel = referenceRect(native.panel);
  const minimumHit = metrics.minimumHitSizeLogical;
  const title = referenceRect(native.title);
  const levelsTabVisual = referenceRect(mirrored(native.levels));
  const masterpiecesTabVisual = referenceRect(mirrored(native.masterpieces));
  const progressNative = options.tab === "masterpieces" ? native.masterpieceProgress : native.progress;
  const progressOffsetX = progressNative.x - native.progress.x;
  const progressBase = referenceRect(progressNative);
  const progressText = referenceRect({ ...native.progressText, x: native.progressText.x + progressOffsetX });
  const progress = {
    ...progressBase,
    collected: progressText,
    inspiration: referenceRect(native.inspiration),
    inspirationIcon: referenceRect(native.inspirationIcon),
    inspirationText: referenceRect(native.inspirationText),
    icon: referenceRect({ ...native.progressIcon, x: native.progressIcon.x + progressOffsetX }),
    text: progressText,
  };
  const footerVisualBounds = referenceRect(native.footerHitBounds);
  const footerHeight = Math.max(footerVisualBounds.height, minimumHit);
  const footerHitBounds = {
    ...footerVisualBounds,
    y: footerVisualBounds.y + footerVisualBounds.height - footerHeight,
    height: footerHeight,
  };
  const baseGrid = referenceRect(native.grid);
  // Short-screen safe insets can shrink 122 native footer pixels below 44 CSS
  // pixels. Expand hits upward, then shift the entire grid by only the amount
  // needed to preserve a 4-native-pixel gap. Do not squeeze rows or frames.
  const gridOffsetY = -Math.max(0, baseGrid.y + baseGrid.height + 4 * artScale - footerHitBounds.y);
  const grid = { ...baseGrid, y: baseGrid.y + gridOffsetY };
  const cards: CollectionAlbumCardPlacement[] = [];
  for (let slotIndex = 0; slotIndex < COLLECTION_ALBUM_PAGE_SIZE; slotIndex += 1) {
    const row = Math.floor(slotIndex / COLLECTION_ALBUM_GRID_COLUMNS);
    const logicalColumn = slotIndex % COLLECTION_ALBUM_GRID_COLUMNS;
    const visualColumn = direction === "rtl"
      ? COLLECTION_ALBUM_GRID_COLUMNS - 1 - logicalColumn
      : logicalColumn;
    const nativeCard = {
      x: native.grid.x + visualColumn * native.card.columnStep + (native.card.slotWidth - native.card.width * native.card.displayScale) / 2,
      y: native.grid.y + row * native.card.rowStep + gridOffsetY / artScale,
      width: native.card.width * native.card.displayScale,
      height: native.card.height * native.card.displayScale,
    };
    const visual = referenceRect(nativeCard);
    const cardRect = (rect: Readonly<CollectionAlbumRect>): CollectionAlbumRect => referenceRect({
      x: nativeCard.x + rect.x * native.card.displayScale,
      y: nativeCard.y + rect.y * native.card.displayScale,
      width: rect.width * native.card.displayScale,
      height: rect.height * native.card.displayScale,
    });
    const itemIndex = page.startIndex + slotIndex;
    cards.push({
      slotIndex,
      itemIndex,
      active: itemIndex < page.endIndex,
      visual,
      artwork: cardRect(native.cardArtwork),
      label: cardRect(native.cardLabel),
      stars: Array.from({ length: native.cardStars.count }, (_, index) => cardRect({
        x: native.cardStars.x + index * native.cardStars.step,
        y: native.cardStars.y,
        width: native.cardStars.width,
        height: native.cardStars.height,
      })),
      lock: cardRect(native.cardLock),
      hit: control(
        visual,
        metrics.logicalToCssScale,
        grid,
        metrics.minimumCssTarget,
      ).hit,
    });
  }

  const guideVisual = referenceRect(mirrored(native.guide));
  const guideArtwork = collectionAlbumContainRect(native.guideBook, {
    ...guideVisual, height: guideVisual.height - 22 * artScale,
  });
  const previousSlot = referenceRect(mirrored(native.previous));
  const nextSlot = referenceRect(mirrored(native.next));
  const previousVisual = collectionAlbumContainRect(direction === "rtl" ? native.nextImage : native.previousImage, previousSlot);
  const nextVisual = collectionAlbumContainRect(direction === "rtl" ? native.previousImage : native.nextImage, nextSlot);
  const indicator = referenceRect(native.pageIndicator);
  const indicatorImage = collectionAlbumContainRect(native.pageIndicatorImage, indicator);
  const detailPanel = referenceRect(native.detail.panel);
  const detailCloseVisual = referenceRect(native.detail.close);
  const detailClose = control(detailCloseVisual, metrics.logicalToCssScale, metrics.safeBounds, metrics.minimumCssTarget);
  const detailActionVisual = referenceRect(native.detail.primaryAction);

  return {
    direction,
    viewport: metrics.viewport,
    safeBounds: metrics.safeBounds,
    minimumHitSizeLogical: minimumHit,
    artTransform,
    gridOffsetY,
    backdrop: metrics.viewport,
    panel,
    title,
    close: detailClose,
    tabs: {
      levels: control(levelsTabVisual, metrics.logicalToCssScale, panel, metrics.minimumCssTarget),
      masterpieces: control(masterpiecesTabVisual, metrics.logicalToCssScale, panel, metrics.minimumCssTarget),
    },
    progress,
    grid,
    cards,
    guide: { ...control(guideVisual, metrics.logicalToCssScale, footerHitBounds, metrics.minimumCssTarget), artwork: guideArtwork },
    pagination: {
      ...page,
      previous: {
        ...control(previousSlot, metrics.logicalToCssScale, footerHitBounds, metrics.minimumCssTarget),
        visual: previousVisual,
        enabled: page.canPrevious,
        arrow: direction === "rtl" ? "right" : "left",
      },
      next: {
        ...control(nextSlot, metrics.logicalToCssScale, footerHitBounds, metrics.minimumCssTarget),
        visual: nextVisual,
        enabled: page.canNext,
        arrow: direction === "rtl" ? "left" : "right",
      },
      indicator,
      indicatorImage,
    },
    detail: {
      backdrop: metrics.viewport,
      panel: detailPanel,
      title: referenceRect(native.detail.title),
      close: detailClose,
      artwork: referenceRect(native.detail.artwork),
      body: referenceRect(native.detail.body),
      restorationIcon: referenceRect(native.detail.restorationIcon),
      restorationCost: referenceRect(native.detail.restorationCost),
      restorationLabel: referenceRect(native.detail.restorationLabel),
      primaryAction: control(
        detailActionVisual,
        metrics.logicalToCssScale,
        detailPanel,
        metrics.minimumCssTarget,
      ),
    },
  };
};

/** Positive delta means the finger moved right; negative means it moved left. */
export const collectionAlbumPageStepForSwipe = (
  deltaX: number,
  direction: CollectionAlbumDirection = "ltr",
): -1 | 0 | 1 => {
  if (!Number.isFinite(deltaX) || Math.abs(deltaX) < 1) return 0;
  const visualStep = deltaX < 0 ? 1 : -1;
  return direction === "rtl" ? (visualStep * -1) as -1 | 1 : visualStep;
};

export const hitTestCollectionHomeEntry = (
  layout: CollectionHomeEntryLayout,
  point: CollectionAlbumPoint,
): boolean => pointInRect(point, layout.hit);

export const hitTestCollectionAlbum = (
  layout: CollectionAlbumLayout,
  point: CollectionAlbumPoint,
  options: { detailOpen?: boolean } = {},
): CollectionAlbumHit | undefined => {
  if (options.detailOpen) {
    if (pointInRect(point, layout.detail.close.hit)) return { kind: "detail-close" };
    if (pointInRect(point, layout.detail.primaryAction.hit)) return { kind: "detail-primary" };
    if (pointInRect(point, layout.detail.panel)) return { kind: "detail-panel" };
    if (pointInRect(point, layout.detail.backdrop)) return { kind: "detail-backdrop" };
    return undefined;
  }

  // The album is a bottom-navigation page, not a dismissible modal.
  if (pointInRect(point, layout.tabs.levels.hit)) return { kind: "tab", tab: "levels" };
  if (pointInRect(point, layout.tabs.masterpieces.hit)) return { kind: "tab", tab: "masterpieces" };
  if (pointInRect(point, layout.guide.hit)) return { kind: "guide" };
  if (layout.pagination.previous.enabled && pointInRect(point, layout.pagination.previous.hit)) {
    return { kind: "previous-page" };
  }
  if (layout.pagination.next.enabled && pointInRect(point, layout.pagination.next.hit)) {
    return { kind: "next-page" };
  }
  for (const card of layout.cards) {
    if (card.active && pointInRect(point, card.hit)) {
      return { kind: "card", slotIndex: card.slotIndex, itemIndex: card.itemIndex };
    }
  }
  if (pointInRect(point, layout.panel)) return { kind: "panel" };
  if (pointInRect(point, layout.backdrop)) return { kind: "backdrop" };
  return undefined;
};
