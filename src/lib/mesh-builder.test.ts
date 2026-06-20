import { describe, expect, it } from "vitest";
import { buildMeshesFromOcct, MESH_STYLE_BROWSER } from "./mesh-builder";

describe("buildMeshesFromOcct", () => {
	it("skips meshes without position and builds one triangle mesh", () => {
		const meshes = buildMeshesFromOcct(
			[
				{ attributes: {} },
				{
					attributes: {
						position: {
							array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
						},
					},
					index: { array: new Uint32Array([0, 1, 2]) },
				},
			],
			MESH_STYLE_BROWSER,
		);
		expect(meshes).toHaveLength(1);
		expect(meshes[0].geometry.getAttribute("position").count).toBe(3);
	});
});