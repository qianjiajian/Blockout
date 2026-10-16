import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {assertV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
export {currentMainlineSourceBinding} from './prefix-execution-environment.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>fs.readFileSync(p);
const samePath=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
export const TASK_ENVIRONMENT_PINS=Object.freeze({
 historicalManifest:'363adec66ed5c54cf59bf394ec95da19fa8ac03460846cb7d5a268f9e679a842',
 historicalPolicy:'71cbdc5c52b8d02b191c0db83c5a7875948450226473ad848817296de491b90a',
 mathematicalPolicy:'5b8986873d7014f6d6612f3678891e295e72d30431f2b3b0bd67c2dd91d4698c',
 environment:'8d52d96c73b87b9c95207757164d0e95876e3f434f3540750eb605d18d7e2583',
 historicalUI:'2a59877eab3b89e5d599d34eacf7dcf797b588be29cdd49b9832ac0ec691b90a',
 preparationManifest:'c0626e9445031b21698cbab65cfd179a006e000b9bf14d45e9ced616e18b6e82',
 preparationPolicy:'277c81b858d515d3dc7fa151d5b7c7ad7f54ca928195af02d95c5cbbb422bd5a',
});
export const DEFAULT_EXECUTION_POLICY_REVIEW=Object.freeze({
 path:'deliverables/daily-formal-v4-20261008/proof/execution-policy-reviews/159-01/review.json',
 sha256:'4410b7c440ca5c2d7894d428205650b537bc6282ce0fa84d3d1479d412f2c400',
});
const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact immutable descriptor required');
function checked(d,bindings){descriptor(d);const b=bytes(d.path);assert.equal(hash(b),d.sha256,'Descriptor bytes changed: '+d.path);if(bindings[d.path])assert.equal(bindings[d.path],d.sha256);bindings[d.path]=d.sha256;return b;}
function snapshotContext(environment,descriptorOverride){
 const d=descriptorOverride??environment?.descriptor??{path:path.resolve('snapshot-environment.json'),sha256:TASK_ENVIRONMENT_PINS.environment};
 descriptor(d);assert.equal(d.sha256,TASK_ENVIRONMENT_PINS.environment);const raw=bytes(d.path);assert.equal(hash(raw),d.sha256);
 const s=JSON.parse(raw);assert.equal(s.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert.equal(s.frozenMath,FROZEN_MATH_SHA);assert.equal(s.currentRuntimeValidationClaimed,false);
 const sourceWorkspace=path.resolve(s.sourceWorkspace),executionWorkspace=path.resolve(s.workspace);assert(samePath(executionWorkspace,process.cwd()),'Actual historical cwd required');
 if(environment){assert.equal(environment.sourceWorkspace,sourceWorkspace);assert.equal(environment.executionWorkspace,executionWorkspace);}
 return{descriptor:d,snapshot:s,sourceWorkspace,executionWorkspace};
}

/** Pure metadata portion for focused private negative tests. It authorizes no
 * files or execution on its own; observeExecutionPolicy checks every byte. */
export function assertExecutionPolicyReviewMetadata(review,archived,current,anchor){
 assert.equal(review.schemaVersion,1);assert.equal(review.status,'REVIEWED_DAILY_TASK_EXECUTION_POLICY');assert.equal(review.scope,'daily-300-new-candidate-generation');
 assert.equal(review.immutableArchive,true);assert.equal(review.currentUIValidated,false);assert.equal(review.reviewAttestation?.rootFullActiveDocumentRead,true);
 assert.equal(review.reviewAttestation?.authorFullActiveDocumentRead,true);assert.equal(typeof review.reviewAttestation?.reviewedChanges,'string');assert(review.reviewAttestation.reviewedChanges.length>0);
 assert.equal(archived.activeVersion,review.reviewedActiveVersion);assert.deepEqual(current,archived,'Current policy was not reviewed exactly');
 assert.equal(anchor.activeVersion,'1.159.0');assert.equal(anchor.versions.length,162);assert(archived.versions.length>=162);
 assert.deepEqual(archived.versions.slice(0,162),anchor.versions,'The original 162 rule entries must remain unchanged');
 const {activeVersion:aa,versions:av,...a}=anchor,{activeVersion:ra,versions:rv,...r}=archived;assert.deepEqual(a,r);
 assert.equal(review.immutablePrefixVersions,162);assert.equal(review.rootRuleLockAtReview?.status,'PASS');assert.equal(review.rootRuleLockAtReview?.activeVersion,archived.activeVersion);assert.equal(review.rootRuleLockAtReview?.verified,archived.versions.length);
 assert.deepEqual(review.unchangedContracts,{dailyDesign:{version:'1.156.0',sha256:TASK_ENVIRONMENT_PINS.historicalPolicy},mathematics:{version:'1.154.0',sha256:TASK_ENVIRONMENT_PINS.mathematicalPolicy},historicalMathSha256:FROZEN_MATH_SHA});
 assert(Array.isArray(review.reviewedDocuments));assert.equal(review.reviewedDocuments.length,archived.versions.length-159);
 for(const [i,row]of archived.versions.slice(159).entries()){
  const d=review.reviewedDocuments[i];assert.equal(d.version,row.version);assert.equal(d.originalRelativePath,row.document);assert.equal(d.ruleSha256,row.sha256);descriptor(d.archive);assert.equal(row.status,'frozen');
 }
 return true;
}
function loadReview(d,context){
 const bindings={},review=JSON.parse(checked(d,bindings)),archived=JSON.parse(checked(review.reviewedManifest,bindings));
 const mutable=path.join(context.sourceWorkspace,'docs/rules/manifest.json');assert(!samePath(review.reviewedManifest.path,mutable),'A policy archive cannot be the mutable root manifest');
 for(const row of review.reviewedDocuments??[]){
  assert(!samePath(row.archive.path,path.join(context.sourceWorkspace,row.originalRelativePath)),'Policy documents must be archived, not current-root aliases');
  const raw=checked(row.archive,bindings);assert.equal(hash(raw.toString('utf8').replaceAll('\r\n','\n')),row.ruleSha256);
 }
 return{review,archived,bindings};
}

/** Execution scope only. The result belongs in a separate receipt observation,
 * never in mathematical attempt identity, stable environment or plan equality.
 * Explicit new immutable reviews permit later UI-only policies; an unreviewed
 * append or any unreviewed file drift rejects before the caller may claim. */
export function observeExecutionPolicy(environment,{scopeReview}={}){
 const context=snapshotContext(environment),d=scopeReview??(process.env.DAILY_EXECUTION_POLICY_REVIEW?JSON.parse(process.env.DAILY_EXECUTION_POLICY_REVIEW):DEFAULT_EXECUTION_POLICY_REVIEW);
 const anchor=loadReview(DEFAULT_EXECUTION_POLICY_REVIEW,context);assert.equal(anchor.review.reviewedManifest.sha256,TASK_ENVIRONMENT_PINS.preparationManifest);
 const actual=loadReview(d,context),manifestPath=path.join(context.sourceWorkspace,'docs/rules/manifest.json'),manifestBytes=bytes(manifestPath),current=JSON.parse(manifestBytes);
 assert.equal(hash(manifestBytes),actual.review.reviewedManifest.sha256,'The current manifest needs an exact execution policy review');
 assertExecutionPolicyReviewMetadata(actual.review,actual.archived,current,anchor.archived);
 const lock=verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(context.sourceWorkspace,p),'utf8')});assert(lock.ok,lock.errors.join(';'));assert.equal(lock.activeVersion,current.activeVersion);assert.equal(lock.verified.length,current.versions.length);
 for(const row of actual.review.reviewedDocuments){const raw=bytes(path.join(context.sourceWorkspace,row.originalRelativePath));assert.equal(hash(raw),row.archive.sha256,'Current document is not the reviewed original bytes');}
 assert.equal(hash(bytes(manifestPath)),hash(manifestBytes),'Manifest changed during observation');
 const active=current.versions.find(r=>r.version===current.activeVersion),activePath=path.resolve(context.sourceWorkspace,active.document);
 return{status:'REVIEWED_EXECUTION_POLICY_OBSERVED',scope:actual.review.scope,scopeReview:{...d},
  observedCurrentPolicy:{activeVersion:current.activeVersion,manifest:{path:manifestPath,sha256:hash(manifestBytes)},document:{path:activePath,sha256:hash(bytes(activePath))},ruleLock:{status:'PASS',verified:lock.verified.length}},
  reviewBindings:{...anchor.bindings,...actual.bindings},mathematicalIdentityUnchanged:true,currentUIValidated:false};
}

