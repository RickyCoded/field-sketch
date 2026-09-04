# ILR Sketch

ILR Sketch is a lightweight field-sketching and structured measurement application for Improvement Location Report workflows. It is designed for preliminary field capture and drafting handoff—not as surveying or CAD software.

## Development

```powershell
pnpm install
pnpm test
pnpm run build
```

The fictional demonstration file at `public/samples/fieldsketch-v2-demo.fieldsketch.json` can be loaded with **Open Job**.

## Architecture

- `src/geometry` and `src/measurements` contain unit-level geometry primitives.
- `src/lib` contains domain calculations, migration, validation, and project reconstruction.
- `src/store` owns project commands, persistence, and undo/redo.
- `src/components` contains field workflows and canvas presentation.
- `src/export` contains output adapters and does not alter project measurements.

Measurement instructions remain the source of truth. Rendered coordinates are reconstructed from those instructions. Future capabilities should be introduced as new domain modules and versioned schema migrations rather than embedded into canvas components.

See [Version 2 scope](docs/VERSION_2_SCOPE.md) for explicit product boundaries.

The completed workflow is mapped in the [Version 2 acceptance record](docs/VERSION_2_ACCEPTANCE.md).
