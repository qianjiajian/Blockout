import fs from 'node:fs';let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/local146.mjs','utf8');
s=s.replace('set(\'s146-o4\',6,8,[[0,0],[0,1]]);set(\'s146-o7\',3,8,[[0,0],[1,0],[2,0]]);set(\'s146-o11\',3,9,[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]);',"if(n<120){set('s146-o6',2,5,[[0,0],[0,1]]);set('s146-o3',2,6,[[1,0],[0,1],[1,1],[2,1]]);}else{set('s146-o6',3,7,[[0,0],[1,0]]);set('s146-o3',2,6,[[0,0],[1,0],[2,0],[0,1]]);set('s146-o10',2,5,[[0,0]]);}");
s=s.replace('n<180','n<240').replace('let rng=146250','let rng=146267').replaceAll('146-local-','146-core-').replace("'/local146-'","'/core146-'");
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/core146.mjs',s);
