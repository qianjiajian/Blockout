import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {search} from './campaign-generator-axis-search-v146.mjs';
import {checkFullGeneratorFloor} from './campaign-generator-axis-floor-v146.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi(),OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59',rng=seededRng(Number(process.env.SEED??5847));
const data=JSON.parse(fs.readFileSync(process.argv[2])),deadline=Date.now()+Number(process.env.SECONDS??180)*1000;
const save=(name,value)=>{const p=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
const counts={attempts:0,valid:0,witness:0,costs:{}};
const seen=new Set(fs.readdirSync(OUT).filter(p=>p.startsWith('candidate58-mutation-')&&p.endsWith('.json')).map(p=>digest(JSON.parse(fs.readFileSync(`${OUT}/${p}`)).level)));
while(Date.now()<deadline){counts.attempts++;const d=structuredClone(data),l=d.level;for(const k of ['search','drags','replay','decisionCases','curtainLocalChoices','freshQuality'])delete d[k];const movable=l.gates.filter(g=>g.color!=='yellow'),slots=rng.shuffle(movable.map(({side,offset,size})=>({side,offset,size})));if(rng.rand()<0.4)movable.forEach((g,i)=>Object.assign(g,slots[i]));
 const q=new Set(l.generators.flatMap(g=>g.queueBlockIds));
 const extras=l.blocks.filter(b=>b.id.includes('-fill')),palette=['red','green','cyan','blue','purple','yellow','pink'];if(rng.rand()<0.8){const b=extras[Math.floor(rng.rand()*extras.length)];b.color=palette[Math.floor(rng.rand()*palette.length)];}d.sourceAdaptation.addedOrdinaryBlocks=structuredClone(extras);
 for(let j=0;j<Math.floor(rng.rand()*4);j++){const b=l.blocks[Math.floor(rng.rand()*l.blocks.length)];if(q.has(b.id)||b.id.endsWith('-o02'))continue;const mates=l.blocks.filter(c=>c.id!==b.id&&!q.has(c.id)&&!c.id.endsWith('-o02')&&digest(c.shape)===digest(b.shape));if(!mates.length)continue;const c=mates[Math.floor(rng.rand()*mates.length)];[b.x,c.x]=[c.x,b.x];[b.y,c.y]=[c.y,b.y];}
 d.sourceAdaptation.addedOrdinaryBlocks=structuredClone(l.blocks.filter(b=>b.id.includes('-fill')));const layoutHash=digest(l);if(seen.has(layoutHash)){counts.duplicate=(counts.duplicate??0)+1;continue;}seen.add(layoutHash);try{if(!auditSpatial(l,api).passed)continue;}catch{continue;}counts.valid++;
 const r=search(l,{floor:16,maxStates:120000,maxMilliseconds:Number(process.env.SEARCH_MS??1000),orderSeed:counts.valid%l.blocks.length,weight:10});if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(l,r.drags);if(!replay.valid||!replay.complete)continue;counts.witness++;counts.costs[r.cost]=(counts.costs[r.cost]??0)+1;
 if(r.cost<11)continue;const shortcut=search(l,{floor:11,maxStates:250000,maxMilliseconds:3000,weight:10});if(shortcut.status==='witness'){counts.shortcut=(counts.shortcut??0)+1;continue;}d.drags=r.drags;d.search=r;d.replay=replay;d.activeRuleVersion=lock.activeVersion;d.sourceReview=`${OUT}/source-review-1790249506526.json`;d.originality.layoutIntent='源库存重排为原创上部起手横带、中部封冰与底部窄区，独立重配出口和等形载体位置。';const candidate=save('candidate58-mutation',d);console.log(JSON.stringify({candidate,upper:r.cost,counts}));const proof=checkFullGeneratorFloor(l,api,{floor:11,maxStates:200000,maxMilliseconds:2000});console.log(JSON.stringify({report:save('proof58-mutation',{candidate,proof}),status:proof.status}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify(counts));
