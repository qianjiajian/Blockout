import fs from 'node:fs';
import {ROOT,digest,ruleGate,writeNew} from './common.mjs';
ruleGate();
const root=ROOT+'/alternate232';
const runs=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(root+'/'+d.name+'/report.json')).map(d=>{
 const file=root+'/'+d.name+'/report.json',data=JSON.parse(fs.readFileSync(file)),rows=data.rows;
 const valid=rows.filter(r=>r.levelSha256),certified=rows.filter(r=>r.lower?.thresholdProven);
 return{file,sha256:digest(fs.readFileSync(file)),attempted:rows.length,constructed:valid.length,lowerCertified:certified.map(r=>({seed:r.seed,L:r.lower.provenLowerBound,routeStatus:r.route?.status,clears:r.route?.maxClearsSeen})),completeRoutes:rows.filter(r=>r.U!==undefined).map(r=>({seed:r.seed,U:r.U})),maximumClearsSeen:Math.max(0,...rows.map(r=>r.route?.maxClearsSeen??0)),accepted:Boolean(data.accepted)};
});
const file=root+`/finite-runs-summary-${Date.now()}.json`;
writeNew(file,{status:'FINITE_NEW_LAYOUT_ATTEMPTS_NO_ADOPTION',levelId:232,activeRule:'1.198.0',requiredBand:[11,15],runs,attempted:runs.reduce((s,r)=>s+r.attempted,0),constructed:runs.reduce((s,r)=>s+r.constructed,0),accepted:false,oldEvidencePreserved:true,notes:['All route searches are witness-only. UNKNOWN and incomplete routes never certify feasibility, impossibility or difficulty.','Different run families alter actual shape/position/color/gate-location inputs; original source mechanics/counts and 42 bodies remain explicitly recorded.','The mixed SQ3 family redistributes 54 opening cells among 26 bodies; it is an unaccepted authored adaptation, not a source shape transcription.','No failed object was copied to the formal registry.']});
console.log(JSON.stringify({file,attempted:runs.reduce((s,r)=>s+r.attempted,0),accepted:false}));
