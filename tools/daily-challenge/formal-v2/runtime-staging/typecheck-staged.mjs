import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {catalogModule} from '../emit-catalog.mjs';

// Typecheck the prospective deployment in memory. No production registry or
// source is replaced, and the empty schema module is only a typed placeholder.
const root=process.cwd(),stage='tools/daily-challenge/formal-v2/runtime-staging';
const overrides=new Map([
 ['src/core/dailyChallenge.ts',fs.readFileSync(`${stage}/dailyChallenge.ts`,'utf8')],
 ['src/core/formalDailyChallengeData.ts',catalogModule([],'staging-typecheck-only')],
 ...['dailyChallenge.test.ts','dailyChallengeRegistryFailures.test.ts','dailyChallengeBlockArt.test.ts']
   .map(file=>[`tests/${file}`,fs.readFileSync(`${stage}/${file}`,'utf8')]),
].map(([file,text])=>[path.resolve(root,file).replaceAll('\\','/').toLowerCase(),text]));
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host),exists=host.fileExists.bind(host),key=file=>path.resolve(file).replaceAll('\\','/').toLowerCase();
host.readFile=file=>overrides.has(key(file))?overrides.get(key(file)):read(file);
host.fileExists=file=>overrides.has(key(file))||exists(file);
const program=ts.createProgram([...new Set([...parsed.fileNames,path.resolve('tests/dailyChallengeRegistryFailures.test.ts')])],parsed.options,host);
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));process.exitCode=1;}
else console.log('PASS staged schema2 runtime and future tests typecheck; no production catalogue deployed or executed.');
