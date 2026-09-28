export const assertPositiveLevelCount = (value, label = "level count") => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return value;
};

export const sequentialLevelIds = (levelCount) => Array.from(
  { length: assertPositiveLevelCount(levelCount) },
  (_, index) => index + 1,
);

const campaignIds = (levels) => {
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error("Campaign levels must be a non-empty array");
  }
  return levels.map((level) => level?.id);
};

export const assertSequentialCampaign = (levels, expectedLevelCount = levels?.length) => {
  const levelCount = assertPositiveLevelCount(expectedLevelCount, "expected level count");
  const ids = campaignIds(levels);
  const expectedIds = sequentialLevelIds(levelCount);
  if (ids.length !== levelCount || JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    throw new Error(`Campaign must contain exactly the sequential IDs 1-${levelCount}`);
  }
  return levelCount;
};

export const levelCountForCapture = (levels, previousLevelCount) => {
  const previous = assertPositiveLevelCount(previousLevelCount, "previous baseline level count");
  const next = assertSequentialCampaign(levels);
  if (next < previous) {
    throw new Error(`Refusing to shrink the frozen campaign from ${previous} to ${next} levels`);
  }
  return next;
};
