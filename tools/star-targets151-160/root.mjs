import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const ROOT='deliverables/star-targets151-160-20260927',VERSION='1.110.0';
const modulePath='src/core/remake151to160.ts',fixturePath='tests/fixtures/remake151to160-v102.json';
const targets={157:47,158:59};
const write=(p,v)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
const mode=process.argv[2];
if(mode==='register'){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.109.0');
 const manifestPath='docs/rules/manifest.json',raw=fs.readFileSync(manifestPath,'utf8'),manifest=JSON.parse(raw),agentsRaw=fs.readFileSync('AGENTS.md','utf8');
 write(ROOT+'/rules-before.json',{manifest,raw,lock});
 const doc=`docs/rules/mechanism-rules-v${VERSION}.md`;
 manifest.activeVersion=VERSION;manifest.versions.push({version:VERSION,ruleId:`blockout-rules-v${VERSION}`,runtimeProfile:'revised-2026-09-27-v1.5',document:doc,sha256:rulesDigest(fs.readFileSync(doc,'utf8')),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户在151–160完成后要求调整三星条件；仅157采用47拖、158采用59拖完整路线总拖，不称最优，全部时间/玩法/其它198/存档保持，正式双屏Pointer自然钟与三星结算验收，不发布。'});
 let agents=agentsRaw.replace(/^当前活动规则：.*$/m,'当前活动规则：`docs/rules/mechanism-rules-v1.110.0.md`。151–160仅157、158三星拖数采用47、59；其余承继v1.109，活动版本以manifest为准。');
 agents=agents.replace(/^2\. 完整阅读该版本文档。.*$/m,'2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.110.0.md`（157/158三星47/59拖，保时间/玩法/其它198；其余承继v1.109）。');
 agents=agents.replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.110优先：用户要求151–160调整三星；仅157为47拖、158为59拖，采用已验证完整无道具路线总拖，不称最优。保全部时间星/时限/地图/难度/其它198及存档，旧证据不重标，正式双屏Pointer自然钟与实际三星结算验收，不打包发布。');
 assert.notEqual(agents,agentsRaw);assert.equal(fs.readFileSync(manifestPath,'utf8'),raw);assert.equal(fs.readFileSync('AGENTS.md','utf8'),agentsRaw);
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync('AGENTS.md',agents);
 const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));assert.deepEqual(manifest.versions.slice(0,-1),JSON.parse(raw).versions);
 write(ROOT+'/registration.json',{before:lock.activeVersion,after:after.activeVersion,oldEntriesUnchanged:true,newEntry:manifest.versions.at(-1),versions:after.verified.length});
 console.log(JSON.stringify({status:'PASS',active:after.activeVersion,versions:after.verified.length}));
}else if(mode==='capture'){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version===VERSION));
 const raw=fs.readFileSync(modulePath,'utf8'),fixtureRaw=fs.readFileSync(fixturePath,'utf8');
 const {api}=await loadApi(),src={};
 function tree(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())tree(f);else src[f]={sha256:digest(fs.readFileSync(f)),raw:fs.readFileSync(f,'utf8')};}}tree('src');
 const fixture=JSON.parse(fixtureRaw),rows=[];
 for(const row of fixture.rows){const current=api.LEVELS[row.id-1];assert.deepEqual(current,row.level);const replay=api.replayRevisedRoute(current,row.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));rows.push({id:row.id,totalDrags:row.drags.length,nonClearingDrags:replay.nonClearingDrags,oldTargets:api.levelStarTargets(current),newMoveTarget:targets[row.id]??api.levelStarTargets(current).moveTarget});}
 assert.equal(api.levelStarTargets(api.LEVELS[156]).moveTarget,42);assert.equal(api.levelStarTargets(api.LEVELS[157]).moveTarget,40);
 assert.equal(fs.readFileSync(modulePath,'utf8'),raw);
 const before={ruleVersion:VERSION,createdAt:new Date().toISOString(),levels:api.LEVELS.map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)})),src,modulePath,moduleRaw:raw,fixturePath,fixtureSha256:digest(Buffer.from(fixtureRaw)),campaignSha256:digest(api.LEVELS),rows};
 write(ROOT+'/before.json',before);console.log(JSON.stringify({status:'PASS',rows}));
}else if(mode==='apply'){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version===VERSION));
 const before=JSON.parse(fs.readFileSync(ROOT+'/before.json')),raw=fs.readFileSync(modulePath,'utf8');assert.equal(raw,before.moduleRaw);
 const parsed=ts.createSourceFile(modulePath,raw,ts.ScriptTarget.Latest,true),edits=[];
 function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(parsed)==='reviewed'){for(const prop of n.initializer.properties){const id=Number(prop.name.text);if(!targets[id])continue;const field=prop.initializer.properties.find(p=>p.name.text==='preservedMoveTarget');assert(field&&ts.isNumericLiteral(field.initializer));assert.equal(Number(field.initializer.text),id===157?42:40);edits.push({id,start:field.initializer.getStart(parsed),end:field.initializer.end,old:field.initializer.text,next:String(targets[id])});}}ts.forEachChild(n,walk);}walk(parsed);assert.equal(edits.length,2);
 const {api:oldApi}=await loadApi();assert.equal(digest(oldApi.LEVELS),digest(before.levels.map(r=>r.level)),'Concurrent serialized level change before write: recapture explicitly, do not silently bless');
 let next=raw;for(const e of [...edits].sort((a,b)=>b.start-a.start))next=next.slice(0,e.start)+e.next+next.slice(e.end);
 assert.equal(fs.readFileSync(modulePath,'utf8'),raw);fs.writeFileSync(modulePath,next);
 const {api}=await loadApi(),expected=before.levels.map(r=>({...r.level,...(targets[r.level.id]?{preservedMoveTarget:targets[r.level.id]}:{})}));assert.equal(digest(api.LEVELS),digest(expected));
 assert.equal(digest(fs.readFileSync(fixturePath)),before.fixtureSha256);
 const fixture=JSON.parse(fs.readFileSync(fixturePath)),witnesses=[];
 for(const row of fixture.rows){const level=api.LEVELS[row.id-1],replay=api.replayRevisedRoute(level,row.drags);assert(replay.valid&&replay.complete);assert(row.drags.length<=api.levelStarTargets(level).moveTarget);witnesses.push({id:row.id,level,levelSha256:digest(level),sourceLevelSha256:digest(row.level),drags:row.drags,sourceReady:row.ready,sourceFixture:{file:fixturePath,sha256:before.fixtureSha256},replay:{valid:replay.valid,complete:replay.complete,totalDrags:row.drags.length,nonClearingDrags:replay.nonClearingDrags}});
  if(targets[row.id]){const ready=JSON.parse(fs.readFileSync(row.ready.file));assert.equal(digest(fs.readFileSync(row.ready.file)),row.ready.sha256);assert.deepEqual(ready.level,row.level);const packet={...ready,level,sourceReview:{...ready.sourceReview,bindings:{...ready.sourceReview.bindings,[row.ready.file]:row.ready.sha256,[fixturePath]:before.fixtureSha256}},scoringChange:{ruleVersion:VERSION,sourceLevelSha256:digest(row.level),currentLevelSha256:digest(level),oldMoveTarget:before.levels[row.id-1].starTargets.moveTarget,newMoveTarget:targets[row.id],mapUnchanged:true,routeOptimal:false}};write(ROOT+`/packets/level${row.id}.json`,packet);}
 }
 write(ROOT+'/route-witnesses.json',{ruleVersion:VERSION,rows:witnesses});write(ROOT+'/applied.json',{status:'PASS',ruleVersion:VERSION,edits,moduleBeforeSha256:digest(Buffer.from(raw)),moduleAfterSha256:digest(Buffer.from(next)),other198Unchanged:true,allTenRoutesComplete:true,fixtureUnchanged:true,allTimesAndGameplayUnchanged:true,campaignSha256:digest(api.LEVELS)});
 console.log(JSON.stringify({status:'PASS',edits,witnesses:witnesses.map(r=>({id:r.id,total:r.drags.length}))}));
}else throw Error('register | capture | apply');
