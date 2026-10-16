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
 * The 15 authored entries in 机制规则.xlsx / 元素规则说明!A2:B16 order.
 * Names follow the workbook; explanations retain subsequently confirmed rules.
 * This is not a gameplay registry. Unlock levels are first field appearances in
 * current campaign data, not certification of competitor-source first levels.
 * Existing ids preserve viewed-item saves; atlasIndex matches the icon array.
 */
const MECHANISM_GUIDE_ENTRIES: readonly MechanismGuideEntry[] = [
  {
    id: "generator", title: "色块生成器", unlockLevel: 35, atlasIndex: 0, group: "device",
    effect: "固定落点全空时，按顺序生成下一块；被挡住时等待。",
  },
  {
    id: "axis-block", title: "轴向块", unlockLevel: 50, atlasIndex: 1, group: "constraint",
    effect: "沿箭头横向或纵向来回移动，出门方向也受限制。",
  },
  {
    id: "key-lock", title: "钥匙与锁", unlockLevel: 59, atlasIndex: 2, group: "constraint",
    effect: "消除整个钥匙块，同组锁各减1；归零可移动，剥壳不算。",
  },
  {
    id: "star", title: "星标块、星门", unlockLevel: 100, atlasIndex: 3, group: "constraint",
    effect: "星标块只走同色星门；普通块也能走同色星门。",
  },
  {
    id: "flip-door", title: "翻转门", unlockLevel: 150, atlasIndex: 4, group: "device",
    effect: "消除或剥壳动画结束，未冰冻的门翻转一次；刚解冻的门下次才翻。",
  },
  {
    id: "colored-grid", title: "彩色地格", unlockLevel: 200, atlasIndex: 5, group: "constraint",
    effect: "只允许同色块进入，不会消除或改变色块颜色。",
  },
  {
    id: "bomb", title: "炸弹", unlockLevel: 120, atlasIndex: 6, group: "constraint",
    effect: "可操作即计时，暂停停表；归零前消除本体或剥掉炸弹外壳，否则失败。",
  },
  {
    id: "shutter", title: "卷帘门", unlockLevel: 20, atlasIndex: 7, group: "device",
    effect: "帘下色块不可移动；每消除或剥壳一次减1，归零揭开。",
  },
  {
    id: "layered-lift", title: "升降台", unlockLevel: 65, atlasIndex: 8, group: "device",
    effect: "移走台上所有色块，区域全空后露出下一层；不必消除。",
  },
  {
    id: "color-exit", title: "普通出口", unlockLevel: 1, atlasIndex: 9, group: "foundation",
    effect: "对齐外层同色出口，整块须能通过同一门口。",
  },
  {
    id: "irregular-block", title: "异形色块", unlockLevel: 5, atlasIndex: 10, group: "foundation",
    effect: "可上下左右整体移动，不能旋转或拆开。",
  },
  {
    id: "irregular-board", title: "异形棋盘", unlockLevel: 8, atlasIndex: 11, group: "foundation",
    effect: "整块只能在棋盘内移动，不能跨越缺口或分隔缝。",
  },
  {
    id: "frozen-exit", title: "冰冻出口", unlockLevel: 6, atlasIndex: 12, group: "constraint",
    effect: "每消除或剥壳一次，数字减1；归零后出口解冻。",
  },
  {
    id: "numeric-ice", title: "数字冰块", unlockLevel: 10, atlasIndex: 13, group: "constraint",
    effect: "露出后，其他块每消除或剥壳一次减1；归零才能移动或消除。",
  },
  {
    id: "multilayer-shell", title: "外壳块", unlockLevel: 15, atlasIndex: 14, group: "constraint",
    effect: "先剥壳、再消除本体，各走同色出口；剥壳后位置形状不变。",
  },
] as const;

// Display early unlocks first. Keep the authored icon indexes and persistent
// ids intact; card position is not an asset index or a saved mechanic identity.
export const MECHANISM_GUIDE: readonly MechanismGuideEntry[] = [...MECHANISM_GUIDE_ENTRIES]
  .sort((left, right) => left.unlockLevel - right.unlockLevel || left.atlasIndex - right.atlasIndex);

// Retired display ids retain their historical viewed status, without being
// displayed or reinterpreted as one of the newly introduced mechanics.
export const LEGACY_MECHANISM_GUIDE_ITEM_IDS = ["color-block", "timed-generator", "staged-frame"] as const;
export const MECHANISM_GUIDE_SAVE_IDS: readonly string[] = [
  ...MECHANISM_GUIDE_ENTRIES.map(({ id }) => id),
  ...LEGACY_MECHANISM_GUIDE_ITEM_IDS,
];
