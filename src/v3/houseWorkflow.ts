import { dot, reconstructPath, solveFrontAlignment, subtract } from './geometry';
import { derivePrimaryCurbLines, resolveCurbTiePoint } from './roadWorkflow';
import type { CurbTieV3, DerivedPath, FrontAlignmentSolution, LineDirection, LineInstruction, ProjectV3 } from './types';

const id=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();

export interface HouseSegmentInput {length:number;enteredText:string;direction:LineDirection;note?:string;verified?:boolean}

function houseAndAlignment(project:ProjectV3,houseId:string){const house=project.features.find(feature=>feature.id===houseId&&feature.kind==='house');if(!house?.houseAlignment)throw new Error('Select a house established from a primary-road curb tie.');return{house,alignment:house.houseAlignment}}

export function resolveHousePath(project:ProjectV3,houseId:string):DerivedPath{
  const {house,alignment}=houseAndAlignment(project,houseId),startAnchor=house.startAnchor;if(startAnchor.type!=='curb-tie')throw new Error('The house start is not linked to a curb tie.');
  const start=resolveCurbTiePoint(project,startAnchor.roadId,startAnchor.tieId),initialAngle=alignment.provisionalInitialAngle+alignment.alignmentRotation;
  const instructions=house.closure?.adjustedInstructions??house.segments;return reconstructPath(start,instructions,initialAngle);
}

export function addHouseSegment(project:ProjectV3,houseId:string,input:HouseSegmentInput):ProjectV3{
  const {house,alignment}=houseAndAlignment(project,houseId);if(alignment.phase==='complete')throw new Error('Reopen the completed structure before adding another wall.');if(!Number.isFinite(input.length)||input.length<=0)throw new Error('Wall length must be greater than zero.');
  if(alignment.phase==='front-walk'&&input.direction.mode==='absolute')throw new Error('Front walls use relative directions so the complete front can rotate from the second curb tie.');
  const timestamp=now(),segment:LineInstruction={id:id(),sequence:house.segments.length+1,length:input.length,direction:input.direction,enteredText:input.enteredText,note:input.note,verified:input.verified??false,createdAt:timestamp,updatedAt:timestamp};
  const features=project.features.map(feature=>feature.id===house.id?{...feature,segments:[...feature.segments,segment],closure:undefined,houseAlignment:{...alignment,...(alignment.phase==='front-walk'?{frontSegmentCount:alignment.frontSegmentCount+1}:{})}}:feature);
  return{...project,features,updatedAt:timestamp};
}

export function removeLastHouseSegment(project:ProjectV3,houseId:string):ProjectV3{
  const {house,alignment}=houseAndAlignment(project,houseId);if(alignment.phase==='complete')throw new Error('Reopen the completed structure before removing a wall.');if(!house.segments.length)return project;
  const features=project.features.map(feature=>feature.id===house.id?{...feature,segments:feature.segments.slice(0,-1),closure:undefined,houseAlignment:{...alignment,...(alignment.phase==='front-walk'?{frontSegmentCount:Math.max(0,alignment.frontSegmentCount-1)}:{})}}:feature);
  return{...project,features,updatedAt:now()};
}

export interface CornerBInput {distance:number;enteredText:string;verified?:boolean}

export function previewCornerBAlignment(project:ProjectV3,houseId:string,input:CornerBInput):FrontAlignmentSolution[]{
  const {house,alignment}=houseAndAlignment(project,houseId);if(alignment.phase!=='front-walk')throw new Error('Corner B has already been aligned.');if(!house.segments.length)throw new Error('Measure the complete house front before entering Corner B.');if(!Number.isFinite(input.distance)||input.distance<=0)throw new Error('Corner B curb tie must be greater than zero.');
  const road=project.roads.find(item=>item.id===alignment.primaryRoadId);if(!road)throw new Error('The primary road cannot be resolved.');
  const tieA=road.ties.find(tie=>tie.id===alignment.cornerATieId);if(!tieA)throw new Error('The Corner A curb tie cannot be resolved.');
  const provisional=resolveHousePath(project,houseId),cornerA=provisional.points[0],normal=derivePrimaryCurbLines(road).houseSide.normal;
  return solveFrontAlignment(cornerA,provisional.points,normal,tieA.perpendicularDistance,input.distance);
}

export function acceptCornerBAlignment(project:ProjectV3,houseId:string,input:CornerBInput,solutionIndex:0|1):ProjectV3{
  const {house,alignment}=houseAndAlignment(project,houseId),solutions=previewCornerBAlignment(project,houseId,input),solution=solutions[solutionIndex];if(!solution)throw new Error('The selected Corner B alignment solution is unavailable.');
  const road=project.roads.find(item=>item.id===alignment.primaryRoadId)!,curb=derivePrimaryCurbLines(road).houseSide,cornerB=solution.cornerB,station=dot(subtract(cornerB,curb.origin),curb.direction),tieId=id(),timestamp=now();
  const tie:CurbTieV3={id:tieId,curbSide:'house-side',target:{featureId:house.id,pointRole:'end',segmentId:house.segments.at(-1)!.id},station,perpendicularDistance:input.distance,enteredText:input.enteredText,verified:input.verified??false};
  const roads=project.roads.map(item=>item.id===road.id?{...item,ties:[...item.ties,tie]}:item),features=project.features.map(feature=>feature.id===house.id?{...feature,houseAlignment:{...alignment,phase:'perimeter' as const,frontSegmentCount:house.segments.length,alignmentRotation:solution.rotation,cornerBTieId:tieId,selectedSolution:solutionIndex}}:feature);
  return{...project,roads,features,updatedAt:timestamp};
}
