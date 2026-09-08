import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createServer } from "vite";
import {
  LEVEL_FREEZE_AUTHORED_SOURCES,
  LEVEL_FREEZE_DIFFICULTY_RULE_SOURCES,
} from "./level-freeze-spec.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = resolve(root, "tools", "level-freeze-baseline.json");

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => [key, stableValue(value[key])]));
};

const hashValue = (value) => createHash("sha256")
  .update(JSON.stringify(stableValue(value)))
  .digest("hex")
  .toUpperCase();

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const SHA256 = /^[A-F0-9]{64}$/;
const REQUIRED_AUTHORED_SOURCES = LEVEL_FREEZE_AUTHORED_SOURCES;
const REQUIRED_DIFFICULTY_RULE_SOURCES = LEVEL_FREEZE_DIFFICULTY_RULE_SOURCES;
const REQUIRED_INTEGRATION_CONSTANTS = [
  "LOGICAL_WIDTH",
  "LOGICAL_HEIGHT",
  "EXIT_TO_MECHANIC_DELAY",
  "EXIT_TO_MECHANIC_REDUCED_DELAY",
  "CONVEYOR_MOTION_DURATION",
  "DRAG_DEAD_ZONE",
  "DRAG_SWEEP_STEP",
  "DRAG_GRID_HYSTERESIS",
  "DRAG_SETTLE_DURATION",
  "DRAG_RETURN_DURATION",
  "MINIMUM_BLOCK_PICK_TARGET_CSS",
  "BLOCK_PICK_AMBIGUITY_CSS",
  "MAX_ADAPTIVE_RESCUE_DRAGS",
  "BLOCKER_FOCUS_DURATION",
  "BLOCKER_FOCUS_REDUCED_DURATION",
];
const REQUIRED_INTEGRATION_METHODS = [
  "loadLevel",
  "beginSelectedChallenge",
  "spendBooster",
  "refundBooster",
  "boosterUnlocked",
  "viewportTransform",
  "toLogical",
  "frame",
  "updateDragSettle",
  "hasActiveMechanicMotion",
  "syncDragGridCandidate",
  "blockAt",
  "boardLayout",
  "handleDown",
  "handleMove",
  "handleUp",
  "handleCancel",
  "useBooster",
  "commitAction",
  "attemptExit",
  "exitSideFromPointer",
  "exitToMechanicDelay",
  "emitMechanicFeedback",
  "starsForMoves",
  "strategyNudgeOrigins",
  "prepareStrategyFollowup",
  "strategyFocusBlock",
  "shouldShowBasicTutorial",
  "tutorialGuideGeometry",
];

const assertExactKeys = (label, value, expectedKeys) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Level freeze baseline is missing ${label}`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Level freeze baseline ${label} keys must be exactly: ${expected.join(", ")}`);
  }
};

const assertHashMap = (label, value, expectedKeys) => {
  assertExactKeys(label, value, expectedKeys);
  const expected = [...expectedKeys].sort();
  for (const key of expected) {
    if (!SHA256.test(value[key])) throw new Error(`Level freeze baseline has invalid SHA-256 for ${key}`);
  }
};

if (baseline.schemaVersion !== 2 || baseline.levelCount !== 100 || !SHA256.test(baseline.campaignSha256)) {
  throw new Error("Level freeze baseline schema, level count, or campaign SHA-256 is invalid");
}
assertHashMap(
  "levelSha256",
  baseline.levelSha256,
  Array.from({ length: 100 }, (_, index) => String(index + 1)),
);
assertHashMap("sourceSha256", baseline.sourceSha256, REQUIRED_AUTHORED_SOURCES);
assertHashMap(
  "difficultyRuleSourceSha256",
  baseline.difficultyRuleSourceSha256,
  REQUIRED_DIFFICULTY_RULE_SOURCES,
);

const integration = baseline.difficultyIntegrationAst;
if (!integration || integration.file !== "src/game/ColorEscapeGame.ts"
  || integration.className !== "ColorEscapeGame" || integration.includeConstructor !== true
  || !SHA256.test(integration.sha256)) {
  throw new Error("Level freeze baseline difficultyIntegrationAst metadata is invalid");
}
const assertExactNames = (label, actual, expected) => {
  if (!Array.isArray(actual) || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`Level freeze baseline ${label} must be exactly: ${expected.join(", ")}`);
  }
};
assertExactNames("integration constants", integration.constants, REQUIRED_INTEGRATION_CONSTANTS);
assertExactNames("integration methods", integration.methods, REQUIRED_INTEGRATION_METHODS);

