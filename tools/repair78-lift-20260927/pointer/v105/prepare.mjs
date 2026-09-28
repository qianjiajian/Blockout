// Create a new harness for the reviewed v1.105 baseline. The v1.104 tools and
// their packet/negative-control evidence are never rewritten.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
const previous='tools/repair78-lift-20260927/pointer',target=previous+'/v105';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.105.0');
const files=['verification.mjs','playtest-header.txt','playtest.mjs','browser.mjs','index.html','README.md','prepare-routes.mjs'];
const originals=Object.fromEntries(files.map(file=>[path.join(previous,file),digest(fs.readFileSync(path.join(previous,file)))]));
fs.mkdirSync(target,{recursive:true});
for(const file of files){
 let content=fs.readFileSync(path.join(previous,file),'utf8')
  .replaceAll("from '../../", "from '../../../")
  .replaceAll('repair78-lift-20260927/pointer','repair78-lift-20260927/pointer/v105')
  .replace("lock.activeVersion==='1.104.0'", "lock.activeVersion==='1.105.0'")
  .replace("ruleVersion:lock.activeVersion,scope:", "ruleVersion:lock.activeVersion,taskRuleVersion:'1.104.0',scope:");
 fs.writeFileSync(path.join(target,file),content);
}
for(const[file,sha256]of Object.entries(originals))assert.equal(digest(fs.readFileSync(file)),sha256);
const output='deliverables/repair78-lift-20260927/pointer/v105';fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'tool-baseline.json'),JSON.stringify({activeRuleVersion:'1.105.0',taskRuleVersion:'1.104.0',originals,allOriginalToolsPreserved:true},null,2));
console.log(JSON.stringify({target,originalToolsPreserved:files.length}));
