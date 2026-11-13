import {expireSeats,playerOnline,resumePlayer} from "./connection.ts";
import {upgradeRoom,type Room} from "./game.ts";
import {SAVE_MS,SaveError,roomFromSave,saveTicket,validSaveKey,type SaveData,type SaveEnvelope} from "./save.ts";
type Row={state:string;version:number;expires:number};
type DB={prepare:(sql:string)=>{bind:(...args:unknown[])=>{first:<T>()=>Promise<T|null>;run:()=>Promise<{meta:{changes?:number}}>}}};
const archiveCode=(key:string)=>"s_"+key;
async function read(db:DB,code:string){return db.prepare("SELECT state,version,expires FROM duo_rooms WHERE code=?").bind(code).first<Row>();}
async function insert(db:DB,code:string,value:unknown,expires:number){return (await db.prepare("INSERT OR IGNORE INTO duo_rooms (code,state,version,expires) VALUES (?,?,0,?)").bind(code,JSON.stringify(value),expires).run()).meta.changes;}
async function update(db:DB,code:string,value:unknown,expires:number,version:number){return (await db.prepare("UPDATE duo_rooms SET state=?,version=version+1,expires=? WHERE code=? AND version=?").bind(JSON.stringify(value),expires,code,version).run()).meta.changes;}
export async function writeSave(db:DB,key:string,room:Room,slot:number,data:SaveData,now:number){
  for(let i=0;i<12;i++){
    const row=await read(db,archiveCode(key)),previous=row?JSON.parse(row.state) as SaveEnvelope:null;
    if(previous?.restored&&previous.restored.code!==room.code)throw new SaveError("这份存档已在恢复房间继续，请使用恢复后的房间",409);
    if(previous?.sourceCode===room.code&&previous.sourceRevision>room.revision)return saveTicket(key,previous);
    const save:SaveEnvelope={kind:"adventure-save-v1",ownerSlot:slot,updatedAt:now,expiresAt:now+SAVE_MS,sourceCode:room.code,sourceRevision:room.revision,data,...(previous?.restored?{restored:previous.restored}:{})};
    if(row?await update(db,archiveCode(key),save,save.expiresAt,row.version):await insert(db,archiveCode(key),save,save.expiresAt))return saveTicket(key,save);
  }throw new SaveError("保存繁忙，请稍后重试",503);
}
// The archive claims one room before inserting it, so retried or concurrent restores share identities.
export async function restoreSave(db:DB,key:unknown,now:number){
  if(!validSaveKey(key))throw new SaveError("存档凭据不正确，请回首页重新选择");
  for(let i=0;i<20;i++){
    const row=await read(db,archiveCode(key));
    if(!row||row.expires<=now)throw new SaveError("存档已过期，请重新开始冒险",404);
    const save=JSON.parse(row.state) as SaveEnvelope;
    if(save.kind!=="adventure-save-v1"||save.expiresAt<=now||![0,1].includes(save.ownerSlot))throw new SaveError("存档不可用，请重新开始",404);
    if(!save.restored){
      const bytes=crypto.getRandomValues(new Uint32Array(1));
      const candidate=String(100000+bytes[0]%900000);
      if(await read(db,candidate))continue;
      const next={...save,restored:{code:candidate,token:crypto.randomUUID()}};
      await update(db,archiveCode(key),next,save.expiresAt,row.version);continue;
    }
    const {code,token}=save.restored,target=await read(db,code);
    if(!target){await insert(db,code,roomFromSave(code,token,key,save,now),now+3600000);continue;}
    const room=JSON.parse(target.state) as Room;upgradeRoom(room,now);expireSeats(room,now);
    if(target.expires>now&&room.runId===save.data.runId&&room.players[save.ownerSlot]?.token===token){
      const player=room.players[save.ownerSlot]!;
      // Re-entering a reserved offline role is a reconnect. Fence its queued input once;
      // retries while already online keep the same fence and identity.
      if(!playerOnline(player,now))resumePlayer(player,player.connection,now);
      else player.seen=now;
      room.revision=target.version+1;
      if(!await update(db,code,room,now+3600000,target.version))continue;
      return {room,token,slot:save.ownerSlot,save:saveTicket(key,save)};
    }
    const next={...save};delete next.restored;await update(db,archiveCode(key),next,save.expiresAt,row.version);
  }throw new SaveError("恢复繁忙，请重试；重复恢复会返回同一房间",503);
}
