import { CLOSURE_TOLERANCE_FT, add, distance, dot, normalizeAngle, radiansToDegrees, reconstructPath, scale, subtract } from './geometry';
import { resolveHousePath } from './houseWorkflow';
import { resolveCurbTiePoint } from './roadWorkflow';
import type { DerivedLine, DerivedPath, FeatureAnchor, FeatureKind, FeatureStartDirection, LineDirection, LineInstruction, MeasuredFeatureV3, PointFt, ProjectV3, ReferenceClosure } from './types';
import { defaultGeometry, defaultSemantics, styleForFeature, styleForKind, validateFeatureSemantics } from './featureStyles';

const EPSILON=.000001,id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
const warningId=(featureId:string)=>`feature-reference-${featureId}`;

function unit(vector:PointFt){const length=Math.hypot(vector.x,vector.y);if(length<EPSILON)throw new Error('Reference segment has no usable length.');return{x:vector.x/length,y:vector.y/length}}
function feature(project:ProjectV3,featureId:string){const found=project.features.find(item=>item.id===featureId);if(!found)throw new Error('The referenced feature cannot be found.');return found}

export function resolveFeaturePath(project:ProjectV3,featureId:string,visiting=new Set<string>()):DerivedPath{
  if(visiting.has(featureId))throw new Error('Feature dependency cycle detected.');visiting.add(featureId);
  const target=feature(project,featureId);if(target.kind==='house'){visiting.delete(featureId);return resolveHousePath(project,featureId)}
  const start=resolveFeatureAnchor(project,target.startAnchor,visiting),initialAngle=resolveStartAngle(project,target.startDirection,visiting),path=reconstructPath(start,target.segments,initialAngle);
  if(target.endAnchor&&path.points.length>1){const snapped=resolveFeatureAnchor(project,target.endAnchor,visiting),points=path.points.map(point=>({...point}));points[points.length-1]=snapped;const lines=path.lines.map((line,index)=>index===path.lines.length-1?{...line,end:snapped,angle:normalizeAngle(radiansToDegrees(Math.atan2(snapped.y-line.start.y,snapped.x-line.start.x)))}:line);visiting.delete(featureId);return{points,lines,finalAngle:lines.at(-1)?.angle??path.finalAngle}}
  visiting.delete(featureId);return path;
}

export function resolveFeatureSegment(project:ProjectV3,featureId:string,segmentId:string,visiting=new Set<string>()):DerivedLine{
  const path=resolveFeaturePath(project,featureId,visiting),line=path.lines.find(item=>item.instructionId===segmentId);if(!line)throw new Error('The referenced segment cannot be found.');return line;
}

export function resolveFeatureAnchor(project:ProjectV3,anchor:FeatureAnchor,visiting=new Set<string>()):PointFt{
  if(anchor.type==='free')return{...anchor.point};if(anchor.type==='curb-tie')return resolveCurbTiePoint(project,anchor.roadId,anchor.tieId);
  const line=resolveFeatureSegment(project,anchor.featureId,anchor.segmentId,visiting),vector=subtract(line.end,line.start),direction=unit(vector),length=distance(line.start,line.end);
  if(anchor.type==='endpoint')return anchor.endpoint==='start'?{...line.start}:{...line.end};
  const station=anchor.type==='station-on-segment'?(anchor.measuredFrom==='start'?anchor.distance:length-anchor.distance):anchor.station;
  if(station<0||station>length+EPSILON)throw new Error(`Referenced station ${station.toFixed(2)}' lies beyond its ${length.toFixed(2)}' source segment.`);
  const base=add(line.start,scale(direction,station));if(anchor.type==='station-on-segment')return base;
  const left={x:direction.y,y:-direction.x},right={x:-direction.y,y:direction.x};return add(base,scale(anchor.side==='left'?left:right,anchor.distance));
}

function resolveStartAngle(project:ProjectV3,direction:FeatureStartDirection|undefined,visiting:Set<string>){
  if(!direction)return 0;if(direction.type==='absolute')return direction.angle;const line=resolveFeatureSegment(project,direction.featureId,direction.segmentId,visiting),base=normalizeAngle(radiansToDegrees(Math.atan2(line.end.y-line.start.y,line.end.x-line.start.x))),change={along:0,opposite:180,'perpendicular-left':-90,'perpendicular-right':90}[direction.relation];return normalizeAngle(base+change);
}

