import {BADGES,MODE_NAMES,MODE_COINS,MODES} from "../lib/records";
import type {ProgressSnapshot} from "../lib/progress-store";
import {formatTime} from "../lib/session";
export function ProgressJournal({snapshot}:{snapshot:ProgressSnapshot}){
  const p=snapshot.progress,total=MODES.reduce((n,m)=>n+p.stats[m].clears,0),journey=p.stats.journey;
  return <section className="progress-journal" aria-label="本机冒险手账"><header><div><span className="eyebrow">OUR LITTLE ADVENTURE JOURNAL</span><h2>每一次合作，都留下足迹。</h2></div><span className="journal-label">本机记录</span></header>
    <div className="journal-summary"><div><b>{total}</b><span>合作通关</span></div><div><b>{journey.bestSeconds===null?"—":formatTime(journey.bestSeconds)}</b><span>四关最好用时</span></div><div><b>{journey.bestCoins===null?"—":journey.bestCoins}<small> / {MODE_COINS.journey}</small></b><span>四关最高金币</span></div><div><b>{p.badges.length}<small> / {BADGES.length}</small></b><span>合作成就</span></div></div>
    <div className="journal-badges" aria-label="合作成就">{BADGES.map(b=>{const unlocked=p.badges.includes(b.id);return <div className={unlocked?"unlocked":"locked"} key={b.id} aria-label={b.name+"，"+(unlocked?"已解锁":"未解锁")+"，"+b.description}><span aria-hidden="true">{unlocked?"✦":"◇"}</span><div><b>{b.name}</b><small>{b.description}</small></div></div>;})}</div>
    <details className="journal-details"><summary>各模式最好成绩</summary><div>{MODES.map(mode=>{const s=p.stats[mode];return <p key={mode}><b>{MODE_NAMES[mode]}</b><span>{s.clears?`${s.clears}次 · ${formatTime(s.bestSeconds!)} · ${s.bestCoins}/${MODE_COINS[mode]}金币`:"等待第一次通关"}</span></p>;})}</div></details>
    <div className="recent-runs"><h3>最近的合作</h3>{p.recent.length?p.recent.slice(0,3).map(r=><div key={r.id}><b>{MODE_NAMES[r.mode]}</b><span>{formatTime(r.seconds)} · {r.coins}/{r.totalCoins}金币</span><small>{new Date(r.at).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"})}</small></div>):<p>第一次合作通关后，这里会留下你们的成绩。</p>}</div>
    <p className="journal-note" role="status">{!snapshot.ready?"正在读取本机记录…":snapshot.available?"记录保存在当前浏览器，两部手机分别保存。":"当前浏览器暂不能保存记录，本次成绩仍可复制。"}</p>
  </section>;
}
