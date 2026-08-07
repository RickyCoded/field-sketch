import type { DimensionLabel, Point } from '../types';
const overlaps=(a:Point,b:Point)=>Math.abs(a.x-b.x)<70&&Math.abs(a.y-b.y)<24;
export function placeDimensionLabel(candidate:Point,existing:DimensionLabel[]):Point{let result={...candidate},attempts=0;while(existing.some(x=>x.visible&&overlaps(result,x.manualPosition??x.labelPosition))&&attempts++<8)result={x:result.x,y:result.y+24};return result}
