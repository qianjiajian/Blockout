import { describe, expect, it } from "vitest";
import { GAME_LANGUAGES } from "../src/game/localization";
import { DAILY_TASK_TEXT_KEYS, dailyTaskText } from "../src/game/dailyTaskLocalization";

describe("daily task localization", () => {
  it("ships every key in all ten supported languages", () => {
    expect(GAME_LANGUAGES).toHaveLength(10);
    for (const language of GAME_LANGUAGES) {
      for (const key of DAILY_TASK_TEXT_KEYS) expect(dailyTaskText(language, key)).toBeTruthy();
    }
  });

  it("interpolates localized task and countdown values", () => {
    expect(dailyTaskText("zh-CN", "summary", { completed: 2, total: 3 })).toContain("2/3");
    expect(dailyTaskText("en", "task.earn-stars.description", { target: 6 })).toContain("6");
    expect(dailyTaskText("de", "resetsIn", { time: "03:21" })).toContain("03:21");
  });

  it("localizes every persistence and reward response instead of leaking English", () => {
    const responseKeys = ["claimSuccess", "claimFailed", "claimUnknown", "coinsFull"] as const;
    for (const language of GAME_LANGUAGES.filter((candidate) => candidate !== "en")) {
      for (const key of responseKeys) {
        expect(dailyTaskText(language, key, { amount: 25 })).not.toBe(dailyTaskText("en", key, { amount: 25 }));
      }
    }
  });
});
