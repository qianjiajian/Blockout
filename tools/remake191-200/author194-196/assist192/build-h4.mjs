import fs from 'node:fs';
let s=fs.readFileSync('tools/remake191-200/author194-196/assist192/narrow.mjs','utf8');
s=s.replace('196192','198192')
 .replace("['red','red','red','blue','blue','blue','yellow','yellow','yellow','yellow','green','green','green','purple','purple','purple','orange','orange','orange']","['red','red','red','blue','blue','blue','blue','yellow','yellow','yellow','green','green','green','purple','purple','purple','orange','orange','orange']")
 .replace('o5:9,o11:9,o16:9','o9:2,o11:15,o16:9')
 .replace('pins:{o16:[0,1],o13:[2,2],o15:[3,0],o14:[5,4]}','pins:{o4:[0,1],o13:[4,2],o15:[3,0],o14:[5,5],o9:[2,1],o16:[4,1],o11:[0,3]}')
 .replace("o16:'red',o13:'green'","o11:'blue',o13:'green'")
 .replace("const selected=[first,...R.shuffle(ports.filter(p=>p!==first)).slice(0,5)],palette=['red',...R.shuffle(colors.slice(1))];","const selected=[first,ports[1],...R.shuffle(ports.filter(p=>p!==first&&p!==ports[1])).slice(0,4)],palette=['red','blue',...R.shuffle(colors.slice(2))];")
 .replace('if(rep.nonClearingDrags>=16&&prefixCost>=16)proof=keyFloor(l,{goalClears:6,floor:16,maxMilliseconds:1500,maxStates:180000});','if(rep.nonClearingDrags>=16)proof=keyFloor(l,{...(prefixCost>=16?{goalClears:6}:{}),floor:16,maxMilliseconds:1500,maxStates:180000});')
 .replace('Two locks nativeV3, one lockSQ2, fiveH3 and11H2 opening.','Two locks nativeV3, one lockSQ2, threeH3, oneV2, oneblueH4 and11H2 opening.');
fs.writeFileSync('tools/remake191-200/author194-196/assist192/h4.mjs',s,{flag:'wx'});
