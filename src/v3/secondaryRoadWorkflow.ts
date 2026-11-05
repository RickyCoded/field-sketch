import { add, distance, dot, radiansToDegrees, scale, solveSecondaryRoad, subtract } from './geometry';
import { resolveFeatureSegment } from './featureWorkflow';
import { derivePrimaryCurbLines } from './roadWorkflow';
import type { CurbTieV3, FeaturePointReference, OrientedLine, PointFt, ProjectV3, RoadReferenceV3, SecondaryRoadSolution } from './types';

const EPSILON=.000001,id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();

export interface SecondaryRoadInput {
  name?:string;width:number;visibleLength:number;firstCorner:FeaturePointReference;firstDistance:number;firstEnteredText:string;
  secondCorner:FeaturePointReference;secondDistance:number;secondEnteredText:string;verified?:boolean;notes?:string;
  showApproximateCurbReturn?:boolean;visualCurbRadius?:number;
}

export interface SecondaryRoadPreview {solutions:SecondaryRoadSolution[];firstPoint:PointFt;secondPoint:PointFt}

/** Resolves a stable feature corner. A segment ID permits any measured corner, not just the path endpoints. */
export function resolveFeaturePointReference(project:ProjectV3,reference:FeaturePointReference):PointFt{
  if(reference.segmentId){const line=resolveFeatureSegment(project,reference.featureId,reference.segmentId);return reference.pointRole==='start'?{...line.start}:{...line.end}}
  const feature=project.features.find(item=>item.id===reference.featureId);if(!feature)throw new Error('The selected corner feature cannot be found.');
  if(!feature.segments.length)throw new Error('The selected feature has no measured corners.');
  const segment=reference.pointRole==='start'?feature.segments[0]:feature.segments.at(-1)!;
  const line=resolveFeatureSegment(project,reference.featureId,segment.id);return reference.pointRole==='start'?{...line.start}:{...line.end};
}

export function previewSecondaryRoad(project:ProjectV3,input:SecondaryRoadInput):SecondaryRoadPreview{
  validateInput(project,input);const firstPoint=resolveFeaturePointReference(project,input.firstCorner),secondPoint=resolveFeaturePointReference(project,input.secondCorner);
  if(distance(firstPoint,secondPoint)<EPSILON)throw new Error('Choose two different house corners.');
  return{solutions:solveSecondaryRoad(firstPoint,secondPoint,input.firstDistance,input.secondDistance),firstPoint,secondPoint};
}

/** Adds the second road from two fixed house corners. The house geometry is never modified. */
export function addSecondaryRoad(project:ProjectV3,input:SecondaryRoadInput,selectedSolution:0|1):{project:ProjectV3;roadId:string}{
  const preview=previewSecondaryRoad(project,input),solution=preview.solutions[selectedSolution];if(!solution)throw new Error('The selected secondary-road solution is unavailable.');
  const roadId=id(),firstTieId=id(),secondTieId=id(),verified=input.verified??false;
  const tie=(tieId:string,target:FeaturePointReference,point:PointFt,value:number,text:string):CurbTieV3=>({id:tieId,curbSide:'house-side',target:{...target},station:dot(subtract(point,solution.origin),solution.direction),perpendicularDistance:value,enteredText:text,verified});
  const firstTie=tie(firstTieId,input.firstCorner,preview.firstPoint,input.firstDistance,input.firstEnteredText),secondTie=tie(secondTieId,input.secondCorner,preview.secondPoint,input.secondDistance,input.secondEnteredText);
  const featureIds=new Set([input.firstCorner.featureId,input.secondCorner.featureId]);if(featureIds.size!==1)throw new Error('Both secondary-road ties must reference the same completed house.');
  const angle=radiansToDegrees(Math.atan2(solution.direction.y,solution.direction.x)),road:RoadReferenceV3={id:roadId,role:'secondary',name:input.name?.trim()||undefined,width:input.width,baseline:{origin:{...solution.origin},angle,visibleLength:input.visibleLength,houseSide:'right',houseNormal:{...solution.normal}},ties:[firstTie,secondTie],derivedFromHouseId:input.firstCorner.featureId,secondaryAlignment:{firstTieId,secondTieId,selectedSolution},approximateCurbReturn:{visible:input.showApproximateCurbReturn??true,visualRadius:input.visualCurbRadius},notes:input.notes??''};
  return{project:{...project,roads:[...project.roads,road],updatedAt:now()},roadId};
}

