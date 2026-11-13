import {LEVEL_ORDER} from "./maps.ts";
import type {Level,Room,PublicRoom} from "./game.ts";
export const JOURNEY_ORDER:readonly Level[]=[...LEVEL_ORDER,"boss"];
type RouteRoom=Pick<Room,"campaign"|"journey"|"level">;
export function routeFor(room:Pick<RouteRoom,"journey">):readonly Level[]{return room.journey?JOURNEY_ORDER:LEVEL_ORDER;}
export function nextLevel(room:RouteRoom):Level|null{if(!room.campaign)return null;const route=routeFor(room),i=route.indexOf(room.level);return i<0?null:route[i+1]??null;}
export function finalStage(room:RouteRoom){return !room.campaign||nextLevel(room)===null;}
export function adventureTitle(room:Pick<Room|PublicRoom,"journey">){return room.journey?"四关完整冒险":"三关冒险";}
