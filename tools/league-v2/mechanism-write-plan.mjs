import fs from 'node:fs';
import {leagueMechanismPlan} from './mechanism-policy.mjs';
const baseline=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));
const rows=baseline.rows.map(r=>({index:r.index,...leagueMechanismPlan(r.index,{blockCount:r.blocks}),
  oldTotal:Object.values(r.inventory).reduce((n,s)=>n+s.instances,0),oldInventory:r.inventory}));
for(const r of rows)if(r.index>=6&&r.index<10){r.primaryTargets.instances=Math.min(7,r.oldTotal+1);if(r.oldTotal>=7){r.primaryTargets.minimumCounter=2;r.capacityException={reason:'8 colours need 1 initially open exit; 8 positive frozen exits create an immediate deadlock',maximumPositiveIceGates:7,requiredCounterSumAbove:r.oldInventory['frozen-exit'].values.reduce((a,b)=>a+b,0),requireActualIrregularBoard:r.index===8};}}
const thirteen=rows.find(r=>r.index===13),thirteenIce=thirteen.secondary.find(t=>t.mechanism==='numeric-ice');thirteenIce.instances=5;thirteenIce.minimumCounter=3;
const counts={};for(const r of rows)counts[r.primary]=(counts[r.primary]??0)+1;
const out='deliverables/league-v2-20261008/mechanisms/100-slot-mechanism-plan.json';
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,status:'DISCLOSED_ENGINEERING_PLAN_NOT_USER_FIXED_QUOTAS',ruleVersion:'1.155.0',notes:[
  'First three slots after each device unlock introduce/consolidate it; subsequent slots rotate unlocked primary mechanisms to avoid replacing geometric homogeneity with mechanic homogeneity.',
  'Hard/super primary target2/3; generators target2 real 3-rail rim devices with3/4 FIFO cargo respectively. Counters derive from actual route events; total instances exceed old same-index total except pre-device indices1–5 and the explicit8-colour positive-ice capacity limit.',
  'Secondary counters are at least3; a compatible higher count is used when actual preceding clears/peels support it. Locks use2/3+actual key events. Shells/lift/axis/star have no invented numeric difficulty.',
  'No blanket latest-every-level rule; all configured types retain real mainline unlock boundaries. Capacity failure rejects the design for new shape/color/layout.',
  'Primary assignment is adjustable for source capacity after documented coverage audit; source/rule/budget/geometry/band constraints remain fixed.'
  ,'Generator introduction35–37 retains2 devices. Subsequent generator rotations may use1 true mid-board FIFO device with4/5 cargo after finite2-device construction failure, together with supporting mechanisms so total actual instances still increase. Cargo inventory is not counted as multiple machines; every cargo must clear before a later original body.'
  ,'Later rotation slots78/98 may use2 real primary instances,88 may use1 full two-layer lift and96 may use1 real axis body after finite original construction failure, with extra unlocked numeric-ice support targets. Slot13 may use5 numeric-ice supports with actual counters>=3 alongside frozen exits. These are capacity design choices, not user rule changes. First unlocks/consolidation, increased total instances, all participation, counters and difficulty proofs remain mandatory.'
],primaryCounts:counts,rows},null,2)+'\n');console.log(JSON.stringify({out,primaryCounts:counts}));
