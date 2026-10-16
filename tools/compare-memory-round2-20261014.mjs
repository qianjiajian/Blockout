import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import sharp from 'sharp';

const beforePath=resolve(process.argv[2]),afterPath=resolve(process.argv[3]);
const before=JSON.parse(await readFile(beforePath)),after=JSON.parse(await readFile(afterPath));
assert.equal(before.status,'PASS');assert.equal(after.status,'PASS');assert.equal(before.fixtureSha256,after.fixtureSha256,'Same instrumented browser fixture');
const changedSources=Object.keys(after.sources).filter(name=>before.sources[name]?.sha256!==after.sources[name].sha256).sort();
assert.deepEqual(changedSources,['src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts','src/game/formalBlockShapes.ts']);
assert.deepEqual(after.assetHashes,before.assetHashes,'Identical served asset bytes');
const report={status:'PASS',before:beforePath,after:afterPath,scope:after.scope,changedSources,isolatedOverrides:after.isolatedOverrides,
 timingCaveat:'Same workstation, one sequential sample per case; durations include identical instrumentation and may contain scheduler/other-process noise. Snapshot call counts and actual actions/clocks are the primary deterministic evidence. Object-copy proxy is not total JS allocation or measured memory.',rows:[]};
const pair=(a,b)=>({before:a,after:b,reductionPercent:a?100*(1-b/a):null});
for(const a of after.rows){
 const b=before.rows.find(row=>row.width===a.width&&row.level===a.level);assert(b);assert.equal(a.status,'PASS');assert.equal(b.status,'PASS');
 assert.deepEqual({kind:a.action.kind,id:a.action.block.id,side:a.action.side},{kind:b.action.kind,id:b.action.block.id,side:b.action.side},'Same actual Pointer action');
 assert.deepEqual(a.actionResult.block,b.actionResult.block,'Same moved/exited block outcome');
 for(const key of ['moves','cleared','blockCount','queuedCount'])assert.equal(a.actionResult.state[key],b.actionResult.state[key]);
 const row={width:a.width,level:a.level,windows:{},action:{kind:a.action.kind,id:a.action.block.id,side:a.action.side,outcomeEqual:true},screenshots:[]};
 for(const name of ['opening','playing','resumed']){
  const ap=a[name],bp=b[name];row.windows[name]={
   frameCount:{before:bp.frames.length,after:ap.frames.length},snapshotCallsPerFrame:pair(bp.metrics.snapshotCalls.mean,ap.metrics.snapshotCalls.mean),
   snapshotGraphObjects:{before:bp.snapshotGraphObjects,after:ap.snapshotGraphObjects},objectCopyProxyPerFrame:pair(bp.objectCopyProxyPerFrame,ap.objectCopyProxyPerFrame),
   frameMs:{mean:pair(bp.metrics.frameMs.mean,ap.metrics.frameMs.mean),p50:pair(bp.metrics.frameMs.p50,ap.metrics.frameMs.p50),p95:pair(bp.metrics.frameMs.p95,ap.metrics.frameMs.p95)},
   renderMs:{mean:pair(bp.metrics.renderMs.mean,ap.metrics.renderMs.mean),p50:pair(bp.metrics.renderMs.p50,ap.metrics.renderMs.p50),p95:pair(bp.metrics.renderMs.p95,ap.metrics.renderMs.p95)},
   drawBoardMs:{mean:pair(bp.metrics.drawBoardMs.mean,ap.metrics.drawBoardMs.mean),p50:pair(bp.metrics.drawBoardMs.p50,ap.metrics.drawBoardMs.p50),p95:pair(bp.metrics.drawBoardMs.p95,ap.metrics.drawBoardMs.p95)},
   activeClockSeconds:{before:bp.before.remainingSeconds-bp.after.remainingSeconds,after:ap.before.remainingSeconds-ap.after.remainingSeconds},
  };
 }
 row.pausedClockSeconds={before:b.paused.before.remainingSeconds-b.paused.after.remainingSeconds,after:a.paused.before.remainingSeconds-a.paused.after.remainingSeconds};
 assert.deepEqual(row.pausedClockSeconds,{before:0,after:0});
 for(const suffix of ['opening','after-pointer']){
  const name=`${a.width}-${a.level}-${suffix}.png`,left=await sharp(resolve(dirname(beforePath),name)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),right=await sharp(resolve(dirname(afterPath),name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(left.info,right.info);let mismatchingPixels=0;
  for(let i=0;i<left.data.length;i+=4)if(left.data[i]!==right.data[i]||left.data[i+1]!==right.data[i+1]||left.data[i+2]!==right.data[i+2]||left.data[i+3]!==right.data[i+3])mismatchingPixels++;
  row.screenshots.push({name,fullPixelEqual:mismatchingPixels===0,mismatchingPixels,totalPixels:left.info.width*left.info.height,note:'Natural clock and animated effects were not frozen; nonzero pixel differences are observations, not automatically failures.'});
 }
 report.rows.push(row);
}
const means=field=>report.rows.map(row=>row.windows.opening[field].mean.reductionPercent);
report.summary={cases:report.rows.length,openingSnapshots:report.rows.map(row=>({width:row.width,level:row.level,...row.windows.opening.snapshotCallsPerFrame})),
 openingFrameMeanReductionRangePercent:[Math.min(...means('frameMs')),Math.max(...means('frameMs'))],openingDrawBoardMeanReductionRangePercent:[Math.min(...means('drawBoardMs')),Math.max(...means('drawBoardMs'))],
 screenshotsPixelEqual:report.rows.flatMap(row=>row.screenshots).filter(s=>s.fullPixelEqual).length,screenshotsTotal:report.rows.length*2};
const output=resolve(dirname(dirname(afterPath)),`comparison-${Date.now()}.json`);await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,output,summary:report.summary},null,2));
