import type {InputFrame,Player,Room,PublicRoom} from "./game.ts";

export const BOSS={x:784,y:348,w:92,h:112,health:3,beacon:330,checkpoint:220,warning:2.4,slam:.45,weak:8,rest:2.5};
export const BOSS_PLATFORM={x:510,y:388,w:220,h:22};
export type BossState={hp:number;phase:"ready"|"warning"|"slam"|"weak"|"rest"|"defeated";timer:number;progress:number;lurer:number|null;lastLurer:number|null;targetX:number;hits:{lurer:number;attacker:number}[];attacks:number};
export function createBoss():BossState{return {hp:BOSS.health,phase:"ready",timer:0,progress:0,lurer:null,lastLurer:null,targetX:BOSS.beacon,hits:[],attacks:0};}
export function nextLurer(b:BossState){return b.lastLurer===null?null:1-b.lastLurer;}
function alive(room:Room){return room.players.every(p=>p&&!p.downed);}
function hurt(p:Player,fromX:number){
  if(p.downed||p.invulnerable>0)return;
  p.hearts--;p.invulnerable=90;p.stun=12;p.vx=p.x+14<fromX?-230:230;p.vy=-230;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.interact=false;p.generation++;
  if(p.hearts<=0){p.downed=true;p.downTime=0;p.riding=false;p.vx=0;p.vy=0;p.y=402;p.grounded=false;}
}
function ready(b:BossState){b.phase="ready";b.timer=0;b.progress=0;b.lurer=null;}
export function cancelBossAttempt(room:Room){if(room.level!=="boss"||room.boss.hp<=0)return;ready(room.boss);}
export function bossInteraction(room:Room,slot:number,frame:InputFrame,previousBottom:number){
  const b=room.boss,p=room.players[slot]!;
  if(p.downed||b.hp<=0)return;
  if(!alive(room)){b.progress=0;return;}
  if(b.phase==="ready"){
    const near=p.grounded&&Math.abs(p.y+40-460)<3&&Math.abs(p.x+14-BOSS.beacon)<36;
    const eligible=b.lastLurer===null||slot!==b.lastLurer;
    if(near&&eligible&&frame.use&&p.stun===0&&alive(room)){
      if(b.lurer!==slot)b.progress=0;
      b.lurer=slot;b.progress=Math.min(1,b.progress+1/30);
      if(b.progress>=1-1e-9){b.phase="warning";b.timer=BOSS.warning;b.targetX=p.x+14;b.attacks++;b.progress=1;}
    }else if(b.lurer===slot){b.lurer=null;b.progress=0;}
  }
  const overlap=p.x+28>BOSS.x+4&&p.x<BOSS.x+BOSS.w-4;
  if(b.phase==="weak"&&slot!==b.lurer&&alive(room)&&overlap&&p.vy>0&&previousBottom<=BOSS.y+7&&p.y+40>=BOSS.y&&p.y<BOSS.y+BOSS.h){
    b.hp--;b.hits.push({lurer:b.lurer!,attacker:slot});b.lastLurer=b.lurer;b.progress=0;b.phase=b.hp===0?"defeated":"rest";b.timer=b.hp===0?0:BOSS.rest;
    p.y=BOSS.y-40;p.vy=-470;p.vx=-110;p.grounded=false;p.jumpBuffer=0;p.coyote=0;p.invulnerable=90;p.generation++;
    if(b.hp===0)room.open=true;
  }else if(b.phase!=="rest"&&b.phase!=="defeated"&&overlap&&p.y+40>BOSS.y+6&&p.y<BOSS.y+BOSS.h){hurt(p,BOSS.x+BOSS.w/2);}
}
export function advanceBoss(room:Room,dt:number){
  const b=room.boss;
  if(b.hp<=0||!alive(room))return;
  let remaining=dt;
  while(remaining>0&&b.phase!=="ready"&&b.phase!=="defeated"){
    const used=Math.min(remaining,b.timer);remaining-=used;b.timer=Math.max(0,b.timer-used);
    if(b.timer>1e-9)break;
    if(b.phase==="warning"){
      b.phase="slam";b.timer=BOSS.slam;
      for(const p of room.players)if(p&&Math.abs(p.x+14-b.targetX)<80&&p.y+40>430)hurt(p,b.targetX);
      if(!alive(room))break;
    }else if(b.phase==="slam"){b.phase="weak";b.timer=BOSS.weak;}
    else ready(b);
  }
}
export function bossObjective(room:Room|PublicRoom|null,slot=-1){
  const b=room?.boss??createBoss();
  if(room?.players.some(p=>p?.downed))return "靠近队友，按住互动 1 秒救援；救回后继续挑战。";
  if(b.hp===0)return "Boss 已击败！两人一起走到右侧旗帜。";
  if(b.phase==="warning")return "橙色落点已锁定，离开警戒区或跳起躲避！";
  if(b.phase==="slam")return "震地攻击！等护盾散开，再跳踩头顶。";
  if(b.phase==="weak")return (slot===b.lurer?"让搭档进攻，你在安全处接应。":"护盾破绽！从右侧平台起跳，踩 Boss 头顶。")+" 剩余 "+Math.ceil(b.timer)+" 秒";
  if(b.phase==="rest")return "命中成功！交换职责，刚才进攻的人返回引诱装置。";
  const who=nextLurer(b);return (who===null?"任意一人":who===slot?"你":"P"+(who+1))+"在左侧装置按住互动；另一人到右侧平台待命。";
}
