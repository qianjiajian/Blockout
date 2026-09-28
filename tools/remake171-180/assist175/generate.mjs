import fs from 'node:fs';
import {api,original,audit,digest} from '../author175-177/common.mjs';
import {compile,search} from '../../remake161-170/author168-170/search.mjs';
import {loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
import {freshFloor} from './native.mjs'; const save=(n,d)=>{const f='deliverables/remake171-180-20260927/assist175/'+n+'-'+Date.now()+'.json';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return f;};
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const spatial=await loadSpatialApi(),rng=seededRng(Number(process.env.SEED??9175106));
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
SHAPES.SQ3=[rect(3,3)];
const pick=a=>a[Math.floor(rng.rand()*a.length)],colors=['red','blue','green','yellow','purple','orange','pink','cyan'],ice={cyan:0,green:1,red:2,orange:2,pink:4,purple:10,yellow:10,blue:10};
const opening=[['cyan','L4'],['yellow','SQ2','pink'],['cyan','RECT6'],['orange','SQ2'],['cyan','V3'],['red','V3'],['green','V3'],['pink','H2'],['cyan','RECT6'],['red','SQ3'],['orange','V2'],['green','SQ2','blue'],['purple','SQ2']];
const hidden=[['red','H2','yellow'],['blue','H2'],['green','SQ2'],['pink','SQ2','cyan'],['yellow','H3','red'],['blue','L3'],['cyan','V2'],['green','T4']];
const base=original.levels[174].level,failures={},fail=k=>(failures[k]=(failures[k]??0)+1,null);
const covers=[];for(const[w,h]of[[4,6],[6,4],[8,3],[3,8]])for(let y=0;y+h<=base.height;y++)for(let x=0;x+w<=base.width;x++)if(rect(w,h).every(([a,b])=>base.playable.some(p=>p[0]===a+x&&p[1]===b+y)))covers.push({x,y,width:w,height:h});
function recolor(bs){const todo=rng.shuffle([...bs]);for(const b of todo){if(b.layers)continue;const palette=b.sourceId.startsWith('open')?['cyan','green','red','orange']:colors.slice(0);const opts=rng.shuffle([...palette]);const c=opts.find(color=>!bs.some(a=>a!==b&&a.color===color&&a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1))));if(c)b.color=c;}return bs;}
function make(){const l=structuredClone(base);l.mechanismRules='revised-2026-09-27-v1.5';l.difficulty='hard';const co={id:'r106-175-curtain',...pick(covers),count:10};l.shutters=[co];const hc=rect(co.width,co.height).map(([x,y])=>[x+co.x,y+co.y]),covered=new Set(hc.map(p=>p.join(','))),oc=l.playable.filter(p=>!covered.has(p.join(',')));
const spec=(rows,part)=>rows.map(([color,kind,inner],i)=>({color,kind,sourceId:part+'-'+i,...(inner?{layers:[color,inner]}:{})}));
const op=pack(spec(opening,'open'),oc,rng,3000,false),hi=pack(spec(hidden,'hidden'),hc,rng,3000,false);if(!op||!hi)return fail(!op?'open-pack':'hidden-pack');
for(const bs of [op,hi])recolor(bs);l.blocks=[...op,...hi].map(({kind,id,sourceId,...b})=>({...b,id:'r106-175-'+sourceId,...(sourceId.startsWith('hidden')?{shutterId:co.id}:{})}));
const allowed=new Set(l.playable.map(p=>p.join(','))),slots=[];for(const side of ['top','right','bottom','left'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?l.width:l.height);offset++){const ps=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,l.height-1]:side==='left'?[0,offset+i]:[l.width-1,offset+i]);if(ps.every(p=>allowed.has(p.join(','))))slots.push({side,size,offset});}
const occupied=new Set();l.gates=[];for(const color of ['cyan',...rng.shuffle(colors.filter(c=>c!=='cyan'))]){let opts=slots.filter(g=>l.blocks.filter(b=>(b.layers??[b.color]).includes(color)).every(b=>Math.max(...b.shape.map(p=>['top','bottom'].includes(g.side)?p[0]:p[1]))<g.size)&&!Array.from({length:g.size},(_,i)=>g.side+':'+(g.offset+i)).some(p=>occupied.has(p)));
if(color==='cyan')opts=opts.filter(g=>op.some(b=>b.color==='cyan'&&b.shape.every(([dx,dy])=>['top','bottom'].includes(g.side)?b.x+dx>=g.offset&&b.x+dx<g.offset+g.size:b.y+dy>=g.offset&&b.y+dy<g.offset+g.size)&&b.shape.some(([dx,dy])=>g.side==='top'?b.y+dy===0:g.side==='bottom'?b.y+dy===l.height-1:g.side==='left'?b.x+dx===0:b.x+dx===l.width-1)));
if(!opts.length)return fail('gate');const g=pick(opts);l.gates.push({id:'r106-175-g-'+color,color,...g,...(ice[color]?{frozen:ice[color]}:{})});for(let t=g.offset;t<g.offset+g.size;t++)occupied.add(g.side+':'+t);}
try{audit(l);}catch(e){return fail(e.message.slice(0,140));}return l;}
const started=Date.now(),budget=Number(process.argv[2]??180000),log=[];let attempts=0,valid=0,witnesses=0;
while(Date.now()-started<budget){attempts++;if(attempts%100===0)console.log(JSON.stringify({attempts,valid,witnesses,failures}));const level=make();if(!level)continue;valid++;const result=search(compile(level,spatial),{maxMilliseconds:700,maxStates:30000,floor:21});log.push({levelSha256:digest(level),status:result.status,U:result.cost,ms:result.ms});if(result.status!=='witness')continue;const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete){log.at(-1).replay=replay;continue;}witnesses++;if(result.cost<16)continue;const proof=freshFloor(level,api,{floor:16,maxMilliseconds:2500,maxStates:160000});const data={ruleVersion:'1.106.0',level,drags:result.drags,levelSha256:digest(level),routeSha256:digest(result.drags),replay,search:result,proof,source:'deliverables/remake171-180-v146-20260924/design175/source-review.json',design:'New root family: thirteen larger ordinary/native bodies preserve source shell carriers. Source 13 opening + 8 hidden bodies and 5 shells preserved; six V2 to V3, one V2 to SQ2, two SQ2 to RECT6, L3 to L4 and H2 to H3 fill baseline +14 cells with original 21-body inventory, shell L3 becomes H3 for q0; ordinary outer colors redesigned per v1.106. Curtain 10 and seven frozen exits retained.'};const file=save((proof.thresholdProven?'candidate175':'unverified175'),data);console.log(JSON.stringify({file,U:result.cost,proof:proof.status,states:proof.discoveredStates}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({attempts,valid,witnesses,failures,log:save('attempts175',{budget,elapsed:Date.now()-started,attempts,valid,witnesses,failures,log})}));





