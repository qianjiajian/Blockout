import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

const file='.codex-temp/remaining98-v111/middle/lv93/source-review-93.json';
const hash='92ba45a4afe99b198d2413138c6d121ee5074d00008285a3d8a3a414f3324a40';
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]]};
// Independently checked source177,228,235,244,245: inventory indexed in the
// immutable observed ledger, not reconstructed from candidate metadata.
const opening=[['redH2','orange','S'],['yellow-axisV2','yellow','V2','vertical'],['yellowV2','yellow','V2'],['blueV2','blue','V2'],['redS','orange','S'],['blueS','blue','S'],['redS','orange','S'],['yellow-axisV2','yellow','S','vertical'],['yellowS','yellow','S'],['blueL3','blue','L3'],['redL3','orange','L3'],['yellowS','yellow','S'],['blueH2','blue','S'],['yellowS','yellow','S']];
const cover18=[['redV2','red','H2'],['purpleSQ2','purple','SQ2'],['cyan-axisV2','pink','H2','vertical'],['red-axisSQ2','red','SQ2','vertical']];
const cover14=[['greenV2','green','V2'],['cyan-axisHSQ2','cyan','SQ2','horizontal'],['cyanS','cyan','S'],['redS','red','S'],['purpleS','purple','S'],['green-purple-shellSQ2','green','SQ2',null,['green','purple']],['redH2','red','H2']];
const gates=[['source-yellow-normal','yellow',0,'yellow'],['source-blue4','blue',4,'blue'],['source-blue6','blue',6,'orange'],['source-red6','red',6,'red'],['source-cyan14','cyan',14,'cyan'],['source-green14','green',14,'green'],['source-red14','red',14,null],['source-cyan18','cyan',18,'pink'],['source-purple18','purple',18,'purple']];

export function verifySource93(data){
 const {level:l,sourceReview:r}=data;assert.equal(l.id,93);assert.equal(r.file,file);assert.equal(r.sha256,hash);assert.equal(digest(fs.readFileSync(file)),hash);
 const raw=JSON.parse(fs.readFileSync(file)),sources={[file]:hash};
 for(const [p,h]of Object.entries(raw.bindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}
 assert.deepEqual(r.sourceFacts,raw.sourceFacts);assert.deepEqual(r.sourceNormalizedFacts,raw.sourceNormalizedFacts);
 assert.equal(l.blocks.length,25);assert.equal(r.blockMapping.length,25);assert.equal(new Set(r.blockMapping.map(m=>m.candidateId)).size,25);assert.equal(new Set(r.blockMapping.map(m=>m.sourceCohort+':'+m.sourceBodyIndex)).size,25);
 for(const [cohort,specs]of Object.entries({opening,cover18,cover14}))for(const [i,s]of specs.entries()){
  const m=r.blockMapping.find(m=>m.sourceCohort===cohort&&m.sourceBodyIndex===i),b=l.blocks.find(b=>b.id===m?.candidateId);assert(m&&b);
  assert.deepEqual(raw.sourceFacts.pieceLedger[cohort][i][0],s[0]);assert.equal(m.sourceType,s[0]);assert.deepEqual(m.sourceLocalAnchor,raw.sourceFacts.pieceLedger[cohort][i].slice(1));assert.deepEqual(m.candidate,b);
  assert.equal(b.color,s[1]);assert.deepEqual(b.shape,shapes[s[2]]);assert.equal(b.movementAxis,s[3]??undefined);assert.deepEqual(b.layers,s[4]);
  assert.equal(b.shutterId,cohort==='opening'?undefined:`r147-93-c${cohort.slice(5)}`);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','movementAxis','layers','shutterId'].includes(k)));
 }
 assert.deepEqual(l.shutters.map(s=>[s.id,s.count,s.width*s.height,s.skin]),[['r147-93-c14',14,15,undefined],['r147-93-c18',18,12,undefined]]);
 assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),48);assert.equal(l.blocks.filter(b=>!b.shutterId).reduce((n,b)=>n+b.shape.length,0),21);
 assert.equal(l.gates.length,8);assert.equal(r.sourceGates.length,9);assert.equal(r.gateMapping.length,9);assert.equal(new Set(r.gateMapping.map(m=>m.source.id)).size,9);
 for(const[id,color,frozen,to]of gates){const src=r.sourceGates.find(g=>g.id===id),m=r.gateMapping.find(m=>m.source.id===id);assert(src&&m);assert.equal(src.color,color);assert.equal(src.frozen,frozen);assert.deepEqual(m.source,src);
  if(!to){assert.equal(m.candidate,null);continue;}const b=l.gates.find(g=>g.color===to);assert(b);assert.deepEqual(m.candidate,b);assert.equal(b.frozen??0,frozen);assert(Object.keys(b).every(k=>['id','color','side','offset','size','frozen','portals'].includes(k)));
 }
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:25,sourceArea:51,candidateBodies:25,candidateArea:48,openingAreaReduction:3,axes:5,shells:1,irregularBodies:2,sourceIce:[4,6,6,14,14,14,18,18],retainedIce:[4,6,6,14,14,18,18],adaptation:'One duplicate red14 mouth removed for eight-color capacity; two remaining duplicate blue/cyan mouths separated into orange/pink; source body identities and paired attributes retained with explicit necessary footprint/color changes.',exactSourceCopy:false};
}

