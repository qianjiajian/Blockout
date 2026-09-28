// Alignment-only check. Source evidence authenticity and all gameplay/coverage
// checks are owned by the caller; this never issues a release certificate.
export function auditStrictBoardAlignment({source, candidate, preservedIrregular}) {
  const blockedIssues=[],unresolved=[];
  const issue=(code,detail)=>blockedIssues.push({code,detail});
  const width=candidate?.width,height=candidate?.height;
  const validSize=(w,h)=>Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&w>0&&h>0;
  function cells(value,w,h) {
    if(!validSize(w,h)||!Array.isArray(value)||!value.length) return null;
    if(value.some(c=>!Array.isArray(c)||c.length!==2||!c.every(Number.isSafeInteger)||c[0]<0||c[1]<0||c[0]>=w||c[1]>=h)) return null;
    const keys=value.map(([x,y])=>`${x},${y}`);
    return new Set(keys).size===keys.length ? keys.sort() : null;
  }
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const seams=value=>value==null?[]:!Array.isArray(value)||value.some(s=>!s||!['horizontal','vertical'].includes(s.orientation)||![s.offset,s.start,s.size].every(Number.isSafeInteger)||s.offset<1||s.start<0||s.size<1)?null:value.map(s=>[s.orientation,s.offset,s.start,s.size]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // Omitted playable is the runtime's full rectangle, not missing source data.
  const actual=candidate?.playable==null&&validSize(width,height)&&width*height<=10000
    ? cells(Array.from({length:width*height},(_,i)=>[i%width,Math.floor(i/width)]),width,height)
    : cells(candidate?.playable,width,height);
  if(!actual) issue('invalid-candidate-mask','Candidate cells must be unique in-bounds integer coordinates.');
  if(candidate?.blocked?.length) issue('extra-blocked-cells','Do not disguise a different playable outline with additional blocked cells.');
  if(source?.levelId!=null&&source.levelId!==candidate?.id) issue('source-level-mismatch','Source evidence must belong to this level.');
  if(!source || !['normal','irregular'].includes(source.kind)) unresolved.push({code:'source-classification-unknown'});
  else {
    if(!source.evidence) unresolved.push({code:'source-evidence-missing'});
    if(!validSize(source.width,source.height)) unresolved.push({code:'source-dimensions-unknown'});
    else if(width!==source.width||height!==source.height) issue('dimensions-differ','Known source width/height must match.');
    if(source.kind==='normal') {
      const expected=cells(source.cells,source.width,source.height);
      if(source.hasSeams===true || source.components>1 || source.blocked?.length || source.seams?.length) unresolved.push({code:'source-topology-needs-review'});
      if(!expected) unresolved.push({code:'source-mask-unknown'});
      else if(expected.length!==source.width*source.height) issue('not-normal-source','An enclosing rectangle is not a complete playable rectangle.');
      else if(actual&&!same(actual,expected)) issue('normal-outline-differs','Normal boards must equal the full source rectangle; originality is not required.');
      if(candidate?.seams?.length) issue('normal-seam-added','Do not insert separation into a normal rectangle.');
    } else {
      const old=preservedIrregular;
      if(!old || old.id!==candidate?.id || !old.evidence) unresolved.push({code:'preserved-outline-baseline-missing'});
      else {
        const expected=cells(old.playable,old.width,old.height);
        if(!expected) unresolved.push({code:'preserved-outline-baseline-invalid'});
        else if(width!==old.width||height!==old.height||!same(actual,expected)) issue('original-irregular-outline-changed','Keep the current original mask, not the competitor mask.');
        const actualSeams=seams(candidate?.seams),oldSeams=seams(old.seams);
        if(actualSeams===null) issue('invalid-candidate-seams','Separation geometry must use integer fields.');
        if(oldSeams===null) unresolved.push({code:'preserved-seam-baseline-invalid'});
        else if(actualSeams&&!same(actualSeams,oldSeams)) issue('original-irregular-seams-changed','Keep the original separation topology.');
      }
    }
  }
  return {ruleVersion:'1.7.0',blockedIssues,unresolved,outlineAligned:!blockedIssues.length&&!unresolved.length,gameplayValidated:false,releaseApproved:false};
}
