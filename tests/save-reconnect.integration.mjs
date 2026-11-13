import assert from 'node:assert/strict';
import {ONLINE_MS,RECONNECT_MS} from '../app/lib/connection.ts';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(body,expected=200){const response=await fetch(origin+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await response.json();assert.equal(response.status,expected,data.error||'Unexpected HTTP status');return data;}
async function run(ownerSlot){
  const identities=[],created=await api({action:'create',level:'journey'});identities.push(created);
  const blue=await api({action:'join',code:created.room.code});identities.push(blue);
  const owner=ownerSlot===0?created:blue,saved=await api({action:'save',code:created.room.code,token:owner.token,connection:0,epoch:0});
  assert.equal(saved.save.slot,ownerSlot);assert.ok(!JSON.stringify(saved.room).includes(saved.save.key));
  let beat,peerBusy=false,peerError=null,back,peer;
  try{
    back=await api({action:'restore',saveKey:saved.save.key});identities.push(back);
    assert.equal(back.slot,ownerSlot);peer=await api({action:'join',code:back.room.code});identities.push(peer);assert.equal(peer.slot,1-ownerSlot);
    const original=peer.room.players[ownerSlot],jump=await api({action:'input',code:back.room.code,token:back.token,protocol:back.room.protocol,connection:original.connection,epoch:back.room.epoch,frames:[{n:1,dir:0,jump:1,hold:true,generation:original.generation}]});
    const before=jump.room.players[ownerSlot];assert.ok(before.y<420&&before.vy<0);
    beat=setInterval(async()=>{if(peerBusy)return;peerBusy=true;try{await api({action:'poll',code:back.room.code,token:peer.token,connection:0});}catch(e){peerError=e;}finally{peerBusy=false;}},400);
    await sleep(ONLINE_MS+1200);
    const restored=await api({action:'restore',saveKey:saved.save.key}),current=restored.room.players[ownerSlot];
    assert.equal(restored.room.code,back.room.code);assert.equal(restored.token,back.token);assert.ok(current.connection>before.connection,'save restoration did not fence the old connection');assert.ok(current.generation>before.generation);assert.equal(current.ack,0);assert.equal(current.x,before.x);assert.equal(current.y,before.y);assert.equal(current.vy,before.vy);assert.equal(current.usedJump,current.jump);
    const late=await api({action:'input',code:back.room.code,token:back.token,protocol:back.room.protocol,connection:before.connection,epoch:restored.room.epoch,frames:[{n:2,dir:1,jump:2,hold:true,use:true,generation:before.generation}]});
    assert.equal(late.room.players[ownerSlot].ack,0);assert.equal(late.room.players[ownerSlot].jump,1);assert.equal(late.room.players[ownerSlot].x,before.x);assert.equal(late.room.players[ownerSlot].y,before.y);
    const delayedRestart=await api({action:'restart',code:back.room.code,token:back.token,connection:before.connection,epoch:restored.room.epoch});assert.equal(delayedRestart.room.epoch,restored.room.epoch);
    const retries=await Promise.all([api({action:'restore',saveKey:saved.save.key}),api({action:'restore',saveKey:saved.save.key})]);
    for(const retry of retries){assert.equal(retry.room.code,back.room.code);assert.equal(retry.token,back.token);assert.equal(retry.room.players[ownerSlot].connection,current.connection);}
    const accepted=await api({action:'input',code:back.room.code,token:back.token,protocol:back.room.protocol,connection:current.connection,epoch:restored.room.epoch,frames:[{n:1,dir:0,jump:1,hold:false,generation:current.generation}]});assert.equal(accepted.room.players[ownerSlot].ack,1);
    const away=await api({action:'away',code:back.room.code,token:back.token,connection:current.connection,epoch:restored.room.epoch});assert.equal(away.room.players[ownerSlot].away,true);
    const pausedBack=await api({action:'restore',saveKey:saved.save.key});assert.equal(pausedBack.room.players[ownerSlot].away,false);assert.ok(pausedBack.room.players[ownerSlot].connection>away.room.players[ownerSlot].connection);
    await api({action:'away',code:back.room.code,token:back.token,connection:pausedBack.room.players[ownerSlot].connection,epoch:pausedBack.room.epoch});
    await sleep(RECONNECT_MS+1200);
    const replacement=await api({action:'restore',saveKey:saved.save.key});identities.push(replacement);assert.notEqual(replacement.room.code,back.room.code);assert.notEqual(replacement.token,back.token);assert.equal(replacement.slot,ownerSlot);assert.equal(replacement.room.runId,created.room.runId);assert.equal(replacement.room.players[1-ownerSlot],null);assert.equal(replacement.room.players[ownerSlot].x,88+65*ownerSlot);
    const oldFriend=await api({action:'join',code:back.room.code,token:peer.token});assert.equal(oldFriend.slot,peer.slot);assert.equal(oldFriend.token,peer.token);
    if(peerError)throw peerError;
    return {slot:ownerSlot,sameRoomDuringLease:true,oldJumpRejected:true,oldRestartRejected:true,midairPreserved:true,duplicateRestoreStable:true,newInputAccepted:true,awayRestored:true,expiredSeatRestored:true,oldPartnerPreserved:true};
  }finally{
    clearInterval(beat);while(peerBusy)await sleep(20);
    for(const identity of identities.reverse())await api({action:'leave',code:identity.room.code,token:identity.token}).catch(()=>{});
  }
}
const results=await Promise.all([run(0),run(1)]);
console.log('PASS: both roles restore from raw disconnect, reject delayed jumps and commands, retain midair motion and deduplicate retries');
console.log('PASS: actual 30-second expiry creates fresh saved identities and preserves old teammates');
console.log('RESULT '+JSON.stringify({origin,results}));
