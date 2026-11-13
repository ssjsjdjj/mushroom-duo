export function driveRelay(bot,mission){
  const p=bot.prediction.player,r=bot.room;let dir=0,use=false;
  if(p.downed)return {dir:0,jump:bot.jump,hold:true,use:false};
  if(p.riding)return {dir:r.lift.y<=300.01?1:0,jump:bot.jump,hold:true,use:false};
  if(r.open)return {dir:r.won?0:1,jump:bot.jump,hold:true,use:false};
  if(mission.phase==='intro'){
    if(bot.slot===0){
      if(!r.bridgeOpened)dir=p.x<198?1:0;
      else{
        if(!bot.firstJump){dir=1;if(p.x>=540){bot.jump++;bot.firstJump=true;}}
        else if(!(p.defeated&1))dir=p.x<584?1:0;
        else dir=p.x<668?1:0;
      }
    }else if(!r.bridgeOpened){
      if(p.x<450)dir=p.x<350?1:0;
      else{dir=p.x<539?1:0;use=p.grounded&&Math.abs(p.x+14-558)<35;}
    }else dir=p.x<674?1:0;
    // Both wait at the shared checkpoint before the recovery exercise.

  }else if(mission.phase==='rescue'){
    if(bot.slot===1)dir=1;
    else{const target=r.players[1];if(target?.downed){dir=Math.abs(p.x-target.x)<65?0:p.x<target.x?1:-1;use=dir===0;}}
  }else if(mission.phase==='wipe')dir=1;
  else if(mission.phase==='finish'){
    if(bot.slot===1&&!(r.defeated&2)&&!mission.allowBlueStart)return {dir:0,jump:bot.jump,hold:true,use:false};
    if(!bot.finishJump){dir=1;if(p.x>=710&&p.grounded){bot.jump++;bot.finishJump=true;}}
    else dir=p.x<(bot.slot===0?888:951)?1:0;
  }
  return {dir,jump:bot.jump,hold:true,use};
}
