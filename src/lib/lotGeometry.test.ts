import { describe,expect,it } from 'vitest';
import { rectangleLotGeometry, sidesFromVertices, verticesFromSides } from './lotGeometry';

describe('lot geometry',()=>{
  it('creates a proportional rectangle from width and depth',()=>{const lot=rectangleLotGeometry({x:100,y:100},44.5,80,10);expect(lot.sides.map(x=>x.length)).toEqual([44.5,80,44.5,80]);expect(lot.vertices[1].x-lot.vertices[0].x).toBeCloseTo(445);expect(lot.vertices[2].y-lot.vertices[1].y).toBeCloseTo(800)});
  it('round-trips measured polygon side geometry',()=>{const vertices=[{x:0,y:0},{x:80,y:0},{x:80,y:40},{x:0,y:40}];const sides=sidesFromVertices(vertices,true,8);const rebuilt=verticesFromSides(vertices[0],sides,8);expect(sides.map(x=>x.length)).toEqual([10,5,10,5]);expect(rebuilt.at(-1)!.x).toBeCloseTo(0);expect(rebuilt.at(-1)!.y).toBeCloseTo(0)});
});
