// Exercise the playable route from normal input only; never submit player positions.
export function drive(bot,blueMayStart=true){
  const p=bot.prediction.player;let dir=0;
  if(bot.room.open)return {dir:bot.room.won?0:1,jump:bot.jump,hold:true};
  if(bot.slot===0){
    if(bot.phase===0){dir=1;if(p.x>=148){bot.jump++;bot.phase=1;}}
    else if(bot.phase===1){dir=1;if(p.grounded&&p.y===348){bot.jump++;bot.phase=2;}}
    else if(bot.phase===2){dir=p.x<468?1:0;if(p.grounded&&p.y===284&&p.x>=440)bot.phase=3;}
  }else if(blueMayStart){
    if(bot.phase===0){dir=1;if(p.x>=540){bot.jump++;bot.phase=1;}}
    else if(bot.phase===1){dir=p.x<576?1:0;if(p.defeated&1){bot.phase=2;dir=1;}}
    else if(bot.phase===2){dir=p.x<728?1:0;if(p.grounded&&p.y===348&&p.x>=700)bot.phase=3;}
  }
  return {dir,jump:bot.jump,hold:true};
}
