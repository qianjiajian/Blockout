import fs from 'node:fs';
let cs=fs.readFileSync('tools/regeneration211-design/native-fifo214-potential.cs','utf8')
 .replaceAll('public int layers,ice,cover;','public int layers,ice,cover,lockCount;public int[] keyIndices;')
 .replace('cover=b.cover,poses=','cover=b.cover,lockCount=b.lockCount,keyIndices=b.keyIndices??new int[0],poses=')
 .replace('return Visible(s,i)&&clears-','return b.lockCount<=b.keyIndices.Count(k=>s.Get(k)==255)&&Visible(s,i)&&clears-');
fs.writeFileSync('tools/continue231-240/author239-key-native.cs',cs,{flag:'wx'});
let js=fs.readFileSync('tools/continue231-240/author239-native.mjs','utf8')
 .replace("source='tools/regeneration211-design/native-fifo214-potential.cs'","source='tools/continue231-240/author239-key-native.cs'")
 .replace("return{...fifoPayload(projection,api,{floor:11,maxMilliseconds:6000,maxStates:500000,...options}),projection};",`const result=fifoPayload(projection,api,{floor:11,maxMilliseconds:6000,maxStates:500000,...options});
 const queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds)),groups=new Map();
 level.blocks.forEach((b,i)=>{Object.assign(result.c.blocks[i],b.keyId?{keyId:b.keyId}:b.lockedBy?{lockedBy:b.lockedBy,lockCount:b.lockCount}:{});const p=result.p.blocks[i];p.lockCount=b.lockedBy?(b.lockCount??1):0;p.keyIndices=b.lockedBy?level.blocks.map((k,j)=>k.keyId===b.lockedBy?j:-1).filter(j=>j>=0):[];if(!queued.has(b.id)){const sig=JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);}});
 result.p.groups=[...groups.values()].filter(g=>g.length>1);return{...result,projection:level};`)
 .replace('Remove only key/lock restrictions. Preserve every body,','Preserve key/lock restrictions and every body,')
 .replace("keys:'Kept in original route/reference model, removed solely in lower projection'","keys:'Key clear indices and exact lock counts retained in native and independent delayed reference domain'");
fs.writeFileSync('tools/continue231-240/author239-key-native.mjs',js,{flag:'wx'});
let author=fs.readFileSync('tools/continue231-240/author239-ports.mjs','utf8').replace("from'./author239-native.mjs'","from'./author239-key-native.mjs'");
fs.writeFileSync('tools/continue231-240/author239-keys.mjs',author,{flag:'wx'});
