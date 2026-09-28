import {api,source,hash,base,block,gate,SH,rngFor,shuffle,audit,save,packRegion} from './common.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
export function make127(seed){
 const r=rngFor(seed),l=base(127,'easy');
 l.shutters=[{id:'r3-127-a',x:0,y:0,width:3,height:6,count:14},{id:'r3-127-b',x:3,y:0,width:4,height:6,count:12}];
 gate(l,'red','right',6,2);gate(l,'yellow','right',8,1);gate(l,'blue','bottom',0,3,7);gate(l,'green','left',6,3,15);gate(l,'pink','right',0,3,13);gate(l,'purple','top',0,3,22);
 // Three H3 and twelve singles cover the full bottom rectangle. The video has
 // three H3/eleven singles plus a hole; the additional native S fills that hole.
 let bars=[Math.floor(r()*5),Math.floor(r()*5),Math.floor(r()*5)];
 for(let y=6;y<9;y++){for(let x=0;x<7;){if(x===bars[y-6]){block(l,x,y,'H3','red');x+=3;}else{block(l,x,y,'S','yellow');x++;}}}
 let opening=l.blocks,byCell=new Map();opening.forEach((b,i)=>b.shape.forEach(([dx,dy])=>byCell.set(`${b.x+dx},${b.y+dy}`,i)));
 const neighbors=opening.map(()=>new Set());for(let[k,i]of byCell){let[x,y]=k.split(',').map(Number);for(let[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let j=byCell.get(`${x+dx},${y+dy}`);if(j!==undefined&&j!==i)neighbors[i].add(j);}}
 const shell=opening.findIndex(b=>b.shape.length===3&&b.y===8),second=opening.findIndex(b=>b.shape.length===3&&b.y===6);
 let colors=[];colors[shell]='green';colors[second]='green';
 const order=[...opening.keys()].filter(i=>i!==shell&&i!==second).sort((a,b)=>neighbors[b].size-neighbors[a].size);
 function paint(k){if(k===order.length)return true;let i=order[k],used=new Set([...neighbors[i]].map(j=>colors[j]));for(let c of shuffle(['red','yellow','blue'],r)){if(used.has(c))continue;colors[i]=c;if(paint(k+1))return true;}colors[i]=undefined;return false;}
 if(!paint(0))return null;
 opening.forEach((b,i)=>b.color=colors[i]);opening[shell].layers=['green','blue'];
 const palette=['red','yellow','blue','green','pink','purple'];
 const left=packRegion(0,0,3,6,['L4','L3','R6','H2','H2','S'],r),right=packRegion(3,0,4,6,['SQ','SQ','SQ','L3','L3','H2','H2','V2'],r);
 if(!left||!right)return null;
 for(let [region,cover]of[[left,'r3-127-a'],[right,'r3-127-b']]){let shellDone=false;for(let p of region){let isShell=!shellDone&&(p.type==='H2');let extra={shutterId:cover};if(isShell){extra.layers=['green','blue'];shellDone=true;}block(l,p.x,p.y,p.type,isShell?'green':palette[Math.floor(r()*palette.length)],extra);}} const q=block(l,5,0,'V3','green');
 l.generators=[{id:'r3-127-machine',side:'top',offset:5,rimSpan:3,rimMount:'rim',rimAnchor:{x:5.5,y:0,quarterTurns:0},spawn:[5,0],queueBlockIds:[q.id],trigger:'move'}];
 return l;
}
const attempts=[],start=Number(process.argv[2]??127000),N=Number(process.argv[3]??100),budget=Number(process.argv[4]??1200);let best=null;
for(let seed=start;seed<start+N;seed++){
 let level=make127(seed);if(!level){attempts.push({seed,error:'opening-coloring'});continue;}let a,s,replay;try{a=audit(level);if(!a.passed){attempts.push({seed,error:'static',audit:a});continue;}s=search(level,{maxStates:150000,maxMilliseconds:budget,orderSeed:seed%level.blocks.length});if(s.status==='witness'){replay=api.replayRevisedRoute(level,s.drags);if(replay.valid&&replay.complete){const c={seed,level,levelSha256:hash(level),audit:a,search:s,replay};if(!best||Math.abs(s.cost-7)<Math.abs(best.search.cost-7)){best=c;let file=save(`candidate127-fullsource-seed${seed}`,{levelId:127,sourceRecordSha256:hash(source.find(s=>s.level===127)),candidate:c,adaptations:['Preserve current actual 7x9 board. Pixel calibration of sec-0411.jpg shows six covered rows and three open rows, contrary to prior 7x8/height5 blueprint transcription.','Preserve covers14/12, one green V3 generator, three green/blue shells (opening H3, hidden right H2, hidden left H2 adapted from source L3 shell without native shell artwork) and gates7/13/15/22. Add one S to fill the source visible hole.','Full video sec0450/0468 records source twelve hidden bodies, adapted to fourteen and two extra shells; hidden source left SQ3/T4/L3/H2 is refit to native L4/L3/R6/2H2/S because native source orientations cannot tile the3x6 rectangle; right retains3SQ/2L3/2H2/V2 histogram in new q0 packing. All four irregular bodies retained. Opening bars moved and colors adapted after stalled candidates, as authorized; source coordinates are not asserted.','Blue bottom gate is size3 to pass the known H3 inner shell; source duplicate top blue22 is recolored purple under unique-gate hard rule under full-cross-section rule; source bottom gate appears size1.'],lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false});console.log(JSON.stringify({file,seed,cost:s.cost,drags:s.drags.length}));}if(s.cost>=5&&s.cost<=10)break;}}}catch(e){attempts.push({seed,error:e.message});continue;}attempts.push({seed,status:s?.status,stop:s?.stop,cost:s?.cost,states:s?.states,replay});
}
console.log(JSON.stringify({file:save('search127-fullsource-attempts',{attempts,bestSeed:best?.seed,status:best?'FULL_MODEL_ROUTE':'NO_FULL_ROUTE'}),best:best&&{seed:best.seed,cost:best.search.cost}}));
