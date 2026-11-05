import { describe,expect,it } from 'vitest';
import { addHouseSegment, acceptCornerBAlignment, previewCornerBAlignment, removeLastHouseSegment, resolveHousePath } from './houseWorkflow';
import { createProjectV3 } from './project';
import { addPrimaryRoad, establishCornerA } from './roadWorkflow';

function prepared(){let project=createProjectV3();project=addPrimaryRoad(project,{width:36,origin:{x:0,y:0},angle:0,visibleLength:150,houseSide:'right'});const placed=establishCornerA(project,{roadId:project.roads[0].id,station:20,distance:20,enteredText:'20.0',frontDirection:'with-road'});return{project:placed.project,houseId:placed.houseId}}
const straight=(length:number)=>({length,enteredText:length.toFixed(1),direction:{mode:'relative' as const,turn:'straight' as const,angle:0}});
const turn=(length:number,direction:'left'|'right',angle=90)=>({length,enteredText:length.toFixed(1),direction:{mode:'relative' as const,turn:direction,angle}});

describe('provisional front-house walk',()=>{
  it('draws a complete front with ordinary jog segments',()=>{let {project,houseId}=prepared();project=addHouseSegment(project,houseId,straight(15));project=addHouseSegment(project,houseId,turn(3,'right'));project=addHouseSegment(project,houseId,turn(8,'left'));project=addHouseSegment(project,houseId,turn(3,'left'));project=addHouseSegment(project,houseId,turn(17,'right'));const path=resolveHousePath(project,houseId);expect(path.points).toHaveLength(6);expect(path.points.at(-1)).toEqual({x:60,y:20});expect(project.features[0].houseAlignment?.frontSegmentCount).toBe(5)});
  it('undoes the last provisional wall without losing Corner A',()=>{let {project,houseId}=prepared();project=addHouseSegment(project,houseId,straight(10));project=removeLastHouseSegment(project,houseId);expect(project.features[0].segments).toHaveLength(0);expect(resolveHousePath(project,houseId).points[0]).toEqual({x:20,y:20})});
  it('prevents absolute front directions that would not rotate as a rigid path',()=>{const {project,houseId}=prepared();expect(()=>addHouseSegment(project,houseId,{length:10,enteredText:'10',direction:{mode:'absolute',angle:0}})).toThrow(/relative directions/i)});
});

describe('Corner B alignment',()=>{
  it('previews two solutions and preserves every front measurement',()=>{let {project,houseId}=prepared();project=addHouseSegment(project,houseId,straight(40));const before=project.features[0].segments.map(segment=>segment.length),solutions=previewCornerBAlignment(project,houseId,{distance:25,enteredText:'25.0'});expect(solutions).toHaveLength(2);project=acceptCornerBAlignment(project,houseId,{distance:25,enteredText:'25.0'},0);expect(project.features[0].segments.map(segment=>segment.length)).toEqual(before);expect(resolveHousePath(project,houseId).points.at(-1)?.y).toBeCloseTo(25);expect(project.features[0].houseAlignment?.phase).toBe('perimeter');expect(project.roads[0].ties).toHaveLength(2)});
  it('continues the remaining perimeter from the aligned Corner B',()=>{let {project,houseId}=prepared();project=addHouseSegment(project,houseId,straight(40));project=acceptCornerBAlignment(project,houseId,{distance:20,enteredText:'20.0'},0);const cornerB=resolveHousePath(project,houseId).points.at(-1)!;project=addHouseSegment(project,houseId,turn(25,'right'));const path=resolveHousePath(project,houseId);expect(path.lines.at(-1)?.start.x).toBeCloseTo(cornerB.x);expect(path.lines.at(-1)?.start.y).toBeCloseTo(cornerB.y);expect(project.features[0].houseAlignment?.frontSegmentCount).toBe(1)});
  it('rejects an impossible second curb tie',()=>{let {project,houseId}=prepared();project=addHouseSegment(project,houseId,straight(10));expect(()=>previewCornerBAlignment(project,houseId,{distance:35,enteredText:'35.0'})).toThrow(/cannot reach/i)});
});
