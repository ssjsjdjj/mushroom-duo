import {createFactory,pushFactoryCrate,factorySolids,factoryInteraction,factoryDrop,clearFactoryHolds,resetFactory,factoryPowered,FACTORY_PIT,FACTORY_ENEMIES,type FactoryState} from "./factory.ts";
import {nextLevel} from "./adventure.ts";
import {LEVEL_ORDER,CASTLE_PLATFORMS,CASTLE_BRIDGE,CASTLE_PIT,CASTLE_SWITCHES,CASTLE_ENEMIES,FERRY,coinsFor,countCoins} from "./maps.ts";
import {createBoss,bossInteraction,advanceBoss,BOSS_PLATFORM,type BossState} from "./boss.ts";
import {playerOnline} from "./connection.ts";
export {LEVEL_ORDER,LEVEL_NAMES,coinsFor,countCoins} from "./maps.ts";
export const WORLD = { width: 1120, height: 560, ground: 460 };
export const PLATFORMS = [{x:200,y:388,w:120,h:22},{x:380,y:324,w:180,h:22},{x:670,y:388,w:140,h:22}];
export const PLATES = [{x:458,y:324,w:60},{x:710,y:388,w:60}];
export const ENEMIES = [{id:0,x:588,y:434,w:32,h:26},{id:1,x:854,y:434,w:32,h:26}];
export const PROTOCOL = 9;
export type Level = typeof LEVEL_ORDER[number]|"boss"|"factory";
export type GameChoice=Level|"campaign"|"journey";
export const RELAY_PLATFORMS=[{x:450,y:300,w:180,h:22}];
export const RELAY_PLATES=[{x:895,y:460,w:45},{x:955,y:460,w:40}];
export const RELAY_ENEMIES=[{id:0,x:600,y:434,w:32,h:26},{id:1,x:845,y:434,w:32,h:26}];
export const LIFT={x:330,w:90,bottom:460,top:300,speed:100};
export const POWER={x:185,y:460,w:66};
export const LEVER={x:558,y:300};
export const CHECKPOINT={x:690,y:460};
export const PIT={x:754,w:66};
export type WorldFrame={level:Level;bridgeOpened:boolean;checkpoint:boolean;liftY:number;castleUpper?:boolean;castleLower?:boolean;ferryX?:number;factoryCrateX?:number;factoryGateOpen?:boolean;factoryPeers?:Pick<Player,"slot"|"x"|"y"|"grounded"|"downed">[]};
export const PRACTICE_WORLD:WorldFrame={level:"practice",bridgeOpened:true,checkpoint:false,liftY:460};
export const STEP = 1 / 60;
export const BODY = {w:28,h:40};
export type InputFrame = {n:number;dir:number;jump:number;hold:boolean;use?:boolean;generation?:number};
export type Player = {token:string;slot:number;x:number;y:number;vx:number;vy:number;grounded:boolean;dir:number;jump:number;usedJump:number;seen:number;face:number;ack:number;credit:number;creditAt:number;coyote:number;jumpBuffer:number;jumpAge:number;hearts:number;invulnerable:number;stun:number;defeated:number;respawns:number;generation:number;downed:boolean;downTime:number;riding:boolean;interact:boolean;connection:number;away:boolean};
export type StageResult={level:Level;seconds:number;coins:number;totalCoins:number;rescues:number;wipes:number};
export type Room = {factory:FactoryState;saveRefs:(string|null)[];runId:string;journey:boolean;wonAt:number;boss:BossState;protocol:number;revision:number;code:string;players:(Player|null)[];at:number;open:boolean;charge:number;won:boolean;elapsed:number;epoch:number;defeated:number;level:Level;bridgeOpened:boolean;leverProgress:number;leverSlot:number|null;checkpoint:boolean;checkpointDefeated:number;lift:{y:number;rider:number|null;operator:number|null;trips:number};rescue:number[];rescues:number;wipeTime:number;wipes:number;campaign:boolean;results:StageResult[];nextReady:boolean[];coins:number;castleUpper:boolean;castleLower:boolean;castleSlots:(number|null)[];castleProgress:number[];ferry:{x:number;direction:number;dwell:number;rider:number|null;trips:number;destination?:number}};
export type PublicRoom = Omit<Room,"players"|"saveRefs"> & {players:((Omit<Player,"token"> & {online:boolean})|null)[]};
export function spawn(token:string,slot:number,now:number):Player {
  return {token,slot,x:88+slot*65,y:420,vx:0,vy:0,grounded:true,dir:0,jump:0,usedJump:0,seen:now,face:1,ack:0,credit:12,creditAt:now,coyote:.1,jumpBuffer:0,jumpAge:0,hearts:3,invulnerable:0,stun:0,defeated:0,respawns:0,generation:0,downed:false,downTime:0,riding:false,interact:false,connection:0,away:false};
}
export function createRoom(code:string,token:string,now:number,level:Level="relay",campaign=false,journey=false):Room {
  // Code-less scene previews are built at module load, outside a Worker request.
  return {factory:createFactory(),saveRefs:[null,null],runId:code?crypto.randomUUID():"preview",journey:campaign&&journey,wonAt:0,boss:createBoss(),protocol:PROTOCOL,revision:0,code,players:[spawn(token,0,now),null],at:now,open:false,charge:0,won:false,elapsed:0,epoch:0,defeated:0,level,bridgeOpened:false,leverProgress:0,leverSlot:null,checkpoint:false,checkpointDefeated:0,lift:{y:460,rider:null,operator:null,trips:0},rescue:[0,0],rescues:0,wipeTime:0,wipes:0,campaign,results:[],nextReady:[false,false],coins:0,castleUpper:false,castleLower:false,castleSlots:[null,null],castleProgress:[0,0],ferry:{x:FERRY.left,direction:1,dwell:FERRY.dwell,rider:null,trips:0}};
}
export function worldFrom(room:Room|PublicRoom):WorldFrame{return {level:room.level,bridgeOpened:room.bridgeOpened,checkpoint:room.checkpoint,liftY:room.lift.y,castleUpper:room.castleUpper,castleLower:room.castleLower,ferryX:room.ferry.x,...(room.level==="factory"?{factoryCrateX:room.factory.crateX,factoryGateOpen:factoryPowered(room),factoryPeers:room.players.filter((p):p is Player=>!!p).map(p=>({slot:p.slot,x:p.x,y:p.y,grounded:p.grounded,downed:p.downed}))}:{})};}
export function platesFor(level:Level){return level==="relay"?RELAY_PLATES:PLATES;}
export function enemiesFor(level:Level){return level==="factory"?FACTORY_ENEMIES:level==="boss"?[]:level==="castle"?CASTLE_ENEMIES:level==="relay"?RELAY_ENEMIES:ENEMIES;}
export function checkpointFor(level:Level){return level==="factory"?{x:730,y:460}:level==="boss"?{x:220,y:460}:level==="castle"?{x:890,y:460}:level==="relay"?CHECKPOINT:{x:290,y:388};}
export function active(room:Room,now:number) {return room.players.every(p=>playerOnline(p,now));}
export function plateOn(room:Room,i:number,now:number) {
  const p=room.players[i],a=platesFor(room.level)[i];
  return !!p&&!p.downed&&!p.riding&&playerOnline(p,now)&&p.grounded&&Math.abs(p.y+BODY.h-a.y)<3&&p.x+BODY.w>a.x+5&&p.x<a.x+a.w-5;
}
const approach=(value:number,target:number,amount:number)=>value<target?Math.min(value+amount,target):Math.max(value-amount,target);
function respawn(p:Player,world:WorldFrame) {
  p.x=88+p.slot*65;p.y=420;p.vx=0;p.vy=0;p.hearts=3;p.invulnerable=90;p.stun=0;p.grounded=true;p.coyote=.1;p.jumpBuffer=0;p.jumpAge=0;p.respawns++;
  if(world.checkpoint){p.x=242+p.slot*38;p.y=348;}
}
export function downPlayer(p:Player,world:WorldFrame){
  p.downed=true;p.downTime=0;p.hearts=0;p.riding=false;p.interact=false;p.vx=0;p.vy=0;p.grounded=false;p.jumpBuffer=0;p.coyote=0;p.generation++;
  const pit=world.level==="factory"?FACTORY_PIT:world.level==="boss"?{x:-100,w:0}:world.level==="castle"?CASTLE_PIT:PIT;
  p.x=Math.max(35,Math.min(1050,p.x));if(p.x+BODY.w>pit.x&&p.x<pit.x+pit.w)p.x=pit.x-48;
  p.y=402;
}
function restorePlayer(p:Player,checkpoint:boolean,inPlace=false,level:Level="relay"){
  const base=level==="factory"?690:level==="boss"?190:level==="castle"?850:level==="practice"?242:666;
  p.x=inPlace?p.x:checkpoint?base+p.slot*38:88+p.slot*65;p.y=level==="practice"&&checkpoint&&!inPlace?348:420;p.vx=0;p.vy=0;p.hearts=3;p.invulnerable=120;p.stun=0;p.grounded=true;p.coyote=.1;p.jumpBuffer=0;p.jumpAge=0;p.downTime=0;p.downed=false;p.riding=false;p.interact=false;p.generation++;p.respawns++;
}
// Every movement, ceiling hit, stomp and damage calculation uses the same fixed step.
export function stepPlayer(p:Player,frame:InputFrame,open:boolean,defeated=0,world:WorldFrame=PRACTICE_WORLD) {
  if(p.downed||p.riding){
    p.interact=false;p.dir=frame.dir;p.jump=frame.jump;p.usedJump=frame.jump;p.ack=frame.n;
    if(p.riding&&world.level==="castle"){
      const ferryX=world.ferryX??FERRY.left;
      if(ferryX>=FERRY.right-.01&&frame.dir>0){p.x=834;p.riding=false;p.y=420;p.grounded=true;p.generation++;}
      else if(ferryX<=FERRY.left+.01&&frame.dir<0){p.x=530;p.riding=false;p.y=420;p.grounded=true;p.generation++;}
    }else if(p.riding&&world.liftY<=LIFT.top+.01&&frame.dir>0){p.x=Math.min(474,p.x+240*STEP);if(p.x>=474){p.riding=false;p.y=260;p.grounded=true;p.generation++;}}
    return;
  }
  if(world.level==="factory")pushFactoryCrate(p,frame,world,STEP);
  p.interact=frame.use===true;
  p.dir=frame.dir;p.jump=frame.jump;p.invulnerable=Math.max(0,p.invulnerable-1);
  if(p.stun>0)p.stun--;
  else {
    const accel=p.dir?(p.grounded?2300:1600):(p.grounded?3000:1800);
    p.vx=approach(p.vx,p.dir*240,accel*STEP);
  }
  if(p.dir)p.face=p.dir;
  if(p.jump>p.usedJump){p.jumpBuffer=.13;p.usedJump=p.jump;}
  if(p.jumpBuffer>0&&(p.grounded||p.coyote>0)&&p.stun===0) {p.vy=-585;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumpAge=0;}
  p.jumpAge+=STEP;
  if(frame.hold===false&&p.jumpAge>=.07&&p.vy<-280)p.vy=-280;
  p.jumpBuffer=Math.max(0,p.jumpBuffer-STEP);
  p.coyote=p.grounded?.1:Math.max(0,p.coyote-STEP);
  const relay=world.level!=="practice";
  const solids=world.level==="factory"?factorySolids(world,open):world.level==="boss"?[BOSS_PLATFORM,...(open?[]:[{x:1018,y:300,w:40,h:160}]),{x:0,y:460,w:1120,h:100}]:world.level==="castle"?[...CASTLE_PLATFORMS,...(world.castleLower?[CASTLE_BRIDGE]:[]),...(world.castleUpper?[]:[{x:515,y:322,w:22,h:138}]),...(open?[]:[{x:1018,y:300,w:40,h:160}]),{x:0,y:460,w:580,h:100},{x:790,y:460,w:330,h:100},{x:world.ferryX??560,y:460,w:90,h:12}]:relay?[...RELAY_PLATFORMS,...(world.bridgeOpened?[]:[{x:438,y:322,w:18,h:138}]),...(open?[]:[{x:1018,y:300,w:40,h:160}]),{x:0,y:460,w:PIT.x,h:100},{x:PIT.x+PIT.w,y:460,w:1120-PIT.x-PIT.w,h:100}]:[...PLATFORMS,...(open?[]:[{x:948,y:300,w:50,h:160}]),{x:0,y:460,w:1120,h:100}];
  const oldX=p.x,oldY=p.y,oldBottom=p.y+BODY.h;
  let x=Math.max(12,Math.min(WORLD.width-BODY.w-12,p.x+p.vx*STEP));
  for(const s of solids)if(p.y+BODY.h>s.y+.001&&p.y<s.y+s.h-.001) {
    if(p.vx>0&&oldX+BODY.w<=s.x+.001&&x+BODY.w>s.x){x=Math.min(x,s.x-BODY.w);p.vx=0;}
    else if(p.vx<0&&oldX>=s.x+s.w-.001&&x<s.x+s.w){x=Math.max(x,s.x+s.w);p.vx=0;}
  }
  p.x=x;p.vy=Math.min(800,p.vy+(p.vy<0?1550:2050)*STEP);
  let y=p.y+p.vy*STEP;p.grounded=false;
  for(const s of solids)if(p.x+BODY.w>s.x+.001&&p.x<s.x+s.w-.001) {
    if(p.vy>=0&&oldBottom<=s.y+.001&&y+BODY.h>=s.y){y=Math.min(y,s.y-BODY.h);p.vy=0;p.grounded=true;}
    else if(p.vy<0&&oldY>=s.y+s.h-.001&&y<s.y+s.h){y=Math.max(y,s.y+s.h);p.vy=0;p.jumpBuffer=0;}
  }
  p.y=y;
  for(const e of enemiesFor(world.level)) {
    if((defeated|p.defeated)&(1<<e.id))continue;
    const overlap=p.x+BODY.w>e.x+3&&p.x<e.x+e.w-3;
    if(overlap&&p.vy>0&&oldBottom<=e.y+7&&p.y+BODY.h>=e.y&&p.y<e.y+e.h) {
      p.y=e.y-BODY.h;p.vy=frame.hold===false?-370:-470;p.grounded=false;p.coyote=0;p.jumpAge=0;p.jumpBuffer=0;p.defeated|=1<<e.id;
    }else if(overlap&&p.y+BODY.h>e.y+3&&p.y<e.y+e.h&&p.invulnerable===0) {
      p.hearts--;p.invulnerable=90;p.stun=12;p.vx=p.x+BODY.w/2<e.x+e.w/2?-230:230;p.vy=-230;p.grounded=false;p.coyote=0;p.jumpBuffer=0;
      if(p.hearts<=0){if(relay)downPlayer(p,world);else respawn(p,world);}
    }
  }
  if(p.y>WORLD.height+40){if(relay)downPlayer(p,world);else respawn(p,world);}
  p.ack=frame.n;
}
export function validFrames(value:unknown):value is InputFrame[] {
  return Array.isArray(value)&&value.length<=180&&value.every((v,i)=>v&&Number.isSafeInteger(v.n)&&v.n>0&&v.n<1e9&&[-1,0,1].includes(v.dir)&&Number.isSafeInteger(v.jump)&&v.jump>=0&&v.jump<1e9&&typeof v.hold==="boolean"&&typeof(v.use??false)==="boolean"&&Number.isSafeInteger(v.generation??0)&&(v.generation??0)>=0&&(v.generation??0)<1e9&&(i===0||v.n===value[i-1].n+1));
}
export function applyFrames(room:Room,slot:number,frames:InputFrame[],now:number) {
  const p=room.players[slot]!;
  p.credit=Math.min(120,p.credit+Math.max(0,now-p.creditAt)/1000/STEP);p.creditAt=now;
  for(const frame of frames) {
    if(frame.n<=p.ack)continue;
    if(frame.n!==p.ack+1||p.credit<1)break;
    if((frame.generation??0)!==p.generation)p.ack=frame.n;
    else if(active(room,now)&&!room.won){const previousBottom=p.y+BODY.h;const world=worldFrom(room);stepPlayer(p,frame,room.open,room.defeated,world);if(room.level==="factory"){room.factory.pushDistance+=Math.abs(world.factoryCrateX!-room.factory.crateX);room.factory.crateX=world.factoryCrateX!;}room.defeated|=p.defeated;collectCoins(room,p);if(room.level==="factory"){factoryInteraction(room,slot,frame,STEP);activateCheckpoint(room,p);rescuePartner(room,slot,frame);}else if(room.level==="relay")relayInteraction(room,slot,frame,now);else if(room.level==="castle")castleInteraction(room,slot,frame);else if(room.level==="boss"){bossInteraction(room,slot,frame,previousBottom);activateCheckpoint(room,p);rescuePartner(room,slot,frame);}else activateCheckpoint(room,p);}
    else p.ack=frame.n;
    p.credit-=1;
  }
  if(!room.open&&!(plateOn(room,0,now)&&plateOn(room,1,now)))room.charge=0;
  if(active(room,now)&&room.open&&room.players.every(v=>v&&!v.downed&&v.x>(room.level!=="practice"?1060:1000))){room.won=true;room.wonAt=now;captureResult(room);}
}
export function advance(room:Room,now:number) {
  const dt=Math.max(0,(now-room.at)/1000);
  if(active(room,now)&&!room.won) {
    room.elapsed+=dt;
    if(room.level==="factory"){factoryDrop(room);recoverTeam(room,dt,now);}else if(room.level==="relay")advanceRelay(room,dt,now);
    else if(room.level==="castle")advanceCastle(room,dt,now);
    else if(room.level==="boss"){advanceBoss(room,dt);recoverTeam(room,dt,now);}
    if(!room.open&&room.level!=="castle"&&room.level!=="boss"&&room.level!=="factory") {
      room.charge=(room.level!=="relay"||(room.bridgeOpened&&room.checkpoint))&&plateOn(room,0,now)&&plateOn(room,1,now)?Math.min(1,room.charge+dt):0;
      if(room.charge>=1)room.open=true;
    }
  }else if(!room.open){room.charge=0;room.rescue=[0,0];room.leverProgress=room.bridgeOpened?1:0;}
  if(room.level==="factory"&&!active(room,now))clearFactoryHolds(room.factory);
  room.at=now;
}
export function snapshot(room:Room,now:number):PublicRoom {
  const {saveRefs,...safeRoom}=room;
  return {...safeRoom,boss:{...room.boss,hits:room.boss.hits.map(hit=>({...hit}))},players:room.players.map(p=>{if(!p)return null;const {token,...safe}=p;return {...safe,online:playerOnline(p,now)};})};
}
export function restart(room:Room,now:number) {
  const saveRefs=room.saveRefs??[null,null],players=room.players,epoch=room.epoch+1,campaign=room.campaign??false,journey=room.journey??false,runId=campaign?(room.runId??crypto.randomUUID()):crypto.randomUUID(),results=(room.results??[]).filter(r=>r.level!==room.level);Object.assign(room,createRoom(room.code,players[0]?.token??"",now,room.level??"practice",campaign,journey));room.saveRefs=saveRefs;room.runId=runId;room.players=players.map((p,i)=>p?{...spawn(p.token,i,now),seen:p.seen,connection:p.connection??0,away:p.away??false}:null);room.epoch=epoch;room.results=results;
}
export function upgradeRoom(room:Room,now:number) {room.saveRefs??=[null,null];room.factory??=createFactory();if(room.protocol===8)room.protocol=PROTOCOL;if(room.protocol!==PROTOCOL){room.level=["practice","relay","castle","boss","factory"].includes(room.level)?room.level:"practice";restart(room,now);room.revision=0;}}