/** The returned object is deliberately stable across a subsequently reviewed
 * policy append. Runtime physics remains the actual immutable156/4588 checkout.
 * Dynamic current policy is inspected and discarded here, then observed again
 * by the caller immediately before claim and recorded outside math identity. */
export function prefixExecutionEnvironment(runtime,descriptorOverride){
 assertV4Runtime(runtime);const context=snapshotContext(undefined,descriptorOverride);
 const localManifest=path.join(context.executionWorkspace,'docs/rules/manifest.json'),oldRaw=bytes(localManifest);assert.equal(hash(oldRaw),TASK_ENVIRONMENT_PINS.historicalManifest);const old=JSON.parse(oldRaw);
 const lock=verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(context.executionWorkspace,p),'utf8')});assert(lock.ok);assert.equal(lock.activeVersion,'1.156.0');assert.equal(lock.verified.length,159);
 const archive=loadReview(DEFAULT_EXECUTION_POLICY_REVIEW,context);assert.equal(archive.review.reviewedManifest.sha256,TASK_ENVIRONMENT_PINS.preparationManifest);assert.deepEqual(archive.archived.versions.slice(0,159),old.versions);
 const bindings={[context.descriptor.path]:context.descriptor.sha256,[localManifest]:hash(oldRaw),...archive.bindings};
 for(const row of lock.verified){const p=path.resolve(context.executionWorkspace,row.document);bindings[p]=hash(bytes(p));}
 const ui=path.join(context.executionWorkspace,'src/game/ColorEscapeGame.ts');assert.equal(hash(bytes(ui)),TASK_ENVIRONMENT_PINS.historicalUI);assert.equal(context.snapshot.historicalUI.sha256,TASK_ENVIRONMENT_PINS.historicalUI);bindings[ui]=TASK_ENVIRONMENT_PINS.historicalUI;
 const oldPolicy=old.versions.find(r=>r.version==='1.156.0'),math=old.versions.find(r=>r.version==='1.154.0');assert.equal(runtime.policyRuleSha256,oldPolicy.sha256);assert.equal(oldPolicy.sha256,TASK_ENVIRONMENT_PINS.historicalPolicy);assert.equal(runtime.mathRuleSha256,math.sha256);assert.equal(math.sha256,TASK_ENVIRONMENT_PINS.mathematicalPolicy);
 const preparationDoc=archive.review.reviewedDocuments.find(r=>r.version==='1.159.0');assert.equal(preparationDoc.ruleSha256,TASK_ENVIRONMENT_PINS.preparationPolicy);
 const result={descriptor:context.descriptor,executionWorkspace:context.executionWorkspace,sourceWorkspace:context.sourceWorkspace,mathematicalToolchainSha256:FROZEN_MATH_SHA,
  historicalDesignPolicy:{version:'1.156.0',sha256:oldPolicy.sha256,manifest:{path:localManifest,sha256:hash(oldRaw)},document:{path:path.join(context.executionWorkspace,oldPolicy.document),sha256:hash(bytes(path.join(context.executionWorkspace,oldPolicy.document)))}},
  mathematicalContract:{version:'1.154.0',sha256:math.sha256},
  policyReviewedAtPreparation:{version:'1.159.0',sha256:preparationDoc.ruleSha256,review:{...DEFAULT_EXECUTION_POLICY_REVIEW},manifest:archive.review.reviewedManifest,document:preparationDoc.archive},
  historicalManifestArchive:{oldPath:path.join(context.sourceWorkspace,'docs/rules/manifest.json'),expectedSha256:TASK_ENVIRONMENT_PINS.historicalManifest,archivePath:localManifest,archiveSha256:TASK_ENVIRONMENT_PINS.historicalManifest},
  futureInputsOnly:true,currentRuntimeValidationClaimed:false,currentUIValidated:false,bindings};
 observeExecutionPolicy(result);return result;
}

