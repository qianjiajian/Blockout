import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
import {loadApi,replay} from '../remake182-185-20260927/replay.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
export const ROOT='deliverables/star-targets182-185-20260928',VERSION='1.111.0';
const production='src/core/remake181to190.ts',oldRoot='deliverables/remake182-185-20260927';
const sources={182:oldRoot+'/author182/reviewed182-1790523598812.json',185:oldRoot+'/author185/enriched-1790524540984.json'};
const write=(p,v)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
function gate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));return l;}
const mode=process.argv[2];
if(mode==='register'){
 const lock=gate();assert.equal(lock.activeVersion,'1.110.0');
 const p='docs/rules/manifest.json',raw=fs.readFileSync(p,'utf8'),m=JSON.parse(raw),aRaw=fs.readFileSync('AGENTS.md','utf8');
 const doc=`docs/rules/mechanism-rules-v${VERSION}.md`;write(ROOT+'/rules-before.json',{manifest:m,raw,lock});
 m.activeVersion=VERSION;m.versions.push({version:VERSION,ruleId:'blockout-rules-v'+VERSION,runtimeProfile:'revised-2026-09-27-v1.5',document:doc,sha256:rulesDigest(fs.readFileSync(doc,'utf8')),status:'frozen',frozenOn:'2026-09-28',confirmation:'用户要求调整两关三星；182正式48拖，185新候选50拖，保97/93秒时间星及135/130总时限与玩法。评分不等于185未知初态许可，旧正式185保持；完整路线/双屏真实输入自然钟三星验证，旧证据存档保持，不发布。'});
 let a=aRaw.replace(/^当前活动规则：.*$/m,'当前活动规则：`docs/rules/mechanism-rules-v1.111.0.md`。182正式三星48拖，185新候选50拖；保时间与玩法，185未知初态待确认，其余承继v1.110。');
 a=a.replace(/^2\. 完整阅读该版本文档。.*$/m,'2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.111.0.md`（182正式48拖/185候选50拖，保时间/玩法；185未知初态未获许可，旧正式保持）。');
 a=a.replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.111优先：用户要求调整三星，182正式采用48拖、185新候选采用50拖完整路线总拖，不称最优；保97/93秒星、135/130时限及全部玩法/历史par/reward。185初态许可仍待答，本次不接入185或改变旧正式图；182正式/185候选各双屏Pointer自然钟和三星结算，旧证据/其它关/存档保持，不发布。');
 assert.notEqual(a,aRaw);assert.equal(fs.readFileSync(p,'utf8'),raw);assert.equal(fs.readFileSync('AGENTS.md','utf8'),aRaw);
 fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');fs.writeFileSync('AGENTS.md',a);
 const after=gate();assert.deepEqual(m.versions.slice(0,-1),JSON.parse(raw).versions);
 write(ROOT+'/registration.json',{status:'PASS',before:lock.activeVersion,after:after.activeVersion,versions:after.verified.length,oldEntriesUnchanged:true,newEntry:m.versions.at(-1)});
 console.log(JSON.stringify({active:after.activeVersion,versions:after.verified.length}));
}else if(mode==='apply'){
 const lock=gate();assert(lock.verified.some(v=>v.version===VERSION));const {api}=await loadApi();
 const levels=JSON.parse(JSON.stringify(api.LEVELS)),raw=fs.readFileSync(production,'utf8'),src={};
 function tree(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())tree(f);else src[f]={sha256:digest(fs.readFileSync(f)),raw:fs.readFileSync(f,'utf8')};}}tree('src');
 const candidates=Object.fromEntries(Object.entries(sources).map(([id,p])=>[id,JSON.parse(fs.readFileSync(p))]));
 assert.deepEqual(levels[181],candidates[182].level);assert.notEqual(digest(levels[184]),digest(candidates[185].level));
 const oldFiles=[...Object.values(sources),'tests/fixtures/remake182185-v107.json',oldRoot+'/ready182-1790523907666.json',oldRoot+'/candidate185-root-1790524769513.json',oldRoot+'/review/candidate182-1790523820095.json',oldRoot+'/review/candidate185-1790524663247.json',oldRoot+'/review/pointer185-1790524760895.json',oldRoot+'/formal-verified-1790524191694.json'];
 for(const dir of ['pointer-1790523956983-320x568-15588','pointer-1790523956987-496x1078-37024','pointer-1790524439458-320x568-3248','pointer-1790524439380-496x1078-63916'])for(const e of fs.readdirSync(oldRoot+'/'+dir,{withFileTypes:true}))if(e.isFile())oldFiles.push(oldRoot+'/'+dir+'/'+e.name);
 const oldEvidence=Object.fromEntries(oldFiles.map(p=>[p,digest(fs.readFileSync(p))]));
 if(fs.existsSync(ROOT+'/before.json')){const saved=JSON.parse(fs.readFileSync(ROOT+'/before.json'));assert.equal(saved.moduleRaw,raw);assert.equal(saved.campaignSha256,digest(levels));for(const[p,h]of Object.entries(saved.oldEvidence))assert.equal(digest(fs.readFileSync(p)),h);}
 else write(ROOT+'/before.json',{createdAt:new Date().toISOString(),ruleVersion:VERSION,levels:levels.map(level=>({level,starTargets:api.levelStarTargets(level),sha256:digest(level)})),campaignSha256:digest(levels),modulePath:production,moduleRaw:raw,src,oldEvidence,sources,sourceLevelHashes:Object.fromEntries(Object.entries(candidates).map(([id,d])=>[id,digest(d.level)]))});
 const parsed=ts.createSourceFile(production,raw,ts.ScriptTarget.Latest,true);let edit;
 function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(parsed)==='reviewed'){const prop=n.initializer.properties.find(p=>Number(p.name.text)===182),field=prop.initializer.properties.find(p=>p.name.text==='preservedMoveTarget');assert.equal(field,undefined);const par=prop.initializer.properties.find(p=>p.name.text==='parMoves');assert.equal(Number(par.initializer.text),31);const end=prop.initializer.properties.at(-1).end;edit={id:182,kind:'add-explicit-score-override',start:end,end,old:'',next:',\n    "preservedMoveTarget": 48',oldEffectiveTarget:31,newEffectiveTarget:48};}ts.forEachChild(n,walk);}walk(parsed);assert(edit);
 const next=raw.slice(0,edit.start)+edit.next+raw.slice(edit.end);
 assert.equal(digest((await loadApi()).api.LEVELS),digest(levels),'Concurrent production update; no write');assert.equal(fs.readFileSync(production,'utf8'),raw);fs.writeFileSync(production,next);
 const after=(await loadApi()).api,expected=structuredClone(levels);expected[181].preservedMoveTarget=48;
 assert.equal(digest(after.LEVELS),digest(expected));assert.deepEqual(JSON.parse(JSON.stringify(after.LEVELS[184])),levels[184]);
 const rows=[];
 for(const id of [182,185]){
  const d=candidates[id],level={...d.level,preservedMoveTarget:id===182?48:50};
  assert.equal(api.levelStarTargets(d.level).moveTarget,31);assert.equal(api.levelStarTargets(level).timeTargetSeconds,id===182?97:93);
  const rr=replay(level,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(rr.effectiveDrags,id===182?48:50);assert.equal(rr.nonClearingDrags,id===182?20:19);
  const packet={level,drags:d.drags,levelSha256:digest(level),routeSha256:digest(d.drags),sourceCandidate:sources[id],sourceCandidateSha256:oldEvidence[sources[id]],sourceLevelSha256:digest(d.level),scoringChange:{ruleVersion:VERSION,oldMoveTarget:31,newMoveTarget:level.preservedMoveTarget,timeTargetSeconds:api.levelStarTargets(level).timeTargetSeconds,mapUnchanged:true,routeOptimal:false},mode:id===182?'formal':'candidate',sourcePhaseApprovalPending:id===185,sourceAdaptation:id===185?d.sourceAdaptation:undefined,lowerBound:16,upperBound:id===182?20:19};
  const file=ROOT+`/packets/level${id}.json`;write(file,packet);rows.push({id,file,sha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(d.drags),mode:packet.mode,totalDrags:d.drags.length,replay:rr,targets:api.levelStarTargets(level)});
 }
 for(const[p,h]of Object.entries(oldEvidence))assert.equal(digest(fs.readFileSync(p)),h);
 write(ROOT+'/applied.json',{status:'PASS',ruleVersion:VERSION,edits:[edit],other199FormalUnchanged:true,formal185Unchanged:true,oldEvidenceUnchanged:true,moduleBeforeSha256:digest(Buffer.from(raw)),moduleAfterSha256:digest(Buffer.from(next)),rows,campaignSha256:digest(after.LEVELS)});
 console.log(JSON.stringify({status:'PASS',rows:rows.map(({id,file,mode,targets,totalDrags})=>({id,file,mode,targets,totalDrags}))}));
}else throw Error('register | apply');
