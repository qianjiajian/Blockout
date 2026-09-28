import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,BASELINE,TARGETS,auditSpatial,digest} from './remake101to110-v146.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
const OUT='deliverables/remake101-110-v146-20260924/source101-105';
const base=JSON.parse(fs.readFileSync(BASELINE));
const SH={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]],J4:[[0,0],[0,1],[1,1],[2,1]],T4:[[1,0],[0,1],[1,1],[2,1]],CROSS5:[[1,0],[0,1],[1,1],[2,1],[1,2]]};
SH.S4=[[0,0],[1,0],[1,1],[2,1]];SH.Z4=[[1,0],[2,0],[0,1],[1,1]];SH.H4=[[0,0],[1,0],[2,0],[3,0]];
let seed=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),shuffle=a=>a.map(v=>[random(),v]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]),key=p=>p.join(',');
const pts=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
const save=(prefix,data)=>{fs.mkdirSync(OUT,{recursive:true});const p=`${OUT}/${prefix}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const sourcePaths={101:'.codex-temp/remaining98-v111/middle/lv101/source-review-101.json',102:'.codex-temp/remaining98-v111/next102/source-review-102.json',103:'.codex-temp/remaining98-v111/early/next103/source-review-103.json',104:'.codex-temp/remaining98-v111/middle/lv104/source-review-104.json'};
function witnessGreedy(level,api,D,options={}){
 const c=D.compileSpatial(level,api),startTime=Date.now(),maxTime=options.maxMilliseconds??3000,maxCost=options.maxCost??30;
 const norm=initial=>{let s=initial,drags=[];for(;;){let next;D.each(c,s,(z,cost,get)=>{if(!cost){next=z;drags.push(get());return false;}},{optionalExit:false,orderSeed:options.orderSeed??0,clearOnly:true});if(!next)return{s,drags};s=next;}};
 const first=norm(c.initial),nodes=[{s:first.s,drags:first.drags,parent:-1,cost:0,clears:D.cleared(c,first.s)}],seen=new Map([[D.key(first.s),0]]),open=[0];let best=0;
 const score=i=>nodes[i].clears*1000-nodes[i].cost;
 const push=i=>{open.push(i);for(let a=open.length-1;a;){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[a],open[p]]=[open[p],open[a]];a=p;}};
 const pop=()=>{const a=open[0],v=open.pop();if(open.length){open[0]=v;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{let r=[];for(;i>=0;i=nodes[i].parent)r.push(nodes[i].drags);return r.reverse().flat();};
 while(open.length&&Date.now()-startTime<maxTime&&seen.size<300000){const i=pop(),n=nodes[i];if(n.cost>seen.get(D.key(n.s)))continue;if(n.clears>nodes[best].clears)best=i;if(n.clears===c.totalClears)return{status:'witness',cost:n.cost,drags:route(i),states:seen.size,elapsedMilliseconds:Date.now()-startTime,witnessOnly:true};D.each(c,n.s,(raw,k,get)=>{if(n.cost+k>maxCost)return;const z=norm(raw),cost=n.cost+k,key=D.key(z.s);if((seen.get(key)??Infinity)<=cost)return;seen.set(key,cost);nodes.push({s:z.s,drags:[get(),...z.drags],parent:i,cost,clears:D.cleared(c,z.s)});push(nodes.length-1);},{optionalExit:false,orderSeed:options.orderSeed??0});}
 return{status:'unknown',maxClearsSeen:nodes[best].clears,partialDrags:route(best),partialCost:nodes[best].cost,states:seen.size,elapsedMilliseconds:Date.now()-startTime,witnessOnly:true};
}
function row(type,color,attrs={}){return{type,color,...attrs};}
function ledger101(){const r=JSON.parse(fs.readFileSync(sourcePaths[101])).sourceFacts.pieceLedger;return Object.fromEntries(Object.entries(r).map(([stage,bs])=>[stage,bs.map((b,i)=>row(b.shape==='L4'?(i%2?'L4':'J4'):b.shape,b.color,{sourceId:`${stage}-${i}`,...(b.star?{star:true}:{}),...(b.axis?{movementAxis:b.axis}:{})}))]));}
function ledger102(){return{
 opening:[row('S','green'),row('S','orange'),row('S','purple'),row('S','red'),row('S','yellow'),row('S','green',{star:true}),row('S','purple',{star:true}),row('S','blue'),row('S','yellow')],
 cover9:[row('S','yellow',{star:true}),row('H2','green'),row('S','yellow'),row('S','yellow',{star:true})],
 cover13:[row('S','yellow'),row('H2','green'),row('V2','purple'),row('H2','orange'),row('V2','red'),row('L3','red'),row('S','purple'),row('V2','yellow',{star:true}),row('H2','yellow'),row('H2','red',{star:true}),row('H2','green')]
};}
function ledger103(){return{
 opening:[row('H3','pink'),row('S','blue'),row('H2','pink'),row('H2','yellow'),row('H2','green'),row('H2','pink'),row('H2','green'),row('S','blue',{frozen:11}),row('S','blue',{frozen:11}),row('S','yellow',{frozen:11}),row('S','cyan',{frozen:11}),row('L3','green',{frozen:11}),row('L3','red',{frozen:11})],
 cover5:[row('CROSS5','green',{star:true}),row('CROSS5','yellow',{star:true}),row('S','pink'),row('S','pink'),row('S','green'),row('S','blue'),row('H2','blue'),row('H2','cyan')],
 cover20:[row('L4','red'),row('L3','orange'),row('L3','green'),row('L4','cyan'),row('SQ2','purple',{movementAxis:'vertical'})]
};}
function ledger104(){const r=JSON.parse(fs.readFileSync(sourcePaths[104])).sourceFacts.pieceLedger;return Object.fromEntries(Object.entries(r).map(([stage,bs])=>[stage,bs.map((b,i)=>row(b.shape==='L4'?(stage==='cover12'?'J4':'L4'):b.shape,b.color,{sourceId:`${stage}-${i}`,...(b.star?{star:true}:{}),...(b.innerColor?{layers:[b.color,b.innerColor]}:{})}))]));}
function pack(cells,specs,adjacent=false){
 const empty=new Set(cells.map(key)),out=[],left=specs.map((s,i)=>({...s,index:s.index??i,shape:SH[s.type]}));let nodes=0;
 for(const s of [...left].filter(s=>s.pin)){const [x,y]=s.pin,p=s.shape.map(([a,b])=>[a+x,b+y]);if(!p.every(q=>empty.has(key(q))))return null;p.forEach(q=>empty.delete(key(q)));left.splice(left.indexOf(s),1);out.push({...s,x,y});}
 function rec(){if(!empty.size)return left.length===0;if(nodes++>200000)return false;const[x,y]=[...empty].map(k=>k.split(',').map(Number)).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0];
  const seen=new Set();for(const s of shuffle([...left])){const sig=JSON.stringify([s.type,s.color,s.star,s.frozen,s.layers]);if(seen.has(sig))continue;seen.add(sig);
   for(const[dx,dy]of s.shape){const xx=x-dx,yy=y-dy,p=s.shape.map(([a,b])=>[xx+a,yy+b]);if(!p.every(q=>empty.has(key(q))))continue;
    if(adjacent&&out.some(b=>b.color===s.color&&b.shape.some(([a,c])=>p.some(([px,py])=>Math.abs(b.x+a-px)+Math.abs(b.y+c-py)===1))))continue;
    const i=left.indexOf(s);left.splice(i,1);p.forEach(q=>empty.delete(key(q)));out.push({...s,x:xx,y:yy});if(rec())return true;out.pop();p.forEach(q=>empty.add(key(q)));left.splice(i,0,s);
   }
  }return false;
 }return rec()?out:null;
}
function region(stage,x,y,w,h,count,skin){return{stage,id:`c-${stage}`,x,y,width:w,height:h,count,...(skin?{skin}:{})};}
function buildLevel(id,iter){seed=id*100000+iter;const old=base.levels[id-1].level;let ledger,gates,regions;
 if(id===101){ledger=ledger101();ledger.opening.push(row('H2','purple',{added:true}),row('H2','blue',{added:true}));regions=[region('cover9',0,0,7,4,9),region('cover4',0,6,7,4,4)];gates=[row('','purple',{side:'left',offset:4,size:2}),row('','blue',{side:'right',offset:4,size:2,frozen:1}),row('','red',{side:'bottom',offset:0,size:3}),row('','yellow',{side:'left',offset:1,size:3,frozen:9}),row('','green',{side:'bottom',offset:4,size:3,star:true,frozen:3}),row('','red',{side:'right',offset:7,size:3,star:true,frozen:14}),row('','blue',{side:'top',offset:0,size:3,star:true,frozen:15}),row('','yellow',{side:'top',offset:4,size:3,star:true,frozen:21})];}
 if(id===103){ledger=ledger103();regions=[region('cover5',0,0,6,3,5),region('cover20',0,3,3,6,20)];gates=[row('','pink',{side:'right',offset:6,size:3}),row('','blue',{side:'right',offset:9,size:1,frozen:5}),row('','orange',{side:'left',offset:6,size:3,frozen:11}),row('','green',{side:'right',offset:3,size:3,star:true,frozen:2}),row('','yellow',{side:'left',offset:0,size:3,star:true,frozen:11}),row('','red',{side:'bottom',offset:0,size:3,frozen:12}),row('','purple',{side:'top',offset:0,size:2,frozen:20}),row('','cyan',{side:'top',offset:3,size:3,frozen:15})];}
 if(id===102){ledger=ledger102();for(const c of ['purple','blue','orange','green'])ledger.opening.push(row('SQ2',c,{added:true}));for(const c of ['red','yellow'])ledger.opening.push(row('H3',c,{added:true}));for(const c of ['red','green'])ledger.opening.push(row('H2',c,{added:true}));regions=[region('cover9',1,0,5,1,9),region('cover13',0,6,7,3,13)];gates=[row('','red',{side:'left',offset:1,size:2}),row('','blue',{side:'left',offset:4,size:2}),row('','green',{side:'left',offset:7,size:2}),row('','yellow',{side:'right',offset:1,size:2}),row('','purple',{side:'right',offset:4,size:2}),row('','orange',{side:'right',offset:7,size:2}),row('','red',{side:'bottom',offset:0,size:2,star:true}),row('','yellow',{side:'bottom',offset:2,size:3,star:true}),row('','green',{side:'bottom',offset:5,size:2,star:true}),row('','purple',{side:'top',offset:1,size:3,star:true})];}
 if(id===104){ledger=ledger104();regions=[region('cover6',1,0,5,2,6),region('cover12',0,6,7,4,12),region('lift',2,2,3,3,0,'lift')];gates=[row('','blue',{side:'right',offset:2,size:3}),row('','green',{side:'left',offset:2,size:3,frozen:2}),row('','purple',{side:'right',offset:5,size:3,frozen:8}),row('','red',{side:'left',offset:5,size:3,frozen:16}),row('','yellow',{side:'bottom',offset:0,size:3,frozen:20}),row('','pink',{side:'bottom',offset:4,size:3,frozen:22}),row('','red',{side:'top',offset:1,size:3,star:true,frozen:22}),row('','yellow',{side:'right',offset:0,size:2,portals:[{side:'right',origin:[5,0],size:2}],star:true,frozen:24})];}
 if(id===104){ledger.cover12[3].type='L4';ledger.cover12[9].type='SQ2';ledger.opening[11].pin=[5,2];ledger.opening[2].pin=[6,5];ledger.opening[8].pin=[6,4];ledger.opening[0].pin=[0,4];gates.find(g=>g.color==='blue').offset=2;gates.find(g=>g.color==='blue').size=2;gates.find(g=>g.color==='purple').offset=4;gates.find(g=>g.color==='purple').size=2;gates.find(g=>g.color==='pink').offset=3;}
 if(!ledger)return null;
 if(id===103){
  regions=[region('cover20',0,0,6,3,20),region('cover5',0,7,6,3,5)];
  ledger.cover20=[row('L4','red',{pin:[3,0]}),row('L3','orange',{pin:[0,1]}),row('H3','green',{pin:[0,0]}),row('S4','cyan',{pin:[1,1]}),row('SQ2','purple',{movementAxis:'vertical',pin:[4,1]})];
  const pins={2:[4,4],7:[1,3],8:[3,3],9:[4,3],10:[5,3],11:[0,3],12:[2,3]};for(const[i,p]of Object.entries(pins))ledger.opening[i].pin=p;
  gates=[row('','pink',{side:'left',offset:4,size:3}),row('','green',{side:'right',offset:4,size:3,star:true,frozen:2}),row('','blue',{side:'right',offset:8,size:1,frozen:5}),row('','yellow',{side:'left',offset:7,size:3,star:true,frozen:11}),row('','orange',{side:'left',offset:0,size:3,frozen:11}),row('','red',{side:'bottom',offset:0,size:3,frozen:12}),row('','cyan',{side:'bottom',offset:3,size:3,frozen:15}),row('','purple',{side:'top',offset:4,size:2,frozen:20})];
 }
 const covered=new Set(regions.filter(r=>r.skin!=='lift').flatMap(r=>pts(r.x,r.y,r.width,r.height)).map(key));let blocks=[];
 for(const[stage,specs]of Object.entries(ledger)){const r=regions.find(r=>r.stage===stage),cells=r?pts(r.x,r.y,r.width,r.height):old.playable.filter(p=>!covered.has(key(p)));let p;
 if(false&&id===102&&stage==='opening'){specs.forEach((s,i)=>s.index=i);const upper=new Set([3,7,9,13,14,15,16]),a=pack(pts(0,1,7,2),specs.filter(s=>upper.has(s.index)),true),b=pack(pts(0,6,7,3),specs.filter(s=>!upper.has(s.index)),true);p=a&&b?[...a,...b]:null;}else p=pack(cells,specs,stage==='opening');
 if(!p){if(iter<3||process.env.DEBUG)console.log(JSON.stringify({id,iter,packFail:stage,cells:cells.length,area:specs.reduce((n,s)=>n+SH[s.type].length,0)}));return null;}blocks.push(...p.map(({type,index,sourceId,added,adaptation,pin,...b})=>({...b,id:`r147-${id}-${stage}-${index}`,...(r?{shutterId:`r147-${id}-${r.stage}`}:{})})));}
 if(id===102)for(const g of gates)if(!g.star)g.size=['blue','orange'].includes(g.color)?2:1;
 gates=gates.map(({type,...g},i)=>({...g,id:`r147-${id}-g${i}`}));
 // Within each side rotate available same-sized destinations while retaining every color/counter/star identity.
 for(const side of ([103,104].includes(id)?[]:['bottom','left','right'])){const gs=gates.filter(g=>g.side===side);for(const size of new Set(gs.map(g=>g.size))){const group=gs.filter(g=>g.size===size),positions=shuffle(group.map(g=>g.offset));group.forEach((g,i)=>g.offset=positions[i]);}}
 if(id===102){Object.assign(gates.find(g=>g.color==='red'&&g.star),{side:'bottom',offset:0,size:3});Object.assign(gates.find(g=>g.color==='green'&&g.star),{side:'bottom',offset:4,size:3});Object.assign(gates.find(g=>g.color==='yellow'&&g.star),{side:'left',offset:6,size:3});for(const[color,side,offset]of [['red','left',1],['blue','left',3],['green','left',5],['yellow','right',1],['purple','right',5],['orange','right',3]])Object.assign(gates.find(g=>g.color===color&&!g.star),{side,offset});}
 if(id===103)gates.find(g=>g.color==='purple').offset=blocks.find(b=>b.movementAxis).x;
 if(id===101){for(const g of gates.filter(g=>g.size===2))g.size=3;const axis=blocks.find(b=>b.movementAxis);const bg=gates.find(g=>g.color==='blue'&&g.star);bg.offset=axis.x;const yg=gates.find(g=>g.color==='yellow'&&g.star);yg.side='left';yg.offset=7;yg.size=3;}
 return{...old,difficulty:TARGETS[id].difficulty,preservedMoveTarget:base.levels[id-1].starTargets.moveTarget,blocks,gates,shutters:regions.map(({stage,...r})=>({...r,id:`r147-${id}-${stage}`}))};
}
const lock=verifyRulesLock();assert(lock.ok&&['1.46.0','1.47.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0'].includes(lock.activeVersion));const {api}=await loadApi();
const [mode,arg,startArg,nArg]=process.argv.slice(2);
if(mode==='contracts'){
 const ledgers={101:ledger101(),102:ledger102(),103:ledger103(),104:ledger104()};const contract={activeRuleVersion:lock.activeVersion,generationContract:'1.45.0',ledgerInterpretation:'Source labels and types are observed; J4/L4/L3 native orientation and 103 greenL3→H3 plus cyanL4→S4 are candidate adaptations, not source facts.',sourcePaths,sourceHashes:Object.fromEntries(Object.entries(sourcePaths).map(([id,p])=>[id,digest(fs.readFileSync(p))])),ledgers,frames:{101:[1,6,52,80,84],102:[93,106,110,135],103:[142,165,185,190,191,192,195,205,206,207],104:[221,244,268,287,325]},notes:{101:'opening4/10cells; full22; two7x4hidden layers completely known; initial opening has 4 empty cells requiring ordinary fill.',102:'truth SQ2×9 incorrect: actual logical S×9; source sourceBoard35 cells vs retained61 requires26 ordinary fill cells. 11 ordinary gates include duplicates; preserve four star identities; consolidate duplicate same-color ordinary ports.',103:'truth opening11/ice4 incorrect: opening13,ice6 all11. Full26/8irregular exceeds30%; minimum necessary two-body native fit: greenL3 becomes H3 and cyanL4 becomes S4; exhaustive pipeline pack evidence rejects every one-body adaptation. All known colors preserved.',104:'truth lacks two yellow→pink shells and one3x3 lift of three bodies; preserve both. Source lift is under cover12; candidate position/timing changes in new preserved-board spatial layout are documented. Runtime supports nesting, and relocation is not claimed as an engine requirement.'},candidateValidated:false};console.log(save('source-contract',contract));
}else if(mode==='search'){
 const id=Number(arg),start=Number(startArg??0),n=Number(nArg??1000);const domain=await import('../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs');const spatialApi=await domain.loadSpatialApi();let made=0,witness=0;
 for(let iter=start;iter<start+n;iter++){if(iter%50===0)console.log(JSON.stringify({id,iter,made,witness}));const level=buildLevel(id,iter);if(!level)continue;let audit;try{audit=auditSpatial(level,api);}catch(e){if(made===0&&iter<4)console.log(String(e).slice(0,1000));continue;}made++;
  const r=id===104?witnessGreedy(level,spatialApi,domain,{maxCost:15,maxMilliseconds:5000,orderSeed:iter%5}):domain.searchSpatial(level,spatialApi,{floor:TARGETS[id].range[1]+1,maxStates:200000,maxMilliseconds:3000,weight:1000,symmetry:true});if(made===1)console.log(save('first-search'+id,{seed:iter,level,audit,result:r}));if(!r.drags)continue;const replay=api.replayRevisedRoute(level,r.drags);if(!replay.valid||!replay.complete)continue;witness++;const m=measureRoute(level,r.drags,api);if(replay.nonClearingDrags<TARGETS[id].range[0])continue;
  const p=domain.searchSpatial(level,spatialApi,{floor:TARGETS[id].range[0],prove:true,maxStates:300000,maxMilliseconds:10000,symmetry:true});const file=save(`candidate${id}`,{activeRuleVersion:lock.activeVersion,seed:iter,level,audit,drags:r.drags,replay,measurements:m,proof:p,sourceContract:'See latest source-contract in this directory',pointerValidated:false,formalAdopted:false});console.log(JSON.stringify({file,cost:replay.nonClearingDrags,proof:p.status,multi:m.multiCellDrags,single:m.singleCellDrags}));if(p.thresholdProven)break;
 }
 console.log(JSON.stringify({done:true,id,made,witness}));
}else if(mode==='make'){
 for(let i=Number(startArg??0);i<Number(startArg??0)+Number(nArg??100);i++){const l=buildLevel(Number(arg),i);if(!l)continue;try{const a=auditSpatial(l,api);console.log(save(`diagnostic${arg}`,{seed:i,level:l,audit:a}));break;}catch(e){console.log(String(e).slice(0,1500));}}
}else throw Error('contracts | make ID START COUNT | search ID START COUNT');
