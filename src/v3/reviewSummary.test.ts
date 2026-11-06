import { describe,expect,it } from 'vitest';
import { acceptCornerBAlignment, addHouseSegment } from './houseWorkflow';
import { completeClosedHouse } from './closureWorkflow';
import { buildFieldReviewSummary } from './reviewSummary';
import { createProjectV3 } from './project';
import { addPrimaryRoad, establishCornerA } from './roadWorkflow';

const straight=(length:number)=>({length,enteredText:String(length),direction:{mode:'relative' as const,turn:'straight' as const,angle:0}}),right=(length:number)=>({length,enteredText:String(length),direction:{mode:'relative' as const,turn:'right' as const,angle:90}});
function completeProject(){let project=createProjectV3();project=addPrimaryRoad(project,{name:'Fiction Avenue',width:36,origin:{x:0,y:0},angle:0,visibleLength:150,houseSide:'right'});const placed=establishCornerA(project,{roadId:project.roads[0].id,station:20,distance:20,enteredText:'20'});project=addHouseSegment(placed.project,placed.houseId,straight(40));project=acceptCornerBAlignment(project,placed.houseId,{distance:20,enteredText:'20'},0);project=addHouseSegment(project,placed.houseId,right(20));project=addHouseSegment(project,placed.houseId,right(40));project=addHouseSegment(project,placed.houseId,right(20));return completeClosedHouse(project,placed.houseId)}

describe('field review summary',()=>{
  it('summarizes roads, ties, walls, closure, and verification state',()=>{const summary=buildFieldReviewSummary(completeProject());expect(summary.roads[0]).toMatchObject({name:'Fiction Avenue',width:36,ties:2});expect(summary.house).toMatchObject({walls:4,phase:'complete',closureStatus:'closed'});expect(summary.unverifiedMeasurements).toBe(6);expect(summary.checklist.find(item=>item.label==='House closure reviewed')?.complete).toBe(true)});
  it('does not treat accepted discrepancies as unresolved warnings',()=>{const project=completeProject();project.warnings.push({id:'accepted',level:'review',code:'field-note',message:'Reviewed.',accepted:true},{id:'open',level:'error',code:'broken',message:'Needs review.'});const summary=buildFieldReviewSummary(project);expect(summary.warnings.map(item=>item.id)).toEqual(['open']);expect(summary.readyForDrafter).toBe(false)});
});
