import {SAVE_KEY,parseSaveTicket,type SaveTicket} from "./save.ts";
export const FACTORY_SAVE_KEY="duo-factory-save-v1";
type Storage={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void};
export const saveStorageKey=(ticket:Pick<SaveTicket,"mode">)=>ticket.mode==="factory"?FACTORY_SAVE_KEY:SAVE_KEY;
export function readSaveTickets(storage:Storage,now=Date.now()):SaveTicket[]{
  let original=parseSaveTicket(storage.getItem(SAVE_KEY),now),factory=parseSaveTicket(storage.getItem(FACTORY_SAVE_KEY),now);
  if(original?.mode==="factory"){
    if(!factory||original.updatedAt>factory.updatedAt)factory=original;
    storage.setItem(FACTORY_SAVE_KEY,JSON.stringify(factory));storage.removeItem(SAVE_KEY);original=null;
  }
  return [original,factory].filter((t):t is SaveTicket=>!!t).sort((a,b)=>b.updatedAt-a.updatedAt);
}
export function writeSaveTicket(storage:Storage,ticket:SaveTicket){storage.setItem(saveStorageKey(ticket),JSON.stringify(ticket));}
export function forgetSavedRun(storage:Storage,runId:string){for(const key of [SAVE_KEY,FACTORY_SAVE_KEY]){const ticket=parseSaveTicket(storage.getItem(key));if(ticket?.runId===runId)storage.removeItem(key);}}
