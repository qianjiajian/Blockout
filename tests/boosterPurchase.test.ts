import { describe, expect, it } from "vitest";
import { BOOSTER_PURCHASE_QUANTITY, getBoosterBundlePrice, purchaseBoosterBundle } from "../src/core/boosterPurchase";
import { purchaseSupply, SUPPLY_ITEMS, type SupplyKind } from "../src/core/supply";

const PRICES: readonly [SupplyKind, number][] = [["time", 300], ["rocket", 400], ["pulse", 400]];

describe("in-level booster bundles", () => {
  it.each(PRICES)("buys one %s item at the shared shop price (%s)", (kind, price) => {
    expect(BOOSTER_PURCHASE_QUANTITY).toBe(1);
    expect(SUPPLY_ITEMS[kind].price).toBe(price);
    expect(getBoosterBundlePrice(kind)).toBe(price);
    expect(purchaseBoosterBundle(price, 0, kind, true)).toEqual({
      status: "purchased", coins: 0, stock: 1, quantity: 1, price, shortfall: 0,
    });
  });

  it.each(PRICES)("preserves both %s balances when one coin short of the whole bundle", (kind, price) => {
    expect(purchaseBoosterBundle(price - 1, 0, kind, true)).toEqual({
      status: "insufficient-coins", coins: price - 1, stock: 0, quantity: 1, price, shortfall: 1,
    });
  });

  it.each(PRICES)("honors the %s item gate regardless of available coins", (kind, price) => {
    expect(purchaseBoosterBundle(2000, 0, kind, false)).toEqual({
      status: "locked", coins: 2000, stock: 0, quantity: 1, price, shortfall: 0,
    });
  });

  it("allows an unlocked freeze bundle before the shop's level-eight gate without changing single purchases", () => {
    expect(SUPPLY_ITEMS.time.unlockLevel).toBe(4);
    expect(purchaseBoosterBundle(1000, 0, "time", true)).toMatchObject({
      status: "purchased", coins: 700, stock: 1,
    });
    expect(purchaseSupply(1000, 0, "time", 4)).toEqual({
      status: "purchased", coins: 700, stock: 1, shortfall: 0,
    });
  });

  it("fills the final space without using the purchased item", () => {
    expect(purchaseBoosterBundle(800, 8, "rocket", true)).toEqual({
      status: "purchased", coins: 400, stock: 9, quantity: 1, price: 400, shortfall: 0,
    });
  });

  it.each([9, 12])("does not charge or reduce an existing full stock of %s", (stock) => {
    expect(purchaseBoosterBundle(2000, stock, "pulse", true)).toEqual({
      status: "full", coins: 2000, stock, quantity: 1, price: 400, shortfall: 0,
    });
  });

  it("keeps a candidate deterministic without mutating item configuration", () => {
    const before = { ...SUPPLY_ITEMS.time };
    const first = purchaseBoosterBundle(1000, 0, "time", true);
    const again = purchaseBoosterBundle(1000, 0, "time", true);
    expect(again).toEqual(first);
    expect(again).not.toBe(first);
    expect(SUPPLY_ITEMS.time).toEqual(before);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -10])(
    "cannot purchase with invalid coin balance %s", (coins) => {
      expect(purchaseBoosterBundle(coins, 0, "time", true)).toEqual({
        status: "insufficient-coins", coins: 0, stock: 0, quantity: 1, price: 300, shortfall: 300,
      });
    },
  );

  it("normalizes fractional and negative balances before checking the full bundle", () => {
    expect(purchaseBoosterBundle(300.9, -1.2, "time", true)).toMatchObject({
      status: "purchased", coins: 0, stock: 1,
    });
    expect(purchaseBoosterBundle(299.9, 6.8, "time", true)).toMatchObject({
      status: "insufficient-coins", coins: 299, stock: 6, shortfall: 1,
    });
  });
});
