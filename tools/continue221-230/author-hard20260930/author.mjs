import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadSpatialApi,searchSpatial} from './grid-witness.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
const out='deliverables/continue221-230-20260930/hard';fs.mkdirSync(out,{recursive:true});
const api=await loadSpatialApi();
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],Q2:[[0,0],[1,0],[0,1],[1,1]],R6:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]],Z4:[[1,0],[2,0],[0,1],[1,1]],L4:[[0,0],[0,1],[1,1],[2,1]]};
let seed=120;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const shuffle=a=>a.map(v=>({v,r:rnd()})).sort((a,b)=>a.r-b.r).map(a=>a.v);const key=([x,y])=>x+','+y;
function tile(cells,inventory){const available=new Set(cells.map(key)),poses=[];let attempts=0;function rec(left){if(!left.length)return!available.size;if(++attempts>150000)return false;const p=[...available].map(s=>s.split(',').map(Number)).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0],seen=new Set();for(const j of shuffle(left.map((_,i)=>i))){const type=left[j];if(seen.has(type))continue;seen.add(type);for(const [dx,dy]of shapes[type]){const x=p[0]-dx,y=p[1]-dy,at=shapes[type].map(([a,b])=>[x+a,y+b]);if(!at.every(p=>available.has(key(p))))continue;for(const q of at)available.delete(key(q));poses.push({x,y,shape:shapes[type],type});if(rec(left.filter((_,i)=>i!==j)))return true;poses.pop();for(const q of at)available.add(key(q));}}return false;}if(!rec(inventory))throw Error('tiling exhausted '+attempts);return poses;}
function colorize(blocks,counts){const adjacency=blocks.map((b,i)=>blocks.map((a,j)=>i!==j&&b.shape.some(([x,y])=>a.shape.some(([u,v])=>Math.abs(b.x+x-a.x-u)+Math.abs(b.y+y-a.y-v)===1))?j:-1).filter(j=>j>=0));const left=Object.entries(counts),result=Array(blocks.length);let calls=0;function rec(){if(++calls>100000)return false;const todo=blocks.map((_,i)=>i).filter(i=>!result[i]);if(!todo.length)return true;todo.sort((a,b)=>adjacency[b].filter(i=>result[i]).length-adjacency[a].filter(i=>result[i]).length||adjacency[b].length-adjacency[a].length);const i=todo[0];for(const[k,n]of shuffle(left)){if(!counts[k]||adjacency[i].some(j=>result[j]===k))continue;if(k==='blue'&&blocks[i].shape.length<2)continue;if(k==='cyan'&&Math.max(...blocks[i].shape.map(p=>p[0]))>=2)continue;if((k==='orange'||k==='yellow')&&Math.max(...blocks[i].shape.map(p=>p[1]))>=2)continue;result[i]=k;counts[k]--;if(rec())return true;counts[k]++;result[i]=undefined;}return false;}if(!rec())throw Error('coloring exhausted');return blocks.map((b,i)=>({...b,color:result[i]}));}
const reports=[];
for(const gen of [1,3]){
 seed=120+gen*1337;
 let level;
 try{
  const sh=gen===1?{x:0,y:0,width:7,height:4}:gen===2?{x:0,y:3,width:7,height:4}:{x:0,y:6,width:7,height:4};
  const all=Array.from({length:70},(_,p)=>[p%7,Math.floor(p/7)]),inside=([x,y])=>x>=sh.x&&x<sh.x+sh.width&&y>=sh.y&&y<sh.y+sh.height;
  let visible=tile(all.filter(p=>!inside(p)),['S','S','S','H2','H2','H2','H2','V2','V2','V2','V2','H3','H3','H3','Q2','Q2','R6']);
  visible=colorize(visible,{red:5,orange:4,cyan:4,green:2,blue:2});
  // Attach the three source ice-10 instances to distinct red/green/blue bodies.
  for(const col of ['red','green','blue']){const b=visible.filter(b=>b.color===col).sort((a,b)=>a.shape.length-b.shape.length)[0];b.frozen=10;}
  let hidden=tile(all.filter(inside),['T4','L3','Z4','L3','L4','H2','H2','H3','H2','S']);
  hidden=colorize(hidden,{red:4,blue:3,yellow:3}).map(b=>({...b,shutterId:'l224-curtain8'}));
  const blocks=[...visible,...hidden].map(({type,...b},i)=>({id:'l224-g'+gen+'-b'+(i+1),...b}));
  const grids=['blue','red'].map(color=>({id:'l224-grid-'+color,color,cells:visible.filter(b=>b.color===color).flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y])).slice(0,4)}));
  if(grids.some(g=>g.cells.length!==4))throw Error('four grid cells required');
  const orangeStart=visible.find(b=>b.color==='orange'&&b.x===0&&Math.max(...b.shape.map(p=>p[1]))<2);
  const orangeOffset=orangeStart?Math.min(8,orangeStart.y):7;
  let yellowOffset=[0,2,4,6,8].find(v=>v+1<orangeOffset||v>orangeOffset+1)??0;
  level={id:224,name:'彩格折湾',difficulty:'hard',timeSeconds:150,reward:200,parMoves:16,preservedMoveTarget:42,mechanismRules:'revised-2026-09-27-v1.5',width:7,height:10,playable:all,gates:[{id:'l224-blue10',color:'blue',side:'top',offset:2,size:3,frozen:10},{id:'l224-green16',color:'green',side:'right',offset:5,size:3,frozen:16},{id:'l224-red14',color:'red',side:'bottom',offset:0,size:3,frozen:14},{id:'l224-cyan4',color:'cyan',side:'bottom',offset:5,size:2,frozen:4},{id:'l224-yellow',color:'yellow',side:'left',offset:yellowOffset,size:2},{id:'l224-orange',color:'orange',side:'left',offset:orangeOffset,size:2}],shutters:[{id:'l224-curtain8',...sh,count:8}],coloredGrids:grids,blocks,designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:16,minimumRepositionOverhead:16}};
  api.validateLevel(level);
  fs.writeFileSync(out+'/candidate-224-g'+gen+'.json',JSON.stringify(level,null,2));
  const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hiddenCoverage=auditHiddenCoverage(level),q0=blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only'));
  const before=Date.now(),search=searchSpatial(level,api,{maxMilliseconds:1500,maxStates:20000,maxTransitions:100000,diagnosticTrace:true,symmetry:true});const searchWallMs=Date.now()-before;
  const replay=search.drags?api.replayRevisedRoute(level,search.drags):null;
  const result={generation:gen,candidateSha256:crypto.createHash('sha256').update(JSON.stringify(level)).digest('hex'),opening,hiddenCoverage,q0,searchWallMs,search,replay,lowerBound:null,difficultyCertified:false,releaseApproved:false};
  reports.push(result);fs.writeFileSync(out+'/audit-224-g'+gen+'.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({gen,status:search.status,wall:searchWallMs,U:replay?.nonClearingDrags,clear:search.maxClearsSeen,opening:opening.passed,hidden:hiddenCoverage.passed,replay}));
 }catch(e){reports.push({generation:gen,error:e.stack,lowerBound:null,difficultyCertified:false});console.log('generation '+gen+' error '+e.message);}
}
fs.writeFileSync(out+'/bounded-search-audit-completed-tilings.json',JSON.stringify({maxGenerations:3,maxSearchMsPerCandidate:2000,profile:'revised-2026-09-27-v1.5',reports},null,2));
