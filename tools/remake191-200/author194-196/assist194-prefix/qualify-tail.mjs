import fs from 'node:fs';import assert from 'node:assert/strict';
import {payload,native} from '../floor-countdown.mjs';
import {each,clearCount} from '../../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
import {normalize} from '../../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {loadApi} from '../../replay.mjs';import {ruleGate,digest,writeNew} from '../../common.mjs';
ruleGate();const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),tail=d.tailProjection.level,{c,p}=payload(tail,{floor:3,maxMilliseconds:1800,maxStates:100000}),used=JSON.parse(fs.readFileSync(d.tailProof.input));
assert.equal(p.goalClears,15);assert.equal(p.initial.length,13);assert.deepEqual(p.initial,used.initial);assert.deepEqual(p.covers,[]);assert.deepEqual(used.queues,[]);
assert.deepEqual(p.blocks,used.blocks.map(({spawn,...b})=>b));
const groups=used.groups;for(const g of groups){const sig=i=>JSON.stringify({shape:c.blocks[i].shape,layers:c.blocks[i].layers,reveal:c.blocks[i].reveal,ice:c.blocks[i].ice,axis:c.blocks[i].movementAxis});assert(g.every(i=>sig(i)===sig(g[0])));}p.groups=groups;
const key=s=>JSON.stringify([...s]),text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b.toString('base64');},canon=s=>{s=s.slice();for(const g of groups){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=v[j]);}return s;};
const states=[c.initial],seen=new Set([key(c.initial)]);for(let i=0;i<states.length&&states.length<40;i++)each(c,states[i],(bi,v)=>{const s=states[i].slice();s[bi]=v;const k=key(s);if(!seen.has(k)){states.push(s);seen.add(k);}if(states.length>=40)return false;});
const {api}=await loadApi(),m=new api.PuzzleModel(tail);m.startCountdown();const ids=new Set(tail.blocks.map(b=>b.id)),tailDrags=d.drags.filter(x=>ids.has(x.blockId));let closures=0,actualEdges=0;
for(let step=0;step<=tailDrags.length;step++){
 const s=Uint16Array.from(c.blocks.map(b=>{const a=m.getBlock(b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):511;}));if(!seen.has(key(s))){states.push(s);seen.add(key(s));}
 const edges=new Set();each(c,s,(i,v,k)=>edges.add(i+':'+v+':'+k));
 for(let i=0;i<c.blocks.length;i++){const b=m.getBlock(c.blocks[i].id);if(!b||!m.isBlockActive(b))continue;closures++;const stage=s[i]>>>7,poses=[[b.x,b.y]],visited=new Set([b.x+','+b.y]);
  for(let j=0;j<poses.length;j++){const[x,y]=poses[j],probe=m.clone(),moving=probe.getBlock(b.id);moving.x=x;moving.y=y;const pos=y*c.W+x;
   if(pos!==(s[i]&127)){assert(edges.has(i+':'+(pos|(stage<<7))+':1'));actualEdges++;}
   for(const side of ['top','right','bottom','left'])if(probe.exitAttemptStatus(b.id,side)==='ok'){assert(edges.has(i+':'+(stage+1<c.blocks[i].layers.length?pos|((stage+1)<<7):511)+':0'));actualEdges++;}
   for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(!visited.has(k)&&probe.canPlace(moving,xx,yy)){visited.add(k);poses.push([xx,yy]);}}
  }
 }
 if(step<tailDrags.length){const a=tailDrags[step];m.beginAction();for(const xy of a.path)assert(m.moveBlockStep(a.blockId,...xy));if(a.exitSide)assert(m.tryExit(a.blockId,a.exitSide).ok);assert(m.commitAction());}
}
assert(m.snapshot().complete);
const qualification=native({...p,successorsOnly:true,states:states.map(s=>[...s])});let edges=0;for(let i=0;i<states.length;i++){const s=states[i],expected=new Set();if(clearCount(c,s)<15)each(c,s,(bi,v,cost)=>{const next=s.slice();next[bi]=v;expected.add(cost+':'+text(canon(normalize(c,next,15).s)));});assert.deepEqual([...qualification.rows[i].successors].sort(),[...expected].sort());assert.equal(qualification.rows[i].normalized,text(normalize(c,s,15).s));assert.equal(qualification.rows[i].canonical,text(canon(normalize(c,s,15).s)));edges+=expected.size;}
const proof=native(p);
const out='deliverables/remake191-200-20260927/author194-196/assist194-prefix/tail-qualification-'+Date.now()+'.json';writeNew(out,{status:proof.thresholdProven?'TAIL_L3_QUALIFIED_AND_FRESH_OLD_NATIVE_PASS':'TAIL_QUALIFIED_BOUND_UNKNOWN',candidate:file,levelSha256:digest(d.level),tailSha256:digest(tail),states:states.length,edges,actualClosures:closures,actualEdges,proof,qualification,tailDrags,argument:'Independent axis128 compiler matches all poses/neighbors/exits of the author payload with no queues. JS optional contact graph, final-clear normalization and exact identity signatures match older qualified native-prefix on early and every route state. Actual PuzzleModel held closures are included. Fresh older native full15 goal excludes0–2; no FIFO engine or ZeroFinish is required for this certificate.',sourceHashes:Object.fromEntries(['tools/remake191-200/author194-196/assist194-prefix/qualify-tail.mjs','tools/remake191-200/author194-196/floor-countdown.mjs','tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs'].map(p=>[p,digest(fs.readFileSync(p))])),newLevelSearch:false});console.log(JSON.stringify({out,states:states.length,edges,closures,actualEdges,proof}));
