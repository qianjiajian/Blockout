const fs=require('fs');
let p='docs/rules/WORKSTATE.md';let s=fs.readFileSync(p,'utf8');s=s.replace('- 测试：`tests/remake201to210.test.ts` 12/12通过；生产边界未改，未进行正式接入、打包或发布。','- 结构复核仍有待处理项：202/206的部分卷帘区域与隐藏足迹未达到逐格满铺审计，202/206的规范化几何重复；来源形状/隐藏库存未知，不把这些候选称为来源精确复刻或正式通过。\n- 测试：`tests/remake201to210.test.ts` 12/12通过；生产边界未改，未进行正式接入、打包或发布。');fs.writeFileSync(p,s);
p='docs/rules/mechanism-rules-v1.123.0.md';s=fs.readFileSync(p,'utf8');s=s.replace('202–210的几何复核仍保留视频未知项，不把未知素材冒称来源确证。','202–210的几何复核仍保留视频未知项，不把未知素材冒称来源确证；202/206部分卷帘区域逐格满铺仍是候选待修项，重复几何也只作当前适配记录。');fs.writeFileSync(p,s);
