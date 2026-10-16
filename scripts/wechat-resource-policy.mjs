import assert from "node:assert/strict";
import { lstat, readFile, readdir, realpath, rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import ts from "typescript";

const retiredUiGroups = [
  {
    directory: "league-video-v1",
    archive: "LEGACY_LEAGUE_TROPHY_ART_URLS",
    names: ["row", "self-row", "score-token", "coin-reward", "bronze", "silver", "gold",
      "platinum", "emerald", "diamond", "master", "glory"],
    package: "league-ui",
  },
  {
    directory: "daily-challenge-v2",
    archive: "LEGACY_DAILY_CHALLENGE_ART_URLS",
    names: ["panel-frame", "header-bar", "reward-banner", "row-frame", "reward-card", "first-clear-tag",
      "challenge-button", "locked-button", "close-button", "attempt-badge", "difficulty-diamond"],
    package: "event-ui",
  },
  {
    directory: "daily-challenge-v1",
    archive: "LEGACY_DAILY_CHALLENGE_ART_URLS",
    names: ["entry-icon", "lock-icon", "plus-icon"],
  },
];
const retiredUi = retiredUiGroups.flatMap((group) => group.names.map((name) => ({
  source: `art/ui/${group.directory}/${name}.png`,
  archive: group.archive,
  relocated: group.package ? `${group.package}/${group.directory}/${name}.png` : undefined,
})));
const retiredShopFields = Object.freeze({ reference: 'reference', buyButton: 'buy-button', boosterTile: 'booster-tile', priceCoin: 'price-coin' });
const retiredProfileReferenceFiles = [
  ...Array.from({ length: 15 }, (_, index) => `avatar-${index}.png`),
  'coin.png', 'edit.png', 'header.png', 'panel.png', 'save.png', 'stat-0.png', 'stat-1.png', 'stat-2.png',
];

// Exact reviewed exceptions only. Keep these files in public for authoring,
// provenance and the Web editor; the WeChat runtime has no consumer for them.
// source is relative to public/assets; output is the copy at exclusion time.
// Retired UI is removed before event-art relocation. Authored/Web copies stay.
export const WECHAT_RESOURCE_EXCLUSIONS = Object.freeze([
  {
    source: "art/gameplay/mechanics/revised-reference-v1/README.md",
    output: "gameplay-art/revised-mechanisms/README.md",
    reason: "authoring-documentation",
  },
  {
    source: "art/gameplay/mechanics/revised-reference-v1/manifest.json",
    output: "gameplay-art/revised-mechanisms/manifest.json",
    reason: "authoring-provenance",
  },
  {
    source: "art/gameplay/mechanics/shutter-nine-slice-v1/README.md",
    output: "gameplay-art/shutter-nine-slice/README.md",
    reason: "authoring-documentation",
  },
  {
    source: "art/gameplay/mechanics/shutter-nine-slice-v1/manifest.json",
    output: "gameplay-art/shutter-nine-slice/manifest.json",
    reason: "authoring-provenance",
  },
  {
    source: "audio/sfx/manifest.json",
    output: "audio/sfx/manifest.json",
    reason: "authoring-provenance",
  },
  ...["neutral-rail-1-cell.png", "neutral-corner-inner.png", "neutral-corner-outer.png"].map((name) => ({
    source: `art/gameplay/board/formal-border-v1/${name}`,
    output: `assets/art/gameplay/board/formal-border-v1/${name}`,
    reason: "web-editor-only",
  })),
  ...retiredUi.map(({ source }) => ({
    source,
    output: `assets/${source}`,
    reason: "retired-ui-art",
  })),
  ...Object.values(retiredShopFields).map(name => ({
    source: `art/ui/formal-pages/shop/${name}.png`,
    output: `meta-ui/formal-pages/shop/${name}.png`,
    reason: 'retired-shop-art',
  })),
  {
    source: 'art/gameplay/mechanics/revised-reference-v1/shutter-strip.png',
    output: 'gameplay-art/revised-mechanisms/shutter-strip.png',
    reason: 'retired-shutter-art',
  },
  ...retiredProfileReferenceFiles.map((name) => ({
    source: `art/ui/profile-reference-v1/${name}`,
    output: `assets/art/ui/profile-reference-v1/${name}`,
    reason: 'retired-profile-art',
  })),
  // Profile frame IDs stay unchanged, but all 19 now use the supplied PNGs.
  // Keep the independently loaded avatars in both old directories shipping.
  ...Array.from({ length: 19 }, (_, index) => {
    const source = `art/ui/${index < 9 ? 'profile-reference-v1' : 'profile-unlocks-v1'}/frame-${index}.png`;
    return { source, output: `assets/${source}`, reason: 'retired-profile-frame-art' };
  }),
  {
    source: 'art/ui/formal-pages/life-refill-reference-v1/panel.png',
    output: 'meta-ui/formal-pages/life-refill-reference-v1/panel.png',
    reason: 'retired-life-refill-art',
  },
  {
    source: 'art/ui/formal-pages/booster-purchase-reference-v1/panel.png',
    output: 'meta-ui/formal-pages/booster-purchase-reference-v1/panel.png',
    reason: 'retired-booster-reference-art',
  },
  {
    source: 'art/ui/formal-pages/overlays/pause-settings/clear-progress-button.png',
    output: 'meta-ui/formal-pages/overlays/pause-settings/clear-progress-button.png',
    reason: 'retired-test-control-art',
  },
  ...['time.png', 'rocket.png', 'pulse.png'].map((name) => ({
    source: `art/ui/formal-pages/shop/${name}`,
    output: `meta-ui/formal-pages/shop/${name}`,
    reason: 'retired-shop-art',
  })),
].map((entry) => Object.freeze(entry)));

function checkedRelativePath(path) {
  assert(typeof path === "string" && /^[a-zA-Z0-9._/-]+$/.test(path)
    && path.split("/").every((part) => part && part !== "." && part !== ".."),
  `Unsafe resource policy path: ${path}`);
  return path;
}

const excludedSources = new Set(WECHAT_RESOURCE_EXCLUSIONS.map(({ source }) => checkedRelativePath(source)));
const excludedOutputs = new Set(WECHAT_RESOURCE_EXCLUSIONS.flatMap(({ source, output }) => [
  checkedRelativePath(output), `assets/${source}`,
  ...(/^art\/ui\/profile-(?:reference|unlocks)-v1\//.test(source)
    ? [checkedRelativePath(`event-ui/${source.slice('art/ui/'.length)}`)]
    : source.startsWith('art/ui/formal-pages/booster-purchase-reference-v1/')
      ? [checkedRelativePath(`event-ui/booster-purchase-reference-v1/${source.slice('art/ui/formal-pages/booster-purchase-reference-v1/'.length)}`)]
      : []),
]).concat(retiredUi.flatMap(({ relocated }) => relocated ? [checkedRelativePath(relocated)] : [])));

// These names may occur only at their archived declarations. In particular,
// never exclude every URL in LEGACY_DAILY_CHALLENGE_ART_URLS: it also declares
// live profile-unlocks avatars, whose independently constructed URLs still load.
export function assertRetiredWechatUiHasNoConsumers(sources) {
  const byUrl = new Map(retiredUi.flatMap((entry) => [
    [`assets/${entry.source}`, entry], ...(entry.relocated ? [[entry.relocated, entry]] : []),
  ]));
  const archives = new Set(retiredUi.map(({ archive }) => archive));
  const declarations = new Map();
  const occurrences = new Map();
  const unwrap = (node) => {
    while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
    return node;
  };
  const stringValue = (node) => {
    node = unwrap(node);
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = stringValue(node.left), right = stringValue(node.right);
      return left === undefined || right === undefined ? undefined : left + right;
    }
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text;
      for (const span of node.templateSpans) {
        const part = stringValue(span.expression);
        if (part === undefined) return undefined;
        value += part + span.literal.text;
      }
      return value;
    }
    return undefined;
  };
  for (const { path, text } of sources) {
    const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(tree.parseDiagnostics.length, 0, `Cannot audit invalid source: ${path}`);
    const location = (node) => `${path}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`;
    function visit(node) {
      if (ts.isIdentifier(node) && archives.has(node.text)) {
        const declaration = node.parent;
        assert(path === "game/artManifest.ts" && ts.isVariableDeclaration(declaration) && declaration.name === node
          && declaration.initializer && ts.isArrayLiteralExpression(unwrap(declaration.initializer)),
        `Archived UI constant has a runtime consumer: ${node.text} at ${location(node)}`);
        declarations.set(node.text, (declarations.get(node.text) ?? 0) + 1);
      }
      const value = stringValue(node);
      assert(!archives.has(value), `Archived UI constant has a runtime consumer at ${location(node)}`);
      const entry = value === undefined ? undefined : byUrl.get(value.replace(/^\//, ""));
      if (entry) {
        let parent = node.parent;
        const directArrayElement = ts.isStringLiteralLike(node) && ts.isArrayLiteralExpression(parent);
        if (directArrayElement) {
          parent = parent.parent;
          while (ts.isAsExpression(parent) || ts.isParenthesizedExpression(parent) || ts.isSatisfiesExpression(parent)) parent = parent.parent;
        }
        assert(value === `assets/${entry.source}` && path === "game/artManifest.ts" && directArrayElement && ts.isVariableDeclaration(parent)
          && ts.isIdentifier(parent.name) && parent.name.text === entry.archive,
        `Retired UI asset has a runtime consumer: ${value} at ${location(node)}`);
        occurrences.set(entry.source, (occurrences.get(entry.source) ?? 0) + 1);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const archive of archives) assert.equal(declarations.get(archive), 1, `Missing/duplicate archive declaration: ${archive}`);
  for (const { source } of retiredUi) assert.equal(occurrences.get(source), 1, `Missing/duplicate retired UI archive URL: ${source}`);
  return { assets: retiredUi.length, archives: archives.size, sourceFiles: sources.length };
}

/** Fail closed if the current replacement loaders start consuming old images. */
export function assertRetiredReplacementArtHasNoConsumers(sources) {
  const shopRoot = 'GAME_ART.ui.formalPages.shop';
  const shutterRoot = 'REVISED_MECHANISM_ART_URLS.shutterStrip';
  const rawInventory = 'REVISED_MECHANISM_ART_PATHS';
  const activeInventory = 'ACTIVE_REVISED_MECHANISM_ART_PATHS';
  const allowedShopFields = new Set(['time', 'rocket', 'pulse']);
  const overlaps = (name, target) => {
    if (!name) return false;
    const actual = name.split('.'), expected = target.split('.');
    return actual.slice(0, Math.min(actual.length, expected.length))
      .every((part, index) => part === '?' || part === expected[index]);
  };
  const declarations = new Map();
  let shopConsumers = 0, suppliedShopConsumers = 0, suppliedShopInventories = 0, filteredInventories = 0;
  const urls = new Map(Object.entries(retiredShopFields).map(([key, name]) => [
    `assets/art/ui/formal-pages/shop/${name}.png`, `${shopRoot}.${key}`,
  ]));
  urls.set('assets/art/gameplay/mechanics/revised-reference-v1/shutter-strip.png', shutterRoot);
  for (const {path, text} of sources) {
    const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(tree.parseDiagnostics.length, 0, `Cannot audit invalid source: ${path}`);
    const constants = new Map(), importedNames = new Map(), importedFrom = new Map();
    const unwrap = node => {
      while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
      return node;
    };
    const value = (node, depth = 0) => {
      if (!node || depth > 8) return undefined;
      node = unwrap(node);
      if (ts.isStringLiteralLike(node)) return node.text;
      if (ts.isIdentifier(node) && constants.has(node.text)) return value(constants.get(node.text), depth + 1);
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const a = value(node.left, depth + 1), b = value(node.right, depth + 1);
        return a === undefined || b === undefined ? undefined : a + b;
      }
      if (ts.isTemplateExpression(node)) {
        let result = node.head.text;
        for (const span of node.templateSpans) { const part = value(span.expression, depth + 1); if (part === undefined) return undefined; result += part + span.literal.text; }
        return result;
      }
      return undefined;
    };
    const scan = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer);
      if (ts.isImportSpecifier(node)) {
        importedNames.set(node.name.text, node.propertyName?.text ?? node.name.text);
        importedFrom.set(node.name.text, node.parent.parent.parent.moduleSpecifier.text);
      }
      ts.forEachChild(node, scan);
    };
    scan(tree);
    const member = node => {
      node = unwrap(node);
      if (ts.isIdentifier(node)) return importedNames.get(node.text) ?? node.text;
      if (ts.isPropertyAccessExpression(node)) { const base = member(node.expression); return base && `${base}.${node.name.text}`; }
      if (ts.isElementAccessExpression(node)) { const base = member(node.expression), key = value(node.argumentExpression); return base && `${base}.${key ?? '?'}`; }
      return undefined;
    };
    const owner = node => { while (node && !ts.isVariableDeclaration(node)) node = node.parent; return node; };
    const declaredProperty = node => {
      let current = node, names = [];
      while (current?.parent) {
        const parent = current.parent;
        if (ts.isPropertyAssignment(parent) && parent.initializer === current) { names.unshift(parent.name.getText(tree).replace(/^['"]|['"]$/g, '')); current = parent.parent; }
        else if (ts.isVariableDeclaration(parent) && parent.initializer === current && ts.isIdentifier(parent.name)) return [parent.name.text, ...names].join('.');
        else if (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isParenthesizedExpression(parent)) current = parent;
        else return undefined;
      }
      return undefined;
    };
    const location = node => `${path}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`;
    const fail = node => assert.fail(`Retired replacement art has a runtime consumer at ${location(node)}`);
    const validInventoryFilter = call => {
      if (!ts.isCallExpression(call) || member(call.expression) !== `${rawInventory}.filter` || call.arguments.length !== 1) return false;
      const predicate = call.arguments[0], declaration = owner(call);
      return path === 'game/revisedMechanismArt.ts' && declaration?.name.getText(tree) === activeInventory
        && ts.isArrowFunction(predicate) && predicate.parameters.length === 1
        && ts.isIdentifier(predicate.parameters[0].name) && ts.isBinaryExpression(predicate.body)
        && predicate.body.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
        && member(predicate.body.left) === predicate.parameters[0].name.text && member(predicate.body.right) === shutterRoot;
    };
    const checkShopAlias = declaration => {
      assert(ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)
        && path === 'game/ColorEscapeGame.ts', 'Retired shop container escaped its reviewed loader');
      const alias = declaration.name.text;
      let scope = declaration.parent;
      while (scope && !ts.isBlock(scope)) scope = scope.parent;
      assert(scope, 'Missing shop loader scope');
      const visit = node => {
        if (ts.isIdentifier(node) && node.text === alias && node !== declaration.name) {
          const p = node.parent;
          if (!(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) || p.expression !== node
            || !allowedShopFields.has(ts.isPropertyAccessExpression(p) ? p.name.text : value(p.argumentExpression))) fail(node);
        }
        ts.forEachChild(node, visit);
      };
      visit(scope);
      shopConsumers += 1;
    };
    const checkSuppliedShopLoader = call => {
      const declaration = owner(call), inventory = call.arguments[0];
      assert(path === 'game/ColorEscapeGame.ts' && call.arguments.length === 1
        && ts.isIdentifier(inventory) && importedFrom.get(inventory.text) === './welfareSuppliedArt'
        && declaration && ts.isIdentifier(declaration.name) && unwrap(declaration.initializer) === call,
      'Supplied shop inventory escaped its reviewed loader');
      const entries = declaration.name.text;
      let scope = declaration.parent;
      while (scope && !ts.isBlock(scope)) scope = scope.parent;
      assert(scope, 'Missing supplied shop loader scope');
      let loads = 0;
      const inspect = node => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword && node.expression.name.text === 'loadImages'
          && node.arguments.length === 1) {
          const mapping = unwrap(node.arguments[0]);
          if (ts.isCallExpression(mapping) && member(mapping.expression) === `${entries}.map` && mapping.arguments.length === 1) {
            const mapper = mapping.arguments[0], binding = ts.isArrowFunction(mapper) && mapper.parameters.length === 1 && mapper.parameters[0].name;
            if (binding && ts.isArrayBindingPattern(binding) && binding.elements.length === 2
              && ts.isOmittedExpression(binding.elements[0]) && ts.isBindingElement(binding.elements[1])
              && !binding.elements[1].dotDotDotToken && !binding.elements[1].initializer
              && ts.isIdentifier(binding.elements[1].name) && ts.isIdentifier(mapper.body)
              && mapper.body.text === binding.elements[1].name.text) loads += 1;
          }
        }
        ts.forEachChild(node, inspect);
      };
      inspect(scope);
      assert.equal(loads, 1, 'Expected one direct supplied shop entries path loader');
      suppliedShopConsumers += 1;
      shopConsumers += 1;
    };
    const visit = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'WELFARE_SUPPLIED_ART') {
        assert(path === 'game/welfareSuppliedArt.ts' && node.initializer,
          'Supplied shop inventory must keep its reviewed declaration');
        const inventory = unwrap(node.initializer);
        assert(ts.isObjectLiteralExpression(inventory) && inventory.properties.length > 0
          && inventory.properties.every(property => ts.isPropertyAssignment(property)
            && ts.isStringLiteralLike(property.initializer)
            && /^assets\/art\/ui\/formal-pages\/shop-supplied-v1\/[a-z0-9-]+\.png$/.test(property.initializer.text)),
        'Supplied shop inventory must contain only reviewed replacement image paths');
        suppliedShopInventories += 1;
      }
      const resolved = value(node);
      if (typeof resolved === 'string') {
        const normalized = resolved.replace(/^\//, '');
        const expected = urls.get(normalized);
        if (expected) {
          const expectedFile = expected === shutterRoot ? 'game/revisedMechanismArt.ts' : 'game/artManifest.ts';
          if (path !== expectedFile || declaredProperty(node) !== expected) fail(node);
          declarations.set(expected, (declarations.get(expected) ?? 0) + 1);
        }
        for (const url of urls.keys()) {
          const relocated = url.includes('/shop/') ? url.replace('assets/art/ui/formal-pages/', 'meta-ui/formal-pages/')
            : url.replace('assets/art/gameplay/mechanics/revised-reference-v1/', 'gameplay-art/revised-mechanisms/');
          if (normalized === relocated) fail(node);
        }
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isIdentifier(node)) {
        const p = node.parent;
        const isReceiver = (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === node;
        const declarationName = ts.isVariableDeclaration(p) && p.name === node;
        const importName = ts.isImportSpecifier(p);
        if (!isReceiver && !declarationName && !importName) {
          const name = member(node);
          if (name === shopRoot) checkShopAlias(p);
          else if (overlaps(name, shopRoot)
            && !(name.startsWith(shopRoot + '.') && allowedShopFields.has(name.slice(shopRoot.length + 1)))) fail(node);
          if (name === shutterRoot) {
            const declaration = owner(node), inInventory = path === 'game/revisedMechanismArt.ts'
              && declaration?.name.getText(tree) === rawInventory && ts.isArrayLiteralExpression(node.parent);
            let ancestor = node.parent;
            while (ancestor && !ts.isCallExpression(ancestor) && !ts.isVariableDeclaration(ancestor)) ancestor = ancestor.parent;
            if (!inInventory && !(ancestor && validInventoryFilter(ancestor))) fail(node);
          }
          else if (overlaps(name, shutterRoot)) fail(node);
          if (name === rawInventory || name?.startsWith(rawInventory + '.')) {
            if (!(ts.isCallExpression(p) && validInventoryFilter(p))) fail(node);
          }
        }
      }
      if (ts.isCallExpression(node) && validInventoryFilter(node)) filteredInventories += 1;
      if (ts.isCallExpression(node) && member(node.expression) === 'Object.entries'
        && node.arguments.length && member(node.arguments[0]) === 'WELFARE_SUPPLIED_ART') checkSuppliedShopLoader(node);
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  for (const expected of urls.values()) assert.equal(declarations.get(expected), 1, `Missing/duplicate retired replacement declaration: ${expected}`);
  assert.equal(shopConsumers, 1, 'Expected one reviewed shop replacement loader');
  if (suppliedShopConsumers) assert.equal(suppliedShopInventories, 1, 'Expected one supplied shop inventory declaration');
  assert.equal(filteredInventories, 1, 'Expected one explicit old shutter exclusion');
  return {assets: urls.size, shopConsumers, filteredInventories};
}

export async function verifyRetiredWechatUiConsumers(projectRoot) {
  const sourceRoot = resolve(projectRoot, "src");
  const sources = [];
  async function readSources(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await readSources(path);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) sources.push({
        path: relative(sourceRoot, path).replaceAll("\\", "/"), text: await readFile(path, "utf8"),
      });
    }
  }
  await readSources(sourceRoot);
  const result = assertRetiredWechatUiHasNoConsumers(sources);
  return {...result, runtimeReplacements: assertRetiredReplacementArtHasNoConsumers(sources)};
}

// Only filter source expectations. Never filter built snapshots: an excluded
// file accidentally reintroduced into a package must remain a verifier error.
export function filterWechatAssetSnapshot(snapshot, sourcePrefix = "") {
  if (sourcePrefix) checkedRelativePath(sourcePrefix);
  return snapshot.filter(({ path }) => {
    checkedRelativePath(path);
    return !excludedSources.has(sourcePrefix ? `${sourcePrefix}/${path}` : path);
  });
}

export function assertWechatResourcesExcluded(snapshot) {
  for (const { path } of snapshot) {
    checkedRelativePath(path);
    assert(!excludedOutputs.has(path), `Non-runtime resource was shipped: ${path}`);
  }
}

export async function removeGeneratedWechatExcludedResources(projectRoot, output) {
  const actualRoot = await realpath(projectRoot);
  const actualOutput = await realpath(output);
  const outputRelative = relative(actualRoot, actualOutput).replaceAll("\\", "/");
  assert(outputRelative === "dist-wechat"
    || (outputRelative.startsWith(".codex-temp/") && !outputRelative.split("/").includes("..")),
  "Unsafe generated resource output");

  await verifyRetiredWechatUiConsumers(actualRoot);

  const targets = [];
  for (const { source, output: outputPath } of WECHAT_RESOURCE_EXCLUSIONS) {
    const expected = resolve(actualOutput, checkedRelativePath(outputPath));
    const actual = await realpath(expected);
    assert(actual === expected && (await lstat(expected)).isFile(), "Symlinked or non-file generated resource");
    assert(relative(actualOutput, actual).replaceAll("\\", "/") === outputPath,
      "Generated resource escapes output");
    const original = await readFile(resolve(actualRoot, "public/assets", source));
    assert(original.equals(await readFile(actual)), `Generated exclusion differs from its source: ${source}`);
    targets.push(actual);
  }
  // Validate all exact generated copies before deleting any; never remove
  // a directory or authored resource, and never suppress missing-file errors.
  for (const target of targets) await rm(target);
  return WECHAT_RESOURCE_EXCLUSIONS;
}
