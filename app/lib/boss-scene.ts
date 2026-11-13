import {createRoom,spawn,snapshot,type PublicRoom} from "./game";
import {BOSS,BOSS_PLATFORM,nextLurer} from "./boss";
const draft=createRoom("","",0,"boss");draft.players[1]=spawn("",1,0);const preview=snapshot(draft,0);
export function drawBoss(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1){
  const r=room??preview,b=r.boss,ink="#393e49",red="#ed684b",blue="#528bce";
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(label:string,x:number,y:number,size=12,color="#f6e5b8")=>{c.fillStyle=color;c.font=`bold ${size}px sans-serif`;c.textAlign="center";c.fillText(label,x,y);};
  c.clearRect(0,0,1120,560);const sky=c.createLinearGradient(0,0,0,460);sky.addColorStop(0,"#605c83");sky.addColorStop(1,"#e2b59b");c.fillStyle=sky;c.fillRect(0,0,1120,560);
  rect(918,78,54,54,"#f4d494");rect(928,68,34,74,"#f4d494");
  for(const [x,h] of [[5,170],[155,240],[440,150],[955,200]] as [number,number][]){rect(x,460-h,115,h,"#767183");for(let xx=x;xx<x+115;xx+=30)rect(xx,450-h,19,22,"#767183");for(let yy=460-h+35;yy<440;yy+=60)rect(x+48,yy,18,25,"#baa08f77");}
  rect(0,460,1120,100,"#837d75");rect(0,460,1120,10,"#a8b38c");rect(0,470,1120,4,"#d7c5a0");
  for(let y=492;y<560;y+=25)for(let x=(y%50?0:28);x<1120;x+=56){rect(x,y,49,2,"#6c6b6a");rect(x,y-18,2,18,"#6c6b6a");}
  const p=BOSS_PLATFORM;rect(p.x,p.y,p.w,p.h,"#8c8d7c");rect(p.x,p.y,p.w,7,"#bcc39a");rect(p.x+12,p.y+22,12,50,"#8c8d7c");rect(p.x+p.w-24,p.y+22,12,50,"#8c8d7c");text("② 破绽时从这里起跳",620,369,12,"#fff0d0");
  rect(220,404,4,56,"#e5d5b5");rect(224,407,25,17,r.checkpoint?"#edc778":"#a9a596");text(r.checkpoint?"检查点已保存":"共享检查点",228,393,10);
  const who=b.phase==="rest"?nextLurer(b):b.lurer??nextLurer(b),beaconColor=who===null?"#e6c676":who===0?red:blue;
  rect(300,450,60,10,"#666c64");rect(305,444,50,6,beaconColor);rect(320,416,20,28,"#7c8373");rect(315,409,30,14,beaconColor);rect(326,411,8,9,"#fff1c2");
  text(b.phase==="ready"?(who===null?"① 任意一人按住互动":"① P"+(who+1)+" 按住互动"):"引诱装置",330,395,12);
  if(b.progress>0&&b.phase==="ready"){rect(302,382,56,5,"#6f706a");rect(302,382,56*b.progress,5,"#f7da91");}
  if(b.phase==="warning"||b.phase==="slam"){
    const x=b.targetX;c.save();c.fillStyle=b.phase==="slam"?"#fff0abbb":"#e7905966";c.fillRect(x-80,440,160,20);c.strokeStyle="#ffe2a1";c.lineWidth=3;c.setLineDash([7,5]);c.strokeRect(x-80,436,160,23);c.setLineDash([]);
    if(b.phase==="slam"){c.beginPath();c.ellipse(x,455,85+Math.sin(time*.03)*8,15,0,0,Math.PI*2);c.stroke();}else{text("⚠ 离开落点",x,430,13,"#fff0b9");}c.restore();
  }
  const bx=BOSS.x,by=BOSS.y+(b.phase==="rest"?5:0),weak=b.phase==="weak",dead=b.hp===0;
  if(!dead){
    if(!weak&&b.phase!=="rest"){c.save();c.strokeStyle="#bfd3c2aa";c.lineWidth=5;c.setLineDash([11,7]);c.beginPath();c.ellipse(bx+46,by+55,70,75,0,0,Math.PI*2);c.stroke();c.restore();}
    const stone=weak?"#ab9a79":"#7c897f";rect(bx-12,by+41,18,48,stone);rect(bx+88,by+41,18,48,stone);rect(bx+3,by+12,86,82,stone);rect(bx+12,by,68,24,"#b2b49b");rect(bx+20,by-9,15,11,"#b2b49b");rect(bx+58,by-9,15,11,"#b2b49b");
    rect(bx+14,by+30,25,17,"#3e5251");rect(bx+53,by+30,25,17,"#3e5251");rect(bx+22,by+35,10,8,weak?"#f2d48a":"#e99c70");rect(bx+58,by+35,10,8,weak?"#f2d48a":"#e99c70");rect(bx+30,by+62,32,7,"#52665b");rect(bx+9,by+94,26,18,"#4d6056");rect(bx+58,by+94,26,18,"#4d6056");
    rect(bx+15,by-3,62,7,weak?"#ffe5a1":"#92a59a");for(let i=0;i<3-b.hp;i++)rect(bx+15+i*24,by+54,5,27,"#e8c48e");
    text(weak?"▼ 跳踩头顶":b.phase==="rest"?"命中！交换职责":"护盾中",bx+46,by-26,14,weak?"#fff3b8":"#e9e0cf");
  }else{rect(bx-6,435,110,25,"#7b8b7a");rect(bx+8,425,26,15,"#b2b49b");rect(bx+65,429,29,12,"#b2b49b");text("✦ 合作击破 ✦",bx+46,405,18,"#fff0b9");}
  rect(1008,286,62,174,"#86887f");rect(1018,300,42,160,"#4a5556");rect(1000,278,78,18,"#bbbc9f");if(!r.open){for(let x=1022;x<1059;x+=12)rect(x,300,5,160,"#dcbd84");}else text("✦",1040,374,28);rect(1083,350,4,110,"#e5d5b5");rect(1087,354,27,20,"#edc778");
  r.players.forEach((p,i)=>{if(!p)return;const x=p.x,y=p.y,col=i===0?red:blue,bob=p.grounded&&Math.abs(p.vx)>1?Math.sin(time*.025)*2:0;c.save();c.globalAlpha=p.downed?.5:!p.online?.4:p.invulnerable>0&&Math.floor(time/85)%2===0?.35:1;
    rect(x+3,y+2,23,9,col);rect(x,y+9,30,5,col);rect(x+5,y+14,20,10,"#f1cba3");rect(x+(p.face<0?8:20),y+16,3,4,ink);rect(x+4,y+24,22,10,col);rect(x+9,y+24,12,13,"#405c61");rect(x+1,y+26,5,9,"#f1cba3");rect(x+24,y+26,5,9,"#f1cba3");rect(x+5,y+35+bob,9,5,ink);rect(x+17,y+35-bob,10,5,ink);c.restore();
    if(p.downed){c.strokeStyle="#e6f1ed";c.lineWidth=3;c.beginPath();c.arc(x+14,y+17,26,0,Math.PI*2);c.stroke();if(r.rescue[i]>0){c.strokeStyle="#edc978";c.lineWidth=4;c.beginPath();c.arc(x+14,y+17,29,-Math.PI/2,-Math.PI/2+r.rescue[i]*Math.PI*2);c.stroke();}text("待救援",x+14,y-17,11);}else text(i===slot?"▼ 你":"P"+(i+1),x+14,y-10,11,col);
  });
}
