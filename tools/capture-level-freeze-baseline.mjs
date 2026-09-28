import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createServer } from "vite";
import {
  levelFreezeAuthoredSources,
  levelFreezeDifficultyRuleSources,
} from "./level-freeze-spec.mjs";
import {
  assertPositiveLevelCount,
  levelCountForCapture,
} from "./level-freeze-count.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = resolve(root, "tools", "level-freeze-baseline.json");
const archiveDirectory = resolve(root, "playtest-results", "level-freeze-baselines");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

if (!dryRun && !args.includes("--confirm")) {
  throw new Error("Refusing to replace the level freeze baseline without --confirm");
}

const label = args.find((arg) => arg.startsWith("--label="))?.slice("--label=".length).trim();
if (!label) throw new Error("A non-empty --label=<name> is required when capturing a baseline");

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

const hashFile = async (relativePath) => createHash("sha256")
  .update(await readFile(resolve(root, relativePath)))
  .digest("hex")
  .toUpperCase();

const hashFiles = async (paths) => Object.fromEntries(await Promise.all(
  paths.map(async (relativePath) => [relativePath, await hashFile(relativePath)]),
));

const current = JSON.parse(await readFile(baselinePath, "utf8"));
if (current.schemaVersion !== 2) {
  throw new Error("Unsupported level freeze baseline schema");
}
assertPositiveLevelCount(current.levelCount, "current baseline level count");

const archiveBaseline = async (snapshot) => {
  const archiveName = `${snapshot.baseline}.json`;
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(archiveName)) {
    throw new Error(`Cannot archive unsafe baseline label ${JSON.stringify(snapshot.baseline)}`);
  }
  const archivePath = resolve(archiveDirectory, archiveName);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  await mkdir(archiveDirectory, { recursive: true });
  try {
    await writeFile(archivePath, serialized, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const archived = await readFile(archivePath, "utf8");
    if (archived !== serialized) {
      throw new Error(`Refusing to overwrite immutable freeze archive ${archiveName}`);
    }
  }
  return archivePath;
};

const integration = current.difficultyIntegrationAst;
if (!integration?.file || !integration?.className || !Array.isArray(integration.constants)
  || !Array.isArray(integration.methods) || integration.includeConstructor !== true) {
  throw new Error("Level freeze integration specification is incomplete");
}

const integrationSourceText = await readFile(resolve(root, integration.file), "utf8");
const integrationSource = ts.createSourceFile(
  integration.file,
  integrationSourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const constants = new Map();
for (const statement of integrationSource.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && integration.constants.includes(declaration.name.text)) {
      constants.set(declaration.name.text, statement.getText(integrationSource));
    }
  }
}
const classNode = integrationSource.statements.find((statement) => (
  ts.isClassDeclaration(statement) && statement.name?.text === integration.className
));
if (!classNode) throw new Error(`Could not find class ${integration.className}`);
const constructors = classNode.members.filter((member) => ts.isConstructorDeclaration(member));
if (constructors.length !== 1) throw new Error(`Expected exactly one ${integration.className} constructor`);
const methods = new Map();
for (const member of classNode.members) {
  if (!ts.isMethodDeclaration(member) || !member.name) continue;
  const name = member.name.getText(integrationSource);
  if (integration.methods.includes(name)) methods.set(name, member.getText(integrationSource));
}
const missingConstants = integration.constants.filter((name) => !constants.has(name));
const missingMethods = integration.methods.filter((name) => !methods.has(name));
if (missingConstants.length || missingMethods.length) {
  throw new Error(`Cannot capture incomplete integration AST; missing constants [${missingConstants}] methods [${missingMethods}]`);
}
const integrationSha256 = hashValue({
  constructor: constructors[0].getText(integrationSource),
  constants: Object.fromEntries([...constants].sort(([left], [right]) => left.localeCompare(right))),
  methods: Object.fromEntries([...methods].sort(([left], [right]) => left.localeCompare(right))),
});

const vite = await createServer({
  root,
  logLevel: "silent",
  appType: "custom",
  server: { middlewareMode: true },
});

try {
  const { LEVELS } = await vite.ssrLoadModule("/src/core/levels.ts");
  const levelCount = levelCountForCapture(LEVELS, current.levelCount);
  const authoredSources = levelFreezeAuthoredSources(levelCount);
  const difficultyRuleSources = levelFreezeDifficultyRuleSources(levelCount);

  const next = {
    ...current,
    baseline: label,
    levelCount,
    campaignSha256: hashValue(LEVELS),
    levelSha256: Object.fromEntries(LEVELS.map((level) => [String(level.id), hashValue(level)])),
    sourceSha256: await hashFiles(authoredSources),
    difficultyRuleSourceSha256: await hashFiles(difficultyRuleSources),
    difficultyIntegrationAst: { ...integration, sha256: integrationSha256 },
  };
  let archivePath = "not written (--dry-run)";
  if (!dryRun) {
    await archiveBaseline(current);
    archivePath = await archiveBaseline(next);
    await writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }
  console.log(
    `${dryRun ? "Dry-run validated" : "Captured"} ${label}: ${LEVELS.length}/${levelCount} levels, semantic SHA-256 ${next.campaignSha256}, `
    + `${Object.keys(next.sourceSha256).length} authored sources, `
    + `${Object.keys(next.difficultyRuleSourceSha256).length} difficulty-rule sources; `
    + `immutable archive ${archivePath}.`,
  );
} finally {
  await vite.close();
}
