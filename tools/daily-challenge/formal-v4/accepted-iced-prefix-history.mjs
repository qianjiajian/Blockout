import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {captureLatestSevenHistory,assertLatestSevenHistoryUnchanged,latestHistoryStockImages} from './latest-seven-history-preflight.mjs';
import {readBound,realPathWithSuffix,sha,mergeBindings,checkBindings,exists} from './native-batch-io.mjs';
import {exactDescriptor} from './low-band-advanced-batch-contract.mjs';

const own='tools/daily-challenge/formal-v4/accepted-iced-prefix-history.mjs';
const key=p=>path.resolve(p).toLowerCase();
const same=(a,b,message)=>assert.equal(levelSha256(a),levelSha256(b),message);
const physical=level=>{const f=designFingerprints(level);return{retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),designSha256:f.designSha256};};

/** Read-only supplement for a separately authenticated accepted iced receipt.
 * It does not accept mathematics, create a candidate, or claim any identity.
 * Public/capacity roots are snapshotted while their failed/pending/reuse guard
 * remains the caller's original admission/constructor responsibility. */
export async function inspectAcceptedIcedHistory(base,{qualificationOnly=false,privateRoots}={},bindings={}){
 assert.equal(typeof qualificationOnly,'boolean');assert(base.accepted&&base.level&&base.plan&&base.input);
 assert.equal(base.levelSha256,levelSha256(base.level));
 const icedDescriptor=exactDescriptor(base.plan.constructionEvidence),plainDescriptor=exactDescriptor(base.plan.plainConstructionEvidence);
 const input=await readBound(exactDescriptor(base.input),bindings),iced=await readBound(icedDescriptor,bindings),plain=await readBound(plainDescriptor,bindings);
 assert.equal(plain.levelSha256,levelSha256(plain.level));assert.equal(plain.levelSha256,base.plan.plainLevelSha256);
 same(iced.level,base.level,'Exact accepted iced world');same(input.level,base.level,'Exact input iced world');
 same(iced.plain,plain,'Iced constructor must bind the complete original plain report');same(input.plain,plain,'Input must preserve the exact plain report');
 same(iced.plainConstructionEvidence,plainDescriptor,'Plain evidence must be owned by the exact iced constructor');
 same(input.constructionEvidence,icedDescriptor);same(input.plainConstructionEvidence,plainDescriptor);
 assert(latestHistoryStockImages(iced).some(s=>s.levelSha256===base.levelSha256));
 assert(latestHistoryStockImages(plain).some(s=>s.levelSha256===plain.levelSha256));
 const icedPath=await realPathWithSuffix(icedDescriptor.path),plainPath=await realPathWithSuffix(plainDescriptor.path);
 assert.notEqual(key(icedPath),key(plainPath),'Two separate original construction records are required');
 const allowed=[{evidence:icedDescriptor,realPath:icedPath,levelSha256:base.levelSha256,kind:'own-iced'},
  {evidence:icedDescriptor,realPath:icedPath,levelSha256:plain.levelSha256,kind:'own-embedded-plain'},
  {evidence:plainDescriptor,realPath:plainPath,levelSha256:plain.levelSha256,kind:'own-bound-plain'}];
 const sought=[physical(base.level),physical(plain.level)],options={qualificationOnly,privateRoots};
 const snapshot=await captureLatestSevenHistory(options,bindings),stocks=[],seen=new Set(),terminals=[];
 const read=descriptor=>readBound(descriptor,bindings);
 async function add(q,evidence,origin){
  const actual=await realPathWithSuffix(evidence.path);
  for(const image of latestHistoryStockImages(q)){
   const k=key(actual)+'|'+evidence.sha256+'|'+image.levelSha256;if(seen.has(k))continue;seen.add(k);
   const {level,...facts}=image;stocks.push({...facts,evidence,realPath:actual,origin});
  }
 }
 for(const [i,root]of snapshot.roots.entries()){
  if(i===0||i===4)continue;
  for(const descriptor of root.files){
   const q=await read(descriptor);await add(q,descriptor,'static-ledger-direct');
   if(q.constructionFiles!==undefined){assert(Array.isArray(q.constructionFiles));for(const d of q.constructionFiles){exactDescriptor(d);await add(await read(d),d,'listed-construction-file');}}
   if(!descriptor.path.endsWith('.claim.json')||!q.outputDirectory)continue;
   const resultPath=descriptor.path.replace(/\.claim\.json$/,'.result.json'),resultDescriptor=root.files.find(d=>key(d.path)===key(resultPath));
   assert(resultDescriptor,'Unfinished static constructor in accepted iced history');
   const result=await read(resultDescriptor);same(result.plan,q.plan);assert.equal(key(await realPathWithSuffix(result.outputDirectory)),key(await realPathWithSuffix(q.outputDirectory)));
   assert(Array.isArray(result.constructionFiles));const indexPath=path.join(q.outputDirectory,'index.json');assert(await exists(indexPath));
   const indexBytes=await fs.readFile(indexPath),indexDescriptor={path:indexPath,sha256:sha(indexBytes)},index=await read(indexDescriptor);
   same(index.plan,q.plan);assert(Array.isArray(index.attempts));
   const listed=new Map(result.constructionFiles.map(d=>[key(d.path),d.sha256]));assert.equal(listed.size,result.constructionFiles.length);
   assert.equal(index.attempts.length,result.constructionFiles.length);
   for(const attempt of index.attempts){const d=exactDescriptor(attempt.constructionEvidence);assert.equal(listed.get(key(d.path)),d.sha256);}
   for(const d of result.constructionFiles)terminals.push({evidence:d,claim:descriptor,result:resultDescriptor,index:indexDescriptor,plan:q.plan});
  }
 }
 const terminal=terminals.find(t=>key(t.evidence.path)===key(icedDescriptor.path)&&t.evidence.sha256===icedDescriptor.sha256);
 assert(terminal,'Exact iced construction must be enumerated in a finished constructor and its original index');
 same(iced.plan,terminal.plan,'Iced stock plan differs from its terminal construction plan');
 // The real early-prefix constructor lists its iced report once; its plain
 // report is an exact nested descriptor, not a second invented terminal row.
 await add(iced,icedDescriptor,'own-terminal-iced');await add(plain,plainDescriptor,'plain-linked-by-own-terminal-iced');
 const ownMatches=[],collisions=[];
 for(const stock of stocks){
  if(!sought.some(f=>f.retryIdentitySha256===stock.retryIdentitySha256||f.designSha256===stock.designSha256))continue;
  const owned=allowed.find(a=>key(a.realPath)===key(stock.realPath)&&a.evidence.sha256===stock.evidence.sha256&&a.levelSha256===stock.levelSha256);
  if(owned)ownMatches.push({...stock,exemption:owned.kind});else collisions.push(stock);
 }
 assert(ownMatches.some(s=>s.exemption==='own-iced'));assert(ownMatches.some(s=>s.exemption==='own-bound-plain'));
 assert.equal(collisions.length,0,'Accepted iced base collides with another completed, failed or pending static physical stock');
 mergeBindings(bindings,{[own]:sha(await fs.readFile(own))});await checkBindings(bindings);await assertLatestSevenHistoryUnchanged(snapshot,options);
 return{version:'accepted-iced-own-terminal-and-bound-plain-history-v1',passed:true,qualificationOnly,snapshot,own:{iced:icedDescriptor,plain:plainDescriptor,terminal},
  ownMatches,collisions,staticWorldImagesCompared:stocks.length,fileBindings:bindings,
  plainTerminalBinding:'Exact plain report is referenced by the terminal-listed iced construction and preserved in original input',
  publicAndCapacityImmediateGuardOwnedByCaller:true,newSearches:0,newConstructions:0,newLedgerClaims:0,ledgerWrites:0,formalReady:false};
}
