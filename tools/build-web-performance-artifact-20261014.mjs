import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'vite';
const root=process.cwd(),output=resolve(`.codex-temp/perf-five-20261014/production-audited-${Date.now()}`),inputs={},logs=[];
const sha=b=>createHash('sha256').update(b).digest('hex');await mkdir(output,{recursive:true});
async function archive(file){const relative=file.slice(root.length+1).replaceAll('\\','/');if(inputs[relative])return;const content=await readFile(file),copy=resolve(output,'inputs',relative);await mkdir(dirname(copy),{recursive:true});await writeFile(copy,content);inputs[relative]={sha256:sha(content),archive:copy};}
for(const file of ['vite.config.ts','package.json','index.html','board-editor.html','tools/web-runtime-level-projection.mjs'])await archive(resolve(root,file));
const logger={info:m=>logs.push(m),warn:m=>logs.push(m),warnOnce:m=>logs.push(m),error:m=>logs.push(m),clearScreen(){},hasErrorLogged(){return false},hasWarned:false};
await build({publicDir:false,customLogger:logger,plugins:[{name:'archive-build-inputs',enforce:'pre',async load(id){if(id.includes('\0')||id.includes('?'))return;const file=resolve(id);if(file.startsWith(resolve(root,'src')+sep)&&/\.(ts|css)$/.test(file))await archive(file);}}],build:{outDir:resolve(output,'web'),emptyOutDir:false,manifest:true}});
const projection=JSON.parse(await readFile(resolve(output,'web/runtime-level-projection.json'),'utf8'));
for(const [name,digest]of Object.entries(projection.inputs)){await archive(resolve(root,name));assert.equal(inputs[name].sha256,digest);}
for(const [name,input]of Object.entries(inputs))assert.equal(sha(await readFile(resolve(root,name))),input.sha256,`Source changed during production build: ${name}`);
await writeFile(resolve(output,'build.log'),logs.join('\n')+'\n');await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',command:'node tools/build-web-performance-artifact-20261014.mjs',scope:'Actual production Vite config, game + editor + worker. publicDir copying disabled only to avoid duplicating unchanged assets in the isolated comparison artifact; static browser QA serves the unchanged public directory. No dist overwrite, WeChat packaging or publishing.',output,inputs,projection},null,2)+'\n');console.log(JSON.stringify({status:'PASS',output,inputCount:Object.keys(inputs).length}));
