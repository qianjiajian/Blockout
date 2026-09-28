import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54',toolDir='tools/campaign-v145/lv051-060';
const archived=dir+'/author51-53-enrichment-1790248323.mjs',source=fs.readFileSync(archived,'utf8'),originalSha='5f4be1857ef550bbe6de46557b4bb31708f1c211d6ba6f7ba352b24af3583309';
assert.equal(digest(source),originalSha);
const executableSnapshot=toolDir+'/author51-53-enrichment-snapshot-1790248323.mjs';
const writeOnce=(file,data)=>{if(fs.existsSync(file))assert.equal(fs.readFileSync(file,'utf8'),data);else fs.writeFileSync(file,data,{flag:'wx'});};
writeOnce(executableSnapshot,source);
const cut=source.indexOf("const [mode='generate',arg='53']=process.argv.slice(2);");assert(cut>0);
// Explicit derivative: preserve construction prefix verbatim, remove historical
// search/enrichment CLI, expose pure make/RNG. Its SHA is intentionally NEW.
const constructionSource=source.slice(0,cut)+'\nexport {make, seededRng};\n',constructionModule=toolDir+'/construction51-53-from-1790248323.mjs';
writeOnce(constructionModule,constructionSource);
process.env.PACK_TRIES='6000';
const {make,seededRng}=await import(pathToFileURL(path.resolve(constructionModule)).href);
const recipes=[{id:51,seed:146051,attempt:55,file:'candidate51-1790248325953.json'},{id:53,seed:146053,attempt:11143,file:'candidate53-1790248323901.json'}],rows=[];
for(const recipe of recipes){
 const d=JSON.parse(fs.readFileSync(dir+'/'+recipe.file));assert.equal(d.freshVerification.authorSha256,originalSha);assert.equal(d.seed,recipe.seed);assert.equal(d.attempts,recipe.attempt);
 const rng=seededRng(recipe.seed);let built;const started=Date.now();for(let i=1;i<=recipe.attempt;i++)built=make(recipe.id,rng);
 assert(built.level,JSON.stringify(built));assert.deepEqual(built.level,d.level);assert.equal(digest(built.level),d.freshVerification.levelSha256);
 rows.push({...recipe,packTries:6000,levelSha256:digest(built.level),candidateSha256:digest(fs.readFileSync(dir+'/'+recipe.file)),exactLevelMatch:true,constructionMilliseconds:Date.now()-started});console.log(JSON.stringify(rows.at(-1)));
}
const bindingFiles=['deliverables/remake31-200-v145-20260924/baseline.json','deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs','src/game/formalBlockShapes.ts','tools/native-block-repair-v143.mjs','tools/remake91to100-v146.mjs'];
const report={checkedAt:new Date().toISOString(),rows,executableSnapshot,executableSnapshotSha256:digest(fs.readFileSync(executableSnapshot)),originalArchivedSha256:originalSha,executableSnapshotMatchesOriginalBytes:true,constructionModule,constructionModuleSha256:digest(fs.readFileSync(constructionModule)),reconstructionDriver:'tools/campaign-v145/lv051-060/reconstruct51-53.mjs',reconstructionDriverSha256:digest(fs.readFileSync('tools/campaign-v145/lv051-060/reconstruct51-53.mjs')),bindings:Object.fromEntries(bindingFiles.map(p=>[p,digest(fs.readFileSync(p))])),scope:'Pure deterministic geometry/blocks/gates construction replay. No route search, floor or Pointer repeated. Historical snapshot runs from tool directory; derivative construction module has separately recorded new hash.'};
const out=dir+'/construction-replay51-53-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,passed:true}));
