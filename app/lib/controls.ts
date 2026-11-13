export type Action = "left"|"right"|"jump"|"interact";
export class Controls {
  keys=new Map<string,Action>();
  pointers=new Map<number,Action|null>();
  origins=new Map<number,Action>();
  jump=0;
  pressKey(key:string,action:Action,repeat=false){if(repeat&&!this.keys.has(key))return;if(!this.keys.has(key)&&action==="jump")this.jump++;this.keys.set(key,action);}
  releaseKey(key:string){this.keys.delete(key);}
  pressPointer(id:number,action:Action){if(!this.pointers.has(id)&&action==="jump")this.jump++;this.pointers.set(id,action);this.origins.set(id,action);}
  movePointer(id:number,action:Action|null){if(this.pointers.has(id))this.pointers.set(id,action);}
  releasePointer(id:number){this.pointers.delete(id);this.origins.delete(id);}
  clear(){this.keys.clear();this.pointers.clear();this.origins.clear();}
  state(){const pressed=[...this.keys.values(),...this.pointers.values()].filter((a):a is Action=>!!a);return {dir:(pressed.includes("right")?1:0)-(pressed.includes("left")?1:0),jump:this.jump,hold:pressed.includes("jump"),use:pressed.includes("interact"),pressed:[...new Set(pressed)]};}
}
