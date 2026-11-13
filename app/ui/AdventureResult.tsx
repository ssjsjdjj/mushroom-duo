import {adventureTitle,finalStage,nextLevel} from "../lib/adventure";
import {BADGES} from "../lib/records";
import type {ProgressSnapshot} from "../lib/progress-store";
import {LEVEL_NAMES,countCoins,coinsFor,type PublicRoom} from "../lib/game";
import {useState} from "react";
import {formatTime,resultText} from "../lib/session";
export function AdventureResult({room,slot,busy,progress,onNext,onRestart,onLeave}:{room:PublicRoom;slot:number;busy:boolean;progress:ProgressSnapshot;onNext:()=>void;onRestart:()=>void;onLeave:()=>void}){
  const boss=room.level==="boss",complete=room.campaign&&finalStage(room),next=nextLevel(room),title=adventureTitle(room),receipt=progress.receipt?.id===room.runId?progress.receipt:null;
  const [copyState,setCopyState]=useState(""),[copyFallback,setCopyFallback]=useState(false);
  const total=room.results.reduce((s,r)=>s+r.coins,0),possible=room.results.reduce((s,r)=>s+r.totalCoins,0);
  const sharedText=resultText(room.results,LEVEL_NAMES,complete?"蘑菇搭档 · "+title+"合作成绩":boss?"蘑菇搭档 · 双人 Boss 合作成绩":"蘑菇搭档 · 合作成绩");
  const copyResult=async()=>{try{await navigator.clipboard.writeText(sharedText);setCopyState("合作成绩已复制");}catch{setCopyFallback(true);setCopyState("长按下方文字即可复制保存");}};
  return <div className="win-overlay"><section className={"win-card "+(complete?"adventure-result":"")} role="dialog" aria-modal="true" aria-label={complete?title+"结算":boss?"双人Boss挑战结算":"关卡完成"}>
    <span className="win-symbol">✦</span><div className="eyebrow">BETTER TOGETHER</div>
    <h2>{complete?title+"，携手完成！":boss?"苔石守卫，合作击破！":LEVEL_NAMES[room.level]+"，合作成功！"}</h2>
    {complete?<><div className="result-award">{total===possible?"✦ 金币全收集搭档":"✦ 默契通关搭档"}</div><div className="result-totals"><span><b>{total}</b> / {possible} 枚金币</span><span><b>{formatTime(room.results.reduce((s,r)=>s+r.seconds,0))}</b> 合作时光</span></div><div className="result-rows" aria-label={title+"成绩"}>{room.results.map((r,i)=><div key={r.level}><span>{String(i+1).padStart(2,"0")} · {LEVEL_NAMES[r.level]}</span><span>{r.coins}/{r.totalCoins} 金币 · {formatTime(r.seconds)}</span></div>)}</div><p>救援 {room.results.reduce((s,r)=>s+r.rescues,0)} 次 · 检查点重试 {room.results.reduce((s,r)=>s+r.wipes,0)} 次</p></>:<p>共享金币 {countCoins(room.coins)} / {coinsFor(room.level).length} 枚<br/>这一关，两个人用了 {formatTime(room.elapsed)}。</p>}
    {room.level==="factory"&&<p className="boss-result">P{room.factory.finder!+1}取钥匙 → P{room.factory.deliveredBy!+1}接力开锁<br/>救援 {room.rescues} 次 · 箱子复位 {room.factory.resets} 次</p>}
    {boss&&!complete&&<p className="boss-result">交替配合 {room.boss.hits.length} 次 · 救援 {room.rescues} 次<br/>{room.boss.hits.map((hit,i)=>`${i+1}. P${hit.lurer+1}引诱 → P${hit.attacker+1}跳踩`).join(" · ")}</p>}
    {receipt&&<div className="record-receipt" role="status"><b>{progress.available?"✓ 本机已记录":"本次成绩可复制"}</b>{receipt.isNew&&(receipt.bestTime||receipt.bestCoins)&&<span>{[receipt.bestTime?"最好用时更新":"",receipt.bestCoins?"最高金币更新":""].filter(Boolean).join(" · ")}</span>}{receipt.badges.length>0&&<small>新成就：{receipt.badges.map(id=>BADGES.find(b=>b.id===id)!.name).join("、")}</small>}</div>}
    {next?<><button className="primary" disabled={busy||room.nextReady[slot]||!room.players.every(p=>p?.online)} onClick={onNext}>{room.nextReady[slot]?"你已准备，等待搭档":"准备前往 · "+LEVEL_NAMES[next]}</button><p className="next-status" role="status">{!room.players[1-slot]?.online?"搭档暂离，回来后再一起出发。":room.nextReady[1-slot]?"搭档已准备好，等你一起出发。":"两人都准备好后，继续下一关。"}</p></>:<><button className="primary" disabled={busy||room.nextReady[slot]||!room.players.every(p=>p?.online)} onClick={onRestart}>{room.nextReady[slot]?"你已准备，等待搭档":complete?"准备再来一趟"+title:boss?"准备再战双人 Boss":"准备再合作一次"}</button><p className="next-status" role="status">{!room.players[1-slot]?.online?"搭档暂离，回来后一起开始。":room.nextReady[1-slot]?"搭档已准备好，等你一起出发。":"两人都准备好后，开始下一趟。"}</p></>}
    {finalStage(room)&&<><button className="text-button copy-result" onClick={()=>void copyResult()}>复制合作成绩</button>{copyState&&<p role="status">{copyState}</p>}{copyFallback&&<textarea className="copy-result-text" readOnly aria-label="可复制的合作成绩" value={sharedText} onFocus={e=>e.target.select()}/>}</>}
    <button className="text-button" onClick={onLeave}>返回首页{finalStage(room)?"看手账":""}</button>
  </section></div>;
}
