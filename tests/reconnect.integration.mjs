import assert from 'node:assert/strict';
import {PROTOCOL,worldFrom} from '../app/lib/game.ts';
import {Prediction} from '../app/lib/prediction.ts';
import {ONLINE_MS,RECONNECT_MS} from '../app/lib/connection.ts';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173',extra=Number(process.env.TEST_LATENCY_MS||0),jitter=Number(process.env.TEST_JITTER_MS||0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let calls=0;
async function api(body,expected=200){const delay=extra/2+(calls++%3)*jitter/2;await sleep(delay);const response=await fetch(origin+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const value=await response.json();await sleep(delay);assert.equal(response.status,expected,value.error||'HTTP status');return value;}
const a=await api({action:'create',level:'practice'}),b=await api({action:'join',code:a.room.code});let peer=b.room,peerBusy=false,peerFailure=null;
const heartbeat=setInterval(async()=>{if(peerBusy)return;peerBusy=true;try{peer=(await api({action:'poll',code:a.room.code,token:b.token,connection:peer.players[1].connection})).room;}catch(e){peerFailure=e;}finally{peerBusy=false;}},400);
const results={origin,extraRoundTripMs:extra,jitterMs:jitter,backgroundResume:false,rawDisconnectResume:false,oldInputRejected:false,idempotentResume:false,expiredSeatReplaced:false,remainingPartnerPreserved:false};
try{
  const start=a.room.players[0],initialConnection=start.connection;
  const jump=await api({action:'input',code:a.room.code,token:a.token,protocol:PROTOCOL,connection:initialConnection,epoch:0,frames:[{n:1,dir:0,jump:1,hold:true,generation:start.generation}]});assert.ok(jump.room.players[0].y<420);
  const paused=await api({action:'away',code:a.room.code,token:a.token,connection:initialConnection,epoch:0});const saved=paused.room.players[0];assert.equal(saved.away,true);assert.equal(saved.online,false);
  await api({action:'join',code:a.room.code},409);await sleep(10000);
  const still=await api({action:'poll',code:a.room.code,token:b.token,connection:0});assert.equal(still.room.elapsed,paused.room.elapsed);assert.equal(still.room.players[0].y,saved.y);
  const resumed=await api({action:'resume',code:a.room.code,token:a.token,connection:initialConnection});const p=resumed.room.players[0];assert.equal(p.away,false);assert.equal(p.x,saved.x);assert.equal(p.y,saved.y);assert.equal(p.vy,saved.vy);assert.equal(p.ack,0);assert.ok(p.connection>saved.connection);results.backgroundResume=true;
  const stale=await api({action:'input',code:a.room.code,token:a.token,protocol:PROTOCOL,connection:initialConnection,epoch:0,frames:[{n:2,dir:1,jump:9,hold:true,use:true,generation:start.generation}]});assert.equal(stale.room.players[0].ack,0);assert.equal(stale.room.players[0].x,p.x);assert.equal(stale.room.players[0].jump,p.jump);results.oldInputRejected=true;
  const repeated=await api({action:'resume',code:a.room.code,token:a.token,connection:initialConnection});assert.equal(repeated.room.players[0].connection,p.connection);results.idempotentResume=true;
  const prediction=new Prediction();prediction.reset({...p,token:a.token},resumed.room.defeated,worldFrom(resumed.room));for(let i=0;i<55;i++)prediction.record(0,p.jump,false,false);
  await sleep(1000);const landed=await api({action:'input',code:a.room.code,token:a.token,protocol:PROTOCOL,connection:p.connection,epoch:0,frames:prediction.frames});assert.ok(landed.room.players[0].grounded);assert.equal(landed.room.players[0].jump,1);
  await sleep(ONLINE_MS+1200);const offline=await api({action:'poll',code:a.room.code,token:b.token,connection:0});assert.equal(offline.room.players[0].online,false);const frozen=offline.room.elapsed;await sleep(1000);const frozenAgain=await api({action:'poll',code:a.room.code,token:b.token,connection:0});assert.equal(frozenAgain.room.elapsed,frozen);
  const back=await api({action:'resume',code:a.room.code,token:a.token,connection:p.connection});assert.equal(back.room.players[0].token,undefined);assert.ok(back.room.players[0].online);assert.equal(back.room.players[0].x,landed.room.players[0].x);results.rawDisconnectResume=true;
  await api({action:'away',code:a.room.code,token:a.token,connection:back.room.players[0].connection,epoch:0});await sleep(RECONNECT_MS+1200);
  const replacement=await api({action:'join',code:a.room.code});assert.equal(replacement.slot,0);assert.notEqual(replacement.token,a.token);assert.ok(replacement.room.players[1]);results.expiredSeatReplaced=true;
  await api({action:'resume',code:a.room.code,token:a.token,connection:back.room.players[0].connection},401);const check=await api({action:'join',code:a.room.code,token:b.token});assert.equal(check.slot,1);assert.equal(check.token,b.token);results.remainingPartnerPreserved=true;
  await api({action:'leave',code:a.room.code,token:replacement.token,connection:replacement.room.players[0].connection});console.log('PASS: 10s background pause, raw disconnect, safe resume and old input rejection');console.log('PASS: real 30s expiry, new seat identity and remaining teammate preserved');
}finally{clearInterval(heartbeat);while(peerBusy)await sleep(20);await api({action:'leave',code:a.room.code,token:b.token,connection:peer.players[1]?.connection??0}).catch(()=>{});}
if(peerFailure)throw peerFailure;assert.ok(Object.entries(results).filter(([,v])=>typeof v==='boolean').every(([,v])=>v));console.log('RESULT '+JSON.stringify(results));