/** Rebuilds the road after house edits while preserving both entered tie measurements. */
export function rebuildSecondaryRoad(project:ProjectV3,roadId:string):ProjectV3{
  const road=project.roads.find(item=>item.id===roadId&&item.role==='secondary');if(!road?.secondaryAlignment)throw new Error('The secondary road alignment cannot be rebuilt.');
  const first=road.ties.find(item=>item.id===road.secondaryAlignment!.firstTieId),second=road.ties.find(item=>item.id===road.secondaryAlignment!.secondTieId);if(!first||!second)throw new Error('Both secondary-road ties are required.');
  const firstPoint=resolveFeaturePointReference(project,first.target),secondPoint=resolveFeaturePointReference(project,second.target),solutions=solveSecondaryRoad(firstPoint,secondPoint,first.perpendicularDistance,second.perpendicularDistance),solution=solutions[road.secondaryAlignment.selectedSolution];if(!solution)throw new Error('The saved secondary-road solution is no longer available.');
  const refresh=(tie:CurbTieV3,point:PointFt):CurbTieV3=>({...tie,station:dot(subtract(point,solution.origin),solution.direction)}),baseline={...road.baseline,origin:{...solution.origin},angle:radiansToDegrees(Math.atan2(solution.direction.y,solution.direction.x)),houseNormal:{...solution.normal}},ties=[refresh(first,firstPoint),refresh(second,secondPoint)];
  return{...project,roads:project.roads.map(item=>item.id===roadId?{...item,baseline,ties}:item),updatedAt:now()};
}

export interface ApproximateCurbReturn {start:PointFt;end:PointFt;control:PointFt;visualRadius:number;approximate:true;measurementReference:false}

/** Produces a schematic quadratic curve. Straight curb lines remain the only measurement references. */
export function deriveApproximateCurbReturn(project:ProjectV3,secondaryRoadId:string):ApproximateCurbReturn|undefined{
  const primary=project.roads.find(item=>item.role==='primary'),secondary=project.roads.find(item=>item.id===secondaryRoadId&&item.role==='secondary');if(!primary||!secondary?.approximateCurbReturn?.visible)return undefined;
  const first=derivePrimaryCurbLines(primary).houseSide,second=derivePrimaryCurbLines(secondary).houseSide,intersection=lineIntersection(first,second);if(!intersection)return undefined;
  const radius=secondary.approximateCurbReturn.visualRadius??Math.min(10,primary.width/4,secondary.width/4),firstBranch=towardOrigin(first,intersection),secondBranch=towardOrigin(second,intersection);
  return{start:add(intersection,scale(firstBranch,radius)),end:add(intersection,scale(secondBranch,radius)),control:intersection,visualRadius:radius,approximate:true,measurementReference:false};
}

function lineIntersection(first:OrientedLine,second:OrientedLine):PointFt|undefined{const cross=first.direction.x*second.direction.y-first.direction.y*second.direction.x;if(Math.abs(cross)<EPSILON)return undefined;const delta=subtract(second.origin,first.origin),station=(delta.x*second.direction.y-delta.y*second.direction.x)/cross;return add(first.origin,scale(first.direction,station))}
function towardOrigin(line:OrientedLine,intersection:PointFt):PointFt{const delta=subtract(line.origin,intersection),length=Math.hypot(delta.x,delta.y);return length>EPSILON?scale(delta,1/length):line.direction}
function validateInput(project:ProjectV3,input:SecondaryRoadInput){if(!project.roads.some(item=>item.role==='primary'))throw new Error('Create the primary road before adding a corner-lot road.');if(project.roads.some(item=>item.role==='secondary'))throw new Error('This phase supports one secondary road.');if(!Number.isFinite(input.width)||input.width<=0)throw new Error('Road width must be greater than zero.');if(!Number.isFinite(input.visibleLength)||input.visibleLength<=0)throw new Error('Visible road length must be greater than zero.');if(!Number.isFinite(input.firstDistance)||input.firstDistance<=0||!Number.isFinite(input.secondDistance)||input.secondDistance<=0)throw new Error('Both curb ties must be greater than zero.');if(input.visualCurbRadius!==undefined&&(!Number.isFinite(input.visualCurbRadius)||input.visualCurbRadius<=0))throw new Error('Visual curb radius must be greater than zero.');}
