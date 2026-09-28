import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pack,color,rngFor,shapes} from '../round3-c/author.mjs';
import {loadApi,auditDraft,baseline} from '../../../remake121to130-v172.mjs';
import {search} from './search-generator129.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const OUT='deliverables/campaign121-130-v146-20260924/round3-root';fs.mkdirSync(OUT,{recursive:true});
const save=(n,d)=>{const p=`${OUT}/${n}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const {api}=await loadApi(),old=baseline().levels[128];shapes.V3=[[0,0],[0,1],[0,2]];
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
const frames=['0579','0646','0654','0693','0695','0697','0699','0701','0703','0704','0740'].map(n=>`.codex-temp/video-audit-101-134/121-130/frames-1fps/sec-${n}.jpg`);
const sourceFile=save('source129-full-video',{bindings:Object.fromEntries(frames.map(p=>[p,digest(fs.readFileSync(p))])),
 facts:{opening:{bodies:13,area:28,ice:[10],shells:[['cyan','purple']]},cover7:{bodies:8,area:24,shapes:['H3','L3-shell','L3-shell','H2','L3','SQ','L3','H3'],shells:[['blue','yellow'],['red','blue']]},cover23:{bodies:9,area:21,shapes:['V2','S','PLUS5-shell','S','L3','L3','H2','S','V3'],shells:[['green','red']]},generators:[{count:4,knownFirstShape:'L3',laterInventory:'unrevealed before source timeout; authored'}, {count:5,queue:[['green','SQ'],['purple','L3'],['cyan','S'],['pink','SQ'],['purple','H2']]}],gates:[['purple',0],['pink',0],['green',0],['cyan',0],['blue',0],['red',2],['yellow',4]]},
 corrections:['Full video reveals three additional shells in hidden batches; total4. Ice overlay masks purple V3; no shell observed on that carrier.','Lower generator has heterogeneous5cargo, not five monochrome squares. Upper4cargo stays queued through timeout; icon establishes firstL3 only.','Known hidden21+24 plus opening28 cannot fit preserved47cell board. Native-art and capacity adaptations preserve every13+8+9 body, all4shells, ice10 and both queues.']});
function make(seed){
 const rng=rngFor(seed),l=structuredClone(old.level);for(const k of ['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];l.difficulty='normal';l.preservedMoveTarget=old.starTargets.moveTarget;
 l.shutters=[{id:'r172-129-c23',x:1,y:0,width:5,height:3,count:23},{id:'r172-129-c7',x:0,y:3,width:3,height:4,count:7}];
 const hidden=new Set(l.shutters.flatMap(s=>rect(s.x,s.y,s.width,s.height)).map(p=>p.join(','))),opening=l.playable.filter(p=>!hidden.has(p.join(',')));
 const o=pack(opening,['L',...Array(3).fill('H2'),'V3',...Array(8).fill('S')],rng,'r172-129-o');
 const h7=pack(rect(0,3,3,4),['H3','H3',...Array(6).fill('S')],rng,'r172-129-h7');
 const h23=pack(rect(1,0,5,3),['SQ','L','H2',...Array(6).fill('S')],rng,'r172-129-h23');if(!o||!h7||!h23)return null;
 const g=(c,side,offset,size,frozen)=>({id:'r172-129-g-'+c,color:c,side,offset,size,...(frozen?{frozen}:{})});
 l.gates=[g('purple','top',1,2),g('pink','left',1,2),g('yellow','left',3,2,4),g('green','left',5,2),g('cyan','right',1,3),g('blue','right',4,3),g('red','bottom',0,3,2)];
 const palette=['purple','pink','green','cyan','blue','red','yellow'];
 for(const group of[o,h7,h23])if(!color(group,b=>palette.filter(c=>{const gate=l.gates.find(g=>g.color===c);return Math.max(...b.shape.map(p=>['top','bottom'].includes(gate.side)?p[0]:p[1]))<gate.size;}),rng,group===o?{blue:20,cyan:20,pink:1,purple:1,red:1,yellow:1,green:1}:{}))return null;
 o.find(b=>b.shape===undefined);const ice=o.find(b=>b.shape.length===3&&b.shape.every(p=>p[0]===0));ice.frozen=10;
 const shell=o.find(b=>b.shape.length===2);if(shell.color!=='cyan')return null;shell.layers=['cyan','purple'];
 h7.filter(b=>b.shape.length===3).forEach((b,i)=>{b.color=i?'red':'blue';b.layers=i?['red','blue']:['blue','yellow'];});
 const plus=h23.find(b=>b.shape.length===4);plus.color='green';plus.layers=['green','red'];
 h7.forEach(b=>b.shutterId=l.shutters[1].id);h23.forEach(b=>b.shutterId=l.shutters[0].id);l.blocks=[...o,...h7,...h23];
 l.generators=[{id:'r172-129-gen4',side:'top',offset:4,rimSpan:3,rimMount:'rim',spawn:[4,0],queueBlockIds:[]},{id:'r172-129-gen5',side:'bottom',offset:4,rimSpan:3,rimMount:'rim',spawn:[4,5],queueBlockIds:[]}];
 const queues=[[['green','L'],['blue','L'],['pink','L'],['green','L']],[['blue','SQ'],['cyan','L'],['blue','V2'],['cyan','SQ'],['blue','V2']]];
 for(let j=0;j<2;j++)for(let i=0;i<queues[j].length;i++){const [c,s]=queues[j][i],g=l.generators[j],b={id:`r172-129-q${j}-${i}`,x:g.spawn[0],y:g.spawn[1],shape:structuredClone(shapes[s]),color:c};g.queueBlockIds.push(b.id);l.blocks.push(b);}
 return l;
}
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??150),ms=Number(process.argv[4]??900),attempts=[];
for(let n=start;n<start+count;n++){const seed=172129000+n,l=make(seed);if(!l){attempts.push({seed,status:'packing'});continue;}let a;try{a=auditDraft({level:l},api);}catch(e){attempts.push({seed,status:'audit',error:e.message.slice(0,200)});continue;}
 const s=search(l,{maxStates:90000,maxMilliseconds:ms,floor:16,orderSeed:n%l.blocks.length}),row={seed,status:s.status,cost:s.cost,stop:s.stop,hash:digest(l),budget:ms,states:s.states,clears:s.maxClearsSeen,total:s.totalClears};attempts.push(row);
 if(s.maxClearsSeen>=7)save('partial129',{seed,sourceFile,level:l,result:s});
 if(s.status==='witness'){const r=api.replayRevisedRoute(l,s.drags);row.replay=r;if(r.valid&&r.complete){const p=save('candidate129-fullsource',{seed,sourceFile,level:l,levelSha256:digest(l),audit:a,drags:s.drags,replay:r,search:s,adaptations:['Preserve all known carriers:13opening,8cover7,9cover23; original73visible/hidden occupiedcells fit to47 baseline using native shape adaptations.','Missing native irregular shell artwork: two lowerL3 shells become H3, upperPLUS shell becomesSQ2. Known ordinary shapes reduced to fit15/12cell hidden regions.','Opening iceV3 count10 retained; outer/inner shell colors and all source gate thresholds retained. Lower heterogeneousqueue5 observed; upper firstL3 and three authorednativeL3 retain4 inventory.'],formalAdopted:false});console.log(JSON.stringify({file:p,U:r.nonClearingDrags}));if(r.nonClearingDrags>=11)break;}}
 if(n%10===0)console.log(JSON.stringify(row));
}
console.log(JSON.stringify({file:save('attempts129-fullsource',{sourceFile,start,count,ms,attempts})}));
