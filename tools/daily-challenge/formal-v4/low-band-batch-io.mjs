import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readBound,checkBindings,mergeBindings,realPathWithSuffix,HISTORY_LEDGER_ROOTS as LEGACY_HISTORY_LEDGER_ROOTS,LATE_PREFIX_CONSTRUCTION_LEDGER,claimNativeBatchPlan,write,exists,walkJson,sha} from './native-batch-io.mjs';
export * from './native-batch-io.mjs';
export {LEGACY_HISTORY_LEDGER_ROOTS};
export const ADDITIONAL_HISTORY_LEDGER='deliverables/daily-formal-v4-20261008/design/early-frozen-construction-ledger';
export const HISTORY_LEDGER_ROOTS=Object.freeze([...LEGACY_HISTORY_LEDGER_ROOTS,ADDITIONAL_HISTORY_LEDGER]);

export async function captureLedgerSnapshot(bindings){const roots=[];for(const directory of HISTORY_LEDGER_ROOTS){const files=[];
 for(const file of await exists(directory)?await walkJson(directory):[]){const digest=sha(await fs.readFile(file));mergeBindings(bindings,{[file]:digest});files.push({path:file,sha256:digest});}
 roots.push({directory,files});}return{roots};}

export async function checkLedgerSnapshot(snapshot,{allowedNewFiles=[],qualificationOnly=false,expectedPrivateRoots}={}){
 assert.equal(typeof qualificationOnly,'boolean');const expected=qualificationOnly?expectedPrivateRoots:HISTORY_LEDGER_ROOTS;
 assert(expected?.length);if(!qualificationOnly)assert.equal(expectedPrivateRoots,undefined);
 if(qualificationOnly)for(const dir of expected){const actual=await realPathWithSuffix(dir);for(const root of HISTORY_LEDGER_ROOTS){const p=await realPathWithSuffix(root);assert(actual!==p&&!actual.startsWith(p+path.sep),'Private snapshot aliases shared history');}}
 const norm=p=>path.resolve(p).toLowerCase();assert.deepEqual(snapshot.roots.map(r=>norm(r.directory)).sort(),expected.map(norm).sort(),'Exact complete history root set required');
 const allowed=new Set(allowedNewFiles.map(norm));for(const root of snapshot.roots){const recorded=new Set(root.files.map(d=>norm(d.path)));assert.equal(recorded.size,root.files.length);
 for(const d of root.files){assert(norm(d.path).startsWith(norm(root.directory)+path.sep));await readBound(d);}
 for(const file of await exists(root.directory)?await walkJson(root.directory):[])assert(recorded.has(norm(file))||allowed.has(norm(file)),`Unreviewed shared history added: ${file}`);
 }
}

export async function assertReviewedLowBandQualification(q,bindings={}){
 assert.equal(q.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_PASS');assert.deepEqual(q.errors,[]);
 assert.equal(q.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 for(const key of ['newRealCandidateSearches','newRealCandidateConstructions','publicLedgerClaims'])assert.equal(q[key],0);
 assert.equal(q.publicRequestCountBefore,q.publicRequestCountAfter);assert.equal(q.formalReady,false);
 assert(q.toolBindings?.['tools/daily-challenge/formal-v4/prefix-tail-low-band.mjs']);
 await checkBindings(q.toolBindings);mergeBindings(bindings,q.toolBindings);return bindings;
}

/** Historical joint explorers stored the same result as lower and upper;
 * prefix-tail receipts stored upper under route.search, or omitted it when no
 * search completed. These are exact historical schemas, never a new proof. */
export function assertLowBandFailedParentResult(packet,result){
 assert.equal(packet.accepted,false);assert.equal(result.accepted,false);
 assert.equal(result.status,packet.status);assert.equal(result.levelSha256,packet.levelSha256);
 assert.deepEqual(result.lower,packet.proof);
 if(packet.route!==undefined)assert.deepEqual(result.upper,packet.route?.search);
 else if(result.upper!==undefined)assert.deepEqual(result.upper,packet.proof);
}

export function lowBandConstructionFiles(planDescriptor,proposalSha256,ledgerDirectory=LATE_PREFIX_CONSTRUCTION_LEDGER){
 assert(planDescriptor?.path&&/^[a-f0-9]{64}$/.test(planDescriptor.sha256??''));assert(/^[a-f0-9]{64}$/.test(proposalSha256));
 return [`${planDescriptor.sha256}.claim.json`,`${planDescriptor.sha256}.result.json`,`campaign-${proposalSha256}.execution.json`].map(name=>path.join(ledgerDirectory,name));
}

/** Both immutable proposal and immutable plan are one-shot, so a new label or
 * recompiled plan cannot restart this campaign's fixed physical recipes. */
export async function claimLowBandCampaign(planDescriptor,outputDirectory,options={}){
 assert(options.qualificationOnly===undefined||typeof options.qualificationOnly==='boolean');
 const qualificationOnly=options.qualificationOnly??false,ledgerDirectory=options.ledgerDirectory??LATE_PREFIX_CONSTRUCTION_LEDGER;
 const actual=await realPathWithSuffix(ledgerDirectory);
 if(qualificationOnly){assert(options.ledgerDirectory);for(const root of HISTORY_LEDGER_ROOTS){const p=await realPathWithSuffix(root);assert(actual!==p&&!actual.startsWith(p+path.sep),'Private campaign aliases shared history');}}
 else assert.equal(actual,await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));
 const plan=await readBound(planDescriptor);await readBound(plan.proposal);
 assert.equal(plan.campaign.key,plan.proposal.sha256);assert(/^[a-f0-9]{64}$/.test(plan.campaign.key));
 await fs.mkdir(ledgerDirectory,{recursive:true});
 const campaignFile=path.join(ledgerDirectory,`campaign-${plan.campaign.key}.execution.json`);
 await write(campaignFile,{proposal:plan.proposal,plan:planDescriptor,outputDirectory:path.resolve(outputDirectory),qualificationOnly,claimedAt:new Date().toISOString(),restartAllowed:false,formalReady:false});
 const claim=await claimNativeBatchPlan(planDescriptor,outputDirectory,{qualificationOnly,ledgerDirectory});
 return{...claim,campaignFile};
}
