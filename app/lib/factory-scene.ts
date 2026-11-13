import {createRoom,spawn,snapshot,type PublicRoom} from "./game";
import {CRATE,FACTORY_LEDGE,FACTORY_KEY,FACTORY_GATE,FACTORY_PIT,FACTORY_ENEMIES,factoryPowered} from "./factory";
const draft=createRoom("","",0,"factory");draft.players[1]=spawn("",1,0);const preview=snapshot(draft,0);
export function drawFactory(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1){
  const r=room??preview,f=r.factory,ink="#364b48",red="#ed684b",blue="#528bce",powered=factoryPowered(r);
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(value:string,x:number,y:number,size=12,color=ink)=>{c.textAlign="center";c.font=`bold ${size}px sans-serif`;c.fillStyle=color;c.fillText(value,x,y);};
  c.clearRect(0,0,1120,560);const sky=c.createLinearGradient(0,0,0,460);sky.addColorStop(0,"#b9cbc3");sky.addColorStop(1,"#e0dfbf");c.fillStyle=sky;c.fillRect(0,0,1120,560);
  // Skylights, warm brickwork and slow decorative flywheels.
  for(const x of [40,280,560,840]){rect(x,0,136,142,"#a3b9ae");rect(x+8,8,120,126,"#cbd9c6");rect(x+65,8,7,126,"#a3b9ae");rect(x+8,70,120,7,"#a3b9ae");}
  rect(0,154,1120,12,"#9bafa0");rect(0,168,1120,5,"#e9e3c7");
  for(const x of [36,578,1080]){rect(x,185,13,275,"#97a897");rect(x-5,195,23,9,"#bcc6aa");rect(x-5,425,23,9,"#bcc6aa");}
  for(const [x,y,radius] of [[130,250,44],[690,232,42],[1010,222,33]]){c.save();c.translate(x,y);c.rotate(time*.00013);for(let i=0;i<8;i++){c.rotate(Math.PI/4);rect(-7,-radius-5,14,13,"#a7b09a");}c.strokeStyle="#a7b09a";c.lineWidth=12;c.beginPath();c.arc(0,0,radius-5,0,Math.PI*2);c.stroke();rect(-radius+6,-4,radius*2-12,8,"#a7b09a");rect(-4,-radius+6,8,radius*2-12,"#a7b09a");c.restore();}
  for(const [x,w] of [[0,820],[900,220]]){rect(x,460,w,100,"#b69b77");rect(x,460,w,10,"#7d9580");rect(x,470,w,6,"#c4bc90");for(let y=488;y<560;y+=24)for(let a=x+10;a<x+w-20;a+=45){rect(a,y,27,3,"#a5896b");rect(a+15,y+10,4,4,"#d1b58b");}}
  rect(FACTORY_PIT.x,460,FACTORY_PIT.w,100,"#5e7972");for(let y=476;y<560;y+=20)rect(829,y,62,4,"#8aa296");for(const x of [808,900]){rect(x,452,12,8,"#dab777");rect(x+4,452,4,8,"#7d8070");}
  const ledge=FACTORY_LEDGE;rect(ledge.x,ledge.y,ledge.w,22,"#8d9f8c");rect(ledge.x,ledge.y,ledge.w,7,"#e1ca91");for(const x of [395,525]){rect(x,322,8,138,"#a7b49d");}
  // The crate is constrained to this marked rail. Leave it in the amber docking bay.
  rect(140,457,250,3,"#8e9277");for(let x=150;x<=380;x+=15)rect(x,453,2,5,"#aa9b73");rect(320,450,70,10,powered?"#e8cd83":"#b4a77e");
  c.strokeStyle=powered?"#d0a65d":"#9ca48d";c.lineWidth=3;c.setLineDash([6,5]);c.beginPath();c.moveTo(355,480);c.lineTo(620,480);c.lineTo(620,445);c.stroke();c.setLineDash([]);
  const box=f.crateX;rect(box,CRATE.y,60,64,"#9e7954");rect(box+4,CRATE.y+4,52,56,"#d2aa6d");rect(box+8,CRATE.y+8,44,48,"#b38e5d");rect(box+25,CRATE.y+5,10,55,"#d8b77f");rect(box+5,CRATE.y+26,50,10,"#d8b77f");for(const [dx,dy] of [[7,7],[48,7],[7,52],[48,52]])rect(box+dx,CRATE.y+dy,5,5,"#73694c");
  text(f.crateX>=320?"① 供能就位":"① 互动＋方向推箱",box+30,CRATE.y-17,12,f.crateX>=320?"#8b713d":ink);
  rect(FACTORY_KEY.x-25,294,50,6,"#bbaa7d");text(f.keyTaken?"② 钥匙已取":"② 登高取钥匙",460,239,12);
  rect(602,150,40,12,"#a4a388");rect(603,162,7,298,"#8b9b86");rect(634,162,7,298,"#8b9b86");
  if(!powered){for(let y=171;y<457;y+=17){rect(611,y,22,9,"#c7aa6b");rect(616,y,7,9,"#8f9475");}}else{rect(612,164,20,12,"#dbc481");text("供能门已开",622,133,11,"#827241");}
  rect(730,382,4,78,"#718e78");rect(734,386,28,20,r.checkpoint?"#e8bd70":"#b5b99e");text(r.checkpoint?"检查点已保存":"③ 接力后会合",742,371,11);
  rect(1008,249,57,211,"#a1a58a");rect(1018,261,37,199,"#546d61");rect(1001,238,72,14,"#d6c08c");if(!f.unlocked){for(let x=1021;x<1056;x+=11)rect(x,261,5,199,"#d1b578");rect(1018,350,37,9,"#e1c58b");rect(979,416,12,20,"#9b7c49");rect(982,420,6,10,"#f4d58a");}else{rect(1021,271,4,177,"#d9e3a0");text("✦",1035,360,22,"#f5e9b0");}
  text(f.unlocked?"出口已解锁":"④ 接力者开锁",1004,220,11);rect(1084,350,4,110,"#6c8771");rect(1088,354,25,19,"#deb66b");
  for(const e of FACTORY_ENEMIES){if(r.defeated&(1<<e.id)){rect(e.x+3,e.y+21,26,5,"#af9471");continue;}rect(e.x+3,e.y+5,26,16,"#9d8059");rect(e.x+7,e.y,18,8,"#9d8059");for(const dx of [7,20]){rect(e.x+dx,e.y+7,7,9,"#f3e4be");rect(e.x+dx+2,e.y+9,3,6,ink);}rect(e.x+3,e.y+21,10,5,"#655e49");rect(e.x+19,e.y+21,10,5,"#655e49");}
  r.players.forEach((p,i)=>{if(!p)return;const x=Math.round(p.x),y=Math.round(p.y),color=i===0?red:blue,bob=p.grounded&&Math.abs(p.vx)>1?Math.sin(time*.025)*2:0;c.save();c.globalAlpha=p.downed?.55:!p.online?.4:p.invulnerable>0&&Math.floor(time/85)%2===0?.35:1;
    rect(x+3,y+2,23,9,color);rect(x,y+9,30,5,color);rect(x+5,y+14,20,10,"#f1cba3");rect(x+(p.face<0?8:20),y+16,3,4,ink);rect(x+4,y+24,22,10,color);rect(x+9,y+24,12,13,"#405c61");rect(x+1,y+26,5,9,"#f1cba3");rect(x+24,y+26,5,9,"#f1cba3");rect(x+5,y+35+bob,9,5,ink);rect(x+17,y+35-bob,10,5,ink);c.restore();
    if(p.downed){c.strokeStyle="#f0f5d7";c.lineWidth=3;c.beginPath();c.arc(x+14,y+17,26,0,Math.PI*2);c.stroke();if(r.rescue[i]){c.strokeStyle="#e6c276";c.lineWidth=4;c.beginPath();c.arc(x+14,y+17,29,-Math.PI/2,-Math.PI/2+r.rescue[i]*Math.PI*2);c.stroke();}text("待救援",x+14,y-17,11);}else text(i===slot?"▼ 你":"P"+(i+1),x+14,y-10,11,color);
  });
  if(!f.unlocked){const owner=f.keyOwner===null?null:r.players[f.keyOwner],x=owner?owner.x+14:f.keyX,y=owner?owner.y-25:f.keyY+Math.sin(time*.003)*2;
    c.strokeStyle="#9c783d";c.lineWidth=7;c.beginPath();c.arc(x-5,y,7,0,Math.PI*2);c.stroke();rect(x+1,y-3,22,6,"#f4d37f");rect(x+14,y,5,9,"#f4d37f");rect(x+20,y,5,6,"#f4d37f");c.strokeStyle="#f6db91";c.lineWidth=3;c.beginPath();c.arc(x-5,y,7,0,Math.PI*2);c.stroke();}
  if(f.handoff>0){rect(500,352,65,5,"#9eaa8e");rect(500,352,65*f.handoff,5,"#e6c275");}
}
