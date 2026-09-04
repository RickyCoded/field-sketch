import type { MeasuredLot, MeasuredStructure, OffsetFeatureReference, Point, SketchObject } from '../types';
import { calculateStructure } from './measurementGeometry';

export interface FeatureLine {start:Point;end:Point}
export function resolveFeatureLine(ref:OffsetFeatureReference,structures:MeasuredStructure[],lots:MeasuredLot[],objects:SketchObject[]):FeatureLine|undefined{if(ref.kind==='structure-segment'){const structure=structures.find(x=>x.id===ref.objectId),segment=structure&&calculateStructure(structure).segments.find(x=>x.segment.id===ref.segmentId);return segment&&{start:segment.start,end:segment.end}}if(ref.kind==='structure-corner'){const structure=structures.find(x=>x.id===ref.objectId),point=structure&&calculateStructure(structure).points[Number(ref.segmentId)];return point&&{start:point,end:point}}if(ref.kind==='lot-side'){const lot=lots.find(x=>x.id===ref.objectId),index=lot?.sides.findIndex(x=>x.id===ref.segmentId)??-1;if(lot&&index>=0)return{start:lot.vertices[index],end:lot.vertices[(index+1)%lot.vertices.length]}}const object=objects.find(x=>x.id===ref.objectId);if(object)return{start:{x:object.x,y:object.y},end:{x:object.x+object.width,y:object.y}}}
const closestPoint=(p:Point,a:Point,b:Point)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return{x:a.x+t*dx,y:a.y+t*dy}}
export function calculateFeatureOffset(first:FeatureLine,second:FeatureLine,pixelsPerFoot=8){const mid={x:(first.start.x+first.end.x)/2,y:(first.start.y+first.end.y)/2},secondPoint=closestPoint(mid,second.start,second.end),firstPoint=closestPoint(secondPoint,first.start,first.end);return{value:Math.hypot(secondPoint.x-firstPoint.x,secondPoint.y-firstPoint.y)/pixelsPerFoot,firstAnchor:firstPoint,secondAnchor:secondPoint}}

export const objectBoundaryLines=(object:SketchObject):FeatureLine[]=>{const a={x:object.x,y:object.y},b={x:object.x+object.width,y:object.y},c={x:object.x+object.width,y:object.y+object.height},d={x:object.x,y:object.y+object.height};return[{start:a,end:b},{start:b,end:c},{start:c,end:d},{start:d,end:a}]};

/** Calculates a translation that puts the nearest edge/corner of an object at an exact offset. */
export function calculateObjectOffsetAdjustment(firstLines:FeatureLine[],object:SketchObject,desiredCanvasDistance:number,side:'left'|'right'){
  const objectLines=objectBoundaryLines(object),anchors=objectLines.flatMap(line=>[line.start,{x:(line.start.x+line.end.x)/2,y:(line.start.y+line.end.y)/2}]);
  let best:{first:Point;second:Point;distance:number;line:FeatureLine}|undefined;
  for(const line of firstLines)for(const second of anchors){const first=closestPoint(second,line.start,line.end),distance=Math.hypot(second.x-first.x,second.y-first.y);if(!best||distance<best.distance)best={first,second,distance,line}}
  const match=best!;let ux=(match.second.x-match.first.x)/(match.distance||1),uy=(match.second.y-match.first.y)/(match.distance||1);
  if(match.distance<.001){const dx=match.line.end.x-match.line.start.x,dy=match.line.end.y-match.line.start.y,length=Math.hypot(dx,dy)||1,sign=side==='left'?1:-1;ux=-dy/length*sign;uy=dx/length*sign}
  const amount=desiredCanvasDistance-match.distance,dx=ux*amount,dy=uy*amount;
  return{position:{x:object.x+dx,y:object.y+dy},delta:{x:dx,y:dy},currentDistance:match.distance,firstAnchor:match.first,secondAnchor:{x:match.second.x+dx,y:match.second.y+dy}};
}
