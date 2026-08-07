import type { Point, RoadMeasurement } from '../types';
import { degreesToRadians } from './measurementGeometry';

export function roadGeometry(anchor:Point,widthFeet:number,lengthFeet:number,roadAngle:number,feetPerCanvasUnit=.125):Pick<RoadMeasurement,'curbA'|'curbB'|'labelPosition'> {
  const angle=degreesToRadians(roadAngle),along={x:Math.cos(angle),y:Math.sin(angle)},across={x:-along.y,y:along.x};
  const halfLength=lengthFeet/feetPerCanvasUnit/2,halfWidth=widthFeet/feetPerCanvasUnit/2;
  const point=(side:number,end:number)=>({x:anchor.x+across.x*halfWidth*side+along.x*halfLength*end,y:anchor.y+across.y*halfWidth*side+along.y*halfLength*end});
  return{curbA:{start:point(-1,-1),end:point(-1,1)},curbB:{start:point(1,-1),end:point(1,1)},labelPosition:{x:anchor.x+across.x*10,y:anchor.y+across.y*10}};
}

export function graphicalRoadWidth(road:RoadMeasurement,feetPerCanvasUnit=.125){const a={x:(road.curbA.start.x+road.curbA.end.x)/2,y:(road.curbA.start.y+road.curbA.end.y)/2},b={x:(road.curbB.start.x+road.curbB.end.x)/2,y:(road.curbB.start.y+road.curbB.end.y)/2};return Math.hypot(b.x-a.x,b.y-a.y)*feetPerCanvasUnit}
