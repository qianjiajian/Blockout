import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {runGeneratorGlobalBatch} from './generator-global-batch.mjs';

test('invalid batch caps and unsupported layout modes fail before allocating evidence',async()=>{
 for(const options of [{maxPlainSearches:25},{maxConstructions:193},{berths:5},{referenceExitFieldMode:'guess'},
  {shapeProfile:'unbounded'},{label:'../old-proof'}])await assert.rejects(runGeneratorGlobalBatch(options),/Invalid finite generator batch request/);
});

test('an existing failed batch cannot be resumed or overwritten',async()=>{
 const report='deliverables/daily-formal-v3-20261008/mechanisms/gen-rebuild-01/report.json';
 const hash=()=>createHash('sha256').update(fs.readFileSync(report)).digest('hex'),before=hash();
 await assert.rejects(runGeneratorGlobalBatch({label:'gen-rebuild-01'}),/new immutable batch label/);
 assert.equal(hash(),before);
});