export interface ReferencedFeatureInput {
  kind:FeatureKind;name:string;geometry?:'open-path'|'closed-area';sourceFeatureId:string;sourceSegmentId:string;
  measuredFrom:'start'|'end';distanceAlong:number;initialDirection:'along'|'opposite'|'perpendicular-left'|'perpendicular-right';notes?:string;
}

export function createFeatureFromReference(project:ProjectV3,input:ReferencedFeatureInput):{project:ProjectV3;featureId:string;startPoint:PointFt}{
  const sourceLine=resolveFeatureSegment(project,input.sourceFeatureId,input.sourceSegmentId),length=distance(sourceLine.start,sourceLine.end);if(!Number.isFinite(input.distanceAlong)||input.distanceAlong<0||input.distanceAlong>length+EPSILON)throw new Error('The reference distance must lie on the selected segment.');
  const featureId=id(),name=input.name.trim()||defaultName(input.kind),startAnchor:FeatureAnchor={type:'station-on-segment',featureId:input.sourceFeatureId,segmentId:input.sourceSegmentId,measuredFrom:input.measuredFrom,distance:input.distanceAlong},startDirection:FeatureStartDirection={type:'relative-to-segment',featureId:input.sourceFeatureId,segmentId:input.sourceSegmentId,relation:input.initialDirection},created:MeasuredFeatureV3={id:featureId,kind:input.kind,name,geometry:input.geometry??defaultGeometry(input.kind),startAnchor,startDirection,segments:[],semantics:defaultSemantics(input.kind,name),styleId:styleForKind(input.kind).id,notes:input.notes??'',visible:true},timestamp=now(),semanticErrors=validateFeatureSemantics(created);if(semanticErrors.length)throw new Error(semanticErrors.join(' '));
  const next={...project,features:[...project.features,created],dependencyOrder:[...project.dependencyOrder,featureId],updatedAt:timestamp};return{project:next,featureId,startPoint:resolveFeatureAnchor(next,startAnchor)};
}

export interface FeatureSegmentInput {length:number;enteredText:string;direction:LineDirection;note?:string;verified?:boolean}
export function addFeatureSegment(project:ProjectV3,featureId:string,input:FeatureSegmentInput):ProjectV3{
  const target=feature(project,featureId);if(target.kind==='house')throw new Error('Use the house measurement workflow for house walls.');if(!Number.isFinite(input.length)||input.length<=0)throw new Error('Segment length must be greater than zero.');
  const timestamp=now(),instruction:LineInstruction={id:id(),sequence:target.segments.length+1,length:input.length,direction:input.direction,enteredText:input.enteredText,note:input.note,verified:input.verified??false,createdAt:timestamp,updatedAt:timestamp};
  return{...project,features:project.features.map(item=>item.id===featureId?{...item,segments:[...item.segments,instruction],endAnchor:undefined,sharedEdge:undefined,referenceClosure:undefined}:item),warnings:project.warnings.filter(item=>item.id!==warningId(featureId)),updatedAt:timestamp};
}

export function removeLastFeatureSegment(project:ProjectV3,featureId:string):ProjectV3{
  const target=feature(project,featureId);if(target.kind==='house')throw new Error('Use the house measurement workflow for house walls.');if(!target.segments.length)return project;
  const timestamp=now();return{...project,features:project.features.map(item=>item.id===featureId?{...item,segments:item.segments.slice(0,-1),endAnchor:undefined,sharedEdge:undefined,referenceClosure:undefined}:item),warnings:project.warnings.filter(item=>item.id!==warningId(featureId)),updatedAt:timestamp};
}

export interface ReturnToReferenceReview {missDistance:number;status:ReferenceClosure['status'];sourceStation:number;projectedPoint:PointFt;endpoint:PointFt}
export function reviewReturnToReference(project:ProjectV3,featureId:string,sourceFeatureId:string,sourceSegmentId:string):ReturnToReferenceReview{
  const targetPath=resolveFeaturePath(project,featureId);if(!targetPath.lines.length)throw new Error('Draw at least one segment before closing against a reference.');const endpoint=targetPath.points.at(-1)!,source=resolveFeatureSegment(project,sourceFeatureId,sourceSegmentId),vector=subtract(source.end,source.start),length=distance(source.start,source.end),direction=unit(vector),rawStation=dot(subtract(endpoint,source.start),direction),sourceStation=Math.max(0,Math.min(length,rawStation)),projectedPoint=add(source.start,scale(direction,sourceStation)),missDistance=distance(endpoint,projectedPoint),status=missDistance<=.005?'closed':missDistance<=CLOSURE_TOLERANCE_FT+EPSILON?'within-field-tolerance':'outside-field-tolerance';return{missDistance,status,sourceStation,projectedPoint,endpoint};
}

