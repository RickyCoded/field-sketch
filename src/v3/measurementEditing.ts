import { reviewFeatureDependencies } from './featureWorkflow';
import type { FeatureAnchor, MeasuredFeatureV3, ProjectV3 } from './types';

const now=()=>new Date().toISOString();

export interface MeasurementEdit {length:number;enteredText:string}
export interface MeasurementEditPreview {featureId:string;segmentId:string;affectedFeatureIds:string[]}

export function previewMeasurementEdit(project:ProjectV3,featureId:string,segmentId:string):MeasurementEditPreview{
  const source=project.features.find(item=>item.id===featureId);if(!source)throw new Error('The selected measured feature cannot be found.');if(!source.segments.some(item=>item.id===segmentId))throw new Error('The selected measured segment cannot be found.');
  const affected=new Set<string>(),queue=[{featureId,segmentId:segmentId as string|undefined}];
  while(queue.length){const current=queue.shift()!;for(const feature of project.features){if(feature.id===featureId||affected.has(feature.id))continue;if(dependsOn(feature,current.featureId,current.segmentId)){affected.add(feature.id);queue.push({featureId:feature.id,segmentId:undefined})}}}
  return{featureId,segmentId,affectedFeatureIds:[...affected]};
}

/** Applies one authoritative measurement edit, then rebuilds dependency warnings as one project transaction. */
export function updateSegmentMeasurement(project:ProjectV3,featureId:string,segmentId:string,edit:MeasurementEdit):ProjectV3{
  if(!Number.isFinite(edit.length)||edit.length<=0)throw new Error('Segment length must be greater than zero.');
  previewMeasurementEdit(project,featureId,segmentId);const timestamp=now();
  const features=project.features.map(feature=>{if(feature.id!==featureId)return feature;const segments=feature.segments.map(segment=>segment.id===segmentId?{...segment,length:edit.length,enteredText:edit.enteredText,updatedAt:timestamp}:segment);if(feature.kind==='house'&&feature.houseAlignment)return{...feature,segments,closure:undefined,houseAlignment:{...feature.houseAlignment,phase:feature.houseAlignment.phase==='front-walk'?'front-walk' as const:'perimeter' as const}};return{...feature,segments,referenceClosure:undefined}});
  return reviewFeatureDependencies({...project,features,updatedAt:timestamp});
}

function dependsOn(feature:MeasuredFeatureV3,sourceFeatureId:string,sourceSegmentId?:string){
  return anchorUses(feature.startAnchor,sourceFeatureId,sourceSegmentId)||anchorUses(feature.endAnchor,sourceFeatureId,sourceSegmentId)||feature.startDirection?.type==='relative-to-segment'&&feature.startDirection.featureId===sourceFeatureId&&(!sourceSegmentId||feature.startDirection.segmentId===sourceSegmentId)||feature.sharedEdge?.featureId===sourceFeatureId&&(!sourceSegmentId||feature.sharedEdge.segmentId===sourceSegmentId);
}
function anchorUses(anchor:FeatureAnchor|undefined,featureId:string,segmentId?:string){if(!anchor)return false;if(anchor.type==='free'||anchor.type==='curb-tie')return false;return anchor.featureId===featureId&&(!segmentId||anchor.segmentId===segmentId)}
