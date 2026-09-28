import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPositiveLevelCount,
  assertSequentialCampaign,
  levelCountForCapture,
  sequentialLevelIds,
} from "./level-freeze-count.mjs";
import {
  LEVEL_FREEZE_AUTHORED_SOURCES,
  LEVEL_FREEZE_POST_100_AUTHORED_SOURCES,
  levelFreezeAuthoredSources,
} from "./level-freeze-spec.mjs";

const campaign = (count) => sequentialLevelIds(count).map((id) => ({ id }));

test("accepts the existing 100-level baseline shape", () => {
  assert.equal(assertSequentialCampaign(campaign(100), 100), 100);
  assert.deepEqual(levelFreezeAuthoredSources(100), LEVEL_FREEZE_AUTHORED_SOURCES);
});

test("allows a sequential 100-to-200 campaign expansion", () => {
  assert.equal(levelCountForCapture(campaign(200), 100), 200);
  assert.deepEqual(levelFreezeAuthoredSources(200), [
    ...LEVEL_FREEZE_AUTHORED_SOURCES,
    ...LEVEL_FREEZE_POST_100_AUTHORED_SOURCES,
  ]);
});

test("rejects gaps, duplicates, invalid counts, and campaign shrinkage", () => {
  assert.throws(() => assertPositiveLevelCount(0), /positive safe integer/);
  assert.throws(() => assertSequentialCampaign([{ id: 1 }, { id: 3 }], 2), /sequential IDs 1-2/);
  assert.throws(() => assertSequentialCampaign([{ id: 1 }, { id: 1 }], 2), /sequential IDs 1-2/);
  assert.throws(() => levelCountForCapture(campaign(99), 100), /Refusing to shrink/);
});
