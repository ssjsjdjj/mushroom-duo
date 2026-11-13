"use client";
import {useEffect,useState,useSyncExternalStore} from "react";
import {ProgressStore,PROGRESS_KEY} from "../lib/progress-store";
import type {PublicRoom} from "../lib/game";
export function useProgress(room:PublicRoom|null){
  const [store]=useState(()=>new ProgressStore());const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
  useEffect(()=>{store.hydrate(()=>window.localStorage);const changed=(event:StorageEvent)=>{if(event.key===PROGRESS_KEY||event.key===null)store.refresh();};window.addEventListener("storage",changed);return()=>window.removeEventListener("storage",changed);},[store]);
  useEffect(()=>{store.observe(room);},[store,room]);return snapshot;
}
