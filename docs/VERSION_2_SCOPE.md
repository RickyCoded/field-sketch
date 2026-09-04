# ILR Sketch Version 2 scope

## Product boundary

Version 2 is a field-data collection and preliminary drafting tool. It records measurements, reconstructs proportional geometry, preserves differences between measured and scaled values, and exports information for a drafter.

It does not establish legal boundaries and must not be represented as a certified survey, legal report, CAD replacement, or regulatory compliance system.

## Explicit non-goals

Version 2 does not implement:

- legal boundary-survey calculations;
- professional land-survey certification;
- generated legal descriptions;
- bearing-and-distance traverse adjustment;
- survey monument calculations;
- county-specific compliance guarantees;
- automatic title-company forms;
- full CAD behavior;
- DXF export;
- GPS boundary establishment;
- camera or LiDAR measurement;
- office signature, seal, or certification workflows.

No toolbar or panel should advertise one of these capabilities until a complete, reviewed workflow exists. In particular, disabled or inert “coming soon” controls are not part of the UI strategy.

## Extension boundary

Potential future work should preserve the current separation of concerns:

1. Add typed domain data to the versioned project schema.
2. Implement calculations as pure modules under `src/geometry`, `src/measurements`, or `src/lib`.
3. Add migration and automated tests before exposing a workflow.
4. Keep canvas rendering derived from structured project data.
5. Add user controls only when creation, editing, persistence, review, and export are functional.

Certification, legal, and regulatory features would additionally require domain-expert review and requirements outside the current application architecture.
