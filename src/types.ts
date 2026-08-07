export type Tool = 'select' | 'hand' | 'lot' | 'house' | 'fence' | 'driveway' | 'sidewalk' | 'patio' | 'rectangle' | 'polygon' | 'delete';
export type ShapeType = Exclude<Tool, 'select' | 'hand' | 'delete'>;

export interface Point { x: number; y: number }
export interface SketchObject {
  id: string; type: ShapeType; name: string; x: number; y: number; width: number; height: number;
  rotation: number; vertices: number[]; stroke: string; fill: string; lineWidth: number; locked: boolean;
}
export interface JobInfo { jobName:string;projectId:string;jobNumber?:string;address:string;client:string;preparedFor?:string;buyer?:string;titleCompany?:string;lender?:string;fieldWorker?:string;inspectionDate?:string;notes:string;date:string }
export type MeasurementPrecision = 'whole' | 'tenth' | 'hundredth';
export interface CanvasSettings { gridVisible: boolean; gridSize: number; snapToGrid: boolean; measurementPrecision?: MeasurementPrecision }
export interface Viewport { x: number; y: number; scale: number }
export type WorkspaceMode = 'sketch' | 'measure' | 'field-note';
export type DirectionMode = 'absolute' | 'relative';
export type TurnDirection = 'left' | 'right';
export type MeasuredEntityType = 'structure' | 'lot' | 'fence' | 'surface' | 'offset';
export type StructureType = 'residence' | 'attached-garage' | 'detached-garage' | 'porch' | 'covered-porch' | 'addition' | 'storage-building' | 'shed' | 'carport' | 'other';
export type MeasurementSource = 'field-entry' | 'canvas-adjustment' | 'imported';

/** A segment is the measured source of truth; rendered points are always derived. */
export interface MeasurementSegment {
  id: string; parentObjectId: string; sequence: number;
  length: number;
  directionMode: DirectionMode;
  angle?: number;
  turn?: TurnDirection;
  turnAngle?: number;
  label: string; measurementText: string; visibleLabel: boolean; labelPosition: Point;
  startCoordinate: Point; endCoordinate: Point;
  notes?: string;
  verified: boolean; measurementSource: MeasurementSource; createdAt: string; updatedAt: string;
  originalLength?: number; adjustedLength?: number; originalAngle?: number; adjustedAngle?: number;
  adjustmentMethod?: 'snap-closed' | 'distributed'; adjustmentAmount?: number;
}

export interface MeasuredStructure {
  id: string; entityType: 'structure'; type: StructureType; name: string; startPoint: Point;
  segments: MeasurementSegment[]; closed: boolean; stroke: string; fill: string; lineWidth: number;
  areaState?: AreaState;
}

export interface StructureBuilderSession {
  status: 'choose-start' | 'walking'; structureType: StructureType; name: string; structureId?: string;
  nextDirection: { directionMode: DirectionMode; angle?: number; turn?: TurnDirection; turnAngle?: number };
}
export interface ClosureReview { structureId: string }
export interface BuilderSegmentInput {
  length: number; measurementText: string; directionMode: DirectionMode; angle?: number; turn?: TurnDirection; turnAngle?: number; notes?: string;
}

// Later passes extend this discriminated union with lot, fence, surface, and
// offset entities while reusing the same versioned project infrastructure.
export type MeasuredEntity = MeasuredStructure;

export interface LotSide { id:string; sequence:number; length:number; angle:number; label:string; visible:boolean }
export interface StreetAssociation { id:string; name:string; sideIndex?:number }
export interface AdjacentParcelLabel { id:string; lotNumber:string; position:Point }
export interface MeasuredLot {
  id:string; name:string; blockInfo?:string; startPoint:Point; sides:LotSide[]; vertices:Point[];
  streetAssociations:StreetAssociation[]; adjacentLotLabels:AdjacentParcelLabel[]; notes:string;
  boundaryVisible:boolean; dimensionsVisible:boolean; stroke:string; fill:string; lineWidth:number;
}
export type LinkedLabelType='lot-number'|'adjacent-lot-number'|'street-name'|'residence'|'garage'|'porch'|'driveway'|'fence-type'|'general-note';
export interface LinkedLabel { id:string;type:LinkedLabelType;text:string;linkedObjectId:string;position:Point;orientation:'horizontal'|'vertical';visible:boolean }
export type MeasureWorkspace='structure'|'lot'|'road'|'offset'|'fence'|'surface';
export interface RoadMeasurement {
  id:string;streetName:string;measurementAnchor:Point;roadAngle:number;referenceLength:number;
  measuredWidth:number;graphicalWidth:number;curbA:{start:Point;end:Point};curbB:{start:Point;end:Point};
  labelPosition:Point;verified:boolean;notes:string;createdAt:string;updatedAt:string;
}
export interface RoadSession {step:'location'|'details';measurementAnchor?:Point}
export type OffsetFeatureKind='structure-segment'|'structure-corner'|'lot-side'|'sketch-object';
export interface OffsetFeatureReference { kind:OffsetFeatureKind;objectId:string;segmentId?:string;description:string }
export interface OffsetMeasurement {
  id:string;firstFeature:OffsetFeatureReference;secondFeature:OffsetFeatureReference;measuredValue:number;calculatedValue?:number;
  label:string;firstAnchor:Point;secondAnchor:Point;labelAnchor:Point;orientation:'horizontal'|'vertical'|'aligned';labelSide:'left'|'right';
  leaderLines:boolean;extensionLines:boolean;verified:boolean;notes:string;createdAt:string;updatedAt:string;
}
export interface OffsetSession {step:'first'|'second'|'location'|'details';firstFeature?:OffsetFeatureReference;secondFeature?:OffsetFeatureReference;labelAnchor?:Point}
export interface JogInput {firstLength:number;turn:TurnDirection;connectingLength:number;returnTurn:TurnDirection;finalLength?:number}
export type FenceType='iron'|'metal'|'stucco'|'wood'|'chain-link'|'privacy'|'masonry-wall'|'other';
export type SurfaceType='concrete'|'driveway'|'sidewalk'|'patio'|'covered-concrete'|'porch-slab'|'asphalt'|'gravel'|'other';
export type AreaState='covered'|'uncovered'|'enclosed'|'open';
export type ArcMethod='radius-angle'|'radius-length'|'three-point';
export interface SiteLineSegment {id:string;kind:'line';length:number;directionMode:DirectionMode;angle?:number;turn?:TurnDirection;turnAngle?:number;label:string}
export interface SiteArcSegment {id:string;kind:'arc';method:ArcMethod;radius?:number;sweepAngle?:number;arcLength?:number;clockwise?:boolean;startPoint?:Point;curvePoint?:Point;endPoint?:Point;label:string}
export type SitePathSegment=SiteLineSegment|SiteArcSegment;
export interface FenceGate {id:string;segmentId:string;distanceAlong:number;width:number;label:string}
export interface MeasuredFence {id:string;type:FenceType;name:string;startPoint:Point;segments:SitePathSegment[];closed:boolean;height?:number;gates:FenceGate[];notes:string;label:string;labelVisible:boolean;labelPosition:Point;lineStyle:'solid'|'dashed'|'double'|'cross';areaState:AreaState}
export interface MeasuredSurface {id:string;type:SurfaceType;name:string;geometryMode:'rectangle'|'polygon'|'polyline-width'|'curved';startPoint:Point;segments:SitePathSegment[];vertices:Point[];dimensions?:{width?:number;height?:number};width?:number;material:string;areaState:AreaState;notes:string;pattern:'none'|'diagonal'|'crosshatch'|'dots'|'gravel';label:string;labelPosition:Point}
export interface SiteBuilderSession {kind:'fence'|'surface';status:'choose-start'|'walking';entityId?:string;entityType:FenceType|SurfaceType}

