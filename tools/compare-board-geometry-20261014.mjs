import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import sharp from 'sharp';

const beforePath=resolve(process.argv[2]),afterPath=resolve(process.argv[3]);
const before=JSON.parse(await readFile(beforePath)),after=JSON.parse(await readFile(afterPath));
assert.equal(before.status,'PASS');assert.equal(after.status,'PASS');
assert.equal(before.fixtureSha256,after.fixtureSha256,'Same instrumented fixture');
assert.deepEqual(before.workspaceDrift,[]);assert.deepEqual(after.workspaceDrift,[]);
const sourceNames=[...new Set([...Object.keys(before.sources),...Object.keys(after.sources)])].sort();
const changedSources=sourceNames.filter(name=>before.sources[name]?.sha256!==after.sources[name]?.sha256);
assert(changedSources.includes('src/game/ColorEscapeGame.ts'));
assert(changedSources.includes('src/game/BoardGeometryCache.ts'));
const assetNames=[...new Set([...Object.keys(before.assetHashes),...Object.keys(after.assetHashes)])].sort();
for(const name of assetNames)if(before.assetHashes[name]&&after.assetHashes[name])assert.equal(after.assetHashes[name],before.assetHashes[name],'Same requested asset has identical bytes: '+name);
const assetRequestChanges={beforeOnly:assetNames.filter(name=>!after.assetHashes[name]),afterOnly:assetNames.filter(name=>!before.assetHashes[name])};
const output=resolve(dirname(dirname(afterPath)),`comparison-${Date.now()}`);await mkdir(output,{recursive:true});
const report={status:'PASS',before:beforePath,after:afterPath,scope:after.scope,changedSources,assetRequestChanges,
 note:'PASS covers exact topology/layout/visible-door equivalence, actual Pointer result, paused and resumed natural clocks, no browser/image/storage errors. Pixel equality is reported separately because animated effects and clocks are not frozen. This comparison includes every listed source change; it does not isolate a single optimization or measure device heat.',rows:[]};
for(const a of after.rows){
 const b=before.rows.find(row=>row.width===a.width&&row.level===a.level);assert(b);assert.equal(a.status,'PASS');assert.equal(b.status,'PASS');
 assert.deepEqual(a.openingGeometry,b.openingGeometry,'Opening geometry and viewport identical');
 assert.deepEqual(a.afterPointerGeometry,b.afterPointerGeometry,'After Pointer geometry and viewport identical');
 assert.deepEqual({kind:a.action.kind,id:a.action.block.id,side:a.action.side},{kind:b.action.kind,id:b.action.block.id,side:b.action.side},'Same Pointer action');
 assert.deepEqual(a.actionResult.block,b.actionResult.block,'Same authoritative block result');
 for(const key of ['moves','cleared','blockCount','queuedCount'])assert.equal(a.actionResult.state[key],b.actionResult.state[key]);
 const row={width:a.width,level:a.level,geometryEqual:true,action:{kind:a.action.kind,id:a.action.block.id,side:a.action.side,outcomeEqual:true},clocks:{},screenshots:[]};
 for(const [name,expected]of [['paused',false],['playing',true],['resumed',true]]){
  const ticks={before:b[name].before.remainingSeconds-b[name].after.remainingSeconds,after:a[name].before.remainingSeconds-a[name].after.remainingSeconds};
  for(const value of Object.values(ticks))expected?assert(value>0):assert.equal(value,0);row.clocks[name]=ticks;
 }
 for(const [suffix,evidence]of [['opening','openingGeometry'],['after-pointer','afterPointerGeometry']]){
  const name=`${a.width}-${a.level}-${suffix}.png`,clip=a[evidence].crop;
  const left=await sharp(resolve(dirname(beforePath),name)).extract(clip).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const right=await sharp(resolve(dirname(afterPath),name)).extract(clip).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(left.info,right.info);let count=0,minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
  const diff=Buffer.alloc(left.data.length);
  for(let i=0;i<left.data.length;i+=4){const changed=left.data[i]!==right.data[i]||left.data[i+1]!==right.data[i+1]||left.data[i+2]!==right.data[i+2]||left.data[i+3]!==right.data[i+3];
   diff[i+3]=255;if(changed){count++;const n=i/4,x=n%clip.width,y=Math.floor(n/clip.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);diff[i]=255;diff[i+2]=255;}}
  const prefix=`${a.width}-${a.level}-${suffix}`;
  await sharp(left.data,{raw:left.info}).png().toFile(resolve(output,prefix+'-before-crop.png'));
  await sharp(right.data,{raw:right.info}).png().toFile(resolve(output,prefix+'-after-crop.png'));
  await sharp(diff,{raw:left.info}).png().toFile(resolve(output,prefix+'-diff.png'));
  row.screenshots.push({name,clip,pixelEqual:count===0,mismatchingPixels:count,totalPixels:clip.width*clip.height,differenceBounds:count?{minX,minY,maxX,maxY}:null});
 }
 report.rows.push(row);
}
assert.equal(report.rows.length,8,'Four official levels at both viewport sizes');
report.summary={cases:report.rows.length,boardCropsPixelEqual:report.rows.flatMap(row=>row.screenshots).filter(s=>s.pixelEqual).length,boardCropsTotal:report.rows.length*2};
await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,output,changedSources,summary:report.summary},null,2));
