import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {auditCampaignGeneratorQueueColors} from './audit-generator-queue-colors.mjs';
import {loadApi} from './remake21to30-v120.mjs';

const base='deliverables/remake31-40-rhythm-20260924/batch-1790204307134/';
const read=id=>JSON.parse(fs.readFileSync(`${base}lv${id}.json`)).level;
const run=args=>spawnSync(process.execPath,['tools/audit-generator-queue-colors.mjs',...args],{encoding:'utf8',maxBuffer:2*1024*1024});
const activeVersion=JSON.parse(fs.readFileSync('docs/rules/manifest.json','utf8')).activeVersion;
test('campaign aggregation exposes failures without rewriting old data or claiming whole-level acceptance',()=>{
  const levels=[read(35),read(36)],before=JSON.stringify(levels),r=auditCampaignGeneratorQueueColors(levels);
  assert.equal(r.passed,false);assert.deepEqual(r.affectedLevelIds,[35]);
  assert.deepEqual(r.stats,{generators:2,queuedBlocks:10,adjacentPairs:8,consecutiveSameColorPairs:1});
  assert.equal(r.mapsModified,false);assert.equal(r.solvabilityValidated,false);assert.equal(r.difficultyValidated,false);
  assert.equal(r.pointerValidated,false);assert.equal(r.releaseApproved,false);assert.equal(JSON.stringify(levels),before);
  const changed=structuredClone(levels);changed[0].generators[0].queueBlockIds.reverse();
  assert.notEqual(auditCampaignGeneratorQueueColors(changed).campaignSha256,r.campaignSha256);
});
test('CLI rejects a historical same-color candidate with the exact adjacent position',()=>{
  const r=run(['check',`${base}lv35.json`]);assert.equal(r.status,1,r.stderr);const data=JSON.parse(r.stdout);
  assert.equal(data.passed,false);assert.equal(data.ruleVersion,'1.29.0');assert.equal(data.levelSha256.length,64);
  assert.equal(data.activeRulesVersion,activeVersion);
  assert(data.issues.some(i=>i.code==='consecutive-generator-color'&&i.queueIndex===6&&i.previousBlockId==='r35-q4'&&i.blockId==='r35-q5'&&i.color==='blue'));
});
test('CLI accepts a valid queue and has no output-data side effects',()=>{
  const file=`${base}lv36.json`,before=fs.readFileSync(file);const r=run(['check',file]);assert.equal(r.status,0,r.stderr);
  const data=JSON.parse(r.stdout);assert(data.passed);assert.equal(data.mapsModified,false);assert.equal(data.pointerValidated,false);
  assert.equal(data.activeRulesVersion,activeVersion);assert.equal(data.ruleVersion,'1.29.0');
  assert.deepEqual(data.generators[0].queue.map(q=>q.color),['blue','pink']);assert.deepEqual(fs.readFileSync(file),before);
});
test('CLI cannot hide an earlier failed candidate behind a later successful candidate',()=>{
  const r=run(['check',`${base}lv35.json`,`${base}lv36.json`]);assert.equal(r.status,1,r.stderr);
  const rows=r.stdout.trim().split('\n').map(JSON.parse);assert.deepEqual(rows.map(v=>v.passed),[false,true]);
});
test('CLI requires explicit valid modes and real candidate files',()=>{
  for(const args of [['check'],['not-a-mode'],['check','not-an-existing-candidate.json']]){
    const r=run(args);assert.notEqual(r.status,0);assert(r.stderr.length>0);
  }
});
test('current full campaign reports the actual maps, without treating a historical audit as current',async()=>{
  const r=run(['campaign']);assert.equal(r.status,1,r.stderr);const data=JSON.parse(r.stdout);
  const {api}=await loadApi();const expected=auditCampaignGeneratorQueueColors(api.LEVELS);
  assert.equal(data.levelsChecked,200);assert.equal(data.rows.length,200);assert.equal(data.campaignSha256,expected.campaignSha256);
  assert.equal(data.activeRulesVersion,activeVersion);assert.equal(data.ruleVersion,'1.29.0');
  const affected=[],stats={generators:0,queuedBlocks:0,adjacentPairs:0,consecutiveSameColorPairs:0};
  for(const level of api.LEVELS){let failed=false;
    for(const generator of level.generators??[]){stats.generators++;stats.queuedBlocks+=generator.queueBlockIds.length;
      const colors=generator.queueBlockIds.map(id=>{const block=level.blocks.find(b=>b.id===id);assert(block);return block.layers?.[0]??block.color;});
      for(let i=1;i<colors.length;i++){stats.adjacentPairs++;if(colors[i]===colors[i-1]){failed=true;stats.consecutiveSameColorPairs++;}}
    }
    if(failed)affected.push(level.id);
  }
  assert.deepEqual(data.stats,stats);assert.deepEqual(data.affectedLevelIds,affected);
  assert.equal(data.passed,false);assert.equal(data.mapsModified,false);
});
