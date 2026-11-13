import {emptyProgress,observeRun,parseProgress,type Progress,type Receipt} from "./records.ts";
import type {PublicRoom} from "./game.ts";
export const PROGRESS_KEY="duo-progress-v1";
export type LocalStorageLike={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
export type ProgressSnapshot={progress:Progress;ready:boolean;available:boolean;receipt:Receipt|null};
export const INITIAL_PROGRESS:ProgressSnapshot={progress:emptyProgress(),ready:false,available:true,receipt:null};
export class ProgressStore{
  private snapshot:ProgressSnapshot=INITIAL_PROGRESS;
  private storage:LocalStorageLike|null=null;
  private listeners=new Set<()=>void>();
  private stamp="";
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  getSnapshot=()=>this.snapshot;
  getServerSnapshot=()=>INITIAL_PROGRESS;
  private emit(next:ProgressSnapshot){this.snapshot=next;for(const listener of this.listeners)listener();}
  hydrate(getStorage:()=>LocalStorageLike){try{this.storage=getStorage();this.emit({progress:parseProgress(this.storage.getItem(PROGRESS_KEY)),ready:true,available:true,receipt:null});}catch{this.storage=null;this.emit({...this.snapshot,ready:true,available:false});}this.stamp="";}
  refresh(){if(!this.storage)return;try{this.emit({...this.snapshot,progress:parseProgress(this.storage.getItem(PROGRESS_KEY)),receipt:null});this.stamp="";}catch{this.storage=null;this.emit({...this.snapshot,available:false});}}
  observe(room:PublicRoom|null){
    if(!room||!this.snapshot.ready)return;const stamp=[room.runId,room.level,room.epoch,room.won].join(":");if(stamp===this.stamp)return;this.stamp=stamp;
    let progress=this.snapshot.progress,available=this.snapshot.available;
    if(this.storage){try{progress=parseProgress(this.storage.getItem(PROGRESS_KEY));}catch{this.storage=null;available=false;}}
    const result=observeRun(progress,room);
    if(result.progress!==progress&&this.storage){try{this.storage.setItem(PROGRESS_KEY,JSON.stringify(result.progress));}catch{this.storage=null;available=false;}}
    this.emit({progress:result.progress,ready:true,available,receipt:result.receipt});
  }
}
