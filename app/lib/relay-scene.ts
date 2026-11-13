import {LIFT,POWER,LEVER,CHECKPOINT,PIT,RELAY_PLATFORMS,RELAY_PLATES,RELAY_ENEMIES,createRoom,spawn,snapshot,onPower,plateOn,type PublicRoom,type Room} from "./game";
const draft=createRoom("","",0);draft.players[1]=spawn("",1,0);const preview=snapshot(draft,0);
export function drawRelay(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1){
  const r=room??preview,ink="#29463d",red="#ed684b",blue="#528bce";
  const rect=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(label:string,x:number,y:number,size=11,col=ink)=>{c.font=`bold ${size}px sans-serif`;c.fillStyle=col;c.textAlign="center";c.fillText(label,x,y);};
  c.clearRect(0,0,1120,560);const sky=c.createLinearGradient(0,0,0,460);sky.addColorStop(0,"#718e88");sky.addColorStop(1,"#d4dbb5");c.fillStyle=sky;c.fillRect(0,0,1120,560);
  for(const [x,h] of [[10,92],[160,125],[340,75],[570,132],[790,95],[1000,135]]){rect(x,0,100,h,"#617e74");rect(x+22,h,55,32,"#617e74");rect(x+38,h+32,25,24,"#617e74");}
  for(const [x,y] of [[100,185],[640,155],[900,190]]){c.fillStyle="#edf4b14d";c.beginPath();c.arc(x,y,37,0,Math.PI*2);c.fill();rect(x-4,y-7,8,14,"#f1e5a2");}
  for(const [x,y,a,b,col] of [[150,460,200,150,"#b9d7b1"],[480,460,190,175,"#c2dcb8"],[830,460,180,145,"#b9d7b1"],[240,470,150,110,"#a7caa5"],[630,470,155,90,"#a7caa5"],[1040,470,140,125,"#a7caa5"]] as [number,number,number,number,string][]){c.fillStyle=col;c.beginPath();c.ellipse(x,y,a,b,0,Math.PI,0);c.fill();}
  for(const [x,w] of [[0,PIT.x],[PIT.x+PIT.w,1120-PIT.x-PIT.w]]){rect(x,460,w,100,"#ca9870");rect(x,460,w,10,"#6d9a59");rect(x,470,w,5,"#a5b36a");for(let y=488;y<560;y+=24)for(let a=x+12;a<x+w-12;a+=43){rect(a,y,13,4,"#b98160");rect(a+21,y+11,5,5,"#dfad7f");}}
  rect(PIT.x,460,PIT.w,100,"#53736e");rect(PIT.x+6,478,PIT.w-12,82,"#638b85");for(let y=492;y<560;y+=21)rect(PIT.x+13,y,PIT.w-26,3,"#8aaca0");text("裂 隙",PIT.x+PIT.w/2,484,10,"#f9e4ae");
  for(const x of [PIT.x-12,PIT.x+PIT.w]){rect(x,452,12,9,"#d8b069");rect(x+3,452,4,9,"#687b57");}
  for(const p of RELAY_PLATFORMS){rect(p.x,p.y,p.w,p.h,"#b88b67");rect(p.x,p.y,p.w,9,"#83a766");rect(p.x,p.y+9,p.w,3,"#adc67d");for(let x=p.x+24;x<p.x+p.w;x+=30)rect(x,p.y+13,3,9,"#9c7357");}
  // The operator and rider occupy separate, visible stations.
  const power=r.players.some(p=>onPower(p as never));
  rect(POWER.x-4,453,POWER.w+8,7,"#516957");rect(POWER.x,power?455:450,POWER.w,power?5:10,power?"#f4dc8b":"#dba95b");text("① 踩住供能",POWER.x+POWER.w/2,428,11);
  c.strokeStyle=power?"#e5c06c":"#9ca98b";c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.moveTo(POWER.x+POWER.w/2,475);c.lineTo(LIFT.x+LIFT.w/2,475);c.lineTo(LIFT.x+LIFT.w/2,440);c.stroke();c.setLineDash([]);
  for(const x of [LIFT.x-5,LIFT.x+LIFT.w]){rect(x,292,5,168,"#7b9480");for(let y=300;y<458;y+=20)rect(x-2,y,9,3,"#a6b89b");}
  rect(LIFT.x,r.lift.y,LIFT.w,12,"#b88e51");rect(LIFT.x,r.lift.y,LIFT.w,5,"#f0d185");for(let x=LIFT.x+6;x<LIFT.x+LIFT.w;x+=18)rect(x,r.lift.y+7,9,3,"#8e7144");
  if(r.lift.y<=301)rect(LIFT.x+LIFT.w,300,450-LIFT.x-LIFT.w,8,"#d5bc7d");
  text(r.lift.rider!==null?"到顶后向右走":"单人升降台",LIFT.x+LIFT.w/2,280,10);
  if(!r.bridgeOpened){rect(438,322,18,138,"#76967d");for(let y=330;y<455;y+=21)rect(440,y,14,6,"#b9cca1");text("捷径",447,440,8,"#f6efd1");}else{rect(438,450,18,10,"#98af83");}
  rect(LEVER.x-4,278,8,22,"#789077");rect(LEVER.x-15,296,30,4,"#a39b6e");rect(LEVER.x+(r.bridgeOpened?2:-13),274,15,7,r.bridgeOpened?"#91b788":"#e4aa65");text(r.bridgeOpened?"② 捷径已开":"② 按住互动",LEVER.x,252,11,r.bridgeOpened?"#567e54":ink);
  if(!r.bridgeOpened&&r.leverProgress>0){rect(LEVER.x-26,260,52,4,"#b4bea0");rect(LEVER.x-26,260,52*r.leverProgress,4,"#f0d185");}
  rect(CHECKPOINT.x,386,4,74,"#6d8d74");rect(CHECKPOINT.x+4,389,29,19,r.checkpoint?"#edbd68":"#acb5a0");text(r.checkpoint?"③ 已保存":"③ 检查点",CHECKPOINT.x+10,374,11,r.checkpoint?"#a17e42":ink);
  if(r.checkpoint){c.strokeStyle="#d2bb72";c.lineWidth=2;c.beginPath();c.ellipse(CHECKPOINT.x+3,458,26,5,0,0,Math.PI*2);c.stroke();}
  for(let i=0;i<2;i++){const a=RELAY_PLATES[i],on=plateOn(r as unknown as Room,i,r.at);rect(a.x-3,a.y-6,a.w+6,6,"#526d59");rect(a.x,a.y-(on?5:10),a.w,on?5:10,on?"#f8dc88":i===0?red:blue);text("P"+(i+1),a.x+a.w/2,a.y-25,10,i===0?red:blue);}
  rect(1008,290,62,170,"#c0ab8a");rect(1018,300,42,160,"#4b6652");rect(1001,278,76,15,"#ddc5a1");if(!r.open){for(let x=1021;x<1058;x+=12)rect(x,300,5,160,"#d8ae68");rect(1018,353,42,8,"#edc982");}else{rect(1021,310,4,140,"#c7db8a");text("✦",1039,373,22,"#fff0b1");}text(r.open?"一起到终点":"④ 双人终点",1039,264,10);
  rect(1083,350,4,110,"#58785e");rect(1087,354,27,20,"#e4b56b");
  for(const e of RELAY_ENEMIES){const {x,y}=e;if(r.defeated&(1<<e.id)){rect(x+2,y+20,28,6,"#c9a67a");continue;}const foot=Math.sin(time*.008+e.id)>0?1:-1;rect(x+3,y+5,26,16,"#a87650");rect(x+7,y,18,8,"#a87650");rect(x,y+11,32,9,"#a87650");rect(x+5,y+7,8,9,"#fff0ce");rect(x+19,y+7,8,9,"#fff0ce");rect(x+9,y+9,4,6,ink);rect(x+19,y+9,4,6,ink);rect(x+3,y+21+foot,11,5,"#6a563e");rect(x+19,y+21-foot,11,5,"#6a563e");}
  r.players.forEach((p,i)=>{if(!p)return;const x=Math.round(p.x),y=Math.round(p.y),col=i===0?red:blue;const bob=p.grounded&&Math.abs(p.vx)>1?Math.sin(time*.025)*2:0;c.save();c.globalAlpha=p.downed?.5:!p.online?.4:p.invulnerable>0&&Math.floor(time/85)%2===0?.35:1;
    rect(x+3,y+2,23,9,col);rect(x,y+9,30,5,col);rect(x+5,y+14,20,10,"#f1cba3");rect(x+(p.face<0?8:20),y+16,3,4,ink);rect(x+4,y+24,22,10,col);rect(x+9,y+24,12,13,"#405c61");rect(x+1,y+26,5,9,"#f1cba3");rect(x+24,y+26,5,9,"#f1cba3");rect(x+5,y+35+bob,9,5,ink);rect(x+17,y+35-bob,10,5,ink);c.restore();
    if(p.downed){c.strokeStyle="#edf8db";c.lineWidth=3;c.beginPath();c.arc(x+14,y+17,26,0,Math.PI*2);c.stroke();if(r.rescue[i]>0){c.strokeStyle="#eac56b";c.lineWidth=4;c.beginPath();c.arc(x+14,y+17,29,-Math.PI/2,-Math.PI/2+r.rescue[i]*Math.PI*2);c.stroke();}text("待救援",x+14,y-17,11);}
    else text(i===slot?"▼ 你":"P"+(i+1),x+14,y-10,11,col);
  });
}
