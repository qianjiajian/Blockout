import fs from 'node:fs';
import path from 'node:path';
import {loadApi} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const OUT='deliverables/campaign121-130-v146-20260924';
const ids=Array.from({length:10},(_,i)=>121+i);
const blockers={
  121:['source full-shape anchors and exit positions missing','source mechanism set conflicts with current ice/two-bomb layout','two current blocks lack native q0 artwork'],
  122:['source text mentions two bottom bombs but structured bombs field is empty','source exit colours/offsets need frame confirmation','current covers/generator/shell/ice set needs source reconciliation'],
  123:['source board mask and hidden staging ranges incomplete','three current opening shapes lack native q0 artwork','hidden coverage currently fails'],
  124:['five current irregular shapes lack native q0 artwork','source anchors and bomb/ice/shell placement need frame confirmation'],
  125:['source U-shaped mask and current rectangular board conflict','source five shells, two bombs and two covers are absent from current layout','source full-shape anchors and exits incomplete'],
  126:['source shell anchors/full shapes incomplete','one current opening shape lacks native q0 artwork','super-band fresh lower bound not run on a reviewed candidate'],
  127:['source board is 7x8 while current board is 7x9','hidden coverage currently fails','generator queue/cover/shell anchors need source confirmation'],
  128:['two current opening shapes lack native q0 artwork','source H3 badge interaction is unsupported/unclear','source full composition and shutter coverage need review'],
  129:['source board mask and full shape histogram incomplete','source generators/cover/ice/shells are absent from current layout','one current opening shape lacks native q0 artwork'],
  130:['source keys/locks and cover conflict with current bombs/shells','source full composition and exit inventory incomplete','duplicate-blue exit possibility needs frame confirmation'],
};
const lock=verifyRulesLock();
if(!lock.ok)throw new Error(lock.errors.join('\n'));
const {api}=await loadApi();
const truth=JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json','utf8'));
const byId=new Map(truth.levels.map(row=>[Number(row.level),row]));
const rows=ids.map(id=>{
  const level=api.LEVELS.find(row=>row.id===id), source=byId.get(id);
  return {id,sourceRecordSha256:digest(source),currentLevelSha256:digest(level),sourceFields:{composition:source.composition,mechanisms:source.mechanisms,requiredExactFieldsMissing:source.required_exact_fields_missing??[],unclear:source.source_unclear_fields??[]},currentSummary:{geometry:[level.width,level.height,level.playable.length],blocks:level.blocks.length,shutters:level.shutters?.length??0,generators:level.generators?.length??0,gates:level.gates.length},reviewStatus:'BLOCKED_NEEDS_REVIEWED_SOURCE_AND_NEW_CANDIDATE',blockers:blockers[id],candidate:null,formalAdopted:false};
});
const result={schemaVersion:1,activeRuleVersion:lock.activeVersion,scope:ids,createdAt:new Date().toISOString(),sourceFile:'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json',rows,notes:['This ledger separates source facts from current LEVELS.','Unknown or contradictory fields remain blockers; no values are inferred as zero.','No candidate, route, lower-bound, Pointer or production adoption is asserted.']};
const file=path.join(OUT,`source-ledger-v165-${Date.now()}.json`);
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:file.replaceAll('\\','/'),activeRuleVersion:lock.activeVersion,rows:rows.map(row=>({id:row.id,status:row.reviewStatus,blockers:row.blockers.length})),formalAdopted:false},null,2));
