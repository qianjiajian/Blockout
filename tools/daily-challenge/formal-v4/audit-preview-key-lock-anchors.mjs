import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

// Geometry of already captured opening markers only. No model, construction,
// route search, candidate mutation, or public-ledger API is used.
const [output,...previewFiles]=process.argv.slice(2);assert(output&&previewFiles.length);
const own='tools/daily-challenge/formal-v4/audit-preview-key-lock-anchors.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),bindings={},rows=[];
async function bytes(p,expected){const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,p);bindings[p]=h;return b;}
async function json(p,expected){return JSON.parse(await bytes(p,expected));}
async function moduleFrom(p){const c=await build({entryPoints:[p],bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(c.metafile.inputs))await bytes(f);return import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));}
await bytes(own);const environment=await json('snapshot-environment.json');assert.equal(environment.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');
assert.equal(path.resolve(environment.workspace).toLowerCase(),path.resolve('.').toLowerCase());
await bytes('src/game/ColorEscapeGame.ts',environment.historicalUI.sha256);
const badge=await moduleFrom('src/game/blockBadge.ts'),marker=await moduleFrom('src/game/keyLockMarkerArt.ts'),art=await moduleFrom('src/game/artManifest.ts');
const contains=(points,[x,y])=>points.some(([cx,cy])=>x>=cx&&x<cx+1&&y>=cy&&y<cy+1);
function intersectedCells(rect){const out=[];for(let y=Math.floor(rect.top);y<Math.ceil(rect.bottom);y++)for(let x=Math.floor(rect.left);x<Math.ceil(rect.right);x++)
 if(Math.min(x+1,rect.right)>Math.max(x,rect.left)&&Math.min(y+1,rect.bottom)>Math.max(y,rect.top))out.push([x,y]);return out;}
for(const file of previewFiles){const p=await json(file);assert.equal(p.status,'CANDIDATE_OPENINGS_CAPTURED_NOT_FORMAL');
 assert.equal(p.sourceBindings['src/game/ColorEscapeGame.ts'],environment.historicalUI.sha256);
 for(const row of p.rows){const q=await json(row.receipt,row.receiptSha256);assert(q.accepted);await bytes(row.image.path,row.image.sha256);
  const cell=row.board.cell,details=[];
  for(const b of q.level.blocks){if(!b.keyId&&!b.lockedBy)continue;
   const points=b.shape.map(([x,y])=>[b.x+x,b.y+y]),xs=points.map(a=>a[0]),ys=points.map(a=>a[1]);
   const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   const proposedCell=badge.chooseBlockBadgeCell(points);
   for(const kind of ['key','lock']){if(!(kind==='key'?b.keyId:b.lockedBy))continue;
    const color=marker.keyLockMarkerColor(kind==='key'?b.keyId:b.lockedBy,q.level);
    const png=art.GAME_ART.gameplay.videoParity[kind==='key'?'keyTokens':'chainLocks'][color];
    const data=await bytes(path.posix.join('public',png));assert.equal(data.subarray(1,4).toString(),'PNG');
    const ratio=data.readUInt32BE(16)/data.readUInt32BE(20),height=kind==='key'?(b.movementAxis?0.48:0.66):0.78;
    const base=kind==='key'?[minX+.5,maxY+.5]:[(minX+maxX+1)/2,(minY+maxY+1)/2];
    const center=[base[0],base[1]+marker.keyLockMarkerVerticalOffset(cell)/cell];
    const width=height*ratio,rect={left:center[0]-width/2,right:center[0]+width/2,top:center[1]-height/2,bottom:center[1]+height/2};
    const outside=intersectedCells(rect).filter(p=>!points.some(q=>p[0]===q[0]&&p[1]===q[1]));
    const otherBodies=q.level.blocks.filter(other=>other.id!==b.id&&other.shape.some(([x,y])=>outside.some(([xx,yy])=>other.x+x===xx&&other.y+y===yy))).map(x=>x.id);
    const countCenter=kind==='lock'?[center[0],center[1]+.17+marker.KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS+marker.KEY_LOCK_COUNT_VERTICAL_OFFSET_PX/cell]:null;
    details.push({blockId:b.id,kind,color:b.color,shape:b.shape,lockCount:kind==='lock'?b.lockCount:null,
     nominalAnchor:base,nominalAnchorInsideOwnCell:contains(points,base),drawImageAnchor:center,drawAnchorInsideOwnCell:contains(points,center),
     countAnchor:countCenter,countAnchorInsideOwnCell:countCenter?contains(points,countCenter):null,
     imageRectCellUnits:rect,imageRectIncludesTransparentPixels:true,imageRectCellsOutsideBody:outside,intersectedOtherBodies:otherBodies,
     visualOcclusionMustBeConfirmedInScreenshot:true,suggestedOccupiedCell:proposedCell,suggestedCellCenter:[proposedCell[0]+.5,proposedCell[1]+.5]});
   }
  }
  rows.push({formalId:row.formalId,receipt:{path:row.receipt,sha256:row.receiptSha256},image:row.image,markers:details,
   flipDoors:(q.level.flipDoors??[]).map(g=>({id:g.id,color:g.color,side:g.side,offset:g.offset,size:g.size,open:g.open}))});
 }
}
for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h);
const report={status:'READONLY_CAPTURED_OPENING_MARKER_GEOMETRY',fileBindings:bindings,rows,
 markerCount:rows.reduce((n,r)=>n+r.markers.length,0),nominalAnchorsOutside:rows.flatMap(r=>r.markers.filter(x=>!x.nominalAnchorInsideOwnCell).map(x=>({formalId:r.formalId,...x}))),
 drawAnchorsOutside:rows.flatMap(r=>r.markers.filter(x=>!x.drawAnchorInsideOwnCell).map(x=>({formalId:r.formalId,...x}))),
 imageRectsOverOtherBodies:rows.flatMap(r=>r.markers.filter(x=>x.intersectedOtherBodies.length).map(x=>({formalId:r.formalId,...x}))),
 recommendation:'For daily mode only, derive an occupied-cell anchor from chooseBlockBadgeCell, then keep the complete marker and count bounds within that cell. Share the same anchor with key-to-lock animation endpoints. Preserve mainline and mathematical snapshot bytes.',
 executionWorkspace:path.resolve('.'),currentRuntimeValidationClaimed:false,newSearches:0,newClaims:0,formalReady:false};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,sha256:hash(await fs.readFile(output)),candidates:rows.length,markers:report.markerCount}));
