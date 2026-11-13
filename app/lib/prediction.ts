import { stepPlayer, PRACTICE_WORLD, type InputFrame, type Player, type WorldFrame } from "./game.ts";

// Rebuild physics from the acknowledged state, then replay every outstanding input.
// Rendering must not blend an old vertical velocity into the current jump.
export class Prediction {
  player: Player | null = null;
  frames: InputFrame[] = [];
  lastAck = 0;
  next = 1;
  defeated = 0;
  world:WorldFrame=PRACTICE_WORLD;
  reset(player: Player,defeated=player.defeated,world:WorldFrame=PRACTICE_WORLD) {
    this.player = {...player};this.frames=[];this.lastAck=player.ack;this.next=player.ack+1;this.defeated=defeated;this.world=world;
  }
  record(dir:number,jump:number,open:boolean,hold=true,use=false) {
    if(!this.player||this.frames.length>=180)return;
    const frame={n:this.next++,dir,jump,hold,use,generation:this.player.generation};this.frames.push(frame);stepPlayer(this.player,frame,open,this.defeated,this.world);
  }
  reconcile(player:Player,open:boolean,defeated=this.defeated,world:WorldFrame=this.world) {
    if(this.player&&player.connection!==this.player.connection){this.reset(player,defeated,world);return;}
    if(player.ack<this.lastAck)return;
    this.lastAck=player.ack;this.frames=this.frames.filter(f=>f.n>player.ack);this.defeated=defeated;this.world=world;
    this.player={...player};
    for(const frame of this.frames){if((frame.generation??0)===this.player.generation)stepPlayer(this.player,frame,open,this.defeated,this.world);else this.player.ack=frame.n;}
    this.next=Math.max(this.next,player.ack+1);
  }
}
