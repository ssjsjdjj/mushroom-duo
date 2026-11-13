import type {PublicRoom} from "./game.ts";
import {coinsFor} from "./maps.ts";
import {finalStage,JOURNEY_ORDER,routeFor} from "./adventure.ts";
export const MODES=["journey","campaign","boss","practice","relay","castle","factory"] as const;
export type RecordMode=typeof MODES[number];
export const MODE_NAMES:Record<RecordMode,string>={journey:"四关完整冒险",campaign:"三关冒险",boss:"双人 Boss",practice:"草地集合",relay:"地下接力",castle:"城堡会合",factory:"机关工厂"};
export const MODE_COINS:Record<RecordMode,number>={journey:JOURNEY_ORDER.reduce((n,l)=>n+coinsFor(l).length,0),campaign:24,boss:8,practice:8,relay:8,castle:8,factory:8};
export const BADGES=[
  {id:"first",name:"初次同行",description:"完成任意一次合作通关"},
  {id:"journey",name:"一路同行",description:"完成草地、地下、城堡和Boss四关完整冒险"},
  {id:"collector",name:"一枚不漏",description:"一次通关中收齐所选模式的全部金币"},
  {id:"rescue",name:"可靠搭档",description:"一次通关中成功救援队友"},
  {id:"steady",name:"一气呵成",description:"完成三关或四关冒险，未使用检查点重试"},
  {id:"boss",name:"默契破盾",description:"完成三次交替引诱与跳踩并通关Boss"},
] as const;
export type BadgeId=typeof BADGES[number]["id"];
export type RunRecord={id:string;mode:RecordMode;coins:number;totalCoins:number;seconds:number;rescues:number;wipes:number;at:number};
export type ModeStats={clears:number;bestSeconds:number|null;bestCoins:number|null;rescues:number};
export type Progress={version:1;stats:Record<RecordMode,ModeStats>;badges:BadgeId[];recent:RunRecord[];seen:string[];eligible:string[]};
export type Receipt={id:string;isNew:boolean;bestTime:boolean;bestCoins:boolean;badges:BadgeId[]};
const integer=(n:unknown,max=1e9):n is number=>typeof n==="number"&&Number.isSafeInteger(n)&&n>=0&&n<=max;
const identifier=(s:unknown):s is string=>typeof s==="string"&&s.length>0&&s.length<=80;
export function emptyProgress():Progress{return {version:1,stats:Object.fromEntries(MODES.map(mode=>[mode,{clears:0,bestSeconds:null,bestCoins:null,rescues:0}])) as Record<RecordMode,ModeStats>,badges:[],recent:[],seen:[],eligible:[]};}
function validRun(value:unknown):value is RunRecord{
  if(!value||typeof value!=="object")return false;const r=value as RunRecord;
  return identifier(r.id)&&MODES.includes(r.mode)&&r.totalCoins===MODE_COINS[r.mode]&&integer(r.coins,r.totalCoins)&&integer(r.seconds,1e7)&&integer(r.rescues)&&integer(r.wipes)&&typeof r.at==="number"&&Number.isFinite(r.at)&&r.at>0;
}
export function parseProgress(raw:string|null):Progress{
  try{
    if(!raw||raw.length>200000)return emptyProgress();const p=JSON.parse(raw) as Progress;
    if(p.version!==1||!p.stats||!Array.isArray(p.badges)||!Array.isArray(p.recent)||!Array.isArray(p.seen)||!Array.isArray(p.eligible))return emptyProgress();
    const result=emptyProgress();for(const mode of MODES){const s=p.stats[mode];if(mode==="factory"&&s===undefined)continue;if(!s||!integer(s.clears)||!integer(s.rescues)||!(s.bestSeconds===null||integer(s.bestSeconds,1e7))||!(s.bestCoins===null||integer(s.bestCoins,MODE_COINS[mode]))||s.clears>0&&(s.bestSeconds===null||s.bestCoins===null)||s.clears===0&&(s.bestSeconds!==null||s.bestCoins!==null))return emptyProgress();result.stats[mode]={clears:s.clears,bestSeconds:s.bestSeconds,bestCoins:s.bestCoins,rescues:s.rescues};}
    result.badges=[...new Set(p.badges.filter(id=>BADGES.some(b=>b.id===id)))];result.recent=p.recent.filter(validRun).slice(0,15).map(r=>({id:r.id,mode:r.mode,coins:r.coins,totalCoins:r.totalCoins,seconds:r.seconds,rescues:r.rescues,wipes:r.wipes,at:r.at}));result.seen=[...new Set(p.seen.filter(identifier))].slice(-256);result.eligible=[...new Set(p.eligible.filter(identifier))].slice(-8);return result;
  }catch{return emptyProgress();}
}
export function completedRun(room:PublicRoom):RunRecord|null{
  if(!room.won||room.journey&&!room.campaign||!finalStage(room)||!identifier(room.runId)||!Number.isFinite(room.wonAt)||room.wonAt<=0)return null;
  const mode:RecordMode=room.journey?"journey":room.campaign?"campaign":room.level,route=room.campaign?routeFor(room):[room.level];
  if(!Array.isArray(room.results)||room.results.length!==route.length)return null;
  for(let i=0;i<route.length;i++){const r=room.results[i];if(r.level!==route[i]||r.totalCoins!==coinsFor(r.level).length||!integer(r.coins,r.totalCoins)||!integer(r.seconds,1e7)||!integer(r.rescues)||!integer(r.wipes))return null;}
  if(room.level==="factory"&&(!room.factory?.unlocked||room.factory.transfers!==1||![0,1].includes(room.factory.finder!)||room.factory.deliveredBy!==1-room.factory.finder!))return null;
  if(room.level==="boss"&&(room.boss.hp!==0||room.boss.hits.length!==3||room.boss.hits.some((hit,i)=>![0,1].includes(hit.lurer)||![0,1].includes(hit.attacker)||hit.lurer===hit.attacker||i>0&&hit.lurer===room.boss.hits[i-1].lurer)))return null;
  return {id:room.runId,mode,coins:room.results.reduce((n,r)=>n+r.coins,0),totalCoins:MODE_COINS[mode],seconds:room.results.reduce((n,r)=>n+r.seconds,0),rescues:room.results.reduce((n,r)=>n+r.rescues,0),wipes:room.results.reduce((n,r)=>n+r.wipes,0),at:room.wonAt};
}
export function observeRun(progress:Progress,room:PublicRoom):{progress:Progress;receipt:Receipt|null}{
  if(!identifier(room.runId))return {progress,receipt:null};
  if(!room.won){if(progress.eligible.includes(room.runId)||progress.seen.includes(room.runId))return {progress,receipt:null};return {progress:{...progress,eligible:[...progress.eligible,room.runId].slice(-8)},receipt:null};}
  const run=completedRun(room);if(!run)return {progress,receipt:null};
  if(progress.seen.includes(run.id))return {progress,receipt:{id:run.id,isNew:false,bestTime:false,bestCoins:false,badges:[]}};
  if(!progress.eligible.includes(run.id))return {progress,receipt:null};
  const old=progress.stats[run.mode],bestTime=old.bestSeconds===null||run.seconds<old.bestSeconds,bestCoins=old.bestCoins===null||run.coins>old.bestCoins;
  const candidates:BadgeId[]=["first"];if(run.mode==="journey")candidates.push("journey");if(run.coins===run.totalCoins)candidates.push("collector");if(run.rescues>0)candidates.push("rescue");if((run.mode==="journey"||run.mode==="campaign")&&run.wipes===0)candidates.push("steady");if(run.mode==="journey"||run.mode==="boss")candidates.push("boss");const badges=candidates.filter(id=>!progress.badges.includes(id));
  return {progress:{...progress,stats:{...progress.stats,[run.mode]:{clears:old.clears+1,bestSeconds:bestTime?run.seconds:old.bestSeconds,bestCoins:bestCoins?run.coins:old.bestCoins,rescues:old.rescues+run.rescues}},badges:[...progress.badges,...badges],recent:[run,...progress.recent].slice(0,15),seen:[...progress.seen,run.id].slice(-256),eligible:progress.eligible.filter(id=>id!==run.id)},receipt:{id:run.id,isNew:true,bestTime,bestCoins,badges}};
}
