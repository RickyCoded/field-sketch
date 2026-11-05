# ILR Sketch — Simplified Measurement Workflow

Status: Approved product behavior for the next redesign  
Proposed project schema: Version 3  
Scope name: Phase 1 — Street, Structure, and Referenced Improvements

## 1. Product goal

ILR Sketch is a field-measurement application that replaces a hand-drawn graph-paper sketch. It is not CAD and it does not establish legal boundaries. The application must turn decimal-foot measurements into a proportional, editable plan-view drawing while preserving the original field record.

The redesign has one canvas, one line-building system, and one measurement model. Feature types control appearance and review rules; they do not introduce unrelated drawing systems.

## 2. Phase 1 scope

Included:

- Graph-paper drawing canvas
- Decimal feet, displayed primarily to the nearest tenth
- Primary and secondary roads
- Back-of-curb-to-back-of-curb road width
- Perpendicular curb ties
- Irregular house and building footprints
- Jogs, recesses, projections, and custom turns
- Concrete, porches, sidewalks, fences, carports, and accessory buildings
- Drawing from existing points and measured positions along existing lines
- Associative references between features
- Closure review and documented adjustments
- Approximate rounded curb returns for visual reference
- Project saving, reopening, review, and PDF export

Excluded from Phase 1:

- Lot and property-line placement
- Boundary calculations, bearings, monuments, or legal descriptions
- Survey-grade curb-return geometry
- CAD/DXF export
- Legal certification, signatures, or seals

Lot and property-line work is reserved for a later product phase.

## 3. Measurement and coordinate rules

### 3.1 World coordinates

The data model stores world coordinates directly in decimal feet. Canvas pixels are a rendering concern only.

```text
world feet → viewport transform → screen pixels
```

Zoom never changes a measurement. No user-facing control accepts or displays canvas units or pixels.

### 3.2 Precision

- Internally store full JavaScript numeric precision.
- Default display and keypad entry to tenths of a foot.
- Accept additional decimals without silently rounding stored values.
- Format ordinary field labels as `25.4'`.
- Use `0.30'` exactly for the closure-tolerance comparison, regardless of display precision.

### 3.3 Graph paper

- Minor grid: 1 foot by default
- Medium grid: 5 feet
- Major grid: 10 feet
- Grid visibility is optional.
- Snapping may use grid points, existing endpoints, points on lines, perpendicular projections, intersections, and closure targets.

## 4. Core geometry model

Every measured path consists of instructions and derived geometry. Instructions are authoritative.

```ts
type Feet = number;
type Degrees = number;

interface PointFt {
  x: Feet;
  y: Feet;
}

interface LineInstruction {
  id: string;
  sequence: number;
  length: Feet;
  direction:
    | { mode: "absolute"; angle: Degrees }
    | { mode: "relative"; turn: "left" | "right" | "straight"; angle: Degrees };
  enteredText: string;
  note?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DerivedLine {
  instructionId: string;
  start: PointFt;
  end: PointFt;
  angle: Degrees;
}
```

Derived coordinates may be cached, but the application must be able to regenerate them from the start anchor and measurement instructions.

## 5. Unified feature types

```ts
type FeatureKind =
  | "house"
  | "other-building"
  | "carport"
  | "porch"
  | "concrete"
  | "sidewalk"
  | "fence"
  | "general-line";

interface MeasuredFeature {
  id: string;
  kind: FeatureKind;
  name: string;
  geometry: "open-path" | "closed-area";
  startAnchor: FeatureAnchor;
  segments: LineInstruction[];
  closure?: ClosureDecision;
  styleId: string;
  notes: string;
  visible: boolean;
}
```

The same line builder creates every feature. Styles determine line weight, dash pattern, fill/hatch, and default label.

## 6. Associative anchors

New geometry can begin from a free point or an existing measured feature.

```ts
type FeatureAnchor =
  | { type: "free"; point: PointFt }
  | { type: "endpoint"; featureId: string; segmentId: string; endpoint: "start" | "end" }
  | {
      type: "station-on-segment";
      featureId: string;
      segmentId: string;
      measuredFrom: "start" | "end";
      distance: Feet;
    }
  | {
      type: "perpendicular-from-segment";
      featureId: string;
      segmentId: string;
      station: Feet;
      side: "left" | "right";
      distance: Feet;
    };
```

Anchors store relationships, not only coordinates. When a source feature changes, dependent geometry rebuilds automatically.

Dependency rules:

1. Rebuild the changed source feature.
2. Resolve its anchors and derived lines.
3. Rebuild dependents in dependency order.
4. Prevent dependency cycles.
5. If an anchor can no longer resolve, retain its measurements and mark it `needs-review`.
6. Before deleting referenced geometry, show all dependent features and require confirmation.

If a station lies beyond a shortened source segment, do not clamp or guess. Flag the dependent feature for review.

## 7. Primary-road and house workflow

### 7.1 Draw the primary road

The user enters:

- Street name, optional
- Back-of-curb-to-back-of-curb width
- Approximate road direction
- Visible reference length

The road stores two authoritative straight back-of-curb lines. The house-side curb is selected explicitly.

