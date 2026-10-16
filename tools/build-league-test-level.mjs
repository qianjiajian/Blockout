import {build} from "esbuild";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {loadSpatialApi} from "./continuation211-colored-witness.mjs";
import {staticDelayedLiftFloor} from "./regeneration211-design/native-static-lift214.mjs";
import {loadContinuationRuntime} from "./continuation211-runtime.mjs";
import {verifyRulesLock} from "./verify-rules-lock.mjs";
if(!verifyRulesLock().ok)throw Error("Rules lock failed; no league level generation permitted");
const out="deliverables/league-step4-20261001";await mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:"export {getFormal211to220LevelStrict} from './src/core/formal211to220Data.ts';",resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm"});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const reference=api.getFormal211to220LevelStrict(217);
const palette={red:"pink",pink:"red",blue:"cyan",cyan:"blue",green:"green",yellow:"yellow",purple:"purple",orange:"orange"};
function adapt(value,key){if(typeof value==="string"&&(key==="color"||key==="layers"))return palette[value]??value;if(Array.isArray(value))return value.map(v=>adapt(v,key));if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,adapt(v,k)]));return value;}
const level=adapt(structuredClone(reference));level.id=900001;level.name="联赛试炼·升降调度";level.timeSeconds=180;level.reward=0;
delete level.featureIntro;delete level.mechanismAdaptation;delete level.onboardingHint;
level.parMoves=41;level.preservedMoveTarget=41;
// Independent data variant, with disclosed reused original geometry. The source
// registry and production LEVELS are never mutated or used to award league points.
const specials=level.blocks.filter(b=>b.shutterId||b.movementAxis).map(b=>b.id);
for(const b of level.blocks.filter(b=>!b.shutterId&&!b.movementAxis).filter((b,i)=>i%3===0))specials.push(b.id);
const old=JSON.parse(await readFile("deliverables/continue211-220-20260930/design217-wide-large-v2/qualified217.json","utf8"));
const core=await loadContinuationRuntime(),replay=core.replayRevisedRoute(level,old.drags);
if(!replay.valid||!replay.complete||replay.nonClearingDrags>20)throw Error("Invalid full league route");
const lower=staticDelayedLiftFloor(level,await loadSpatialApi(),{floor:16,maxMilliseconds:60000,maxStates:6000000});
const sha=createHash("sha256").update(JSON.stringify(level)).digest("hex");
await writeFile(`${out}/test-level-proof.json`,JSON.stringify({status:lower.thresholdProven?"PASS":"UNKNOWN",levelSha256:sha,reference:{id:217,scope:"Reused project-authored geometry and mechanism inventory, independently recolored; not claimed new geometry",unchanged:true},level,specials,drags:old.drags,replay,lower},null,2));
if(!lower.thresholdProven)throw Error("Fresh league difficulty floor not proven");
await writeFile("src/core/leagueTestLevel.ts",`import type {LevelSpec} from './types';\n// Independent league prototype; disclosed adapted original geometry from 217.\n// Does not import or modify production LEVELS or its progression.\nexport const LEAGUE_TEST_LEVEL:LevelSpec=${JSON.stringify(level,null,2)};\nexport const LEAGUE_TEST_SPECIAL_IDS:readonly string[]=${JSON.stringify(specials)};\nexport const LEAGUE_TEST_LEVEL_SHA256='${sha}';\n`);
console.log(JSON.stringify({status:"PASS",lower:16,upper:replay.nonClearingDrags,totalDrags:replay.effectiveDrags,specials:specials.length,sha}));
