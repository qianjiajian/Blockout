import fs from 'node:fs';
import path from 'node:path';
import {nativeKeyFloor,qualifyNativeKeyFloor} from './native-key-floor.mjs';
import {loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';
const api=await loadSpatialApi();
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),floor=nativeKeyFloor(d.level,{floor:11,maxMilliseconds:3000,maxStates:600000});
 const qualification=floor.thresholdProven?qualifyNativeKeyFloor(d.level,d.row.route.drags,api):null;
 const result={file,reason:'One finite check with a new independent compact native backend; no further budget increase for this hash.',floor,qualification};
 fs.writeFileSync(path.join(path.dirname(file),path.basename(file,'.json')+'-native-check.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({file,status:floor.status,L:floor.thresholdProven?11:null,relaxedCost:floor.relaxedNonClearingDrags,states:floor.discoveredStates,ms:floor.elapsedMilliseconds,qualification:qualification?.passed}));
}
