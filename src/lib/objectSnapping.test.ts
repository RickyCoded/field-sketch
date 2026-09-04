import { describe,expect,it } from 'vitest';
import { snapObjectToSegments } from './objectSnapping';

describe('feature snapping',()=>{
  it('snaps an object edge to another object edge',()=>{const result=snapObjectToSegments({x:91,y:20,width:40,height:30},[{start:{x:100,y:0},end:{x:100,y:100}}],10);expect(result).toEqual({x:100,y:20,snapped:true})});
  it('snaps a corner to an angled lot line',()=>{const result=snapObjectToSegments({x:48,y:47,width:20,height:20},[{start:{x:0,y:0},end:{x:100,y:100}}],3);expect(result.snapped).toBe(true);expect(result.x).toBeCloseTo(47.5);expect(result.y).toBeCloseTo(47.5)});
  it('does not move an object outside the threshold',()=>{expect(snapObjectToSegments({x:20,y:20,width:10,height:10},[{start:{x:100,y:0},end:{x:100,y:100}}],8)).toEqual({x:20,y:20,snapped:false})});
});
