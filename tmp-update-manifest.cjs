const fs=require('fs');
const p='docs/rules/manifest.json';
let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
if(!s.includes('"version": "1.123.0"')){
  s=s.replace('"activeVersion": "1.122.0"','"activeVersion": "1.123.0"');
  const entry=`    {\n      "version": "1.123.0",\n      "ruleId": "blockout-rules-v1.123.0",\n      "runtimeProfile": "revised-2026-09-27-v1.5",\n      "document": "docs/rules/mechanism-rules-v1.123.0.md",\n      "sha256": "1eed7ca2e53eca34c57e21716f7b87594453d6ee4c8744f495be8b6a6f87e129",\n      "status": "frozen",\n      "frozenOn": "2026-09-29",\n      "confirmation": "用户要求按最新十关难度节奏生成201–210；本版本只更新隔离候选，正式边界仍为200，未发布。"\n    }`;
  const marker='  ]\n}';
  if(!s.includes(marker)) throw new Error('manifest closing marker not found');
  s=s.replace(marker,`  ],\n${entry}\n  ]\n}`);
}
fs.writeFileSync(p,s);
