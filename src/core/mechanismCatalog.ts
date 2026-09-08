export type MechanismGuideGroup = "foundation" | "constraint" | "device";

export interface MechanismGuideEntry {
  id: string;
  title: string;
  effect: string;
  unlockLevel: number;
  atlasIndex: number;
  group: MechanismGuideGroup;
}

/**
 * Player-facing catalogue of every mechanic that is active in the shipping
 * campaign. Keep this list aligned with the first level that actually exposes
 * each rule; retired key/lock and direction-restricted blocks do not belong
 * here.
 */
export const MECHANISM_GUIDE: readonly MechanismGuideEntry[] = [
  {
    id: "color-exit",
    title: "颜色出口",
    effect: "方块整体对齐同色出口范围时，无需松手便会立即送出。",
    unlockLevel: 1,
    atlasIndex: 0,
    group: "foundation",
  },
  {
    id: "irregular-board",
    title: "异形棋盘",
    effect: "缺口不属于棋盘；方块每一格都必须落在可用格内，不能穿越缺口。",
    unlockLevel: 2,
    atlasIndex: 1,
    group: "foundation",
  },
  {
    id: "irregular-block",
    title: "异形方块",
    effect: "异形块保持原造型整体上下左右平移，不能旋转或拆开。",
    unlockLevel: 2,
    atlasIndex: 2,
    group: "foundation",
  },
  {
    id: "numeric-ice",
    title: "数字冰块",
    effect: "归零前不能拖动；每次有效清除（含剥层）使其余数字冰块减1。",
    unlockLevel: 6,
    atlasIndex: 3,
    group: "constraint",
  },
  {
    id: "frozen-exit",
    title: "冰封出口",
    effect: "归零前出口不可用；每次有效清除（含剥层）使所有冰封出口减1。",
    unlockLevel: 6,
    atlasIndex: 4,
    group: "constraint",
  },
  {
    id: "multilayer-shell",
    title: "单层外壳",
    effect: "每个方块最多带一层额外外壳；先匹配外壳色，再按本体颜色送出。",
    unlockLevel: 6,
    atlasIndex: 5,
    group: "constraint",
  },
  {
    id: "generator",
    title: "方块生成器",
    effect: "每次有效清除（含剥层）使计数减1；归零后释放舱内隐藏方块。",
    unlockLevel: 35,
    atlasIndex: 6,
    group: "device",
  },
  {
    id: "elevator",
    title: "移动升降台",
    effect: "操作开始后平台按节拍逐格往返；指定载荷对准平台才随行，拖离即脱离。",
    unlockLevel: 50,
    atlasIndex: 7,
    group: "device",
  },
  {
    id: "shutter",
    title: "卷帘",
    effect: "每次有效清除（含剥层）使计数减1；归零后开放覆盖区及隐藏方块。",
    unlockLevel: 70,
    atlasIndex: 8,
    group: "device",
  },
  {
    id: "conveyor",
    title: "传送带",
    effect: "每次清除（含剥层）后，完整留在带上的指定载荷无阻时沿箭头前进1格。",
    unlockLevel: 70,
    atlasIndex: 9,
    group: "device",
  },
  {
    id: "star",
    title: "星标块与星门",
    effect: "星标方块只能走同色星门；普通块也能使用星门。",
    unlockLevel: 91,
    atlasIndex: 10,
    group: "constraint",
  },
] as const;
