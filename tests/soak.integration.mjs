import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const started=Date.now(),duration=Number(process.env.TEST_SOAK_MS||900000);let campaigns=0;
while(Date.now()-started<duration){
  const child=spawn(process.execPath,['--experimental-strip-types','tests/campaign.integration.mjs'],{cwd:process.cwd(),env:{...process.env,TEST_LATENCY_MS:'0',TEST_JITTER_MS:'0',TEST_DROP_RESPONSE:'0'},stdio:['ignore','pipe','pipe']});let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',part=>{output+=part;});
  const code=await new Promise(resolve=>child.on('close',resolve));if(code!==0){console.log(output.slice(-6000));assert.equal(code,0,'campaign failed during stability run');}
  campaigns++;console.log('PASS: stability campaign '+campaigns+', elapsed '+Math.floor((Date.now()-started)/1000)+'s');
}
console.log('RESULT '+JSON.stringify({origin:process.env.TEST_ORIGIN||'http://127.0.0.1:5173',campaigns,completedLevels:campaigns*3,elapsedSeconds:Math.floor((Date.now()-started)/1000),minimumSeconds:duration/1000}));