export interface ProjectFileV1 {
  version: 1; job: JobInfo; canvas: CanvasSettings; objects: SketchObject[]; layers: string[]; viewport: Viewport;
}
export interface ProjectFileV2 {
  version: 2; schemaVersion?:2; job: JobInfo; canvas: CanvasSettings; objects: SketchObject[]; layers: string[]; viewport: Viewport;
  mode: WorkspaceMode; measuredEntities: MeasuredEntity[]; lots:MeasuredLot[]; linkedLabels:LinkedLabel[];offsets:OffsetMeasurement[];fences:MeasuredFence[];surfaces:MeasuredSurface[];roads?:RoadMeasurement[];
  projectSettings?:ProjectSettings;semanticLayers?:SemanticLayer[];fieldNotes?:FieldNoteFeature[];measurementRecords?:MeasurementRecord[];dimensions?:DimensionLabel[];northArrow?:NorthArrow;
  fieldChecklist?:FieldChecklist;
}

export interface DrawingScale { feetPerCanvasUnit:number;displayScale?:string }
export interface ProjectSettings {units:'decimal-feet';displayPrecision:MeasurementPrecision;scale:DrawingScale;gridSpacingFeet:number;northAngle:number}
export type FeatureStatus='rough'|'partially-measured'|'measured'|'verified';
export type SemanticLayerId='property'|'structures'|'fences'|'surfaces'|'dimensions'|'labels'|'field-notes'|'reference';
export interface SemanticLayer {id:SemanticLayerId;name:string;visible:boolean;locked:boolean;order:number}
export type FieldNoteFeature=
  | {id:string;kind:'rough-shape';name:string;points:Point[];closed:boolean;status:FeatureStatus;layerId:'field-notes';uncertain:boolean;needsVerification:boolean;notes:string}
  | {id:string;kind:'text';name:string;position:Point;text:string;status:FeatureStatus;layerId:'field-notes';uncertain:boolean;needsVerification:boolean}
  | {id:string;kind:'leader';name:string;start:Point;end:Point;text:string;status:FeatureStatus;layerId:'field-notes';uncertain:boolean;needsVerification:boolean};
export type MeasurementAssignmentType='wall'|'fence-segment'|'lot-line'|'concrete-edge'|'offset'|'general-note';
export interface MeasurementRecord {id:string;value:number;measurementText:string;note:string;featureType:string;temporaryLocation?:Point;voiceNotePlaceholder:boolean;assigned:boolean;assignmentType?:MeasurementAssignmentType;assignedObjectId?:string;createdAt:string;updatedAt:string}
export interface DimensionLabel {id:string;measurementRecordId?:string;linkedObjectId?:string;linkedSegmentId?:string;value:number;text:string;orientation:'horizontal'|'vertical'|'aligned'|'offset'|'short';start:Point;end:Point;labelPosition:Point;manualPosition?:Point;visible:boolean;arrows:boolean;ticks:boolean;extensionLines:boolean;layerId:'dimensions'}
export interface NorthArrow {id:string;position:Point;rotation:number;locked:boolean;visible:boolean;layerId:'reference'}
export type WarningLevel='information'|'review'|'error';
export interface ProjectWarning {id:string;level:WarningLevel;code:string;message:string;objectId?:string}
export type FieldChecklistKey='lot-entered'|'residence-entered'|'walls-measured'|'offsets-entered'|'fence-types'|'concrete-entered'|'north-checked'|'street-labels'|'unassigned-reviewed';
export type FieldChecklist=Record<FieldChecklistKey,boolean>;
export type ProjectFile = ProjectFileV1 | ProjectFileV2;
