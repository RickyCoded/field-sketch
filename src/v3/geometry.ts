import type { ClosureResult, Degrees, DerivedPath, Feet, FrontAlignmentSolution, LineInstruction, OrientedLine, PointFt, SecondaryRoadSolution } from './types';

export const CLOSURE_TOLERANCE_FT=.30;
const EPSILON=.000001;
export const normalizeAngle=(angle:Degrees)=>((angle%360)+360)%360;
export const degreesToRadians=(degrees:Degrees)=>degrees*Math.PI/180;
export const radiansToDegrees=(radians:number)=>radians*180/Math.PI;
export const distance=(a:PointFt,b:PointFt)=>Math.hypot(b.x-a.x,b.y-a.y);
export const dot=(a:PointFt,b:PointFt)=>a.x*b.x+a.y*b.y;
export const subtract=(a:PointFt,b:PointFt):PointFt=>({x:a.x-b.x,y:a.y-b.y});
export const add=(a:PointFt,b:PointFt):PointFt=>({x:a.x+b.x,y:a.y+b.y});
export const scale=(point:PointFt,factor:number):PointFt=>({x:point.x*factor,y:point.y*factor});

const unit=(vector:PointFt):PointFt=>{const length=Math.hypot(vector.x,vector.y);if(length<EPSILON)throw new Error('A direction requires two different points.');return{x:vector.x/length,y:vector.y/length}};
const rotateVector=(vector:PointFt,degrees:Degrees):PointFt=>{const radians=degreesToRadians(degrees),cos=Math.cos(radians),sin=Math.sin(radians);return{x:vector.x*cos-vector.y*sin,y:vector.x*sin+vector.y*cos}};
const signedSmallestAngle=(degrees:Degrees)=>((degrees+180)%360+360)%360-180;

/** Rebuilds a measured path in feet. Positive angles turn clockwise on the plan-view canvas. */
export function reconstructPath(start:PointFt,instructions:LineInstruction[],initialAngle:Degrees=0):DerivedPath{
  const points=[{...start}],lines:DerivedPath['lines']=[];let currentAngle=normalizeAngle(initialAngle);
  for(const instruction of [...instructions].sort((a,b)=>a.sequence-b.sequence)){
    if(!Number.isFinite(instruction.length)||instruction.length<=0)throw new Error(`Segment ${instruction.sequence} must have a positive length.`);
    if(instruction.direction.mode==='absolute')currentAngle=normalizeAngle(instruction.direction.angle);
    else if(instruction.direction.turn!=='straight')currentAngle=normalizeAngle(currentAngle+(instruction.direction.turn==='right'?1:-1)*instruction.direction.angle);
    const segmentStart=points.at(-1)!,radians=degreesToRadians(currentAngle),end={x:segmentStart.x+Math.cos(radians)*instruction.length,y:segmentStart.y+Math.sin(radians)*instruction.length};
    points.push(end);lines.push({instructionId:instruction.id,start:segmentStart,end,angle:currentAngle});
  }
  return{points,lines,finalAngle:currentAngle};
}

export function lineFromPoints(start:PointFt,end:PointFt,normalSide:'left'|'right'='right'):OrientedLine{
  const direction=unit(subtract(end,start));
  const left={x:direction.y,y:-direction.x},right={x:-direction.y,y:direction.x};
  return{origin:{...start},direction,normal:normalSide==='left'?left:right};
}

export const pointOnLine=(line:OrientedLine,station:Feet):PointFt=>add(line.origin,scale(line.direction,station));
export const perpendicularOffset=(line:OrientedLine,station:Feet,offset:Feet):PointFt=>add(pointOnLine(line,station),scale(line.normal,offset));

export function pointAlongSegment(start:PointFt,end:PointFt,distanceFrom:Feet,measuredFrom:'start'|'end'='start'){
  const length=distance(start,end);if(distanceFrom<0||distanceFrom>length+EPSILON)throw new Error(`Reference distance ${distanceFrom}' exceeds the ${length}' segment.`);
  const origin=measuredFrom==='start'?start:end,target=measuredFrom==='start'?end:start,direction=unit(subtract(target,origin));return add(origin,scale(direction,distanceFrom));
}

/** Rotates the complete provisional front rigidly about Corner A to satisfy the Corner B curb tie. */
export function solveFrontAlignment(cornerA:PointFt,provisionalPoints:PointFt[],curbNormal:PointFt,offsetA:Feet,offsetB:Feet):FrontAlignmentSolution[]{
  if(provisionalPoints.length<2)throw new Error('The front path needs at least one measured segment.');
  const normal=unit(curbNormal),vector=subtract(provisionalPoints.at(-1)!,cornerA),radius=Math.hypot(vector.x,vector.y),difference=offsetB-offsetA;
  if(radius<EPSILON)throw new Error('Corner A and Corner B cannot occupy the same point.');
  if(Math.abs(difference)>radius+EPSILON)throw new Error('The measured front cannot reach the Corner B curb offset.');
  const normalAngle=radiansToDegrees(Math.atan2(normal.y,normal.x)),vectorAngle=radiansToDegrees(Math.atan2(vector.y,vector.x)),deviation=radiansToDegrees(Math.acos(Math.max(-1,Math.min(1,difference/radius))));
  const rotations=[normalAngle+deviation-vectorAngle,normalAngle-deviation-vectorAngle].map(signedSmallestAngle);
  const unique=[...new Set(rotations.map(value=>Number(value.toFixed(10))))];
  return unique.map(rotation=>{const points=provisionalPoints.map(point=>add(cornerA,rotateVector(subtract(point,cornerA),rotation)));return{rotation,points,cornerB:points.at(-1)!}}).sort((a,b)=>Math.abs(a.rotation)-Math.abs(b.rotation));
}

/** Solves the two possible side-road curb lines from two fixed house corners and perpendicular ties. */
export function solveSecondaryRoad(point1:PointFt,point2:PointFt,offset1:Feet,offset2:Feet):SecondaryRoadSolution[]{
  const vector=subtract(point2,point1),length=Math.hypot(vector.x,vector.y),difference=offset2-offset1;
  if(length<EPSILON)throw new Error('Choose two different house corners.');
  if(Math.abs(difference)>length+EPSILON)throw new Error('The selected corners and curb offsets cannot define a perpendicular curb line.');
  const along=unit(vector),ratio=Math.max(-1,Math.min(1,difference/length)),perpendicular={x:-along.y,y:along.x},factor=Math.sqrt(Math.max(0,1-ratio*ratio));
  const normals=[add(scale(along,ratio),scale(perpendicular,factor)),add(scale(along,ratio),scale(perpendicular,-factor))];
  const unique=normals.filter((normal,index)=>index===0||distance(normal,normals[0])>EPSILON);
  return unique.map(normal=>{const origin=add(point1,scale(normal,-offset1)),direction={x:normal.y,y:-normal.x},lineConstant=dot(normal,origin);return{origin,direction,normal,lineConstant}});
}

export function calculateClosure(points:PointFt[],zeroTolerance=.005):ClosureResult{
  if(points.length<2)return{horizontalError:0,verticalError:0,directError:0,status:'closed'};
  const start=points[0],end=points.at(-1)!,horizontalError=end.x-start.x,verticalError=end.y-start.y,directError=Math.hypot(horizontalError,verticalError),status=directError<=zeroTolerance?'closed':directError<=CLOSURE_TOLERANCE_FT?'within-field-tolerance':'outside-field-tolerance';
  return{horizontalError,verticalError,directError,status};
}
