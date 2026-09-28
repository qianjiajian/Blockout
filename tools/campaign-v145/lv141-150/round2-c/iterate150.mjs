import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {search150} from './search150.mjs';
import {projectAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c',stamp=Date.now();
const base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/source146-150/candidate150-mask-3935860144.json')).level;
let seed=Number(process.env.SEED??173150),rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)],shuffle=a=>a.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const colors=['red','green','blue','yellow'],cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),adj=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([xx,yy])=>Math.abs(xx-x)+Math.abs(yy-y)===1));
function tiles(x,y){const used=new Set(),bs=[];function rec(){let p=0;while(used.has(p)&&p<12)p++;if(p===12)return true;const xx=p%3,yy=Math.floor(p/3);for(const [dx,dy]of shuffle([[1,0],[0,1]])){if(xx+dx>=3||yy+dy>=4)continue;const q=p+dx+dy*3;if(used.has(q))continue;used.add(p);used.add(q);bs.push({x:x+xx,y:y+yy,shape:[[0,0],[dx,dy]]});if(rec())return true;bs.pop();used.delete(p);used.delete(q);}return false;}return rec()?bs:null;}
function make(){const level=structuredClone(base),blocks=[...tiles(0,3),...tiles(3,0)];blocks.push({x:0,y:0,shape:base.blocks.find(b=>b.shape.length===9).shape},{x:3,y:4,shape:base.blocks.find(b=>b.shape.length===9).shape});
 for(let i=0;i<blocks.length;i++){const b=blocks[i];b.id='r173-150-'+i;const forbidden=blocks.slice(0,i).filter(a=>adj(a,b)).map(a=>a.color);b.color=pick(colors.filter(c=>!forbidden.includes(c)));if(!b.color)return null;}
 for(const i of shuffle(Array.from({length:12},(_,i)=>i)).slice(0,2)){const b=blocks[i];b.layers=[b.color,pick(colors.filter(c=>c!==b.color))];}
 level.blocks=blocks;level.gates=[{id:'red',color:'red',side:'right',offset:4,size:3,frozen:7}];level.flipDoors=[{id:'blue',color:'blue',side:'top',offset:3,size:3,initiallyOpen:true},{id:'green',color:'green',side:'left',offset:0,size:3,initiallyOpen:false},{id:'yellow',color:'yellow',side:'bottom',offset:0,size:3,frozen:7,initiallyOpen:true}];
 const used=new Set();for(const g of [...level.gates,...level.flipDoors]){const options=[];for(const side of ['top','bottom','left','right'])for(let offset=0;offset<=(side==='top'||side==='bottom'?6:7)-3;offset++)if(Array.from({length:3},(_,i)=>side+':'+(offset+i)).every(k=>!used.has(k)))options.push({side,offset});if(!options.length)return null;Object.assign(g,pick(options));for(let j=0;j<3;j++)used.add(g.side+':'+(g.offset+j));}
 return level;
}
for(let i=0;i<Number(process.argv[2]??500);i++){const level=make();if(!level)continue;try{api.validateLevel(level);}catch{continue;}if(!api.auditCandidateBlockArt(level).passed)continue;
 const result=search150(level,api,Number(process.env.SEARCH_MS??400),10);let replay,proof;
 if(result.status==='witness'){replay=api.replayRevisedRoute(level,result.drags);if(replay.valid&&replay.complete&&replay.nonClearingDrags>=5){proof=checkSymmetryFloor(projectAdvancedFloor(level,api).level,{floor:5,maxStates:200000,maxMilliseconds:1500});const file=`${OUT}/candidate150-${stamp}-${i}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',level,drags:result.drags,replay,proof,sourcePhaseVerified:false,sourceDifference:'Source 12 domino bodies retain identities with retiling/recoloring; 2 shells preserved; added 2 SQ3 fill area18; yellow latent phase remains conditional.',adoptionReady:false},null,2));console.log(JSON.stringify({i,file,U:replay.nonClearingDrags,proof:proof.status}));if(proof.thresholdProven)break;}}
 fs.appendFileSync(`${OUT}/iterations150-${stamp}.jsonl`,JSON.stringify({i,levelSha256:digest(level),status:result.status,bestClears:result.bestClears,ms:result.milliseconds,U:replay?.nonClearingDrags,proof:proof?.status})+'\n');
 if(i%50===0)console.log(JSON.stringify({i,status:result.status,bestClears:result.bestClears}));
}
