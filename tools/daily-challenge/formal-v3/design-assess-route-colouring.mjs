import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/route-compatible-colouring-assessment-01.json`;
if(fs.existsSync(output))throw Error('Preserve prior assessment');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const evidence=(path,needle,claim)=>{const text=fs.readFileSync(path,'utf8'),index=text.indexOf(needle);if(index<0)throw Error('Evidence anchor absent');return{path,line:text.slice(0,index).split('\n').length,sha256:hash(path),claim};};
const result={status:'READ_ONLY_FEASIBILITY_ASSESSMENT_NOT_IMPLEMENTED_OR_QUALIFIED',newLayoutSearches:0,newLowerSearches:0,oldFailedStocksRetried:0,
 productionChanged:false,proofCoreChanged:false,formalReady:false,
 conclusion:'Feasible in the strictly ordinary static single-layer domain if the original sequence of committed geometry and removals is preserved. Recolouring solely from final exit reachability is unsound.',
 admissibleDomain:['Fixed normal source dimensions and mask; fixed ordinary gates and complete full inventory; no ice, axis, lock/key, star, grids, flips, shells, covers, generators, autonomous bodies or bombs.',
  'Each original non-clearing drag retains its selected body, starting pose, every unit step and committed end pose. Each clearing drag retains its selected body and position in the gesture sequence, but may use one other valid held path to a matching existing gate.',
  'Every body colour domain intersects actual q0 whole-art support for that exact shape and existing ordinary gate colours. When a singleton layers field exists, colour and layers[0] must be changed consistently.',
  'Opening adjacency edges require distinct external colours. No new rule is imposed on transient same-colour adjacency during legal play. Existing colour/gate coverage and any declared stock-count constraints remain CSP constraints.'],
 colourDomainForBody:['For each candidate colour, reject if any earlier non-clearing action for that body has a canonical matching exit on pointer-down, after an intermediate held unit step, or at its final parking pose.',
  'At the original clearing action, other body poses and already removed identities are fixed. Find at most one deterministic, canonical first-contact held path to an existing gate for this colour, with actual full cross-section and exit sweep checks.',
  'A first contact earlier within this final clearing gesture can terminate that same gesture and is valid if the body is removed at the same commit. A first contact in an earlier parking gesture is not silently accepted or repaired.',
  'A stationary unselected body already touching a compatible gate does not clear automatically merely because another body moves; do not reject that colour solely from the idle pose.',
  'Other live body colours do not affect occupancy in this restricted domain. Domain checks may share one geometric occupancy trace, but must not confuse this fact with independent colour selection.'],
 correctnessArgument:{invariant:'Before and after every committed gesture, surviving body IDs, exact shapes and poses equal the supplied original geometric trace. Only their fixed colours differ.',
  base:'The final geometric opening is unchanged and all actual bodies are present; the chosen full colouring satisfies opening static constraints.',
  parking:'The same path remains collision-free because plain collisions depend on mask and occupied footprints. Unary first-contact exclusions prevent a recoloured selected body from disappearing early.',
  clearing:'Only the selected body follows the alternate held path. It clears at the same gesture index; other bodies never move, and the next committed world has precisely the same surviving geometry.',
  induction:'Earlier bodies recoloured independently cannot alter later geometry once their removals occur at these same indices. Adjacency, stock counts and colour coverage still couple the colour variables in a CSP.',
  invalidShortcut:'If an earlier parking action instead clears, all later occupancy frames change. Deleting the body and adapting the suffix is a different strategy and is outside this fixed-trace CSP assessment.'},
 proposedOneShotSequence:['Before any new input is searched, declare this combined constructor and its shared finite budgets; reject previously failed shape stocks regardless of a new colour assignment.',
  'Claim a genuinely new shape/colour construction lineage. A provisional geometric closure with same-colour adjacency may enter the declared CSP phase before it is classified as a failed finished input; no old failed closure is reopened.',
  'Record every body domain with the original parking constraints, chosen exit path, q0 asset bindings and the full geometric trace that justified it. Solve the finite symbolic colour CSP once in a deterministic order.',
  'Choose one full assignment; retain all stock/provenance differences and identity aliases for both provisional and final colour inventories. A later UNKNOWN may not reset the CSP or reuse that shape stock under another colour.',
  'Count each complete coloured world actually instantiated for a domain test, candidate assignment or committed replay in the same construction raw set. Perform exactly one final canonical plus independent complete-route acceptance on the selected assignment.',
  'The recoloured object has a new full SHA and its verified finite U. Predeclare one fresh lower target from U (16,21,31). UNKNOWN stays UNKNOWN and cannot trigger another assignment, floor or solver.'],
 budgetBoundaries:{raw:'At most10000 distinct fully specified labelled worlds across the whole combined constructor, including portal insertions, parking commits, complete colour assignments, removals and any instantiated counterfactual colour world. No reset per colour/body/CSP branch.',
  micro:'Held anchor exploration is micro only while the same selected body, complete colour assignment, gate state and all other bodies remain fixed. A recolour, insertion/removal, changed other-body pose or alternative committed world is not micro.',
  symbolicCsp:'Partial symbolic assignments may have a separately finite CSP-node counter because they are not complete physical worlds. Materialising an assignment as a PuzzleModel/actual world must charge raw before testing it.',
  finiteInternals:'Retain explicit state/transition/micro/time ceilings. Cache keys include full colour assignment, selected body and occupancy/gate identity. Never key only by shape or colour-insensitive quotient.',
  finalValidation:'The two final model replays independently validate one already selected assignment; repeated shared raw world hashes may deduplicate. Do not run repeated trial full replays of many colour assignments without charging their different worlds.'},
 requiredQualifications:[
  {id:'PARK_POINTER_DOWN',case:'Recolour a parked body whose original next nonclear action begins on the new matching gate; reject that colour.'},
  {id:'PARK_INTERMEDIATE_CONTACT',case:'A turning held path crosses a new matching gate before its parking endpoint; reject, even if endpoint itself is not at a gate.'},
  {id:'PARK_ENDPOINT_CONTACT',case:'New matching contact occurs exactly at the old parking endpoint; reject because it is a clear, not a parking commit.'},
  {id:'IDLE_CONTACT',case:'An unselected body is already at its new gate while another body moves; do not assume automatic idle removal.'},
  {id:'ALTERNATE_CLEAR_PATH',case:'A new colour uses a different legal first-contact exit path at the same clearing gesture; prove equal surviving world and full route cost.'},
  {id:'SWEEP_AND_MASK',case:'A matching bounding width does not guarantee a clear sweep on a concave mask; actual collision or narrow portal must reject.'},
  {id:'MUTUAL_COLOUR_CHANGE',case:'Change multiple bodies at once and inductively compare each committed surviving world to the geometry trace.'},
  {id:'CSP_COUPLING',case:'Each body has a nonempty unary domain but adjacency, used-colour coverage or exact declared stock counts make the joint assignment impossible; reject.'},
  {id:'NATIVE_ASSET',case:'Shape matches q0 but its chosen colour asset is absent, or layers[0] retains the old colour; reject.'},
  {id:'RAW_COLOUR_BRANCHES',case:'Complete colour assignments and portal/commit worlds hit a shared cap; state10001 must never be instantiated, regardless of CSP or body transitions.'},
  {id:'ONE_SELECTED_ASSIGNMENT',case:'Final replay or first L fails; ledger blocks further colour assignments for that same failed shape stock.'},
  {id:'DOMAIN_EXCLUSION',case:'Every nonplain mechanism is rejected; no plain independence proof is silently reused for ice/key/grid/hidden/FIFO state.'},
  {id:'TINY_EXHAUSTIVE_ORACLE',case:'Enumerate small-board colour assignments and compare predicted domains/trace outcomes with actual canonical first-contact model replay; include mixed parking and clear actions.'}],
 evidence:[evidence('src/core/PuzzleModel.ts','  canPlace(block: BlockState','Ordinary placement uses occupied cells and mask. The additional colour-dependent collision is coloured-grid logic, excluded from this proposal.'),
  evidence('src/core/PuzzleModel.ts','  moveBlockStep(id: string','Held movement changes exactly the selected body by a unit orthogonal step.'),
  evidence('src/core/PuzzleModel.ts','  private resolveExitAttempt(','Gate matching is colour-dependent and additionally requires actual boundary/cross-section/sweep legality.'),
  evidence('tools/daily-challenge/formal-v2/proof-scheduled-route.mjs','export function canonicalExit','Production-compatible portal choice depends on selected body colour, actual-cell grab, matching sides and inferred movement direction.'),
  evidence('tools/daily-challenge/formal-v3/reverse-route-audit.mjs','    let automatic=canonicalExit','The qualified drag checker rejects pointer-down or intermediate automatic exits inconsistent with the supplied gesture.'),
  evidence('tools/daily-challenge/formal-v2/proof-plain.mjs','export function assertPlainProofDomain','Existing strict plain-domain gate can be reused unchanged.'),
  evidence('tools/daily-challenge/formal-v2/contract.mjs','  const artRequirements = []','Final q0 acceptance binds actual colour/shape asset files, not shape matching alone.')],
 independentReadOnlyReview:'Proof agent independently agreed with the fixed-commit induction, all parking first-contact exclusions, CSP coupling, and charging fully coloured worlds. No implementation or qualification is claimed.'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,status:result.status,newSearches:0}));
const capture=`${root}/reverse-source2-pair-01/report.json`,visual=`${root}/reverse-source2-pair-01/visual-review.json`;
if(fs.existsSync(visual))throw Error('Preserve visual record');
const captured=JSON.parse(fs.readFileSync(capture));
fs.writeFileSync(visual,JSON.stringify({status:'RECOMMEND_REJECT_VISUAL_FAMILY_SIMILARITY',reviewer:'daily_difficulty_catalog',
 actualPairImage:captured.pair,pairSha256:captured.pairSha256,capture:{path:capture,sha256:hash(capture)},viewedActualCanvasPair:true,
 candidate:captured.rows.find(x=>x.name==='candidate').file,reference:captured.rows.find(x=>x.name==='reference').file,
 findings:['Top two rows have the same red irregular shape, pink horizontal block and right orange vertical block in the same places.',
  'Central yellow and lower green horizontal blocks retain the same positions. All gates remain in the same colours and locations.',
  'Changes are mainly shifts of the two purple vertical blocks and the bottom yellow bar, plus small-block exchange. The visible overall construction still reads as the same family.'],
 numericFootprintSimilarity:14/24,mathematicalResultPreserved:{L:21,U:30},formalReady:false,selected:false,
 boundary:'This is a recommendation from the real opening images, not a change to proof receipts or the current selection; root decides before stage adaptation.'},null,2)+'\n');
console.log(JSON.stringify({visual,status:'RECOMMEND_REJECT_VISUAL_FAMILY_SIMILARITY'}));
