import { describe,expect,it } from 'vitest';
import { arcSweepFromLength, calculateSitePath, sampleArc } from './siteGeometry';

describe('site path geometry',()=>{
  it('builds mixed straight and curved paths',()=>{const path=calculateSitePath({x:0,y:0},[{id:'l',kind:'line',length:10,directionMode:'absolute',angle:0,label:"10'"},{id:'a',kind:'arc',method:'radius-angle',radius:5,sweepAngle:90,clockwise:true,label:'ARC'}],8);expect(path.points[1].x).toBeCloseTo(80);expect(path.points.length).toBeGreaterThan(9);expect(path.heading).toBeCloseTo(90)});
  it('derives sweep from radius and arc length',()=>expect(arcSweepFromLength(10,Math.PI*5)).toBeCloseTo(90));
  it('supports a three-point arc',()=>{const arc=sampleArc({x:0,y:0},0,{id:'a',kind:'arc',method:'three-point',startPoint:{x:0,y:0},curvePoint:{x:50,y:50},endPoint:{x:100,y:0},label:'ARC'});expect(arc.points.length).toBeGreaterThan(8);expect(arc.points.at(-1)!.x).toBeCloseTo(100);expect(arc.points.at(-1)!.y).toBeCloseTo(0)});
});
