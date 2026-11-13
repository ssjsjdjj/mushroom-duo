import {countCoins,type PublicRoom} from "./game.ts";
export type SoundName="jump"|"coin"|"stomp"|"hurt"|"switch"|"checkpoint"|"rescue"|"win"|"stage"|"resume";
export class SoundTracker {
  private last:PublicRoom|null=null;
  reset(room:PublicRoom|null){this.last=room;}
  observe(room:PublicRoom,slot:number):SoundName[]{
    const old=this.last;if(old&&old.code===room.code&&(room.epoch<old.epoch||room.epoch===old.epoch&&room.revision<=old.revision))return [];
    this.last=room;if(!old||old.code!==room.code)return [];
    if(room.epoch!==old.epoch)return room.level!==old.level?["stage"]:[];
    if(room.won&&!old.won)return ["win"];
    const sounds:SoundName[]=[];
    if(room.level==="boss"){if(room.boss.hits.length>old.boss.hits.length)sounds.push("stomp");if(room.boss.phase==="warning"&&old.boss.phase!=="warning")sounds.push("switch");if(room.boss.phase==="weak"&&old.boss.phase!=="weak")sounds.push("stage");}
    if(room.level==="factory"&&old.factory&&(room.factory.keyTaken&&!old.factory.keyTaken||room.factory.transfers>old.factory.transfers))sounds.push("switch");
    if(countCoins(room.coins)>countCoins(old.coins))sounds.push("coin");
    if((room.defeated&~old.defeated)!==0)sounds.push("stomp");
    if((room.players[slot]?.hearts??3)<(old.players[slot]?.hearts??3))sounds.push("hurt");
    if(room.open&&!old.open||room.bridgeOpened&&!old.bridgeOpened||room.castleUpper&&!old.castleUpper||room.castleLower&&!old.castleLower)sounds.push("switch");
    if(room.checkpoint&&!old.checkpoint)sounds.push("checkpoint");
    if(room.rescues>old.rescues)sounds.push("rescue");return sounds;
  }
}
const NOTES:Record<SoundName,number[]>={jump:[330,590],coin:[880,1320],stomp:[170,100],hurt:[180,85],switch:[440,660],checkpoint:[520,780,1040],rescue:[523,784],win:[523,659,784,1046],stage:[392,523,659],resume:[440,660]};
function browserContext(){
  if(typeof window==="undefined")return null;
  const Ctor=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  return Ctor?new Ctor():null;
}
export class GameAudio {
  enabled=true;
  private context:AudioContext|null=null;
  private visible=true;
  private lastPlay=new Map<SoundName,number>();
  private factory:()=>AudioContext|null;
  constructor(factory:()=>AudioContext|null=browserContext){this.factory=factory;}
  unlock(){
    if(!this.enabled||!this.visible)return;
    try{if(!this.context||this.context.state==="closed")this.context=this.factory();const c=this.context;if(c&&c.state!=="running")void c.resume().catch(()=>{});}catch{/* Sound support must never prevent playing. */}
  }
  setEnabled(value:boolean){this.enabled=value;if(value)this.unlock();else this.close();}
  setVisible(value:boolean){this.visible=value;if(!value)this.close();}
  close(){const c=this.context;this.context=null;this.lastPlay.clear();if(c&&c.state!=="closed")void c.close().catch(()=>{});}
  play(name:SoundName){
    const c=this.context;if(!this.enabled||!this.visible||!c||c.state!=="running")return;
    const now=c.currentTime;if(now-(this.lastPlay.get(name)??-10)<.08)return;this.lastPlay.set(name,now);
    const notes=NOTES[name],step=name==="win"?.075:.045;
    try{notes.forEach((frequency,i)=>{const at=now+i*step,osc=c.createOscillator(),gain=c.createGain();osc.type=name==="hurt"?"sine":"triangle";osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.035,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.105);osc.connect(gain);gain.connect(c.destination);osc.start(at);osc.stop(at+.12);osc.onended=()=>{osc.disconnect();gain.disconnect();};});}catch{/* Browsers may interrupt audio output when switching apps. */}
  }
}
