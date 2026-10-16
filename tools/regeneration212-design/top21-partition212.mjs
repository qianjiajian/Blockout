import fs from 'node:fs';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {emptyPoseExitAudit} from '../regeneration211-design/aux212/empty-pose-exit-audit.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/top21-partition`,base=JSON.parse(fs.readFileSync(`${OUT}/source212-grid/q3redVb55prefix212-6.json`)).level;fs.mkdirSync(DIR,{recursive:true});const api=await loadSpatialApi();
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],H3=[[0,0],[1,0],[2,0]],V3=[[0,0],[0,1],[0,2]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],L4=[[0,0],[0,1],[1,1],[2,1]];
const shapes=[Q2,V3,L4,L3,H3,V2,H2,S].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0),fingerprints=new Set(),history=[];
for(let index=0;index<8;index++){
 const file=`${DIR}/hidden-${index}.json`;if(fs.existsSync(file))throw Error('Append-only');const level=structuredClone(base);level.shutters=[];level.blocks=[];level.blocked=[];for(let y=3;y<=5;y++)for(const x of[0,1,5,6])level.blocked.push([x,y]);level.playable=Array.from({length:63},(_,i)=>[i%7,Math.floor(i/7)]).filter(([x,y])=>!level.blocked.some(([bx,by])=>bx===x&&by===y));level.coloredGrids[0].cells=[[5,0],[6,0]];level.gates.forEach(g=>delete g.frozen);
 const bomb={id:'l212-top-bomb40',color:'blue',x:2,y:0,shape:H2},other={id:'l212-top-blue-h2',color:'blue',x:5,y:0,shape:H2},fixed=[bomb,other];
 let seed=1983+index*487;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;},shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const remain=new Set(Array.from({length:21},(_,i)=>`${i%7},${Math.floor(i/7)}`).filter(p=>!['2,0','3,0','5,0','6,0'].includes(p)));let nodes=0;
 function fill(left,made){if(++nodes>500000)return null;if(!left.size){const sig=JSON.stringify(made.map(b=>[b.x,b.y,b.shape]));if(made.length>7||made.length<5||!made.some(b=>b.shape.length===3&&b.shape.some(p=>p[0]===1)&&b.shape.some(p=>p[1]===1))||fingerprints.has(sig))return null;fingerprints.add(sig);return made;}if(made.length>=7)return null;
  const[cx,cy]=[...left].sort((a,b)=>{const[ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;})[0].split(',').map(Number),options=[];
  for(const shape of shuffle([...shapes]))for(const color of shuffle(['red','green','yellow'])){if(color!=='green'&&shape.some(p=>p[1]>=2))continue;const cells=shape.map(([x,y])=>`${cx+x},${cy+y}`);if(!cells.every(p=>left.has(p)))continue;const body={id:`l212-top21-${made.length}`,color,x:cx,y:cy,shape};if(adjacency([...fixed,...made,body]).length)continue;options.push({body,cells});}
  options.sort((a,b)=>b.body.shape.length-a.body.shape.length);
  for(const{body,cells}of options){const next=new Set(left);cells.forEach(p=>next.delete(p));const found=fill(next,[...made,body]);if(found)return found;}return null;}
 const made=fill(remain,[]);if(!made)throw Error('No tiling '+index);level.blocks=[...fixed,...made];const necessary=emptyPoseExitAudit(level,api),packet={level,levelSha256:digest(level),necessary,adjacency:adjacency(level.blocks),formalAdopted:false,projection:'Independent top7x3 hidden-only relaxation. New original51-cell mask; delete all other bodies/covers, open ice gates, remove bomb40 timer. Actual full candidate still to be filled; this is not full level acceptance.'};
 if(necessary.passed)packet.bound=runNativeLift(liftPayload(level,api,{floor:3,maxMilliseconds:2000,maxStates:150000}).p);
 fs.writeFileSync(file,JSON.stringify(packet,null,2));const row={index,sha:packet.levelSha256,bodies:level.blocks.length,necessary:necessary.passed,trapped:necessary.trappedBodyIds,status:packet.bound?.status,relaxedU:packet.bound?.relaxedNonClearingDrags,frontier:packet.bound?.frontierCost};history.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/history.json`,JSON.stringify({finiteCap:8,history},null,2));
