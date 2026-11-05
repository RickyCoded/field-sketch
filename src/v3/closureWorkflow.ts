import { calculateClosure, distance, normalizeAngle, radiansToDegrees, reconstructPath } from './geometry';
import { resolveHousePath } from './houseWorkflow';
import { resolveCurbTiePoint } from './roadWorkflow';
import type { ClosureDecision, ClosureResult, DerivedPath, LineInstruction, PointFt, ProjectV3 } from './types';

const now=()=>new Date().toISOString();
const warningId=(houseId:string)=>`house-closure-${houseId}`;

function house(project:ProjectV3,houseId:string){const feature=project.features.find(item=>item.id===houseId&&item.kind==='house');if(!feature?.houseAlignment)throw new Error('Select a measured house.');if(feature.houseAlignment.phase==='front-walk')throw new Error('Align Corner B before reviewing structure closure.');return feature}

function originalPath(project:ProjectV3,houseId:string):DerivedPath{
  const feature=house(project,houseId),anchor=feature.startAnchor;if(anchor.type!=='curb-tie')throw new Error('The house start tie cannot be resolved.');
  const start=resolveCurbTiePoint(project,anchor.roadId,anchor.tieId),initialAngle=feature.houseAlignment!.provisionalInitialAngle+feature.houseAlignment!.alignmentRotation;
  return reconstructPath(start,feature.segments,initialAngle);
}

export const reviewHouseClosure=(project:ProjectV3,houseId:string):ClosureResult=>calculateClosure(originalPath(project,houseId).points);

export function beginHouseClosureReview(project:ProjectV3,houseId:string):ProjectV3{
  const feature=house(project,houseId),result=reviewHouseClosure(project,houseId),timestamp=now(),closure:ClosureDecision={...result,decision:'none',remeasurementConfirmed:false,originalInstructions:structuredClone(feature.segments)};
  const features=project.features.map(item=>item.id===houseId?{...item,closure}:item),warnings=project.warnings.filter(item=>item.id!==warningId(houseId));
  if(result.status!=='closed')warnings.push({id:warningId(houseId),level:result.status==='outside-field-tolerance'?'error':'review',code:'house-closure',message:`${feature.name} misses closure by ${result.directError.toFixed(2)}'.`,featureId:houseId});
  return{...project,features,warnings,updatedAt:timestamp};
}

export function confirmHouseRemeasured(project:ProjectV3,houseId:string):ProjectV3{
  const feature=house(project,houseId);if(!feature.closure)throw new Error('Begin closure review before confirming remeasurement.');
  return{...project,features:project.features.map(item=>item.id===houseId?{...item,closure:{...item.closure!,remeasurementConfirmed:true}}:item),updatedAt:now()};
}

function instructionsFromPoints(original:LineInstruction[],points:PointFt[]):LineInstruction[]{
  const timestamp=now();return original.map((instruction,index)=>{const start=points[index],end=points[index+1],length=distance(start,end),angle=normalizeAngle(radiansToDegrees(Math.atan2(end.y-start.y,end.x-start.x)));return{...instruction,length,direction:{mode:'absolute' as const,angle},enteredText:String(Number(length.toFixed(4))),note:[instruction.note,'Closure-adjusted drawing value'].filter(Boolean).join(' — '),updatedAt:timestamp}});
}

function adjustFinalWall(path:DerivedPath,original:LineInstruction[]){const points=path.points.map(point=>({...point}));points[points.length-1]={...points[0]};return instructionsFromPoints(original,points)}

function distributeClosure(path:DerivedPath,original:LineInstruction[]){
  const points=path.points,error={x:points.at(-1)!.x-points[0].x,y:points.at(-1)!.y-points[0].y},lengths=path.lines.map(line=>distance(line.start,line.end)),total=lengths.reduce((sum,value)=>sum+value,0)||1;let traveled=0;
  const adjusted=points.map((point,index)=>{if(index>0)traveled+=lengths[index-1];const ratio=traveled/total;return{x:point.x-error.x*ratio,y:point.y-error.y*ratio}});return instructionsFromPoints(original,adjusted);
}

export type ClosureResolution='left-as-measured'|'adjusted-final-wall'|'distributed';
export function resolveHouseClosure(project:ProjectV3,houseId:string,resolution:ClosureResolution,note=''):ProjectV3{
  const feature=house(project,houseId);if(!feature.closure)throw new Error('Begin closure review before choosing a closure decision.');
  if(feature.closure.status==='outside-field-tolerance'&&!feature.closure.remeasurementConfirmed)throw new Error('Confirm that the structure was remeasured before overriding an error greater than 0.30 feet.');
  const path=originalPath(project,houseId),adjustedInstructions=resolution==='adjusted-final-wall'?adjustFinalWall(path,feature.segments):resolution==='distributed'?distributeClosure(path,feature.segments):undefined,timestamp=now(),closure:ClosureDecision={...feature.closure,decision:resolution,adjustedInstructions,note:note.trim()||undefined,decidedAt:timestamp};
  const features=project.features.map(item=>item.id===houseId?{...item,closure,houseAlignment:{...item.houseAlignment!,phase:'complete' as const}}:item),warnings=project.warnings.filter(item=>item.id!==warningId(houseId));
  if(resolution==='left-as-measured')warnings.push({id:warningId(houseId),level:feature.closure.status==='outside-field-tolerance'?'error':'review',code:'house-closure-accepted',message:`${feature.name} closure difference ${feature.closure.directError.toFixed(2)}' was rechecked and retained as measured.${note.trim()?` ${note.trim()}`:''}`,featureId:houseId,accepted:true});
  return{...project,features,warnings,updatedAt:timestamp};
}

export function completeClosedHouse(project:ProjectV3,houseId:string):ProjectV3{
  const reviewed=beginHouseClosureReview(project,houseId),feature=house(reviewed,houseId);if(feature.closure?.status!=='closed')throw new Error('This structure requires a closure decision before it can be completed.');
  return{...reviewed,features:reviewed.features.map(item=>item.id===houseId?{...item,houseAlignment:{...item.houseAlignment!,phase:'complete' as const}}:item),warnings:reviewed.warnings.filter(item=>item.id!==warningId(houseId)),updatedAt:now()};
}

export function reopenHouse(project:ProjectV3,houseId:string):ProjectV3{
  const feature=house(project,houseId);return{...project,features:project.features.map(item=>item.id===houseId?{...item,closure:undefined,houseAlignment:{...item.houseAlignment!,phase:'perimeter' as const}}:item),warnings:project.warnings.filter(item=>item.id!==warningId(houseId)),updatedAt:now()};
}

export function resolvedHouseClosure(project:ProjectV3,houseId:string){return calculateClosure(resolveHousePath(project,houseId).points)}
