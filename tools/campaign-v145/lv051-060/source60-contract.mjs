import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
export const SOURCE60_FACTS='deliverables/remake31-200-v145-20260924/batches/lv051-060/source60-review/source60-facts-1790255410635.json';
const BASE='deliverables/remake31-200-v145-20260924/baseline.json';
const points=ps=>(ps??[]).map(p=>p.join(',')).sort();

/** Source/static-adaptation contract ONLY. This never asserts solution or difficulty PASS. */
export function checkSource60(data,{verifyEvidence=true,api}={}){
 const lock=verifyRulesLock();assert(lock.ok);const facts=JSON.parse(fs.readFileSync(SOURCE60_FACTS)),base=JSON.parse(fs.readFileSync(BASE)).levels.find(r=>r.level.id===60),l=data.level??data;
 assert.equal(l.id,60);assert.equal(l.name,base.level.name);assert.equal(l.width,5);assert.equal(l.height,7);assert.deepEqual(points(l.playable),points(base.level.playable));assert.deepEqual(l.blocked??[],base.level.blocked??[]);assert.deepEqual(l.seams??[],base.level.seams??[]);
 assert.equal(l.timeSeconds,90);assert.equal(l.reward,base.level.reward);assert.equal(l.parMoves,base.level.parMoves);if(l.preservedMoveTarget!==undefined)assert.equal(l.preservedMoveTarget,52);
 if(api)assert.deepEqual(api.levelStarTargets(l),base.starTargets);
 for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])assert.equal((l[k]??[]).length,0,`Unapproved source mechanism ${k}`);
 assert.equal(l.blocks.length,35);assert.equal(new Set(l.blocks.map(b=>b.id)).size,35);assert.equal(new Set(l.blocks.map(b=>`${b.x},${b.y}`)).size,35);
 const axis={yellow:'vertical',green:'vertical',red:'horizontal',blue:'horizontal',pink:'horizontal'},counts={yellow:11,green:7,red:7,blue:8,pink:2};
 for(const b of l.blocks){assert.deepEqual(points(b.shape),['0,0']);assert(b.x>=0&&b.x<5&&b.y>=0&&b.y<7&&Number.isInteger(b.x)&&Number.isInteger(b.y));assert.equal(b.movementAxis,axis[b.color]);assert.equal(b.frozen??0,0);assert.deepEqual(b.layers??[b.color],[b.color]);for(const k of ['shutterId','timedBombSeconds','star','rotating','rotation','generatorId'])assert(b[k]===undefined||b[k]===false,`Unexpected block attr ${k}`);}
 for(const [color,count] of Object.entries(counts))assert.equal(l.blocks.filter(b=>b.color===color).length,count);
 for(let i=0;i<35;i++)for(let j=0;j<i;j++){const a=l.blocks[i],b=l.blocks[j];if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1)assert.notEqual(a.color,b.color);}
 assert.equal(l.gates.length,5);assert.equal(new Set(l.gates.map(g=>g.color)).size,5);const rails=new Set();
 for(const g of l.gates){assert(Object.hasOwn(counts,g.color));assert.equal(g.frozen??0,0);assert(!g.star);assert(!g.portals?.length,'No split/repeated physical mouth allowed');assert(g.size>=1&&g.size<=3&&Number.isInteger(g.size));const vertical=['top','bottom'].includes(g.side);assert.equal(vertical?'vertical':'horizontal',axis[g.color]);assert(['top','bottom','left','right'].includes(g.side));assert(Number.isInteger(g.offset)&&g.offset>=0&&g.offset+g.size<=(vertical?5:7));for(let n=g.offset;n<g.offset+g.size;n++){const key=g.side+':'+n;assert(!rails.has(key));rails.add(key);}for(const b of l.blocks.filter(b=>b.color===g.color)){const v=vertical?b.x:b.y;assert(v>=g.offset&&v<g.offset+g.size,'Axis carrier outside own gate projection');}}
 const keys=l.blocks.filter(b=>b.keyId),locks=l.blocks.filter(b=>b.lockedBy);assert.equal(keys.length,1);assert.equal(locks.length,1);assert.notEqual(keys[0].id,locks[0].id);assert.equal(keys[0].keyId,locks[0].lockedBy);assert.equal(locks[0].lockCount??1,1);assert(!keys[0].lockedBy);for(const b of l.blocks)if(!b.lockedBy)assert(b.lockCount===undefined);
 // Pair all unchanged color+axis source bodies first. Only the exact minimal
 // residual adaptation is allowed; generated IDs/positions do not impersonate source IDs.
 const remainingSource=[...facts.source.blocks],remainingCandidate=[...l.blocks].sort((a,b)=>a.id.localeCompare(b.id)),rows=[];
 const pair=(sourceIndex,candidateIndex,change)=>{const [s]=remainingSource.splice(sourceIndex,1),[b]=remainingCandidate.splice(candidateIndex,1);assert.equal(s.movementAxis,b.movementAxis);rows.push({sourceId:s.sourceId,candidateId:b.id,sourceColor:s.color,designColor:b.color,sourceAxis:s.movementAxis,designAxis:b.movementAxis,sourcePosition:[s.x,s.y],designPosition:[b.x,b.y],kind:'SINGLE',changedColor:change,addedAttributes:{...(b.keyId?{keyId:b.keyId}:{}),...(b.lockedBy?{lockedBy:b.lockedBy,lockCount:b.lockCount??1}: {})},passed:true});};
 for(let i=remainingCandidate.length-1;i>=0;i--){const b=remainingCandidate[i],si=remainingSource.findIndex(s=>s.color===b.color&&s.movementAxis===b.movementAxis);if(si>=0)pair(si,i,false);}
 assert.equal(remainingSource.length,3);assert.equal(remainingCandidate.length,3);
 for(const [from,to,n]of [['yellow','green',1],['red','pink',2]])for(let j=0;j<n;j++){const si=remainingSource.findIndex(s=>s.color===from),ci=remainingCandidate.findIndex(b=>b.color===to);assert(si>=0&&ci>=0);pair(si,ci,true);}
 assert.equal(remainingSource.length,0);assert.equal(remainingCandidate.length,0);assert.equal(rows.filter(r=>r.changedColor).length,3);
 if(verifyEvidence){for(const f of facts.frames)assert.equal(digest(fs.readFileSync(f.file)),f.sha256);assert.equal(digest(fs.readFileSync(facts.sourceVideo.file)),facts.sourceVideo.sha256);assert.equal(digest(fs.readFileSync(facts.sourceTruth.file)),facts.sourceTruth.sha256);assert.equal(digest(fs.readFileSync(facts.hardRuleAdaptation.capacityReport)),facts.hardRuleAdaptation.capacityReportSha256);assert.equal(digest(fs.readFileSync(BASE)),facts.baseline.sha256);}
 return {checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,sourceContractPassed:true,levelSha256:digest(l),sourceFacts:SOURCE60_FACTS,sourceFactsSha256:digest(fs.readFileSync(SOURCE60_FACTS)),sourceMapping:Object.fromEntries(rows.map(r=>[r.sourceId,[r.candidateId]])),rows:rows.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)),sourceCounts:facts.source.sourceCounts,designCounts:counts,minimumNecessaryRecolors:3,preservedBodies:35,preservedAxisCount:35,addedTeaching:{keyId:keys[0].id,lockedId:locks[0].id,group:keys[0].keyId,count:1},evidenceVerified:verifyEvidence,starTargets:base.starTargets,actualStarGetterChecked:Boolean(api),exactSourceCopy:false,solvabilityVerified:false,lowerBoundProven:false,formalAdopted:false,toolSha256:digest(fs.readFileSync(import.meta.filename))};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const file=process.argv[2];if(!file)throw Error('Usage: source60-contract.mjs CANDIDATE.json');const d=JSON.parse(fs.readFileSync(file));const report={...checkSource60(d),candidate:file,candidateSha256:digest(fs.readFileSync(file))},out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/source60-review/contract60-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,sourceContractPassed:true,rows:report.rows.length,recolors:3,levelSha256:report.levelSha256}));
}