const verifySourceHashes = async (label, expectedHashes) => {
  const changedFiles = [];
  for (const [relativePath, expectedHash] of Object.entries(expectedHashes)) {
    const actualHash = createHash("sha256")
      .update(await readFile(resolve(root, relativePath)))
      .digest("hex")
      .toUpperCase();
    if (actualHash !== expectedHash) changedFiles.push(relativePath);
  }
  if (changedFiles.length) {
    throw new Error(
      `Level freeze ${label} drift detected in ${changedFiles.length} file(s): ${changedFiles.join(", ")}. `
      + "This release is in system-only mode; restore the frozen level and difficulty-rule sources before building.",
    );
  }
  return Object.keys(expectedHashes).length;
};

const verifyDifficultyIntegration = async () => {
  const sourceText = await readFile(resolve(root, integration.file), "utf8");
  const sourceFile = ts.createSourceFile(
    integration.file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const constants = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && integration.constants.includes(declaration.name.text)) {
        constants.set(declaration.name.text, statement.getText(sourceFile));
      }
    }
  }
  const classNode = sourceFile.statements.find((statement) => (
    ts.isClassDeclaration(statement) && statement.name?.text === integration.className
  ));
  if (!classNode) throw new Error(`Level freeze could not find class ${integration.className}`);
  const methods = new Map();
  const constructors = classNode.members.filter((member) => ts.isConstructorDeclaration(member));
  if (constructors.length !== 1) {
    throw new Error(`Level freeze expected exactly one ${integration.className} constructor`);
  }
  for (const member of classNode.members) {
    if (!ts.isMethodDeclaration(member) || !member.name) continue;
    const name = member.name.getText(sourceFile);
    if (integration.methods.includes(name)) methods.set(name, member.getText(sourceFile));
  }
  assertExactKeys("integration AST constants", Object.fromEntries(constants), integration.constants);
  assertExactKeys("integration AST methods", Object.fromEntries(methods), integration.methods);
  const actualHash = hashValue({
    constructor: constructors[0].getText(sourceFile),
    constants: Object.fromEntries([...constants].sort(([left], [right]) => left.localeCompare(right))),
    methods: Object.fromEntries([...methods].sort(([left], [right]) => left.localeCompare(right))),
  });
  if (actualHash !== integration.sha256) {
    throw new Error(
      `Level freeze gameplay-integration drift detected. Expected ${integration.sha256}, received ${actualHash}. `
      + "Restore the frozen drag, timer, exit, or booster integration before building.",
    );
  }
  return constants.size + methods.size + 1;
};

const authoredSourceCount = await verifySourceHashes("authored-source", baseline.sourceSha256);
const difficultyRuleSourceCount = await verifySourceHashes(
  "difficulty-rule",
  baseline.difficultyRuleSourceSha256,
);
const difficultyIntegrationCount = await verifyDifficultyIntegration();
const vite = await createServer({
  root,
  logLevel: "silent",
  appType: "custom",
  server: { middlewareMode: true },
});

try {
  const { LEVELS } = await vite.ssrLoadModule("/src/core/levels.ts");
  if (!Array.isArray(LEVELS)) throw new Error("Level freeze check could not load LEVELS");
  const ids = LEVELS.map((level) => level.id);
  const expectedIds = Array.from({ length: baseline.levelCount }, (_, index) => index + 1);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    throw new Error(`Level freeze expected IDs 1-${baseline.levelCount}, received ${ids.join(",")}`);
  }

  const campaignSha256 = hashValue(LEVELS);
  if (campaignSha256 !== baseline.campaignSha256) {
    const changedLevels = LEVELS
      .filter((level) => hashValue(level) !== baseline.levelSha256[String(level.id)])
      .map((level) => level.id);
    throw new Error(
      `Level freeze drift detected in ${changedLevels.length} level(s): ${changedLevels.join(", ")}. `
      + `Expected ${baseline.campaignSha256}, received ${campaignSha256}. `
      + "This release is in system-only mode; restore the frozen campaign before building.",
    );
  }

  console.log(
    `Verified frozen campaign: ${LEVELS.length}/100 levels, semantic SHA-256 ${campaignSha256}, `
    + `${authoredSourceCount} authored sources, ${difficultyRuleSourceCount} difficulty-rule sources, `
    + `${difficultyIntegrationCount} gameplay-integration nodes.`,
  );
} finally {
  await vite.close();
}
