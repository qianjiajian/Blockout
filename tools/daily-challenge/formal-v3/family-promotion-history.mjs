import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Retirement is permanent for the ordinary selector, even when the child is
 * later removed. Bind the real parent/proposal/source-index bytes; do not trust
 * a familyRoot string or a receipt's boolean as standalone retirement evidence. */
export async function historicalPromotedFamilies(priorIndex,currentReceipts=[]){
 const families=new Map(),seen=new Set(),lineages=createReferenceLineageReader();
 const inspect=async promotion=>{
  assert(promotion&&typeof promotion.familyRoot==='string','Promotion family root required');
  const {retired,proposal,sourceIndex}=promotion;
  assert(retired&&proposal?.path&&proposal.sha256&&sourceIndex?.path&&sourceIndex.sha256,'Complete promotion receipt/proposal/index bindings required');
  const parentBytes=await fs.readFile(retired.receipt);assert.equal(sha(parentBytes),retired.receiptSha256,'Retired parent receipt changed');
  const parent=JSON.parse(parentBytes);assert.equal(parent.formalId,retired.formalId);assert.equal(parent.levelSha256,retired.levelSha256);
  assert.equal(levelSha256(parent.level),retired.levelSha256);assert.equal(parent.baseLevelSha256,retired.baseLevelSha256);assert.equal(parent.baseInputFile,retired.baseInputFile);
  const proposalBytes=await fs.readFile(proposal.path);assert.equal(sha(proposalBytes),proposal.sha256,'Promotion proposal changed');
  const candidate=JSON.parse(proposalBytes);assert(candidate.accepted&&candidate.difficulty===3,'Accepted D3 proposal required');
  assert.equal(levelSha256(candidate.level),candidate.levelSha256);assert.deepEqual(candidate.replacementOf,retired,'Proposal retirement binding changed');
  const sourceBytes=await fs.readFile(sourceIndex.path);assert.equal(sha(sourceBytes),sourceIndex.sha256,'Promotion source index changed');
  assert(JSON.parse(sourceBytes).files.includes(retired.receipt),'Retired parent absent from the bound source index');
  assert.equal(retired.familyRoot,promotion.familyRoot);
  for(const file of [parent.baseInputFile,proposal.path]){
   const lineage=lineages.inspect(file);assert.deepEqual(lineage.roots,[promotion.familyRoot],'Promotion root binding changed');assert.equal(lineage.unknownReasons.length,0,'Unresolved promotion ancestry');
  }
  families.set(promotion.familyRoot,promotion);
 };
 for(const receipt of currentReceipts)if(receipt.familyPromotion)await inspect(receipt.familyPromotion);
 let file=priorIndex;
 while(file){
  assert(!seen.has(file),'Cyclic selection ancestry');seen.add(file);
  const index=JSON.parse(await fs.readFile(file,'utf8'));
  for(const promotion of index.familyPromotions??[])await inspect(promotion);
  file=index.priorIndex;
 }
 for(const familyRoot of families.keys()){
  const live=currentReceipts.filter(r=>lineages.inspect(r.baseInputFile).roots.includes(familyRoot));
  assert(live.length<=1,'Two live representatives of a promoted family');
  if(live.length)assert.equal(live[0].familyPromotion?.familyRoot,familyRoot,'A retired parent cannot be present in the current selection');
 }
 return families;
}
