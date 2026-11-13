export type Session={code:string;token:string;slot:number;connection?:number;epoch?:number;updatedAt?:number};
export function parseSession(value:string|null):Session|null {
  try{const s=JSON.parse(value||"null");return s&&typeof s.code==="string"&&/^\d{6}$/.test(s.code)&&typeof s.token==="string"&&s.token.length>=16&&(s.slot===0||s.slot===1)&&(s.connection===undefined||Number.isSafeInteger(s.connection)&&s.connection>=0)&&(s.epoch===undefined||Number.isSafeInteger(s.epoch)&&s.epoch>=0)?s:null;}catch{return null;}
}
export function formatTime(seconds:number){const whole=Math.max(0,Math.floor(seconds));return whole<60?`${whole}秒`:`${Math.floor(whole/60)}分${String(whole%60).padStart(2,"0")}秒`;}
export function resultText(results:{level:string;seconds:number;coins:number;totalCoins:number;rescues:number;wipes:number}[],names:Record<string,string>,title="蘑菇搭档 · 三关合作成绩"){
  return [title,...results.map((r,i)=>`${i+1}. ${names[r.level]}：${r.coins}/${r.totalCoins}金币，${formatTime(r.seconds)}`),`合计：${results.reduce((n,r)=>n+r.coins,0)}/${results.reduce((n,r)=>n+r.totalCoins,0)}金币，${formatTime(results.reduce((n,r)=>n+r.seconds,0))}`, `救援${results.reduce((n,r)=>n+r.rescues,0)}次，检查点重试${results.reduce((n,r)=>n+r.wipes,0)}次`].join("\n");
}
