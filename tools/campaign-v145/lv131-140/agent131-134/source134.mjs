import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {loadSpatialApi,searchSpatial} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
const input='deliverables/remake131-140-v146-20260924/agent131-134/candidate134-370-1790471223061.json',data=JSON.parse(fs.readFileSync(input)),level=structuredClone(data.level),root='deliverables/remake131-140-v146-20260924/agent131-134';
const frame=n=>`.codex-temp/video-audit-101-134/134-137/frames-1fps/sec-${String(n).padStart(4,'0')}.jpg`;
const source=[];
function add(stage,rows,frameNo){for(const[kind,color,target,mechanism]of rows)source.push({sourceId:`source134-${stage}-${source.filter(x=>x.sourceStage===stage).length}`,sourceStage:stage,sourceShape:kind,sourceColor:color,sourceMechanism:mechanism??null,evidence:frame(frameNo),candidateId:`r172-134-v111-134-b${String(target).padStart(2,'0')}`});}
add('opening',[['H2','purple',6,{lockedBy:'blue-keys',lockCount:3}],['V2','blue',3],['H3','yellow',1],['SINGLE','pink',9],['L3','pink',5],['SINGLE','red',10],['SINGLE','blue',2],['V2','yellow',7],['L3','red',4,{layers:['red','purple']}],['V2','blue',8],['V2','pink',11]],1);
add('left15',[['V2','green',12],['V2','cyan',13]],34);
add('midleft15',[['V3','blue',15],['V2','purple',14,{keyId:'blue-keys'}]],34);
add('center15',[['V2','purple',23],['H3','yellow',25,{layers:['yellow','orange']}],['H2','blue',19],['SINGLE','green',21],['H3','green',17],['V2','orange',18,{keyId:'red-keys'}],['H3','pink',16],['L3','red',20],['L3','cyan',24],['H2','pink',22]],34);
add('midright15',[['V2','cyan',26],['V3','blue',27]],34);
add('right15',[['V2','orange',28],['V2','red',29,{keyId:'blue-keys'}]],34);
add('left10',[['H3','pink',31,{lockedBy:'red-keys',lockCount:3}],['L3','purple',34],['H2','yellow',33],['L3','blue',30,{keyId:'red-keys'}],['L4','red',32,{keyId:'red-keys'}]],27);
add('upper3',[['H2','pink',35],['H2','blue',36],['H2','purple',37]],8);
add('lower3',[['H2','yellow',38],['H2','pink',39,{keyId:'blue-keys'}]],8);
for(const b of level.blocks){delete b.keyId;delete b.lockedBy;delete b.lockCount;}
for(const row of source){const b=level.blocks.find(x=>x.id===row.candidateId);if(!b)throw Error('missing target '+row.candidateId);for(const k of ['keyId','lockedBy','lockCount'])if(row.sourceMechanism?.[k]!==undefined)b[k]=row.sourceMechanism[k];row.candidate={...b};row.authoredDifference={sourceShape:row.sourceShape,candidateShape:b.shape,sourceColor:row.sourceColor,candidateColor:b.color,sourceLayers:row.sourceMechanism?.layers??null,candidateLayers:b.layers??null,sourceStage:row.sourceStage,candidateStage:b.shutterId??'opening'};}
const stageMap={opening:'opening',left15:'v111-134-cover0',midleft15:'v111-134-cover1',center15:'v111-134-cover2',midright15:'v111-134-cover3',right15:'v111-134-cover4',left10:'v111-134-cover5',upper3:'v111-134-cover6',lower3:'v111-134-cover7'};
for(const row of source)if((row.candidate.shutterId??'opening')!==stageMap[row.sourceStage])throw Error('phase mismatch');
const evidenceFiles=[1,8,27,34,36,40,55].map(frame),ledger={ruleVersion:lock.activeVersion,sourceRows:source,stageMap,evidence:Object.fromEntries(evidenceFiles.map(p=>[p,digest(fs.readFileSync(p))])),totals:{sourceOpening:11,sourceHidden:28,sourceTotal:39,sourceKeys:{red:3,blue:3},sourceLocks:[{stage:'opening',color:'purple',count:3,key:'blue'},{stage:'left10',color:'pink',count:3,key:'red'}],sourceShells:2},observedCorrection:'Old truth opening count10 is11; old formal full body count39 is correct but key/lock phases were incorrectly relocated. This ledger repairs their exact reveal-phase membership.',adaptations:['Body colors and shapes differ under v1.72; all39 source bodies have one distinct candidate counterpart.','Board102 playable cells and all eight current cover geometries are retained; original source region areas differ. Opening22 source cells become40, total source89 cells become102, hidden source67 cells become62.','Duplicate purple frozen18 source exit omitted; all other exit categories/known values retained.']};
const lp=`${root}/source134-reviewed-${Date.now()}.json`;fs.writeFileSync(lp,JSON.stringify(ledger,null,2)+'\n');
const api=await loadSpatialApi();api.validateLevel(level);const search=searchSpatial(level,api,{floor:20,maxStates:150000,maxMilliseconds:10000,normalize:false});const replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
const out=`${root}/candidate134-sourcebound-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({...data,ruleVersion:lock.activeVersion,level,levelSha256:digest(level),drags:search.drags??[],search,replay,sourceCandidate:input,sourceReview:{ledger:lp,sha256:digest(fs.readFileSync(lp)),fullyBound:true},audit:undefined,lowerBoundCertified:false,pointerValidated:false,formalAdopted:false},null,2)+'\n');console.log(JSON.stringify({out,ledger:lp,status:search.status,U:replay?.nonClearingDrags,replay}));
