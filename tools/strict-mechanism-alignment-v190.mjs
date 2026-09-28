import { auditStrictMechanismAlignment as inheritedAudit } from './strict-mechanism-alignment-v170.mjs';

export const STRICT_MECHANISM_ALIGNMENT_VERSION = '1.9.0';
const count = n => Number.isSafeInteger(n) && n >= 0;
const factsOf = v => v?.facts ?? v;
const equalBag = (a,b) => Array.isArray(a) && Array.isArray(b)
  && Array.from(a).every(count) && Array.from(b).every(count) && JSON.stringify([...a].sort((x,y)=>x-y)) === JSON.stringify([...b].sort((x,y)=>x-y));
const dense = value => Array.isArray(value) ? Array.from(value,v=>dense(v??null)) : value && typeof value==='object'
  ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,dense(v)])) : value;

/** These are the disjoint exit categories used by the reviewed v1.7 facts
 * schema, NOT raw overlapping annotations from video truth. Ice+flip evidence
 * must be reviewed into an explicit physical inventory; never sum raw labels.
 * This predicate grants only a count exception, not source or gameplay proof.
 */
export function ordinaryExitReconfiguration(source, design, levelId) {
  const s=factsOf(source)?.mechanisms, d=factsOf(design)?.mechanisms, a=s?.exits, b=d?.exits;
  const rejected=reason=>({allowed:false,reason,ruleVersion:STRICT_MECHANISM_ALIGNMENT_VERSION});
  if(!Number.isInteger(levelId)||levelId<21||levelId>200)return rejected('outside-preview-scope');
  if(!a||!b)return rejected('unknown-exit-inventory');
  if(a.overlappingAttributes||b.overlappingAttributes)return rejected('physical-inventory-review-required');
  const categories=['ordinaryCount','frozenCount','flipCount','starCount','starFrozenCount'];
  if(!categories.every(k=>count(a[k])&&count(b[k])))return rejected('unknown-or-invalid-exit-count');
  const originalNonstar=a.ordinaryCount+a.frozenCount+a.flipCount;
  const preservedNonstar=a.frozenCount+a.flipCount, maxOrdinary=8-preservedNonstar;
  if(originalNonstar<=8)return rejected('no-source-capacity-conflict');
  if(a.ordinaryCount<1||maxOrdinary<1)return rejected('special-exits-leave-no-ordinary-capacity');
  if(b.ordinaryCount<1||b.ordinaryCount>maxOrdinary||b.ordinaryCount>=a.ordinaryCount)return rejected('ordinary-count-not-a-legal-reduction');
  if(!categories.filter(k=>k!=='ordinaryCount').every(k=>a[k]===b[k]))return rejected('special-exit-count-changed');
  if(!equalBag(a.frozenValues,b.frozenValues)||a.frozenValues.length!==a.frozenCount
    ||!equalBag(a.starFrozenValues,b.starFrozenValues)||a.starFrozenValues.length!==a.starFrozenCount)
    return rejected('ice-values-unknown-or-changed');
  if(a.flipCount!==s.flipDoors?.count||b.flipCount!==d.flipDoors?.count)
    return rejected('flip-inventory-inconsistent');
  const states=m=>m.flipDoors?.initialStates;
  if(!Array.isArray(states(s))||!Array.isArray(states(d))||states(s).length!==a.flipCount||states(d).length!==b.flipCount
    ||![...states(s),...states(d)].every(v=>v==='open'||v==='closed')
    ||JSON.stringify([...states(s)].sort())!==JSON.stringify([...states(d)].sort()))return rejected('flip-states-unknown-or-changed');
  return {allowed:true,ruleVersion:STRICT_MECHANISM_ALIGNMENT_VERSION,rule:'v1.9-ordinary-only-capacity-reconfiguration',
    originalNonstar,preservedNonstar,maxOrdinary,originalOrdinary:a.ordinaryCount,designOrdinary:b.ordinaryCount,
    preservedFrozenValues:[...a.frozenValues],preservedStarFrozenValues:[...a.starFrozenValues],
    detail:'Only plain non-ice/non-star/non-flip ports reduced. Source observations retained; all other contracts still checked.'};
}

/** Retains every inherited unknown and other discrepancy. Only two exact
 * count/capacity diagnostics can be resolved by the explicit v1.9 policy.
 * No mutation of source/design and no adjustmentReasons-based waivers.
 */
export function auditStrictMechanismAlignment(source, design, options={}) {
  // Sparse arrays are unknown input slots, not zero entries or empty evidence.
  source=dense(source);design=dense(design);options=dense(options);
  const result=inheritedAudit(source,design,options), policy=ordinaryExitReconfiguration(source,design,result.levelId);
  const approved=[...result.approvedExceptions], comparisons=structuredClone(result.comparisons);
  let issues=[...result.blockedIssues];
  for(const [side,value] of [['source',source],['design',design]]){
    const stars=factsOf(value)?.mechanisms?.exits?.starCount;
    if(count(stars)&&stars>8)issues.push({code:`${side}-star-exit-capacity-conflict`,field:'mechanisms.exits.starCount',
      detail:'At most one physical star port per each of the eight colors.',count:stars});
  }
  if(factsOf(source)?.mechanisms?.exits?.overlappingAttributes||factsOf(design)?.mechanisms?.exits?.overlappingAttributes)
    issues.push({code:'physical-exit-inventory-review-required',field:'mechanisms.exits',detail:'Overlapping ice/flip annotations cannot be counted as separate ports.'});
  if(policy.allowed&&!approved.some(e=>e.field==='mechanisms.exits.ordinaryCount')) {
    const exception={field:'mechanisms.exits.ordinaryCount',sourceValue:policy.originalOrdinary,designValue:policy.designOrdinary,
      status:'approved-exception',...policy};
    approved.push(exception);
    issues=issues.filter(i=>!(i.code==='mechanism-count-mismatch'&&i.field===exception.field)
      &&!(i.code==='source-exit-capacity-conflict'&&i.field==='mechanisms.exits'));
    const index=comparisons.findIndex(c=>c.field===exception.field);if(index>=0)comparisons[index]=exception;
  }
  const sourceAligned=issues.length===0&&result.unresolved.length===0;
  return {...result,ruleVersion:STRICT_MECHANISM_ALIGNMENT_VERSION,sourceAligned,
    exactMatch:sourceAligned&&approved.length===0,knownFieldsMatch:issues.length===0,
    blockedIssues:issues,approvedExceptions:approved,comparisons,ordinaryExitPolicy:policy};
}
