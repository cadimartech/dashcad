import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockReadStepFile = vi.fn();

vi.mock("@/lib/occt-runtime", () => ({
	loadOcctModule: vi.fn(async () => ({
		ReadStepFile: mockReadStepFile,
	})),
	getOcctDistDir: () => "/tmp/occt-dist",
	getOcctInitOptions: () => ({}),
}));

vi.mock("three/examples/jsm/exporters/GLTFExporter.js", () => ({
	GLTFExporter: class {
		parseAsync() {
			return Promise.resolve(new ArrayBuffer(8));
		}
	},
}));

vi.mock("three", async (importOriginal) => {
	const actual = await importOriginal<typeof import("three")>();
	return { ...actual };
});

import { stepToGlb } from "./step-to-glb-core";

describe("stepToGlb", () => {
	const tmpDirs: string[] = [];

	afterEach(() => {
		mockReadStepFile.mockReset();
		for (const dir of tmpDirs) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		tmpDirs.length = 0;
	});

	it("throws when OCCT reports success=false", async () => {
		mockReadStepFile.mockReturnValue({ success: false });
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-step-"));
		tmpDirs.push(dir);
		const stepPath = path.join(dir, "part.step");
		fs.writeFileSync(stepPath, "dummy");
		const glbPath = path.join(dir, "out.glb");

		await expect(stepToGlb(stepPath, glbPath)).rejects.toThrow(
			/STEP parse failed/,
		);
	});

	it("throws when meshes are missing", async () => {
		mockReadStepFile.mockReturnValue({
			success: true,
			meshes: [],
			compounds: [{ name: "c1" }],
		});
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-step-"));
		tmpDirs.push(dir);
		const stepPath = path.join(dir, "part.step");
		fs.writeFileSync(stepPath, "dummy");
		const glbPath = path.join(dir, "out.glb");

		await expect(stepToGlb(stepPath, glbPath)).rejects.toThrow(
			/no triangulated meshes/,
		);
	});

	it("writes GLB when meshes have position data", async () => {
		mockReadStepFile.mockReturnValue({
			success: true,
			meshes: [
				{
					attributes: {
						position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
					},
					index: { array: new Uint32Array([0, 1, 2]) },
				},
			],
		});
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-step-"));
		tmpDirs.push(dir);
		const stepPath = path.join(dir, "part.step");
		fs.writeFileSync(stepPath, "dummy");
		const glbPath = path.join(dir, "nested", "out.glb");

		const result = await stepToGlb(stepPath, glbPath);

		expect(fs.existsSync(glbPath)).toBe(true);
		expect(result.byteLength).toBeGreaterThan(0);
		expect(mockReadStepFile).toHaveBeenCalledWith(
			expect.any(Uint8Array),
			expect.objectContaining({
				linearDeflection: 0.02,
				angularDeflection: 0.15,
			}),
		);
	});
});