import type { OcctTriangulationParams } from "occt-import-js";

/** Same tessellation settings as browser preview and migrate-glb script. */
export const DEFAULT_STEP_TRIANGULATION: OcctTriangulationParams = {
	linearDeflection: 0.02,
	angularDeflection: 0.15,
	linearDeflectionType: "bounding_box_ratio",
};

/** Faster batch migration / server jobs — lower mesh density, still usable for preview. */
export const MIGRATION_STEP_TRIANGULATION: OcctTriangulationParams = {
	linearDeflection: 0.06,
	angularDeflection: 0.35,
	linearDeflectionType: "bounding_box_ratio",
};