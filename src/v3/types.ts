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
