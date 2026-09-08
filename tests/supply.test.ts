import { describe, expect, it } from "vitest";
import { SUPPLY_ITEMS, nextUnseenUnlockedSupply, purchaseSupply, unlockedSupplyKinds } from "../src/core/supply";

describe("supply economy", () => {
  it("atomically exchanges coins for one item", () => {
    expect(purchaseSupply(1000, 3, "time")).toEqual({
      status: "purchased",
      coins: 1000 - SUPPLY_ITEMS.time.price,
      stock: 4,
      shortfall: 0,
    });
  });

  it("does not mutate either balance when coins are insufficient", () => {
    expect(purchaseSupply(179, 2, "time")).toEqual({
      status: "insufficient-coins",
      coins: 179,
      stock: 2,
      shortfall: 1,
    });
  });

  it("does not spend at the configured stock cap", () => {
    expect(purchaseSupply(999, SUPPLY_ITEMS.rocket.maxStock, "rocket")).toEqual({
      status: "full",
      coins: 999,
      stock: SUPPLY_ITEMS.rocket.maxStock,
      shortfall: 0,
    });
  });

  it("keeps early-game purchases locked until their teaching level", () => {
    expect(purchaseSupply(1000, 3, "time", 3)).toEqual({
      status: "locked",
      coins: 1000,
      stock: 3,
      shortfall: 0,
    });
    expect(purchaseSupply(1000, 3, "time", 4).status).toBe("purchased");
    expect(purchaseSupply(1000, 3, "rocket", 6).status).toBe("locked");
    expect(purchaseSupply(1000, 3, "pulse", 9).status).toBe("locked");
  });

  it("orders newly available supplies by their teaching level", () => {
    expect(unlockedSupplyKinds(3)).toEqual([]);
    expect(unlockedSupplyKinds(4)).toEqual(["time"]);
    expect(unlockedSupplyKinds(10)).toEqual(["time", "rocket", "pulse"]);
    expect(nextUnseenUnlockedSupply(10, ["time"])).toBe("rocket");
    expect(nextUnseenUnlockedSupply(10, ["time", "rocket", "pulse"])).toBeUndefined();
  });

  it("sanitizes invalid persisted numeric inputs before quoting", () => {
    expect(purchaseSupply(Number.NaN, -4, "pulse")).toEqual({
      status: "insufficient-coins",
      coins: 0,
      stock: 0,
      shortfall: SUPPLY_ITEMS.pulse.price,
    });
  });
});
