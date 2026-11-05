import { describe,expect,it } from 'vitest';
import { calculateClosure, lineFromPoints, perpendicularOffset, pointAlongSegment, reconstructPath, solveFrontAlignment, solveSecondaryRoad } from './geometry';
import type { LineInstruction } from './types';

const segment=(id:string,sequence:number,length:number,direction:LineInstruction['direction']):LineInstruction=>({id,sequence,length,direction,enteredText:String(length),verified:false,createdAt:'2026-01-01',updatedAt:'2026-01-01'});

describe('feet-native path reconstruction',()=>{
  it('uses feet directly and supports relative jogs',()=>{const path=reconstructPath({x:0,y:0},[segment('a',1,10,{mode:'absolute',angle:0}),segment('b',2,5,{mode:'relative',turn:'right',angle:90}),segment('c',3,3,{mode:'relative',turn:'left',angle:90})]);expect(path.points).toEqual([{x:0,y:0},{x:10,y:0},{x:10,y:5},{x:13,y:5}])});
  it('is independent of viewport zoom because no pixel scale is accepted',()=>{expect(reconstructPath({x:2,y:3},[segment('a',1,25.4,{mode:'absolute',angle:0})]).points.at(-1)?.x).toBeCloseTo(27.4)});
});

describe('reference geometry',()=>{
  it('resolves a station from either endpoint',()=>{expect(pointAlongSegment({x:0,y:0},{x:20,y:0},5,'start')).toEqual({x:5,y:0});expect(pointAlongSegment({x:0,y:0},{x:20,y:0},5,'end')).toEqual({x:15,y:0})});
  it('creates perpendicular offsets from an oriented curb',()=>{const curb=lineFromPoints({x:0,y:0},{x:100,y:0},'right');expect(perpendicularOffset(curb,20,15)).toEqual({x:20,y:15})});
});

describe('primary-road house alignment',()=>{
  it('returns two rigid rotation solutions and prefers the smallest adjustment',()=>{const solutions=solveFrontAlignment({x:0,y:20},[{x:0,y:20},{x:40,y:20}],{x:0,y:1},20,25);expect(solutions).toHaveLength(2);for(const solution of solutions){expect(Math.hypot(solution.cornerB.x,solution.cornerB.y-20)).toBeCloseTo(40);expect(solution.cornerB.y).toBeCloseTo(25)}});
  it('rejects an unreachable second tie',()=>{expect(()=>solveFrontAlignment({x:0,y:0},[{x:0,y:0},{x:10,y:0}],{x:0,y:1},5,20)).toThrow(/cannot reach/i)});
});

describe('secondary-road solving',()=>{
  it('finds both road solutions without moving the house corners',()=>{const solutions=solveSecondaryRoad({x:0,y:0},{x:30,y:0},10,14);expect(solutions).toHaveLength(2);for(const line of solutions){expect(line.normal.x*0+line.normal.y*0-line.lineConstant).toBeCloseTo(10);expect(line.normal.x*30+line.normal.y*0-line.lineConstant).toBeCloseTo(14)}});
  it('rejects impossible ties',()=>{expect(()=>solveSecondaryRoad({x:0,y:0},{x:5,y:0},2,10)).toThrow(/cannot define/i)});
});

describe('closure classification',()=>{
  it('classifies zero, tolerance boundary, and red-flag errors',()=>{expect(calculateClosure([{x:0,y:0},{x:0,y:0}]).status).toBe('closed');expect(calculateClosure([{x:0,y:0},{x:.3,y:0}]).status).toBe('within-field-tolerance');expect(calculateClosure([{x:0,y:0},{x:.301,y:0}]).status).toBe('outside-field-tolerance')});
});
