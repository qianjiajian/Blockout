import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import ts from 'typescript';
import {digest} from './revised-preview-validation-v160.mjs';
export function collectBindings(files){
 const result={};function visit(file){const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\','/');assert(!p.startsWith('../')&&!path.isAbsolute(p));if(Object.hasOwn(result,p))return;const bytes=fs.readFileSync(absolute);result[p]=digest(bytes);
  if(/\.[cm]?[jt]s$/.test(p)){const tree=ts.createSourceFile(p,bytes.toString(),ts.ScriptTarget.Latest,true);for(const st of tree.statements){if(!ts.isImportDeclaration(st)&&!ts.isExportDeclaration(st))continue;const spec=st.moduleSpecifier;if(!spec||!ts.isStringLiteral(spec)||!spec.text.startsWith('.'))continue;const stem=path.resolve(path.dirname(absolute),spec.text),target=[stem,stem+'.ts',stem+'.tsx',stem+'.mjs',stem+'.js',path.join(stem,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());assert(target,`Missing import ${spec.text} from ${p}`);visit(target);}}
 }files.forEach(visit);return result;
}
