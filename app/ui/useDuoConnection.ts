"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from "react";
import {PROTOCOL,worldFrom,type GameChoice,type PublicRoom} from "../lib/game";
import {RECONNECT_MS,retryDelay} from "../lib/connection";
import {GameAudio,SoundTracker} from "../lib/audio";
import {parseSession,type Session} from "../lib/session";
import {Prediction} from "../lib/prediction";
import {Controls} from "../lib/controls";
import type {SaveTicket} from "../lib/save";
type Result={room:PublicRoom;slot:number;token?:string;error?:string;save?:SaveTicket};
type Status="connected"|"reconnecting"|"offline"|"paused"|"expired"|"update";
function browserOnline(){return navigator.onLine!==false;}
function forget(){try{sessionStorage.removeItem("duo-session");localStorage.removeItem("duo-resume");}catch{}}
function remember(s:Session,room:PublicRoom){try{const value=JSON.stringify({...s,connection:room.players[s.slot]?.connection??0,epoch:room.epoch,updatedAt:Date.now()});sessionStorage.setItem("duo-session",value);localStorage.setItem("duo-resume",value);}catch{}}
export function useDuoConnection(levelChoice:GameChoice,panelPaused:boolean,audio:GameAudio,notify:(s:string)=>void){
  const [room,setRoom]=useState<PublicRoom|null>(null),[session,setSession]=useState<Session|null>(null),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[status,setStatus]=useState<Status>("connected"),[pressed,setPressed]=useState<string[]>([]),[rtt,setRtt]=useState(0),[recoveries,setRecoveries]=useState(0),[clock,setClock]=useState(0),[restoreCandidate,setRestoreCandidate]=useState<Session|null>(null);
  const current=useRef<PublicRoom|null>(null),auth=useRef<Session|null>(null),prediction=useRef(new Prediction()),controls=useRef(new Controls()),input=useRef({dir:0,jump:0,hold:false,use:false}),lastGood=useRef(0),tracker=useRef(new SoundTracker());
  const needsResume=useRef(false),retryAt=useRef(0),failures=useRef(0),flight=useRef<AbortController|null>(null),serial=useRef(0),pauseBusy=useRef(false),panel=useRef(panelPaused),fatal=useRef(false),nextPoll=useRef(0);
  const syncRef=useRef<()=>Promise<void>>(async()=>{}),enterRef=useRef<(action:string,code?:string,saved?:Session)=>Promise<void>>(async()=>{}),pauseRef=useRef<()=>Promise<void>>(async()=>{});
  useLayoutEffect(()=>{panel.current=panelPaused;},[panelPaused]);
  const clearHeld=useCallback(()=>{controls.current.clear();const p=prediction.current.player;if(p)controls.current.jump=p.jump;input.current={dir:0,jump:controls.current.jump,hold:false,use:false};setPressed([]);},[]);
  const abortFlight=useCallback(()=>{serial.current++;flight.current?.abort();flight.current=null;},[]);
  const api=useCallback(async(data:object,external?:AbortSignal,keepalive=false):Promise<Result>=>{
    const controller=new AbortController(),cancel=()=>controller.abort();if(external?.aborted)cancel();else external?.addEventListener("abort",cancel,{once:true});
    const timeout=setTimeout(cancel,6500),start=performance.now();
    try{const response=await fetch("/api/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),cache:"no-store",signal:controller.signal,keepalive});const result=await response.json() as Result;if(!response.ok)throw Object.assign(new Error(result.error||"连接失败，请重试"),{status:response.status});setRtt(Math.round(performance.now()-start));return result;}
    finally{clearTimeout(timeout);external?.removeEventListener("abort",cancel);}
  },[]);
  const accept=useCallback((r:Result,s:Session,reset=false,silent=false)=>{
    const previous=current.current;
    if(previous&&previous.code===r.room.code&&(r.room.epoch<previous.epoch||r.room.epoch===previous.epoch&&r.room.revision<previous.revision))return;
    current.current=r.room;setRoom(r.room);const p=r.room.players[s.slot];
    if(!p){fatal.current=true;setStatus("expired");forget();return;}
    const next={...p,token:s.token},fenced=reset||!prediction.current.player||previous?.epoch!==r.room.epoch||prediction.current.player.connection!==p.connection;
    if(fenced)prediction.current.reset(next,r.room.defeated,worldFrom(r.room));else prediction.current.reconcile(next,r.room.open,r.room.defeated,worldFrom(r.room));
    if(fenced||previous?.players[s.slot]?.generation!==p.generation)clearHeld();
    if(silent||reset)tracker.current.reset(r.room);else for(const sound of tracker.current.observe(r.room,s.slot))audio.play(sound);
    lastGood.current=performance.now();remember(s,r.room);setError("");setStatus(p.away?"paused":needsResume.current?"reconnecting":"connected");
  },[audio,clearHeld]);
  const enter=useCallback(async(action:string,joinCode="",saved?:Session,saveKey?:string)=>{
    abortFlight();fatal.current=false;setBusy(true);setError("");
    try{const r=await api({action,code:joinCode,token:saved?.token,connection:saved?.connection??0,level:levelChoice,saveKey});const s:Session={code:r.room.code,token:r.token||saved!.token,slot:r.slot};auth.current=s;needsResume.current=!!r.room.players[s.slot]?.away;failures.current=0;retryAt.current=0;accept(r,s,true,true);setSession(s);setRestoreCandidate(null);history.replaceState(null,"","?room="+s.code);}
    catch(e){setError((e as Error).message);if(saved){forget();setRestoreCandidate(null);}}
    finally{setBusy(false);}
  },[abortFlight,accept,api,levelChoice]);useLayoutEffect(()=>{enterRef.current=enter;},[enter]);
  const sync=useCallback(async()=>{
    const s=auth.current;if(!s||flight.current||pauseBusy.current||fatal.current||document.hidden||performance.now()<retryAt.current)return;
    if(!browserOnline()){setStatus("offline");return;}
    const controller=new AbortController(),ticket=serial.current;flight.current=controller;
    try{
      const p=current.current?.players[s.slot],connection=p?.connection??0,epoch=current.current?.epoch;
      if(panel.current){if(performance.now()<nextPoll.current)return;nextPoll.current=performance.now()+1200;const r=await api({action:"poll",...s,connection},controller.signal);if(ticket===serial.current&&auth.current?.token===s.token)accept(r,s,false,true);return;}
      if(needsResume.current){const r=await api({action:"resume",...s,connection,epoch},controller.signal);if(ticket!==serial.current||auth.current?.token!==s.token)return;needsResume.current=!!r.room.players[s.slot]?.away;accept(r,s,true,true);if(!needsResume.current){failures.current=0;retryAt.current=0;setRecoveries(v=>v+1);audio.play("resume");notify("已回到原房间，继续合作吧");}return;}
      const r=await api({action:"input",...s,protocol:PROTOCOL,connection,epoch,frames:prediction.current.frames.slice(0,180)},controller.signal);if(ticket===serial.current&&auth.current?.token===s.token){accept(r,s);failures.current=0;retryAt.current=0;}
    }catch(e){
      if(ticket!==serial.current||auth.current?.token!==s.token)return;
      clearHeld();prediction.current.frames=[];needsResume.current=true;const failure=e as Error&{status?:number};
      if(failure.status===401||failure.status===404){fatal.current=true;setStatus("expired");setError(failure.message);forget();}
      else if(failure.status===409){fatal.current=true;setStatus("update");setError(failure.message);}
      else{failures.current++;retryAt.current=performance.now()+retryDelay(failures.current);setStatus(browserOnline()?"reconnecting":"offline");setError("连接暂时中断，正在自动恢复");}
    }finally{if(flight.current===controller)flight.current=null;}
  },[accept,api,audio,clearHeld,notify]);useLayoutEffect(()=>{syncRef.current=sync;},[sync]);
  const requestPause=useCallback(async()=>{
    const s=auth.current;if(!s||fatal.current||pauseBusy.current)return;
    clearHeld();abortFlight();needsResume.current=true;setStatus("paused");const p=current.current?.players[s.slot];if(p?.away)return;
    pauseBusy.current=true;
    try{const r=await api({action:"away",...s,connection:p?.connection??0,epoch:current.current?.epoch},undefined,true);if(auth.current?.token===s.token)accept(r,s,true,true);}
    catch{/* Resume always uses a new input fence, even if the away notification was lost. */}
    finally{pauseBusy.current=false;if(auth.current?.token===s.token&&!document.hidden&&!panel.current){retryAt.current=0;void syncRef.current();}}
  },[abortFlight,accept,api,clearHeld]);useLayoutEffect(()=>{pauseRef.current=requestPause;},[requestPause]);
  const retry=useCallback(()=>{if(fatal.current)return;needsResume.current=true;retryAt.current=0;failures.current=0;clearHeld();setStatus("reconnecting");void syncRef.current();},[clearHeld]);
  const updateInput=useCallback(()=>{if(needsResume.current||fatal.current||panel.current)return;const {pressed,...state}=controls.current.state();input.current=state;setPressed(pressed);void syncRef.current();},[]);
  const clearInput=useCallback(()=>{clearHeld();void syncRef.current();},[clearHeld]);
  const command=useCallback(async(action:string)=>{const s=auth.current;if(!s)throw Error("先加入房间再继续");if(needsResume.current||panel.current||fatal.current)throw Error("连接恢复后再继续");if(action!=="save")clearHeld();const r=await api({action,...s,connection:current.current?.players[s.slot]?.connection??0,epoch:current.current?.epoch});if(auth.current?.token===s.token)accept(r,s);return r;},[accept,api,clearHeld]);
  const leave=useCallback(()=>{const s=auth.current;const connection=s?current.current?.players[s.slot]?.connection:0;abortFlight();auth.current=null;current.current=null;prediction.current=new Prediction();controls.current=new Controls();tracker.current.reset(null);needsResume.current=false;fatal.current=false;setSession(null);setRoom(null);setError("");setStatus("connected");setRestoreCandidate(null);clearHeld();forget();history.replaceState(null,"",location.pathname);if(s)void api({action:"leave",...s,connection}).catch(()=>{});},[abortFlight,api,clearHeld]);
  useEffect(()=>{
    const initialize=setTimeout(()=>{const q=new URLSearchParams(location.search).get("room");if(q&&/^\d{6}$/.test(q)){setCode(q);}
    try{const saved=parseSession(sessionStorage.getItem("duo-session"));if(saved&&(!q||q===saved.code))void enterRef.current("resume",saved.code,saved);else{const candidate=parseSession(localStorage.getItem("duo-resume"));if(candidate&&Date.now()-(candidate.updatedAt??0)<RECONNECT_MS&&(!q||q===candidate.code))setRestoreCandidate(candidate);}}catch{}},0);
    return()=>{clearTimeout(initialize);abortFlight();};
  },[abortFlight]);
  useEffect(()=>{if(!session)return;const id=setInterval(()=>void syncRef.current(),90),clockId=setInterval(()=>setClock(performance.now()),1000);void syncRef.current();return()=>{clearInterval(id);clearInterval(clockId);};},[session]);
  useEffect(()=>{if(!auth.current)return;if(panelPaused||document.hidden)void pauseRef.current();else if(needsResume.current){retryAt.current=0;void syncRef.current();}},[panelPaused,session]);
  useEffect(()=>{
    const visibility=()=>{audio.setVisible(!document.hidden);if(document.hidden)void pauseRef.current();else if(auth.current){needsResume.current=true;retryAt.current=0;clearHeld();void syncRef.current();}};
    const offline=()=>{abortFlight();clearHeld();needsResume.current=true;setStatus("offline");audio.setVisible(false);};
    const online=()=>{audio.setVisible(!document.hidden);if(auth.current)retry();};
    const pagehide=()=>{void pauseRef.current();};
    document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",pagehide);window.addEventListener("offline",offline);window.addEventListener("online",online);
    return()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",pagehide);window.removeEventListener("offline",offline);window.removeEventListener("online",online);audio.close();};
  },[abortFlight,audio,clearHeld,retry]);
  return {room,session,code,setCode,busy,setBusy,error,setError,status,pressed,rtt,recoveries,clock,restoreCandidate,current,auth,prediction,controls,input,lastGood,needsResume,accept,api,enter,sync,command,retry,leave,clearInput,updateInput,setPressed};
}
