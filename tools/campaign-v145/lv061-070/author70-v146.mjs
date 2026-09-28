import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkFullGeneratorFloor} from './remake61to70-full-generator-floor-v146.mjs';
import {projectGeneratorOpening} from './remake61to70-generator-floor-v146.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {search} from '../../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {pack,SHAPES,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[69];
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author70';fs.mkdirSync(root,{recursive:true});
const seed=Number(process.env.SEED??146070),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],colors=['pink','blue','green','yellow'];
const issues={},failure=k=>{issues[k]=(issues[k]??0)+1;return null;};
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
function construct(){
 const l=structuredClone(base.level);l.difficulty='normal';l.preservedMoveTarget=base.starTargets.moveTarget;l.blocks=[];l.gates=[];l.generators=[];
 const tiles=[{kind:'V2',sourceId:'opening',color:'green'},...Array.from({length:7},(_,i)=>({kind:'V2',sourceId:'fill-'+i,color:'fill-'+i})),...Array.from({length:11},(_,i)=>({kind:'H2',sourceId:'fill-'+(7+i),color:'fill-'+(15+i)}))];
 const packed=pack(tiles,l.playable,rng,2000,false);if(!packed)return failure('pack');
 const adj=packed.map(()=>new Set()),own=new Map();packed.forEach((b,i)=>b.shape.forEach(([x,y])=>own.set([b.x+x,b.y+y].join(','),i)));
 for(const [p,i]of own){const[x,y]=p.split(',').map(Number);for(const q of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const j=own.get(q.join(','));if(j!==undefined&&i!==j)adj[i].add(j);}}
 const order=packed.map((_,i)=>i).sort((a,b)=>adj[b].size-adj[a].size),cs=packed.map(b=>b.sourceId==='opening'?b.color:null);
 function color(n){if(n===order.length)return true;const i=order[n];if(cs[i])return color(n+1);for(const c of rng.shuffle([...colors])){if([...adj[i]].some(j=>cs[j]===c))continue;cs[i]=c;if(color(n+1))return true;}cs[i]=null;return false;}
 if(!color(0))return failure('colors');
 l.blocks=packed.map((b,i)=>({id:'v146-70-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:cs[i]}));
 const gen={id:'v146-70-generator',side:'top',offset:pick([2,3]),rimSpan:3,rimMount:'rim',spawn:null,queueBlockIds:[]};gen.spawn=[gen.offset,0];
 // Source contact sheet 754–781 seconds, independently reviewed before adoption.
 const sequence=[['pink','SINGLE'],['yellow','V2'],['green','SINGLE'],['pink','V2'],['yellow','SINGLE'],['green','V2'],['pink','SINGLE'],['yellow','V2'],['green','SINGLE'],['pink','V2'],['yellow','SINGLE'],['green','V2'],['pink','SINGLE'],['yellow','V2'],['green','SINGLE'],['yellow','SINGLE'],['blue','V2']];
 for(const[k,[color,kind]]of sequence.entries()){const b={id:'v146-70-queue-'+k,x:gen.spawn[0],y:gen.spawn[1],shape:SHAPES[kind][0],color};l.blocks.push(b);gen.queueBlockIds.push(b.id);}
 l.generators=[gen];
 const occupied=new Set(Array.from({length:3},(_,i)=>'top:'+(gen.offset-1+i))),slots=[];
 for(const side of ['left','right','bottom'])for(const size of [2,3])for(let offset=0;offset+size<=(['left','right'].includes(side)?l.height:l.width);offset++){
  const cells=Array.from({length:size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[l.width-1,offset+i]:[offset+i,l.height-1]);
  if(cells.every(p=>l.playable.some(q=>q[0]===p[0]&&q[1]===p[1])))slots.push({side,offset,size});
 }
 for(const [i,color]of rng.shuffle([...colors]).entries()){
  const options=slots.filter(s=>!Array.from({length:s.size},(_,k)=>s.side+':'+(s.offset+k)).some(k=>occupied.has(k))&&l.blocks.filter(b=>b.color===color).every(b=>1+Math.max(...b.shape.map(p=>['left','right'].includes(s.side)?p[1]:p[0]))<=s.size));
  if(!options.length)return failure('gates');const s=pick(options);for(let k=0;k<s.size;k++)occupied.add(s.side+':'+(s.offset+k));l.gates.push({id:'v146-70-gate-'+color,...s,color,...(color==='blue'?{}:{frozen:1})});
 }
 try{api.validateLevel(l);assert(api.auditCandidateBlockArt(l).passed);const h=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(h.length)return failure(h[0].code);}catch(e){return failure(e.message);}
 return l;
}
let attempts=0,valid=0,solved=0;const deadline=Date.now()+Number(process.env.SECONDS??240)*1000,reproduce=Number(process.env.REPRODUCE_ATTEMPT??0);
while(reproduce?attempts<reproduce:Date.now()<deadline){attempts++;const level=construct();if(reproduce){if(attempts===reproduce){assert(level);const actual=digest(level);assert.equal(actual,process.env.EXPECT_LEVEL_SHA256);const out=`${root}/reproduction70-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({seed,attempt:attempts,matched:true,levelSha256:actual,level,constructorPath:'tools/campaign-v145/lv061-070/author70-v146.mjs',constructorSha256:digest(fs.readFileSync('tools/campaign-v145/lv061-070/author70-v146.mjs'))},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,matched:true,actual}));}continue;}if(!level)continue;valid++;
 const result=search(level,{floor:16,maxStates:100000,maxMilliseconds:1200,orderSeed:attempts%level.blocks.length});if(result.status!=='witness'||result.cost<11)continue;
 const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete){failure('replay');continue;}solved++;
 const projection=projectGeneratorOpening(level,api);let proof=checkSymmetryFloor(projection.level,{floor:11,maxStates:300000,maxMilliseconds:3000});
 if(!proof.thresholdProven)proof=checkFullGeneratorFloor(level,api,{floor:11,maxStates:200000,maxMilliseconds:3000});
 const out=`${root}/draft70-${seed}-${attempts}-${Date.now()}.json`;
 fs.writeFileSync(out,JSON.stringify({ruleVersion:'1.46.0',seed,attempt:attempts,level,drags:result.drags,replay,proof,sourceStatus:'pending-exact-queue-and-color-review',formalAdopted:false,levelSha256:digest(level)},null,2));
 console.log(JSON.stringify({out,U:result.cost,proof:proof.status,attempts,valid,solved}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({attempts,valid,solved,issues}));
