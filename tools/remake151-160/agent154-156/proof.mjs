import fs from 'node:fs';
import {api,write,digest} from './common.mjs';
import {openDoorFloorProjection} from '../spatial-bridge.mjs';
import {searchSpatial} from '../../remake111to120-spatial-floor-v147.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),p=openDoorFloorProjection(d.level,api),floor=d.level.id===155?16:11;
const budget={floor,prove:true,maxStates:150000,maxMilliseconds:3000,maxTransitions:2000000},proof=searchSpatial(p.level,api,budget);
const out=write('proof-'+d.level.id+'-'+d.seed+'-'+Date.now(),{candidate:file,sourceSha256:digest(d.level),projection:p,budget,proof,qualification:'No adoption permission from this isolated lower-bound search'});
console.log(JSON.stringify({out,status:proof.status,L:proof.thresholdProven?floor:null,cost:proof.cost,states:proof.discoveredStates}));
