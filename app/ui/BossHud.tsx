import {bossObjective,createBoss,nextLurer} from "../lib/boss";
import type {PublicRoom} from "../lib/game";
const labels={ready:"等待引诱",warning:"落点已锁定",slam:"震地冲击",weak:"护盾破绽",rest:"交换职责",defeated:"合作击破"};
export function BossHud({room,slot}:{room:PublicRoom|null;slot:number}){
  const b=room?.boss??createBoss(),lurer=b.phase==="rest"?nextLurer(b):b.lurer??nextLurer(b);
  return <section className={"boss-hud phase-"+b.phase} aria-label="Boss挑战状态">
    <div><b>苔石守卫</b><span className="boss-health" aria-label={"Boss剩余生命 "+b.hp+" / 3"}>{"◆".repeat(b.hp)}<i>{"◇".repeat(3-b.hp)}</i></span><strong role="status">{labels[b.phase]}{b.timer>0&&" · "+Math.ceil(b.timer)+"s"}</strong></div>
    <p>{b.hp===0?"两人一起去右侧旗帜":room?.players.some(p=>p?.downed)?"队友待救援 · 战斗暂停":lurer===null?"任意一人引诱，另一人跳踩":<><span className={"role-p"+lurer}>P{lurer+1} 引诱</span><span>→</span><span className={"role-p"+(1-lurer)}>P{2-lurer} 跳踩</span>{slot===lurer?" · 你负责引诱":" · 你负责跳踩"}</>}</p>
    <span className="sr-only">{bossObjective(room,slot)}</span>
  </section>;
}
