import fs from 'node:fs';
import {loadApi} from '../../../../remake141to150-v173.mjs';
import {digest} from '../../../../revised-preview-validation-v160.mjs';
import {searchSpatial,loadSpatialApi} from './guided-search.mjs';
import {checkNativeStars} from './native-stars.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/assist146',input=process.env.BASE??'deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b/candidate146-evolved-1790477806655-25.json',original=JSON.parse(fs.readFileSync(input)),stamp=Date.now();fs.mkdirSync(OUT,{recursive:true});
const{api:b}=await loadApi(),api={...b,...await loadSpatialApi()},pool=[{level:original.level,rank:18}],seen=new Set(),budget={maxMilliseconds:Number(process.env.SEARCH_MS??700),maxStates:35000,floor:31,normalize:true,weight:100,diagnosticTrace:true};let seed=Number(process.env.SEED??1461731);const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<Number(process.argv[2]??200);n++){
 const parent=pick(pool),level=structuredClone(parent.level),changes=[];
 for(let k=0;k<1+n%3;k++){const block=pick(level.blocks),stage=block.layers&&rnd()<.35?1:0,palette=block.star?['yellow','purple']:['green','purple','yellow','red','blue'],old=block.layers?.[stage]??block.color,color=pick(palette.filter(c=>c!==old&&(!block.layers||c!==block.layers[1-stage])));if(!color)continue;if(block.layers)block.layers[stage]=color;if(!stage)block.color=color;changes.push({id:block.id,stage,from:old,to:color});}
 if(process.env.SWAP){const opening=level.blocks.filter(b=>!b.shutterId),a=pick(opening),key=s=>JSON.stringify(s.toSorted((p,q)=>p[0]-q[0]||p[1]-q[1])),peers=opening.filter(b=>b!==a&&key(b.shape)===key(a.shape));if(peers.length){const z=pick(peers),old=[a.x,a.y];[a.x,a.y]=[z.x,z.y];[z.x,z.y]=old;changes.push({swap:[a.id,z.id]});}}
 if(!process.env.FIX_GATES&&n%5===4){const gs=pick([['green','purple'],['yellow','yellow-star'],['red','blue']]).map(id=>level.gates.find(g=>g.id===id));const a=gs.map(g=>[g.side,g.offset,g.size]);gs.forEach((g,i)=>[g.side,g.offset,g.size]=a[1-i]);changes.push({gateSwap:gs.map(g=>g.id)});}
 const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);let errors;try{api.validateLevel(level);errors=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code));if(errors.length||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const result=searchSpatial(level,api,{...budget,orderSeed:n%26}),row={n,levelSha256:sha,changes,status:result.status,clears:result.maxClearsSeen,U:result.cost??result.partialCost,states:result.discoveredStates,ms:result.elapsedMilliseconds,budget};
 if(result.drags){const replay=api.replayRevisedRoute(level,result.drags);row.valid=replay.valid;row.complete=replay.complete;row.U=replay.nonClearingDrags;if(replay.valid&&replay.complete){let lower;if(row.U>=21&&row.U<=30){lower=checkNativeStars(level,api,{floor:21,maxStates:500000,maxMilliseconds:2000});row.lower={status:lower.status,states:lower.discoveredStates,ms:lower.elapsedMilliseconds,shortcut:lower.relaxedNonClearingDrags};}
 const file=OUT+`/candidate146-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',input,level,drags:result.drags,replay,result,changes,budget,lower,levelSha256:sha},null,2));row.file=file;
 if(row.U>=18){pool.push({level,rank:row.U,file});pool.sort((a,b)=>b.rank-a.rank);pool.length=Math.min(pool.length,8);}if(lower?.thresholdProven){fs.appendFileSync(OUT+`/iterate-${stamp}.jsonl`,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));break;}}}
 fs.appendFileSync(OUT+`/iterate-${stamp}.jsonl`,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
}
