import { describe, expect, it } from "vitest";
import { GAME_LANGUAGES } from "../src/game/localization";
import { profileText } from "../src/game/profileLocalization";

describe("profile localization", () => {
  it("provides localized profile chrome for every shipped language", () => {
    for (const language of GAME_LANGUAGES) {
      expect(profileText(language, "title")).toBeTruthy();
      expect(profileText(language, "stats")).toBeTruthy();
      expect(profileText(language, "highestLevel")).toBeTruthy();
      expect(profileText(language, "totalStars")).toBeTruthy();
      expect(profileText(language, "levelRank")).toBeTruthy();
      expect(profileText(language, "avatar")).toBeTruthy();
      expect(profileText(language, "frame")).toBeTruthy();
      expect(profileText(language, "unlockLevel", { level: 12 })).toContain("12");
    }
  });

  it("falls back to simplified Chinese only when the language is absent", () => {
    expect(profileText(undefined, "title")).toBe("个人资料");
    expect(profileText("zh-TW", "title")).toBe("個人資料");
    expect(profileText("en", "title")).toBe("PROFILE");
  });
});