export function onPower(p:Player|null){return !!p&&!p.downed&&!p.riding&&p.grounded&&Math.abs(p.y+BODY.h-460)<2&&p.x+BODY.w>POWER.x+8&&p.x<POWER.x+POWER.w-8;}
function tryBoard(room:Room){
  if(room.lift.rider!==null||room.lift.y!==LIFT.bottom||room.bridgeOpened)return;
  for(let i=0;i<2;i++){const operator=room.players[i],rider=room.players[1-i];
    if(onPower(operator)&&rider&&!rider.downed&&!rider.riding&&rider.grounded&&Math.abs(rider.y+BODY.h-460)<2&&rider.x>=LIFT.x+4&&rider.x+BODY.w<=LIFT.x+LIFT.w-4){room.lift.operator=i;room.lift.rider=1-i;rider.riding=true;rider.interact=false;rider.x=LIFT.x+(LIFT.w-BODY.w)/2;rider.y=room.lift.y-BODY.h;rider.vx=0;rider.vy=0;rider.generation++;return;}
  }
}
function relayInteraction(room:Room,slot:number,frame:InputFrame,now:number){
  const p=room.players[slot]!;
  if(room.lift.rider===slot&&!p.riding){room.lift.rider=null;room.lift.operator=null;room.lift.trips++;}
  tryBoard(room);
  if(p.downed||p.riding){if(room.leverSlot===slot&&!room.bridgeOpened){room.leverProgress=0;room.leverSlot=null;}return;}
  const atLever=p.grounded&&Math.abs(p.y+BODY.h-LEVER.y)<3&&Math.abs(p.x+BODY.w/2-LEVER.x)<42;
  if(!room.bridgeOpened&&atLever&&frame.use){room.leverSlot=slot;room.leverProgress=Math.min(1,room.leverProgress+STEP/.5);if(room.leverProgress>=1)room.bridgeOpened=true;}
  else if(!room.bridgeOpened&&room.leverSlot===slot){room.leverProgress=0;room.leverSlot=null;}
  if(room.bridgeOpened&&!room.checkpoint&&p.grounded&&Math.abs(p.y+BODY.h-460)<2&&Math.abs(p.x+BODY.w/2-CHECKPOINT.x)<36){room.checkpoint=true;room.checkpointDefeated=room.defeated;}
  const target=room.players[1-slot];
  if(target?.downed){
    const near=Math.abs(p.x-target.x)<72&&Math.abs(p.y-target.y)<70;
    room.rescue[1-slot]=frame.use&&near&&p.stun===0?Math.min(1,room.rescue[1-slot]+STEP):0;
    if(room.rescue[1-slot]>=1){restorePlayer(target,room.checkpoint,true,room.level);room.rescue[1-slot]=0;room.rescues++;}
  }
}
function advanceRelay(room:Room,dt:number,now:number){
  if(room.lift.rider!==null){
    const rider=room.players[room.lift.rider],operator=room.players[room.lift.operator!];
    if(!rider||rider.downed){room.lift.rider=null;room.lift.operator=null;}
    else if(onPower(operator)){room.lift.y=Math.max(LIFT.top,room.lift.y-LIFT.speed*dt);rider.y=room.lift.y-BODY.h;}
  }else if(room.lift.y<LIFT.bottom)room.lift.y=Math.min(LIFT.bottom,room.lift.y+LIFT.speed*dt);
  tryBoard(room);
  recoverTeam(room,dt,now);
}
function recoverTeam(room:Room,dt:number,now:number){
  const down=room.players.filter(p=>p?.downed);
  if(down.length===2){room.wipeTime+=dt;if(room.wipeTime>=1)restoreCheckpoint(room,now);}
  else{room.wipeTime=0;for(const p of down){p!.downTime+=dt;if(p!.downTime>=15){restorePlayer(p!,room.checkpoint,false,room.level);room.rescue[p!.slot]=0;}}}
}
export function restoreCheckpoint(room:Room,now:number){
  const checkpoint=room.checkpoint,mask=checkpoint?room.checkpointDefeated:0,elapsed=room.elapsed,rescues=room.rescues,wipes=room.wipes+1;
  room.players=room.players.map((previous,i)=>{if(!previous)return null;const p={...spawn(previous.token,i,now),seen:previous.seen,connection:previous.connection,away:previous.away};if(checkpoint){p.x=(room.level==="factory"?690:room.level==="boss"?190:room.level==="castle"?850:room.level==="practice"?242:666)+i*38;p.y=room.level==="practice"?348:420;p.invulnerable=120;}return p;});
  room.boss=createBoss();room.wonAt=0;room.at=now;room.epoch++;room.open=false;room.charge=0;room.won=false;room.defeated=mask;room.bridgeOpened=checkpoint;room.leverProgress=checkpoint?1:0;room.leverSlot=null;room.lift={y:460,rider:null,operator:null,trips:checkpoint?1:0};room.rescue=[0,0];room.wipeTime=0;room.wipes=wipes;room.elapsed=elapsed;room.rescues=rescues;
  room.nextReady=[false,false];room.results=room.results.filter(r=>r.level!==room.level);
  if(room.level==="factory")resetFactory(room);
  if(room.level==="castle"){room.castleUpper=checkpoint;room.castleLower=checkpoint;room.castleProgress=checkpoint?[1,1]:[0,0];if(!checkpoint)room.castleSlots=[null,null];room.ferry={x:FERRY.left,direction:1,dwell:FERRY.dwell,rider:null,trips:checkpoint?1:0};room.open=checkpoint;}
}

