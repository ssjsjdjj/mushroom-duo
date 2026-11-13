"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {nextLevel} from "../lib/adventure";
import {parseSaveTicket,type SaveTicket} from "../lib/save";
import {readSaveTickets,writeSaveTicket,forgetSavedRun,saveStorageKey} from "../lib/save-store";
import type {useDuoConnection} from "./useDuoConnection";
type Connection=ReturnType<typeof useDuoConnection>;
export function useAdventureSave(net:Pick<Connection,"room"|"session"|"status"|"auth"|"command">,notify:(text:string)=>void){
  const {room,session,status,auth,command}=net;
  const [tickets,setTickets]=useState<SaveTicket[]>([]),[ready,setReady]=useState(false),[available,setAvailable]=useState(true),[saving,setSaving]=useState(false);
  const flight=useRef(false),enabled=useRef(false),stamp=useRef("");
  useEffect(()=>{const id=setTimeout(()=>{try{setTickets(readSaveTickets(localStorage));}catch{setAvailable(false);}enabled.current=true;setReady(true);},0);return()=>clearTimeout(id);},[]);
  const save=useCallback(async(manual=false)=>{
    if(!enabled.current||!session||status!=="connected"||flight.current)return;
    const token=session.token;flight.current=true;setSaving(true);
    try{const result=await command("save");if(auth.current?.token!==token)return;const next=parseSaveTicket(JSON.stringify(result.save));if(!next)throw Error("存档未保存，请重试");setTickets(current=>[next,...current.filter(t=>saveStorageKey(t)!==saveStorageKey(next))]);try{writeSaveTicket(localStorage,next);setAvailable(true);}catch{setAvailable(false);if(manual)notify("浏览器禁止保存，请允许本站本地存储后重试");return;}if(manual)notify("已保存，可在此浏览器继续冒险");}
    catch(e){if(manual&&auth.current?.token===token)notify((e as Error).message);}
    finally{flight.current=false;setSaving(false);}
  },[session,status,command,auth,notify]);
  const latestSave=useRef(save);useEffect(()=>{latestSave.current=save;},[save]);
  const finished=!!room?.won&&!nextLevel(room);
  const milestone=room?[room.runId,room.level,room.checkpoint,room.won].join(":"):"";
  const savedRuns=tickets.map(t=>t.runId).join(":");
  useEffect(()=>{
    if(!ready||!session||status!=="connected"||!milestone)return;
    if(finished){if(tickets.some(t=>t.runId===room?.runId)){setTickets(current=>current.filter(t=>t.runId!==room?.runId));try{forgetSavedRun(localStorage,room!.runId);}catch{setAvailable(false);}}return;}
    if(stamp.current===milestone)return;
    const id=setTimeout(()=>{stamp.current=milestone;void latestSave.current();},600);return()=>clearTimeout(id);
  },[ready,session,status,milestone,finished,savedRuns,room?.runId]);
  useEffect(()=>{if(!session||finished)return;const id=setInterval(()=>void latestSave.current(),15000);return()=>clearInterval(id);},[session,finished]);
  return {tickets:tickets.filter(t=>t.expiresAt>Date.now()),ready,available,saving,save,canSave:!!session&&status==="connected"&&!finished};
}
