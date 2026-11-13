export function driveCastle(bot){
  const p=bot.prediction.player,r=bot.room;let dir=0,use=false;
  if(p.downed)return {dir,jump:bot.jump,hold:true,use};
  if(p.riding)return {dir:0,jump:bot.jump,hold:true,use};
  if(bot.slot===0){
    if(!r.castleUpper){
      if(bot.phase===0){dir=1;if(p.x>=148){bot.jump++;bot.phase=1;}}
      else if(bot.phase===1){dir=p.x<245?1:0;if(p.grounded&&p.y===348){bot.jump++;bot.phase=2;}}
      else if(bot.phase===2){dir=p.x<360?1:0;if(p.grounded&&p.y===284){bot.jump++;bot.phase=3;}}
      else{dir=p.x<516?1:0;use=p.grounded&&p.y===220;}
    }else if(r.castleLower)dir=r.won?0:1;
  }else{
    if(!(r.defeated&1)){
      if(!bot.firstJump){dir=1;if(p.x>=330){bot.jump++;bot.firstJump=true;}}
      else dir=p.x<368?1:0;
    }else if(!r.castleLower||p.x<790){
      if(p.x<790)dir=p.x<563?1:0;
      else{dir=p.x<840?1:0;use=p.grounded;}
    }else if(!(r.defeated&2)){
      if(!bot.finishJump){dir=1;if(p.x>=896&&p.grounded){bot.jump++;bot.finishJump=true;}}
      else dir=p.x<936?1:0;
    }else dir=r.won?0:1;
  }
  return {dir,jump:bot.jump,hold:true,use};
}
