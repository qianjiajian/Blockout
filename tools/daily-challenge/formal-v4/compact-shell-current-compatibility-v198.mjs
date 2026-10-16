import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {assertSameCompactDescriptorV198} from './compact-shell-provided-execution-evidence-v198.mjs';
import {MECHANISM_CATALOG_COPY_REVIEW_V198} from './mechanism-catalog-copy-compatibility-v198.mjs';
import {CATALOG_COPY_FILES_V198,assertMechanismCatalogCopySourcesV198,checkMechanismCatalogCopyNegativesV198,extractNamedSourceDeclarationsV198} from './mechanism-catalog-copy-contract-v198.mjs';
import {auditProvidedRouteCyclesV198} from './provided-route-cycle-audit-v198.mjs';

const FROZEN='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const CHANGE_PATHS=['src/core/PuzzleModel.ts','src/core/types.ts','src/core/mechanismCatalog.ts','src/game/continuousDrag.ts','src/game/formalBlockShapes.ts'];
const sha=b=>createHash('sha256').update(b).digest('hex'),require=createRequire(import.meta.url);
// The historical catalog review also bound a then-current daily UI file.
// Preserve that report. Recheck its exact catalog facts and its four relevant
// declarations against today's separately bound file, not its obsolete full SHA.
export async function assertCompactCurrentCatalogCopyV198({read,bind}){
 const report=await read(MECHANISM_CATALOG_COPY_REVIEW_V198),usage=report.stageUsage;
 assert.equal(report.status,'MECHANISM_CATALOG_EXACT_15_EFFECT_LITERALS_COMPATIBILITY_PASS');assert.equal(report.activeRuleVersion,'1.198.0');assert.deepEqual(report.errors,[]);
 assert.deepEqual(report.oldCatalog,CATALOG_COPY_FILES_V198.oldCatalog);assert.deepEqual(report.newCatalog,CATALOG_COPY_FILES_V198.newCatalog);
 assert.deepEqual(report.contract,{path:'tools/daily-challenge/formal-v4/mechanism-catalog-copy-contract-v198.mjs',sha256:'7771825420fbd203bf0dc0867f1faab7b1fcbdf920c1e8d8df46db6b68a64bd8'});
 assert.equal(path.resolve(report.parser.path).toLowerCase(),path.resolve(require.resolve('typescript')).toLowerCase());
 assert.equal(usage.newDaily.path,'src/core/dailyChallenge.ts');assert.equal(Object.keys(report.fileBindings).length,13);
 for(const[p,h]of Object.entries(report.fileBindings))if(p!==usage.newDaily.path)await bind(p,h);
 async function text(d){await bind(d.path,d.sha256);const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256);assert(Buffer.from(bytes.toString('utf8')).equals(bytes));return bytes.toString('utf8');}
 const oldText=await text(report.oldCatalog),newText=await text(report.newCatalog),sourceReview=assertMechanismCatalogCopySourcesV198(oldText,newText);
 assert.deepEqual(sourceReview,report.sourceReview);assert.deepEqual(checkMechanismCatalogCopyNegativesV198(oldText,newText),report.negativeChecks);assert.equal(report.negativeChecks.length,7);
 assert(sourceReview.completeSourceReconstructionBothDirections&&sourceReview.outsideEffectLiteralsByteIdentical);
 assert.equal(sourceReview.reconstructedOldSha256,report.oldCatalog.sha256);assert.equal(sourceReview.reconstructedCurrentSha256,report.newCatalog.sha256);
 assert.equal(sourceReview.normalizedSha256,'2d63470e87eb9ba6f738b3da70fe34375aa34de1ca2f20d400de76865ecb6d98');
 assert.equal(usage.consumerPairs.length,2);for(const p of usage.consumerPairs){assert.equal(p.completeBytesIdentical,true);assert.equal(await text(p.oldFile),await text(p.newFile));}
 const currentDaily=await bind(usage.newDaily.path),names=['MECHANISM_IDS','MECHANISM_UNLOCKS','latestUnlockedMechanism','unlockedDailyChallengeMechanisms'];
 const a=extractNamedSourceDeclarationsV198(await text(usage.oldDaily),names),b=extractNamedSourceDeclarationsV198(await text(currentDaily),names);assert.deepEqual(a,b);
 assert.deepEqual(usage.declarations,names.map(name=>({name,normalizedDeclaration:a[name],sha256:sha(a[name]),unchanged:true})));
 assert.equal(usage.dailyChallengeFullFileEquivalenceClaimed,false);assert.equal(usage.mathematicalContractReadsEffect,false);
 for(const k of ['newPhysicalInputs','newWorlds','newModels','newSearches','newReplays','newClaims','historyConsumerCalls','packReads','formalWrites','playerSaveAccess'])assert.equal(report[k],0);
 assert.equal(report.qualificationProduced,false);assert.equal(report.formalReady,false);assert.equal(report.oldEvidenceChanged,false);
 return{review:MECHANISM_CATALOG_COPY_REVIEW_V198,oldCatalog:report.oldCatalog,newCatalog:report.newCatalog,contract:report.contract,currentDaily,historicalDaily:usage.newDaily,
  historicalCurrentDailyFullBytesRevalidated:false,currentFourUnlockDeclarationsUnchanged:true,dailyFullFileEquivalenceClaimed:false,changedEffectLiterals:15,negativeChecksPassed:7,
  completeSourceReconstructionBothDirections:true,outsideEffectLiteralsByteIdentical:true,stageUnlockConsumersRechecked:true,arbitraryFutureCopyDriftAllowed:false,newModels:0,newSearches:0,newReplays:0};
}
export function assertExactSourceReplacementBridgeV198(before,current,replacements){
 assert(Array.isArray(replacements)&&replacements.length>0);let forward=before,reverse=current;const operations=[];
 for(const r of replacements){assert(typeof r.oldText==='string'&&r.oldText&&typeof r.newText==='string'&&r.newText);assert.equal(forward.split(r.oldText).length,2,'Exact old source hunk must occur once');const offset=forward.indexOf(r.oldText);operations.push({...r,offset});forward=forward.slice(0,offset)+r.newText+forward.slice(offset+r.oldText.length);}
 assert.equal(forward,current,'Complete forward source reconstruction');
 // Reverse exactly the unique forward edit at its recorded position. A new
 // hunk may legitimately occur elsewhere; the whole-file equality still holds.
 for(const r of operations.reverse()){assert.equal(reverse.slice(r.offset,r.offset+r.newText.length),r.newText,'Exact reverse hunk at the forward edit position');reverse=reverse.slice(0,r.offset)+r.oldText+reverse.slice(r.offset+r.newText.length);}
 assert.equal(reverse,before,'Complete reverse source reconstruction');return true;
}
export function assertCompactCurrentCompatibilityMetadataV198(review,candidate,q){
 assert.equal(review.status,'INDEPENDENT_COMPACT_SHELL_CURRENT_SOURCE_COMPATIBILITY_PASS');assertSameCompactDescriptorV198(review.candidate,candidate);
 for(const k of ['formalId','levelSha256','routeSha256'])assert.equal(review[k],q[k]);assert.equal(review.activeRuleVersion,'1.198.0');assert.deepEqual(review.errors,[]);
 assert.deepEqual(review.changes.map(c=>c.path).sort(),[...CHANGE_PATHS].sort());assert.equal(new Set(review.changes.map(c=>c.path)).size,5);
 for(const c of review.changes){assert.equal(c.oldSource.sha256,q.toolchainBindings[c.path]);assert.equal(path.resolve(c.oldSource.path).toLowerCase(),path.resolve(FROZEN,c.path).toLowerCase());assert.equal(path.resolve(c.currentSource.path).toLowerCase(),path.resolve(c.path).toLowerCase());
  assert.equal(c.method,c.path==='src/game/formalBlockShapes.ts'?'formal-shape-equivalence':'exact-replacements');}
 const domain=auditProvidedRouteCyclesV198(q);assert.equal(domain.status,'STATIC_NO_CLOSED_GESTURES_FOUND');assert.equal(domain.domain.supported,true);
 return review.changes;
}
export async function assertCompactShellCurrentCompatibilityV198(q,candidate,reviewDescriptor,{read,bind}){
 const review=await read(reviewDescriptor),changes=assertCompactCurrentCompatibilityMetadataV198(review,candidate,q),byPath=new Map(changes.map(c=>[c.path,c]));
 for(const [file,h]of Object.entries(review.fileBindings))await bind(file,h);
 for(const c of changes){await bind(c.oldSource.path,c.oldSource.sha256);await bind(c.currentSource.path,c.currentSource.sha256);
  if(c.method==='exact-replacements')assertExactSourceReplacementBridgeV198(await fs.readFile(c.oldSource.path,'utf8'),await fs.readFile(c.currentSource.path,'utf8'),c.exactReplacements);
 }
 // Retain the already independently reviewed effect-text-only catalog rule;
 // the source bridge cannot authorize an unrelated executable catalog edit.
 const catalogCopy=await assertCompactCurrentCatalogCopyV198({read,bind});
 const actual=[];
 for(const [file,h]of Object.entries(q.toolchainBindings)){
  const current=await bind(file);if(['src/game/ColorEscapeGame.ts','src/game/artManifest.ts'].includes(file))continue;
  if(current.sha256!==h){const c=byPath.get(file);assert(c,'Unreviewed current non-UI source drift');assert.equal(c.oldSource.sha256,h);assert.equal(c.currentSource.sha256,current.sha256);actual.push(file);}
 }
 assert.deepEqual(actual.sort(),[...CHANGE_PATHS].sort());
 async function shapes(file){const result=await build({entryPoints:[file],bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});for(const p of Object.keys(result.metafile.inputs))await bind(p);return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
 const change=byPath.get('src/game/formalBlockShapes.ts'),old=await shapes(change.oldSource.path),current=await shapes(change.currentSource.path);
 assert.deepEqual(current.FORMAL_BLOCK_SHAPES,old.FORMAL_BLOCK_SHAPES);assert.equal(change.definitionsRawSpanIdentical,true);assert.equal(change.firstMatchWins,true);
 const matches=q.level.blocks.map(b=>{const a=old.matchFormalBlockShape(b.shape,'native-only'),n=current.matchFormalBlockShape(b.shape,'native-only');assert.deepEqual(n,a);assert(n&&n.quarterTurns===0);return{blockId:b.id,shapeId:n.shapeId,quarterTurns:0,localCells:b.shape};});
 assert.deepEqual(change.n08NativeMatches,matches,'Independent same-object native shape facts');
 return{review:reviewDescriptor,compatibleChanges:changes.map(c=>({path:c.path,old:c.oldSource.sha256,current:c.currentSource.sha256,method:c.method})),catalogCopy,sourceReconstructionBothDirections:true,nativeMatcherCases:matches.length,
  absentPulseRescue:true,originalDomainMembershipClaimed:false,newModels:0,newSearches:0,newReplays:0};
}
