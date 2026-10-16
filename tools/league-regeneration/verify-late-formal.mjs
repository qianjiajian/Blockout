import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const reportPath='deliverables/league-regeneration-20261004/formal/late-65-100.json';
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const b=await build({stdin:{resolveDir:process.cwd(),contents:`export {validateLevel} from './src/core/PuzzleModel.ts'`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {validateLevel}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const isFilledRectangle = shape => {
  assert.ok(Array.isArray(shape) && shape.length > 0, 'special shape must be non-empty');
  const keys = new Set(shape.map(cell => `${cell[0]},${cell[1]}`));
  assert.equal(keys.size, shape.length, 'special shape must not repeat cells');
  const xs = shape.map(cell => cell[0]);
  const ys = shape.map(cell => cell[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  assert.equal(shape.length, (maxX - minX + 1) * (maxY - minY + 1), 'special shape must fill its rectangle');
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) assert.ok(keys.has(`${x},${y}`), 'special shape contains a hole');
  return true;
};
const rows=[];for(const a of report.accepted){const e=JSON.parse(fs.readFileSync(a.levelFile,'utf8'));assert.equal(e.index,a.index);assert.equal(e.level.id,900000+a.index);assert.ok(['hard','super'].includes(e.level.difficulty));assert.ok(e.specials.length>=1&&e.specials.length<=3);assert.equal(a.specialShapePolicy,'filled-axis-aligned-rectangle-only');const blocks=new Map(e.level.blocks.map(block=>[block.id,block]));assert.ok(e.specials.every(id=>blocks.has(id)));e.specials.forEach(id=>isFilledRectangle(blocks.get(id).shape));assert.ok(Array.isArray(a.specialEvidence)&&a.specialEvidence.length===e.specials.length);const clearEvents=a.clearEvents;assert.ok(Number.isInteger(clearEvents)&&clearEvents>0);const half=clearEvents/2;for(const evidence of a.specialEvidence){assert.ok(evidence.completeClearVerified===true);assert.ok(evidence.specialShape==='filled-axis-aligned-rectangle'||isFilledRectangle(blocks.get(evidence.blockId).shape));assert.ok(evidence.routeStep>half,`special ${evidence.blockId} is not in latter half`);assert.ok(evidence.clearEvents===clearEvents);assert.ok(e.specials.includes(evidence.blockId));}validateLevel(e.level);const min=e.level.difficulty==='super'?21:16,max=e.level.difficulty==='super'?30:20;assert.ok(a.lowerBound.value>=min);assert.ok(a.upperBound.value<=max);rows.push({index:a.index,status:'PASS',specials:e.specials,lower:a.lowerBound.value,upper:a.upperBound.value,clearEvents,specialRouteSteps:a.specialEvidence.map(x=>x.routeStep),fingerprint:a.fingerprint});}
assert.equal(new Set(rows.map(r=>r.fingerprint)).size,rows.length);assert.equal(report.counts.accepted,rows.length);assert.equal(report.counts.total,36);assert.equal(report.counts.accepted+report.counts.blocked,36);for(const b of report.blocked){assert.ok(Number.isInteger(b.mutationAttempts)&&b.mutationAttempts>=3);assert.ok(Array.isArray(b.failureReasons));if(b.mutationEvidence){assert.equal(b.mutationEvidence.length,b.mutationAttempts);assert.equal(b.uniqueFingerprints,new Set(b.mutationEvidence.map(e=>e.fingerprint)).size);assert.equal(b.uniqueFingerprints,b.mutationAttempts);for(const e of b.mutationEvidence){assert.ok(Number.isInteger(e.attempt));assert.ok(typeof e.fingerprint==='string'&&e.fingerprint.length===64);assert.ok(e.mutation&&typeof e.mutation==='object');}}}
console.log(JSON.stringify({status:'PASS',accepted:rows,blocked:report.counts.blocked,finite:true}));
