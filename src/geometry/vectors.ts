export const vector=(a:{x:number;y:number},b:{x:number;y:number})=>({x:b.x-a.x,y:b.y-a.y});
export const magnitude=(v:{x:number;y:number})=>Math.hypot(v.x,v.y);
