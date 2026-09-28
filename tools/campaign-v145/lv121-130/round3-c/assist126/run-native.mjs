import fs from'node:fs';
import{loadIsolatedApi}from'../isolated-api.mjs';
import{runNative126,OUT}from'./native-floor.mjs';
const api=await loadIsolatedApi();
for(const file of process.argv.slice(2)){
 const raw=JSON.parse(fs.readFileSync(file)),d=raw.candidate??raw;
 const proof=runNative126(d.level,api,{floor:21,maxStates:5000000,maxMilliseconds:20000});
 const out=`${OUT}/proof-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({candidateFile:file,proof},null,2)+'\n');console.log(JSON.stringify({file:out,candidateFile:file,...proof}));
}
