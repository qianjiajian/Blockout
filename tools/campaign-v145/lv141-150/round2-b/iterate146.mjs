import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source146-150/candidate146-static-1790251937826.json',base=JSON.parse(fs.readFileSync(source));
const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[],seen=new Set();let state=146173;const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<600;n++){
 const level=structuredClone(base.level);const count=1+Math.floor(n/100);for(let k=0;k<count;k++){const block=level.blocks[Math.floor(rnd()*14)],colors=block.star?['purple','yellow']:['purple','yellow','green','red','blue'],color=colors[Math.floor(rnd()*colors.length)];block.color=color;if(block.layers){if(block.layers[1]===color)continue;block.layers[0]=color;}}
 if(n>=100){const i=Math.floor(rnd()*level.gates.length),j=Math.floor(rnd()*level.gates.length),a=level.gates[i],b=level.gates[j],p={side:a.side,offset:a.offset,size:a.size};Object.assign(a,{side:b.side,offset:b.offset,size:b.size});Object.assign(b,p);}
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const h=digest(level);if(seen.has(h))continue;seen.add(h);const r=searchSpatial(level,api,{floor:35,maxMilliseconds:1500,maxStates:60000,normalize:true,weight:100,orderSeed:n%26,diagnosticTrace:true});
 const row={n,status:r.status,clears:r.maxClearsSeen,cost:r.cost??r.partialCost,states:r.discoveredStates,ms:r.elapsedMilliseconds};if(r.drags){const replay=api.replayRevisedRoute(level,r.drags);if(replay.complete&&replay.valid){const file=OUT+`/candidate146-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',source,level,drags:r.drags,replay,levelSha256:h},null,2));row.file=file;}}
 if(r.maxClearsSeen>=18&&!row.file){const file=OUT+`/partial146-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({source,level,result:r,levelSha256:h},null,2));row.file=file;}
 rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/iterate146-${stamp}.json`,JSON.stringify(rows,null,2));if(row.file&&r.cost>=21&&r.cost<=30)break;
}
