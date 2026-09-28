import fs from 'node:fs';
import {api,base,shapes,tile,recolorBag,rng,rect,audit,searchSpatial,project,digest} from '../common.mjs';
import {replay} from '../../replay.mjs';
import {keyFloor} from '../key-floor.mjs';
const OUT='deliverables/remake191-200-20260927/author194-196/assist192';fs.mkdirSync(OUT,{recursive:true});
const save=(name,data)=>{const p=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const sourceFile='deliverables/remake191-200-20260927/author191-193/source192-1790523298252.json',source=JSON.parse(fs.readFileSync(sourceFile));
const R=rng(Number(process.env.SEED??198192)),end=Date.now()+Number(process.env.SECONDS??90)*1000,rows=[],seen=new Set();
const ports=[['left',1,3],['left',5,3],['right',1,3],['right',5,3],['bottom',0,3],['bottom',4,3],['top',1,3]],colors=['red','blue','yellow','green','purple','orange'],ice={red:0,blue:1,yellow:6,green:6,purple:6,orange:6};
const baseBag=['red','red','red','blue','blue','blue','blue','yellow','yellow','yellow','green','green','green','purple','purple','purple','orange','orange','orange'];
const shapeBy={o13:3,o15:3,o14:7,o1:9,o2:9,o9:2,o11:15,o16:9};let best=0;
const hidden=[['h1','purple',8],['h2','red',8],['h3','green',9],['h4','purple',6],['h5','orange',4]];
const fits=(l,g,b)=>{const[side,offset,size]=g,bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));return(side==='left'?b.x===0&&b.y>=offset&&b.y+bh<=offset+size:side==='right'?b.x+bw===l.width&&b.y>=offset&&b.y+bh<=offset+size:side==='top'?b.y===0&&b.x>=offset&&b.x+bw<=offset+size:b.y+bh===l.height&&b.x>=offset&&b.x+bw<=offset+size);};
for(let a=0;Date.now()<end;a++){
 const seed=R.state(),l=base(192);l.shutters=[{id:'cover6',x:0,y:7,width:7,height:2,count:6}];
 const spec=source.opening.map((p,i)=>({id:p.id,shape:shapes[shapeBy[p.id]??8],color:baseBag[i],...p.keyId?{keyId:p.keyId}:{},...p.lockedBy?{lockedBy:p.lockedBy,lockCount:p.lockCount}:{},...p.frozen?{frozen:p.frozen}:{}}));
 const bs=tile(spec,l.playable.filter(p=>p[1]<7),{seed,maxNodes:2500,preferLarge:false,pins:{o4:[0,1],o13:[4,2],o15:[3,0],o14:[5,5],o9:[2,1],o16:[4,1],o11:[0,3]}});R.random();if(!bs){rows.push({a,seed,packing:false});continue;}
 const pin={o11:'blue',o13:'green',o15:'purple',o14:'yellow',o1:'yellow',o4:'red',o6:'blue',o7:'orange',o8:'blue'};
 if(a%3===1){pin.o1='orange';pin.o7='yellow';}
 if(!recolorBag(bs,{seed:R.state(),pins:pin}))continue;
 const hs=tile(hidden.map(([id,color,shape])=>({id,color,shape:shapes[shape],shutterId:'cover6'})),rect(0,7,7,2),{seed:R.state(),maxNodes:1500,preferLarge:false});R.random();if(!hs||!recolorBag(hs,{seed:R.state()}))continue;
 l.blocks=[...bs,...hs];
 const first=ports[0];if(!first)continue;
 const selected=[first,ports[1],...R.shuffle(ports.filter(p=>p!==first&&p!==ports[1])).slice(0,4)],palette=['red','blue',...R.shuffle(colors.slice(2))];
 l.gates=palette.map((color,i)=>{const[side,offset,size]=selected[i];return{id:'g-'+color,color,side,offset,size,...ice[color]?{frozen:ice[color]}:{}};});
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);let spatial,s,rep,proof,error,prefixCost=0;
 try{spatial=audit(l);s=searchSpatial(project(l),api,{floor:21,maxMilliseconds:500,maxStates:15000,maxTransitions:170000,normalize:true,orderSeed:a,diagnosticTrace:true});
  if(s.status==='witness'){rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});let n=0;for(const r of s.drags){if(r.exitSide)n++;else prefixCost++;if(n===6)break;}if(rep.nonClearingDrags>=16)proof=keyFloor(l,{...(prefixCost>=16?{goalClears:6}:{}),floor:16,maxMilliseconds:1500,maxStates:180000});}
 }catch(e){error=e.message;}
 const row={a,seed,hash,status:s?.status,clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,prefixCost,proof:proof?.status,min:proof?.relaxedNonClearingDrags,error};rows.push(row);
 if(rep||(s?.maxClearsSeen??0)>best){best=Math.max(best,s?.maxClearsSeen??0);row.file=save('candidate192',{level:l,sourceFile,sourceFileHash:digest(fs.readFileSync(sourceFile)),source,shapeAdaptation:'All24 source identities retained19opening47cells +5hidden14. Two locks nativeV3, one lockSQ2, threeH3, oneV2, oneblueH4 and11H2 opening. Native hidden2H2+H3+T4+L3. Two bodyice2 and all keybindings retained. Source known shapes/colors adapted under1.108; no inventory omitted.',spatial,search:s,drags:s?.drags??[],replay:rep,proof,prefixCost,formalAdopted:false});console.log(JSON.stringify(row));if(proof?.thresholdProven)break;}
}
console.log(save('attempts192',rows));
