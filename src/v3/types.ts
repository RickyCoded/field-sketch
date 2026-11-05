/** Version 3 stores geometry directly in decimal feet. Screen pixels never enter this model. */
export type Feet = number;
export type Degrees = number;

export interface PointFt { x:Feet;y:Feet }

export type LineDirection=
  | {mode:'absolute';angle:Degrees}
  | {mode:'relative';turn:'left'|'right'|'straight';angle:Degrees};

export interface LineInstruction {
  id:string;
  sequence:number;
  length:Feet;
  direction:LineDirection;
  enteredText:string;
  note?:string;
  verified:boolean;
  createdAt:string;
  updatedAt:string;
}

export interface DerivedLine {instructionId:string;start:PointFt;end:PointFt;angle:Degrees}
export interface DerivedPath {points:PointFt[];lines:DerivedLine[];finalAngle:Degrees}

export type ClosureStatus='closed'|'within-field-tolerance'|'outside-field-tolerance';
export interface ClosureResult {horizontalError:Feet;verticalError:Feet;directError:Feet;status:ClosureStatus}

export interface OrientedLine {origin:PointFt;direction:PointFt;normal:PointFt}
export interface FrontAlignmentSolution {rotation:Degrees;points:PointFt[];cornerB:PointFt}
export interface SecondaryRoadSolution extends OrientedLine {lineConstant:number}

export type FeatureKind='house'|'other-building'|'carport'|'porch'|'concrete'|'sidewalk'|'fence'|'general-line';
export type FeatureAnchor=
  | {type:'free';point:PointFt}
  | {type:'curb-tie';roadId:string;tieId:string}
  | {type:'endpoint';featureId:string;segmentId:string;endpoint:'start'|'end'}
  | {type:'station-on-segment';featureId:string;segmentId:string;measuredFrom:'start'|'end';distance:Feet}
  | {type:'perpendicular-from-segment';featureId:string;segmentId:string;station:Feet;side:'left'|'right';distance:Feet};

export interface ClosureDecision extends ClosureResult {
  decision:'none'|'left-as-measured'|'adjusted-final-wall'|'distributed';
  remeasurementConfirmed:boolean;
  originalInstructions:LineInstruction[];
  adjustedInstructions?:LineInstruction[];
  note?:string;
  decidedAt?:string;
}

export interface MeasuredFeatureV3 {
  id:string;kind:FeatureKind;name:string;geometry:'open-path'|'closed-area';startAnchor:FeatureAnchor;
  segments:LineInstruction[];closure?:ClosureDecision;styleId:string;notes:string;visible:boolean;
}

export interface FeaturePointReference {featureId:string;pointRole:'start'|'end';segmentId?:string}
export interface CurbTieV3 {
  id:string;curbSide:'house-side'|'opposite';target:FeaturePointReference;station:Feet;
  perpendicularDistance:Feet;enteredText:string;verified:boolean;
}

export interface RoadReferenceV3 {
  id:string;role:'primary'|'secondary';name?:string;width:Feet;
  baseline:{origin:PointFt;angle:Degrees;visibleLength:Feet;houseSide:'left'|'right'};
  ties:CurbTieV3[];derivedFromHouseId?:string;
  approximateCurbReturn?:{visible:boolean;visualRadius?:Feet};notes:string;
}

export interface JobInformationV3 {jobName:string;projectId:string;address?:string;client?:string;fieldWorker?:string;inspectionDate?:string;notes?:string}
export interface ProjectWarningV3 {id:string;level:'information'|'review'|'error';code:string;message:string;featureId?:string;roadId?:string;accepted?:boolean}
export interface ProjectNoteV3 {id:string;text:string;createdAt:string}

export interface ProjectV3 {
  version:3;projectId:string;job:JobInformationV3;units:'decimal-feet';displayPrecision:'tenth';
  grid:{visible:boolean;minorSpacing:Feet;snapEnabled:boolean};roads:RoadReferenceV3[];features:MeasuredFeatureV3[];
  dependencyOrder:string[];warnings:ProjectWarningV3[];viewport:{center:PointFt;pixelsPerFoot:number};notes:ProjectNoteV3[];
  createdAt:string;updatedAt:string;
}
