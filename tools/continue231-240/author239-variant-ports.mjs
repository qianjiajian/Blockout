import fs from 'node:fs';let s=fs.readFileSync('tools/continue231-240/author239-open.mjs','utf8');
s=s.replace("shuffle([['right',0,3],['right',4,3],['left',0,3],['left',5,3],['bottom',0,3],['bottom',4,3]]).slice(0,6)","[['left',3,2],['left',0,3],['right',0,3],['right',3,2],['bottom',0,3],['bottom',4,3]]")
 .replace('for(const col of shuffle(colors))','for(const col of cohort===a?[...shuffle([\'red\',\'yellow\',\'purple\',\'blue\']),...shuffle([\'green\',\'cyan\'])]:shuffle(colors))');
fs.writeFileSync('tools/continue231-240/author239-ports.mjs',s,{flag:'wx'});
