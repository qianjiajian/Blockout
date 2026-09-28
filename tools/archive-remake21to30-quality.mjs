// Keep the actual construction scripts and review sources with the new batch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {writeNew,OUTPUT,ruleGate} from './remake21to30-quality.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const manifestPath=process.argv[2];assert(manifestPath);
const manifest=JSON.parse(fs.readFileSync(manifestPath));assert.equal(manifest.ruleVersion,'1.21.0');
const roots=['.codex-temp/remake21-30-quality/agent21-24','.codex-temp/remake21-30-quality/agent25-27','.codex-temp/remake21-30-quality/agent28-30'];
const sources=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(mjs|cjs|md)$/.test(e.name))sources.push({path:p,sha256:digest(fs.readFileSync(p)),text:fs.readFileSync(p,'utf8')});
}}
for(const root of roots)walk(root);
const output=`${OUTPUT}/construction-sources-${Date.now()}.json`;
writeNew(output,{ruleVersion:'1.21.0',manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),sources,
  note:'Historical and rejected explorations are archived for provenance, not certified as formal data. Only the ten exact manifest inputs were adopted.'});
console.log(JSON.stringify({output,scriptsAndNotes:sources.length}));
