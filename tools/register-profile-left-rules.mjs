import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const path='docs/rules/manifest.json',m=JSON.parse(await readFile(path,'utf8'));if(m.activeVersion!=='1.162.0')throw Error(`Unexpected active ${m.activeVersion}`);
const version='1.163.0',document=`docs/rules/mechanism-rules-v${version}.md`,body=(await readFile(document,'utf8')).replaceAll('\r\n','\n');
m.activeVersion=version;m.versions.push({version,ruleId:`blockout-rules-v${version}`,runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:createHash('sha256').update(body).digest('hex'),status:'frozen',frozenOn:'2026-10-08',confirmation:'用户要求首页头像放在最左边，金币/体力顺次右移，真实绘制/按压/命中及金币飞行终点同步；其余个人资料和历史规则保持，不微信打包或发布。'});
await writeFile(path,JSON.stringify(m,null,2)+'\n');let a=await readFile('AGENTS.md','utf8');a=a.replaceAll('mechanism-rules-v1.162.0.md','mechanism-rules-v1.163.0.md').replace(/当前活动规则：[^\n]+/,'当前活动规则：`docs/rules/mechanism-rules-v1.163.0.md`。本轮首页头像移至最左，金币/体力依次右移；承继v1.162个人资料15头像/9头像框/100金币改名及v1.161首通40、道具价格和全部关卡/保存合同，进度见WORKSTATE，不微信打包、不发布。').replace('个人资料参考界面，承继v1.161及历史锁定文档','首页头像置左，承继v1.162及历史锁定文档');await writeFile('AGENTS.md',a);
const r='docs/rules/README.md';await writeFile(r,`当前活动v1.163.0 [首页头像置左](mechanism-rules-v1.163.0.md)：头像、金币、体力依次排布；承继个人资料与历史规则，进度见WORKSTATE。\n\n${await readFile(r,'utf8')}`);
console.log('Registered immutable v1.163.0');
