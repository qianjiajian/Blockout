import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
const directory='deliverables/daily-formal-v3-20261008/design/macro-region-preview-01',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=read(`${directory}/report.json`),canvas=read(`${directory}/canvas-preview/report.json`),runtime=await loadBoundedRuntime();
const points=p=>JSON.stringify([...p].sort((a,b)=>a[1]-b[1]||a[0]-b[0])),stock=l=>JSON.stringify(l.blocks.map(b=>points(b.shape)).sort()),known=[],seen=new Set();
function add(file,l){if(!l?.blocks)return;const h=levelSha256(l);if(seen.has(h))return;seen.add(h);known.push({file,fileSha256:sha(file),levelSha256:h,level:l});}
for(const f of read(report.index.path).files){const q=read(f);add(f,q.level);}
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);else if(/^candidate.*\.json$/.test(e.name)){const q=read(p);if(q.accepted&&q.level)add(p,q.level);}}}
scan('deliverables/daily-formal-v3-20261008/design');for(const r of report.references)if(!r.excluded)add(r.reference,read(r.reference).level);
const old=read(report.oldIndex.path).entries.map(e=>({path:e.path,sha256:sha(e.path),level:read(e.path).level}));
const rows=[],pairwise=[];
for(const row of report.candidates){
 const q=read(row.path),p=q.provenance,ref=read(p.reference).level,level=q.level,m=p.macro,source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId);
 assert.equal(sha(row.path),row.fileSha256);assert.equal(sha(p.reference),p.referenceFileSha256);assert.equal(levelSha256(level),q.levelSha256);
 assert.equal(q.accepted,false);assert.equal(q.formalReady,false);assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.drags,null);
 const idsA=new Set(m.a.ids),idsB=new Set(m.b.ids);assert(![...idsA].some(id=>idsB.has(id)));
 assert.equal(points(m.a.points),points(ref.blocks.filter(b=>idsA.has(b.id)).flatMap(absoluteCells)));
 assert.equal(points(m.b.points),points(ref.blocks.filter(b=>idsB.has(b.id)).flatMap(absoluteCells)));
 const [dx,dy]=m.translation;assert.equal(points(m.a.points.map(([x,y])=>[x+dx,y+dy])),points(m.b.points));
 assert(m.areaFraction>=.35&&m.bodyCount>=8&&m.quadrants.length>=3);assert.equal(m.area,m.a.points.length+m.b.points.length);
 const translated=structuredClone(ref);for(const b of translated.blocks){if(idsA.has(b.id)){b.x+=dx;b.y+=dy;}else if(idsB.has(b.id)){b.x-=dx;b.y-=dy;}}
 const edge=new Set(p.boundaryRetileBodyIds);assert.equal(edge.size,2);
 assert.equal(points(translated.blocks.filter(b=>edge.has(b.id)).flatMap(absoluteCells)),points(level.blocks.filter(b=>edge.has(b.id)).flatMap(absoluteCells)));
 for(const b of level.blocks.filter(b=>!edge.has(b.id))){const original=translated.blocks.find(o=>o.id===b.id);assert.equal(points(b.shape),points(original.shape));assert.equal(b.x,original.x);assert.equal(b.y,original.y);}
 assert.notEqual(stock(ref),stock(level));assert(level.blocks.some(b=>b.color!==ref.blocks.find(o=>o.id===b.id).color));
 assert.equal(points(boardCells(ref)),points(boardCells(level)));assert.equal(points(boardCells(source)),points(boardCells(level)));assert.equal(level.width,source.width);assert.equal(level.height,source.height);
 assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(level)));assert.deepEqual(level.gates,ref.gates);
 let maximumExisting=0;for(const k of known)maximumExisting=Math.max(maximumExisting,compareLayouts(level,k.level).footprintSimilarity);
 let maximumOld=0;for(const k of old)maximumOld=Math.max(maximumOld,compareLayouts(level,k.level).footprintSimilarity);
 const nearSource=compareLayouts(level,source).footprintSimilarity;assert(maximumExisting<=.65&&maximumOld<=.75&&nearSource<=.55);
 assert.equal(fs.existsSync(q.failedIdentityCheck.blockedFile),false);
 const shot=canvas.rows.find(r=>r.file===row.path);assert(shot);assert.equal(sha(shot.image),shot.imageSha256);assert.equal(shot.fileSha256,row.fileSha256);assert.equal(shot.errors.length+shot.storage.length+shot.missingWholeBlockIds.length,0);
 rows.push({path:row.path,sha256:row.fileSha256,source:q.sourceLevelId,width:level.width,height:level.height,playableCells:boardCells(level).length,maskSha256:q.sourceMaskSha256,macroArea:m.area,macroFraction:m.areaFraction,macroBodyCount:m.bodyCount,kind:m.kind,maximumExisting,maximumOld,nearSource,reference:compareLayouts(level,ref).footprintSimilarity,image:shot.image,imageSha256:shot.imageSha256,structuralAudit:'PASS'});
}
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const similarity=compareLayouts(read(rows[i].path).level,read(rows[j].path).level).footprintSimilarity;assert(similarity<=.65);pairwise.push({a:i,b:j,similarity});}
for(const b of report.bindings)assert.equal(sha(b.path),b.sha256);for(const [file,h]of Object.entries(canvas.sourceBindings))assert.equal(sha(file),h);
const output={status:'12_STATIC_MACRO_PREVIEWS_AUDITED_NOT_SOLVED',createdAt:new Date().toISOString(),accepted:false,formalReady:false,newSearches:0,productionChanged:false,playerSaveTouched:false,
 report:{path:`${directory}/report.json`,sha256:sha(`${directory}/report.json`)},canvas:{path:`${directory}/canvas-preview/report.json`,sha256:sha(`${directory}/canvas-preview/report.json`)},
 counterClarification:{inspectedRetilePartitions:report.constructedWorlds,enumeratedRetileVariants:report.staticRetileVariants,meaning:'The report field constructedWorlds counts inspected static retile partitions, not a complete raw-game-search budget. Macro enumeration and colouring also materialize static layout objects. No gameplay state search, L/U invocation, ledger claim, or proof budget qualification occurred; do not use 18 as a certified constructor raw count.'},
 sources:[...new Set(rows.map(r=>r.source))],maskCount:new Set(rows.map(r=>r.maskSha256)).size,knownLayouts:known.map(({level,...r})=>r),old450:old.map(({level,...r})=>r),rows,pairwise,
 visualReview:{method:'Both six-card actual-game Canvas contact sheets opened and inspected at full image view.',sheets:canvas.sheets,
  findings:['All 12 boards visibly full, native irregular pieces have complete artwork, no missing blocks or clipped board edges observed.','Macro structures vary: 03 vertical bar field; 02 large rectangles and T body; 04 horizontal row bands; 07 stacked square/strip groups; 08 left horizontal/right vertical fields; 11 compact concave outline.','Four source18 and four source100 drafts remain in this first preview because the runner stops at 12 in reference order. They have different visible partitions, but only six sources/five masks are represented; this is not a full-catalog diversity claim.','Portals are preserved from each reference. These previews show the geometric strategy only; movable starts, solvability, preserved difficulty and mechanism intensity remain unverified.'],
  perImage:['01 vertical left channels and large middle pink rectangle; lower L group.','02 larger SQ/2x3 bodies and central yellow T; little resemblance to 01.','03 long vertical bar clusters around two squares, broad normal board.','04 horizontal bands with side vertical stacks; all seams aligned.','05 pair of large upper rectangles and small central connectors, horizontal lower strip.','06 large right rectangles alongside staggered narrow center.','07 visibly layered pair of SQ2 groups and left vertical strips.','08 left horizontal stack versus top-right vertical bars and lower square pair.','09 central narrow bars and scattered squares, differs from 06–08.','10 native concave L/small body cluster in center; continuous full coverage.','11 compact concave crown outline, many singles and a lower long bar.','12 large lower pink rectangle inside L and vertical strip frame.']},
 limitations:['No complete route or actual lower bound exists for any preview. Parent proof/U is not inherited.','Connected-footprint closure succeeded when straight whole-rectangle cuts were blocked. A zero result means no qualifying exchange was found in the recorded finite domain, not general impossibility.'],proofToolchainSha256:runtime.toolchainSha256};
fs.writeFileSync(`${directory}/structure-and-visual-audit.json`,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,sources:output.sources,masks:output.maskCount,maxExisting:Math.max(...rows.map(r=>r.maximumExisting)),maxOld:Math.max(...rows.map(r=>r.maximumOld)),maxSource:Math.max(...rows.map(r=>r.nearSource)),maxPair:Math.max(...pairwise.map(r=>r.similarity)),newSearches:0}));
