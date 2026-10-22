// @ts-expect-error Node test tooling is outside app ambient types.
import { readFileSync } from "node:fs";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Reviewed build projection is a Node JavaScript module.
import { googlePlayLifeRewardPlugin, instrumentGooglePlayLifeReward } from "../tools/google-play-life-reward-plugin.mjs";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LIFE_REGEN_INTERVAL_MS } from "../src/core/lives";
import { prepareLifeRefillAd } from "../src/core/lifeRefillAd";
import { LIFE_REFILL_LAYOUT } from "../src/game/formalPageLayout";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const source: string = readFileSync("src/game/ColorEscapeGame.ts", "utf8").replace(/\r\n/g, "\n");
const projected: string = instrumentGooglePlayLifeReward(source);

function sourceMethods(text: string): Map<string, string> {
  const file = ts.createSourceFile("ColorEscapeGame.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const gameClass = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "ColorEscapeGame") as ts.ClassDeclaration;
  return new Map(gameClass.members.filter(ts.isMethodDeclaration).map(method => [method.name.getText(file), method.getText(file)]));
}
const originalMethods = sourceMethods(source);
const projectedMethods = sourceMethods(projected);

// Override only the actual two projected methods. All pointer routing, save
// verification, ad receipt handling, account reward and reload methods are the
// real ColorEscapeGame implementation, as in lifeRefillAdIntegration.test.ts.
const buttonFile = ts.createSourceFile("ColorEscapeGame.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const buttonStatement = buttonFile.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations]).find(declaration => declaration.name.getText(buttonFile) === "BUTTONS")!;
const buttonProperties = (buttonStatement.initializer as ts.ObjectLiteralExpression).properties.filter(ts.isPropertyAssignment);
const buttonSource = ["lifeRefillBuy", "lifeRefillDismiss"].map(name => {
  const property = buttonProperties.find(candidate => candidate.name.getText(buttonFile) === name)!;
  return property.getText(buttonFile);
}).join(",\n");
const BUTTONS = new Function("LIFE_REFILL_LAYOUT", `return ({${buttonSource}});`)(LIFE_REFILL_LAYOUT);
const emitted = ts.transpileModule(`class ProjectedLifeGame extends Base {\n${["lifeRefillTargets", "startLifeRefillAd"]
  .map(name => projectedMethods.get(name)).join("\n")}\n}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const ProjectedLifeGame = new Function("Base", "BUTTONS", "LIFE_REFILL_LAYOUT", "prepareLifeRefillAd", `${emitted}; return ProjectedLifeGame;`)(
  ColorEscapeGame, BUTTONS, LIFE_REFILL_LAYOUT, prepareLifeRefillAd);

type Stage = "prepare" | "receipt" | "reward";
function adGame(lives = 5) {
  const game = Object.create(ProjectedLifeGame.prototype) as any;
  const base = game.sanitizeSave(undefined);
  base.lifeState = { lives, nextLifeAtMs: lives >= 5 ? 0 : NOW + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0 };
  Object.assign(game, {
    save: base, storageBaselineReady: true, appVisible: true, lifeRefillOpen: true, lifeRefillArt: {},
    playSound: vi.fn(), syncMusic: vi.fn(), scheduleFrame: vi.fn(), scheduleLifeRefreshWatch: vi.fn(), vibrate: vi.fn(),
  });
  const storage = {
    value: clone(base), writes: [] as any[], failStage: undefined as Stage | undefined,
    failure: "reject" as "reject" | "unknown-after-write", readUnavailable: false,
  };
  game.host = {
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1 }),
    storageSet: vi.fn((_key: string, value: any) => {
      storage.writes.push(value);
      const stage: Stage = value.lifeRefillAd.pending?.phase === "watching" ? "prepare"
        : value.lifeRefillAd.pending?.phase === "completed" ? "receipt" : "reward";
      if (storage.failStage === stage) {
        if (storage.failure === "unknown-after-write") { storage.value = clone(value); storage.readUnavailable = true; }
        return false;
      }
      storage.value = clone(value);
      return true;
    }),
    storageRead: vi.fn(() => storage.readUnavailable ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    isRewardedAdAvailable: vi.fn(() => true),
    showRewardedAd: vi.fn(async (requestId: string) => ({ status: "completed", requestId })),
    music: vi.fn(),
  };
  const clickAd = () => {
    const target = game.lifeRefillTargets().find(([name]: [string]) => name === "lifeRefillAd")?.[1];
    expect(target).toBeDefined();
    game.handleLifeRefillPointer({ id: 1, x: target.x + target.width / 2, y: target.y + target.height / 2 });
  };
  return { game, storage, clickAd, targets: () => Object.fromEntries(game.lifeRefillTargets()) };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Google Play full-life rewarded-ad projection", () => {
  it("changes only the two Google Play entry gates, preserving shared methods and other targets", () => {
    expect([...originalMethods].filter(([name, method]) => projectedMethods.get(name) !== method).map(([name]) => name).sort())
      .toEqual(["lifeRefillTargets", "startLifeRefillAd"]);
    const plugin = googlePlayLifeRewardPlugin();
    expect(plugin.transform(source, "/repo/src/game/OtherGame.ts")).toBeUndefined();
    expect(plugin.transform(source, "C:\\repo\\src\\game\\ColorEscapeGame.ts?query").code).toBe(projected);
    expect(sourceMethods(readFileSync("src/game/ColorEscapeGame.ts", "utf8")).get("startLifeRefillAd"))
      .toContain("if (quote.missingLives === 0)");
  });

  it("fails closed for anchor drift, duplicate method boundaries and repeated projection", () => {
    expect(() => instrumentGooglePlayLifeReward(projected)).toThrow();
    expect(() => instrumentGooglePlayLifeReward(source.replace("targets.push([\"lifeRefillAd\", adButton]);\n      targets.push", "targets.push([\"changed\", adButton]);\n      targets.push"))).toThrow();
    expect(() => instrumentGooglePlayLifeReward(source + "\n  private startLifeRefillAd(): void {\n")).toThrow();
  });

  it.each([0, 1, 2, 3, 4])("keeps the existing separate ad and coin targets below the natural cap (%i)", lives => {
    const { targets } = adGame(lives);
    expect(targets()).toEqual({ lifeRefillDismiss: LIFE_REFILL_LAYOUT.close, lifeRefillAd: LIFE_REFILL_LAYOUT.adButton,
      lifeRefillBuy: LIFE_REFILL_LAYOUT.buyButton });
  });

  it.each([5, 6, 12])("makes the centered ad clickable at %i lives while keeping coin purchase unavailable", lives => {
    const { game, storage, targets } = adGame(lives);
    expect(targets()).toEqual({ lifeRefillDismiss: LIFE_REFILL_LAYOUT.close, lifeRefillAd: LIFE_REFILL_LAYOUT.adButtonCentered });
    const before = clone(game.save);
    game.buyLifeRefill();
    expect(game.save).toEqual(before);
    expect(storage.writes).toHaveLength(0);
  });

  it("uses the real popup pointer/receipt/save path for 5→6→7 and retains 7 on reload and long offline recovery", async () => {
    const { game, storage, clickAd, targets } = adGame();
    const before = clone(game.save);
    for (const lives of [6, 7]) {
      expect(targets().lifeRefillAd).toEqual(LIFE_REFILL_LAYOUT.adButtonCentered);
      expect(targets().lifeRefillBuy).toBeUndefined();
      clickAd(); await flush();
      expect(game.save.lifeState).toEqual({ lives, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
      expect(game.lifeRefillOpen).toBe(true);
    }
    expect(game.host.showRewardedAd).toHaveBeenCalledTimes(2);
    expect(game.save.lifeRefillAd.completedRequestIds).toHaveLength(2);
    expect(storage.writes).toHaveLength(6);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.welfareRewards).toEqual(before.welfareRewards);
    vi.setSystemTime(NOW + 100 * LIFE_REGEN_INTERVAL_MS);
    game.save = game.sanitizeSave(clone(storage.value));
    expect(game.currentLifeState().lives).toBe(7);
    expect(game.lifeHeaderText()).toBe("7");
    game.recoverLifeRefillAd(); game.settleLifeRefillAd();
    expect(game.save.lifeState.lives).toBe(7);
    expect(storage.writes).toHaveLength(6);
  });

  it.each(["cancelled", "unavailable", "error", "mismatched-completed"])("does not grant above full for %s ad results", async status => {
    const { game, storage, clickAd } = adGame(6);
    game.host.showRewardedAd.mockImplementation(async (requestId: string) => ({
      status: status === "mismatched-completed" ? "completed" : status,
      requestId: status === "mismatched-completed" ? "other-request" : requestId,
    }));
    clickAd(); await flush();
    expect(game.save.lifeState.lives).toBe(6);
    expect(game.save.lifeRefillAd.pending).toBeUndefined();
    expect(game.save.lifeRefillAd.completedRequestIds).toHaveLength(0);
    expect(storage.writes).toHaveLength(2);
  });

  it("does not prepare or grant when the host cannot request a rewarded ad", async () => {
    const { game, storage, clickAd } = adGame();
    game.host.isRewardedAdAvailable.mockReturnValue(false);
    clickAd(); await flush();
    expect(game.host.showRewardedAd).not.toHaveBeenCalled();
    expect(storage.writes).toHaveLength(0);
    expect(game.save.lifeState.lives).toBe(5);
  });

  it("keeps in-flight requests exclusive at full lives", async () => {
    const { game, clickAd, targets } = adGame();
    let finish!: (result: { status: string; requestId: string }) => void;
    game.host.showRewardedAd.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    clickAd(); await flush();
    expect(targets()).toEqual({});
    game.startLifeRefillAd(); game.startLifeRefillAd();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    finish({ status: "completed", requestId: game.lifeRefillAdRequestId }); await flush();
    game.recoverLifeRefillAd(); game.settleLifeRefillAd();
    expect(game.save.lifeState.lives).toBe(6);
    expect(game.save.lifeRefillAd.completedRequestIds).toHaveLength(1);
  });

  it.each((["prepare", "receipt", "reward"] as const).flatMap(stage =>
    (["reject", "unknown-after-write"] as const).map(failure => ({ stage, failure }))))
  ("retries the exact $stage candidate after $failure without replaying a completed ad or duplicating +1", async ({ stage, failure }) => {
    const { game, storage, clickAd, targets } = adGame();
    storage.failStage = stage; storage.failure = failure;
    clickAd(); await flush();
    expect(game.save.lifeState.lives).toBe(5);
    expect(game.pendingLifeRefillAd.stage).toBe(stage);
    const candidate = game.pendingLifeRefillAd.candidateSave;
    const requestId = game.pendingLifeRefillAd.requestId;
    expect(targets().lifeRefillAd).toEqual(LIFE_REFILL_LAYOUT.adButtonCentered);
    expect(targets().lifeRefillBuy).toBeUndefined();
    expect(game.host.showRewardedAd).toHaveBeenCalledTimes(stage === "prepare" ? 0 : 1);
    storage.failStage = undefined; storage.readUnavailable = false;
    const beforeRetry = storage.writes.length;
    clickAd(); await flush();
    expect(storage.writes[beforeRetry]).toBe(candidate);
    expect(game.save.lifeState.lives).toBe(6);
    expect(game.save.lifeRefillAd.completedRequestIds).toEqual([requestId]);
    expect(game.pendingLifeRefillAd).toBeUndefined();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    const writes = storage.writes.length;
    game.save = game.sanitizeSave(clone(storage.value));
    game.recoverLifeRefillAd(); game.settleLifeRefillAd();
    expect(game.save.lifeState.lives).toBe(6);
    expect(storage.writes).toHaveLength(writes);
  });

  it("allows the centered ad when natural recovery fills the account while the popup is open", async () => {
    const { game, clickAd, targets } = adGame(4);
    vi.setSystemTime(NOW + LIFE_REGEN_INTERVAL_MS);
    expect(targets().lifeRefillAd).toEqual(LIFE_REFILL_LAYOUT.adButtonCentered);
    expect(targets().lifeRefillBuy).toBeUndefined();
    clickAd(); await flush();
    expect(game.save.lifeState.lives).toBe(6);
  });

  it("preserves coin-transaction and visibility locks", () => {
    const { game, storage, targets } = adGame(4);
    const quote = game.lifeRefillQuote();
    game.pendingLifeRefill = { quote, baselineSave: clone(game.save), candidateSave: clone(game.save) };
    vi.setSystemTime(NOW + 2 * LIFE_REGEN_INTERVAL_MS);
    expect(targets()).toEqual({ lifeRefillBuy: LIFE_REFILL_LAYOUT.buyButton });
    game.startLifeRefillAd();
    expect(storage.writes).toHaveLength(0);
    game.pendingLifeRefill = undefined; game.appVisible = false;
    game.startLifeRefillAd();
    expect(storage.writes).toHaveLength(0);
    expect(game.host.showRewardedAd).not.toHaveBeenCalled();
  });
});
