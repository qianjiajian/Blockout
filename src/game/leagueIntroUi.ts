import type {LeaguePaint} from './leagueUi';
export type LeagueIntroPage=0|1;
/** The video's two-page visual explanation, using the game's existing art and
 * the accepted league rules rather than the competitor's Mahjong rewards. */
export function drawLeagueIntro(ctx:CanvasRenderingContext2D,page:LeagueIntroPage,p:LeaguePaint):void {
 const a=p.art;if(!a)return;
 ctx.save();ctx.fillStyle='rgba(0,7,4,.86)';ctx.fillRect(0,0,496,1078);
 const text=(s:string,x:number,y:number,size=23,width?:number,color='#ffe88a')=>{ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;if(width)ctx.fillText(s,x,y,width);else ctx.fillText(s,x,y);};
 const image=(img:HTMLImageElement|undefined,x:number,y:number,w:number,h:number)=>{if(!img)return;const scale=Math.min(w/(img.naturalWidth||img.width),h/(img.naturalHeight||img.height));const iw=(img.naturalWidth||img.width)*scale,ih=(img.naturalHeight||img.height)*scale;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);};
 const arrow=(x:number,y:number,left=false)=>{ctx.save();ctx.translate(x,y);if(left)ctx.scale(-1,1);ctx.fillStyle='#ffbc45';ctx.beginPath();ctx.moveTo(-55,-20);ctx.bezierCurveTo(-15,-46,12,-24,32,3);ctx.lineTo(48,-9);ctx.lineTo(49,33);ctx.lineTo(8,18);ctx.lineTo(26,9);ctx.bezierCurveTo(1,-13,-15,-23,-55,-20);ctx.closePath();ctx.fill();ctx.restore();};
 ctx.save();ctx.shadowColor='#ff4919';ctx.shadowBlur=28;text('联赛说明',248,153,42);ctx.restore();
 if(page===0){
  // Badge collection, coins, promotion zone, higher tiers: video zigzag layout.
  image(a.row,38,216,210,142);image(a['score-token'],66,246,70,85);image(a['score-token'],151,246,70,85);
  text('尽可能多地收集积分徽章',145,391,21,236);text('每块10分，挑战成功才计入',145,421,17,235);
  arrow(302,297);image(a['coin-reward'],311,387,151,152);text('赢取金币奖励',379,564,23,200);
  arrow(185,513,true);
  for(let i=0;i<3;i++){const y=583+i*42;image(a.row,38,y,214,39);text(String(8+i),57,y+26,18,undefined,'#784722');if(p.drawAvatar)p.drawAvatar(i,i===0,{x:76,y:y+2,width:32,height:34});else image(p.avatars?.[i]??a.bronze,76,y+2,32,34);text(i===0?'我':'对手',140,y+26,17,undefined,'#784722');image(a['score-token'],173,y+6,20,25);text(String(90-i*10),220,y+26,17,undefined,'#784722');}
  text('前10名升级',145,740,18);text('冲进排行榜前10名',145,777,22,232);
  arrow(303,717);
  image(a.bronze,274,775,55,94);image(a.silver,328,741,62,128);image(a.gold,388,713,73,156);text('晋级更高联赛',369,905,24,213);
 }else{
  image(a.glory,48,196,167,193);text('达到荣耀，赢取荣耀星',144,424,20,252);text('继续攀升！',144,452,22);
  arrow(306,377);
  text('每期15天，北京时间00:00切换',140,508,16,228);text('0分无金币，仍正常升降',140,536,17,224);
  ctx.drawImage(a.parchment,263,469,215,207);text('荣耀星结算',387,506,21,149,'#784722');
  const lines=['第1名 +5星','第2名 +3星','第3名 +2星','第4–10名 +1星','第11–40名 不变','第41–50名 −2星'];
  lines.forEach((line,i)=>text(line,388,532+i*23,16,146,'#784722'));
  text('按赛季最终排名结算',370,701,19,215);arrow(314,735,true);
  ctx.drawImage(a.parchment,37,720,231,168);
  const titles=[['荣耀','0–9星'],['崇高','10–29星'],['至尊','30–49星'],['永恒','50–99星'],['传奇','100星以上']];
  titles.forEach(([title,range],i)=>{text(title,113,750+i*27,17,61,'#784722');image(a['glory-star'],153,733+i*27,17,21);text(range,218,750+i*27,16,82,'#784722');});
  text('追寻你的荣耀之路！',155,923,21,240);
  text('1星扣至0星',380,846,17,185);text('0星再降回大师',380,872,17,185);
 }
 for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(237+i*23,965,8,0,Math.PI*2);ctx.fillStyle=i===page?'#8dde19':'#253d19';ctx.fill();ctx.strokeStyle='#e1d164';ctx.lineWidth=2;ctx.stroke();}
 text('点击继续',248,1019,30);
 ctx.restore();
}
