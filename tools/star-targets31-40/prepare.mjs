// Reuse only the reviewed input and visual settlement loop; all data gates are task specific.
import fs from 'node:fs';
const root='tools/star-targets31-40';
let loop=fs.readFileSync('tools/star-targets121-130/playtest.mjs','utf8');
loop=loop.slice(loop.indexOf('const snapshotRoot='));
loop=loop.replaceAll('tools/star-targets121-130','tools/star-targets31-40').replace('allThreeScoringLevelsValidated','allFourScoringLevelsValidated');
loop=loop.replace('opening:initial.puzzle};report.rows.push(row);','opening:initial.puzzle,difficultyReview:{currentRouteNonClearingDrags:data.currentRouteNonClearingDrags,historicalUpperBound:data.oldUpperBound,lowerBoundRecomputed:false,recertified:false,note:id===36?"Current valid route U11 does not recertify the historical simple-band U10; scoring PASS is independent.":"This run verifies scoring and full playability; no new lower-bound claim."}};report.rows.push(row);');
// Current-scene readiness is stronger than the historical aggregate artReady flag.
loop=loop.replace('await stable();const initial=await state();','await stable();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState()?.art?.revisedMechanisms?.currentSceneReady===true,undefined,{timeout:60000});const initial=await state();');
loop=loop.replace('window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0};','window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,invalidImageDimensions:0};');
loop=loop.replace('const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;','const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(!((image.naturalWidth??image.width)>0&&(image.naturalHeight??image.height)>0))a.invalidImageDimensions++;');
loop=loop.replace('assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);','assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);');
loop=loop.replace("await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});",`row.assetReadiness=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return{mechanisms:g.getDebugState().art.revisedMechanisms,formal:g.getDebugState().art.formalGameplay,mechanismImages:[...g.revisedArt].map(([path,image])=>({path,width:image.naturalWidth??image.width??0,height:image.naturalHeight??image.height??0}))};});assert.equal(row.assetReadiness.mechanisms.currentSceneReady,true);assert(!row.assetReadiness.mechanisms.error);assert(row.assetReadiness.mechanismImages.every(i=>i.width>0&&i.height>0));assert.equal(row.assetReadiness.formal.loadedWholeBlockCoverage,row.assetReadiness.formal.totalBlocks);await page.screenshot({path:path.join(output,\`lv\${id}-opening.png\`)});`);
fs.writeFileSync(root+'/playtest.mjs',fs.readFileSync(root+'/playtest-header.txt','utf8')+'\n'+loop);
let browser=fs.readFileSync('tools/star-targets121-130/browser.mjs','utf8').replace('[122,126,127]','[35,36,38,39]').replace('three explicitly','four explicitly');
fs.writeFileSync(root+'/browser.mjs',browser);
let html=fs.readFileSync('tools/star-targets121-130/index.html','utf8').replaceAll('star-targets121-130','star-targets31-40').replace('122/126/127','35/36/38/39');
fs.writeFileSync(root+'/index.html',html);
