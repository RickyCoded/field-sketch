import { describe,expect,it } from 'vitest';
import { placeDimensionLabel } from './dimensionLayout';
import { canvasToFeet, feetToCanvas } from './units';
import type { DimensionLabel } from '../types';
describe('measurement infrastructure',()=>{it('round-trips stable feet and canvas units',()=>{const scale={feetPerCanvasUnit:.125};expect(feetToCanvas(33.8,scale)).toBeCloseTo(270.4);expect(canvasToFeet(270.4,scale)).toBeCloseTo(33.8)});it('moves automatic labels away from collisions without touching manual positions',()=>{const existing=[{visible:true,labelPosition:{x:100,y:100}} as DimensionLabel];expect(placeDimensionLabel({x:100,y:100},existing)).toEqual({x:100,y:124})})});
