import {nextLevel} from "../../lib/adventure";
import { env } from "cloudflare:workers";
import { advance, applyFrames, createRoom, restart, restartAdventure, readyNext, readyReplay, restoreCheckpoint, snapshot, spawn, upgradeRoom, validFrames, PROTOCOL, active, type Room, type InputFrame, type Level } from "../../lib/game";
import {expireSeats,pausePlayer,resumePlayer,releaseSeat,placeAtCheckpoint} from "../../lib/connection";
import {projectSave,SaveError,type SaveData} from "../../lib/save";
import {writeSave,restoreSave} from "../../lib/save-server";
export const dynamic = "force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
class GameError extends Error {constructor(message:string,public status=400){super(message);}}
function database(){if(!env.DB)throw new GameError("房间服务尚未连接，请稍后再试",503);return env.DB;}
function codeString(v:unknown){return typeof v==="string"?v.toUpperCase().replace(/\s/g,""):"";}
export async function POST(request:Request){
  try{
    const db=database();let body:Record<string,unknown>;
    try{body=await request.json() as Record<string,unknown>;}catch{throw new GameError("请求格式不正确");}
    if(!body||typeof body!=="object")throw new GameError("请求格式不正确");
    const action=body.action;let now=Date.now();
    if(action==="input"&&(body.protocol!==PROTOCOL||!validFrames(body.frames)))throw new GameError("试玩版已更新，请刷新页面后重试",409);
    if(action==="restore"){const result=await restoreSave(db,body.saveKey,now);return reply({...result,room:snapshot(result.room,now)});}
    if(action==="create"){
      const choice=body.level??"campaign";if(!["journey","campaign","practice","relay","castle","boss","factory"].includes(choice as string))throw new GameError("请选择一个有效关卡");
      for(let tries=0;tries<5;tries++){
        const bytes=crypto.getRandomValues(new Uint32Array(1));const code=String(100000+bytes[0]%900000);const token=crypto.randomUUID();const room=createRoom(code,token,now,choice==="campaign"||choice==="journey"?"practice":choice as Level,choice==="campaign"||choice==="journey",choice==="journey");
        const result=await db.prepare("INSERT OR IGNORE INTO duo_rooms (code,state,version,expires) VALUES (?,?,0,?)").bind(code,JSON.stringify(room),now+3600000).run();
        if(result.meta.changes)return reply({room:snapshot(room,now),token,slot:0});
      }throw new GameError("房间繁忙，请重试",503);
    }
    const code=codeString(body.code);if(!/^\d{6}$/.test(code))throw new GameError("请输入6位数字房间码");
    for(let attempt=0;attempt<10;attempt++){
      const row=await db.prepare("SELECT state,version,expires FROM duo_rooms WHERE code=?").bind(code).first<{state:string;version:number;expires:number}>();
      if(!row||row.expires<now)throw new GameError("房间不存在或已过期，请重新创建",404);
      const room=JSON.parse(row.state) as Room;now=Math.max(Date.now(),room.at);upgradeRoom(room,now);expireSeats(room,now);advance(room,now);
      let token=typeof body.token==="string"?body.token:"";let slot=room.players.findIndex(p=>p?.token===token);
      if(action==="join"){
        if(slot<0){if(token)throw new GameError("角色保留时间已结束，请重新加入本房间",401);slot=room.players.findIndex(p=>!p);if(slot<0)throw new GameError("两位搭档的角色仍在房间中，请等待重连或退出后再加入",409);token=crypto.randomUUID();room.players[slot]=spawn(token,slot,now);placeAtCheckpoint(room.players[slot]!,room);room.at=now;}
      }else if(slot<0)throw new GameError("连接身份已失效，请重新加入房间",401);
      const player=room.players[slot]!,connection=body.connection??0;
      const stale=body.connection!==undefined&&body.connection!==player.connection||body.epoch!==undefined&&body.epoch!==room.epoch;
      let saving:SaveData|undefined;
      if(action==="save"&&(stale||!Number.isSafeInteger(body.connection)||!Number.isSafeInteger(body.epoch)||player.away))throw new GameError("请等连接恢复后再保存",409);
      if(action==="resume"){
        if(!Number.isSafeInteger(connection)||(connection as number)<0)throw new GameError("连接信息不正确，请重新加入");
        resumePlayer(player,connection as number,now);
      }else if(action==="away"){
        if(!stale)pausePlayer(player,connection as number,now);
      }else if(action==="input"){
        if(connection===player.connection&&!player.away){player.seen=now;if(body.epoch===room.epoch)applyFrames(room,slot,body.frames as InputFrame[],now);}
      }else if(action==="poll"||action==="join"){if(body.connection===undefined||connection===player.connection)player.seen=now;}
      else if(stale){/* A delayed command from an older connection only receives the current snapshot. */}
      else if(action==="save"){player.seen=now;saving=projectSave(room);room.saveRefs[slot]??=crypto.randomUUID();}
      else if(action==="restart"){player.seen=now;restart(room,now);}
      else if(action==="restart-all"){if(!room.campaign)throw new GameError("当前不是连续冒险房间");restartAdventure(room,now);}
      else if(action==="again"){if(!Number.isSafeInteger(body.epoch))throw new GameError("请刷新当前结算状态");if(!room.won||nextLevel(room))throw new GameError("先共同完成当前冒险，再准备下一趟");if(!active(room,now))throw new GameError("等待搭档回来后一起出发");player.seen=now;readyReplay(room,slot,now);}
      else if(action==="next"){
        if(!Number.isSafeInteger(body.epoch))throw new GameError("请刷新当前关卡状态");
        player.seen=now;if(body.epoch===room.epoch){if(!room.campaign||!room.won||!nextLevel(room))throw new GameError("两人先完成当前关卡，再前往下一关");if(!active(room,now))throw new GameError("等待搭档重新连接后一起出发");readyNext(room,slot,now);}
      }
      else if(action==="factory-reset"){if(room.level!=="factory"||room.won)throw new GameError("仅在进行中的工厂关可复位箱子");const resets=room.factory.resets+1;restoreCheckpoint(room,now);room.factory.resets=resets;}
      else if(action==="checkpoint"){if(!room.checkpoint)throw new GameError("先激活检查点，再从这里重新出发");restoreCheckpoint(room,now);}
      else if(action==="leave")releaseSeat(room,slot,now);
      else throw new GameError("不支持的操作");
      room.revision=row.version+1;
      const result=await db.prepare("UPDATE duo_rooms SET state=?,version=version+1,expires=? WHERE code=? AND version=?").bind(JSON.stringify(room),now+3600000,code,row.version).run();
      if(result.meta.changes){const save=saving?await writeSave(db,room.saveRefs[slot]!,room,slot,saving,now):undefined;return reply({room:snapshot(room,now),slot,...(action==="join"?{token}:{}),...(save?{save}:{})});}
    }throw new GameError("同步繁忙，正在重新连接",503);
  }catch(error){return reply({error:error instanceof GameError||error instanceof SaveError?error.message:"房间服务暂时不可用，请重试"},error instanceof GameError||error instanceof SaveError?error.status:500);}
}
