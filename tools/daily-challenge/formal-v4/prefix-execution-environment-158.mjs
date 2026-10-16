import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {assertV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
export {currentMainlineSourceBinding} from './prefix-execution-environment.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>fs.readFileSync(p);
const equalPath=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
export const PREFIX_158_PINS=Object.freeze({
 precedingPolicy:'4a34f0466f58f2562c98b3813f9634bb402ee4bcc422e4fa42de04df5be6f377',
 historicalManifest:'363adec66ed5c54cf59bf394ec95da19fa8ac03460846cb7d5a268f9e679a842',
 currentManifest:'0e2700a7ecdbeaaa85ba91a6ef7f63f0b0f0e95bcef2e5ae11fe872fad938a81',
 historicalPolicy:'71cbdc5c52b8d02b191c0db83c5a7875948450226473ad848817296de491b90a',
 currentPolicy:'519598c549cbdeed4a994baa70353ea1525713ea105a56b7f1660528bc894c08',
 mathematicalPolicy:'5b8986873d7014f6d6612f3678891e295e72d30431f2b3b0bd67c2dd91d4698c',
 environment:'8d52d96c73b87b9c95207757164d0e95876e3f434f3540750eb605d18d7e2583',
 historicalUI:'2a59877eab3b89e5d599d34eacf7dcf797b588be29cdd49b9832ac0ec691b90a',
});

/** Pure metadata guard for private negative tests. Exact production file bytes
 * are independently pinned before this structural comparison is used. */
export function assertPolicy158AppendOnly(historical,current){
 assert.equal(historical.activeVersion,'1.156.0');assert.equal(current.activeVersion,'1.158.0');
 assert.equal(historical.versions.length,159);assert.equal(current.versions.length,161);
 assert.deepEqual(current.versions.slice(0,159),historical.versions,'All 159 old rule entries must be unchanged');
 const {activeVersion:ha,versions:hv,...hr}=historical,{activeVersion:ca,versions:cv,...cr}=current;
 assert.deepEqual(hr,cr);const previous=current.versions[159];assert.equal(previous.version,'1.157.0');assert.equal(previous.document,'docs/rules/mechanism-rules-v1.157.0.md');assert.equal(previous.sha256,PREFIX_158_PINS.precedingPolicy);assert.equal(previous.status,'frozen');const row=current.versions[160];assert.equal(row.version,'1.158.0');assert.equal(row.document,'docs/rules/mechanism-rules-v1.158.0.md');
 assert.equal(row.sha256,PREFIX_158_PINS.currentPolicy);assert.equal(row.status,'frozen');return true;
}

/** Future inputs only. The actual historical checkout remains 156/4588. This
 * validates today's 158 policy independently, never overwriting old manifests
 * or pretending the current UI belongs to the historical mathematical closure. */
export function prefixExecutionEnvironment158(runtime,descriptor){
 assertV4Runtime(runtime);assert.equal(runtime.toolchainSha256,FROZEN_MATH_SHA);
 const file=path.resolve(descriptor?.path??'snapshot-environment.json'),raw=bytes(file),digest=hash(raw);
 assert.equal(digest,PREFIX_158_PINS.environment,'Exact historical workspace descriptor required');if(descriptor)assert.equal(digest,descriptor.sha256);
 const e=JSON.parse(raw);assert.equal(e.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert(equalPath(e.workspace,process.cwd()));
 assert.equal(e.frozenMath,FROZEN_MATH_SHA);assert.equal(e.currentRuntimeValidationClaimed,false);
 const currentRoot=path.resolve(e.sourceWorkspace),historicalRoot=path.resolve(e.workspace),rootManifest=path.join(currentRoot,'docs/rules/manifest.json'),localManifest=path.join(historicalRoot,'docs/rules/manifest.json');
 assert(!equalPath(rootManifest,localManifest));const oldRaw=bytes(localManifest),newRaw=bytes(rootManifest);
 assert.equal(hash(oldRaw),PREFIX_158_PINS.historicalManifest);assert.equal(hash(newRaw),PREFIX_158_PINS.currentManifest);
 const old=JSON.parse(oldRaw),now=JSON.parse(newRaw);assertPolicy158AppendOnly(old,now);
 const locks={historical:verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(historicalRoot,p),'utf8')}),current:verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(currentRoot,p),'utf8')})};
 assert(locks.historical.ok,locks.historical.errors.join(';'));assert(locks.current.ok,locks.current.errors.join(';'));
 assert.equal(locks.historical.verified.length,159);assert.equal(locks.current.verified.length,161);
 const bindings={[file]:digest,[localManifest]:hash(oldRaw),[rootManifest]:hash(newRaw)};
 for(const [root,lock]of [[historicalRoot,locks.historical],[currentRoot,locks.current]])for(const r of lock.verified){const p=path.resolve(root,r.document);bindings[p]=hash(bytes(p));}
 const row156=old.versions.find(r=>r.version==='1.156.0'),row154=old.versions.find(r=>r.version==='1.154.0'),row158=now.versions.at(-1);
 assert.equal(row156.sha256,PREFIX_158_PINS.historicalPolicy);assert.equal(runtime.policyRuleSha256,row156.sha256);assert.equal(row154.sha256,PREFIX_158_PINS.mathematicalPolicy);assert.equal(runtime.mathRuleSha256,row154.sha256);
 const currentDoc=path.resolve(currentRoot,row158.document);assert.equal(hash(bytes(currentDoc)),PREFIX_158_PINS.currentPolicy);
 assert(bytes(currentDoc).toString('utf8').includes('每日300重制进度及既有主线/联赛100/每日450正式数据保持'));
 const doc157=path.resolve(currentRoot,now.versions[159].document);assert.equal(hash(bytes(doc157)),PREFIX_158_PINS.precedingPolicy);assert(bytes(doc157).toString('utf8').includes('每日300关重制、联赛100及主线/经济/旧证据继续保持'));
 const ui=path.resolve('src/game/ColorEscapeGame.ts');assert.equal(hash(bytes(ui)),PREFIX_158_PINS.historicalUI);assert.equal(e.historicalUI.sha256,PREFIX_158_PINS.historicalUI);bindings[ui]=hash(bytes(ui));
 const describe=(root,row,manifestPath)=>({version:row.version,sha256:row.sha256,manifest:{path:manifestPath,sha256:hash(bytes(manifestPath))},document:{path:path.resolve(root,row.document),sha256:hash(bytes(path.resolve(root,row.document)))}});
 return{descriptor:{path:file,sha256:digest},executionWorkspace:historicalRoot,sourceWorkspace:currentRoot,mathematicalToolchainSha256:FROZEN_MATH_SHA,
  historicalDesignPolicy:describe(historicalRoot,row156,localManifest),currentActivePolicy:describe(currentRoot,row158,rootManifest),mathematicalContract:{version:row154.version,sha256:row154.sha256},
  ruleLocks:{historical:{status:'PASS',activeVersion:locks.historical.activeVersion,verified:159},current:{status:'PASS',activeVersion:locks.current.activeVersion,verified:161}},
  historicalManifestArchive:{oldPath:rootManifest,expectedSha256:PREFIX_158_PINS.historicalManifest,archivePath:localManifest,archiveSha256:PREFIX_158_PINS.historicalManifest},
  futureInputsOnly:true,currentRuntimeValidationClaimed:false,currentUIValidated:false,bindings};
}
export {prefixExecutionEnvironment158 as prefixExecutionEnvironment};

