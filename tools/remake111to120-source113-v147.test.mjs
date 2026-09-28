import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake111to120-v146.mjs';
import {checkSource113} from './remake111to120-source-v147.mjs';
const {api}=await loadApi(),data=JSON.parse(fs.readFileSync('deliverables/remake111-120-v146-20260924/agent111-114/enriched113-1790270052313.json'));
const shapes={SINGLE:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]],T4:[[1,0],[0,1],[1,1],[2,1]]};
// Independent placement-first exact cover: every translation of every original
// whole q0 shape, without colors. Exhaustion here is a geometric impossibility
// result for these fixed regions, not a solvability/difficulty certificate.
function canPack(w,h,kinds){
 const footprints=kinds.map(k=>{const result=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const points=shapes[k].map(([a,b])=>[a+x,b+y]);if(points.every(([a,b])=>a<w&&b<h))result.push(points.reduce((m,[a,b])=>m|(1n<<BigInt(b*w+a)),0n));}return result;});
 const full=(1n<<BigInt(w*h))-1n,memo=new Set();
 function search(mask,used){if(mask===full)return used===(1<<kinds.length)-1;const key=mask+':'+used;if(memo.has(key))return false;
  let choices=null;for(let p=0;p<w*h;p++){const bit=1n<<BigInt(p);if(mask&bit)continue;const options=[];for(let i=0;i<footprints.length;i++)if(!(used&(1<<i)))for(const f of footprints[i])if((f&bit)&&!(f&mask))options.push([i,f]);if(!options.length){memo.add(key);return false;}if(!choices||options.length<choices.length)choices=options;}
  for(const [i,f]of choices)if(search(mask|f,used|(1<<i)))return true;memo.add(key);return false;
 }return search(0n,0);
}
test('113 exact native region and shell-art conflicts independently justify the substitutions',()=>{
 const s=JSON.parse(fs.readFileSync('deliverables/remake111-120-v146-20260924/source113-reviewed.json'));
 assert.equal(canPack(3,3,s.lift.map(b=>b.kind)),false);
 assert.equal(canPack(5,5,[...s.upper.map(b=>b.kind),'SQ2']),false);
 assert(api.auditCandidateBlockArt(data.level).passed);
 for(const [id,shape]of [['lower0','L4'],['lower6','L3']]){const l=structuredClone(data.level);l.blocks.find(b=>b.id==='r147-113-'+id).shape=shapes[shape];assert(!api.auditCandidateBlockArt(l).passed);}
});
test('113 known source properties and stage assignment cannot be silently changed',()=>{
 assert(checkSource113(data.level,api).passed);
 for(const mutate of [l=>delete l.blocks.find(b=>b.frozen).frozen,l=>l.blocks.find(b=>b.layers).layers=['red','yellow'],l=>l.shutters.find(s=>s.skin==='lift').width=2,l=>l.blocks.find(b=>b.id.endsWith('upper2')).shutterId='s113-1']){
  const l=structuredClone(data.level);mutate(l);assert.throws(()=>checkSource113(l,api));
 }
});
