import { completeClosedHouse } from './closureWorkflow';
import { addFeatureSegment, closeFeatureUsingReference, createFeatureFromReference, updateFeatureSemantics } from './featureWorkflow';
import { acceptCornerBAlignment, addHouseSegment } from './houseWorkflow';
import { createProjectV3 } from './project';
import { addPrimaryRoad, establishCornerA } from './roadWorkflow';
import { addSecondaryRoad } from './secondaryRoadWorkflow';
import type { LineDirection, ProjectV3 } from './types';

const relative=(length:number,turn:'straight'|'left'|'right'='straight',angle=turn==='straight'?0:90)=>({length,enteredText:length.toFixed(1),direction:{mode:'relative',turn,angle} as LineDirection,verified:true});
export function createFictionalSampleProject():ProjectV3{
  let project=createProjectV3('Sample — Juniper Corner Residence','2026-01-15T09:00:00.000Z');project.job={...project.job,address:'100 Fictional Juniper Avenue',client:'Example Client',fieldWorker:'Sample Field Crew',inspectionDate:'2026-01-15',notes:'Fictional training project. No real client or property information.'};
  project=addPrimaryRoad(project,{name:'Juniper Avenue',width:36,origin:{x:0,y:0},angle:0,visibleLength:130,houseSide:'right'});const placed=establishCornerA(project,{roadId:project.roads[0].id,station:20,distance:20,enteredText:'20.0',verified:true});project=placed.project;
  for(const segment of [relative(15),relative(3,'right'),relative(8,'left'),relative(3,'left'),relative(17,'right')])project=addHouseSegment(project,placed.houseId,segment);project=acceptCornerBAlignment(project,placed.houseId,{distance:20,enteredText:'20.0',verified:true},0);for(const segment of [relative(25,'right'),relative(40,'right'),relative(25,'right')])project=addHouseSegment(project,placed.houseId,segment);project=completeClosedHouse(project,placed.houseId);
  const house=project.features.find(item=>item.id===placed.houseId)!,front=house.segments[0],rightSide=house.segments[5],back=house.segments[6];
  let created=createFeatureFromReference(project,{kind:'porch',name:'Front Porch',sourceFeatureId:house.id,sourceSegmentId:front.id,measuredFrom:'start',distanceAlong:5,initialDirection:'perpendicular-left'});project=created.project;for(const segment of [relative(5),relative(10,'right'),relative(5,'right')])project=addFeatureSegment(project,created.featureId,segment);project=closeFeatureUsingReference(project,created.featureId,house.id,front.id);
  created=createFeatureFromReference(project,{kind:'concrete',name:'Rear Concrete',sourceFeatureId:house.id,sourceSegmentId:back.id,measuredFrom:'start',distanceAlong:8,initialDirection:'perpendicular-left'});project=created.project;for(const segment of [relative(6),relative(14,'right'),relative(6,'right')])project=addFeatureSegment(project,created.featureId,segment);project=closeFeatureUsingReference(project,created.featureId,house.id,back.id);
  created=createFeatureFromReference(project,{kind:'fence',name:'Iron Fence',sourceFeatureId:house.id,sourceSegmentId:rightSide.id,measuredFrom:'start',distanceAlong:2,initialDirection:'perpendicular-right'});project=updateFeatureSemantics(created.project,created.featureId,{fenceType:'iron'});project=addFeatureSegment(project,created.featureId,relative(28));
  const secondary=addSecondaryRoad(project,{name:'Aspen Street',width:32,visibleLength:100,firstCorner:{featureId:house.id,segmentId:rightSide.id,pointRole:'start'},firstDistance:15,firstEnteredText:'15.0',secondCorner:{featureId:house.id,segmentId:back.id,pointRole:'start'},secondDistance:15,secondEnteredText:'15.0',verified:true,visualCurbRadius:6},0);project=secondary.project;
  project.notes.push({id:crypto.randomUUID(),text:'Training sample: verify all measurements in actual field work.',createdAt:'2026-01-15T09:00:00.000Z'});return project;
}
