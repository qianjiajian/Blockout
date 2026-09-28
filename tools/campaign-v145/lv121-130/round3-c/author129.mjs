import fs from'node:fs';
import {OUT,shapes,rngFor,pack,color,cleanBase,getApi,audit,save} from'./author.mjs';
import{digest,measureDesignFacts}from'../../../revised-preview-validation-v160.mjs';
import{verifyRulesLock}from'../../../verify-rules-lock.mjs';
import{auditGeneratorQueueColors}from'../../../revised-generator-queue-colors.mjs';
shapes.V3=[[0,0],[0,1],[0,2]];
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,p)=>[x+p%w,y+Math.floor(p/w)]);
const gate=(color,side,offset,size,frozen)=>({id:`129-gate-${color}`,color,side,offset,size,...(frozen?{frozen}:{})});
export function make129(base,seed){
 const rng=rngFor(seed),l=cleanBase(base);l.shutters=[{id:'129-cover23',x:2,y:2,width:3,height:3,count:23},{id:'129-cover7',x:0,y:5,width:3,height:2,count:7}];
 l.gates=[gate('purple','top',1,2),gate('pink','left',1,3),gate('green','left',4,3),gate('cyan','right',1,3),gate('blue','right',4,3),gate('red','bottom',0,2,2),gate('yellow','bottom',5,2,4)];
 const hiddenKeys=new Set(l.shutters.flatMap(s=>rect(s.x,s.y,s.width,s.height)).map(p=>p.join(','))),area=l.playable.filter(p=>!hiddenKeys.has(p.join(',')));
 const kinds=[...Array(3).fill('S'),...Array(3).fill('H3'),'H2','H2','V2','V3','SQ','SQ','L'];
 let opening=pack(area,kinds,rng,'r171-129-o');
 // If the fixed histogram cannot tile this legal mask, use the newly authorized
 // shape adaptation, keeping thirteen opening carriers and total visible area.
 if(!opening)opening=pack(area,[...Array(4).fill('S'),...Array(2).fill('H2'),...Array(3).fill('H3'),'V2','V3','SQ','SQ'],rng,'r171-129-o');
 if(!opening)return null;
 const shell=opening.find(b=>b.shape.length===2&&b.shape.every(p=>p[1]===0));if(!shell)return null;shell.color='cyan';shell.layers=['cyan','purple'];
 const ice=opening.find(b=>b.shape.length>=2&&b.shape.every(p=>p[0]===0));if(!ice)return null;ice.frozen=10;
 if(!color(opening,b=>Math.max(...b.shape.map(p=>p[0]))>=2?['pink','green','cyan','blue']:['purple','pink','green','cyan','blue','red','yellow'],rng))return null;shell.layers[0]=shell.color;
 l.blocks=[...opening];for(const s of l.shutters){const hidden=pack(rect(s.x,s.y,s.width,s.height),s.count===23?['H2','H2','H2','S','S','S']:['H2','H2','V2'],rng,`r171-129-h${s.count}`);if(!hidden)return null;color(hidden,['purple','pink','green','cyan','blue','red','yellow'],rng);hidden.forEach(b=>b.shutterId=s.id);l.blocks.push(...hidden);}
 l.generators=[{id:'129-generator4',side:'top',offset:4,rimSpan:3,rimMount:'rim',spawn:[4,0],queueBlockIds:[]},{id:'129-generator5',side:'bottom',offset:3,rimSpan:3,rimMount:'rim',spawn:[2,5],queueBlockIds:[]}];
 l.generators.forEach((g,gi)=>{for(let i=0;i<(gi?5:4);i++){const b={id:`r171-129-q${gi}-${i}`,x:g.spawn[0],y:g.spawn[1],shape:structuredClone(gi?shapes.SQ:shapes.L),color:i%2===0?'green':['pink','blue','purple'][Math.floor(rng()*3)]};g.queueBlockIds.push(b.id);l.blocks.push(b);}});return l;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/round3-c/author129.mjs')){
 const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));const api=await getApi(),base=api.LEVELS.find(l=>l.id===129),start=Number(process.argv[2]??1),count=Number(process.argv[3]??60),ms=Number(process.argv[4]??2000),attempts=[];let best=null;
 for(let n=start;n<start+count;n++){
  const seed=12900000+n,l=make129(base,seed);if(!l){attempts.push({seed,status:'packing-failed'});continue;}let a;try{a=audit(l,api);}catch(e){attempts.push({seed,status:'invalid',error:e.message});continue;}const q=auditGeneratorQueueColors(l);if(!a.passed||!q.passed){attempts.push({seed,status:'static-rejected',issues:a.issues,queue:q});continue;}
  const s=api.searchRevisedLevel(l,{maxStates:200000,maxDragStates:4096,maxMilliseconds:ms,maxTransitions:3000000});const replay=s.status==='witness'?api.replayRevisedRoute(l,s.drags):null;
  attempts.push({seed,sha256:digest(l),status:s.status,termination:s.termination,explored:s.exploredStates,replay});
  if(s.status==='witness'&&replay?.valid&&replay.complete){const data={ruleVersion:lock.activeVersion,seed,level:l,levelSha256:digest(l),drags:s.drags,search:s,replay,audit:a,queueAudit:q,proposedFacts:measureDesignFacts(l,api),sourceFacts:JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json')).levels.find(x=>x.level===129),designDifferences:['Reconstructed source mechanisms absent from previous draft: generators4/5, cover23/7, numeric ice10, cyan/purple shell, frozen2/4. Known source opening shapes require4extra cells on preserved47-cell board; four H2 enlarged to H3 where packable, otherwise explicit native-shape adaptation. Original new cover compartments9/6cells and full9-piece hidden fill; source hidden histogram unverified. Four native L3 and five SQ2 queued; alternating green/other color adapts known monochrome appearance to mandatory FIFO adjacent-color rule. Generator fixed centers and all9cargo kept.'],lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false};save(`candidate129-seed${seed}.json`,data);if(!best||Math.abs(replay.nonClearingDrags-13)<Math.abs(best.replay.nonClearingDrags-13)){best=data;save('best129.json',data);}console.log(JSON.stringify({seed,witness:replay.nonClearingDrags,drags:s.drags.length}));if(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){save('target129.json',data);break;}}
  else save(`last129.json`,{ruleVersion:lock.activeVersion,seed,level:l,audit:a,search:s});
  save(`attempts129-${start}.json`,{options:{start,count,ms},attempts});if(n%5===0)console.log(JSON.stringify({n,status:s.status,termination:s.termination,best:best?.replay.nonClearingDrags}));
 }save(`attempts129-${start}.json`,{options:{start,count,ms},attempts});console.log(JSON.stringify({attempts:attempts.length,best:best?.replay.nonClearingDrags}));
}
