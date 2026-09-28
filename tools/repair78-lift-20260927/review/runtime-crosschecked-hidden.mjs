import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const ROOT='deliverables/repair78-lift-20260927/review',candidateFile=process.argv[2]??'deliverables/repair78-lift-20260927/before.json';
const ice=Number(process.argv[3]??3),maxStates=Number(process.argv[4]??3000000),maxMs=Number(process.argv[5]??60000);
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.104.0');
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';"},bundle:true,write:false,format:'esm',platform:'node',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const bindings=Object.fromEntries(Object.keys(built.metafile.inputs).filter(p=>p!=='<stdin>').map(p=>[p,digest(fs.readFileSync(p))]));
bindings[import.meta.filename]=digest(fs.readFileSync(import.meta.filename));bindings[candidateFile]=digest(fs.readFileSync(candidateFile));
const candidate=JSON.parse(fs.readFileSync(candidateFile)),level=candidate.level??candidate.candidate??candidate;
api.validateLevel(level);assert.equal(level.id,78);assert.equal(level.width,7);assert.equal(level.height,9);assert(!level.blocked?.length&&!level.seams?.length&&!level.generators?.length&&!level.elevators?.length&&!level.conveyors?.length&&!level.flipDoors?.length&&!level.coloredGrids?.length);
const pieces=level.blocks.filter(block=>block.shutterId==='lift');assert.equal(pieces.length,6);assert.equal(new Set(pieces.map(b=>b.color)).size,6);
for(const p of pieces)assert(!p.movementAxis&&!p.star&&!p.lockedBy&&!p.keyId&&!p.timedBombSeconds&&(!p.layers||p.layers.length===1));
assert.equal(pieces.filter(p=>p.frozen>0).length,2);assert(pieces.filter(p=>p.frozen>0).every(p=>p.frozen===3));
const model=new api.PuzzleModel(level),base=model.snapshot();base.blocks=base.blocks.filter(b=>b.shutterId==='lift');base.shutters.forEach(s=>s.revealed=true);base.gates.forEach(g=>g.frozen=0);base.cleared=13;base.started=true;base.autonomousStarted=true;base.complete=false;
for(const b of base.blocks)b.frozen=b.frozen>0?ice:0;
const width=7,playable=new Set(level.playable.map(p=>p.join(','))),bit=(x,y)=>1n<<BigInt(y*width+x),STEPS=[[-1,0],[1,0],[0,-1],[0,1]],SIDES=['left','right','top','bottom'],pow=pieces.map((_,i)=>64**i),REMOVED=63;
const tables=[],verification={validPlacements:0,singleCellExitCollisionProbes:0,pointerChoices:0};
// Static space and collision predicates are precomputed from the real model.
// No gates, timers, keys, layers or autonomous mechanisms can change this
// isolated post-lift graph. Both ice counters equal max(0, initial-clears).
for(const [i,piece]of pieces.entries()){
 const placements=Array(64).fill(null);
 for(let y=0;y<9;y++)for(let x=0;x<7;x++){
  const cells=piece.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(c=>!playable.has(c.join(','))))continue;
  const pos=y*7+x,mask=cells.reduce((m,[cx,cy])=>m|bit(cx,cy),0n),single=structuredClone(base),block={...structuredClone(base.blocks[i]),x,y,frozen:0};single.blocks=[block];model.restore(single);
  const sides=model.possibleExitSides(model.getBlock(piece.id));assert(sides.length<=1,'Unique colour exit expected');let exit=null;
  if(sides.length){
   const side=sides[0],match=model.resolveExitAttempt(model.getBlock(piece.id),side).match;assert(match);const portal=match.portal;
   const horizontal=side==='left'||side==='right',negative=side==='left'||side==='top',normalOffsets=piece.shape.map(p=>p[horizontal?0:1]),normal=horizontal?x:y;
   const boundary=negative?portal.origin[horizontal?0:1]:portal.origin[horizontal?0:1]+1;
   const distance=negative?normal+Math.max(...normalOffsets)+1-boundary:boundary-normal-Math.min(...normalOffsets);
   let sweep=0n;for(let t=0;t<=distance;t++)for(const[cx,cy]of cells){const sx=cx+(horizontal?(negative?-t:t):0),sy=cy+(!horizontal?(negative?-t:t):0);if(playable.has([sx,sy].join(',')))sweep|=bit(sx,sy);}
   const candidates=api.matchingContinuousExitPortals(single,block,sides),[dx,dy]=block.shape[0],point={x:x+dx+.5,y:y+dy+.5};
   for(const inferred of [undefined,...SIDES]){const choice=api.choosePortalReleaseCandidate(candidates,point,{innerX:0,innerY:0,innerWidth:7,innerHeight:9,cell:1},inferred);assert.equal(choice?.portal.side,side);verification.pointerChoices++;}
   // Collision is a union over obstacle cells. Exhaustively checking every
   // playable singleton against the runtime proves this sweep mask exactly.
   for(const [cx,cy]of level.playable){if(mask&bit(cx,cy))continue;const probe=structuredClone(single);probe.blocks.push({id:'review-obstacle',color:'orange',layers:['orange'],x:cx,y:cy,shape:[[0,0]],frozen:0});model.restore(probe);assert.equal(model.exitAttemptStatus(piece.id,side)==='ok',(sweep&bit(cx,cy))===0n,`Sweep ${piece.id}/${pos}/${cx},${cy}`);verification.singleCellExitCollisionProbes++;}
   exit={side,sweep};
  }
  placements[pos]={x,y,mask,exit,neighbors:[]};verification.validPlacements++;
 }
 for(const placement of placements.filter(Boolean))for(const [direction,[dx,dy]]of STEPS.entries()){const x=placement.x+dx,y=placement.y+dy;if(x<0||x>=7||y<0||y>=9)continue;const p=y*7+x;if(placements[p])placement.neighbors.push({p,direction});}
 tables.push(placements);
}
const encode=positions=>positions.reduce((n,p,i)=>n+p*pow[i],0),decode=code=>pow.map(p=>Math.floor(code/p)%64),start=encode(pieces.map(p=>p.y*7+p.x));
const snapshot=code=>{const s=structuredClone(base),pos=decode(code),clears=pos.filter(p=>p===REMOVED).length;s.blocks=s.blocks.flatMap((block,i)=>pos[i]===REMOVED?[]:[{...block,x:pos[i]%7,y:Math.floor(pos[i]/7),frozen:pieces[i].frozen?Math.max(0,ice-clears):0}]);s.cleared=13+clears;s.complete=s.blocks.length===0;return s;};
const dynamicSamples=[];const visited=new Set(),seeded=new Set([start]),seeds=[{code:start,parentComponent:null}],components=[],began=Date.now();let transitions=0,clearTransitions=0,terminal=null,termination='exhausted';
outer:for(let seedIndex=0;seedIndex<seeds.length;seedIndex++){
 const seed=seeds[seedIndex];if(visited.has(seed.code))continue;
 const index=components.length,component={index,seed:seed.code,parentComponent:seed.parentComponent,entry:seed.entry??null,states:0,cleared:decode(seed.code).filter(p=>p===REMOVED).length,clearBlocks:[],clearTransitions:0};
 const queue=[seed.code];visited.add(seed.code);const outgoing=new Set();
 for(let cursor=0;cursor<queue.length;cursor++){
  if(visited.size>maxStates||Date.now()-began>maxMs){termination=visited.size>maxStates?'max-states':'deadline';break outer;}
  const code=queue[cursor],pos=decode(code),clears=pos.filter(p=>p===REMOVED).length;component.states++;if(cursor===0||(dynamicSamples.length<500&&cursor%997===0))dynamicSamples.push(code);
  let occupancy=0n;for(let i=0;i<6;i++)if(pos[i]!==REMOVED)occupancy|=tables[i][pos[i]].mask;
  const clear=(pieceIndex,fromPosition,moveDirection)=>{const next=code+(REMOVED-pos[pieceIndex])*pow[pieceIndex];clearTransitions++;component.clearTransitions++;outgoing.add(pieces[pieceIndex].id);if(!seeded.has(next)){seeded.add(next);seeds.push({code:next,parentComponent:index,entry:{fromCode:code,pieceIndex,fromPosition,moveDirection}});}};
  for(let i=0;i<6;i++){
   if(pos[i]===REMOVED||(pieces[i].frozen>0&&clears<ice))continue;
   const current=tables[i][pos[i]],others=occupancy^current.mask;
   if(current.exit&&(current.exit.sweep&others)===0n){clear(i,pos[i],null);continue;}
   for(const move of current.neighbors){const nextPlacement=tables[i][move.p];if(nextPlacement.mask&others)continue;transitions++;
    if(nextPlacement.exit&&(nextPlacement.exit.sweep&others)===0n){clear(i,move.p,move.direction);continue;}
    const next=code+(move.p-pos[i])*pow[i];if(!visited.has(next)){visited.add(next);queue.push(next);}
   }
  }
 }
 component.clearBlocks=[...outgoing];components.push(component);
 if(component.cleared<6&&component.clearTransitions===0){terminal={component:index,code:seed.code,snapshot:snapshot(seed.code)};termination='deadlock-component';break;}
}
const status=terminal?'FAIL_DEADLOCK':termination==='exhausted'?'PASS_ALL_REACHABLE_STATES':'UNKNOWN';

