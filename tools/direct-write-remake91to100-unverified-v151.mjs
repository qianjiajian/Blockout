import fs from 'node:fs';
import assert from 'node:assert/strict';

const root='deliverables/remake91-100-v146-20260924';
const cases=[
  {id:94,candidate:`${root}/agent91-94/candidate94-cyan0-enriched-1790301597541.json`,lowerBound:21},
  {id:98,candidate:`${root}/agent95-98/candidate98-local-enriched-1790271828034.json`,lowerBound:15},
];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const stamp=Date.now();
const records=[];
for(const c of cases){
  const data=read(c.candidate);assert.equal(data.level.id,c.id);assert(Array.isArray(data.drags)&&data.drags.length>0);
  const upperBound=data.replay?.nonClearingDrags;
  assert(Number.isSafeInteger(upperBound));
  const file=`${root}/direct-write-unverified-${c.id}-${stamp}.json`;
  const record={status:'USER_DIRECT_WRITE_UNVERIFIED',ruleVersion:'1.51.0',id:c.id,candidate:c.candidate,level:data.level,drags:data.drags,lowerBound:c.lowerBound,upperBound,lowerBoundValidated:false,pointerValidated:false,formalAdopted:true,userAuthorizedDirectWrite:true,releaseApproved:false,reason:'用户明确要求暂时跳过下界验证，直接写入正式关卡；由用户自行验证。'};
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx'});records.push({id:c.id,file,level:data.level,drags:data.drags,lowerBound:c.lowerBound,upperBound});
}

const modulePath='src/core/remake91to100.ts';
const oldModule=fs.readFileSync(modulePath,'utf8');
const a=oldModule.indexOf('const reviewed: Record<number,LevelSpec> = '),b=oldModule.indexOf('\n};',a);assert(a>=0&&b>a);
const reviewed=JSON.parse(oldModule.slice(a+'const reviewed: Record<number,LevelSpec> = '.length,b+2));
for(const r of records)reviewed[r.id]=r.level;
const ids=Object.keys(reviewed).map(Number).sort((x,y)=>x-y);
const moduleText=`// Direct-write v1.51 subset; 94 and 98 were user-authorized without lower-bound certification.\nimport type {LevelSpec} from './types';\nexport const REMADE_91_100_IDS: readonly number[] = ${JSON.stringify(ids)};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(reviewed,null,2)};\nexport const applyRemake91to100 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
assert.equal(fs.readFileSync(modulePath,'utf8'),oldModule);fs.writeFileSync(modulePath,moduleText);

const fixturePath='tests/fixtures/remake91to100-v147.json';
const fixture=read(fixturePath);fixture.rows=fixture.rows.filter(r=>![94,98].includes(r.id));
for(const r of records)fixture.rows.push({id:r.id,level:r.level,drags:r.drags,lowerBound:r.lowerBound,upperBound:r.upperBound,adoption:r.file});
fixture.rows.sort((x,y)=>x.id-y.id);fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({status:'USER_DIRECT_WRITE_UNVERIFIED',ids,records:records.map(r=>({id:r.id,file:r.file,lowerBound:r.lowerBound,upperBound:r.upperBound}))}));
