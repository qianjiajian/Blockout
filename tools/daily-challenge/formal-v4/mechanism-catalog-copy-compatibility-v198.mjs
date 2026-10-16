import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {CATALOG_COPY_FILES_V198,assertMechanismCatalogCopySourcesV198,checkMechanismCatalogCopyNegativesV198,extractNamedSourceDeclarationsV198} from './mechanism-catalog-copy-contract-v198.mjs';

// Only the reviewed display-copy pair is compatible. Every other source drift
// remains the qualifier's responsibility and retains its existing hard gate.
// No gameplay/model/history code is imported or executed by this helper.
export const MECHANISM_CATALOG_COPY_REVIEW_V198=Object.freeze({
 path:'deliverables/daily-formal-v4-20261008/proof/mechanism-catalog-copy-compatibility-v198-01/report.json',
 sha256:'cfe168f9b048d7ec84ecd448ee64d665905bc2fbefee400d9394937c64d2597d',
});
const CONTRACT={path:'tools/daily-challenge/formal-v4/mechanism-catalog-copy-contract-v198.mjs',sha256:'7771825420fbd203bf0dc0867f1faab7b1fcbdf920c1e8d8df46db6b68a64bd8'};
const sha=b=>createHash('sha256').update(b).digest('hex'),require=createRequire(import.meta.url);

export async function assertMechanismCatalogCopyCompatibilityV198({read,bind}){
 assert.equal(typeof read,'function');assert.equal(typeof bind,'function');
 const report=await read(MECHANISM_CATALOG_COPY_REVIEW_V198);
 assert.equal(report.status,'MECHANISM_CATALOG_EXACT_15_EFFECT_LITERALS_COMPATIBILITY_PASS');
 assert.equal(report.activeRuleVersion,'1.198.0');assert.deepEqual(report.errors,[]);
 assert.deepEqual(report.oldCatalog,CATALOG_COPY_FILES_V198.oldCatalog);assert.deepEqual(report.newCatalog,CATALOG_COPY_FILES_V198.newCatalog);
 assert.deepEqual(report.contract,CONTRACT);assert.equal(Object.keys(report.fileBindings).length,13);
 assert.equal(path.resolve(report.parser.path).toLowerCase(),path.resolve(require.resolve('typescript')).toLowerCase());
 for(const[p,h]of Object.entries(report.fileBindings)){assert(/^[a-f0-9]{64}$/.test(h));assert(!p.replaceAll('\\','/').includes('/pack/'));await bind(p,h);}
 await bind(CONTRACT.path,CONTRACT.sha256);
 async function text(d){
  await bind(d.path,d.sha256);const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);
  const value=b.toString('utf8');assert(Buffer.from(value,'utf8').equals(b));return value;
 }
 const oldText=await text(report.oldCatalog),newText=await text(report.newCatalog);
 const sourceReview=assertMechanismCatalogCopySourcesV198(oldText,newText);
 assert.deepEqual(sourceReview,report.sourceReview);
 assert.deepEqual(checkMechanismCatalogCopyNegativesV198(oldText,newText),report.negativeChecks);assert.equal(report.negativeChecks.length,7);
 assert(sourceReview.completeSourceReconstructionBothDirections&&sourceReview.outsideEffectLiteralsByteIdentical);
 assert.equal(sourceReview.reconstructedOldSha256,report.oldCatalog.sha256);assert.equal(sourceReview.reconstructedCurrentSha256,report.newCatalog.sha256);
 assert.equal(sourceReview.normalizedSha256,'2d63470e87eb9ba6f738b3da70fe34375aa34de1ca2f20d400de76865ecb6d98');
 const usage=report.stageUsage;
 assert.equal(usage.consumerPairs.length,2);for(const p of usage.consumerPairs){assert.equal(p.completeBytesIdentical,true);assert.equal(await text(p.oldFile),await text(p.newFile));}
 const names=['MECHANISM_IDS','MECHANISM_UNLOCKS','latestUnlockedMechanism','unlockedDailyChallengeMechanisms'];
 const a=extractNamedSourceDeclarationsV198(await text(usage.oldDaily),names),b=extractNamedSourceDeclarationsV198(await text(usage.newDaily),names);assert.deepEqual(a,b);
 assert.deepEqual(usage.declarations,names.map(name=>({name,normalizedDeclaration:a[name],sha256:sha(a[name]),unchanged:true})));
 assert.equal(usage.dailyChallengeFullFileEquivalenceClaimed,false);assert.equal(usage.mathematicalContractReadsEffect,false);
 for(const k of ['newPhysicalInputs','newWorlds','newModels','newSearches','newReplays','newClaims','historyConsumerCalls','packReads','formalWrites','playerSaveAccess'])assert.equal(report[k],0);
 assert.equal(report.qualificationProduced,false);assert.equal(report.formalReady,false);assert.equal(report.oldEvidenceChanged,false);
 return{oldCatalog:report.oldCatalog,newCatalog:report.newCatalog,review:MECHANISM_CATALOG_COPY_REVIEW_V198,contract:CONTRACT,
  changedEffectLiterals:15,completeSourceReconstructionBothDirections:true,outsideEffectLiteralsByteIdentical:true,
  normalizedSha256:sourceReview.normalizedSha256,entryFieldsOrderSortAndSaveIdsUnchanged:true,stageUnlockConsumersRechecked:true,
  negativeChecksPassed:7,arbitraryFutureCopyDriftAllowed:false,newModels:0,newSearches:0,newReplays:0,historyConsumerCalls:0};
}
