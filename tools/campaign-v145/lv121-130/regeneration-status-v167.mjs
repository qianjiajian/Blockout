import fs from 'node:fs';
import path from 'node:path';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const lock=verifyRulesLock();
if(!lock.ok) throw new Error(lock.errors.join('\n'));
const root='deliverables/campaign121-130-v146-20260924';
const find=(dir,rx)=>fs.readdirSync(path.join(root,dir)).filter(name=>rx.test(name)).sort((a,b)=>fs.statSync(path.join(root,dir,b)).mtimeMs-fs.statSync(path.join(root,dir,a)).mtimeMs)[0];
const rows=[
  {id:121,artifact:'agent121-124/candidate121-v166-scaffold.json',status:'BLOCKED_REVIEWED_SOURCE',blockers:['q0 anchors unresolved','bomb timing and hidden cover footprint unresolved','no route/lower-bound/Pointer/natural-clock evidence']},
  {id:122,artifact:`root122/${find('root122',/^candidate122-v166-.*\.json$/)}`,status:'NO_CANDIDATE_IN_BUDGET',blockers:['source video geometry conflicts with current 6x8 geometry','source histogram tiling search produced no candidate','no route/lower-bound/Pointer/natural-clock evidence']},
  {id:123,artifact:'agent121-124/candidate123-v166-scaffold.json',status:'BLOCKED_REVIEWED_SOURCE',blockers:['board mask/anchors unresolved','cover/key-lock/staged tray binding unresolved','no route/lower-bound/Pointer/natural-clock evidence']},
  {id:124,artifact:`agent121-124/${find('agent121-124',/^candidate124-v167-.*\.json$/)}`,status:'GENERATED_ROUTE_UNKNOWN',blockers:['five-cell filler adaptation is explicit and source histogram no longer exact full opening','fresh search exhausted/unknown with 2 explored states','q0 formal-shape audit still needs review','no lower-bound/Pointer/natural-clock evidence']},
  {id:125,artifact:'agent125-127/candidate-125-v166-generated.json',status:'GENERATED_BLOCKED_SOURCE_RECONCILIATION',blockers:['five shells and two bombs lack reviewed anchors/semantics','static/fresh route/lower-bound/Pointer/natural-clock pending']},
  {id:126,artifact:'agent125-127/candidate-126-v166-generated.json',status:'GENERATED_BLOCKED_SOURCE_RECONCILIATION',blockers:['seven shells and two numeric-ice anchors unresolved','one candidate q0 shape needs correction','static/fresh route/lower-bound/Pointer/natural-clock pending']},
  {id:127,artifact:'agent125-127/candidate-127-v166-generated.json',status:'INVALID_CANDIDATE_NEEDS_REBUILD',blockers:['playable coordinate encoding is malformed/nested','gate/cover geometry conflicts with source/current board','static validation failed; no route/lower-bound/Pointer/natural-clock evidence']},
  {id:128,artifact:'agent128-130/candidate128-v166-draft.json',status:'ROUTE_BELOW_TARGET',blockers:['fresh witness has 1 non-clearing drag, below normal 11-15','source q0 and hidden/source review remain incomplete','no Pointer/natural-clock evidence']},
  {id:129,artifact:'agent128-130/candidate129-v166-draft.json',status:'ROUTE_BELOW_TARGET',blockers:['fresh witness has 1 non-clearing drag, below normal 11-15','source anchors/mechanism inventory remain incomplete','no Pointer/natural-clock evidence']},
  {id:130,artifact:'agent128-130/candidate130-v166-draft.json',status:'UNSUPPORTED_SOURCE_MECHANISM',blockers:['three key/lock pairs and cover binding unresolved','solver does not support this key/lock combination','no route/lower-bound/Pointer/natural-clock evidence']},
];
const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,ruleDocument:'docs/rules/mechanism-rules-v1.67.0.md',contract:'v1.45/v1.46 inherited for 121-130',createdAt:new Date().toISOString(),scope:[121,122,123,124,125,126,127,128,129,130],rows,generated:10,verified:0,adopted:0,formalAdopted:false,releaseApproved:false,evidenceBoundary:'The artifacts are isolated regeneration outputs. They are not formal LEVELS writes. Current-active v1.67 revalidation, fresh lower-bound, complete route, final Pointer and natural-clock gates remain open.'};
const file=path.join(root,`regeneration-status-v167-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file:file.replaceAll('\\','/'),activeRuleVersion:lock.activeVersion,rows:rows.map(r=>({id:r.id,status:r.status})),generated:10,verified:0,adopted:0},null,2));
