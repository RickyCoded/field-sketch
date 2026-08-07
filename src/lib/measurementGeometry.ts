import type { MeasurementPrecision, MeasurementSegment, MeasuredStructure, Point } from '../types';

export interface CalculatedSegment {
  segment: MeasurementSegment; start: Point; end: Point; angle: number;
}

export interface StructureGeometry {
  points: Point[]; segments: CalculatedSegment[]; closureError: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Resolves absolute bearings and relative left/right turns into a stable path. */
export function calculateStructure(structure: MeasuredStructure, pixelsPerFoot = 8): StructureGeometry {
  const points: Point[] = [{ ...structure.startPoint }];
  const calculated: CalculatedSegment[] = [];
  let currentAngle = 0;
  for (const segment of structure.segments) {
    if (segment.adjustedAngle !== undefined) currentAngle = normalizeAngle(segment.adjustedAngle);
    else if (segment.directionMode === 'absolute') currentAngle = normalizeAngle(segment.angle ?? currentAngle);
    else {
      const turn = segment.turn === 'left' ? -1 : 1;
      currentAngle = normalizeAngle(currentAngle + turn * (segment.turnAngle ?? 90));
    }
    const start = points.at(-1)!;
    const length = Math.max(0, segment.adjustedLength ?? segment.length) * pixelsPerFoot;
    const radians = degreesToRadians(currentAngle);
    const end = { x: start.x + Math.cos(radians) * length, y: start.y + Math.sin(radians) * length };
    points.push(end); calculated.push({ segment, start, end, angle: currentAngle });
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { points, segments: calculated, closureError: points.length > 1 ? distance(points[0], points.at(-1)!) / pixelsPerFoot : 0,
    bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) } };
}

export function structureClosure(structure: MeasuredStructure, pixelsPerFoot=8){const geometry=calculateStructure(structure,pixelsPerFoot);const start=geometry.points[0],end=geometry.points.at(-1)!;const horizontal=(end.x-start.x)/pixelsPerFoot,vertical=(end.y-start.y)/pixelsPerFoot;return{horizontal,vertical,distance:Math.hypot(horizontal,vertical),geometry};}

export function clearClosureAdjustments(structure:MeasuredStructure):MeasuredStructure{return hydrateStructureCoordinates({...structure,segments:structure.segments.map(({adjustedLength: _l,adjustedAngle:_a,adjustmentMethod:_m,adjustmentAmount:_n,originalLength:_ol,originalAngle:_oa,...segment})=>segment as MeasurementSegment)});}

export function snapStructureClosed(structure:MeasuredStructure,pixelsPerFoot=8):MeasuredStructure{if(!structure.segments.length)return structure;const base=clearClosureAdjustments(structure),g=calculateStructure(base,pixelsPerFoot),lastIndex=base.segments.length-1,start=g.points[0],penultimate=g.points[lastIndex],dx=start.x-penultimate.x,dy=start.y-penultimate.y,newLength=Math.hypot(dx,dy)/pixelsPerFoot,newAngle=normalizeAngle(Math.atan2(dy,dx)*180/Math.PI);return hydrateStructureCoordinates({...base,closed:true,segments:base.segments.map((segment,index)=>index===lastIndex?{...segment,originalLength:segment.length,originalAngle:g.segments[index].angle,adjustedLength:newLength,adjustedAngle:newAngle,adjustmentMethod:'snap-closed',adjustmentAmount:newLength-segment.length}:segment)});}

