import {ArrowRight,BookmarkCheck} from "lucide-react";
import {LEVEL_NAMES} from "../lib/game";
import type {SaveTicket} from "../lib/save";
export function AdventureSaveCard({ticket,busy,onRestore}:{ticket:SaveTicket;busy:boolean;onRestore:()=>void}){
  const mode=ticket.mode==="journey"?"四关完整冒险":ticket.mode==="campaign"?"三关冒险":"单关挑战";
  return <section className="adventure-save" aria-label={ticket.mode==="factory"?"上次的工厂接力":"上次的冒险"}><div className="save-symbol"><BookmarkCheck size={27}/></div><div className="save-copy"><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>{ticket.mode==="factory"?"工厂接力，还在等你。":"上次的冒险，还在等你。"}</h2><p>{mode} · {LEVEL_NAMES[ticket.level]} · {ticket.completed} 关完成 · {ticket.coins} 枚金币</p><small>从{ticket.checkpoint?"检查点":"本关起点"}恢复，保留原角色，重新邀请搭档。{ticket.level==="boss"?"Boss 从满血开始。":""}存档有效 7 天，仅限此浏览器。</small><time dateTime={new Date(ticket.updatedAt).toISOString()}>上次保存：{new Date(ticket.updatedAt).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time></div><button className="primary" disabled={busy} onClick={onRestore}>{busy?"正在恢复…":ticket.mode==="factory"?"继续机关工厂":"用存档创建房间"}<ArrowRight size={17}/></button></section>;
}