### 7.2 Establish House Corner A

The user selects a point on the house-side back of curb and enters the perpendicular offset to House Corner A. Corner A becomes the fixed pivot for the front-house path.

### 7.3 Walk the complete front

Starting at Corner A, the user adds measured line instructions one at a time. Jogs and custom turns are ordinary segments. The path is initially shown in a provisional orientation.

### 7.4 Establish House Corner B

After the complete front is entered, its endpoint becomes Corner B. The user enters Corner B's perpendicular offset to the same curb.

The application rotates the complete front path rigidly about Corner A until Corner B lies on the required offset line.

It must:

- Preserve all front segment lengths and turns.
- Keep Corner A fixed.
- Never stretch the path.
- Calculate both geometric solutions when two exist.
- Default to the solution closest to the provisional walking direction.
- Let the user preview and switch solutions before accepting.
- Reject an impossible constraint when the measured path cannot reach the Corner B offset line.

For curb unit normal `n`, Corner A `A`, provisional front endpoint vector `v`, and curb offsets `dA` and `dB`, solve the rotation `R` such that:

```text
n · (R(v)) = dB - dA
```

A solution exists only when:

```text
abs(dB - dA) <= length(v)
```

### 7.5 Complete the house

After alignment, line entry continues from Corner B around the remaining structure. The accepted front orientation establishes the local direction for subsequent relative turns.

## 8. Drawing improvements from references

The `Draw From Reference` workflow is shared by concrete, porches, sidewalks, fences, carports, and other buildings.

1. Select an existing segment.
2. Choose measurement from its start or end.
3. Enter a distance along the segment.
4. Preview the anchored start point.
5. Choose along, opposite, perpendicular left, or perpendicular right.
6. Enter segments using lengths and relative turns.
7. Snap to an existing point or line when appropriate.
8. Finish open or close the feature.

Example porch:

```text
Start 5.0' from the selected house corner along the front wall
Perpendicular outward 5.0'
Right 90°, 10.0'
Right 90°, 5.0'
Close using the existing house wall
```

Closing against an existing line creates two associative attachments and a shared-edge reference. It does not duplicate or invent a field measurement.

## 9. Secondary road for a corner site

The completed house positions a secondary road. The secondary road never moves the house.

Workflow:

1. Add a side road and enter its curb-to-curb width.
2. Select the first fixed house corner and enter its perpendicular curb tie.
3. Select a different house corner and enter its perpendicular curb tie.
4. Preview the possible road-line solutions.
5. Choose the correct side of the house and accept.

For fixed house points `P1` and `P2`, signed offsets `d1` and `d2`, and `v = P2 - P1`, solve for a unit road normal `n`:

```text
n · v = d2 - d1
```

A solution exists only when:

```text
abs(d2 - d1) <= length(v)
```

The curb-line constant is:

```text
c = n · P1 - d1
```

The two possible normals produce the preview alternatives. The user selects the solution on the correct side of the structure.

Dependency direction:

```text
Primary road → house → secondary road
```

## 10. Approximate curb return

When two roads intersect, the application may generate a schematic rounded curb return.

- It is derived visual reference geometry.
- Straight curb lines remain authoritative.
- It does not affect road width, ties, snapping, or calculations.
- It is identified as `Approximate curb return` when selected.
- It may be shown, hidden, or assigned a visual radius.
- It rebuilds automatically when either road changes.
- If the roads are parallel or do not form a usable corner, no return is generated.

## 11. Closure review

When a closed structure is finished, calculate:

- Horizontal difference
- Vertical difference
- Direct closure error

### 11.1 Classification

```ts
type ClosureStatus =
  | "closed"
  | "within-field-tolerance"
  | "outside-field-tolerance";
```

- Effectively zero: `closed`
- Greater than zero and less than or equal to `0.30'`: `within-field-tolerance`
- Greater than `0.30'`: `outside-field-tolerance`

### 11.2 Within tolerance

Show an advisory and offer:

- Return and remeasure
- Leave as measured
- Adjust drawing to close

### 11.3 Outside tolerance

Show a red warning and initially direct the user back to measurements. After the user confirms remeasurement/review, offer:

- Leave as measured
- Adjust drawing to close
- Continue reviewing

### 11.4 Decisions and adjustments

```ts
interface ClosureDecision {
  status: ClosureStatus;
  horizontalError: Feet;
  verticalError: Feet;
  directError: Feet;
  decision: "none" | "left-as-measured" | "adjusted-final-wall" | "distributed";
  remeasurementConfirmed: boolean;
  originalInstructions: LineInstruction[];
  adjustedInstructions?: LineInstruction[];
  note?: string;
  decidedAt?: string;
}
```

Never silently alter an entered value. Adjustments preserve original instructions and record the method and amount.

## 12. Measurement warnings

Warnings do not automatically change geometry.

Flag:

- Zero or negative length
- Unusually large entry requiring confirmation
- Self-intersection
- Impossible primary or secondary curb-tie solution
- Return-to-line miss
- Missing or deleted reference
- Station beyond a shortened source segment
- Unexpectedly short segment
- Unusual custom angle
- Closure error

