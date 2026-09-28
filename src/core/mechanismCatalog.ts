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
    effect: "按固定队列投放；预定落点全部腾空即生成下一块，不按时间投放。",
  },
  {
    id: "axis-block", title: "轴向块", unlockLevel: 50, atlasIndex: 1, group: "constraint",
    effect: "横向块只能左右移动，纵向块只能上下移动，出口方向也受限制。",
  },
  {
    id: "key-lock", title: "钥匙与锁", unlockLevel: 59, atlasIndex: 2, group: "constraint",
    effect: "钥匙块完全消除，同组锁各减1；剥壳不解锁，归零才能移动。",
  },
  {
    id: "star", title: "星标块、星门", unlockLevel: 100, atlasIndex: 3, group: "constraint",
    effect: "星标块只能走同色星门；普通块也能使用同色星门。",
  },
  {
    id: "flip-door", title: "翻转门", unlockLevel: 150, atlasIndex: 4, group: "device",
    effect: "每次整块消除或剥层的离场动画结束后，所有翻转门切换一次开关，包括本次出块的门。",
  },
  {
    id: "colored-grid", title: "彩色地格", unlockLevel: 200, atlasIndex: 5, group: "constraint",
    effect: "只有同色块可以进入，异色块不能进入；地格不会消除或改变色块颜色。",
  },
  {
    id: "bomb", title: "炸弹", unlockLevel: 120, atlasIndex: 6, group: "constraint",
    effect: "色块可操作后开始倒计时，归零前未解除则失败；消除本体或剥掉炸弹外壳可解除。",
  },
  {
    id: "shutter", title: "卷帘门", unlockLevel: 20, atlasIndex: 7, group: "device",
    effect: "每次整块消除或剥层，数字减1；归零后打开卷帘，露出覆盖区内所有色块。",
  },
  {
    id: "layered-lift", title: "升降台", unlockLevel: 65, atlasIndex: 8, group: "device",
    effect: "将升降台区域上的所有色块移出，区域完全腾空后露出下一层；无需消除色块。",
  },
  {
    id: "color-exit", title: "普通出口", unlockLevel: 1, atlasIndex: 9, group: "foundation",
    effect: "匹配色块当前外层颜色，朝出口方向的完整横截面须被单个门口覆盖。",
  },
  {
    id: "irregular-block", title: "异形色块", unlockLevel: 5, atlasIndex: 10, group: "foundation",
    effect: "保持原有形状整体平移，不能旋转或拆开。",
  },
  {
    id: "irregular-board", title: "异形棋盘", unlockLevel: 8, atlasIndex: 11, group: "foundation",
    effect: "色块的所有占格必须位于可玩区域，不能穿越棋盘缺口。",
  },
  {
    id: "frozen-exit", title: "冰冻出口", unlockLevel: 6, atlasIndex: 12, group: "constraint",
    effect: "数字大于0时不可使用；每次整块消除或剥层，数字减1。",
  },
  {
    id: "numeric-ice", title: "数字冰块", unlockLevel: 10, atlasIndex: 13, group: "constraint",
    effect: "数字大于0时不能移动或消除；显示后，其他块消除或剥层使数字减1，隐藏时不减。",
  },
  {
    id: "multilayer-shell", title: "外壳块", unlockLevel: 15, atlasIndex: 14, group: "constraint",
    effect: "最多外壳和本体两层；剥壳后保留位置与形状，换成本体颜色。",
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
