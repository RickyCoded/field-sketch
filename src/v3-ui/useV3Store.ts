import { create } from 'zustand';
import { acceptCornerBAlignment, addHouseSegment, previewCornerBAlignment, removeLastHouseSegment } from '../v3/houseWorkflow';
import { createProjectV3, parseProjectV3 } from '../v3/project';
import { addPrimaryRoad, establishCornerA } from '../v3/roadWorkflow';
import { beginHouseClosureReview, completeClosedHouse, confirmHouseRemeasured, reopenHouse, resolveHouseClosure, type ClosureResolution } from '../v3/closureWorkflow';
import type { LineDirection, ProjectV3 } from '../v3/types';

type RoadDraft={name:string;width:string;angle:string;visibleLength:string;houseSide:'left'|'right'};
type CornerDraft={station:string;distance:string;frontDirection:'with-road'|'against-road'};
type WallDraft={length:string;turn:'straight'|'left'|'right';angle:string};

interface V3State{
  project:ProjectV3;roadDraft:RoadDraft;cornerDraft:CornerDraft;wallDraft:WallDraft;cornerBDistance:string;
  alignmentPreview:ReturnType<typeof previewCornerBAlignment>|null;selectedSolution:0|1;closureNote:string;error:string|null;
  setRoadDraft:(patch:Partial<RoadDraft>)=>void;setCornerDraft:(patch:Partial<CornerDraft>)=>void;setWallDraft:(patch:Partial<WallDraft>)=>void;setCornerBDistance:(value:string)=>void;setSelectedSolution:(value:0|1)=>void;
  createRoad:()=>void;createCornerA:()=>void;addWall:()=>void;undoWall:()=>void;previewCornerB:()=>void;acceptCornerB:()=>void;finishHouse:()=>void;confirmRemeasured:()=>void;resolveClosure:(resolution:ClosureResolution)=>void;returnToMeasurements:()=>void;setClosureNote:(value:string)=>void;
  newProject:()=>void;openProject:(json:string)=>void;setViewport:(center:{x:number;y:number},pixelsPerFoot:number)=>void;toggleGrid:()=>void;clearError:()=>void;
}

const roadDraft=():RoadDraft=>({name:'',width:'36.0',angle:'0',visibleLength:'140',houseSide:'right'});
const cornerDraft=():CornerDraft=>({station:'20.0',distance:'20.0',frontDirection:'with-road'});
const wallDraft=():WallDraft=>({length:'',turn:'straight',angle:'90'});
const number=(value:string,label:string,allowZero=false)=>{const normalized=value.trim().replace(/'$/,'');const parsed=Number(normalized);if(!Number.isFinite(parsed)||(allowZero?parsed<0:parsed<=0))throw new Error(`${label} must be ${allowZero?'zero or greater':'greater than zero'}.`);return parsed};
const changed=(project:ProjectV3)=>({...project,updatedAt:new Date().toISOString()});

export const useV3Store=create<V3State>((set,get)=>({
  project:createProjectV3(),roadDraft:roadDraft(),cornerDraft:cornerDraft(),wallDraft:wallDraft(),cornerBDistance:'20.0',alignmentPreview:null,selectedSolution:0,closureNote:'',error:null,
  setRoadDraft:patch=>set(state=>({roadDraft:{...state.roadDraft,...patch},error:null})),setCornerDraft:patch=>set(state=>({cornerDraft:{...state.cornerDraft,...patch},error:null})),setWallDraft:patch=>set(state=>({wallDraft:{...state.wallDraft,...patch},error:null})),setCornerBDistance:value=>set({cornerBDistance:value,error:null}),setSelectedSolution:selectedSolution=>set({selectedSolution}),clearError:()=>set({error:null}),
  createRoad:()=>attempt(set,()=>{const state=get(),draft=state.roadDraft;return{project:addPrimaryRoad(state.project,{name:draft.name,width:number(draft.width,'Road width'),origin:{x:0,y:0},angle:number(draft.angle,'Road angle',true),visibleLength:number(draft.visibleLength,'Visible road length'),houseSide:draft.houseSide})}}),
  createCornerA:()=>attempt(set,()=>{const state=get(),road=state.project.roads.find(item=>item.role==='primary');if(!road)throw new Error('Create the road first.');const draft=state.cornerDraft,placed=establishCornerA(state.project,{roadId:road.id,station:number(draft.station,'Curb station',true),distance:number(draft.distance,'Corner A tie'),enteredText:draft.distance,frontDirection:draft.frontDirection});return{project:placed.project,cornerBDistance:draft.distance}}),
  addWall:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('Establish Corner A first.');const draft=state.wallDraft,angle=draft.turn==='straight'?0:number(draft.angle,'Turn angle'),direction:LineDirection={mode:'relative',turn:draft.turn,angle};return{project:addHouseSegment(state.project,house.id,{length:number(draft.length,'Wall length'),enteredText:draft.length,direction}),wallDraft:{...draft,length:''},alignmentPreview:null}}),
  undoWall:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('There is no house wall to undo.');return{project:removeLastHouseSegment(state.project,house.id),alignmentPreview:null}}),
  previewCornerB:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('Establish Corner A first.');return{alignmentPreview:previewCornerBAlignment(state.project,house.id,{distance:number(state.cornerBDistance,'Corner B tie'),enteredText:state.cornerBDistance}),selectedSolution:0}}),
  acceptCornerB:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house||!state.alignmentPreview)throw new Error('Preview the Corner B alignment first.');return{project:acceptCornerBAlignment(state.project,house.id,{distance:number(state.cornerBDistance,'Corner B tie'),enteredText:state.cornerBDistance},state.selectedSolution),alignmentPreview:null}}),
  finishHouse:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('There is no house to finish.');const reviewed=beginHouseClosureReview(state.project,house.id),closure=reviewed.features.find(item=>item.id===house.id)?.closure;return{project:closure?.status==='closed'?completeClosedHouse(state.project,house.id):reviewed,closureNote:''}}),
  confirmRemeasured:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('There is no house closure to review.');return{project:confirmHouseRemeasured(state.project,house.id)}}),
  resolveClosure:resolution=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house?.closure)throw new Error('Review the house closure first.');if(resolution==='left-as-measured'&&house.closure.status==='outside-field-tolerance'&&!state.closureNote.trim())throw new Error('Add a field note explaining why the closure difference is being retained.');return{project:resolveHouseClosure(state.project,house.id,resolution,state.closureNote)}}),
  returnToMeasurements:()=>attempt(set,()=>{const state=get(),house=state.project.features.find(item=>item.kind==='house');if(!house)throw new Error('There is no house to reopen.');return{project:reopenHouse(state.project,house.id),closureNote:''}}),setClosureNote:closureNote=>set({closureNote,error:null}),
  newProject:()=>set({project:createProjectV3(),roadDraft:roadDraft(),cornerDraft:cornerDraft(),wallDraft:wallDraft(),cornerBDistance:'20.0',alignmentPreview:null,closureNote:'',error:null}),
  openProject:json=>attempt(set,()=>({project:parseProjectV3(json),alignmentPreview:null})),
  setViewport:(center,pixelsPerFoot)=>set(state=>({project:changed({...state.project,viewport:{center,pixelsPerFoot}})})),toggleGrid:()=>set(state=>({project:changed({...state.project,grid:{...state.project.grid,visible:!state.project.grid.visible}})})),
}));

function attempt(set:(patch:Partial<V3State>)=>void,action:()=>Partial<V3State>){try{set({...action(),error:null})}catch(error){set({error:error instanceof Error?error.message:'The measurement could not be applied.'})}}
