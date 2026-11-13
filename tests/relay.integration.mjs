import assert from 'node:assert/strict';
import {Prediction} from '../app/lib/prediction.ts';
import {PROTOCOL,STEP,worldFrom} from '../app/lib/game.ts';
import {driveRelay} from './relay-driver.mjs';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const extra=Number(process.env.TEST_LATENCY_MS||0),jitter=Number(process.env.TEST_JITTER_MS||0),dropEnabled=process.env.TEST_DROP_RESPONSE==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let calls=0;
const results={origin,extraRoundTripMs:extra,jitterMs:jitter,droppedResponses:0,duplicateRequests:0,maxStableReplayError:0,stableReplaySamples:0,authoritativeCorrections:0,maxRoundTripMs:0,lift:false,bridge:false,checkpoint:false,rescue:false,manualCheckpoint:false,teamWipe:false,bothWon:false};
async function api(body,expected=200,network=false){const delay=network?extra/2+(calls++%4)*jitter/3:0;await sleep(delay);const start=performance.now();const res=await fetch(origin+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const value=await res.json();await sleep(delay);results.maxRoundTripMs=Math.max(results.maxRoundTripMs,Math.round(performance.now()-start+delay));assert.equal(res.status,expected,value.error||'HTTP status');return value;}
const a=await api({action:'create',level:'relay'}),b=await api({action:'join',code:a.room.code});assert.equal(a.room.level,'relay');
await api({action:'checkpoint',code:a.room.code,token:a.token},400);
await api({action:'join',code:a.room.code},409);
const bots=[a,b].map((r,slot)=>{const prediction=new Prediction();prediction.reset({...b.room.players[slot],token:r.token},b.room.defeated,worldFrom(b.room));return {slot,token:r.token,room:b.room,prediction,jump:0,firstJump:false,finishJump:false,pending:false,lastGood:performance.now(),sent:0,dropped:false};});
let mission={phase:'intro',manualEpoch:0},paused=false,failure=null,acc=0,last=performance.now();const deadline=last+Number(process.env.TEST_LIMIT_MS||120000);
const latest=()=>bots.map(b=>b.room).sort((a,b)=>b.epoch-a.epoch||b.revision-a.revision)[0];
function accept(bot,r){
  const old=bot.room;
  if(r.room.epoch<old.epoch||(r.room.epoch===old.epoch&&r.room.revision<old.revision))return;
  const p={...r.room.players[bot.slot],token:bot.token},before={...bot.prediction.player};
  if(old.epoch!==r.room.epoch){
    bot.prediction.reset(p,r.room.defeated,worldFrom(r.room));bot.jump=p.jump;bot.firstJump=false;bot.finishJump=false;
  }else{
    bot.prediction.reconcile(p,r.room.open,r.room.defeated,worldFrom(r.room));
    const after=bot.prediction.player;
    if(before.generation===p.generation&&!before.riding&&!p.riding&&!before.downed&&!p.downed&&old.bridgeOpened===r.room.bridgeOpened&&old.open===r.room.open){
      const delta=Math.max(Math.abs(after.x-before.x),Math.abs(after.y-before.y));
      // A teammate defeating an enemy changes collision results. Winning freezes the room.
      // Keep those authoritative corrections separate from deterministic movement samples.
      if(r.room.won||old.defeated!==r.room.defeated){
        if(delta>.000001){results.authoritativeCorrections++;results.correctionSample={slot:bot.slot,delta,oldDefeated:old.defeated,newDefeated:r.room.defeated,oldWon:old.won,newWon:r.room.won};}
      }else{
        results.stableReplaySamples++;
        if(delta>results.maxStableReplayError){results.maxStableReplayError=delta;results.replaySample={slot:bot.slot,before:{x:before.x,y:before.y,g:before.generation},server:{x:p.x,y:p.y,g:p.generation,ack:p.ack},after:{x:after.x,y:after.y},oldDefeated:old.defeated,newDefeated:r.room.defeated,oldWon:old.won,newWon:r.room.won};}
      }
    }
  }
  bot.room=r.room;bot.lastGood=performance.now();
}
async function send(bot){if(paused||bot.pending)return;bot.pending=true;try{const frames=bot.prediction.frames.map(f=>({...f}));const body={action:'input',code:a.room.code,token:bot.token,protocol:PROTOCOL,connection:bot.room.players[bot.slot].connection,epoch:bot.room.epoch,frames};const r=await api(body,200,true);bot.sent++;
  if(dropEnabled&&bot.slot===1&&!bot.dropped&&frames.some(f=>f.use)){bot.dropped=true;results.droppedResponses++;return;}
  accept(bot,r);if(bot.sent===3){accept(bot,await api(body));results.duplicateRequests++;}
}catch(e){failure=e;}finally{bot.pending=false;}}
const sim=setInterval(()=>{const now=performance.now();if(paused){last=now;acc=0;return;}acc+=Math.min((now-last)/1000,.1);last=now;while(acc>=STEP){for(const bot of bots)if(bot.room.players.every(p=>p?.online)&&!bot.room.won&&now-bot.lastGood<2500){const c=driveRelay(bot,mission);bot.prediction.record(c.dir,c.jump,bot.room.open,c.hold,c.use);}acc-=STEP;}},8);
const net=setInterval(()=>{for(const bot of bots)void send(bot);},90);
try{
  while(!bots.every(b=>b.room.won)){
    if(failure)throw failure;assert.ok(performance.now()<deadline,'relay timed out: '+JSON.stringify({mission,room:latest(),bots:bots.map(b=>({slot:b.slot,p:b.prediction.player,queued:b.prediction.frames.length}))}));const r=latest();
    if(!results.lift&&r.lift.trips>0){results.lift=true;console.log('PASS: distinct operator powers the lift; rider exits onto upper ledge');}
    if(!results.bridge&&r.bridgeOpened){results.bridge=true;console.log('PASS: upper rider opens the lower route for the operator');}
    if(!results.checkpoint&&r.checkpoint){results.checkpoint=true;console.log('PASS: checkpoint activated and shared');}
    if(mission.phase==='intro'&&r.checkpoint&&r.players.every(p=>p.grounded&&p.x>650&&p.x<730))mission.phase='rescue';
    if(mission.phase==='rescue'&&r.rescues>=1){
      results.rescue=true;console.log('PASS: physical pit fall and held teammate rescue');paused=true;while(bots.some(b=>b.pending))await sleep(20);
      const reset=await api({action:'checkpoint',code:a.room.code,token:a.token});assert.ok(reset.room.bridgeOpened&&reset.room.checkpoint);assert.deepEqual(reset.room.players.map(p=>p.x),[666,704]);assert.ok(reset.room.players.every(p=>!p.downed&&p.hearts===3));for(const bot of bots)accept(bot,reset);results.manualCheckpoint=true;mission={phase:'wipe',manualEpoch:reset.room.epoch};paused=false;console.log('PASS: both players restored at checkpoint with relay progress retained');
    }
    if(mission.phase==='wipe'&&latest().epoch>mission.manualEpoch){results.teamWipe=true;mission.phase='finish';console.log('PASS: both players fall and automatically recover at the checkpoint');}
    await sleep(70);
  }
  results.bothWon=true;
}finally{paused=true;clearInterval(sim);clearInterval(net);while(bots.some(b=>b.pending))await sleep(20);}
const views=await Promise.all(bots.map(bot=>api({action:'poll',code:a.room.code,token:bot.token})));assert.ok(views.every(v=>v.room.won&&v.room.open&&v.room.checkpoint&&v.room.bridgeOpened));assert.ok(views.every(v=>v.room.rescues===1&&v.room.wipes===2));assert.ok(views.every(v=>v.room.players.every(p=>!p.downed&&p.hearts>0&&p.x>1060)));assert.ok(results.stableReplaySamples>=10,'not enough stable movement samples: '+results.stableReplaySamples);assert.ok(results.maxStableReplayError<.000001,'stable input replay drifted: '+JSON.stringify(results.replaySample));assert.ok(Object.entries(results).filter(([k])=>['lift','bridge','checkpoint','rescue','manualCheckpoint','teamWipe','bothWon'].includes(k)).every(([,v])=>v));
console.log('PASS: both clients agree on final cooperative gate and victory');
const reconnect=await api({action:'join',code:a.room.code,token:b.token});assert.equal(reconnect.slot,1);
const reset=await api({action:'restart',code:a.room.code,token:a.token});assert.equal(reset.room.checkpoint,false);assert.equal(reset.room.bridgeOpened,false);assert.equal(reset.room.rescues,0);
for(const bot of bots)await api({action:'leave',code:a.room.code,token:bot.token});
console.log('RESULT '+JSON.stringify(results));