const dynamicChecks=[];
const runtimeCode=state=>encode(pieces.map(piece=>{const block=state.blocks.find(b=>b.id===piece.id);return block?block.y*7+block.x:REMOVED;}));
for(const code of dynamicSamples){
 const s=snapshot(code),pos=decode(code),clears=pos.filter(p=>p===REMOVED).length,expected=new Set(),actual=new Set();let occupancy=0n;
 for(let i=0;i<6;i++)if(pos[i]!==REMOVED)occupancy|=tables[i][pos[i]].mask;
 for(let i=0;i<6;i++){
  if(pos[i]===REMOVED||(pieces[i].frozen>0&&clears<ice))continue;
  const p=tables[i][pos[i]],others=occupancy^p.mask;
  if(p.exit&&(p.exit.sweep&others)===0n){expected.add(code+(REMOVED-pos[i])*pow[i]);continue;}
  for(const move of p.neighbors){const dest=tables[i][move.p];if(dest.mask&others)continue;expected.add(code+((dest.exit&&(dest.exit.sweep&others)===0n?REMOVED:move.p)-pos[i])*pow[i]);}
 }
 const live=()=>{const m=new api.PuzzleModel(level);m.restore(s);m.beginAction();return m;};
 const auto=(m,id,previous)=>{const block=m.getBlock(id);if(!block||!m.isBlockActive(block))return undefined;const possible=m.possibleExitSides(block);if(!possible.length)return undefined;const state=m.snapshot(),candidates=api.matchingContinuousExitPortals(state,block,possible),[dx,dy]=block.shape[0];let inferred;if(previous)inferred=block.x<previous[0]?'left':block.x>previous[0]?'right':block.y<previous[1]?'top':'bottom';return api.choosePortalReleaseCandidate(candidates,{x:block.x+dx+.5,y:block.y+dy+.5},{innerX:0,innerY:0,innerWidth:7,innerHeight:9,cell:1},inferred)?.portal.side;};
 const accept=m=>{assert(m.commitAction());const after=m.snapshot(),nextCode=runtimeCode(after);assert.deepEqual(after.blocks.map(({id,x,y,frozen})=>({id,x,y,frozen})),snapshot(nextCode).blocks.map(({id,x,y,frozen})=>({id,x,y,frozen})));assert(after.gates.every(g=>g.frozen===0));assert(after.shutters.every(g=>g.revealed));actual.add(nextCode);};
 for(const block of s.blocks){
  let m=live(),side=auto(m,block.id);if(side){assert(m.tryExit(block.id,side).ok);accept(m);continue;}
  for(const[dx,dy]of STEPS){m=live();if(!m.moveBlockStep(block.id,block.x+dx,block.y+dy))continue;side=auto(m,block.id,[block.x,block.y]);if(side)assert(m.tryExit(block.id,side).ok);accept(m);}
 }
 assert.deepEqual([...actual].sort((a,b)=>a-b),[...expected].sort((a,b)=>a-b),'Dynamic model transition set '+code);dynamicChecks.push({code,clears,transitions:actual.size});
}

