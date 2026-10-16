import fs from 'node:fs/promises';
import {boardCells,digest} from './diversity-layout-factory.mjs';

export function reverseTemplateFingerprints(level){
 const inventory=level.blocks.map(b=>{const minX=Math.min(...b.shape.map(p=>p[0])),minY=Math.min(...b.shape.map(p=>p[1]));
   return{shape:b.shape.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]),color:b.color};});
 const shapes=inventory.map(b=>digest(b.shape)).sort(),colours=inventory.map(b=>b.color).sort();
 return{inputSha256:digest({width:level.width,height:level.height,playable:boardCells(level).map(p=>p.join(',')).sort(),
   inventory:inventory.map(digest).sort(),gates:level.gates.map(g=>({color:g.color,side:g.side,offset:g.offset,size:g.size})).sort((a,b)=>a.color.localeCompare(b.color))}),
   shapeInventorySha256:digest(shapes),colourInventorySha256:digest(colours),templateLevelSha256:digest(level)};
}

/** A second seed, rearrangement of discarded template positions or a larger
 * construction budget cannot reopen an already claimed shape/color/gate stock.
 * This is separate from the public final-layout proof ledger.
 */
export async function createReverseConstructionLedger(directory){
 await fs.mkdir(directory,{recursive:true});
 const read=path=>fs.readFile(path,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 const existingInputs=new Set();
 // Preserve old receipts byte-for-byte while recognising their inventory with
 // today's canonical cell order. No failed input disappears after this fix.
 for(const entry of await fs.readdir(directory,{withFileTypes:true}))if(entry.isDirectory()){
   const old=await read(`${directory}/${entry.name}/claim.json`);
   if(old?.constructionTemplateLevel)existingInputs.add(reverseTemplateFingerprints(old.constructionTemplateLevel).inputSha256);
 }
 for(const entry of await fs.readdir(directory))if(entry.startsWith('final-stock-alias-')&&entry.endsWith('.json')){const alias=await read(`${directory}/${entry}`);if(alias?.inputSha256)existingInputs.add(alias.inputSha256);}
 return{
  async claim(template,{sourceLevelId,seed,budget}){
   const fingerprints=reverseTemplateFingerprints(template);let previous=await read(`${directory}/source-${sourceLevelId}-last-failure.json`);
   if(previous?.resultPath){const old=await read(previous.resultPath.replace(/\/result\.json$/,'/claim.json'));
     if(old?.constructionTemplateLevel)previous=reverseTemplateFingerprints(old.constructionTemplateLevel);}
   if(existingInputs.has(fingerprints.inputSha256))throw Error('This physical reverse-construction inventory was already claimed');
   if(previous&&(fingerprints.shapeInventorySha256===previous.shapeInventorySha256||fingerprints.colourInventorySha256===previous.colourInventorySha256))
     throw Error('Failed construction requires both new shape inventory and new colour inventory; positional/seed changes are insufficient');
   const path=`${directory}/${fingerprints.inputSha256}`;await fs.mkdir(path,{recursive:false});existingInputs.add(fingerprints.inputSha256);
   const claim={schemaVersion:1,sourceLevelId,seed,budget,...fingerprints,constructionTemplateLevel:structuredClone(template),claimedAt:new Date().toISOString()};
   await fs.writeFile(`${path}/claim.json`,JSON.stringify(claim,null,2)+'\n',{flag:'wx'});return{path,...claim};
  },
  async registerFinalStock(attempt,level){
   const fingerprints=reverseTemplateFingerprints(level);
   if(fingerprints.inputSha256===attempt.inputSha256)return null;
   if(existingInputs.has(fingerprints.inputSha256))throw Error('Final recoloured stock was already claimed; do not search it again');
   const alias={...fingerprints,originalClaimPath:attempt.path,originalInputSha256:attempt.inputSha256,kind:'declared-route-compatible-colouring-final-stock'};
   await fs.writeFile(`${directory}/final-stock-alias-${fingerprints.inputSha256}.json`,JSON.stringify(alias,null,2)+'\n',{flag:'wx'});
   existingInputs.add(fingerprints.inputSha256);return alias;
  },
  async finish(attempt,result){
   await fs.writeFile(`${attempt.path}/result.json`,JSON.stringify({status:result.status,constructed:Boolean(result.ok),formalReady:false,
     reason:result.reason??null,U:result.U??null,levelSha256:result.levelSha256??null,construction:result.construction},null,2)+'\n',{flag:'wx'});
   if(!result.ok)await fs.writeFile(`${directory}/source-${attempt.sourceLevelId}-last-failure.json`,JSON.stringify({
     inputSha256:attempt.inputSha256,shapeInventorySha256:attempt.shapeInventorySha256,colourInventorySha256:attempt.colourInventorySha256,
     resultPath:`${attempt.path}/result.json`},null,2)+'\n');
  },
  async recordProofOutcome(attempt,{accepted,status,levelSha256}){
   await fs.writeFile(`${attempt.path}/proof-outcome.json`,JSON.stringify({accepted,status,levelSha256,formalReady:false},null,2)+'\n',{flag:'wx'});
   if(!accepted)await fs.writeFile(`${directory}/source-${attempt.sourceLevelId}-last-failure.json`,JSON.stringify({
     inputSha256:attempt.inputSha256,shapeInventorySha256:attempt.shapeInventorySha256,colourInventorySha256:attempt.colourInventorySha256,
     resultPath:`${attempt.path}/result.json`,failurePhase:'final-layout-admission-or-lower',proofOutcomePath:`${attempt.path}/proof-outcome.json`},null,2)+'\n');
  }
 };
}