export interface CloseToReferenceOptions {remeasurementConfirmed?:boolean;acceptOutsideTolerance?:boolean;note?:string}
export function closeFeatureUsingReference(project:ProjectV3,featureId:string,sourceFeatureId:string,sourceSegmentId:string,options:CloseToReferenceOptions={}):ProjectV3{
  const target=feature(project,featureId),review=reviewReturnToReference(project,featureId,sourceFeatureId,sourceSegmentId);if(target.startAnchor.type!=='station-on-segment'||target.startAnchor.featureId!==sourceFeatureId||target.startAnchor.segmentId!==sourceSegmentId)throw new Error('Shared-edge closure currently requires the feature to start and end on the same source segment.');
  if(review.status==='outside-field-tolerance'&&!options.remeasurementConfirmed)throw new Error('Confirm remeasurement before accepting a return-to-line miss greater than 0.30 feet.');if(review.status==='outside-field-tolerance'&&!options.acceptOutsideTolerance)throw new Error('The feature does not return to the selected line within field tolerance.');
  const source=resolveFeatureSegment(project,sourceFeatureId,sourceSegmentId),sourceLength=distance(source.start,source.end),startStation=target.startAnchor.measuredFrom==='start'?target.startAnchor.distance:sourceLength-target.startAnchor.distance,endAnchor:FeatureAnchor={type:'station-on-segment',featureId:sourceFeatureId,segmentId:sourceSegmentId,measuredFrom:'start',distance:review.sourceStation},referenceClosure:ReferenceClosure={missDistance:review.missDistance,status:review.status,accepted:true,remeasurementConfirmed:options.remeasurementConfirmed??false,originalEndpoint:review.endpoint,snappedEndpoint:review.projectedPoint,note:options.note?.trim()||undefined},timestamp=now();
  const features=project.features.map(item=>item.id===featureId?{...item,endAnchor,sharedEdge:{featureId:sourceFeatureId,segmentId:sourceSegmentId,startStation,endStation:review.sourceStation},referenceClosure}:item),warnings=project.warnings.filter(item=>item.id!==warningId(featureId));if(review.status!=='closed')warnings.push({id:warningId(featureId),level:review.status==='outside-field-tolerance'?'error':'review',code:'return-to-reference-adjustment',message:`${target.name} missed its reference line by ${review.missDistance.toFixed(2)}' and was snapped after review.${options.note?.trim()?` ${options.note.trim()}`:''}`,featureId,accepted:true});return{...project,features,warnings,updatedAt:timestamp};
}

export function reviewFeatureDependencies(project:ProjectV3):ProjectV3{
  const retained=project.warnings.filter(item=>item.code!=='broken-feature-reference'&&item.code!=='dependency-cycle'),generated:ProjectV3['warnings']=[];
  for(const target of project.features){try{resolveFeaturePath(project,target.id)}catch(error){const message=error instanceof Error?error.message:'Feature reference cannot be resolved.',cycle=/cycle/i.test(message);generated.push({id:`dependency-${target.id}`,level:'error',code:cycle?'dependency-cycle':'broken-feature-reference',message,featureId:target.id})}}
  return{...project,warnings:[...retained,...generated],updatedAt:now()};
}

export function updateFeatureSemantics(project:ProjectV3,featureId:string,patch:Partial<MeasuredFeatureV3['semantics']>):ProjectV3{
  const target=feature(project,featureId),automaticFenceLabel=target.kind==='fence'&&patch.fenceType&&patch.label===undefined?`${patch.fenceType.replaceAll('-',' ').toUpperCase()} FENCE`:undefined,semantics={...target.semantics,...patch,...(automaticFenceLabel?{label:automaticFenceLabel}:{})},candidate={...target,semantics},errors=validateFeatureSemantics(candidate);if(errors.length)throw new Error(errors.join(' '));return{...project,features:project.features.map(item=>item.id===featureId?{...item,semantics,styleId:styleForFeature(candidate).id}:item),updatedAt:now()};
}

function defaultName(kind:FeatureKind){return kind.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')}
