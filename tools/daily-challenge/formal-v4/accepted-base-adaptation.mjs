import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {createAttemptLedger,designFingerprints} from '../formal-v3/bounded-proof.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sorted=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const bodyKey=b=>levelSha256({cells:sorted(b.shape.map(([x,y])=>[b.x+x,b.y+y])),colors:b.layers??[b.color]});
const withoutId=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='id'));
/** Normalize references by actual body/portal geometry. Merely renaming an
 * entity or key group does not constitute a different mechanism inventory. */
export function mechanismSemanticSignature(level){
 const bodies=new Map(level.blocks.map(b=>[b.id,bodyKey(b)]));
 const groups=new Map();for(const b of level.blocks)if(b.keyId){const members=groups.get(b.keyId)??[];members.push(bodyKey(b));groups.set(b.keyId,members);}
 const group=id=>groups.has(id)?levelSha256(sorted(groups.get(id))):`unbound:${id}`;
 const covers=new Map((level.shutters??[]).map(s=>[s.id,levelSha256({x:s.x,y:s.y,width:s.width,height:s.height,skin:s.skin??'shutter'})]));
 const blocks=level.blocks.flatMap(b=>{
  const m={};if(b.frozen>0)m.frozen=b.frozen;if(b.movementAxis)m.axis=b.movementAxis;
  if(b.keyId)m.key=group(b.keyId);if(b.lockedBy){m.lock=group(b.lockedBy);m.lockCount=b.lockCount??1;}
  if(b.star)m.star=true;if(b.timedBombSeconds!==undefined)m.bomb=b.timedBombSeconds;
  if(b.shutterId)m.hiddenBy=covers.get(b.shutterId)??`unbound:${b.shutterId}`;
  if(b.layers?.length>1)m.layers=b.layers;
  return Object.keys(m).length?[{body:bodyKey(b),...m}]:[];
 });
 return{blocks:sorted(blocks),gates:sorted(level.gates.filter(g=>g.frozen>0||g.star).map(withoutId)),
  flipDoors:sorted((level.flipDoors??[]).map(withoutId)),coloredGrids:sorted((level.coloredGrids??[]).map(g=>({...withoutId(g),cells:sorted([...g.cells])}))),
  shutters:sorted((level.shutters??[]).map(s=>({...withoutId(s),...(s.triggerBlockIds?{triggerBlockIds:sorted(s.triggerBlockIds.map(id=>bodies.get(id)??`unbound:${id}`))}:{})}))),
  generators:sorted((level.generators??[]).map(g=>({...withoutId(g),queueBlockIds:g.queueBlockIds.map(id=>bodies.get(id)??`unbound:${id}`)})))};
}
const retryIdentity=level=>{const f=designFingerprints(level);return levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});};
export const adaptedMechanismIdentity=level=>levelSha256({physical:retryIdentity(level),mechanisms:mechanismSemanticSignature(level)});

/** Frozen v3 accepts only 64-hex redesign parents. Its accepted-identity claim
 * legitimately emits UUID revalidation IDs. Validate such FAILED parents in
 * this wrapper without pretending their accepted origin failed or editing it. */
export async function validateFailedMechanismParent(level,parentId,{ledgerDirectory}){
 if(!/^[a-f0-9]{64}-revalidation-[a-f0-9-]{36}$/.test(parentId??''))throw Error('Expected concrete failed accepted-identity attempt');
 const requestPath=path.join(ledgerDirectory,`${parentId}.request.json`),resultPath=path.join(ledgerDirectory,`${parentId}.result.json`);
 const requestBytes=await fs.readFile(requestPath),resultBytes=await fs.readFile(resultPath);
 const parent=JSON.parse(requestBytes),result=JSON.parse(resultBytes),fresh=designFingerprints(level);
 if(parent.id!==parentId||!parent.revalidates||result.accepted!==false||result.levelSha256!==parent.levelSha256)throw Error('Parent is not the bound failed mechanism proof');
 const previous=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=fresh.colorAssignments.filter(b=>previous.has(b.id));
 const colorsChanged=shared.length?shared.some(b=>previous.get(b.id)!==JSON.stringify(b.colors))
  :levelSha256(sorted(parent.colorAssignments.map(b=>b.colors)))!==levelSha256(sorted(fresh.colorAssignments.map(b=>b.colors)));
 if(parent.shapeSha256===fresh.shapeSha256||parent.colorSha256===fresh.colorSha256||!colorsChanged)throw Error('Failed mechanism input requires BOTH actual new colours and shape inventory');
 return{parentId,requestPath,requestFileSha256:hash(requestBytes),resultPath,resultFileSha256:hash(resultBytes),
  failedLevelSha256:parent.levelSha256,newLevelSha256:levelSha256(level),actualShapeChanged:true,actualColoursChanged:true,
  originalAcceptedMathematicsUnchanged:true};
}

