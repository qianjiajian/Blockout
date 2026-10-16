import fs from "node:fs";
import { build } from "esbuild";
const original = fs.readFileSync("tools/remake111to120-spatial-floor-v147.mjs", "utf8");
const patched = original.replace("assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');", "assert(['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules));");
fs.writeFileSync("tools/tmp-spatial-v122.mjs", patched, "utf8");
const api = await import(`file://${process.cwd().replaceAll('\\\\','/')}/tools/tmp-spatial-v122.mjs`);
const bundle = await build({stdin:{resolveDir:process.cwd(),contents:`export {REMADE_201_210_LEVELS} from './src/core/remake201to210.ts';`,sourcefile:'tmp-v122-floor.ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const data = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatialApi = await api.loadSpatialApi();
const output = { ruleVersion: "v1.122.0", profile: "v1.5-spatial-exact-no-timer", records: {} };
for (const id of [201,205,208]) {
  const level = data.REMADE_201_210_LEVELS.find((candidate) => candidate.id === id);
  const result = api.searchSpatial(level, spatialApi, { floor: 5, prove: true, normalize: false, maxStates: 250000, maxMilliseconds: 30000, maxTransitions: 5000000 });
  output.records[id] = { levelId:id, difficulty:level.difficulty, result };
  console.log(JSON.stringify({id,status:result.status,thresholdProven:result.thresholdProven,explored:result.exploredStates,transitions:result.attemptedTransitions,termination:result.termination,drags:result.drags?.length}));
}
fs.writeFileSync("deliverables/continue201-210-20260929/lower-bound-v122-simple.json", JSON.stringify(output, null, 2));
