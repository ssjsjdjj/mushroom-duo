import type {FactoryState} from "./factory.ts";
import {nextLevel} from "./adventure.ts";
import {createRoom,restoreCheckpoint,spawn,countCoins,type GameChoice,type Level,type Room,type StageResult} from "./game.ts";
export const SAVE_KEY="duo-adventure-save-v1";
export const SAVE_MS=7*24*60*60*1000;
export const validSaveKey=(key:unknown):key is string=>typeof key==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key);
export type SaveData=Pick<Room,"runId"|"level"|"campaign"|"journey"|"checkpoint"|"checkpointDefeated"|"coins"|"elapsed"|"rescues"|"wipes"|"castleSlots"|"results"> & {factory?:FactoryState};
export type SaveTicket={key:string;runId:string;mode:GameChoice;level:Level;checkpoint:boolean;updatedAt:number;expiresAt:number;completed:number;coins:number;slot:number};
export type SaveEnvelope={kind:"adventure-save-v1";ownerSlot:number;updatedAt:number;expiresAt:number;sourceCode:string;sourceRevision:number;data:SaveData;restored?:{code:string;token:string}};
export class SaveError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function projectSave(room:Room):SaveData{
  const next=room.won?nextLevel(room):null;
  if(room.won&&!next)throw new SaveError("这趟冒险已完成，成绩已记入本机手账");
  return {...(room.level==="factory"?{factory:structuredClone(room.factory)}:{}),runId:room.runId,level:next??room.level,campaign:room.campaign,journey:room.journey,checkpoint:next?false:room.checkpoint,checkpointDefeated:next?0:room.checkpointDefeated,coins:next?0:room.coins,elapsed:next?0:room.elapsed,rescues:next?0:room.rescues,wipes:next?0:room.wipes,castleSlots:next?[null,null]:[...room.castleSlots],results:room.results.filter(r=>next||r.level!==room.level).map(r=>({...r}))};
}
export function saveTicket(key:string,s:SaveEnvelope):SaveTicket{return {key,runId:s.data.runId,mode:s.data.campaign?(s.data.journey?"journey":"campaign"):s.data.level,level:s.data.level,checkpoint:s.data.checkpoint,updatedAt:s.updatedAt,expiresAt:s.expiresAt,completed:s.data.results.length,coins:s.data.results.reduce((n,r)=>n+r.coins,0)+countCoins(s.data.coins),slot:s.ownerSlot};}
export function parseSaveTicket(raw:string|null,now=Date.now()):SaveTicket|null{
  // The timestamps come from the server; a slow phone clock must not invalidate them.
  try{const t=JSON.parse(raw??"null");if(!t||!validSaveKey(t.key)||!validSaveKey(t.runId)||!["journey","campaign","practice","relay","castle","boss","factory"].includes(t.mode)||!["practice","relay","castle","boss","factory"].includes(t.level)||typeof t.checkpoint!=="boolean"||![0,1].includes(t.slot)||![t.updatedAt,t.expiresAt,t.completed,t.coins].every(Number.isSafeInteger)||t.updatedAt<0||t.expiresAt>8640000000000000||t.expiresAt<=now||t.expiresAt-t.updatedAt!==SAVE_MS||t.completed<0||t.completed>3||t.coins<0||t.coins>32)return null;return {key:t.key,runId:t.runId,mode:t.mode,level:t.level,checkpoint:t.checkpoint,updatedAt:t.updatedAt,expiresAt:t.expiresAt,completed:t.completed,coins:t.coins,slot:t.slot};}catch{return null;}
}
export function roomFromSave(code:string,token:string,key:string,save:SaveEnvelope,now:number):Room{
  const data=save.data,room=createRoom(code,token,now,data.level,data.campaign,data.journey);
  Object.assign(room,data,{results:data.results.map((r:StageResult)=>({...r})),castleSlots:[...data.castleSlots]});
  room.players=[null,null];room.players[save.ownerSlot]=spawn(token,save.ownerSlot,now);
  restoreCheckpoint(room,now);room.wipes=data.wipes;room.saveRefs[save.ownerSlot]=key;
  return room;
}
