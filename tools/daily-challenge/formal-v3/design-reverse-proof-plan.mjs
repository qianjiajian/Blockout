/** Select once from a complete actual-model witness, before any proof claim.
 * UNKNOWN never triggers a different floor or another search. */
export function proofPlanForKnownU(U){
 if(!Number.isSafeInteger(U)||U<0)throw Error('A finite complete integer witness cost is required');
 if(U<16)return{eligible:false,difficulty:null,floor:null,knownU:U};
 const difficulty=U<=20?1:U<=30?2:3;
 return{eligible:true,difficulty,floor:[0,16,21,31][difficulty],knownU:U};
}

export function classifyKnownWitnessLower(plan,result){
 if(!plan.eligible)return null;
 if(result.status==='threshold-proven'&&result.thresholdProven===true&&result.certifiedFloor>=plan.floor)
  return{difficulty:plan.difficulty,L:plan.floor,U:plan.knownU,requiresShortcutReplay:false};
 // A completed same-search plain shortest counterexample supplies both bounds;
 // the caller must replay its exact drags twice before using this classification.
 if(result.status==='relaxed-shortcut'&&Number.isSafeInteger(result.cost)&&result.cost>=16&&result.cost<plan.floor&&Array.isArray(result.drags)){
  const candidate=proofPlanForKnownU(result.cost);
  return{difficulty:candidate.difficulty,L:result.cost,U:result.cost,requiresShortcutReplay:true};
 }
 return null;
}
