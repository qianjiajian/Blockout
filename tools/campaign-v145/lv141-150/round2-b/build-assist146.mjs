import fs from 'node:fs';
const dir='tools/campaign-v145/lv141-150/round2-b/assist146';fs.mkdirSync(dir,{recursive:true});
for(const name of ['native-stars','native-prefix']){const src='tools/campaign-v145/lv141-150/round2-c/assist146/'+name+'.mjs';let code=fs.readFileSync(src,'utf8');code=code.replace(/(WRAPPER='[^']*)round2-c\/assist146/,'$1round2-b/assist146').replace(/(OUT='[^']*)round2-c\/assist146/,'$1round2-b/assist146');fs.writeFileSync(dir+'/'+name+'.mjs',code);}
let code=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/retile146.mjs','utf8');
code=code.replaceAll("from '../../../","from '../../../../");
code=code.replace("const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b'","const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b/assist146'");
code=code.replace("const {api:b}=", "import {checkNativeStars} from './native-stars.mjs';\nimport {checkNativePrefix} from './native-prefix.mjs';\nfs.mkdirSync(OUT,{recursive:true});\nconst {api:b}=");
code=code.replace('[[0,0,4,3],[4,0,3,5],[0,3,2,3],[2,3,2,3]]','[[4,0,3,4],[0,0,3,5],[0,5,2,3],[5,5,2,3]]');
code=code.replace('n<500','n<900');
code=code.replace("['green','purple','yellow','red','blue'];block.color", "['green','green','green','purple','purple','purple','yellow','yellow','red','blue'];block.color");
code=code.replace("if(i===0)for(const b of blocks)b.shape=[[0,0],[0,1],[0,2]]","if(i===0)for(const b of blocks)b.shape=[[0,0],[1,0],[2,0]]");
code=code.replace("const t=tile(opening,open,true)","if(n>=200){opening.find(b=>b.id==='s146-o10').shape=[[0,0],[1,0]];opening.find(b=>b.id==='s146-o4').shape=[[0,0],[0,1],[1,1]];}if(n>=450)for(const b of opening)if(b.shape.length===3&&b.shape.every(([x])=>x===0)&&rnd()<.5)b.shape=[[0,0],[1,0],[2,0]];\n const t=tile(opening,open,true)");
code=code.replace("{green:['bottom',1,3],purple:['bottom',4,2],'purple-star':['right',6,3],yellow:['left',3,3],'yellow-star':['left',6,3],red:['right',3,3],blue:['top',0,3]}","{green:['right',7,3],purple:['bottom',1,2],'purple-star':['left',7,3],yellow:['right',1,3],'yellow-star':['bottom',3,3],red:['left',1,3],blue:['top',0,3]}");
code=code.replace('maxMilliseconds:2000,maxStates:70000,floor:36','maxMilliseconds:700,maxStates:35000,floor:31');
code=code.replace("if(result.drags||result.maxClearsSeen>=6)","if(result.drags||result.maxClearsSeen>=5)");
code=code.replace('if(result.maxClearsSeen>=12)break;',"if(result.drags&&result.cost>=21){const prefix=checkNativePrefix(level,api,{floor:21,goalClear:11,maxStates:150000,maxMilliseconds:2000});const proof=prefix.thresholdProven?prefix:checkNativeStars(level,api,{floor:21,maxStates:400000,maxMilliseconds:4000});const file=OUT+'/proof146-corridor-'+stamp+'-'+n+'.json';fs.writeFileSync(file,JSON.stringify({level,result,prefix,proof},null,2));console.log(JSON.stringify({n,file,proof}));if(proof.thresholdProven)break;}");
fs.writeFileSync(dir+'/corridor146.mjs',code);
