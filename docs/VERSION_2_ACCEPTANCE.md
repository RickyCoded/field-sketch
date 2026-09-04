# ILR Sketch Version 2 acceptance record

Version 2 is accepted as a structured field-capture and drafting-handoff application. Measurement data remains the source of truth; canvas geometry is reconstructed from it.

| Completion criterion | Implementation evidence |
| --- | --- |
| Open a Version 1 project | Versioned migration in `src/lib/projectMigration.ts`, covered by migration tests. |
| Create or define a lot | Rectangle, measured polygon, and freehand conversion workflows in `LotPanel`. |
| Enter an irregular residence sequentially | Smart Structure Builder and Walk Structure workflow. |
| Add small wall jogs | Jog command creates ordinary editable measurement segments. |
| Edit a measurement and rebuild geometry | Wall editor updates the measurement sequence and immediately hydrates all following coordinates. |
| Add typed measured fences | Fence types and line/arc segment walks persist as semantic fence objects. |
| Add concrete and other surfaces | Semantic surface builder supports polygons, lines with width, rectangles, and curves. |
| Add measured offsets | Offset workflow stores both field and calculated values with feature references. |
| Add labels, notes, and north arrow | Linked labels, field notes, job notes, and movable/rotatable north arrow persist in the project. |
| Preserve rough and unassigned measurements | Field Note Mode and Measurement Inbox retain unassigned records in JSON. |
| Review missing, conflicting, or unverified information | Field Review, checklist, closure review, offset difference warnings, and explicit unverified wall/offset warnings. |
| Save and reopen all Version 2 data | Version 2 serializer and migration loader, covered by JSON round-trip tests. |
| Export a field sketch | PNG and PDF title-block exports use the current complete canvas. |
| Export drafter field data | Field Data Summary PDF includes measurements, feature lists, warnings, notes, and sketch preview. |

## Quality gates

- Geometry and persistence behavior is covered by automated tests.
- The fictional demo project exercises the primary completion workflows.
- TypeScript strict compilation and the production Vite build must pass.
- Version 2 non-goals remain excluded from the interface.

Visual polish is secondary to measurement integrity, fast entry, clear review, and editable reconstruction.
