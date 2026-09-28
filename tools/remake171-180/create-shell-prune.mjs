import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/remake171-180/assist172';
fs.mkdirSync(dir,{recursive:true});
let s=fs.readFileSync('tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs','utf8');
const change=(a,b)=>{assert(s.includes(a),a);s=s.replace(a,b);};
change('public bool successorsOnly;', 'public bool successorsOnly,disableTerminalPrune;');
change('long explored,transitions;', 'long explored,transitions,terminalPruned;');
change(' void Guard(){', `
 // After Normalize has exhausted every final-body removal, a no-budget state
 // can progress only by peeling a shell at zero cost. Search ALL held poses;
 // checking only the current anchor would incorrectly erase legal peel paths.
 bool HasFreePeel(World s){int clears=Clears(s);Mask128 occupied=Occupied(s,clears);
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(v==511||v>>7>=b.layers-1||clears<b.reveal+b.ice)continue;
   int start=v&127,stage=v>>7;Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start);int head=0,tail=1;normQueue[0]=start;
   while(head<tail){int at=normQueue[head++];Pose p=b.poses[at];if(p.exits[stage]>=0&&clears>=p.exits[stage])return true;
    foreach(int to in p.neighbors){Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))continue;seen|=bit;normQueue[tail++]=to;}
   }
  }return false;
 }
 void Guard(){`);
change('if(collect==null&&singleStage&&nextCost==input.floor-1&&Clears(normalized)<input.goalClears)return;',
 'if(collect==null&&!input.disableTerminalPrune&&nextCost==input.floor-1&&Clears(normalized)<input.goalClears&&(singleStage||!HasFreePeel(normalized))){terminalPruned++;return;}');
change('attemptedTransitions=transitions,', 'attemptedTransitions=transitions,terminalPrunedStates=terminalPruned,');
change('native-mask128-fixed-cover-prefix-identity-quotient-stop-at-goal-v172','native-mask128-shell-terminal-no-zero-edge-prune-v106');
fs.writeFileSync(dir+'/shell-terminal.cs',s,{flag:'wx'});
let q=fs.readFileSync('tools/remake171-180/author175-177/assist172/qualify-prefix.mjs','utf8');
q=q.replaceAll("from'../../common.mjs'","from'../common.mjs'")
 .replace("import{payload,SOURCE}from'../../author178-180/assist172/prefix-quotient.mjs';","import{payload}from'../author178-180/assist172/prefix-quotient.mjs';const SOURCE='tools/remake171-180/assist172/shell-terminal.cs';")
 .replaceAll("from'../../../campaign-v145/","from'../../campaign-v145/")
 .replace("const OUT='deliverables/remake171-180-20260927/author175-177/assist172'","const OUT='deliverables/remake171-180-20260927/assist172'")
 .replace('for(const quotient of[false,true]){const run=native({...p,floor,groups:quotient?p.groups:[]}', 'for(const quotient of[false,true])for(const disableTerminalPrune of[false,true]){const run=native({...p,floor,disableTerminalPrune,groups:quotient?p.groups:[]}')
 .replace('floorRuns.push({floor,quotient,...run})','floorRuns.push({floor,quotient,disableTerminalPrune,...run})')
 .replace("status:'PREFIX_FUTURE_BODY_QUOTIENT_DOMAIN_QUALIFIED_NOT_CANDIDATE_FLOOR'","status:'SHELL_TERMINAL_PRUNE_FINITE_QUALIFIED_NOT_CANDIDATE_FLOOR',terminalPruneArgument:'At cost=floor-1 all remaining affordable actions have cost0. After final-body Normalize is exhausted, every such edge must peel a currently visible unfrozen shell. HasFreePeel searches every legal held anchor and matching thawed outer gate. If none exists and goal has not been reached, every continuation requires an unaffordable cost1 parking. Groups used here preserve this predicate. This is a dead-end-at-budget proof only; shells with any zero peel are always retained.'");
assert(q.includes('for(const disableTerminalPrune'));
fs.writeFileSync(dir+'/qualify-shell-prune.mjs',q,{flag:'wx'});
