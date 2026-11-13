export function driveFactory(bot,mission={}){
  const p=bot.prediction.player,r=bot.room,f=r.factory,finder=f.finder??mission.finderSlot??0;let dir=0,use=false;
  const moveTo=(x,t=5)=>p.x<x-t?1:p.x>x+t?-1:0;
  const answer=()=>({dir,jump:bot.jump,hold:true,use});
  if(p.downed)return answer();
  const peer=r.players[1-bot.slot];
  if(peer?.downed){dir=moveTo(peer.x-40,7);use=Math.abs(p.x-peer.x)<65&&Math.abs(p.y-peer.y)<65;return answer();}
  if(r.open){dir=r.won?0:1;return answer();}
  if(!f.keyTaken){
    if(f.crateX<329){if(bot.slot===finder)dir=moveTo(165);else{dir=1;use=true;}return answer();}
    if(bot.slot!==finder){dir=moveTo(555);if(p.grounded&&p.y>400&&p.x>=f.crateX-32&&p.x<f.crateX+60)bot.jump++;return answer();}
    bot.factoryPhase??=0;
    if(p.grounded&&p.y===356){bot.factoryPhase=2;bot.jump++;}
    if(p.grounded&&p.y===260)bot.factoryPhase=3;
    if(bot.factoryPhase===0){dir=moveTo(f.crateX-30,3);if(p.x>=f.crateX-34&&p.grounded){bot.jump++;bot.factoryPhase=1;}}
    else if(bot.factoryPhase===1)dir=moveTo(f.crateX+22,2);
    else if(bot.factoryPhase===2)dir=moveTo(438,3);
    else{dir=moveTo(450,4);use=p.grounded;}
    return answer();
  }
  if(!f.transfers){dir=moveTo(bot.slot===finder?552:566,4);use=p.grounded&&p.y>400;return answer();}
  if(!r.checkpoint){dir=moveTo(bot.slot===finder?710:744,4);return answer();}
  if(mission.phase==='rescue'){
    if(bot.slot!==finder)dir=1;else dir=moveTo(735);return answer();
  }
  if(mission.phase==='wipe'){dir=1;return answer();}
  if(f.keyOwner===null&&!f.unlocked&&bot.slot!==finder){dir=moveTo(f.keyX-14);use=p.grounded;return answer();}
  if(p.x<910){dir=1;if(p.grounded&&p.x>=772)bot.jump++;}
  else if(!(r.defeated&1)){dir=moveTo(924,3);if(p.grounded)bot.jump++;}
  else{dir=moveTo(bot.slot===finder?953:966,4);use=bot.slot!==finder&&p.grounded;}
  return answer();
}
