import fs from 'node:fs';
let s=fs.readFileSync('tools/remake191-200/author194-196/assist192/narrow.mjs','utf8');
s=s.replace('196192','197192')
 .replace("o14:'yellow'","o14:'red'")
 .replace('if(rep.nonClearingDrags>=16&&prefixCost>=16)proof=keyFloor(l,{goalClears:6,floor:16,maxMilliseconds:1500,maxStates:180000});','if(rep.nonClearingDrags>=16)proof=keyFloor(l,{...(prefixCost>=16?{goalClears:6}:{}),floor:16,maxMilliseconds:1500,maxStates:180000});');
fs.writeFileSync('tools/remake191-200/author194-196/assist192/bridge.mjs',s,{flag:'wx'});
