import { describe, expect, it } from "vitest";
import document from "../docs/level-design-100.md?raw";
import pointerReportText from "../playtest-results/latest-100-level-pointer-report.json?raw";
import { LEVELS } from "../src/core/levels";
import {
  buildLevelDesignSummary,
  buildPointerCampaignEvidence,
  renderLevelDesignGeneratedMarkdown,
} from "../src/core/levelDesignSummary";

describe("generated shipping level design document", () => {
  it("matches all current level names, pacing, mechanics, metrics, and latest Pointer evidence", () => {
    const pointerReport = JSON.parse(pointerReportText);
    const summary = buildLevelDesignSummary(LEVELS);
    const pointer = buildPointerCampaignEvidence(pointerReport, LEVELS);
    const generated = renderLevelDesignGeneratedMarkdown(summary, pointer);
    const startMarker = "<!-- LEVEL-DESIGN-GENERATED:START -->";
    const endMarker = "<!-- LEVEL-DESIGN-GENERATED:END -->";
    const start = document.indexOf(startMarker) + startMarker.length;
    const end = document.indexOf(endMarker);
    expect(start).toBeGreaterThan(startMarker.length - 1);
    expect(end).toBeGreaterThan(start);
    expect(document.slice(start, end).trim()).toBe(generated);
  });
});
