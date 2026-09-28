import fs from 'node:fs';
import {build} from 'esbuild';
import {digest,loadPreviewCore} from '../../../revised-preview-validation-v160.mjs';
import {loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
const file='deliverables/remake131-140-v146-20260924/agent136-138/assist140-big19pairs-0-1790475598493.json',d=JSON.parse(fs.readFileSync(file));
const [{api},spatial,b]=await Promise.all([loadPreviewCore(),loadSpatialApi(),build({stdin:{resolveDir:process.cwd(),contents:"export {FORMAL_BLOCK_SHAPES} from './src/game/formalBlockShapes.ts'"},bundle:true,write:false,format:'esm',platform:'node'})]);
const {FORMAL_BLOCK_SHAPES}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
const shapes=FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length===4&&s.cells.length<s.canonicalWidth*s.canonicalHeight),colors=['red','blue','green','yellow','orange','purple','pink','cyan'];
const support=shapes.map(s=>({shapeId:s.shapeId,cells:s.cells,supportedColors:colors.filter(color=>api.auditCandidateBlockArt({blocks:[{id:'probe',shape:s.cells,color}]}).passed)}));
const target=d.level.blocks.find(b=>b.id==='n140-hidden-3'),old=api.auditCandidateBlockArt(d.level);
const adjacent=(a,b)=>a.shutterId===b.shutterId&&a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
const exactRecolors=colors.map(color=>({color,art:api.auditCandidateBlockArt({blocks:[{...target,color}]}).passed,adjacentSame:d.level.blocks.filter(b=>b.id!==target.id&&b.color===color&&adjacent(target,b)).map(b=>b.id)})).filter(r=>r.art&&!r.adjacentSame.length);
const hidden=d.level.blocks.filter(b=>b.shutterId),cover=d.level.shutters[0],key=p=>p.join(','),cells=Array.from({length:cover.width*cover.height},(_,i)=>[cover.x+i%cover.width,cover.y+Math.floor(i/cover.width)]),allowed=new Set(cells.map(key));
const options=[],indices=[hidden.findIndex(b=>b.id==='n140-hidden-3'),hidden.findIndex(b=>b.id==='n140-hidden-4')];
for(const first of support.filter(s=>s.supportedColors.includes(target.color)))for(const second of support.filter(s=>s.supportedColors.includes(hidden[indices[1]].color)))for(let shellOrientation=0;shellOrientation<8;shellOrientation++){
 const pieces=hidden.map(b=>structuredClone(b));pieces[indices[0]].shape=first.cells;pieces[indices[1]].shape=second.cells;
 let shellIndex=0;for(const p of pieces)if(p.layers){const n=p.shape.length,horizontal=(shellOrientation>>(shellIndex++))&1;p.shape=Array.from({length:n},(_,i)=>horizontal?[i,0]:[0,i]);}
 const occ=new Set(),out=[],used=new Set();let calls=0;
 function go(){if(++calls>10000)return false;const cell=cells.find(p=>!occ.has(key(p)));if(!cell)return used.size===pieces.length;
  for(let i=0;i<pieces.length;i++)if(!used.has(i))for(const [dx,dy]of pieces[i].shape){
   const block={...pieces[i],x:cell[0]-dx,y:cell[1]-dy},cc=block.shape.map(([u,v])=>key([block.x+u,block.y+v]));
   if(cc.some(k=>!allowed.has(k)||occ.has(k)))continue;if(out.some(b=>b.color===block.color&&adjacent(b,block)))continue;
   used.add(i);out.push(block);cc.forEach(k=>occ.add(k));if(go())return true;out.pop();used.delete(i);cc.forEach(k=>occ.delete(k));
  }return false;
 }
 if(go()){
  const level={...d.level,blocks:[...d.level.blocks.filter(b=>!b.shutterId),...out]},coverage=auditHiddenCoverage(level),art=api.auditCandidateBlockArt(level);
  spatial.validateLevel(level);
  options.push({shape3:first.shapeId,shape4:second.shapeId,shellOrientation,hidden:out,coverage,artPassed:art.passed,artIssues:art.issues,sourceMapRequired:true,solverNotRun:true});
 }
}
const report={input:file,inputSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),oldArt:old,support,exactRecolors,repackedSupportedAlternatives:options,note:'Only art/space/adjacency proposals; no new candidate route or floor is claimed, original candidate remains rejected for orange shape11.',sourcesViewed:['.codex-temp/video-audit-135-169/openings/level-140.jpg','.codex-temp/video-audit-135-169/137-144/samples1s/sec-00377.jpg','.codex-temp/video-audit-135-169/137-144/samples1s/sec-00417.jpg'].map(file=>({file,sha256:digest(fs.readFileSync(file))})),starConflict:{retainedMoveTarget:37,bodies:19,mandatoryShellPeels:3,certifiedNecessaryRepositions:16,totalDragLowerBound:38,withoutTools:true,moveStarAchievable:false}};
const out=`deliverables/remake131-140-v146-20260924/agent131-134/assist140-art-alternatives-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,issues:old.issues,support,exactRecolors,repacked:options.map(o=>({shape3:o.shape3,shape4:o.shape4,art:o.artPassed}))}));