const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyMechanisms93(data,api){
 const {level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const reveals=[],peels=[];
 for(const[i,d]of drags.entries()){
  const before=m.snapshot(),b=before.blocks.find(b=>b.id===d.blockId);act(m,d);const after=m.snapshot(),retained=after.blocks.find(x=>x.id===b.id);
  if(after.cleared>before.cleared&&retained){assert.deepEqual(b.layers,['green','purple']);assert.deepEqual(retained.layers,['purple']);assert.equal(after.cleared,before.cleared+1);const a=before.shutters.find(s=>s.id==='r147-93-c18'),z=after.shutters.find(s=>s.id===a.id);assert.equal(a.count,4);assert.equal(z.count,3);peels.push({step:i+1,blockId:b.id,beforeLayers:b.layers,afterLayers:retained.layers,clearBefore:before.cleared,clearAfter:after.cleared,c18Before:a.count,c18After:z.count,bodyRetained:true});}
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(t=>t.id===s.id).revealed){const original=level.shutters.find(t=>t.id===s.id);assert.equal(after.cleared,original.count);reveals.push({id:s.id,clearEvent:after.cleared,step:i+1});}
 }
 assert.equal(peels.length,1);assert.equal(reveals.length,2);assert(m.snapshot().complete);assert.deepEqual(peels,data.mechanismEvidence.shellEvents);
 const axes=data.mechanismEvidence.axisCases;assert.equal(axes.length,3);assert.equal(new Set(axes.map(c=>c.blockId)).size,3);
 for(const c of axes){const pr=api.replayRevisedRoute(level,c.prefix);assert(pr.valid,pr.error);const copy=structuredClone(level),b=copy.blocks.find(b=>b.id===c.blockId);assert(b?.movementAxis);const axis=b.movementAxis;delete b.movementAxis;
  const relaxed=api.replayRevisedRoute(copy,c.prefix);assert(relaxed.valid,relaxed.error);const actual=JSON.parse(relaxed.finalStateKey);actual.blocks.find(x=>x.id===b.id).movementAxis=axis;assert.deepEqual(actual,JSON.parse(pr.finalStateKey));
  assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);const test=api.replayRevisedRoute(copy,[...c.prefix,c.action]);assert(test.valid,test.error);
 }
 const curtains=data.mechanismEvidence.curtainCases;assert.equal(curtains.length,2);assert.equal(new Set(curtains.map(c=>c.curtainId)).size,2);
 for(const c of curtains){assert.deepEqual(c.prefix,drags.slice(0,c.prefix.length));const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level),s=copy.shutters.find(s=>s.id===c.curtainId);assert(s);assert.equal(s.count,c.originalCount);assert.equal(c.relaxedCount,JSON.parse(original.finalStateKey).cleared);assert(c.relaxedCount>0&&c.relaxedCount<s.count);s.count=c.relaxedCount;assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);const r=api.replayRevisedRoute(copy,[...c.prefix,c.action]);assert(r.valid,r.error);}
 return{reveals,peels,axisSingleFieldCases:3,axisCarriers:5,curtainSingleFieldCases:2,allInventoryCompleted:true,globalAxisOrderClaimed:false};
}
