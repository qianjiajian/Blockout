import { SUPPLY_ITEMS, type SupplyKind, type SupplyPurchaseStatus } from "./supply";

/** In-level purchases always exchange one full bundle; they never use an item. */
export const BOOSTER_PURCHASE_QUANTITY = 1;

export const getBoosterBundlePrice = (kind: SupplyKind): number => (
  SUPPLY_ITEMS[kind].price * BOOSTER_PURCHASE_QUANTITY
);

export interface BoosterBundlePurchaseResult {
  status: SupplyPurchaseStatus;
  coins: number;
  stock: number;
  /** Quoted bundle size. Balances change only when status is purchased. */
  quantity: number;
  price: number;
  shortfall: number;
}

const safeBalance = (value: number): number => (
  Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0
);

/** Pure candidate calculation. The caller owns durable saving and retries.
 * `unlocked` is the booster gate, independent of the main-menu shop gate. */
export const purchaseBoosterBundle = (
  coins: number,
  stock: number,
  kind: SupplyKind,
  unlocked: boolean,
): BoosterBundlePurchaseResult => {
  const quote: BoosterBundlePurchaseResult = {
    status: "locked",
    coins: safeBalance(coins),
    stock: safeBalance(stock),
    quantity: BOOSTER_PURCHASE_QUANTITY,
    price: getBoosterBundlePrice(kind),
    shortfall: 0,
  };
  if (!unlocked) return quote;
  if (quote.stock > SUPPLY_ITEMS[kind].maxStock - quote.quantity) {
    return { ...quote, status: "full" };
  }
  if (quote.coins < quote.price) {
    return { ...quote, status: "insufficient-coins", shortfall: quote.price - quote.coins };
  }
  return {
    ...quote,
    status: "purchased",
    coins: quote.coins - quote.price,
    stock: quote.stock + quote.quantity,
  };
};