Warnings have `information`, `review`, or `error` severity and remain attached to the relevant feature until resolved or explicitly accepted.

## 13. Road data

```ts
interface RoadReference {
  id: string;
  role: "primary" | "secondary";
  name?: string;
  width: Feet;
  baseline: {
    origin: PointFt;
    angle: Degrees;
    visibleLength: Feet;
    houseSide: "left" | "right";
  };
  ties: CurbTie[];
  derivedFromHouseId?: string;
  approximateCurbReturn?: {
    visible: boolean;
    visualRadius?: Feet;
  };
  notes: string;
}

interface CurbTie {
  id: string;
  curbSide: "house-side" | "opposite";
  target: FeatureAnchor;
  perpendicularDistance: Feet;
  enteredText: string;
  verified: boolean;
}
```

## 14. Project schema

```ts
interface ProjectV3 {
  version: 3;
  projectId: string;
  job: JobInformation;
  units: "decimal-feet";
  displayPrecision: "tenth";
  grid: {
    visible: boolean;
    minorSpacing: Feet;
    snapEnabled: boolean;
  };
  roads: RoadReference[];
  features: MeasuredFeature[];
  dependencyOrder: string[];
  warnings: ProjectWarning[];
  viewport: {
    center: PointFt;
    pixelsPerFoot: number;
  };
  notes: ProjectNote[];
  createdAt: string;
  updatedAt: string;
}
```

`pixelsPerFoot` is viewport magnification only. It is not part of measurement conversion.

## 15. Editing behavior

- Editing an instruction rebuilds that segment and all following segments in the path.
- Dependent features rebuild after their sources.
- Before applying an edit, show affected dependent features.
- Undo/redo treats one accepted measurement edit and its dependent rebuild as one transaction.
- Original text entry remains available for audit.
- Numerical editing is always available; precise dragging is optional.
- Dragging measured points must update measurement instructions only through an explicit conversion/review action.

## 16. Review and PDF export

The field review must summarize:

- Road widths and curb ties
- Primary house alignment status
- Secondary-road alignment status, when present
- Structure closure errors and decisions
- Unresolved dependency warnings
- Unverified measurements
- Features left open or accepted with warnings

The field PDF must include:

- Job information
- Proportional sketch
- Street names and measured widths
- Curb ties
- Structure wall table
- Improvement feature list
- Closure results
- Accepted discrepancies and notes
- Approximate-curb-return disclaimer when shown
- General statement that the document is a field sketch and not a certified boundary survey

## 17. Compatibility and preservation

Before application code is replaced:

1. Tag the current deployed application as a stable legacy release.
2. Create a dedicated redesign branch.
3. Keep the existing project reader available during development.
4. Do not rewrite a Version 1 or Version 2 file in place.
5. Import compatible legacy data into a new Version 3 document and save it as a separate file.
6. Treat unsupported legacy objects as locked reference geometry with a migration warning.

## 18. Implementation sequence

1. Preserve the current release with a Git tag and redesign branch.
2. Introduce the Version 3 feet-based data model and project validation.
3. Build pure geometry functions for line reconstruction, anchors, dependencies, and intersections.
4. Implement primary road and Corner A placement.
5. Implement provisional front-house walking and Corner B rotational alignment.
6. Implement remaining house walk and closure review.
7. Implement `Draw From Reference` and shared-edge closure.
8. Add feature styles for concrete, porch, sidewalk, fence, carport, and other building.
9. Implement secondary-road solution and approximate curb return.
10. Add dependency-aware editing and transactional undo/redo.
11. Add review summaries and PDF export.
12. Add legacy import, automated tests, tablet testing, and field sample projects.

## 19. Minimum automated tests

- Decimal-foot parsing and tenth-foot formatting
- Feet-coordinate rendering independent of zoom
- Relative and custom-angle reconstruction
- Provisional front path with multiple jogs
- Both Corner B rotation solutions
- Impossible Corner B constraint
- Station-on-segment anchors from either endpoint
- Perpendicular feature start
- Shared-edge closure
- Dependency rebuild after a source edit
- Invalid anchor after source shortening
- Dependency-cycle prevention
- Closure classifications at `0.00'`, `0.30'`, and greater than `0.30'`
- Preservation of original values after both adjustment methods
- Secondary-road two-tie solutions
- Impossible secondary-road ties
- Approximate curb return excluded from measurement calculations
- Version 1 and Version 2 import without overwriting the source file
- Save and reopen of a complete Version 3 project

## 20. Phase 1 completion criteria

Phase 1 is complete when a field worker can:

1. Enter a road width and draw both back-of-curb lines.
2. Tie Corner A to the house-side curb.
3. Walk an irregular front with multiple jogs.
4. Tie Corner B and align the front without changing its measurements.
5. Complete an irregular house footprint.
6. Review and document a closure discrepancy.
7. Start an improvement from a measured station on any existing line.
8. Draw and close a porch against a shared house wall.
9. Edit a house measurement and see attached features rebuild or receive a clear review warning.
10. Add a secondary road from two fixed house-corner ties.
11. Show an approximate rounded curb return without using it in calculations.
12. Save, reopen, review, and export the complete measured field record.
