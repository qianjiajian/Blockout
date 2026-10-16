import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadSpatialApi,searchSpatial} from './grid-witness.mjs';
import {floor227} from './floor227.mjs';import {replayTimed} from './timed-replay.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
const out='deliverables/continue221-230-20260930/hard';fs.mkdirSync(out,{recursive:true});
const api=await loadSpatialApi();
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],Q2:[[0,0],[1,0],[0,1],[1,1]],R6:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]],Z4:[[1,0],[2,0],[0,1],[1,1]],L4:[[0,0],[0,1],[1,1],[2,1]]};
let seed=120;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const shuffle=a=>a.map(v=>({v,r:rnd()})).sort((a,b)=>a.r-b.r).map(a=>a.v);const key=([x,y])=>x+','+y;
function tile(cells,inventory){const available=new Set(cells.map(key)),poses=[];let attempts=0;function rec(left){if(!left.length)return!available.size;if(++attempts>150000)return false;const p=[...available].map(s=>s.split(',').map(Number)).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0],seen=new Set();for(const j of shuffle(left.map((_,i)=>i))){const type=left[j];if(seen.has(type))continue;seen.add(type);for(const [dx,dy]of shapes[type]){const x=p[0]-dx,y=p[1]-dy,at=shapes[type].map(([a,b])=>[x+a,y+b]);if(!at.every(p=>available.has(key(p))))continue;for(const q of at)available.delete(key(q));poses.push({x,y,shape:shapes[type],type});if(rec(left.filter((_,i)=>i!==j)))return true;poses.pop();for(const q of at)available.add(key(q));}}return false;}if(!rec(inventory))throw Error('tiling exhausted '+attempts);return poses;}
function colorize(blocks,counts){const adjacency=blocks.map((b,i)=>blocks.map((a,j)=>i!==j&&b.shape.some(([x,y])=>a.shape.some(([u,v])=>Math.abs(b.x+x-a.x-u)+Math.abs(b.y+y-a.y-v)===1))?j:-1).filter(j=>j>=0));const left=Object.entries(counts),result=Array(blocks.length);let calls=0;function rec(){if(++calls>100000)return false;const todo=blocks.map((_,i)=>i).filter(i=>!result[i]);if(!todo.length)return true;todo.sort((a,b)=>adjacency[b].filter(i=>result[i]).length-adjacency[a].filter(i=>result[i]).length||adjacency[b].length-adjacency[a].length);const i=todo[0];for(const[k,n]of shuffle(left)){if(!counts[k]||adjacency[i].some(j=>result[j]===k))continue;if(k==='blue'&&blocks[i].shape.length<2)continue;if(k==='cyan'&&Math.max(...blocks[i].shape.map(p=>p[0]))>=2)continue;if((k==='orange'||k==='yellow')&&Math.max(...blocks[i].shape.map(p=>p[1]))>=2)continue;result[i]=k;counts[k]--;if(rec())return true;counts[k]++;result[i]=undefined;}return false;}if(!rec())throw Error('coloring exhausted');return blocks.map((b,i)=>({...b,color:result[i]}));}