function collectCoins(room:Room,p:Player,fromX=p.x){if(p.downed)return;const left=Math.min(fromX,p.x),right=Math.max(fromX,p.x)+BODY.w;coinsFor(room.level).forEach((coin,i)=>{if(!(room.coins&(1<<i))&&right>coin.x-10&&left<coin.x+10&&p.y+BODY.h>coin.y-12&&p.y<coin.y+12)room.coins|=1<<i;});}
function activateCheckpoint(room:Room,p:Player){if(room.level==="factory"&&(room.factory.transfers!==1||!room.players.every(q=>q&&!q.downed&&q.x>650)))return;const flag=checkpointFor(room.level);if(!room.checkpoint&&p.grounded&&Math.abs(p.y+BODY.h-flag.y)<3&&Math.abs(p.x+14-flag.x)<36){room.checkpoint=true;room.checkpointDefeated=room.defeated;}}
function captureResult(room:Room){if(!room.results.some(r=>r.level===room.level))room.results.push({level:room.level,seconds:Math.floor(room.elapsed),coins:countCoins(room.coins),totalCoins:coinsFor(room.level).length,rescues:room.rescues,wipes:room.wipes});}
export function readyNext(room:Room,slot:number,now:number){
  const level=nextLevel(room);if(!room.campaign||!room.won||!level)return false;
  room.nextReady[slot]=true;if(!room.nextReady.every(Boolean)||!active(room,now))return false;
  captureResult(room);const saveRefs=room.saveRefs??[null,null],results=room.results,journey=room.journey,runId=room.runId,players=room.players,epoch=room.epoch+1;
  Object.assign(room,createRoom(room.code,players[0]?.token??"",now,level,true,journey));room.saveRefs=saveRefs;room.runId=runId;room.players=players.map((p,i)=>p?{...spawn(p.token,i,now),seen:p.seen,connection:p.connection,away:p.away}:null);room.results=results;room.epoch=epoch;return true;
}
export function restartAdventure(room:Room,now:number){room.level="practice";room.campaign=true;room.runId=crypto.randomUUID();room.results=[];restart(room,now);}
export function readyReplay(room:Room,slot:number,now:number){
  if(!room.won||nextLevel(room))return false;
  room.nextReady[slot]=true;if(!room.nextReady.every(Boolean)||!active(room,now))return false;
  if(room.campaign)restartAdventure(room,now);else restart(room,now);return true;
}
function boardFerry(room:Room){
  if(room.ferry.rider!==null||!room.castleUpper)return;
  for(const p of room.players){if(p&&!p.downed&&!p.riding&&!(p.x>=790&&p.dir>=0)&&p.grounded&&Math.abs(p.y+40-460)<2&&p.x>=room.ferry.x+4&&p.x+28<=room.ferry.x+86){room.ferry.destination=p.x<790?FERRY.right:FERRY.left;room.ferry.rider=p.slot;p.riding=true;p.x=room.ferry.x+31;p.y=420;p.vx=0;p.vy=0;p.interact=false;p.generation++;break;}}
}
function castleInteraction(room:Room,slot:number,frame:InputFrame){
  const p=room.players[slot]!;
  if(room.ferry.rider===slot&&!p.riding){room.ferry.rider=null;room.ferry.trips++;}
  boardFerry(room);if(p.downed||p.riding)return;
  for(let i=0;i<2;i++){const sw=CASTLE_SWITCHES[i],opened=i===0?room.castleUpper:room.castleLower;
    if(opened)continue;const eligible=i===0||room.castleUpper&&room.castleSlots[0]!==slot;
    const near=p.grounded&&Math.abs(p.y+40-sw.y)<3&&Math.abs(p.x+14-sw.x)<38;
    if(eligible&&near&&frame.use){room.castleSlots[i]=slot;room.castleProgress[i]=Math.min(1,room.castleProgress[i]+STEP/.5);if(room.castleProgress[i]>=1){if(i===0)room.castleUpper=true;else room.castleLower=true;}}
    else if(room.castleSlots[i]===slot){room.castleProgress[i]=0;room.castleSlots[i]=null;}
  }
  room.open=room.castleUpper&&room.castleLower;
  if(room.open)activateCheckpoint(room,p);
  const target=room.players[1-slot];if(target?.downed){const near=Math.abs(p.x-target.x)<72&&Math.abs(p.y-target.y)<70;room.rescue[1-slot]=frame.use&&near&&p.stun===0?Math.min(1,room.rescue[1-slot]+STEP):0;if(room.rescue[1-slot]>=1){restorePlayer(target,room.checkpoint,true,room.level);room.rescue[1-slot]=0;room.rescues++;}}
}
function advanceCastle(room:Room,dt:number,now:number){
  const f=room.ferry;
  if(room.castleUpper){let remaining=dt;while(remaining>0){if(f.dwell>0){const used=Math.min(remaining,f.dwell);f.dwell-=used;remaining-=used;}else{const target=f.direction>0?FERRY.right:FERRY.left,seconds=Math.abs(target-f.x)/FERRY.speed,used=Math.min(remaining,seconds);f.x+=f.direction*FERRY.speed*used;remaining-=used;if(f.rider!==null){const p=room.players[f.rider];if(p?.riding){const fromX=p.x;p.x=f.x+31;p.y=420;collectCoins(room,p,fromX);}}if(used>=seconds-1e-9){f.x=target;f.direction*=-1;f.dwell=FERRY.dwell;dockFerry(room,target);}}}
    if(f.rider!==null){const p=room.players[f.rider];if(p?.riding){p.x=f.x+31;p.y=420;collectCoins(room,p);}else f.rider=null;}boardFerry(room);
  }
  recoverTeam(room,dt,now);
}
function dockFerry(room:Room,bank:number){
  const f=room.ferry;if(f.rider===null||(f.destination??FERRY.right)!==bank)return;
  const p=room.players[f.rider];if(p?.riding){p.riding=false;p.x=bank===FERRY.right?834:530;p.y=420;p.vx=0;p.vy=0;p.dir=0;p.grounded=true;p.generation++;f.trips++;}f.rider=null;
}

function rescuePartner(room:Room,slot:number,frame:InputFrame){const p=room.players[slot]!,target=room.players[1-slot];if(p.downed||!target?.downed)return;const near=Math.abs(p.x-target.x)<72&&Math.abs(p.y-target.y)<70;room.rescue[1-slot]=frame.use&&near&&p.stun===0?Math.min(1,room.rescue[1-slot]+STEP):0;if(room.rescue[1-slot]>=1){restorePlayer(target,room.checkpoint,true,room.level);room.rescue[1-slot]=0;room.rescues++;}}
