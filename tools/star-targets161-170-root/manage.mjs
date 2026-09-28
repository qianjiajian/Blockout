import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
import {loadApi,replay} from '../remake161-170/replay.mjs';
import {digest,writeNew} from '../remake161-170/common.mjs';

const ROOT='deliverables/star-targets161-170-20260927';
const sourceFile='src/core/remake161to170.ts',fixtureFile='tests/fixtures/remake161to170-v103.json';
const targets={161:43,167:50,168:63,170:37},oldTargets={161:39,167:43,168:55,170:33};
const read=p=>JSON.parse(fs.readFileSync(p));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const mode=process.argv[2];
if(mode==='prepare'){
 assert.equal(lock.activeVersion,'1.108.0','Read any newly active rules before continuing');
 const {api}=await loadApi(),fixture=read(fixtureFile),completion=read('deliverables/remake161-170-20260927/complete.json');
 const routeRows=fixture.rows.map(r=>{const level=api.LEVELS[r.id-1];assert.equal(digest(level),completion.rows.find(x=>x.id===r.id).levelSha256);const result=replay(level,r.drags,api,{complete:true,requirePointerCompatible:true});return{id:r.id,level,drags:r.drags,routeSha256:digest(r.drags),sourceLevelSha256:digest(level),nonClearingDrags:result.nonClearingDrags,totalDrags:result.effectiveDrags,oldStarTargets:api.levelStarTargets(level),newMoveTarget:targets[r.id]??api.levelStarTargets(level).moveTarget};});
 for(const [id,target]of Object.entries(targets)){const r=routeRows.find(x=>x.id===Number(id));assert.equal(r.oldStarTargets.moveTarget,oldTargets[id]);assert.equal(r.totalDrags,target);}
 writeNew(ROOT+'/before.json',{createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,ids:Object.keys(targets).map(Number),targets,oldTargets,levels:api.LEVELS.map(level=>({level,sha256:digest(level),starTargets:api.levelStarTargets(level)})),inputs:Object.fromEntries(files('src').map(p=>[p,digest(fs.readFileSync(p))])),sourceFile,sourceText:fs.readFileSync(sourceFile,'utf8'),fixture:fixtureFile,fixtureSha256:digest(fs.readFileSync(fixtureFile)),manifest:read('docs/rules/manifest.json'),manifestText:fs.readFileSync('docs/rules/manifest.json','utf8'),agentsText:fs.readFileSync('AGENTS.md','utf8')});
 writeNew(ROOT+'/route-witnesses-before.json',{note:'Historical level hashes are explicitly pre-score; runtime packets must use current formal levels.',rows:routeRows});
 console.log(JSON.stringify({before:ROOT+'/before.json',routes:10,changeIds:Object.keys(targets)}));
}else if(mode==='register'){
 assert.equal(lock.activeVersion,'1.108.0','Read any newly active rules first');
 const manifestFile='docs/rules/manifest.json',raw=fs.readFileSync(manifestFile,'utf8'),m=JSON.parse(raw),agentsRaw=fs.readFileSync('AGENTS.md','utf8');
 const version='1.109.0',doc='docs/rules/mechanism-rules-v'+version+'.md';
 const content=`# Block Out! 161–170三星拖数调整 v${version}

- Rule ID: blockout-rules-v${version}
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.108.0；仅替代本批四关旧三星拖数保持要求。

## 用户指令与本次调整

用户在161–170十关正式完成、已说明四关当前路线只获两星后明确要求“调整三星条件”。本次将161关39→43拖、167关43→50拖、168关55→63拖、170关33→37拖，采用已验证完整无道具路线的总拖动次数，不称最优。其余六关拖数目标42/92/89/74/82/40保持，分别对应162/163/164/165/166/169。

四关时间星分别54/108/82/129秒及全部十关原总时限保持。本次只新增或更改实际评分覆盖字段preservedMoveTarget；全部地图几何、色块、出口、隐藏层、机关、运行档案、难度、历史parMoves/reward及其它196关保持。用户对162原创开局的窄来源例外继续，原始未拍初态仍未知。

## 证据与验收

现有有效完整路线沿用，但须在当前最终正式对象上重新回放并核新评分显示、双屏真实Pointer、自然时钟、实际三星结算和隔离MemoryHost保存。原下界/路线/旧Pointer证据不原地重标；本次不重生成地图，不把评分验收称为更高难度或最优路线证明。

使用新评分的逐关证据保存于deliverables/star-targets161-170-20260927。全部时间条件、共享玩法/UI/资源、账户及真实玩家存档保持，旧规则及原始证据保留；不打包、上传或发布。
`;
 fs.writeFileSync(doc,content,{flag:'wx'});
 assert.equal(fs.readFileSync(manifestFile,'utf8'),raw,'Concurrent manifest mutation');
 m.activeVersion=version;m.versions.push({version,ruleId:'blockout-rules-v'+version,runtimeProfile:'revised-2026-09-27-v1.5',document:doc,sha256:rulesDigest(content),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户要求161–170调整三星，仅161关43拖、167关50拖、168关63拖、170关37拖采用当前完整路线总拖；保全部时间/地图/其它196/旧证据/存档，正式双屏自然钟三星结算验收，不发布。'});
 assert.equal(fs.readFileSync('AGENTS.md','utf8'),agentsRaw,'Concurrent AGENTS mutation');
 const agents=agentsRaw.replace(/当前活动(?:修复)?规则：[^\r\n]+/,'当前活动规则：`'+doc+'`。161/167/168/170三星拖数改43/50/63/37，其余承继v1.108，活动版本以manifest为准。').replace(/2\. 完整阅读该版本文档。[^\r\n]+/,'2. 完整阅读该版本文档。当前为 `'+doc+'`（161–170四关三星拖数调整，保时间/地图/旧证据；其余承继v1.108）。').replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.109优先：用户要求161–170调整三星，仅161关43拖、167关50拖、168关63拖、170关37拖采用当前完整无道具路线总拖，不称最优。保全部时间/地图/难度/其它196/旧证据及存档，162来源窄例外保持；正式双屏Pointer自然钟与实际三星结算验收，不打包发布。');
 assert.notEqual(agents,agentsRaw);fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');fs.writeFileSync('AGENTS.md',agents);
 const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));assert.deepEqual(m.versions.slice(0,-1),JSON.parse(raw).versions);
 writeNew(ROOT+'/registration.json',{before:lock.activeVersion,after:after.activeVersion,oldEntriesUnchanged:true,versions:after.verified.length,entry:m.versions.at(-1)});
 console.log(JSON.stringify({activeVersion:after.activeVersion,versions:after.verified.length,document:doc}));
}else if(mode==='apply'){
 assert(lock.verified.some(r=>r.version==='1.109.0'));
 const before=read(ROOT+'/before.json'),raw=fs.readFileSync(sourceFile,'utf8');assert.equal(raw,before.sourceText);
 const {api}=await loadApi();
 // Baseline is JSON: runtime optional properties with value undefined are
 // intentionally absent in that representation, not a production mutation.
 assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS)),before.levels.map(r=>r.level),'Concurrent production change needs explicit review');
 for(const [p,h]of Object.entries(before.inputs))assert.equal(digest(fs.readFileSync(p)),h,'Before-write source '+p);
 let next=raw;const edits=[];
 for(const [id,value]of Object.entries(targets)){
  const pattern=new RegExp('("id": '+id+',\\r?\\n    "name":[\\s\\S]*?"parMoves": '+oldTargets[id]+')(\\r?\\n  })');
  const found=next.match(pattern);assert(found,`Unique level footer ${id}`);assert(!found[1].includes('preservedMoveTarget'));const replacement=found[1]+',\n    "preservedMoveTarget": '+value+found[2];edits.push({id:Number(id),before:found[0],after:replacement});next=next.replace(pattern,replacement);
 }
 fs.writeFileSync(sourceFile,next);
 const after=(await loadApi()).api,expected=structuredClone(before.levels.map(r=>r.level));for(const l of expected)if(targets[l.id])l.preservedMoveTarget=targets[l.id];assert.deepEqual(JSON.parse(JSON.stringify(after.LEVELS)),expected);
 for(const l of after.LEVELS){const prior=before.levels[l.id-1];assert.equal(after.levelStarTargets(l).timeTargetSeconds,prior.starTargets.timeTargetSeconds);assert.equal(after.levelStarTargets(l).moveTarget,targets[l.id]??prior.starTargets.moveTarget);}
 assert.equal(digest(fs.readFileSync(fixtureFile)),before.fixtureSha256);
 const rows=read(ROOT+'/route-witnesses-before.json').rows.map(r=>{const level=after.LEVELS[r.id-1],played=replay(level,r.drags,after,{complete:true,requirePointerCompatible:true});return {...r,level,currentLevelSha256:digest(level),starTargets:after.levelStarTargets(level),routePassed:played.complete};});
 writeNew(ROOT+'/route-witnesses.json',{ruleVersion:lock.activeVersion,rows});
 writeNew(ROOT+'/applied.json',{status:'PASS',ruleVersion:lock.activeVersion,ids:Object.keys(targets).map(Number),targets,sourceFile,beforeSha256:digest(raw),afterSha256:digest(next),edits,onlyFourScoreOverrides:true,other196Preserved:true,allTimeTargetsPreserved:true,historicalFixturePreserved:true,rows:rows.map(({id,currentLevelSha256,starTargets,totalDrags,nonClearingDrags})=>({id,currentLevelSha256,starTargets,totalDrags,nonClearingDrags})),campaignSha256:digest(after.LEVELS),playerSaveTouched:false,published:false});
 console.log(JSON.stringify({applied:ROOT+'/applied.json',changed:Object.keys(targets),routeRows:rows.length}));
}else throw Error('prepare | register | apply');