const reports=[];
for(let gen=600;gen<700;gen++){
 seed=4227+gen*199;
 try{
  const W=4,H=16,wide=true;const sh={x:Math.floor(rnd()*2),y:Math.floor(rnd()*14),width:3,height:2};
  const all=Array.from({length:64},(_,p)=>[p%4,Math.floor(p/4)]).filter(([x,y])=>!(y===15&&x===3)),inside=([x,y])=>x>=sh.x&&x<sh.x+sh.width&&y>=sh.y&&y<sh.y+sh.height;
  let visible=tile(all.filter(p=>!inside(p)),['T4','Q2','L3','Q2','V2','V2','V2','V2','H3','H3','H3','T4','T4','L3','H2','H2','H2','H2','H2','S','S','S','S']);
  visible=colorize(visible,{blue:6,purple:1,red:5,green:4,yellow:7});
  // Put source shells on legal q0 footprints. Recoloring is recorded as adaptation.
  const shellChosen=[];
  for(const[type,layers]of [['T4',['blue','purple']],['Q2',['purple','blue']],['L3',['red','green']],['Q2',['red','purple']]]){const b=visible.find(b=>b.type===type&&!shellChosen.includes(b));b.layers=layers;b.color=layers[0];shellChosen.push(b);}
  // Reassign non-shell colors to remove same-color adjacency while preserving total palette.
  const adj=visible.map((b,i)=>visible.map((a,j)=>i!==j&&b.shape.some(([x,y])=>a.shape.some(([u,v])=>Math.abs(b.x+x-a.x-u)+Math.abs(b.y+y-a.y-v)===1))?j:-1).filter(j=>j>=0));
  const fixed=new Set(shellChosen.map(b=>visible.indexOf(b)));let badFixed=false;for(const i of fixed)for(const j of adj[i])if(fixed.has(j)&&visible[i].color===visible[j].color)badFixed=true;if(badFixed)throw Error('same-color shell adjacency');
  const palette=['red','blue','green','yellow','purple'];for(let i=0;i<visible.length;i++)if(!fixed.has(i))visible[i].color=null;
  function paint(){const todo=visible.map((_,i)=>i).filter(i=>!visible[i].color);if(!todo.length)return true;todo.sort((a,b)=>adj[b].filter(j=>visible[j].color).length-adj[a].filter(j=>visible[j].color).length);const i=todo[0],b=visible[i];for(const col of shuffle(palette)){if(adj[i].some(j=>visible[j].color===col))continue;if(['red','green','blue'].includes(col)&&Math.max(...b.shape.map(p=>p[1]))>=2)continue;b.color=col;if(paint())return true;b.color=null;}return false;}if(!paint())throw Error('native palette failed');
  const hidden=[{x:sh.x,y:sh.y,shape:shapes.H2,color:'green',shutterId:'l227-curtain8'},{x:sh.x,y:sh.y+1,shape:shapes.H2,color:'blue',timedBombSeconds:30,shutterId:'l227-curtain8'},{x:sh.x+2,y:sh.y,shape:shapes.V2,color:'yellow',shutterId:'l227-curtain8'}];
  const blocks=[...visible,...hidden].map(({type,...b},i)=>({id:'l227-g'+gen+'-b'+(i+1),...b}));

  const ports=color=>{const size=['purple','yellow'].includes(color)?3:2;return ['top','right','bottom','left'].flatMap(side=>Array.from({length:(['top','bottom'].includes(side)?W:H)-size+1},(_,offset)=>({id:'l227-'+color,color,side,offset,size}))).filter(g=>Array.from({length:g.size},(_,i)=>g.offset+i).every(t=>all.some(([x,y])=>g.side==='top'?x===t&&y===0:g.side==='bottom'?x===t&&y===H-1:g.side==='left'?x===0&&y===t:x===W-1&&y===t)));};
  const fits=(g,b)=>{const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));return g.side==='top'?b.y===0&&b.x>=g.offset&&b.x+bw<=g.offset+g.size:g.side==='bottom'?b.y+bh===H&&b.x>=g.offset&&b.x+bw<=g.offset+g.size:g.side==='left'?b.x===0&&b.y>=g.offset&&b.y+bh<=g.offset+g.size:b.x+bw===W&&b.y>=g.offset&&b.y+bh<=g.offset+g.size;};
  const border=shuffle(visible.filter(b=>ports(b.color).some(g=>fits(g,b))));if(!border.length)throw Error('no legal starter');
  const first=border[0],firstGate=shuffle(ports(first.color).filter(g=>fits(g,first)))[0],authoredGates=[firstGate];
  const overlaps=g=>authoredGates.some(h=>h.side===g.side&&g.offset<h.offset+h.size&&h.offset<g.offset+g.size);
  for(const color of shuffle(['purple','green','blue','red','yellow'].filter(c=>c!==first.color))){const available=shuffle(ports(color).filter(g=>!overlaps(g)));const second=available.find(g=>visible.some(b=>b.color===color&&fits(g,b)));const selected=authoredGates.length<2&&second?second:available[0];if(!selected)throw Error('gate packing');authoredGates.push(selected);}
  const level={id:227,name:'壳桥双折',difficulty:'hard',timeSeconds:180,reward:200,parMoves:17,preservedMoveTarget:52,mechanismRules:'revised-2026-09-27-v1.5',width:W,height:H,playable:all,gates:authoredGates,shutters:[{id:'l227-curtain8',...sh,count:8}],blocks,designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:17,minimumRepositionOverhead:17}};
  api.validateLevel(level);fs.writeFileSync(out+'/candidate-227-g'+gen+'.json',JSON.stringify(level,null,2));
  const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hiddenCoverage=auditHiddenCoverage(level),q0=blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only'));
  const before=Date.now(),search=searchSpatial(level,api,{maxMilliseconds:950,maxStates:20000,maxTransitions:100000,diagnosticTrace:true,symmetry:true});const searchWallMs=Date.now()-before;
  const replay=search.drags?replayTimed(level,search.drags,api):null;let proof;if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20)proof=floor227(level,{maxMilliseconds:3500,maxStates:900000}).proof;
  const result={generation:gen,candidateSha256:crypto.createHash('sha256').update(JSON.stringify(level)).digest('hex'),opening,hiddenCoverage,q0,searchWallMs,search,replay,proof,lowerBound:proof?.thresholdProven?16:null,difficultyCertified:Boolean(proof?.thresholdProven),releaseApproved:false};reports.push(result);fs.writeFileSync(out+'/audit-227-g'+gen+'.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({gen,status:search.status,wall:searchWallMs,U:replay?.nonClearingDrags,clear:search.maxClearsSeen,proof:proof?.status,valid:replay?.valid,complete:replay?.complete}));if(proof?.thresholdProven)break;
 }catch(e){reports.push({generation:gen,error:e.stack,lowerBound:null,difficultyCertified:false});console.log('generation '+gen+' error '+e.message);}
}
fs.writeFileSync(out+'/bounded-search-227-fourcol100-audit.json',JSON.stringify({maxGenerations:100,maxSearchMsPerCandidate:2000,profile:'revised-2026-09-27-v1.5',reports},null,2));
