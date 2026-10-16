import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';

// Read an already persisted single input. No constructor, model, replay,
// solver, history consumer or claim is invoked. The diagram is explicitly a
// static q0 sprite composite, not the production Canvas shell rendering.
export const SELF='tools/daily-challenge/formal-v4/render-authored-shell-static-v198.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export async function renderAuthoredShellStaticV198(input,staticPreflight,outputDirectory){
 descriptor(input);descriptor(staticPreflight);assert(typeof outputDirectory==='string'&&outputDirectory.length);
 const sourceBindings={};const bytes=async p=>{const key=path.resolve(p),b=await fs.readFile(key),h=hash(b);if(sourceBindings[key])assert.equal(sourceBindings[key],h);sourceBindings[key]=h;return b;};
 const read=async d=>{descriptor(d);const b=await bytes(d.path);assert.equal(hash(b),d.sha256,d.path);return JSON.parse(b);};
 const q=await read(input),s=await read(staticPreflight);
 assert.equal(q.accepted,false);assert.equal(q.formalReady,false);assert.equal(q.L,null);assert.equal(q.U,null);
 assert.equal(q.stageKey,'mechanisms-multilayer-shell-15');assert.equal(q.newestMechanism,'multilayer-shell');
 assert.equal(s.status,'AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING');assert.deepEqual(s.input,input);assert.deepEqual(s.errors,[]);
 const l=q.level;assert.equal(levelSha256(l),q.levelSha256);assert(l.blocks.some(b=>b.layers?.length>1));
 for(const[p,h]of Object.entries(s.fileBindings))assert.equal(hash(await bytes(p)),h,p);
 const {build}=await import('esbuild');const compiled=await build({entryPoints:[SELF],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))await bytes(p);
 await bytes('node_modules/sharp/package.json');const {default:sharp}=await import('sharp');
 const colors={red:'#dc3035',orange:'#ff820e',yellow:'#eac312',green:'#13a126',cyan:'#22b7db',blue:'#1466e5',purple:'#861dcc',pink:'#d528aa'};
 const cell=68,ox=44,oy=112,shells=l.blocks.filter(b=>b.layers?.length>1),legendY=oy+l.height*cell+54;
 const width=l.width*cell+88,height=legendY+shells.length*76+36;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#211c50"/><text x="${width/2}" y="31" fill="white" font-family="Arial" font-size="18" text-anchor="middle">${escape(q.formalId)}</text><text x="${width/2}" y="57" fill="#d3ceef" font-family="Arial" font-size="13" text-anchor="middle">Static q0 sprites - L/U unknown - not gameplay validation</text><rect x="${ox-24}" y="${oy-24}" width="${l.width*cell+48}" height="${l.height*cell+48}" rx="8" fill="#575498"/>`;
 for(const[x,y]of l.playable)svg+=`<rect x="${ox+x*cell}" y="${oy+y*cell}" width="${cell}" height="${cell}" fill="#35305f" stroke="#211c50" stroke-width="2"/>`;
 for(const g of l.gates){
  const horizontal=['top','bottom'].includes(g.side);assert(colors[g.color]);
  const x=horizontal?ox+g.offset*cell:ox+(g.side==='left'?-24:l.width*cell),y=horizontal?oy+(g.side==='top'?-24:l.height*cell):oy+g.offset*cell;
  const w=horizontal?g.size*cell:24,h=horizontal?24:g.size*cell;
  svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${colors[g.color]}" stroke="white" stroke-opacity=".6"/>`;
 }
 const composite=[],nativeArt=[];const sprite=async(b,color)=>{
  const matches=s.nativeArt.filter(a=>a.blockId===b.id&&a.color===color);assert.equal(matches.length,1);const a=matches[0];assert.equal(a.quarterTurns,0);descriptor(a.asset);
  const data=await bytes(a.asset.path);assert.equal(hash(data),a.asset.sha256);nativeArt.push(a);return data;
 };
 for(const b of l.blocks){
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  composite.push({input:await sharp(await sprite(b,b.layers?.[0]??b.color)).resize(w*cell,h*cell,{fit:'fill'}).png().toBuffer(),left:ox+b.x*cell,top:oy+b.y*cell});
 }
 let labels=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
 for(const[i,b]of shells.entries()){
  const y=legendY+i*76,label=`S${i+1}`;labels+=`<rect x="${ox+b.x*cell+3}" y="${oy+b.y*cell+3}" width="32" height="21" rx="5" fill="#111" fill-opacity=".8"/><text x="${ox+b.x*cell+19}" y="${oy+b.y*cell+18}" text-anchor="middle" fill="white" font-family="Arial" font-size="13">${label}</text><text x="24" y="${y+16}" fill="white" font-family="Arial" font-size="13">${label}: ${escape(b.layers.join(' → '))} (outer → inner)</text>`;
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  for(const[j,color]of b.layers.entries()){
   const data=await sprite(b,color),scale=Math.min(64/w,43/h);
   composite.push({input:await sharp(data).resize(Math.round(w*scale),Math.round(h*scale),{fit:'fill'}).png().toBuffer(),left:28+j*84,top:y+24});
  }
 }
 svg+='</svg>';labels+='</svg>';composite.push({input:Buffer.from(labels),left:0,top:0});
 // Exclusive output latch prevents replacing previous static evidence.
 await fs.mkdir(outputDirectory,{recursive:false});const imagePath=path.join(outputDirectory,'native-static-preview.png');
 await sharp(Buffer.from(svg)).composite(composite).png().toFile(imagePath);
 const image={path:imagePath,sha256:hash(await fs.readFile(imagePath))};
 for(const[p,h]of Object.entries(sourceBindings))assert.equal(hash(await fs.readFile(p)),h,'Render source drift '+p);
 assert.equal(levelSha256(l),q.levelSha256);
 const report={status:'STATIC_AUTHORED_SHELL_OPENING_RENDERED',input,staticPreflight,levelSha256:q.levelSha256,renderedLevelSha256:q.levelSha256,
  image,sourceBindings,nativeArt,actuallyRendered:true,method:'static-q0-native-sprite-composite',shellLegend:shells.map((b,i)=>({label:`S${i+1}`,blockId:b.id,layers:b.layers})),
  missingWholeBlockIds:[],storageViolations:[],errors:[],newGameplaySearches:0,publicClaimsStarted:0,newModels:0,newReplayCalls:0,newPhysicalInputs:0,
  playerSaveTouched:false,currentCanvasRenderingClaimed:false,completeRouteValidated:false,difficultyValidated:false,manualVisualReviewPending:true,accepted:false,formalReady:false};
 const reportPath=path.join(outputDirectory,'report.json');await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{report:{path:reportPath,sha256:hash(await fs.readFile(reportPath))},image};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,8,'--render-existing input path/SHA static-preflight path/SHA new-output-directory');assert.equal(process.argv[2],'--render-existing');
 console.log(JSON.stringify(await renderAuthoredShellStaticV198({path:process.argv[3],sha256:process.argv[4]},{path:process.argv[5],sha256:process.argv[6]},process.argv[7])));
}
