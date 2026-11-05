import { add, degreesToRadians, perpendicularOffset } from './geometry';
import type { CurbTieV3, MeasuredFeatureV3, OrientedLine, PointFt, ProjectV3, RoadReferenceV3 } from './types';

const id=()=>crypto.randomUUID();
const updated=(project:ProjectV3):ProjectV3=>({...project,updatedAt:new Date().toISOString()});

export interface PrimaryRoadInput {name?:string;width:number;origin:PointFt;angle:number;visibleLength:number;houseSide:'left'|'right';notes?:string}

export function derivePrimaryCurbLines(road:RoadReferenceV3):{houseSide:OrientedLine;opposite:OrientedLine}{
  const radians=degreesToRadians(road.baseline.angle),direction={x:Math.cos(radians),y:Math.sin(radians)},left={x:direction.y,y:-direction.x},right={x:-direction.y,y:direction.x},normal=road.baseline.houseSide==='left'?left:right;
  const houseSide={origin:{...road.baseline.origin},direction,normal},opposite={origin:add(road.baseline.origin,{x:-normal.x*road.width,y:-normal.y*road.width}),direction,normal};
  return{houseSide,opposite};
}

export function addPrimaryRoad(project:ProjectV3,input:PrimaryRoadInput):ProjectV3{
  if(project.roads.some(road=>road.role==='primary'))throw new Error('This project already has a primary road.');
  if(!Number.isFinite(input.width)||input.width<=0)throw new Error('Road width must be greater than zero.');
  if(!Number.isFinite(input.visibleLength)||input.visibleLength<=0)throw new Error('Visible road length must be greater than zero.');
  const road:RoadReferenceV3={id:id(),role:'primary',name:input.name?.trim()||undefined,width:input.width,baseline:{origin:{...input.origin},angle:input.angle,visibleLength:input.visibleLength,houseSide:input.houseSide},ties:[],notes:input.notes??''};
  return updated({...project,roads:[...project.roads,road]});
}

export interface CornerATieInput {roadId:string;station:number;distance:number;enteredText:string;houseName?:string;verified?:boolean}

/** Creates Corner A and the house together so the house start remains linked to the curb tie. */
export function establishCornerA(project:ProjectV3,input:CornerATieInput):{project:ProjectV3;cornerA:PointFt;houseId:string;tieId:string}{
  const road=project.roads.find(item=>item.id===input.roadId&&item.role==='primary');if(!road)throw new Error('Select the primary road before establishing Corner A.');
  if(road.ties.length)throw new Error('Corner A has already been established for this primary road.');
  if(!Number.isFinite(input.station)||input.station<0||input.station>road.baseline.visibleLength)throw new Error('Corner A curb station must lie on the visible curb reference.');
  if(!Number.isFinite(input.distance)||input.distance<=0)throw new Error('Corner A curb tie must be greater than zero.');
  const houseId=id(),tieId=id(),curbs=derivePrimaryCurbLines(road),cornerA=perpendicularOffset(curbs.houseSide,input.station,input.distance);
  const tie:CurbTieV3={id:tieId,curbSide:'house-side',target:{featureId:houseId,pointRole:'start'},station:input.station,perpendicularDistance:input.distance,enteredText:input.enteredText,verified:input.verified??false};
  const house:MeasuredFeatureV3={id:houseId,kind:'house',name:input.houseName?.trim()||'Residence',geometry:'closed-area',startAnchor:{type:'curb-tie',roadId:road.id,tieId},segments:[],styleId:'structure',notes:'',visible:true};
  const roads=project.roads.map(item=>item.id===road.id?{...item,ties:[...item.ties,tie]}:item),next=updated({...project,roads,features:[...project.features,house],dependencyOrder:[...project.dependencyOrder,houseId]});
  return{project:next,cornerA,houseId,tieId};
}

export function resolveCurbTiePoint(project:ProjectV3,roadId:string,tieId:string):PointFt{
  const road=project.roads.find(item=>item.id===roadId),tie=road?.ties.find(item=>item.id===tieId);if(!road||!tie)throw new Error('The curb tie reference cannot be resolved.');
  const curb=tie.curbSide==='house-side'?derivePrimaryCurbLines(road).houseSide:derivePrimaryCurbLines(road).opposite;
  return perpendicularOffset(curb,tie.station,tie.perpendicularDistance);
}
