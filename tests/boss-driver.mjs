export function driveBoss(bot,mission='fight'){
  const p=bot.prediction.player,r=bot.room,b=r.boss;let dir=0,use=false;
  const moveTo=(x,tolerance=5)=>p.x<x-tolerance?1:p.x>x+tolerance?-1:0;
  if(p.downed)return {dir,jump:bot.jump,hold:true,use};
  if(mission==='rescue'){
    if(bot.slot===0){dir=moveTo(316,3);use=p.grounded&&Math.abs(p.x-316)<20;}
    else if(r.players[0]?.downed){dir=moveTo(r.players[0].x-45);use=Math.abs(p.x-r.players[0].x)<65;}
    else dir=moveTo(200);
    return {dir,jump:bot.jump,hold:true,use};
  }
  if(b.hp===0)return {dir:r.won?0:1,jump:bot.jump,hold:true,use};
  if(bot.attempt!==b.attacks){bot.attempt=b.attacks;bot.attackJump=false;}
  const lurer=b.phase==='rest'?(1-b.lastLurer):b.lurer??(b.lastLurer===null?0:1-b.lastLurer);
  if(bot.slot===lurer){
    const target=b.phase==='ready'?316:210;dir=moveTo(target,3);
    use=b.phase==='ready'&&p.grounded&&Math.abs(p.x-316)<20;
  }else{
    if(p.grounded&&p.y>400&&p.x>483){bot.retreat=true;}
    if(bot.retreat){dir=-1;if(p.x<445)bot.retreat=false;}
    else if(b.phase==='weak'&&(bot.attackJump||p.grounded&&p.y<360&&p.x>650)){
      if(!bot.attackJump&&p.grounded){bot.jump++;bot.attackJump=true;}
      dir=p.x<804?1:0;
    }else{
      dir=p.x<688?1:p.x>710?-1:0;
      if(p.grounded&&p.y>400&&p.x>=440&&p.x<483)bot.jump++;
    }
  }
  return {dir,jump:bot.jump,hold:true,use};
}
