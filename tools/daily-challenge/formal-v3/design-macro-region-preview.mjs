import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {localRetiles,fixColors} from '../formal-v2/design-layout-factory.mjs';
import {enumerateMacroSwaps,enumerateConnectedMacroSwaps,boundaryRetileAllowed} from './design-macro-region.mjs';
import {compareLayouts} from './diversity.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';

// PREVIEW ONLY. No proof, route, ledger claim, or search routine is invoked.
const [label='macro-region-preview-01',indexFile='deliverables/daily-formal-v3-20261008/selection/nearband21-selected/index.json']=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label));const root='deliverables/daily-formal-v3-20261008',output=`${root}/design/${label}`;
assert(!fs.existsSync(output),'Immutable previous preview');fs.mkdirSync(output,{recursive:false});
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const shapeStock=l=>levelSha256(l.blocks.map(b=>b.shape.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])).map(s=>JSON.stringify(s)).sort());
const mask=l=>levelSha256({width:l.width,height:l.height,playable:boardCells(l).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const selected=read(indexFile).files.map(file=>({file,receipt:read(file)})),known=[],knownKeys=new Set();
function addKnown(file,level){if(!level?.blocks)return;const h=levelSha256(level);if(knownKeys.has(h))return;knownKeys.add(h);known.push({file,level,levelSha256:h});}
for(const r of selected)addKnown(r.file,r.receipt.level);
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);else if(/^candidate.*\.json$/.test(e.name)){const q=read(p);if(q.accepted&&q.level)addKnown(p,q.level);}}}
scan(`${root}/design`);
const oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldIndex).entries.map(e=>({file:e.path,level:read(e.path).level}));
const references=[];
for(const selectedRow of selected.filter(r=>r.receipt.difficulty===3||r.receipt.difficulty===2&&r.receipt.U>=26)){
 const p=selectedRow.receipt,base=read(p.baseInputFile),row={receipt:selectedRow.file,receiptSha256:sha(selectedRow.file),sourceLevelId:p.sourceLevelId,difficulty:p.difficulty,referenceU:p.U,reference:p.baseInputFile,referenceFileSha256:sha(p.baseInputFile),referenceLevelSha256:levelSha256(base.level)};
 try{assertPlainProofDomain(base.level,runtime);}catch(e){row.excluded=e.message;references.push(row);continue;}
 const rectangle=enumerateMacroSwaps(base.level),connected=enumerateConnectedMacroSwaps(base.level),pairs=[...rectangle.pairs,...connected.pairs],dedup=new Set();
 row.rectangleDiagnostic=rectangle.diagnostic;row.connectedDiagnostic=connected.diagnostic;row.pairs=pairs.filter(p=>{const h=levelSha256(p.level);if(dedup.has(h))return false;dedup.add(h);return true;});row.base=base;row.previewCount=0;
 addKnown(p.baseInputFile,base.level);references.push(row);
}
const paths=['tools/daily-challenge/formal-v3/design-macro-region-preview.mjs','tools/daily-challenge/formal-v3/design-macro-region.mjs','tools/daily-challenge/formal-v3/diversity.mjs','tools/daily-challenge/formal-v2/design-layout-factory.mjs','tools/daily-challenge/formal-v3/diversity-layout-factory.mjs'];
const bindings=paths.map(path=>({path,sha256:sha(path)}));for(const p of paths)fs.copyFileSync(p,`${output}/${p.split('/').at(-1)}.snapshot`);
const candidates=[],rejections={},seenFinal=new Set();let constructedWorlds=0,staticRetileVariants=0;
const reject=reason=>{rejections[reason]=(rejections[reason]??0)+1;};
const publicReferences=()=>references.map(({base,pairs,...r})=>({...r,uniqueSwaps:pairs?.length??0}));
const write=status=>fs.writeFileSync(`${output}/report.json`,JSON.stringify({status,accepted:false,formalReady:false,newDifficultySearches:0,routeSearches:0,L:null,U:null,
 policy:{macroMinimumArea:.35,macroMinimumBodies:8,minimumBoardQuadrants:3,maximumExistingSimilarity:.65,maximumOld450Similarity:.75,maximumSourceSimilarity:.55,noRotation:true,realShapeInventoryChange:true,realColourChange:true,constructorFullWorldCap:10000},
 index:{path:indexFile,sha256:sha(indexFile)},oldIndex:{path:oldIndex,sha256:sha(oldIndex)},bindings,proofToolchainSha256:runtime.toolchainSha256,knownLayouts:known.length,
 references:publicReferences(),constructedWorlds,staticRetileVariants,rejections,candidates},null,2)+'\n');
