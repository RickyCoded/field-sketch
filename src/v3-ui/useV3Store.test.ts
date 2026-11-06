import { beforeEach,describe,expect,it } from 'vitest';
import { createProjectV3 } from '../v3/project';
import { useV3Store } from './useV3Store';

describe('Version 3 project history',()=>{
  beforeEach(()=>{useV3Store.setState({project:createProjectV3(),error:null});useV3Store.setState({past:[],future:[]})});
  it('undoes and redoes one accepted project transaction',()=>{const store=useV3Store.getState();store.createRoad();expect(useV3Store.getState().project.roads).toHaveLength(1);expect(useV3Store.getState().past).toHaveLength(1);useV3Store.getState().undo();expect(useV3Store.getState().project.roads).toHaveLength(0);expect(useV3Store.getState().future).toHaveLength(1);useV3Store.getState().redo();expect(useV3Store.getState().project.roads).toHaveLength(1)});
  it('does not add pan and zoom changes to measurement history',()=>{const before=useV3Store.getState().past.length;useV3Store.getState().setViewport({x:10,y:20},12);expect(useV3Store.getState().past).toHaveLength(before)});
});
