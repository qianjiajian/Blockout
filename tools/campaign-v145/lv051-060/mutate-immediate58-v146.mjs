import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {search} from './campaign-generator-axis-search-v146.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59',files=process.argv.slice(2),bases=files.map(p=>JSON.parse(fs.readFileSync(p)));
assert(bases.length>0);const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api,inputs}=await loadApi(),seed=Number(process.env.SEED??583240),rng=seededRng(seed),runId=Date.now();let outputIndex=0;
const save=(name,d)=>{const p=`${dir}/${name}-${runId}-${++outputIndex}.json`;fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const meta=await build({entryPoints:['tools/campaign-v145/lv051-060/mutate-immediate58-v146.mjs'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const paths=[...new Set([...Object.keys(meta.metafile.inputs),...inputs,...files,'docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`,...bases.map(d=>d.sourceReview)])].sort(),bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const input=save('mutation-immediate-inputs58',{createdAt:new Date().toISOString(),seed,ruleVersion:lock.activeVersion,bindings,files});
const seconds=Number(process.env.SECONDS??240),deadline=Date.now()+seconds*1000,seen=new Set(),counts={attempts:0,valid:0,witness:0,tooEasyWitness:0,immediateShortcut:0,unknown:0,proven:0},rows=[];
const minSpan=(l,g)=>Math.max(...l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)).map(b=>{const axis=g.side==='left'||g.side==='right'?1:0,v=b.shape.map(p=>p[axis]);return Math.max(...v)-Math.min(...v)+1;}));
const configs=[];for(const green of [5,6,0,1])for(const pink of [0,1,5,6])if(green!==pink)configs.push({green,pink});
while(Date.now()<deadline){
 const iteration=counts.attempts++,base=bases[iteration%bases.length],d=structuredClone(base),l=d.level;
 for(const k of ['search','drags','replay','decisionCases','curtainLocalChoices','iceLocalChoices','freshQuality'])delete d[k];
 const originals=structuredClone(l.gates);for(const g of l.gates)g.size=minSpan(l,g);
 if(iteration<configs.length){for(const g of l.gates)if(['green','pink'].includes(g.color))g.offset=configs[iteration][g.color];}
 else{
  const movable=l.gates.filter(g=>g.color!=='yellow'),slots=rng.shuffle(movable.map(({side,offset})=>({side,offset})));if(rng.rand()<0.6)movable.forEach((g,i)=>{Object.assign(g,slots[i]);g.size=minSpan(l,g);});
  const queued=new Set(l.generators.flatMap(g=>g.queueBlockIds)),extras=l.blocks.filter(b=>b.id.includes('-fill'));
  if(rng.rand()<0.65){const b=extras[Math.floor(rng.rand()*extras.length)],colors=['red','green','blue','cyan','pink','yellow','purple'];b.color=colors[Math.floor(rng.rand()*colors.length)];if(b.layers)b.layers=[b.color];}
  for(let j=0;j<1+Math.floor(rng.rand()*3);j++){const b=l.blocks[Math.floor(rng.rand()*l.blocks.length)];if(queued.has(b.id)||b.id.endsWith('-o02'))continue;const mates=l.blocks.filter(c=>c.id!==b.id&&!queued.has(c.id)&&!c.id.endsWith('-o02')&&digest(c.shape)===digest(b.shape));if(mates.length){const c=mates[Math.floor(rng.rand()*mates.length)];[b.x,c.x]=[c.x,b.x];[b.y,c.y]=[c.y,b.y];}}
  for(const g of l.gates)g.size=minSpan(l,g);
 }
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
 // Source carriers retain every property except opening position. Only added
 // ordinary fillers may change color; queued carriers and order remain exact.
 for(const b of l.blocks.filter(b=>!b.id.includes('-fill'))){const old=base.level.blocks.find(a=>a.id===b.id),strip=({x,y,...r})=>r;assert.deepEqual(strip(b),strip(old));}
 assert.deepEqual(l.generators,base.level.generators);for(const g of l.gates){const old=base.level.gates.find(a=>a.id===g.id),strip=({side,offset,size,...r})=>r;assert.deepEqual(strip(g),strip(old));}
 try{if(!auditSpatial(l,api).passed)continue;}catch{continue;}counts.valid++;
 const r=search(l,{floor:16,maxStates:160000,maxMilliseconds:Math.max(1,Math.min(1800,deadline-Date.now())),weight:10,orderSeed:iteration%l.blocks.length});
 if(r.status!=='witness'){rows.push({iteration,levelSha256:hash,stage:'upper-search',status:r.status});continue;}
 const replay=api.replayRevisedRoute(l,r.drags);assert(replay.valid&&replay.complete);counts.witness++;
 if(replay.nonClearingDrags<11){counts.tooEasyWitness++;rows.push({iteration,levelSha256:hash,stage:'upper-search',status:'real-shortcut',cost:replay.nonClearingDrags});continue;}
 d.drags=r.drags;d.replay=replay;d.search=r;d.activeRuleVersion=lock.activeVersion;d.construction={tool:'mutate-immediate58-v146.mjs',input,baseCandidate:files[iteration%bases.length],seed,iteration};
 d.sourceAdaptation.addedOrdinaryBlocks=structuredClone(l.blocks.filter(b=>b.id.includes('-fill')));d.sourceAdaptation.gateDesign=originals.map(g=>({id:g.id,before:{side:g.side,offset:g.offset,size:g.size},after:structuredClone(l.gates.find(a=>a.id===g.id)),reason:'原创门位与完整同色横截面所需最小合法宽度；颜色/机制初值保持。'}));
 d.originality.layoutIntent='保全部源载体属性和队列，采用最小完整截面门宽，重排等形块及必要普通补块，改变机关释放通路。';
 const candidate=save('candidate58-immediate-mutation',d),projection=projectImmediateRoute(l,r.drags,api);
 const proof=checkImmediateGeneratorFloor(l,api,{floor:11,maxStates:220000,maxMilliseconds:Math.max(1,Math.min(15000,deadline-Date.now()))}),shortcutReplay=proof.relaxedRoute?api.replayRevisedRoute(l,proof.relaxedRoute):null;
 const proofFile=save('proof58-immediate-mutation',{createdAt:new Date().toISOString(),candidate,levelSha256:hash,input,projection,proof,shortcutReplay,pointerValidated:false,formalAdopted:false});
 if(shortcutReplay?.valid&&shortcutReplay.complete&&shortcutReplay.nonClearingDrags<11)counts.immediateShortcut++;else if(proof.thresholdProven)counts.proven++;else counts.unknown++;
 const row={iteration,candidate,proofFile,upper:replay.nonClearingDrags,status:proof.status,realShortcut:shortcutReplay?.valid&&shortcutReplay.complete?shortcutReplay.nonClearingDrags:null};rows.push(row);console.log(JSON.stringify(row));if(proof.thresholdProven)break;
}
const summary=save('mutation-immediate-summary58',{finishedAt:new Date().toISOString(),input,seed,budgetSeconds:seconds,counts,rows,fullBatchValidated:false,formalAdopted:false});console.log(JSON.stringify({summary,counts}));
