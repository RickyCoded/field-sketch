import type { Point, SketchObject } from '../types';

export interface SnapSegment { start:Point;end:Point }
export interface SnapResult { x:number;y:number;snapped:boolean }

const anchors=(object:Pick<SketchObject,'x'|'y'|'width'|'height'>):Point[]=>[
  {x:object.x,y:object.y},{x:object.x+object.width/2,y:object.y},{x:object.x+object.width,y:object.y},
  {x:object.x,y:object.y+object.height/2},{x:object.x+object.width/2,y:object.y+object.height/2},{x:object.x+object.width,y:object.y+object.height/2},
  {x:object.x,y:object.y+object.height},{x:object.x+object.width/2,y:object.y+object.height},{x:object.x+object.width,y:object.y+object.height},
];

export const objectSnapSegments=(object:SketchObject):SnapSegment[]=>{
  const a={x:object.x,y:object.y},b={x:object.x+object.width,y:object.y},c={x:object.x+object.width,y:object.y+object.height},d={x:object.x,y:object.y+object.height};
  return [{start:a,end:b},{start:b,end:c},{start:c,end:d},{start:d,end:a}];
};

const nearestPoint=(point:Point,segment:SnapSegment):Point=>{
  const vx=segment.end.x-segment.start.x,vy=segment.end.y-segment.start.y,length2=vx*vx+vy*vy;
  if(!length2)return segment.start;
  const t=Math.max(0,Math.min(1,((point.x-segment.start.x)*vx+(point.y-segment.start.y)*vy)/length2));
  return{x:segment.start.x+t*vx,y:segment.start.y+t*vy};
};

/** Moves the nearest plan-view anchor onto a nearby feature segment. */
export function snapObjectToSegments(object:Pick<SketchObject,'x'|'y'|'width'|'height'>,segments:SnapSegment[],threshold=10):SnapResult{
  let best:{dx:number;dy:number;distance:number}|undefined;
  for(const anchor of anchors(object))for(const segment of segments){const point=nearestPoint(anchor,segment),dx=point.x-anchor.x,dy=point.y-anchor.y,distance=Math.hypot(dx,dy);if(distance<=threshold&&(!best||distance<best.distance))best={dx,dy,distance}}
  return best?{x:object.x+best.dx,y:object.y+best.dy,snapped:true}:{x:object.x,y:object.y,snapped:false};
}
