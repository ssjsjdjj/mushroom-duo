import type {InputFrame,Player,PublicRoom,Room,WorldFrame} from "./game.ts";
export const CRATE={start:220,min:140,max:330,w:60,h:64,y:396,speed:100,dock:320};
export const FACTORY_LEDGE={x:385,y:300,w:160,h:22};
export const FACTORY_GATE={x:610,y:160,w:24,h:300};
export const FACTORY_PIT={x:820,w:80};
export const FACTORY_KEY={x:460,y:270};
export const FACTORY_LOCK={x:984,y:440};
export const FACTORY_ENEMIES=[{id:0,x:940,y:434,w:32,h:26}];
export type FactoryState={crateX:number;pushDistance:number;keyTaken:boolean;keyOwner:number|null;finder:number|null;keyX:number;keyY:number;transfers:number;pickup:number[];handoff:number;unlockProgress:number;unlocked:boolean;deliveredBy:number|null;resets:number};
export function createFactory():FactoryState{return {crateX:CRATE.start,pushDistance:0,keyTaken:false,keyOwner:null,finder:null,keyX:FACTORY_KEY.x,keyY:FACTORY_KEY.y,transfers:0,pickup:[0,0],handoff:0,unlockProgress:0,unlocked:false,deliveredBy:null,resets:0};}
export function factoryPowered(room:Pick<Room|PublicRoom,"factory"|"checkpoint"|"players">){return room.checkpoint||room.factory.crateX>=CRATE.dock||room.players.some(p=>p&&!p.downed&&p.x+28>FACTORY_GATE.x&&p.x<FACTORY_GATE.x+FACTORY_GATE.w&&p.y+40>FACTORY_GATE.y);}
export function factorySolids(world:WorldFrame,open:boolean){return [FACTORY_LEDGE,{x:world.factoryCrateX??CRATE.start,y:CRATE.y,w:CRATE.w,h:CRATE.h},...(world.factoryGateOpen||(world.factoryCrateX??CRATE.start)>=CRATE.dock?[]:[FACTORY_GATE]),...(open?[]:[{x:1018,y:260,w:32,h:200}]),{x:0,y:460,w:FACTORY_PIT.x,h:100},{x:900,y:460,w:220,h:100}];}
// Shared by prediction and the authority. A box cannot sweep through a partner or move under their feet.
export function pushFactoryCrate(p:Player,frame:InputFrame,world:WorldFrame,step:number){
  const x=world.factoryCrateX??CRATE.start;
  if(!frame.use||!frame.dir||p.downed||p.stun>0||!p.grounded||Math.abs(p.y+40-460)>2)return;
  if(frame.dir>0?Math.abs(p.x+28-x)>4:Math.abs(p.x-(x+CRATE.w))>4)return;
  let next=Math.max(CRATE.min,Math.min(CRATE.max,x+frame.dir*CRATE.speed*step));
  for(const peer of world.factoryPeers??[]){if(peer.slot===p.slot||peer.downed)continue;
    if(peer.grounded&&Math.abs(peer.y+40-CRATE.y)<3&&peer.x+28>x&&peer.x<x+CRATE.w)return;
    if(peer.y+40>CRATE.y+.01&&peer.y<460&&peer.x+28>Math.min(x,next)&&peer.x<Math.max(x,next)+CRATE.w){
      if(frame.dir>0&&peer.x>=x+CRATE.w-.01)next=Math.min(next,peer.x-CRATE.w);
      else if(frame.dir<0&&peer.x+28<=x+.01)next=Math.max(next,peer.x+28);
      else return;
    }
  }
  world.factoryCrateX=next;
}
const near=(p:Player,x:number,y:number,distance=44)=>Math.abs(p.x+14-x)<distance&&Math.abs(p.y+20-y)<44;
export function clearFactoryHolds(f:FactoryState){f.pickup=[0,0];f.handoff=0;f.unlockProgress=0;}
export function factoryDrop(room:Room){const f=room.factory;if(f.keyOwner===null||f.unlocked)return;const p=room.players[f.keyOwner];if(!p||p.downed){f.keyX=p?Math.max(35,Math.min(1070,p.x+14)):room.checkpoint?730:560;f.keyY=434;f.keyOwner=null;clearFactoryHolds(f);}}
export function releaseFactorySeat(room:Room,slot:number){if(room.level!=="factory")return;const f=room.factory;
  if(!f.transfers&&f.finder===slot){f.keyTaken=false;f.finder=null;f.keyOwner=null;f.keyX=FACTORY_KEY.x;f.keyY=FACTORY_KEY.y;}
  else if(f.keyOwner===slot){const p=room.players[slot];f.keyOwner=null;f.keyX=room.checkpoint?730:Math.min(FACTORY_PIT.x-35,p?.x??560)+14;f.keyY=434;}
  clearFactoryHolds(f);
}
export function resetFactory(room:Room){const old=room.factory??createFactory(),f=createFactory();f.resets=old.resets;
  if(room.checkpoint){f.crateX=CRATE.max;f.pushDistance=old.pushDistance;f.keyTaken=true;f.finder=old.finder===1?1:0;f.transfers=1;f.keyOwner=1-f.finder;f.keyX=730;f.keyY=434;f.unlocked=old.unlocked;f.deliveredBy=f.unlocked?1-f.finder:null;if(f.unlocked)f.keyOwner=null;}
  room.factory=f;room.open=f.unlocked;
}
export function factoryInteraction(room:Room,slot:number,frame:InputFrame,step:number){
  const f=room.factory,p=room.players[slot]!,peer=room.players[1-slot];factoryDrop(room);
  if(p.downed||p.stun>0){f.pickup[slot]=0;if(f.keyOwner===slot){f.handoff=0;f.unlockProgress=0;}return;}
  if(!f.unlocked&&f.keyOwner===null){const eligible=!f.keyTaken||slot===(f.transfers?1-f.finder!:f.finder);
    f.pickup[slot]=eligible&&frame.use&&near(p,f.keyX,f.keyY)?Math.min(1,f.pickup[slot]+step/.4):0;
    if(f.pickup[slot]>=1){f.keyTaken=true;f.finder??=slot;f.keyOwner=slot;f.pickup=[0,0];}
  }
  if(f.keyOwner!==slot)return;
  if(!f.transfers){const canPass=frame.use&&peer&&!peer.downed&&peer.stun===0&&peer.interact&&Math.abs(p.x-peer.x)<65&&Math.abs(p.y-peer.y)<48;
    f.handoff=canPass?Math.min(1,f.handoff+step/.6):0;
    if(f.handoff>=1){f.keyOwner=1-slot;f.transfers=1;f.handoff=0;f.unlockProgress=0;}
  }else{
    f.unlockProgress=room.checkpoint&&frame.use&&slot!==f.finder&&p.grounded&&near(p,FACTORY_LOCK.x,FACTORY_LOCK.y)?Math.min(1,f.unlockProgress+step/.6):0;
    if(f.unlockProgress>=1){f.unlocked=true;f.deliveredBy=slot;f.keyOwner=null;room.open=true;}
  }
}
export function factoryObjective(room:PublicRoom|null){const f=room?.factory;
  if(room?.won)return "机关工厂完成！这把钥匙，是两个人的默契。";
  if(room?.players.some(p=>p?.downed))return "靠近救援泡泡，按住互动救回搭档；钥匙会留在安全地面。";
  if(f&&f.crateX<CRATE.dock&&room?.players.some(p=>p&&p.grounded&&Math.abs(p.y+40-CRATE.y)<3&&p.x+28>f.crateX&&p.x<f.crateX+CRATE.w))return "搭档站在箱上，箱体已锁住。先跳下，再把箱子推到黄色供能位。";
  if(!f||f.crateX<CRATE.dock)return "贴住箱子侧面，按住互动＋方向，把箱子推到黄色供能位。";
  if(!f.keyTaken)return "借箱子跳上高台，在钥匙旁按住互动取钥匙。";
  if(f.keyOwner===null&&!f.unlocked)return `P${(f.transfers?1-f.finder!:f.finder!)+1}靠近地上的钥匙，按住互动取回。`;
  if(!f.transfers)return `P${f.finder!+1}带钥匙回到搭档身边，两人都按住互动，完成接力。`;
  if(!room?.checkpoint)return "接力成功！两人穿过供能门，在旗帜旁会合保存检查点。";
  if(!f.unlocked)return `P${f.keyOwner!+1}带钥匙跳过裂隙，在出口锁旁按住互动。`;
  return "出口已解锁，两人一起走到最右侧旗帜！";
}
