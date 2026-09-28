import fs from 'node:fs';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
export const OUT='deliverables/campaign121-130-v146-20260924/round3-b';
export const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const fileHash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
const bundled=await build({stdin:{contents:`export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';export {validateGeneratorMouthSpawn} from './src/core/generatorMouthSpawnGeometry.ts';export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const runtime=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64')).catch(error=>{process.stderr.write('Runtime load failure: '+error.message+'\n');process.exit(1);});
// Immutable campaign audit holds the same125–127 base read from actual LEVELS
// at this task's entry. Unrelated concurrent118 integration briefly broke the
// global export; final root validation still imports the final formal LEVELS.
export const api={...runtime,LEVELS:JSON.parse(fs.readFileSync('deliverables/campaign121-130-v146-20260924/input-audit-1790434782575.json')).rows.map(r=>r.level)};
export const SH={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],SQ:[[0,0],[1,0],[0,1],[1,1]],R6:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],L3:[[0,0],[0,1],[1,1]]};
SH.L4=[[0,0],[1,0],[2,0],[0,1]];SH.T4=[[1,0],[0,1],[1,1],[2,1]];
export function packRegion(x,y,w,h,types,r){let used=new Set(),placed=[];const cells=Array.from({length:w*h},(_,n)=>[n%w,Math.floor(n/w)]);function rec(todo){if(!todo.length)return used.size===w*h;const first=cells.find(c=>!used.has(c.join(','))),seen=new Set();for(let i=0;i<todo.length;i++){let type=todo[i];if(seen.has(type))continue;seen.add(type);for(let p of shuffle(cells,r)){const cs=SH[type].map(([dx,dy])=>[p[0]+dx,p[1]+dy]);if(!cs.some(c=>c[0]===first[0]&&c[1]===first[1]))continue;if(cs.some(([a,b])=>a<0||a>=w||b<0||b>=h||used.has(`${a},${b}`)))continue;cs.forEach(c=>used.add(c.join(',')));placed.push({x:x+p[0],y:y+p[1],type});let next=[...todo];next.splice(i,1);if(rec(next))return true;placed.pop();cs.forEach(c=>used.delete(c.join(',')));}}return false;}return rec(types)?placed:null;}
export const source=JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json')).levels;
export const rngFor=seed=>{let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};};
export const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function base(id,difficulty){let l=structuredClone(api.LEVELS.find(l=>l.id===id));l.difficulty=difficulty;l.blocks=[];l.gates=[];l.shutters=[];l.generators=[];return l;}
export function block(l,x,y,shape,color,extra={}){let b={id:`r3-${l.id}-${l.blocks.length}`,x,y,shape:SH[shape],color,...extra};l.blocks.push(b);return b;}
export function gate(l,color,side,offset,size,frozen){l.gates.push({id:`r3-${l.id}-${color}`,color,side,offset,size,...(frozen?{frozen}:{})});}
export function adjacency(level){let queue=new Set(level.generators.flatMap(g=>g.queueBlockIds)),bs=level.blocks.filter(b=>!b.shutterId&&!queue.has(b.id)),map=new Map(),conflicts=[];bs.forEach(b=>b.shape.forEach(([dx,dy])=>map.set(`${b.x+dx},${b.y+dy}`,b)));for(const [k,b]of map){let[x,y]=k.split(',').map(Number);for(let[dx,dy]of[[1,0],[0,1]]){let c=map.get(`${x+dx},${y+dy}`);if(c&&b!==c&&b.color===c.color)conflicts.push([b.id,c.id]);}}return {passed:!conflicts.length,conflicts};}
export function audit(level){api.validateLevel(level);let snapshot=new api.PuzzleModel(level).snapshot();let r={opening:auditOpeningCoverage(snapshot),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),adjacency:adjacency(level),native:{passed:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)}};r.passed=Object.values(r).every(x=>x.passed);return r;}
export function save(label,data){fs.mkdirSync(OUT,{recursive:true});let p=`${OUT}/${label}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify({generatedAt:new Date().toISOString(),activeVersion:lock.activeVersion,...data},null,2)+'\n',{flag:'wx'});return p;}
