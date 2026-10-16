import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Check the actual nested JSON literal, including excess properties. */
export function checkLevelSpecLiteral(level, fixture) {
  const file = path.resolve(fixture);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  let spec = path.relative(path.dirname(file), path.resolve('src/core/types')).replaceAll('\\', '/');
  if (!spec.startsWith('.')) spec = './' + spec;
  fs.writeFileSync(file, `import type { LevelSpec } from ${JSON.stringify(spec)};\nconst level = ${JSON.stringify(level, null, 2)} satisfies LevelSpec;\nexport default level;\n`);
  const program = ts.createProgram([file], {
    noEmit:true, strict:true, skipLibCheck:true, types:[],
    target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext,
    moduleResolution:ts.ModuleResolutionKind.Bundler,
    lib:['lib.es2022.d.ts', 'lib.dom.d.ts'],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => {
    const at = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    return {code:d.code, file:d.file?.fileName, line:at ? at.line+1 : undefined,
      message:ts.flattenDiagnosticMessageText(d.messageText, '\n')};
  });
  return {passed:diagnostics.length===0, fixture:file, typescriptVersion:ts.version, diagnostics};
}
