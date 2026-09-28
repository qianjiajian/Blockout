import fs from 'node:fs';
import {digest} from '../revised-preview-validation-v160.mjs';
const root='deliverables/star-targets161-170-20260927';
const reports=[{file:root+'/pointer/pointer-1790523324415-320x568-56856/report.json',ids:[161,167,168,170]},{file:root+'/pointer/pointer-1790523324375-496x1078-7432/report.json',ids:[161,167],rejectedIds:[168]},{file:root+'/pointer/pointer-1790524407535-496x1078-33820/report.json',ids:[168,170]}];
const visuals=reports.flatMap(r=>r.ids.map(id=>{const file=r.file.replace('report.json','lv'+id+'-three-stars.png');return{id,width:r.file.includes('320x568')?320:496,report:r.file,file,sha256:digest(fs.readFileSync(file)),inspected:true,threeActiveStars:true,correctMoveAndTimeText:true,notes:'Assistant viewed the actual PNG: correct level number, authorized move target, unchanged time target, all three yellow active stars and all three condition ticks.'};}));
const failImage=reports[1].file.replace('report.json','failure.png');
const config={dataReview:root+'/review/data-review-1790523656634.json',reports,visuals,rejectedVisual:{file:failImage,sha256:digest(fs.readFileSync(failImage)),inspected:true,notes:'Old large-screen 168 image has only two yellow stars, dark third star and crossed 82-second target. Excluded from PASS selection.'}};
const out=root+'/review/selected-inputs-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(config,null,2)+'\n',{flag:'wx'});console.log(out);
