// Install only a prepared subset that also passed candidate Pointer replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,VERSION,IDS} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const [manifestPath,...pointerFiles]=process.argv.slice(2);
const m=JSON.parse(fs.readFileSync(manifestPath)),{api}=await loadApi();
assert.equal(m.ruleVersion,VERSION);
const alreadyApplied=m.rows.every(r=>digest(api.LEVELS[r.id-1])===r.levelSha256)&&digest(api.LEVELS.filter(l=>!m.ids.includes(l.id)))===m.unchangedOutsideSubsetSha256;
assert(digest(api.LEVELS)===m.campaignBeforeSha256||alreadyApplied,'Re-prepare against concurrent work; never restore an old campaign');
assert(m.ids.length&&m.ids.every(id=>IDS.includes(id))&&new Set(m.ids).size===m.ids.length);
const reports=pointerFiles.map(p=>({path:p,data:JSON.parse(fs.readFileSync(p))}));
assert(reports.length);for(const r of reports){assert.equal(r.data.status,'PASS');assert.equal(r.data.ruleVersion,VERSION);assert(r.data.naturalClock&&!r.data.clockFrozen);assert.deepEqual(r.data.errors,[]);assert.deepEqual(r.data.drift,[]);}
const fixturePath='tests/fixtures/native-remake31to40-v147.json';
const fixture=fs.existsSync(fixturePath)?JSON.parse(fs.readFileSync(fixturePath)):{ruleVersion:VERSION,rows:[],batches:[]};
assert.equal(fixture.ruleVersion,VERSION);
for(const r of m.rows){
  assert.equal(digest(fs.readFileSync(r.candidatePath)),r.candidateFileSha256);assert.equal(digest(fs.readFileSync(r.checksPath)),r.checksSha256);
  const d=JSON.parse(fs.readFileSync(r.candidatePath));assert.equal(digest(d.level),r.levelSha256);assert.equal(digest(d.drags),r.routeSha256);
  const pointer=reports.find(report=>report.data.rows.some(row=>row.id===r.id&&row.status==='PASS'&&row.levelSha256===r.levelSha256&&row.routeSha256===r.routeSha256&&row.final.complete&&!row.final.failed));
  assert(pointer,`Lv${r.id}: missing exact candidate Pointer evidence`);
  fixture.rows=fixture.rows.filter(row=>row.id!==r.id);
  fixture.rows.push({id:r.id,level:d.level,drags:d.drags,lowerBound:r.lowerBound,upperBound:r.upperBound,levelSha256:r.levelSha256,manifestPath,candidatePointer:pointer.path});
}
fixture.rows.sort((a,b)=>a.id-b.id);if(!fixture.batches.includes(manifestPath))fixture.batches.push(manifestPath);
const ids=fixture.rows.map(r=>r.id);
const modulePath='src/core/nativeRemake31to40.ts';
const moduleSource=`// Fresh v1.47 validation of the resumed 31-40 batch. Unlisted levels stay unchanged.\nimport type {LevelSpec} from './types';\nexport const NATIVE_REMAKE31_40_IDS: readonly number[] = ${JSON.stringify(ids)};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(Object.fromEntries(fixture.rows.map(r=>[r.id,r.level])),null,2)};\nexport const applyNativeRemake31to40 = (level:LevelSpec):LevelSpec => reviewed[level.id] ?? level;\n`;
const levelsPath='src/core/levels.ts',artPath='src/game/formalBlockShapes.ts';
let levels=fs.readFileSync(levelsPath,'utf8'),art=fs.readFileSync(artPath,'utf8');
if(!levels.includes('import { applyNativeRemake31to40 }')){
  levels=`import { applyNativeRemake31to40 } from "./nativeRemake31to40";\n`+levels;
  assert.match(levels,/export const LEVELS: LevelSpec\[\] = [^\r\n]+;/);
  levels=levels.replace(/export const LEVELS: LevelSpec\[\] = ([^\r\n]+);/,`export const LEVELS_BEFORE_31_40_NATIVE_REMAKE: LevelSpec[] = $1;\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_31_40_NATIVE_REMAKE.map(applyNativeRemake31to40);`);
}
assert(levels.includes('.map(applyNativeRemake31to40)'));
if(!art.includes('NATIVE_REMAKE31_40_IDS')){
  art=`import { NATIVE_REMAKE31_40_IDS } from "../core/nativeRemake31to40";\n`+art;
  assert.equal(art.split(' ? "native-only" : "legacy"').length,2);
  art=art.replace(' ? "native-only" : "legacy"',' || NATIVE_REMAKE31_40_IDS.includes(levelId) ? "native-only" : "legacy"');
}
// All preconditions pass before the small local mutation batch starts.
const writeChanged=(p,s)=>{if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==s)fs.writeFileSync(p,s);};
writeChanged(modulePath,moduleSource);writeChanged(fixturePath,JSON.stringify(fixture,null,2)+'\n');
writeChanged(levelsPath,levels);writeChanged(artPath,art);
console.log(JSON.stringify({installed:m.ids,totalInstalled:ids,manifestPath,alreadyApplied,candidatePointer:reports.map(r=>r.path),formalPointerValidated:false}));