/** Only one historical path+digest pair is archived. All other input bytes are
 * checked at their original path. The old root path is never emitted with its
 * obsolete digest in new-plan bindings. */
export function mapHistoricalBindings158(input,environment){
 const descriptorBytes=bytes(environment.descriptor.path);assert.equal(hash(descriptorBytes),PREFIX_158_PINS.environment);assert.equal(environment.descriptor.sha256,PREFIX_158_PINS.environment);
 const actual=JSON.parse(descriptorBytes);assert.equal(environment.sourceWorkspace,path.resolve(actual.sourceWorkspace));assert.equal(environment.executionWorkspace,path.resolve(actual.workspace));
 const a=environment.historicalManifestArchive;assert(a);assert.equal(a.expectedSha256,PREFIX_158_PINS.historicalManifest);assert.equal(a.archiveSha256,a.expectedSha256);
 assert.equal(a.oldPath,path.join(environment.sourceWorkspace,'docs/rules/manifest.json'));assert.equal(a.archivePath,path.join(environment.executionWorkspace,'docs/rules/manifest.json'));
 const bindings={},resolutions=[];
 for(const [oldPath,expectedSha256]of Object.entries(input)){
  const archival=path.isAbsolute(oldPath)&&oldPath===a.oldPath&&expectedSha256===a.expectedSha256;
  const file=archival?a.archivePath:oldPath;const actual=hash(bytes(file));assert.equal(actual,expectedSha256,'Historical binding changed: '+oldPath);
  if(bindings[file])assert.equal(bindings[file],actual);bindings[file]=actual;
  if(archival)resolutions.push({oldPath,expectedSha256,archivePath:file,archiveSha256:actual,reason:'Exact original 156 root manifest preserved in actual historical workspace; current root remains 158'});
 }
 return{bindings,resolutions};
}
