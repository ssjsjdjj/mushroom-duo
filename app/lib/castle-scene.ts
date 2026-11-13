import {createRoom,spawn,snapshot,type PublicRoom} from "./game";
import {CASTLE_PLATFORMS,CASTLE_BRIDGE,CASTLE_SWITCHES,CASTLE_ENEMIES,FERRY} from "./maps";
const draft=createRoom("","",0,"castle");draft.players[1]=spawn("",1,0);const preview=snapshot(draft,0);
export function drawCastle(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1){
  const r=room??preview,ink="#30374e",red="#ed684b",blue="#528bce";
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(label:string,x:number,y:number,size=11,color="#e5dcc2")=>{c.fillStyle=color;c.font=`bold ${size}px sans-serif`;c.textAlign="center";c.fillText(label,x,y);};
  const stone=(x:number,y:number,w:number,h:number)=>{rect(x,y,w,h,"#777785");rect(x,y,w,7,"#a5a093");for(let yy=y+17;yy<y+h;yy+=24){rect(x,yy,w,2,"#5f6574");for(let xx=x+(yy%48?0:24);xx<x+w;xx+=48)rect(xx,yy-16,2,16,"#626a78");}};
  c.clearRect(0,0,1120,560);const sky=c.createLinearGradient(0,0,0,460);sky.addColorStop(0,"#333d5d");sky.addColorStop(1,"#8e8a9d");c.fillStyle=sky;c.fillRect(0,0,1120,560);
  rect(910,55,48,48,"#f1d8a1");rect(924,46,21,66,"#f1d8a1");
  for(const [x,y] of [[70,60],[250,115],[390,45],[665,92],[1030,140]]){rect(x,y,3,3,"#d9d1be");rect(x-2,y+2,7,2,"#d9d1be");}
  for(const [x,y,w,h] of [[25,180,125,280],[280,215,130,245],[680,160,120,300],[970,190,135,270]]){rect(x,y,w,h,"#535c78");for(let xx=x;xx<x+w;xx+=30)rect(xx,y-18,18,25,"#535c78");for(let yy=y+40;yy<420;yy+=70)rect(x+w/2-9,yy,18,30,"#d0b98e44");}
  stone(0,460,580,100);stone(790,460,330,100);rect(580,468,210,92,"#344c69");
  for(let y=486;y<560;y+=20){const shift=Math.sin(time*.001+y)*8;rect(591+shift,y,180,2,"#89a6b0");}
  text("深沟 · 搭乘移动平台",686,540,11,"#b8cdd1");
  for(const p of CASTLE_PLATFORMS)stone(p.x,p.y,p.w,p.h);
  if(r.castleLower){stone(CASTLE_BRIDGE.x,CASTLE_BRIDGE.y,CASTLE_BRIDGE.w,CASTLE_BRIDGE.h);text("高处桥梁已接通",750,240,11,"#e8d9a4");}
  else{c.strokeStyle="#c0b6a4";c.setLineDash([5,7]);c.strokeRect(CASTLE_BRIDGE.x,CASTLE_BRIDGE.y,CASTLE_BRIDGE.w,10);c.setLineDash([]);text("等队友在对岸开桥",750,244,11);}
  if(!r.castleUpper){stone(515,322,22,138);text("下方通道",526,310,10);}else rect(515,453,22,7,"#b4a88c");
  for(let i=0;i<2;i++){const s=CASTLE_SWITCHES[i],opened=i===0?r.castleUpper:r.castleLower;rect(s.x-6,s.y-25,12,25,"#b2a98b");rect(s.x+(opened?0:-14),s.y-31,18,8,opened?"#c6d991":"#edb068");text(opened?"开关已点亮":i===0?"① 高处：开下方通道":"② 对岸：给队友架桥",s.x,s.y-48,11);if(!opened&&r.castleProgress[i]>0){rect(s.x-28,s.y-40,56,4,"#6c7184");rect(s.x-28,s.y-40,56*r.castleProgress[i],4,"#f2d18b");}}
  const fx=r.ferry.x;rect(fx,460,FERRY.w,13,"#a98059");rect(fx,460,FERRY.w,5,"#e2c481");for(let x=fx+8;x<fx+80;x+=18)rect(x,467,8,3,"#6a5b52");
  text(r.ferry.rider!==null?"到岸自动下台":"移动平台 · 站稳搭乘",fx+45,493,10,"#e9ddb9");
  rect(890,386,4,74,"#e1d5b3");rect(894,389,30,19,r.checkpoint?"#e7bc65":"#9d9da6");text(r.checkpoint?"共享检查点已保存":"共享检查点",901,375,10);
  stone(1008,290,62,170);rect(1018,300,42,160,"#35485d");stone(1000,277,78,18);
  if(!r.open){for(let x=1022;x<1058;x+=12)rect(x,300,5,160,"#dbba81");rect(1018,353,42,8,"#d9bc84");}else text("✦",1040,373,28,"#f1dfa3");
  text(r.open?"会合吧，搭档！":"双开关会合门",1038,260,11);rect(1083,350,4,110,"#e3d6b6");rect(1087,354,27,20,"#e4b56b");
  for(const x of [80,450,980]){rect(x,385,7,32,"#9a826a");rect(x-2,372,11,16,"#edb475");rect(x,367+Math.sin(time*.007+x)*3,7,13,"#f2d18b");}
  for(const e of CASTLE_ENEMIES){if(r.defeated&(1<<e.id)){rect(e.x+2,e.y+20,28,6,"#8e8790");continue;}rect(e.x+3,e.y+5,26,17,"#9c8098");rect(e.x+7,e.y,18,8,"#b89aac");for(const a of [6,20]){rect(e.x+a,e.y+8,7,8,"#efe4d3");rect(e.x+a+2,e.y+10,3,5,ink);}rect(e.x+3,e.y+22,11,4,"#48485e");rect(e.x+20,e.y+22,11,4,"#48485e");}
  r.players.forEach((p,i)=>{if(!p)return;const x=p.x,y=p.y,col=i===0?red:blue,bob=p.grounded&&Math.abs(p.vx)>1?Math.sin(time*.025)*2:0;
    c.save();c.globalAlpha=p.downed?.5:!p.online?.4:p.invulnerable>0&&Math.floor(time/85)%2===0?.35:1;
    rect(x+3,y+2,23,9,col);rect(x,y+9,30,5,col);rect(x+5,y+14,20,10,"#f1cba3");rect(x+(p.face<0?8:20),y+16,3,4,ink);rect(x+4,y+24,22,10,col);rect(x+9,y+24,12,13,"#405c61");rect(x+1,y+26,5,9,"#f1cba3");rect(x+24,y+26,5,9,"#f1cba3");rect(x+5,y+35+bob,9,5,ink);rect(x+17,y+35-bob,10,5,ink);c.restore();
    if(p.downed){c.strokeStyle="#e6f1ed";c.lineWidth=3;c.beginPath();c.arc(x+14,y+17,26,0,Math.PI*2);c.stroke();if(r.rescue[i]>0){c.strokeStyle="#edc978";c.lineWidth=4;c.beginPath();c.arc(x+14,y+17,29,-Math.PI/2,-Math.PI/2+r.rescue[i]*Math.PI*2);c.stroke();}text("待救援",x+14,y-17,11);}else text(i===slot?"▼ 你":"P"+(i+1),x+14,y-10,11,col);
  });
}
