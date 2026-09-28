import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../common.mjs';
const OUT='deliverables/remake171-180-20260927/author175-177/assist171';
const sourcePath='deliverables/remake171-180-20260927/author171-174/source171-final-1790525997746.json';
const source=JSON.parse(fs.readFileSync(sourcePath));
for(const[p,h]of Object.entries(source.bindings))assert.equal(digest(fs.readFileSync(p)),h);
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const opening=[
 {id:'source-open-0',color:'red',kind:'H2',shape:rect(2,1),x:2,y:0},
 {id:'source-open-1',color:'purple',kind:'H2',shape:rect(2,1),x:4,y:0},
 {id:'source-open-2',color:'pink',kind:'H2',shape:rect(2,1),x:2,y:1},
 {id:'source-open-3',color:'blue',kind:'H2',shape:rect(2,1),x:4,y:1},
 {id:'source-open-4',color:'yellow',kind:'H2',shape:rect(2,1),x:2,y:2},
 {id:'source-open-5',color:'green',kind:'H2',shape:rect(2,1),x:4,y:2},
 {id:'source-open-6',color:'red',kind:'SQ2',shape:rect(2,2),x:0,y:3},
 {id:'source-open-7',color:'blue',kind:'SQ2',shape:rect(2,2),x:2,y:3},
 {id:'source-open-8',color:'purple',kind:'SQ2',shape:rect(2,2),x:4,y:3},
 {id:'source-open-9',color:'yellow',kind:'SQ2',shape:rect(2,2),x:6,y:3},
 {id:'source-open-10',color:'green',kind:'L3',shape:[[1,0],[0,1],[1,1]],x:0,y:1},
 {id:'source-open-11',color:'cyan',kind:'L3',shape:[[0,0],[0,1],[1,1]],x:6,y:1},
];
const hidden=[
 {id:'source-star-0',color:'red',kind:'L3',shape:[[0,0],[1,0],[0,1]],x:0,y:0},
 {id:'source-star-1',color:'yellow',kind:'H3',shape:rect(3,1),x:2,y:0},
 {id:'source-star-2',color:'green',kind:'L4',shape:[[0,0],[1,0],[2,0],[2,1]],x:5,y:0},
 {id:'source-star-3',color:'green',kind:'H3',shape:rect(3,1),x:1,y:1},
 {id:'source-star-4',color:'pink',kind:'H3',shape:rect(3,1),x:4,y:1},
 {id:'source-star-5',color:'purple',kind:'H3',shape:rect(3,1),x:0,y:2},
 {id:'source-star-6',color:'cyan',kind:'H3',shape:rect(3,1),x:5,y:2},
 {id:'source-star-7',color:'green',kind:'H3',shape:rect(3,1),x:3,y:3},
 {id:'source-star-8',color:'red',kind:'H3',shape:rect(3,1),x:2,y:4},
].map(b=>({...b,star:true}));
const footprint=bs=>bs.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(','))),openCells=footprint(opening),hiddenCells=footprint(hidden);
assert.equal(openCells.length,34);assert.equal(new Set(openCells).size,34);assert.equal(hiddenCells.length,28);assert.equal(new Set(hiddenCells).size,28);
assert.deepEqual(opening.map(b=>[b.color,b.kind]),source.opening.pieces);assert.deepEqual(hidden.map(b=>[b.color,b.kind]),source.hidden.pieces);
const covered=source.curtains.flatMap(c=>rect(c.sourceRect.width,c.sourceRect.height).map(([x,y])=>[x+c.sourceRect.x,y+c.sourceRect.y].join(',')));
assert.equal(new Set(covered).size,34);for(const k of hiddenCells)assert(covered.includes(k));const blanks=covered.filter(p=>!hiddenCells.includes(p)).map(p=>p.split(',').map(Number));assert.equal(blanks.length,6);
const report={status:'INDEPENDENT_VISUAL_SOURCE171_PASS',createdAt:new Date().toISOString(),sourcePath,sourceSha256:digest(fs.readFileSync(sourcePath)),frameBindings:source.bindings,visualInspection:{method:'The reviewing agent directly viewed all10 original source JPEGs with view_image. This report records human-visible observations plus independent exact grid reconstruction; it does not claim fresh video playback, device testing, solver qualification or candidate approval.',frame220:'Pristine1:30:12 ordinary bodies, five visible count12 curtains, top red and left pink/cyan and bottom yellow/green/blue shown as thin colored bars inside blue closed flip frames. Top purple ordinary exit already has an outward white triangle. All12 ordinary bodies visible and no special shells/ice icons.',frame222:'First upper purple H2 has departed. All five curtains show11. The six formerly barred doors now simultaneously show outward triangles on full colored panels, independently corroborating all six initial flip states closed. Purple ordinary keeps its arrow.',frame236:'Partial ordinary board and curtains7; source special door mechanism remains visible. This moving frame is corroboration, not substituted for pristine inventory.',frame242:'Two ordinary bodies remain (greenH2 and selected blueH2), all five curtains2. Hidden bodies still covered, supporting12 ordinary events rather than old15 full-inventory truth.',frame244:'Five curtains have just opened with celebratory particles. Nine hidden star silhouettes already occupy the same anchors later visible cleanly in246.',frame246:'Clean first full reveal: redL3 upper-left; yellowH3 top-middle; greenL4 upper-right; greenH3 and pinkH3 middle; purpleH3 left/cyanH3 right next row; lower greenH3; bottom redH3. Every one has star markings. Nine bodies occupy28 of34 cover cells.',frame248:'Same nine hidden bodies and anchors as246, before lower-green movement, so246 is not a post-removal inventory.',frame250:'Lower green moved horizontally one grid cell to the right: an unambiguous3x1 H3, no fourth stem.',frame252:'That lower green now appears at right middle as H3; the distinct upper-right green L4 is still present. This rules out the former mistaken second hidden L4.',frame270:'Last upper green visibly top horizontal3+right lower1, confirming the sole greenL4 silhouette independently of adjacent green blocks at first reveal.'},coordinateConvention:'Two independent local source panels, both x0..7. Opening y0 at upper red/purple row; hidden y0 at top red/yellow/green star row. These coordinates reconstruct source facts, not authored candidate positions or the frozen76-cell baseline.',opening:{count:12,area:34,pieces:opening},hidden:{count:9,area:28,coverArea:34,pieces:hidden,blankCells:blanks,note:'Individual source bodies cross visual curtain subdivisions; physical authored hidden batches must each truly fill their own area. No missing inventory is inferred from the six original source blanks.'},doors:{flipInitialClosed:['red','pink','cyan','yellow','green','blue'],ordinary:'purple',star:['cyan','green','pink','green','yellow','red','purple'],duplicateSourceStarGreen:2,starArrangement:'Top cyan andgreen, left pink andgreen, right yellow andred, bottompurple. Same-type duplicate green requires the already documented minimal unique-color adaptation; observed source remains recorded asgreen.'},curtains:{count:5,initialValues:[12,12,12,12,12],sourceRectangles:source.curtains.map(c=>c.sourceRect),simultaneousReveal:true},otherVisibleMechanisms:{shellBodies:0,numericIceBodies:0,iceDoors:0,axes:0,generators:0,lifts:0,bombs:0},boundary:'Confirms the current source171-final ledger, including its corrections. Any authored12-opening/9-hidden color or shape substitutions and moved/resized curtain regions must be separately listed under v1.106. Not a candidate spatial/difficulty/route/Pointer acceptance.'};
const out=OUT+'/source-visual-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,opening:12,hidden:9,area:28,blankCells:blanks,closedFlipDoors:6}));
