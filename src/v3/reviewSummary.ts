import type { ProjectV3 } from './types';

export interface FieldReviewSummaryV3{
  roads:{id:string;name:string;role:'primary'|'secondary';width:number;ties:number;verifiedTies:number}[];
  house?:{id:string;walls:number;verifiedWalls:number;phase:string;closureStatus:string;closureError:number;decision:string};
  improvements:{id:string;name:string;kind:string;segments:number;verifiedSegments:number;open:boolean}[];
  warnings:ProjectV3['warnings'];unverifiedMeasurements:number;openFeatures:number;
  checklist:{label:string;complete:boolean}[];readyForDrafter:boolean;
}

export function buildFieldReviewSummary(project:ProjectV3):FieldReviewSummaryV3{
  const house=project.features.find(item=>item.kind==='house'),roads=project.roads.map(road=>({id:road.id,name:road.name||`${capitalize(road.role)} road`,role:road.role,width:road.width,ties:road.ties.length,verifiedTies:road.ties.filter(tie=>tie.verified).length})),improvements=project.features.filter(item=>item.kind!=='house').map(feature=>({id:feature.id,name:feature.name,kind:feature.kind,segments:feature.segments.length,verifiedSegments:feature.segments.filter(segment=>segment.verified).length,open:feature.geometry==='closed-area'&&!feature.endAnchor}));
  const houseSummary=house?{id:house.id,walls:house.segments.length,verifiedWalls:house.segments.filter(segment=>segment.verified).length,phase:house.houseAlignment?.phase??'unplaced',closureStatus:house.closure?.status??'not-reviewed',closureError:house.closure?.directError??0,decision:house.closure?.decision??'none'}:undefined;
  const unverifiedMeasurements=project.roads.flatMap(road=>road.ties).filter(tie=>!tie.verified).length+project.features.flatMap(feature=>feature.segments).filter(segment=>!segment.verified).length,openFeatures=improvements.filter(feature=>feature.open).length,warnings=project.warnings.filter(warning=>!warning.accepted),hasPrimary=roads.some(road=>road.role==='primary'),houseComplete=house?.houseAlignment?.phase==='complete',closureReviewed=!!house?.closure&&house.closure.decision!=='none'||house?.closure?.status==='closed';
  const checklist=[{label:'Primary road measured',complete:hasPrimary},{label:'House positioned from two curb ties',complete:(project.roads.find(road=>road.role==='primary')?.ties.length??0)>=2},{label:'House perimeter completed',complete:houseComplete},{label:'House closure reviewed',complete:!!closureReviewed},{label:'Closed improvements returned to references',complete:openFeatures===0},{label:'Dependency warnings reviewed',complete:warnings.length===0},{label:'Measurements verified',complete:unverifiedMeasurements===0}];
  return{roads,house:houseSummary,improvements,warnings,unverifiedMeasurements,openFeatures,checklist,readyForDrafter:checklist.slice(0,6).every(item=>item.complete)};
}
const capitalize=(value:string)=>value[0].toUpperCase()+value.slice(1);
