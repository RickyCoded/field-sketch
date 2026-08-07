import { beforeEach, describe, expect, it } from 'vitest';
import type { MeasuredStructure, MeasurementSegment, ProjectFileV2 } from '../types';
import { useSketchStore } from '../store/useSketchStore';
import { canvasToFeet, feetToCanvas } from '../measurements/units';
import { calculateStructure, formatFeet, parseFeetInput, structureClosure, structureSelfIntersections } from './measurementGeometry';
import { calculateFeatureOffset } from './offsetGeometry';
import { sampleArc } from './siteGeometry';
import { migrateProject } from './projectMigration';
import { collectProjectWarnings } from './projectValidation';

const wall=(id:string,sequence:number,length:number,extra:Partial<MeasurementSegment>):MeasurementSegment=>({id,parentObjectId:'structure-test',sequence,length,directionMode:'relative',label:`${length}'`,measurementText:String(length),visibleLabel:true,labelPosition:{x:0,y:0},startCoordinate:{x:0,y:0},endCoordinate:{x:0,y:0},verified:false,measurementSource:'field-entry',createdAt:'2026-08-06T12:00:00Z',updatedAt:'2026-08-06T12:00:00Z',...extra});
const structure=(segments:MeasurementSegment[],closed=false):MeasuredStructure=>({id:'structure-test',entityType:'structure',type:'residence',name:'Test residence',startPoint:{x:0,y:0},segments,closed,stroke:'#000',fill:'transparent',lineWidth:2});
const rectangle=structure([wall('w1',1,10,{directionMode:'absolute',angle:0}),wall('w2',2,5,{turn:'right',turnAngle:90}),wall('w3',3,10,{turn:'right',turnAngle:90}),wall('w4',4,5,{turn:'right',turnAngle:90})],true);

describe('Version 2 measurement requirements',()=>{
  it('parses decimal feet and rejects invalid measurements',()=>{expect(parseFeetInput("33.80'")).toEqual({ok:true,value:33.8});expect(parseFeetInput('-1').ok).toBe(false);expect(parseFeetInput('0').ok).toBe(false)});
  it('formats without changing the stored decimal value',()=>{const value=2.257;expect(formatFeet(value,'whole')).toBe("2'");expect(formatFeet(value,'tenth')).toBe("2.3'");expect(formatFeet(value,'hundredth')).toBe("2.26'");expect(value).toBe(2.257)});
  it('resolves relative 90-degree and custom-angle turns',()=>{const s=structure([wall('a',1,10,{directionMode:'absolute',angle:0}),wall('b',2,10,{turn:'right',turnAngle:90}),wall('c',3,10,{turn:'left',turnAngle:45})]);const g=calculateStructure(s,1);expect(g.segments[1].angle).toBe(90);expect(g.segments[2].angle).toBe(45);expect(g.points[2]).toEqual({x:10,y:10})});
  it('reconstructs a structure and calculates closure',()=>{const g=calculateStructure(rectangle,8);expect(g.bounds.width).toBeCloseTo(80);expect(g.bounds.height).toBeCloseTo(40);expect(structureClosure(rectangle,8).distance).toBeCloseTo(0)});
  it('detects self-intersection but not a valid rectangle',()=>{const diagonal=Math.sqrt(200);const bow=structure([wall('a',1,diagonal,{directionMode:'absolute',angle:45}),wall('b',2,10,{directionMode:'absolute',angle:180}),wall('c',3,diagonal,{directionMode:'absolute',angle:315}),wall('d',4,10,{directionMode:'absolute',angle:180})],true);expect(structureSelfIntersections(bow,1)).toEqual([[0,2]]);expect(structureSelfIntersections(rectangle)).toEqual([])});
  it('calculates line and corner offsets',()=>{expect(calculateFeatureOffset({start:{x:0,y:0},end:{x:80,y:0}},{start:{x:0,y:20},end:{x:80,y:20}},8).value).toBe(2.5);expect(calculateFeatureOffset({start:{x:16,y:16},end:{x:16,y:16}},{start:{x:0,y:0},end:{x:80,y:0}},8).value).toBe(2)});
  it('generates radius-angle and three-point arcs',()=>{const radius=sampleArc({x:0,y:0},0,{id:'a',kind:'arc',method:'radius-angle',radius:5,sweepAngle:90,clockwise:true,label:'ARC'},8);expect(radius.points.length).toBeGreaterThan(8);const three=sampleArc({x:0,y:0},0,{id:'b',kind:'arc',method:'three-point',startPoint:{x:0,y:0},curvePoint:{x:20,y:20},endPoint:{x:40,y:0},label:'ARC'});expect(three.points.at(-1)).toEqual({x:40,y:0})});
  it('round-trips feet and canvas scale',()=>{const scale={feetPerCanvasUnit:.125};expect(canvasToFeet(feetToCanvas(33.8,scale),scale)).toBeCloseTo(33.8)});
});

describe('Version 2 editing and persistence',()=>{
  beforeEach(()=>useSketchStore.getState().newProject());
  it('inserts and deletes segments while rebuilding sequence numbers',()=>{useSketchStore.setState({measuredEntities:[rectangle]});useSketchStore.getState().insertSegment(rectangle.id,2);let current=useSketchStore.getState().measuredEntities[0];expect(current.segments).toHaveLength(5);expect(current.segments.map(x=>x.sequence)).toEqual([1,2,3,4,5]);const inserted=current.segments[2];useSketchStore.getState().deleteSegment(rectangle.id,inserted.id);current=useSketchStore.getState().measuredEntities[0];expect(current.segments.map(x=>x.id)).toEqual(['w1','w2','w3','w4']);expect(current.segments.map(x=>x.sequence)).toEqual([1,2,3,4])});
  it('saves and reopens a Version 2 project without losing measured data',()=>{useSketchStore.setState({mode:'measure',measuredEntities:[rectangle]});const saved=useSketchStore.getState().serialize();const disk=JSON.parse(JSON.stringify(saved)) as ProjectFileV2;useSketchStore.getState().newProject();useSketchStore.getState().loadProject(disk);const reopened=useSketchStore.getState().serialize() as ProjectFileV2;expect(reopened.version).toBe(2);expect(reopened.measuredEntities[0].segments.map(x=>x.length)).toEqual([10,5,10,5]);expect(reopened.mode).toBe('measure')});
  it('keeps Version 2 defaults when reopening a sparse project',()=>{const saved=useSketchStore.getState().serialize() as ProjectFileV2;const reopened=migrateProject(JSON.parse(JSON.stringify(saved)));expect(reopened.schemaVersion).toBe(2);expect(reopened.northArrow).toBeDefined();expect(reopened.semanticLayers?.length).toBeGreaterThan(0)});
  it('reviews unverified wall measurements',()=>{useSketchStore.setState({measuredEntities:[rectangle]});const warnings=collectProjectWarnings(useSketchStore.getState());expect(warnings.filter(x=>x.code==='UNVERIFIED_WALL')).toHaveLength(4)});
});
