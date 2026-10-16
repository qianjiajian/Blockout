import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRetiredReplacementArtHasNoConsumers, filterWechatAssetSnapshot} from '../scripts/wechat-resource-policy.mjs';

const manifest = `export const GAME_ART = {ui:{formalPages:{shop:{
  reference: "assets/art/ui/formal-pages/shop/reference.png",
  buyButton: "assets/art/ui/formal-pages/shop/buy-button.png",
  boosterTile: "assets/art/ui/formal-pages/shop/booster-tile.png",
  priceCoin: "assets/art/ui/formal-pages/shop/price-coin.png"
}}}};`;
const mechanisms = `const ROOT = "assets/art/gameplay/mechanics/revised-reference-v1";
export const REVISED_MECHANISM_ART_URLS = {shutterStrip: \`${'${ROOT}'}/shutter-strip.png\`, bombFace: \`${'${ROOT}'}/bomb-face.png\`};
export const REVISED_MECHANISM_ART_PATHS = [REVISED_MECHANISM_ART_URLS.shutterStrip, REVISED_MECHANISM_ART_URLS.bombFace];
export const ACTIVE_REVISED_MECHANISM_ART_PATHS = [...REVISED_MECHANISM_ART_PATHS.filter(path => path !== REVISED_MECHANISM_ART_URLS.shutterStrip), "nine-slice.png"];`;
const loader = `function load(){const paths = GAME_ART.ui.formalPages.shop; loadImages([paths.time,paths.rocket,paths.pulse]);}`;
const sources = (extra = '', game = loader, revised = mechanisms) => [
  {path: 'game/artManifest.ts', text: manifest},
  {path: 'game/revisedMechanismArt.ts', text: revised},
  {path: 'game/ColorEscapeGame.ts', text: game},
  {path: 'game/another-consumer.ts', text: extra},
];

test('reviewed current replacement paths permit only three live shop icons and filtered shutter inventory', () => {
  assert.deepEqual(assertRetiredReplacementArtHasNoConsumers(sources()), {assets: 5, shopConsumers: 1, filteredInventories: 1});
  const live = ['time', 'rocket', 'pulse'].map(name => ({path: `art/ui/formal-pages/shop/${name}.png`}));
  live.push({path: 'art/gameplay/mechanics/revised-reference-v1/bomb-face.png'});
  assert.deepEqual(filterWechatAssetSnapshot(live), live);
});

test('direct, concatenated and relocated retired paths reject newly introduced consumers', () => {
  for (const expression of [
    '"assets/art/ui/formal-pages/shop/reference.png"',
    '"assets/art/ui/formal-pages/shop/" + "buy-button.png"',
    '"meta-ui/formal-pages/shop/booster-tile.png"',
    '"gameplay-art/revised-mechanisms/shutter-strip.png"',
  ]) assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources(`loadImage(${expression});`)), /runtime consumer/);
});

test('direct or aliased manifest access and container escapes cannot load excluded shop fields', () => {
  for (const extra of [
    'loadImage(GAME_ART.ui.formalPages.shop.reference);',
    'loadImage(GAME_ART["ui"]["formalPages"]["shop"]["priceCoin"]);',
    'const pages = GAME_ART.ui.formalPages;',
    'const {reference} = GAME_ART.ui.formalPages.shop;',
    'import {GAME_ART as art} from "./artManifest"; loadImage(art.ui.formalPages.shop.reference);',
    'loadImages(Object.values(GAME_ART));',
    'loadImages(GAME_ART.ui.formalPages[pageName]);',
  ]) assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources(extra)), /consumer|escaped/);
  for (const extra of ['paths.reference', 'paths["buyButton"]', 'Object.values(paths)', '(() => paths)()']) {
    const changed = loader.replace('loadImages([paths.time,paths.rocket,paths.pulse]);', `loadImages([paths.time, ${extra}]);`);
    assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources('', changed)), /runtime consumer/);
  }
});

