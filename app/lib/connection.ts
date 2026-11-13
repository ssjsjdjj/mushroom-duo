import {releaseFactorySeat} from "./factory.ts";
import {cancelBossAttempt} from "./boss.ts";
import type {Player,Room} from "./game.ts";
export const ONLINE_MS=7000;
export const RECONNECT_MS=30000;
export function playerOnline(p:Pick<Player,"seen"|"away">|null,now:number){return !!p&&!p.away&&now-p.seen<ONLINE_MS;}
export function retryDelay(failures:number){return Math.min(3000,400*2**Math.min(4,Math.max(0,failures-1)));}
export function leaseSeconds(serverAt:number,seen:number,elapsedMs=0){return Math.max(0,Math.ceil((RECONNECT_MS-Math.max(0,serverAt-seen+elapsedMs))/1000));}
function fence(p:Player,now:number){p.connection++;p.generation++;p.ack=0;p.credit=12;p.creditAt=now;p.dir=0;p.vx=0;p.interact=false;p.jumpBuffer=0;p.usedJump=p.jump;}
export function pausePlayer(p:Player,expected:number,now:number){if(p.connection!==expected||p.away)return false;fence(p,now);p.away=true;p.seen=now;return true;}
export function resumePlayer(p:Player,expected:number,now:number){if(p.connection===expected||p.away&&expected===p.connection-1){fence(p,now);p.away=false;p.seen=now;return true;}return false;}
export function placeAtCheckpoint(p:Player,room:Room){
  if(!room.checkpoint)return;
  p.x=(room.level==="factory"?690:room.level==="boss"?190:room.level==="castle"?850:room.level==="practice"?242:666)+p.slot*38;p.y=room.level==="practice"?348:420;p.invulnerable=120;
}
function park(p:Player,room:Room,now:number){fence(p,now);p.riding=false;p.grounded=true;p.vy=0;p.x=88+p.slot*65;p.y=420;placeAtCheckpoint(p,room);}
export function releaseSeat(room:Room,slot:number,now:number){
  cancelBossAttempt(room);releaseFactorySeat(room,slot);
  if(room.lift.operator===slot||room.lift.rider===slot){const rider=room.lift.rider===null?null:room.players[room.lift.rider];if(rider&&rider.slot!==slot)park(rider,room,now);room.lift={y:460,rider:null,operator:null,trips:room.lift.trips};}
  if(room.ferry.rider===slot)room.ferry.rider=null;
  room.players[slot]=null;if(room.saveRefs)room.saveRefs[slot]=null;room.nextReady[slot]=false;room.rescue=[0,0];
  if(!room.open)room.charge=0;
  if(room.leverSlot===slot&&!room.bridgeOpened){room.leverProgress=0;room.leverSlot=null;}
  for(let i=0;i<2;i++)if(room.castleSlots[i]===slot&&!(i===0?room.castleUpper:room.castleLower)){room.castleSlots[i]=null;room.castleProgress[i]=0;}
}
export function expireSeats(room:Room,now:number){for(let i=0;i<2;i++){const p=room.players[i];if(p&&now-p.seen>=RECONNECT_MS)releaseSeat(room,i,now);}}
