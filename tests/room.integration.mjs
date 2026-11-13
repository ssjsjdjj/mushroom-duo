import assert from 'node:assert/strict';
import {Prediction} from '../app/lib/prediction.ts';
import {PROTOCOL,STEP} from '../app/lib/game.ts';
import {drive} from './route-driver.mjs';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const extra=Number(process.env.TEST_LATENCY_MS||0),jitter=Number(process.env.TEST_JITTER_MS||0);
const dropEnabled=process.env.TEST_DROP_RESPONSE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results={origin,extraRoundTripMs:extra,jitterMs:jitter,droppedResponses:0,duplicateRequests:0,maxReplayError:0,maxActualRoundTripMs:0,gateOpened:false,bothWon:false};
let calls=0;
async function api(body,expected=200,network=false){const id=calls++;const delay=network?extra/2+(id%4)*jitter/3:0;await sleep(delay);const before=performance.now();const r=await fetch(origin+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const value=await r.json();await sleep(delay);results.maxActualRoundTripMs=Math.max(results.maxActualRoundTripMs,Math.round(performance.now()-before+delay));assert.equal(r.status,expected,value.error||'unexpected HTTP status');return value;}
const a=await api({action:'create',level:'practice'}),b=await api({action:'join',code:a.room.code});
assert.equal(a.slot,0);assert.equal(b.slot,1);assert.notEqual(a.token,b.token);
await api({action:'join',code:a.room.code},409);
await api({action:'input',code:a.room.code,token:'invalid',protocol:PROTOCOL,epoch:0,frames:[]},401);
await api({action:'join',code:'abc'},400);
console.log('PASS: anonymous room creation, two identities, capacity and authentication');
const bots=[a,b].map((r,i)=>{const prediction=new Prediction();prediction.reset({...b.room.players[i],token:r.token});return {prediction,token:r.token,slot:i,room:b.room,phase:0,jump:0,lastGood:performance.now(),sent:0,dropped:false,pending:false};});
let accumulator=0,last=performance.now(),failure=null;const deadline=last+Number(process.env.TEST_LIMIT_MS||60000);let loneChecked=false;
function control(bot){return drive(bot,loneChecked);}
function accept(bot,r){if(r.room.revision<bot.room.revision)return;const before={...bot.prediction.player};const oldAck=bot.prediction.lastAck;bot.room=r.room;bot.prediction.reconcile({...r.room.players[bot.slot],token:bot.token},r.room.open,r.room.defeated);if(!r.room.open&&oldAck<=r.room.players[bot.slot].ack){const after=bot.prediction.player;results.maxReplayError=Math.max(results.maxReplayError,Math.abs(before.x-after.x),Math.abs(before.y-after.y));}bot.lastGood=performance.now();}
async function send(bot){if(bot.pending)return;bot.pending=true;try{const frames=bot.prediction.frames.map(f=>({...f}));const body={action:'input',code:a.room.code,token:bot.token,protocol:PROTOCOL,epoch:bot.room.epoch,frames};const r=await api(body,200,true);bot.sent++;
  if(dropEnabled&&bot.slot===0&&!bot.dropped&&frames.some(f=>f.jump>0)){bot.dropped=true;results.droppedResponses++;return;}
  accept(bot,r);
  if(bot.sent===3){const duplicate=await api(body);results.duplicateRequests++;accept(bot,duplicate);}
}catch(e){failure=e;}finally{bot.pending=false;}}
const simulation=setInterval(()=>{const now=performance.now();accumulator+=Math.min((now-last)/1000,.1);last=now;while(accumulator>=STEP){for(const bot of bots){if(bot.room.players.every(p=>p?.online)&&!bot.room.won&&now-bot.lastGood<2000){const c=control(bot);bot.prediction.record(c.dir,c.jump,bot.room.open,c.hold);}}accumulator-=STEP;}},8);
const network=setInterval(()=>{for(const bot of bots)void send(bot);},90);
try{
  let redSince=0;
  while(!bots.every(bot=>bot.room.won)){
    if(failure)throw failure;
    assert.ok(performance.now()<deadline,'run timed out: '+JSON.stringify(bots.map(bot=>({slot:bot.slot,phase:bot.phase,p:bot.prediction.player,pending:bot.prediction.frames.length}))));
    if(!loneChecked&&bots[0].phase===3){if(!redSince)redSince=performance.now();if(performance.now()-redSince>1500){assert.equal(bots[0].room.open,false);loneChecked=true;console.log('PASS: one player on a plate cannot open the gate');}}
    if(bots.some(bot=>bot.room.open)&&!results.gateOpened){results.gateOpened=true;console.log('PASS: shared gate unlocked after both players physically reach their plates');}
    await sleep(70);
  }
  results.bothWon=true;
}finally{clearInterval(simulation);clearInterval(network);while(bots.some(bot=>bot.pending))await sleep(20);}
assert.ok(results.gateOpened);assert.ok(results.bothWon);assert.ok(results.maxReplayError<.000001,'prediction diverged before gate opening');
const views=await Promise.all(bots.map(bot=>api({action:'poll',code:a.room.code,token:bot.token})));assert.ok(views.every(v=>v.room.open&&v.room.won));assert.ok(views.every(v=>v.room.defeated===3),'both monsters must be stomped');assert.ok(views.every(v=>v.room.players.every(p=>p.hearts===3&&p.respawns===0)),'route must complete without damage or respawning');results.monstersDefeated=2;results.noDamage=true;
console.log('PASS: both clients observe the same unlocked door and victory');
const rejoin=await api({action:'join',code:a.room.code,token:b.token});assert.equal(rejoin.slot,1);assert.equal(rejoin.token,b.token);
const reset=await api({action:'restart',code:a.room.code,token:a.token});assert.equal(reset.room.epoch,1);assert.equal(reset.room.open,false);assert.equal(reset.room.won,false);assert.equal(reset.room.defeated,0);assert.ok(reset.room.players.every(p=>p.hearts===3));
const old=await api({action:'input',code:a.room.code,token:a.token,protocol:PROTOCOL,epoch:0,frames:[{n:1,dir:1,jump:1,hold:true}]});assert.equal(old.room.players[0].ack,0);
await api({action:'leave',code:a.room.code,token:b.token});const replacement=await api({action:'join',code:a.room.code});assert.equal(replacement.slot,1);assert.notEqual(replacement.token,b.token);
await api({action:'leave',code:a.room.code,token:a.token});await api({action:'leave',code:a.room.code,token:replacement.token});
console.log('PASS: reconnect, restart, old-epoch rejection, leaving and replacement');
console.log('RESULT '+JSON.stringify(results));
