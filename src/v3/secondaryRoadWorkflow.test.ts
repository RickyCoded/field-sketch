import { describe,expect,it } from 'vitest';
import { acceptCornerBAlignment, addHouseSegment, resolveHousePath } from './houseWorkflow';
import { createProjectV3, parseProjectV3, serializeProjectV3 } from './project';
import { addPrimaryRoad, derivePrimaryCurbLines, establishCornerA, resolveCurbTiePoint } from './roadWorkflow';
import { addSecondaryRoad, deriveApproximateCurbReturn, previewSecondaryRoad, rebuildSecondaryRoad, resolveFeaturePointReference } from './secondaryRoadWorkflow';
import type { ProjectV3 } from './types';

const straight=(length:number)=>({length,enteredText:String(length),direction:{mode:'relative' as const,turn:'straight' as const,angle:0}}),right=(length:number)=>({length,enteredText:String(length),direction:{mode:'relative' as const,turn:'right' as const,angle:90}});

function cornerLotProject(){
  let project=createProjectV3();project=addPrimaryRoad(project,{name:'Front Street',width:36,origin:{x:0,y:0},angle:0,visibleLength:150,houseSide:'right'});
  const placed=establishCornerA(project,{roadId:project.roads[0].id,station:20,distance:20,enteredText:'20.0'});project=addHouseSegment(placed.project,placed.houseId,straight(40));project=acceptCornerBAlignment(project,placed.houseId,{distance:20,enteredText:'20.0'},0);project=addHouseSegment(project,placed.houseId,right(20));project=addHouseSegment(project,placed.houseId,right(40));project=addHouseSegment(project,placed.houseId,right(20));
  const segments=project.features.find(item=>item.id===placed.houseId)!.segments;
  return{project,houseId:placed.houseId,firstCorner:{featureId:placed.houseId,segmentId:segments[1].id,pointRole:'start' as const},secondCorner:{featureId:placed.houseId,segmentId:segments[2].id,pointRole:'start' as const}};
}

const secondaryInput=(data:ReturnType<typeof cornerLotProject>)=>({name:'Side Street',width:32,visibleLength:120,firstCorner:data.firstCorner,firstDistance:15,firstEnteredText:'15.0',secondCorner:data.secondCorner,secondDistance:15,secondEnteredText:'15.0',visualCurbRadius:6});

describe('corner-lot secondary road workflow',()=>{
  it('previews both road solutions from two fixed house corners',()=>{const data=cornerLotProject(),before=resolveHousePath(data.project,data.houseId).points;const preview=previewSecondaryRoad(data.project,secondaryInput(data));expect(preview.solutions).toHaveLength(2);expect(resolveHousePath(data.project,data.houseId).points).toEqual(before)});
  it('adds the selected road without moving or changing the house',()=>{const data=cornerLotProject(),before=JSON.stringify(data.project.features),added=addSecondaryRoad(data.project,secondaryInput(data),0),road=added.project.roads.find(item=>item.id===added.roadId)!;expect(JSON.stringify(added.project.features)).toBe(before);expect(road.role).toBe('secondary');expect(road.ties).toHaveLength(2);for(const tie of road.ties){const target=resolveFeaturePointReference(added.project,tie.target),resolved=resolveCurbTiePoint(added.project,road.id,tie.id);expect(Math.hypot(target.x-resolved.x,target.y-resolved.y)).toBeCloseTo(0)} });
  it('rebuilds the road after a house edit while preserving entered ties',()=>{const data=cornerLotProject(),added=addSecondaryRoad(data.project,secondaryInput(data),0),roadBefore=added.project.roads.find(item=>item.id===added.roadId)!,originalTieValues=roadBefore.ties.map(tie=>[tie.perpendicularDistance,tie.enteredText]);let edited:ProjectV3={...added.project,features:added.project.features.map(feature=>feature.id===data.houseId?{...feature,segments:feature.segments.map((segment,index)=>index===1?{...segment,length:25}:segment)}:feature)};const houseBefore=JSON.stringify(edited.features);edited=rebuildSecondaryRoad(edited,added.roadId);expect(JSON.stringify(edited.features)).toBe(houseBefore);expect(edited.roads.find(item=>item.id===added.roadId)!.ties.map(tie=>[tie.perpendicularDistance,tie.enteredText])).toEqual(originalTieValues)});
  it('rejects impossible or duplicate-corner ties',()=>{const data=cornerLotProject(),input=secondaryInput(data);expect(()=>previewSecondaryRoad(data.project,{...input,secondCorner:input.firstCorner})).toThrow(/different house corners/i);expect(()=>previewSecondaryRoad(data.project,{...input,firstDistance:1,secondDistance:40})).toThrow(/cannot define/i)});
  it('persists the selected solution and exact tie values',()=>{const data=cornerLotProject(),added=addSecondaryRoad(data.project,secondaryInput(data),1),reopened=parseProjectV3(serializeProjectV3(added.project)),road=reopened.roads.find(item=>item.id===added.roadId)!;expect(road.secondaryAlignment?.selectedSolution).toBe(1);expect(road.ties.map(tie=>tie.perpendicularDistance)).toEqual([15,15])});
});

describe('schematic curb return',()=>{
  it('derives a visibly marked non-measurement curve between the straight curbs',()=>{const data=cornerLotProject(),added=addSecondaryRoad(data.project,secondaryInput(data),0),curve=deriveApproximateCurbReturn(added.project,added.roadId)!;expect(curve.approximate).toBe(true);expect(curve.measurementReference).toBe(false);expect(curve.visualRadius).toBe(6);expect(curve.start).not.toEqual(curve.control);expect(curve.end).not.toEqual(curve.control)});
  it('omits a curve when the authoritative curb lines are parallel',()=>{const data=cornerLotProject(),added=addSecondaryRoad(data.project,secondaryInput(data),0),secondary=added.project.roads.find(item=>item.id===added.roadId)!,primary=derivePrimaryCurbLines(added.project.roads[0]).houseSide,parallel={...added.project,roads:added.project.roads.map(road=>road.id===secondary.id?{...road,baseline:{...road.baseline,angle:0,houseNormal:{...primary.normal}}}:road)};expect(deriveApproximateCurbReturn(parallel,secondary.id)).toBeUndefined()});
});
