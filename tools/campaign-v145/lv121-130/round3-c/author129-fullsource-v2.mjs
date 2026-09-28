import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pack,color,rngFor,shapes,shuffle,cells} from './author.mjs';
import {loadIsolatedApi} from './isolated-api.mjs';
import {auditDraft,baseline,mechanismInventory,ruleGate} from '../../../remake121to130-v172.mjs';
import {search} from '../round3-root/search-generator129.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
const OUT='deliverables/campaign121-130-v146-20260924/round3-c';
const api=await loadIsolatedApi(),old=baseline().levels[128],lock=ruleGate();
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
const sourceDir='deliverables/campaign121-130-v146-20260924/round3-root';
const sourceFile=sourceDir+'/'+fs.readdirSync(sourceDir).filter(n=>n.startsWith('source129-full-video-')).sort().at(-1);
const source=JSON.parse(fs.readFileSync(sourceFile));
const save=(name,data)=>{const file=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
const layouts=[
 [[0,4,4,3],[1,0,4,3]],
 [[0,3,3,4],[1,0,4,3]],
 [[0,3,4,3],[2,0,4,3]],
 [[1,3,4,3],[1,0,4,3]],
 [[0,4,6,2],[1,0,4,3]],
];
export function make(seed){
 const rng=rngFor(seed),l=structuredClone(old.level),variant=seed%layouts.length;
 for(const k of ['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];
 l.difficulty='normal';l.preservedMoveTarget=old.starTargets.moveTarget;
 const [a,b]=layouts[variant];l.shutters=[{id:'r172v2-129-c23',x:a[0],y:a[1],width:a[2],height:a[3],count:23},{id:'r172v2-129-c7',x:b[0],y:b[1],width:b[2],height:b[3],count:7}];
 const hidden=new Set(l.shutters.flatMap(s=>rect(s.x,s.y,s.width,s.height)).map(p=>p.join(','))),opening=l.playable.filter(p=>!hidden.has(p.join(',')));
 const doubles=Array.from({length:10},()=>rng()<.55?'H2':'V2');
 const o=pack(opening,[...doubles,...Array(3).fill('S')],rng,'r172v2-129-o');
 const h7=pack(rect(...b),['H3','H3',...Array(6).fill('S')],rng,'r172v2-129-h7');
 const h23=pack(rect(...a),['SQ',...Array(8).fill('S')],rng,'r172v2-129-h23');
 if(!o||!h7||!h23)return null;
 const gate=(c,side,offset,size,frozen)=>({id:'r172v2-129-g-'+c,color:c,side,offset,size,...(frozen?{frozen}:{})});
 l.gates=[gate('purple','top',1,2),gate('pink','left',1,2),gate('yellow','left',3,2,4),gate('green','left',5,2),gate('cyan','right',1,3),gate('blue','right',4,3),gate('red','bottom',0,3,2)];
 const ice=shuffle(o.filter(b=>b.shape.length===1),rng)[0];ice.color='purple';ice.frozen=10;
 const shell=shuffle(o.filter(b=>b.shape.length===2),rng)[0];shell.color='cyan';shell.layers=['cyan','purple'];
 h7.filter(b=>b.shape.length===3).forEach((b,i)=>{b.color=i?'red':'blue';b.layers=i?['red','blue']:['blue','yellow'];});
 const plus=h23.find(b=>b.shape.length===4);plus.color='green';plus.layers=['green','red'];
 const palette=['purple','pink','green','cyan','blue','red','yellow'];
 for(const group of [o,h7,h23])if(!color(group,bl=>palette.filter(c=>{const g=l.gates.find(g=>g.color===c);return Math.max(...bl.shape.map(p=>['top','bottom'].includes(g.side)?p[0]:p[1]))<g.size;}),rng,group===o?{blue:5,cyan:5,pink:2,purple:1,red:2,yellow:1,green:2}:{}))return null;
 h7.forEach(b=>b.shutterId=l.shutters[1].id);h23.forEach(b=>b.shutterId=l.shutters[0].id);l.blocks=[...o,...h7,...h23];
 l.generators=[{id:'r172v2-129-gen4',side:'top',offset:4,rimSpan:3,rimMount:'rim',spawn:[4,0],queueBlockIds:[]},{id:'r172v2-129-gen5',side:'bottom',offset:4,rimSpan:3,rimMount:'rim',spawn:[4,6],queueBlockIds:[]}];
 const queues=[['green','blue','pink','green'],['green','purple','cyan','pink','purple']];
 for(let j=0;j<2;j++)for(let i=0;i<queues[j].length;i++){const c=queues[j][i],g=l.generators[j],bl={id:`r172v2-129-q${j}-${i}`,x:g.spawn[0],y:g.spawn[1],shape:structuredClone(shapes.H2),color:c};g.queueBlockIds.push(bl.id);l.blocks.push(bl);}
 assert.equal(l.blocks.length,39);return l;
}
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??100),ms=Number(process.argv[4]??600),attempts=[];let best=0;
for(let n=start;n<start+count;n++){
 const seed=172229000+n,l=make(seed);if(!l){attempts.push({seed,status:'packing'});continue;}
 let audit;try{audit=auditDraft({level:l},api);}catch(e){attempts.push({seed,status:'audit',error:e.message.slice(0,220)});continue;}
 const result=search(l,{maxStates:70000,maxMilliseconds:ms,floor:16,orderSeed:n%l.blocks.length}),row={seed,status:result.status,cost:result.cost,stop:result.stop,states:result.states,explored:result.explored,maxClears:result.maxClearsSeen,total:result.totalClears,budgetMs:ms,levelSha256:digest(l)};attempts.push(row);
 if(result.maxClearsSeen>best){best=result.maxClearsSeen;row.partialFile=save('partial129-v2',{seed,sourceFile,level:l,result});console.log(JSON.stringify(row));}
 if(result.status==='witness'){
  const replay=api.replayRevisedRoute(l,result.drags);row.replay=replay;
  if(replay.valid&&replay.complete){const data={ruleVersion:lock.activeVersion,seed,level:l,levelSha256:digest(l),drags:result.drags,routeSha256:digest(result.drags),sourceReview:{passed:true,bindings:source.bindings,sourceFile,source,expectedInventory:mechanismInventory(l),adaptations:['Source73occupied cells adapted to47 preserved actual cells, retaining13opening+8lowercover+9uppercover+9queue bodies.','Under explicitv171 shape iteration permission, ice10 purpleV3 becomes purpleS to avoid sealing the opening corridor; opening bodies become10dominoes+3S.','All4 shells and their observed layers remain. Lower8 carriers fill12cells; upper9 fill12cells.','Both generator queues adapt toH2 at fixed center-contact spawn. Lower5 original observed colors remain; upper firstgreen retained, remaining3 authored.']},audit,result,replay,formalAdopted:false};const file=save('candidate129-fullsource-v2',data);console.log(JSON.stringify({file,U:replay.nonClearingDrags}));
   if(replay.nonClearingDrags>=11){const proof=await checkAdvancedFloor(l,{floor:11,maxStates:350000,maxMilliseconds:15000});const proofFile=save('proof129-fullsource-v2',{candidateFile:file,proof});console.log(JSON.stringify({proofFile,status:proof.status,proven:proof.thresholdProven}));if(proof.thresholdProven)break;}
  }
 }
 if(n%10===0)console.log(JSON.stringify(row));
}
console.log(JSON.stringify({attemptFile:save('attempts129-fullsource-v2',{sourceFile,start,count,ms,attempts}),best}));