/** A genuinely new mechanism object sharing an already successful base's
 * shape/colour identity may own its FIRST proof. This is not an unrestricted
 * revalidation switch. Old failed identities and previously attempted final
 * mechanism inputs remain locked, even if names, stages or entity IDs change. */
export async function prepareAcceptedMechanismClaim(finalLevel,descriptor,{ledgerDirectory}){
 if(!descriptor||typeof descriptor.path!=='string'||!/^[a-f0-9]{64}$/.test(descriptor.sha256??''))throw Error('Exact accepted base receipt path and SHA required');
 const bytes=await fs.readFile(descriptor.path);if(hash(bytes)!==descriptor.sha256)throw Error('Accepted base receipt bytes changed');
 const base=JSON.parse(bytes),baseSha=levelSha256(base.level);
 if(base.accepted!==true||base.levelSha256!==baseSha||!Array.isArray(base.drags)||!base.attempt?.id)throw Error('Accepted public base receipt required');
 if(base.routeSha256!==undefined&&base.routeSha256!==routeSha256(base.drags))throw Error('Base witness SHA mismatch');
 if(baseSha===levelSha256(finalLevel))throw Error('Same exact object requires zero-search admission');
 if(retryIdentity(base.level)!==retryIdentity(finalLevel))throw Error('Distinct shape/colour inputs must use the ordinary first-attempt path');
 const before=mechanismSemanticSignature(base.level),after=mechanismSemanticSignature(finalLevel);
 if(levelSha256(before)===levelSha256(after))throw Error('A real mechanism inventory change is required, not names or IDs');
 await createAttemptLedger(ledgerDirectory);
 const request=JSON.parse(await fs.readFile(path.join(ledgerDirectory,`${base.attempt.id}.request.json`),'utf8'));
 const result=JSON.parse(await fs.readFile(path.join(ledgerDirectory,`${base.attempt.id}.result.json`),'utf8'));
 if(request.id!==base.attempt.id||request.levelSha256!==baseSha||result.accepted!==true||result.levelSha256!==baseSha)throw Error('Base is not bound to an accepted public mathematical attempt');
 if(levelSha256(request)!==levelSha256(base.attempt))throw Error('Complete accepted base request provenance changed');
 if(base.status!==undefined&&result.status!==base.status)throw Error('Accepted base public result status changed');
 if(base.lowerBound?.result!==undefined&&levelSha256(result.lower)!==levelSha256(base.lowerBound.result))throw Error('Accepted base public lower evidence changed');
 if(base.route?.search!==undefined&&levelSha256(result.upper)!==levelSha256(base.route.search))throw Error('Accepted base public upper evidence changed');
 const identity=retryIdentity(finalLevel),identityRecord=JSON.parse(await fs.readFile(path.join(ledgerDirectory,'identities',`${identity}.json`),'utf8'));
 if(request.retryIdentitySha256!==identity||request.identityOrigin!==identityRecord.origin)throw Error('Accepted base physical retry alias changed');
 for(const file of [path.join(ledgerDirectory,'identities',`${identity}.blocked.json`),path.join(ledgerDirectory,`${identityRecord.origin}.blocked.json`),path.join(ledgerDirectory,`${identityRecord.origin}.revalidation.lock`)]){
  try{await fs.stat(file);throw Error('Failed or pending physical identity cannot use an accepted-base adaptation');}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const finalIdentity=adaptedMechanismIdentity(finalLevel),directory=path.join(ledgerDirectory,'v4-mechanism-inputs');await fs.mkdir(directory,{recursive:true});
 const receipt={kind:'first-distinct-mechanism-object-from-accepted-public-base',baseReceipt:descriptor,baseAttemptId:request.id,
  baseLevelSha256:baseSha,finalLevelSha256:levelSha256(finalLevel),physicalRetryIdentitySha256:identity,
  previousMechanismsSha256:levelSha256(before),finalMechanismsSha256:levelSha256(after),finalMechanismInputIdentity:finalIdentity,
  allowAcceptedIdentityClaim:true,sameExactObjectRevalidation:false,oldMathematicalEvidenceUnchanged:true};
 try{await fs.writeFile(path.join(directory,`${finalIdentity}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});}
 catch(e){if(e.code==='EEXIST')throw Error('FINAL_MECHANISM_INPUT_ALREADY_ATTEMPTED: no metadata/stage retry');throw e;}
 return receipt;
}
