import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let cs=fs.readFileSync(root+'native-cut-witness139.cs','utf8');
const before='int left=input.leftRows[i][p&127]&upto;';assert(cs.includes(before));cs=cs.replace(before,before+'if(left==0)continue;');
fs.writeFileSync(root+'native-cut-fast-witness139.cs',cs,{flag:'wx'});
const js=fs.readFileSync(root+'native-cut-witness139.mjs','utf8').replaceAll('native-cut-witness139','native-cut-fast-witness139');fs.writeFileSync(root+'native-cut-fast-witness139.mjs',js,{flag:'wx'});
const driver=fs.readFileSync(root+'solve-cut-witness139.mjs','utf8').replace("'./native-cut-witness139.mjs'","'./native-cut-fast-witness139.mjs'").replace("'/cut-witness-solve139-'","'/cut-fast-witness-solve139-'");fs.writeFileSync(root+'solve-cut-fast-witness139.mjs',driver,{flag:'wx'});
