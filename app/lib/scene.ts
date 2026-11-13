import {drawFactory} from "./factory-scene";
import {drawBoss} from "./boss-scene";
import {PLATFORMS,PLATES,ENEMIES,plateOn,type Room,type PublicRoom,type Level} from "./game";
import {drawRelay} from "./relay-scene";
import {drawCastle} from "./castle-scene";
import {coinsFor} from "./maps";
const red="#ed684b",blue="#528bce",ink="#29463d";
export function drawScene(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1,level:Level="practice"){
  const selected=room?.level??level;
  if(selected==="factory")drawFactory(c,room,time,slot);else if(selected==="boss")drawBoss(c,room,time,slot);else if(selected==="castle")drawCastle(c,room,time,slot);else if(selected==="relay")drawRelay(c,room,time,slot);else drawPractice(c,room,time,slot);
  for(const [i,coin] of coinsFor(selected).entries()){if((room?.coins??0)&(1<<i))continue;const y=coin.y+Math.sin(time*.003+i)*2;c.fillStyle="#9c743c";c.fillRect(coin.x-6,y-10,12,20);c.fillStyle="#f3ce70";c.fillRect(coin.x-8,y-7,16,14);c.fillStyle="#fff1b7";c.fillRect(coin.x-3,y-7,3,14);}
  if(selected==="practice"){c.fillStyle="#6b8c6c";c.fillRect(290,335,4,53);c.fillStyle=room?.checkpoint?"#e6b969":"#acb59e";c.fillRect(294,338,21,15);}
}
function drawPractice(c:CanvasRenderingContext2D,room:PublicRoom|null,time:number,slot=-1){
  const w=1120,h=560;c.clearRect(0,0,w,h);const sky=c.createLinearGradient(0,0,0,460);sky.addColorStop(0,"#cde9e3");sky.addColorStop(1,"#eef1c9");c.fillStyle=sky;c.fillRect(0,0,w,h);
  const rect=(x:number,y:number,a:number,b:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),a,b);};
  const cloud=(x:number,y:number,s=1)=>{c.fillStyle="#fffef0";c.beginPath();c.roundRect(x,y,90*s,22*s,12*s);c.fill();c.fillRect(x+17*s,y-15*s,27*s,18*s);c.fillRect(x+40*s,y-8*s,32*s,12*s);};
  rect(908,49,54,54,"#f9d378");rect(918,39,34,74,"#f9d378");cloud(65,78);cloud(332,122,.8);cloud(683,72,1.1);cloud(989,154,.7);
  for(const [x,y,r,col] of [[110,410,165,"#b9d7b1"],[430,430,185,"#b9d7b1"],[780,420,170,"#b9d7b1"],[220,460,140,"#a4c9a1"],[610,470,160,"#a4c9a1"],[1010,470,130,"#a4c9a1"]] as [number,number,number,string][]){c.fillStyle=col;c.beginPath();c.ellipse(x,y,r,r*.8,0,Math.PI,0);c.fill();}
  for(const x of [24,340,584,858,1080]){rect(x,405,10,55,"#8da67e");rect(x-18,380,46,30,"#7fba91");rect(x-10,362,30,25,"#7fba91");}
  rect(0,460,1120,100,"#ca9870");rect(0,460,1120,12,"#6d9a59");rect(0,472,1120,5,"#a5b36a");
  for(let y=490;y<560;y+=24)for(let x=(y%48?16:0);x<1120;x+=48){rect(x,y,15,4,"#b98160");rect(x+23,y+10,5,5,"#ddac7d");}
  const block=(x:number,y:number,width:number)=>{rect(x,y,width,22,"#b88b67");rect(x,y,width,9,"#83a766");rect(x,y+9,width,3,"#adc67d");for(let k=x+24;k<x+width;k+=30)rect(k,y+13,3,9,"#9c7357");};
  for(const p of PLATFORMS)block(p.x,p.y,p.w);
  // A little flag marks the shared destination.
  rect(1066,332,5,128,"#547762");rect(1071,337,38,27,"#e7a452");rect(1100,337,9,9,"#cde9e3");
  for(let i=0;i<2;i++){const a=PLATES[i],on=room?plateOn(room as unknown as Room,i,room.at):false;const col=i===0?red:blue;
    rect(a.x-4,a.y-7,a.w+8,7,"#536956");rect(a.x,a.y-(on?5:10),a.w,on?5:10,on?"#f8db79":col);
    c.fillStyle=col;c.font="bold 13px monospace";c.textAlign="center";c.fillText(i===0?"P1":"P2",a.x+a.w/2,a.y-27);
    if(on){c.fillStyle="#fff0a4";c.font="20px sans-serif";c.fillText("✦",a.x+a.w/2,a.y-49);}
    c.setLineDash([5,6]);c.strokeStyle=on?"#d9b35e":"#9ba889";c.lineWidth=2;c.beginPath();c.moveTo(a.x+a.w/2,a.y+22);c.lineTo(a.x+a.w/2,443);c.lineTo(974,443);c.stroke();c.setLineDash([]);
  }
  // Brick arch and rising gate.
  rect(936,291,78,169,"#c0ab8a");rect(947,303,56,157,room?.open?"#4f6a52":"#445d50");rect(927,280,96,17,"#ddc5a1");
  if(!room?.open){for(let x=952;x<1002;x+=13)rect(x,303,6,157,"#d8ae68");rect(948,350,56,10,"#e8c785");rect(967,363,16,20,"#354e44");rect(972,367,6,9,"#f3d681");}
  else {rect(952,310,5,140,"#c6db84");for(let j=0;j<5;j++){const yy=332+(j*27+time*.025)%112;c.fillStyle="#f4e9aa";c.fillRect(962+j%3*12,yy,3,5);}}
  c.fillStyle=ink;c.textAlign="center";c.font="bold 12px sans-serif";c.fillText(room?.open?"门开了，一起出发！":"双人能量门",975,260);
  for(let i=0;i<2;i++){rect(953+i*25,273,13,5,room?.open?"#fff2b5":(room&&plateOn(room as unknown as Room,i,room.at)?"#fff2b5":"#8d9e88"));}
  // Flowers and mushrooms.
  for(const x of [40,177,347,605,847,1094]){rect(x,447,3,13,"#66835b");rect(x-4,441,11,8,"#f4ce78");rect(x,442,3,3,"#d69b56");}
  for(const x of [25,325,832]){rect(x+6,451,8,9,"#f4e6c7");rect(x,441,22,12,"#d77f65");rect(x+4,438,14,6,"#d77f65");rect(x+4,442,5,4,"#fff0ca");rect(x+14,445,4,4,"#fff0ca");}
  for(const e of ENEMIES){const {x,y}=e;const dead=!!((room?.defeated??0)&(1<<e.id));
    if(dead){rect(x+2,y+20,28,6,"#c9a67a");rect(x+6,y+21,5,2,"#6e614a");rect(x+22,y+21,5,2,"#6e614a");continue;}
    const foot=Math.sin(time*.008+e.id)>0?1:-1;
    rect(x+3,y+5,26,16,"#a87650");rect(x+7,y,18,8,"#a87650");rect(x,y+11,32,9,"#a87650");rect(x+5,y+7,8,9,"#fff0ce");rect(x+19,y+7,8,9,"#fff0ce");rect(x+9,y+9,4,6,ink);rect(x+19,y+9,4,6,ink);rect(x+3,y+21+foot,11,5,"#6a563e");rect(x+19,y+21-foot,11,5,"#6a563e");rect(x+13,y+19,6,2,"#6a563e");
  }
  const players=room?.players??[{x:98,y:420,face:1,vx:0,grounded:true,online:true,invulnerable:0},{x:155,y:420,face:1,vx:0,grounded:true,online:true,invulnerable:0}];
  players.forEach((p,i)=>{if(!p)return;const x=Math.round(p.x),y=Math.round(p.y),col=i===0?red:blue;const bob=p.grounded&&Math.abs(p.vx)>1?Math.sin(time*.025)*2:0;
    c.save();c.globalAlpha=p.online?(p.invulnerable>0&&Math.floor(time/85)%2===0?.35:1):.4;c.fillStyle="rgba(37,67,49,.13)";c.beginPath();const floor=PLATFORMS.find(s=>x+28>s.x&&x<s.x+s.w&&p.y+40<=s.y+1)?.y??460;c.ellipse(x+14,floor,18,4,0,0,Math.PI*2);c.fill();
    rect(x+3,y+2,23,9,col);rect(x,y+9,30,5,col);rect(x+5,y+14,20,10,"#f1cba3");rect(x+(p.face<0?8:20),y+16,3,4,ink);rect(x+4,y+24,22,10,col);rect(x+9,y+24,12,13,"#405c61");rect(x+1,y+26,5,9,"#f1cba3");rect(x+24,y+26,5,9,"#f1cba3");rect(x+5,y+35+bob,9,5,ink);rect(x+17,y+35-bob,10,5,ink);
    c.font="bold 12px sans-serif";c.textAlign="center";c.fillStyle=ink;c.fillText(i===slot?"▼ 你":"P"+(i+1),x+14,y-10);c.restore();
  });
  if(room?.charge&& !room.open){rect(939,240,76,5,"#8fa78e");rect(939,240,76*room.charge,5,"#f5dc90");}
}
