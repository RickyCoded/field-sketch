import { describe,expect,it } from 'vitest';
import { createProjectV3, parseProjectV3, serializeProjectV3, validateProjectV3 } from './project';
import { addPrimaryRoad, derivePrimaryCurbLines, establishCornerA, resolveCurbTiePoint } from './roadWorkflow';

describe('Version 3 project documents',()=>{
  it('creates, saves, and reopens a feet-native project',()=>{const project=createProjectV3('Fictional Test Job','2026-11-05T12:00:00.000Z'),reopened=parseProjectV3(serializeProjectV3(project));expect(reopened.version).toBe(3);expect(reopened.units).toBe('decimal-feet');expect(reopened.grid.minorSpacing).toBe(1);expect(reopened.viewport.pixelsPerFoot).toBe(8)});
  it('rejects multiple primary roads',()=>{let project=createProjectV3();project=addPrimaryRoad(project,{width:36,origin:{x:0,y:0},angle:0,visibleLength:100,houseSide:'right'});const duplicate={...project.roads[0],id:'other'};expect(validateProjectV3({...project,roads:[...project.roads,duplicate]})).toContain('A Phase 1 project can have only one primary road.')});
});

describe('primary road and Corner A',()=>{
  it('derives two curb lines at the measured road width',()=>{let project=createProjectV3();project=addPrimaryRoad(project,{name:'Juniper Avenue',width:36,origin:{x:0,y:0},angle:0,visibleLength:120,houseSide:'right'});const curbs=derivePrimaryCurbLines(project.roads[0]);expect(curbs.houseSide.origin).toEqual({x:0,y:0});expect(curbs.opposite.origin).toEqual({x:0,y:-36})});
  it('places Corner A from a perpendicular tie and keeps an associative anchor',()=>{let project=createProjectV3();project=addPrimaryRoad(project,{width:36,origin:{x:0,y:0},angle:0,visibleLength:120,houseSide:'right'});const result=establishCornerA(project,{roadId:project.roads[0].id,station:25,distance:18.4,enteredText:'18.4'});expect(result.cornerA).toEqual({x:25,y:18.4});const house=result.project.features[0];expect(house.startAnchor).toEqual({type:'curb-tie',roadId:project.roads[0].id,tieId:result.tieId});expect(resolveCurbTiePoint(result.project,project.roads[0].id,result.tieId)).toEqual(result.cornerA)});
  it('rejects an off-reference station',()=>{let project=createProjectV3();project=addPrimaryRoad(project,{width:30,origin:{x:0,y:0},angle:0,visibleLength:50,houseSide:'left'});expect(()=>establishCornerA(project,{roadId:project.roads[0].id,station:60,distance:20,enteredText:'20'})).toThrow(/visible curb/i)});
});
