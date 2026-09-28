import fs from 'node:fs';
import {loadApi,readBaseline,PROFILE,auditSpatial,digest,TARGETS} from '../common.mjs';
import {loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {compile,search} from './search.mjs';
const OUT='deliverables/remake161-170-20260927/author168-170';
const failures={};
const{api}=await loadApi(),spatialApi=await loadSpatialApi(),baseline=readBaseline();
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
SHAPES.SQ3=[rect(3,3)];SHAPES.Z4=[api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===5).cells];SHAPES.PLUS5=[api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===12).cells];
const color=x=>x==='lime'?'orange':x;
const save=(name,data)=>{const file=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
function mutate(base,rng){const l=structuredClone(base);for(let n=0;n<1+Math.floor(rng.rand()*3);n++){const b=rng.shuffle([...l.blocks])[0],a=rng.shuffle(l.blocks.filter(a=>a!==b&&JSON.stringify(a.shape)===JSON.stringify(b.shape)))[0];if(!a)continue;const[x,y]=[b.x,b.y];b.x=a.x;b.y=a.y;a.x=x;a.y=y;}
 if(rng.rand()<.3){const a=rng.shuffle(l.gates)[0],b=rng.shuffle(l.gates.filter(b=>b!==a&&a.size===b.size))[0];if(b){const{side,offset}=a;a.side=b.side;a.offset=b.offset;b.side=side;b.offset=offset;}}
 for(const b of l.blocks)for(const c of l.blocks)if(c!==b&&c.color===b.color&&b.shape.some(([x,y])=>c.shape.some(([u,v])=>Math.abs(x+b.x-u-c.x)+Math.abs(y+b.y-v-c.y)===1)))return;return l;}
function make170(rng,seed){const l=structuredClone(baseline.levels[169].level);l.mechanismRules=PROFILE;l.difficulty='normal';
 const src=JSON.parse(fs.readFileSync('deliverables/remake161-170-v146-20260924/source-audit/source170-review.json'));
 const spec=src.openingAndFull.ordinary.flatMap(b=>Array.from({length:b.count},()=>({kind:b.shape,color:color(b.color),...(b.ice?{frozen:b.ice}:{})}))).concat(src.openingAndFull.stars.map(b=>({kind:b.shape,color:color(b.color),star:true})));
 for(const b of spec)if(b.kind==='SINGLE')b.kind='SQ2';const two=rng.shuffle(spec.filter(b=>b.kind==='H2'&&b.color!=='cyan')).slice(0,2);for(const b of two)b.kind='RECT6';
 const fixed=[];for(const[color,kind,star,x,y]of [['yellow','SQ3',false,0,8],['red','V2',true,0,1],['orange','H3',false,3,10],['red','H3',false,5,7],['cyan','H2',false,6,4]]){const j=spec.findIndex(b=>b.color===color&&b.kind===kind&&Boolean(b.star)===star);if(j<0)return;const b=spec.splice(j,1)[0];fixed.push({...b,x,y,shape:SHAPES[b.kind][0]});}
 const occupied=new Set(fixed.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(','))));
 const packed=pack(spec,l.playable.filter(p=>!occupied.has(p.join(','))),rng,12000,true);if(!packed)return;const blocks=[...fixed,...packed];
 for(const b of fixed)for(const c of blocks)if(c!==b&&c.color===b.color&&b.shape.some(([x,y])=>c.shape.some(([u,v])=>Math.abs(x+b.x-u-c.x)+Math.abs(y+b.y-v-c.y)===1)))return;
 l.blocks=blocks.map(({kind,id,...b},i)=>({...b,id:`r103-170-b${i}`}));
 const ports=[['bottom',0,3],['left',1,2],['bottom',3,3],['right',7,3],['right',4,3],['top',1,3],['top',4,3],['right',1,3],['bottom',6,2],['left',3,3],['left',6,3],['left',9,2]];
 const gates=rng.shuffle(src.doors.map((g,i)=>({id:`r103-170-g${i}`,color:color(g.color),...(g.ice?{frozen:g.ice}:{}),...(g.star?{star:true}:{})})));
 for(const[i,[color,star]]of [['yellow',false],['red',true],['orange',false],['red',false],['cyan',false]].entries()){const j=gates.findIndex(g=>g.color===color&&Boolean(g.star)===star);[gates[j],gates[i]]=[gates[i],gates[j]];}
 l.gates=ports.map(([side,offset,size],i)=>({...gates[i],side,offset,size}));
 // Every fixed star destination must fit the source/adapted rigid body.
 for(const b of l.blocks){if(!l.gates.some(g=>g.color===b.color&&(!b.star||g.star)&&g.size>=(['top','bottom'].includes(g.side)?1+Math.max(...b.shape.map(p=>p[0])):1+Math.max(...b.shape.map(p=>p[1])))))return;}
 return l;
}
function make169(rng,seed){const l=structuredClone(baseline.levels[168].level);l.mechanismRules=PROFILE;l.difficulty='easy';const src=JSON.parse(fs.readFileSync('deliverables/remake161-170-v146-20260924/source-audit/source169-review.json'));
 l.shutters=[{id:'r103-169-c2',x:4,y:1,width:3,height:3,count:2},{id:'r103-169-c7',x:0,y:1,width:4,height:5,count:7},{id:'r103-169-c16',x:0,y:6,width:4,height:3,count:16}];
 const group=src.curtains.map((co,i)=>co.pieces.map(b=>({kind:b.shape,color:b.color,...(b.layers?{layers:b.layers}:{}),...(b.ice?{frozen:b.ice}:{}),shutterId:l.shutters[i].id})));
 group[1].find(b=>b.kind==='SINGLE').kind='H2';
 for(const[b,kind]of group[2].map((b,i)=>[b,['SINGLE','SINGLE','L3','L4','SINGLE','H2'][i]]))b.kind=kind;group[2][2].color='green';
 const opening=['H3','H2','RECT6','RECT6','H3','H3','SINGLE','SINGLE'].map((kind,i)=>({color:rng.shuffle(['blue','green'])[0],kind}));
 const coverCells=l.shutters.map(s=>rect(s.width,s.height).map(([x,y])=>[x+s.x,y+s.y])),hidden=new Set(coverCells.flat().map(p=>p.join(','))),openCells=l.playable.filter(p=>!hidden.has(p.join(',')));
 let all=[];for(let i=0;i<3;i++){const b=pack(group[i],coverCells[i],rng,7000,true);if(!b){failures['hidden'+i]=(failures['hidden'+i]??0)+1;return;}all.push(...b);}const op=pack(opening,openCells,rng,7000,true);if(!op){failures.open=(failures.open??0)+1;return;}all.push(...op);
 l.blocks=all.map(({kind,id,...b},i)=>({...b,id:`r103-169-b${i}`}));
 const ports=[['right',6,3],['top',1,3],['left',3,3],['bottom',3,3],['left',6,3],['right',2,3]];
 const gates=rng.shuffle(src.doors.map((g,i)=>({id:`r103-169-g${i}`,color:g.color,...(g.ice?{frozen:g.ice}:{})})));
 // Ordinary blue/green begin from the uncovered lower corridor; later
 // numbered exits remain distributed around the three real hidden batches.
 for(let i=0;i<2;i++){const j=gates.findIndex(g=>g.color===(i?'blue':'green'));[gates[i],gates[j]]=[gates[j],gates[i]];}
 l.gates=ports.map(([side,offset,size],i)=>({...gates[i],side,offset,size}));return l;
}
function make168(rng,seed){const l=structuredClone(baseline.levels[167].level);l.mechanismRules=PROFILE;l.difficulty='super';const src=JSON.parse(fs.readFileSync('deliverables/remake161-170-v146-20260924/source-audit/source168-review.json'));
 l.shutters=[{id:'r103-168-c16',x:0,y:5,width:7,height:4,count:16}];const op=src.opening.pieces.map(([color,kind])=>({color,kind}));for(const b of rng.shuffle(op.filter(b=>b.kind==='SINGLE')).slice(0,3))b.kind='H3';
 const remap={red:'pink',purple:'orange',blue:'cyan',green:'green',yellow:'yellow'},hidden=src.curtain.pieces.map(([color,kind])=>({color:remap[color],kind,shutterId:'r103-168-c16'}));rng.shuffle(hidden.filter(b=>b.kind==='SINGLE'))[0].kind='H2';
 const opening=pack(op,l.playable.filter(p=>p[1]<5),rng,16000,true),h=pack(hidden,rect(7,4).map(([x,y])=>[x,y+5]),rng,16000,true);if(!opening||!h)return;
 l.blocks=[...opening,...h].map(({kind,id,...b},i)=>({...b,id:`r103-168-b${i}`}));
 const specifications=[['blue','top',1,3,0],['yellow','left',1,3,0],['red','right',1,3,2],['purple','top',4,2,5],['pink','right',4,2,21],['orange','right',6,3,20],['cyan','bottom',0,3,19],['green','bottom',3,3,25]];
 l.gates=specifications.map(([color,side,offset,size,frozen],i)=>({id:`r103-168-g${i}`,color,side,offset,size,...(frozen?{frozen}:{})}));return l;
}
const id=Number(process.argv[2]??170),budget=Number(process.argv[3]??180000),start=Date.now(),rng=seededRng(Number(process.env.SEED??17010301)),log=[];let trials=0,packed=0,witnesses=0,best=0;
const mutationBase=process.env.BASE?JSON.parse(fs.readFileSync(process.env.BASE)).level:null;
while(Date.now()-start<budget){trials++;const seed=rng.state(),level=mutationBase?mutate(mutationBase,rng):id===170?make170(rng,seed):id===169?make169(rng,seed):make168(rng,seed);if(!level)continue;packed++;let c;try{c=compile(level,spatialApi);}catch(e){log.push({seed,compile:e.message});continue;}
const lo=id===170?11:id===169?5:21,hi=id===170?15:id===169?10:30;const r=search(c,{maxMilliseconds:700,maxStates:25000,floor:hi+1,weight:1000});log.push({seed,sha:digest(level),status:r.status,U:r.cost,maxClears:r.maxClears,ms:r.ms});if((r.maxClears??c.totalClears)>best){best=r.maxClears??c.totalClears;console.log(JSON.stringify({trials,packed,best,status:r.status}));save('partial'+id,{level,result:r,seed});}
if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(level,r.drags);if(!replay.valid||!replay.complete){log.at(-1).replay=replay;continue;}witnesses++;
if(r.cost<lo)continue;let audit;try{audit=auditSpatial(level,api);}catch(e){log.at(-1).audit=e.message;continue;}
const proof=search(c,{maxMilliseconds:6000,maxStates:200000,floor:lo,prove:true});const data={ruleVersion:'1.103.0',seed,level,levelSha256:digest(level),drags:r.drags,replay,audit,search:r,proof,projection:'No flip doors: v1.5 and v1.4 spatial transitions identical; all original bodies/ice/stars/gates retained; optional contact is lower-bound relaxation, current sweep checked.'};const file=save((proof.thresholdProven?'candidate':'unverified')+id,data);console.log(JSON.stringify({file,U:r.cost,L:proof.status}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({trials,packed,witnesses,best,failures,log:save('attempts'+id,{ruleVersion:'1.103.0',budget,elapsed:Date.now()-start,trials,packed,witnesses,failures,log})}));
