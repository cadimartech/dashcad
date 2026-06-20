import fs from "fs";
import path from "path";
import { Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { OcctTriangulationParams } from "occt-import-js";
import { DEFAULT_STEP_TRIANGULATION } from "@/lib/occt-triangulation";
import { loadOcctModule } from "@/lib/occt-runtime";
import {
	buildMeshesFromOcct,
	MESH_STYLE_SERVER,
} from "@/lib/mesh-builder";
import { ensureFileReaderPolyfill } from "@/lib/gltf-filereader-polyfill";

ensureFileReaderPolyfill();

export async function stepToGlb(
	stepPath: string,
	glbPath: string,
	tessellation: OcctTriangulationParams = DEFAULT_STEP_TRIANGULATION,
): Promise<{ meshCount: number; byteLength: number }> {
	const started = Date.now();
	const occt = await loadOcctModule();
	const stepData = fs.readFileSync(stepPath);
	const stepMb = (stepData.byteLength / (1024 * 1024)).toFixed(2);

	console.log(
		`[stepToGlb] Parsing ${path.basename(stepPath)} (${stepMb} MiB) — tessellation may take several minutes for large CAD…`,
	);

	const result = occt.ReadStepFile(new Uint8Array(stepData), tessellation);

	const parseMs = Date.now() - started;
	console.log(`[stepToGlb] OCCT finished in ${(parseMs / 1000).toFixed(1)}s`);

	if (!result.success) {
		throw new Error(
			`STEP parse failed (success=false) for ${path.basename(stepPath)}`,
		);
	}
	if (!result.meshes || result.meshes.length === 0) {
		const compoundCount = result.compounds?.length ?? 0;
		throw new Error(
			`STEP contains no triangulated meshes (${compoundCount} compound(s) reported). Check tessellation params or file content.`,
		);
	}

	const meshWithPositions = result.meshes.filter((m) =>
		Boolean(m.attributes?.position?.array?.length),
	);
	if (meshWithPositions.length === 0) {
		throw new Error(
			`STEP parsed ${result.meshes.length} mesh(es) but none have position attributes`,
		);
	}

	const scene = new Scene();
	for (const mesh of buildMeshesFromOcct(result.meshes, MESH_STYLE_SERVER)) {
		scene.add(mesh);
	}

	console.log(
		`[stepToGlb] Exporting ${meshWithPositions.length} mesh(es) to GLB…`,
	);

	const exporter = new GLTFExporter();
	const exportStarted = Date.now();
	const glb = await exporter.parseAsync(scene, {
		binary: true,
		includeCustomExtensions: false,
	});
	console.log(
		`[stepToGlb] GLTF export finished in ${((Date.now() - exportStarted) / 1000).toFixed(1)}s`,
	);

	if (!(glb instanceof ArrayBuffer)) {
		throw new Error("GLTFExporter returned non-binary output; expected GLB ArrayBuffer");
	}

	fs.mkdirSync(path.dirname(glbPath), { recursive: true });
	fs.writeFileSync(glbPath, Buffer.from(glb));

	const totalMs = Date.now() - started;
	console.log(
		`[stepToGlb] Wrote ${path.basename(glbPath)} (${(glb.byteLength / 1024).toFixed(0)} KiB) in ${(totalMs / 1000).toFixed(1)}s total`,
	);

	return { meshCount: meshWithPositions.length, byteLength: glb.byteLength };
}