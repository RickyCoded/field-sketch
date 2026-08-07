import { describe, expect, it } from 'vitest';
import type { MeasuredStructure, MeasurementSegment } from '../types';
import { calculateStructure, distributeStructureClosure, parseFeetInput, segmentFromEndpoint, snapStructureClosed, structureClosure } from './measurementGeometry';

const segment=(value:Partial<MeasurementSegment>&Pick<MeasurementSegment,'id'|'length'|'directionMode'|'label'>):MeasurementSegment=>({parentObjectId:'s1',sequence:1,measurementText:String(value.length),visibleLabel:true,labelPosition:{x:0,y:0},startCoordinate:{x:0,y:0},endCoordinate:{x:0,y:0},verified:false,measurementSource:'field-entry',createdAt:'2026-01-01',updatedAt:'2026-01-01',...value});

const rectangle: MeasuredStructure = { id:'s1',entityType:'structure',type:'residence',name:'Residence',startPoint:{x:0,y:0},closed:true,stroke:'#000',fill:'transparent',lineWidth:2,segments:[
  segment({id:'w1',sequence:1,length:10,directionMode:'absolute',angle:0,label:"10'"}),
  segment({id:'w2',sequence:2,length:5,directionMode:'relative',turn:'right',turnAngle:90,label:"5'"}),
  segment({id:'w3',sequence:3,length:10,directionMode:'relative',turn:'right',turnAngle:90,label:"10'"}),
  segment({id:'w4',sequence:4,length:5,directionMode:'relative',turn:'right',turnAngle:90,label:"5'"}),
]};

describe('measurement geometry',()=>{
  it('derives a closed proportional rectangle from measurements',()=>{const g=calculateStructure(rectangle,10);expect(g.points.at(-1)!.x).toBeCloseTo(0);expect(g.points.at(-1)!.y).toBeCloseTo(0);expect(g.bounds.width).toBeCloseTo(100);expect(g.bounds.height).toBeCloseTo(50);expect(g.closureError).toBeCloseTo(0)});
  it('converts a moved endpoint back into measurement data',()=>{const next=segmentFromEndpoint(rectangle.segments[0],{x:0,y:0},{x:30,y:40},10);expect(next.length).toBe(5);expect(next.angle).toBeCloseTo(53.13,1);expect(next.directionMode).toBe('absolute')});
  it('normalizes decimal feet without rounding stored values',()=>{expect(parseFeetInput("33.80'")).toEqual({ok:true,value:33.8});expect(parseFeetInput('0').ok).toBe(false);expect(parseFeetInput('-2').ok).toBe(false);expect(parseFeetInput('wall').ok).toBe(false)});
  it('preserves entered values when applying approved closure adjustments',()=>{const open={...rectangle,segments:rectangle.segments.map((x,i)=>i===3?{...x,length:4.8}:x)};expect(structureClosure(open,10).distance).toBeCloseTo(.2);const snapped=snapStructureClosed(open,10);expect(snapped.segments[3].length).toBe(4.8);expect(snapped.segments[3].originalLength).toBe(4.8);expect(snapped.segments[3].adjustedLength).toBeCloseTo(5);expect(structureClosure(snapped,10).distance).toBeCloseTo(0);const distributed=distributeStructureClosure(open,10);expect(distributed.segments.every(x=>x.length===open.segments[x.sequence-1].length)).toBe(true);expect(structureClosure(distributed,10).distance).toBeCloseTo(0)});
});