test('restoring raw shutter inventory, changing the filter or enumerating all URLs fails closed', () => {
  for (const extra of [
    'loadImages(REVISED_MECHANISM_ART_PATHS);',
    'loadImage(REVISED_MECHANISM_ART_URLS.shutterStrip);',
    'loadImages(Object.values(REVISED_MECHANISM_ART_URLS));',
    'loadImage(REVISED_MECHANISM_ART_URLS[imageName]);',
    'import {REVISED_MECHANISM_ART_PATHS as all} from "./revisedMechanismArt"; loadImages(all);',
  ]) assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources(extra)), /runtime consumer/);
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources('', loader, mechanisms.replace('path !==', 'path ==='))), /runtime consumer/);
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources('', loader, mechanisms.replace('.filter(path => path !== REVISED_MECHANISM_ART_URLS.shutterStrip)', ''))), /runtime consumer/);
});

const suppliedInventory = `export const WELFARE_SUPPLIED_ART = {
  panel: "assets/art/ui/formal-pages/shop-supplied-v1/panel.png",
  boosterTime: "assets/art/ui/formal-pages/shop-supplied-v1/booster-time.png"
} as const;`;
const suppliedLoader = `import { WELFARE_SUPPLIED_ART } from './welfareSuppliedArt';
async function load(){
  const entries = Object.entries(WELFARE_SUPPLIED_ART) as [string, string][];
  const images = await this.loadImages(entries.map(([, path]) => path));
}`;
const suppliedSources = (game = suppliedLoader, inventory = suppliedInventory, extra = '') => [
  ...sources(extra, game), {path: 'game/welfareSuppliedArt.ts', text: inventory},
];

test('current supplied shop loader is audited without requiring the unused old manifest alias', () => {
  assert.deepEqual(assertRetiredReplacementArtHasNoConsumers(suppliedSources()), {assets: 5, shopConsumers: 1, filteredInventories: 1});
});

test('supplied inventory cannot restore retired images or escape its reviewed image directory', () => {
  for (const path of [
    'assets/art/ui/formal-pages/shop/reference.png',
    'assets/art/ui/formal-pages/shop/buy-button.png',
    'assets/art/ui/formal-pages/shop/booster-tile.png',
    'assets/art/ui/formal-pages/shop/price-coin.png',
    'meta-ui/formal-pages/shop/reference.png',
    'assets/art/ui/other/panel.png',
    'assets/art/ui/formal-pages/shop-supplied-v1/../shop/reference.png',
  ]) assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(suppliedLoader,
    suppliedInventory.replace('assets/art/ui/formal-pages/shop-supplied-v1/panel.png', path))), /reviewed replacement image paths|runtime consumer/);
  for (const value of ['GAME_ART.ui.formalPages.shop.reference', 'dynamicPath', '"assets/art/ui/formal-pages/shop-supplied-v1/" + "panel.png"']) {
    assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(suppliedLoader,
      suppliedInventory.replace('"assets/art/ui/formal-pages/shop-supplied-v1/panel.png"', value))), /reviewed replacement image paths/);
  }
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(suppliedLoader,
    suppliedInventory.replace('panel:', '...GAME_ART.ui.formalPages.shop, panel:'))), /reviewed replacement image paths/);
});

test('supplied loader requires the reviewed import, inventory and direct map-to-load flow', () => {
  for (const game of [
    suppliedLoader.replace("'./welfareSuppliedArt'", "'./otherInventory'"),
    suppliedLoader.replace('entries.map(([, path]) => path)', 'entries.map(([key]) => key)'),
    suppliedLoader.replace('this.loadImages', 'otherLoader'),
    suppliedLoader.replace('entries.map(([, path]) => path)', 'entries.map(([, path]) => path + suffix)'),
    suppliedLoader + loader,
    suppliedLoader + suppliedLoader.replace('function load', 'function secondLoad'),
  ]) assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(game)), /reviewed|direct supplied/);
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(sources('', suppliedLoader)), /inventory declaration/);
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(suppliedLoader, suppliedInventory,
    'loadImage(GAME_ART.ui.formalPages.shop.priceCoin);')), /runtime consumer/);
  assert.throws(() => assertRetiredReplacementArtHasNoConsumers(suppliedSources(suppliedLoader, suppliedInventory,
    'loadImage("assets/art/ui/formal-pages/shop/reference.png");')), /runtime consumer/);
});