for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h);
const result={createdAt:new Date().toISOString(),status,termination,ruleVersion:lock.activeVersion,levelSha256:digest(level),candidateFile,candidateSha256:digest(fs.readFileSync(candidateFile)),bindings,scope:{inventory:pieces.map(({id,color,shape,frozen,x,y})=>({id,color,shape,frozen:frozen?ice:0,x,y})),visibleLift:true,externalBlocks:0,externalClearEvents:0,allGatesThawed:true,initialFrozenCount:ice,fullCampaignNoDeadlockClaim:false},method:'Enumerate all canonical unit moves and first-contact clears. Non-clearing unit edges are reversible because both endpoints lack that block auto-exit; flood each connected component. Clear edges strictly reduce inventory. Every reachable nonterminal component must have an outgoing clear, which recursively proves a winning continuation from every state after true exhaustion.',verification,dynamicChecks,limits:{maxStates,maxMs},elapsedMs:Date.now()-began,visitedStates:visited.size,seeds:seeds.length,components,transitions,clearTransitions,terminal,queueExhausted:termination==='exhausted',optimalityCertified:false};
fs.mkdirSync(ROOT,{recursive:true});const output=ROOT+`/runtime-checked-hidden-ice${ice}-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status,termination,states:visited.size,components:components.length,transitions,clearTransitions,verification,elapsedMs:result.elapsedMs,terminal:terminal?.snapshot.blocks.map(({id,x,y,frozen})=>({id,x,y,frozen}))}));
