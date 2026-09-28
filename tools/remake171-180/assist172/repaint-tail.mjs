import fs from 'node:fs';
import {loadApi,replay} from '../replay.mjs';
import {auditSpatial,digest,writeNew} from '../common.mjs';
import {witnessNative} from './native-witness.mjs';
import {prove} from './prefix-quotient.mjs';
const OUT='deliverables/remake171-180-20260927/assist172',file='deliverables/remake171-180-20260927/author178-180/assist172/prefix16-refined172-1790529794796.json';
const d=JSON.parse(fs.readFileSync(file)),prefix=d.partialDrags,{api:raw}=await loadApi();
const api={...raw,replayRevisedRoute:(l,r)=>replay(l,r,raw,{complete:true,requirePointerCompatible:true})};
let seed=1720628;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
const choose=(a,weight)=>{const list=a.flatMap(x=>Array(weight(x)).fill(x));return list[Math.floor(random()*list.length)];};
const fixedPink=new Set(d.level.blocks.filter(b=>!b.shutterId&&b.color==='pink').map(b=>b.id));
const neighbors=new Map(d.level.blocks.map(b=>[b.id,new Set()])),cells=new Map();
for(const b of d.level.blocks)for(const[x,y]of b.shape)cells.set(`${b.shutterId??'o'}:${b.x+x},${b.y+y}`,b.id);
for(const b of d.level.blocks)for(const[x,y]of b.shape)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const id=cells.get(`${b.shutterId??'o'}:${b.x+x+dx},${b.y+y+dy}`);if(id&&id!==b.id)neighbors.get(b.id).add(id);}
function eligible(b,g){const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1])),vertical=['top','bottom'].includes(g.side);if((vertical?w:h)>g.size)return false;if(!b.movementAxis)return true;return (b.movementAxis==='vertical')===vertical&&(vertical?b.x:b.y)>=g.offset&&(vertical?b.x+w:b.y+h)<=g.offset+g.size;}
function repaint(l){const done=new Map();for(const b of l.blocks)if(fixedPink.has(b.id))done.set(b.id,'pink');
 const order=shuffle(l.blocks.filter(b=>!fixedPink.has(b.id))).sort((a,b)=>Number(!!b.movementAxis)-Number(!!a.movementAxis)||Number(!!a.shutterId)-Number(!!b.shutterId));
 for(const b of order){const taken=[...neighbors.get(b.id)].map(id=>done.get(id));const opts=l.gates.filter(g=>eligible(b,g)&&!taken.includes(g.color)&&(b.shutterId||g.color!=='pink'));
  if(!opts.length)return false;const g=choose(opts,g=>g.color==='blue'?9:g.color==='yellow'?3:1);b.color=g.color;done.set(b.id,g.color);if(b.layers)b.layers[0]=g.color;
 }
 for(const b of l.blocks.filter(b=>b.layers)){const opts=l.gates.filter(g=>eligible(b,g)&&g.color!==b.color);if(!opts.length)return false;b.layers[1]=choose(opts,g=>g.color==='blue'?7:g.color==='pink'?4:1).color;}
 return l.gates.every(g=>l.blocks.some(b=>(b.layers??[b.color]).includes(g.color)));
}
function tailLevel(l,final){const t=structuredClone(l);t.blocks=final.blocks.map(b=>{const x=structuredClone(b);if(!x.frozen)delete x.frozen;return x;});t.gates=t.gates.map(g=>{const x={...g};if(g.frozen>3)x.frozen=g.frozen-3;else delete x.frozen;return x;});t.shutters=t.shutters.map(s=>({...s,count:s.count-3}));return t;}
const started=Date.now(),budget=120000,rows=[],seen=new Set();let accepted,maxClears=0;
for(let attempt=0;Date.now()-started<budget;attempt++){
 const l=structuredClone(d.level),blue=l.gates.find(g=>g.color==='blue'),green=l.gates.find(g=>g.color==='green');
 const p={side:blue.side,offset:blue.offset,size:blue.size};Object.assign(blue,{side:green.side,offset:green.offset,size:green.size});Object.assign(green,p);
 if(!repaint(l))continue;const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
 try{const audit=auditSpatial(l,raw),pr=replay(l,prefix,raw,{requirePointerCompatible:true});if(pr.clearEvents!==3||pr.nonClearingDrags!==17)throw Error('Prefix preservation');
  const tail=tailLevel(l,pr.final),s=witnessNative(tail,api,{floor:4,maxMilliseconds:900,maxStates:100000});
  rows.push({attempt,hash,status:s.status,clears:s.maxClearsSeen,input:s.input,output:s.output});
  if((s.maxClearsSeen??0)>maxClears){maxClears=s.maxClearsSeen;const partial=OUT+'/tail-progress-'+Date.now()+'.json';writeNew(partial,{level:l,prefix,tail,search:s,parent:file});console.log(JSON.stringify({partial,maxClears}));}
  if(s.status!=='witness')continue;const drags=[...prefix,...s.drags],rr=replay(l,drags,raw,{complete:true,requirePointerCompatible:true});
  const proof=prove(l,raw,{goalClears:3,floor:16,maxMilliseconds:3500,maxStates:300000});
  const out=OUT+'/tail-candidate-'+Date.now()+'.json';writeNew(out,{level:l,drags,mapping:d.mapping,parent:file,sourceParentSha256:digest(fs.readFileSync(file)),audit,route:rr,search:s,proof,actualGoal:3,correctedProjection:'Stop on first3 events. Every grouped future outer gate is frozen>=3;11 hidden bodies stay behind the real count13 cover. Original inherited prose saying13 is not the actual goal.',designChanges:'All shapes,positions,axes,shell bindings,pink outer identities and curtain inventory preserved; blue3/green14 gate positions exchanged and all eligible nonpink colors/inner colors regenerated.',status:proof.thresholdProven?'BOUNDS_PASS':'UNVERIFIED'});
  console.log(JSON.stringify({out,U:rr.nonClearingDrags,proof:proof.status}));if(proof.thresholdProven){accepted=out;break;}
 }catch(e){rows.push({attempt,hash,error:e.message});}
}
const out=OUT+'/tail-attempts-'+Date.now()+'.json';writeNew(out,{budget,elapsed:Date.now()-started,parent:file,generated:seen.size,rows,maxClears,accepted});console.log(JSON.stringify({out,accepted,maxClears}));