write('STATIC_MACRO_CONSTRUCTION_RUNNING');
// Round-robin references first, preventing one family from filling the preview.
for(let round=0;round<3&&candidates.length<12;round++)for(const [ri,ref]of references.entries()){
 if(candidates.length>=12||constructedWorlds>=10000)break;if(!ref.base||ref.previewCount>round)continue;
 const source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId),original=ref.base.level,originalShape=shapeStock(original),originalColours=designFingerprints(original).colorSha256;
 let found=false;
 for(const [si,swap]of ref.pairs.entries()){
  if(found||constructedWorlds>=10000)break;
  const variants=localRetiles(swap.level,{irregular:true,maxUnion:16}).filter(v=>boundaryRetileAllowed(swap,v.changedIds));staticRetileVariants+=variants.length;
  for(const [vi,v]of variants.entries()){
   if(found||constructedWorlds>=10000)break;const level=v.level,h=levelSha256(level);if(seenFinal.has(h))continue;seenFinal.add(h);constructedWorlds++;
   if(shapeStock(level)===originalShape){reject('same-shape-inventory');continue;}
   if(compareLayouts(level,original).footprintSimilarity>.65){reject('reference-near');continue;}
   const nearSource=compareLayouts(level,source).footprintSimilarity;if(nearSource>.55){reject('source-near');continue;}
   let maximum=0,maximumFile=null,tooNear=false;
   for(const prior of [...known,...candidates.map(c=>({file:c.path,level:read(c.path).level}))]){const n=compareLayouts(level,prior.level).footprintSimilarity;if(n>maximum){maximum=n;maximumFile=prior.file;}if(n>.65){tooNear=true;break;}}
   if(tooNear){reject('existing-or-batch-near');continue;}
   let maximumOld=0;for(const prior of old){const n=compareLayouts(level,prior.level).footprintSimilarity;maximumOld=Math.max(maximumOld,n);if(n>.75)break;}
   if(maximumOld>.75){reject('old450-near');continue;}
   // Colour repair is one finite symbolic CSP for this new partition. It does
   // not test movement, certify difficulty, or alter the portal geometry.
   if(!fixColors(level,level.blocks.map(b=>b.id),619731+ri*1021+si*137+vi,runtime,{keepProbability:.6})){reject('adjacency-or-native-colouring');continue;}
   const fingerprints=designFingerprints(level);if(fingerprints.colorSha256===originalColours){reject('same-colour');continue;}
   const inventory=inventorySummary(level,runtime);if(inventory.nonNativeOrMissingArtIds.length){reject('native-art');continue;}
   try{runtime.validateLevel(level);assertPlainProofDomain(level,runtime);}catch(e){reject(`static:${e.message}`);continue;}
   const audit=runtime.auditRevisedCandidate(level,undefined),issues=audit.issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(issues.length){reject(`audit:${issues.map(i=>i.code).join(',')}`);continue;}
   assert.equal(mask(level),mask(source));assert.equal(mask(level),mask(original));
   const identity=levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256}),blocked=`${root}/proof/attempts/identities/${identity}.blocked.json`;
   if(fs.existsSync(blocked)){reject('previously-failed-physical-input');continue;}
   const file=`${output}/candidate-${String(candidates.length).padStart(3,'0')}.json`,{level:swappedLevel,assignment,...macro}=swap;
   const packet={status:'STATIC_PREVIEW_ONLY_UNSOLVED',accepted:false,constructionValid:true,formalReady:false,L:null,U:null,drags:null,newDifficultySearches:0,level,levelSha256:levelSha256(level),sourceLevelId:ref.sourceLevelId,
    sourceLevelSha256:levelSha256(source),sourceMaskSha256:mask(source),inventory,staticAudit:audit,failedIdentityCheck:{identity,blockedFile:blocked,exists:false},
    provenance:{strategy:'whole-body-macro-translation-exchange-then-boundary-retile',reference:ref.reference,referenceFileSha256:ref.referenceFileSha256,referenceLevelSha256:ref.referenceLevelSha256,
     referenceDifficulty:ref.difficulty,referenceU:ref.referenceU,referenceProofNotTransferred:true,macro,boundaryRetileBodyIds:v.changedIds,originalShapeInventorySha256:originalShape,newShapeInventorySha256:shapeStock(level),
     originalColourSha256:originalColours,newColourSha256:fingerprints.colorSha256,changedColourIds:level.blocks.filter(b=>original.blocks.find(a=>a.id===b.id).color!==b.color).map(b=>b.id),
     exitsPreserved:true,sourceMaskExactlyRetained:true,rotationApplied:false,boardPartitionsChangedByMacro:true},
    similarity:{reference:compareLayouts(level,original).footprintSimilarity,source:nearSource,allExistingAndEarlierPreviews:maximum,nearestExistingFile:maximumFile,old450:maximumOld},toolBindings:bindings};
   fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});const row={path:file,fileSha256:sha(file),sourceLevelId:ref.sourceLevelId,reference:ref.reference,referenceDifficulty:ref.difficulty,kind:macro.kind,area:macro.area,areaFraction:macro.areaFraction,bodyCount:macro.bodyCount,quadrants:macro.quadrants,similarity:packet.similarity};
   candidates.push(row);ref.previewCount++;found=true;console.log(JSON.stringify(row));write('STATIC_MACRO_CONSTRUCTION_RUNNING');
  }
 }
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256);write('STATIC_MACRO_CONSTRUCTION_FINISHED');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'UNSOLVED_PREVIEW_ONLY',formalReady:false,accepted:false,files:candidates.map(c=>c.path)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,previews:candidates.length,constructedWorlds,rejections,newDifficultySearches:0}));
