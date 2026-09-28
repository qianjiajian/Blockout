import fs from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { digest } from '../revised-preview-validation-v160.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
const root="deliverables/repair78-lift-20260927";const document="docs/rules/mechanism-rules-v1.104.0.md",manifestPath="docs/rules/manifest.json"; assert(verifyRulesLock().ok);
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts'; export {levelStarTargets} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const levels=JSON.parse(JSON.stringify(api.LEVELS)),bindings={};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else bindings[p]=digest(fs.readFileSync(p));}}
walk('src');for(const p of [manifestPath,document])bindings[p]=digest(fs.readFileSync(p));
const level=levels[77];assert.equal(digest(level),'3286acfbbc7d772e838400a9af8b121cbacbd5ee42481cdccbeaabe5039c6fc7');
fs.writeFileSync(root+'/before.json',JSON.stringify({createdAt:new Date().toISOString(),ruleVersion:'1.104.0',priorLevels:levels,level,levelSha256:digest(level),campaignSha256:digest(levels),stars:api.levelStarTargets(level),bindings},null,2)+'\n',{flag:'wx'});
