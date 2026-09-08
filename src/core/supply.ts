export type SupplyKind = "time" | "rocket" | "pulse";

export interface SupplyItem {
  kind: SupplyKind;
  title: string;
  effect: string;
  price: number;
  maxStock: number;
  unlockLevel: number;
}

export const SUPPLY_ORDER: SupplyKind[] = ["time", "rocket", "pulse"];

export const SUPPLY_ITEMS: Record<SupplyKind, SupplyItem> = {
  time: { kind: "time", title: "加时", effect: "倒计时 +30 秒", price: 180, maxStock: 9, unlockLevel: 4 },
  rocket: { kind: "rocket", title: "火箭", effect: "移除一个活动方块", price: 240, maxStock: 9, unlockLevel: 7 },
  pulse: { kind: "pulse", title: "脉冲", effect: "机关进度 -2", price: 210, maxStock: 9, unlockLevel: 10 },
};

export const unlockedSupplyKinds = (highestLevel: number): SupplyKind[] => {
  const safeHighestLevel = Math.max(1, Math.floor(Number(highestLevel) || 1));
  return SUPPLY_ORDER.filter((kind) => safeHighestLevel >= SUPPLY_ITEMS[kind].unlockLevel);
};

export const nextUnseenUnlockedSupply = (
  highestLevel: number,
  seen: readonly SupplyKind[],
): SupplyKind | undefined => unlockedSupplyKinds(highestLevel).find((kind) => !seen.includes(kind));

export type SupplyPurchaseStatus = "purchased" | "insufficient-coins" | "full" | "locked";

export interface SupplyPurchaseResult {
  status: SupplyPurchaseStatus;
  coins: number;
  stock: number;
  shortfall: number;
}

export const purchaseSupply = (
  coins: number,
  stock: number,
  kind: SupplyKind,
  highestLevel = Number.POSITIVE_INFINITY,
): SupplyPurchaseResult => {
  const safeCoins = Math.max(0, Math.floor(Number(coins) || 0));
  const safeStock = Math.max(0, Math.floor(Number(stock) || 0));
  const item = SUPPLY_ITEMS[kind];
  if (Math.max(1, Math.floor(Number(highestLevel) || 1)) < item.unlockLevel) {
    return { status: "locked", coins: safeCoins, stock: safeStock, shortfall: 0 };
  }
  if (safeStock >= item.maxStock) {
    return { status: "full", coins: safeCoins, stock: safeStock, shortfall: 0 };
  }
  if (safeCoins < item.price) {
    return { status: "insufficient-coins", coins: safeCoins, stock: safeStock, shortfall: item.price - safeCoins };
  }
  return { status: "purchased", coins: safeCoins - item.price, stock: safeStock + 1, shortfall: 0 };
};