export function distributeStructureClosure(structure:MeasuredStructure,pixelsPerFoot=8):MeasuredStructure{const base=clearClosureAdjustments(structure),g=calculateStructure(base,pixelsPerFoot);if(!g.segments.length)return base;const end=g.points.at(-1)!,start=g.points[0],errorX=end.x-start.x,errorY=end.y-start.y,total=g.segments.reduce((sum,item)=>sum+item.segment.length,0)||1;const segments=base.segments.map((segment,index)=>{const item=g.segments[index],weight=segment.length/total,dx=item.end.x-item.start.x-errorX*weight,dy=item.end.y-item.start.y-errorY*weight,adjustedLength=Math.hypot(dx,dy)/pixelsPerFoot,adjustedAngle=normalizeAngle(Math.atan2(dy,dx)*180/Math.PI);return{...segment,originalLength:segment.length,originalAngle:item.angle,adjustedLength,adjustedAngle,adjustmentMethod:'distributed' as const,adjustmentAmount:adjustedLength-segment.length}});return hydrateStructureCoordinates({...base,closed:true,segments});}

export function formatFeet(value: number, precision: MeasurementPrecision = 'hundredth') {
  const digits = precision === 'whole' ? 0 : precision === 'tenth' ? 1 : 2;
  return `${Number(value.toFixed(digits))}'`;
}

export type MeasurementParseResult = { ok: true; value: number } | { ok: false; message: string; requiresConfirmation?: boolean; value?: number };
export function parseFeetInput(input: string, maxWithoutConfirmation = 1000): MeasurementParseResult {
  const normalized = input.trim().replace(/'$/, '').trim();
  if (!normalized || !/^\d+(?:\.\d*)?$/.test(normalized)) return { ok:false, message:'Enter a numeric measurement in decimal feet.' };
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok:false, message:'Enter a valid measurement.' };
  if (value <= 0) return { ok:false, message:'Wall length must be greater than zero.' };
  if (value > maxWithoutConfirmation) return { ok:false, message:`${value}' is unusually large. Confirm to use it.`, requiresConfirmation:true, value };
  return { ok:true, value };
}

/** Recomputes one segment from a moved endpoint; useful for future point handles. */
export function segmentFromEndpoint(segment: MeasurementSegment, start: Point, end: Point, pixelsPerFoot = 8): MeasurementSegment {
  const dx = end.x-start.x, dy = end.y-start.y;
  const length=Math.hypot(dx,dy)/pixelsPerFoot; return { ...segment, directionMode: 'absolute', length, angle: normalizeAngle(Math.atan2(dy,dx)*180/Math.PI), label: formatFeet(length), measurementText:String(length), startCoordinate:start, endCoordinate:end, labelPosition:{x:(start.x+end.x)/2,y:(start.y+end.y)/2},updatedAt:new Date().toISOString(),measurementSource:'canvas-adjustment' };
}

/** Refreshes stored coordinate metadata without changing measurement instructions. */
export function hydrateStructureCoordinates(structure: MeasuredStructure): MeasuredStructure {
  const geometry=calculateStructure(structure); return { ...structure, segments: structure.segments.map((segment,index)=>{const calculated=geometry.segments[index];return {...segment,startCoordinate:calculated.start,endCoordinate:calculated.end,labelPosition:{x:(calculated.start.x+calculated.end.x)/2,y:(calculated.start.y+calculated.end.y)/2}}}) };
}

/** Returns pairs of non-adjacent walls that cross. Shared endpoints are ignored. */
export function structureSelfIntersections(structure: MeasuredStructure, pixelsPerFoot=8): Array<[number,number]> {
  const segments=calculateStructure(structure,pixelsPerFoot).segments;
  const crosses=(a:CalculatedSegment,b:CalculatedSegment)=>{
    const orient=(p:Point,q:Point,r:Point)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    const a1=orient(a.start,a.end,b.start),a2=orient(a.start,a.end,b.end),b1=orient(b.start,b.end,a.start),b2=orient(b.start,b.end,a.end);
    return a1*a2 < 0 && b1*b2 < 0;
  };
  const found:Array<[number,number]>=[];
  for(let i=0;i<segments.length;i+=1)for(let j=i+1;j<segments.length;j+=1){
    const adjacent=j===i+1||(structure.closed&&i===0&&j===segments.length-1);
    if(!adjacent&&crosses(segments[i],segments[j]))found.push([i,j]);
  }
  return found;
}
