export const LEVEL_ORDER = ["practice", "relay", "castle"] as const;
export const LEVEL_NAMES = {practice:"草地集合",relay:"地下接力",castle:"城堡会合",boss:"双人 Boss 挑战",factory:"机关工厂"};
export const CASTLE_PLATFORMS = [{x:200,y:388,w:100,h:22},{x:315,y:324,w:100,h:22},{x:430,y:260,w:160,h:22}];
export const CASTLE_BRIDGE = {x:590,y:260,w:340,h:22};
export const CASTLE_PIT = {x:580,w:210};
export const FERRY = {left:560,right:790,w:90,y:460,speed:95,dwell:1.2};
export const CASTLE_SWITCHES = [{x:535,y:260},{x:860,y:460}];
export const CASTLE_ENEMIES = [{id:0,x:380,y:434,w:32,h:26},{id:1,x:945,y:434,w:32,h:26}];
export const COINS = {
  factory:[{x:160,y:432},{x:275,y:432},{x:350,y:366},{x:432,y:273},{x:530,y:273},{x:700,y:432},{x:858,y:338},{x:975,y:432}],
  practice:[{x:240,y:361},{x:295,y:361},{x:430,y:297},{x:500,y:297},{x:560,y:407},{x:705,y:361},{x:765,y:361},{x:990,y:432}],
  relay:[{x:280,y:432},{x:375,y:270},{x:490,y:273},{x:600,y:273},{x:665,y:432},{x:784,y:350},{x:910,y:432},{x:980,y:432}],
  boss:[{x:240,y:432},{x:330,y:432},{x:550,y:361},{x:690,y:361},{x:795,y:290},{x:850,y:290},{x:950,y:432},{x:1070,y:432}],
  castle:[{x:240,y:361},{x:355,y:297},{x:480,y:233},{x:565,y:233},{x:620,y:432},{x:750,y:432},{x:850,y:432},{x:1050,y:432}],
};
export function coinsFor(level:keyof typeof COINS){return COINS[level];}
export function countCoins(mask:number){let count=0;for(let bits=mask>>>0;bits;bits>>>=1)count+=bits&1;return count;}
