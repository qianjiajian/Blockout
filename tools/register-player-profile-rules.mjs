import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const path='docs/rules/manifest.json',m=JSON.parse(await readFile(path,'utf8'));
if(m.activeVersion!=='1.161.0')throw Error(`Expected active v1.161.0, got ${m.activeVersion}`);
const version='1.162.0',document=`docs/rules/mechanism-rules-v${version}.md`,body=(await readFile(document,'utf8')).replaceAll('\r\n','\n');
m.activeVersion=version;m.versions.push({version,ruleId:`blockout-rules-v${version}`,runtimeProfile:'revised-2026-09-27-v1.5',document,
sha256:createHash('sha256').update(body).digest('hex'),status:'frozen',frozenOn:'2026-10-08',confirmation:'用户要求按视频新增个人资料界面，补充截图确认9款头像框；15头像、免费外观保存、100金币改名及真实统计，承继主线首通40和既有保存合同，不微信打包或发布。'});
await writeFile(path,JSON.stringify(m,null,2)+'\n');
let agents=await readFile('AGENTS.md','utf8');agents=agents.replaceAll('mechanism-rules-v1.161.0.md','mechanism-rules-v1.162.0.md');
agents=agents.replace(/当前活动规则：[^\n]+/, '当前活动规则：`docs/rules/mechanism-rules-v1.162.0.md`。本轮按视频及补充截图新增个人资料、15头像/9头像框、免费外观保存及100金币改名；承继v1.161主线首通40、道具单买价格和全部关卡/保存合同，进度见WORKSTATE，不微信打包、不发布。');
agents=agents.replace('主线首通40金币、重复0，承继v1.160及历史锁定文档','个人资料参考界面，承继v1.161及历史锁定文档');await writeFile('AGENTS.md',agents);
const readme='docs/rules/README.md';await writeFile(readme,`当前活动v1.162.0 [个人资料参考界面](mechanism-rules-v1.162.0.md)：视频15头像、截图9头像框及100金币改名，承继主线首通40等既有合同；进度见WORKSTATE。\n\n${await readFile(readme,'utf8')}`);
console.log('Registered immutable v1.162.0');
