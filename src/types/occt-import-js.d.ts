declare module "occt-import-js" {
	export interface OcctMesh {
		name?: string;
		color?: [number, number, number];
		attributes: {
			position?: { array: Float32Array };
			normal?: { array: Float32Array };
		};
		index?: { array: Uint32Array };
		brep_faces?: Array<{
			first: number;
			last: number;
			color?: [number, number, number] | null;
		}>;
	}

	export interface OcctTriangulationParams {
		linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
		linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
		linearDeflection?: number;
		angularDeflection?: number;
	}

	export interface OcctResult {
		success: boolean;
		meshes?: OcctMesh[];
		compounds?: Array<{ name?: string; meshes?: number[] }>;
	}

	export interface OcctModule {
		ReadStepFile(
			data: Uint8Array,
			params?: OcctTriangulationParams | null,
		): OcctResult;
		ReadIgesFile(
			data: Uint8Array,
			params?: OcctTriangulationParams | null,
		): OcctResult;
		ReadBrepFile(data: Uint8Array): OcctResult;
		ReadFile(filename: string): OcctResult;
	}

	export interface OcctOptions {
		locateFile?: (url: string) => string;
		noInitialRun?: boolean;
	}

	type OcctFactory = (options?: OcctOptions) => Promise<OcctModule>;

	declare const factory: OcctFactory;
	export default factory;
}
