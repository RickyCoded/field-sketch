import { reviewFeatureDependencies } from './featureWorkflow';
import type { FeatureAnchor, MeasuredFeatureV3, ProjectV3 } from './types';
import { rebuildSecondaryRoad } from './secondaryRoadWorkflow';

const now=()=>new Date().toISOString();

export interface MeasurementEdit {length:number;enteredText:string}
export interface MeasurementEditPreview {featureId:string;segmentId:string;affectedFeatureIds:string[];affectedRoadIds:string[]}

export function previewMeasurementEdit(project:ProjectV3,featureId:string,segmentId:string):MeasurementEditPreview{
  const source=project.features.find(item=>item.id===featureId);if(!source)throw new Error('The selected measured feature cannot be found.');if(!source.segments.some(item=>item.id===segmentId))throw new Error('The selected measured segment cannot be found.');
  const affected=new Set<string>(),queue=[{featureId,segmentId:segmentId as string|undefined}];
  while(queue.length){const current=queue.shift()!;for(const feature of project.features){if(feature.id===featureId||affected.has(feature.id))continue;if(dependsOn(feature,current.featureId,current.segmentId)){affected.add(feature.id);queue.push({featureId:feature.id,segmentId:undefined})}}}
  return{featureId,segmentId,affectedFeatureIds:[...affected],affectedRoadIds:project.roads.filter(road=>road.role==='secondary'&&road.derivedFromHouseId===featureId).map(road=>road.id)};
}

/** Applies one authoritative measurement edit, then rebuilds dependency warnings as one project transaction. */
export function updateSegmentMeasurement(project:ProjectV3,featureId:string,segmentId:string,edit:MeasurementEdit):ProjectV3{
  if(!Number.isFinite(edit.length)||edit.length<=0)throw new Error('Segment length must be greater than zero.');
  previewMeasurementEdit(project,featureId,segmentId);const timestamp=now();
  const features=project.features.map(feature=>{if(feature.id!==featureId)return feature;const segments=feature.segments.map(segment=>segment.id===segmentId?{...segment,length:edit.length,enteredText:edit.enteredText,updatedAt:timestamp}:segment);if(feature.kind==='house'&&feature.houseAlignment)return{...feature,segments,closure:undefined,houseAlignment:{...feature.houseAlignment,phase:feature.houseAlignment.phase==='front-walk'?'front-walk' as const:'perimeter' as const}};return{...feature,segments,referenceClosure:undefined}});
  let rebuilt=reviewFeatureDependencies({...project,features,updatedAt:timestamp});
  for(const road of rebuilt.roads.filter(item=>item.role==='secondary'&&item.derivedFromHouseId===featureId)){try{rebuilt=rebuildSecondaryRoad(rebuilt,road.id)}catch(error){rebuilt={...rebuilt,warnings:[...rebuilt.warnings.filter(item=>item.id!==`secondary-road-rebuild-${road.id}`),{id:`secondary-road-rebuild-${road.id}`,level:'error',code:'secondary-road-rebuild',message:error instanceof Error?error.message:'The secondary road ties require review.',roadId:road.id}]}}}
  return rebuilt;
}

function dependsOn(feature:MeasuredFeatureV3,sourceFeatureId:string,sourceSegmentId?:string){
  return anchorUses(feature.startAnchor,sourceFeatureId,sourceSegmentId)||anchorUses(feature.endAnchor,sourceFeatureId,sourceSegmentId)||feature.startDirection?.type==='relative-to-segment'&&feature.startDirection.featureId===sourceFeatureId&&(!sourceSegmentId||feature.startDirection.segmentId===sourceSegmentId)||feature.sharedEdge?.featureId===sourceFeatureId&&(!sourceSegmentId||feature.sharedEdge.segmentId===sourceSegmentId);
}
function anchorUses(anchor:FeatureAnchor|undefined,featureId:string,segmentId?:string){if(!anchor)return false;if(anchor.type==='free'||anchor.type==='curb-tie')return false;return anchor.featureId===featureId&&(!segmentId||anchor.segmentId===segmentId)}