/** Only the exact historical root363 path/digest may be resolved to the real
 * snapshot363 manifest. All other drift rejects; mutable root manifest aliases
 * are never returned as immutable bindings, even if their current hash matches. */
export function mapHistoricalBindingsTask(input,environment){
 observeExecutionPolicy(environment);
 const c=snapshotContext(environment),a=environment.historicalManifestArchive;assert(a);assert.deepEqual(a,{oldPath:path.join(c.sourceWorkspace,'docs/rules/manifest.json'),expectedSha256:TASK_ENVIRONMENT_PINS.historicalManifest,archivePath:path.join(c.executionWorkspace,'docs/rules/manifest.json'),archiveSha256:TASK_ENVIRONMENT_PINS.historicalManifest});
 const bindings={},resolutions=[];
 for(const [oldPath,expectedSha256]of Object.entries(input)){
  const archival=path.isAbsolute(oldPath)&&oldPath===a.oldPath&&expectedSha256===a.expectedSha256;
  if(samePath(oldPath,a.oldPath)&&!archival)throw Error('Only the exact archived historical root manifest is an immutable input');
  const file=archival?a.archivePath:oldPath,actual=hash(bytes(file));assert.equal(actual,expectedSha256,'Historical binding changed: '+oldPath);if(bindings[file])assert.equal(bindings[file],actual);bindings[file]=actual;
  if(archival)resolutions.push({oldPath,expectedSha256,archivePath:file,archiveSha256:actual,reason:'Exact original root156 manifest preserved in the actual historical workspace; current policy is observed separately'});
 }
 return{bindings,resolutions};
}
