import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const samplePart = {
	id: "mqmti3x4ia816p",
	name: "Test Part",
	description: "",
	filename: "mqmti3x4ia816p.step",
	category: "Test",
	tags: [] as string[],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	fileSize: 42,
	conversionStatus: "pending" as const,
};

const stepToGlbMock = vi.fn();

vi.mock("@/lib/step-converter", () => ({
	stepToGlb: (...args: unknown[]) => stepToGlbMock(...args),
}));

describe("conversion queue", () => {
	let tmpDir: string;
	let catalogPath: string;
	let stepDir: string;
	let previousCatalogEnv: string | undefined;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-conv-"));
		catalogPath = path.join(tmpDir, "parts.json");
		stepDir = path.join(tmpDir, "catalog", "step");
		fs.mkdirSync(stepDir, { recursive: true });
		fs.mkdirSync(path.join(tmpDir, "catalog", "glb"), { recursive: true });
		fs.writeFileSync(
			path.join(stepDir, samplePart.filename),
			"fake-step",
			"utf-8",
		);

		previousCatalogEnv = process.env.DASHCAD_CATALOG_PATH;
		process.env.DASHCAD_CATALOG_PATH = catalogPath;
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);

		stepToGlbMock.mockReset();
		stepToGlbMock.mockImplementation(async (_step: string, glbPath: string) => {
			fs.writeFileSync(glbPath, "glb-bytes");
			return { meshCount: 1, byteLength: 8 };
		});
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (previousCatalogEnv === undefined) {
			delete process.env.DASHCAD_CATALOG_PATH;
		} else {
			process.env.DASHCAD_CATALOG_PATH = previousCatalogEnv;
		}
		fs.rmSync(tmpDir, { recursive: true, force: true });
		vi.resetModules();
	});

	it("marks part ready after successful conversion", async () => {
		const { addPart, getPart } = await import("./parts");
		const {
			enqueuePartConversion,
			drainConversionQueueForTests,
			resetConversionQueueForTests,
		} = await import("./conversion-queue");

		resetConversionQueueForTests();
		addPart(samplePart);
		enqueuePartConversion(samplePart.id);
		await drainConversionQueueForTests();

		expect(stepToGlbMock).toHaveBeenCalledTimes(1);
		expect(getPart(samplePart.id)?.conversionStatus).toBe("ready");
		expect(
			fs.existsSync(
				path.join(tmpDir, "catalog", "glb", `${samplePart.id}.glb`),
			),
		).toBe(true);
	});

	it("marks part failed when conversion throws", async () => {
		stepToGlbMock.mockRejectedValueOnce(new Error("no geometry"));
		const { addPart, getPart } = await import("./parts");
		const {
			enqueuePartConversion,
			drainConversionQueueForTests,
			resetConversionQueueForTests,
		} = await import("./conversion-queue");

		resetConversionQueueForTests();
		addPart(samplePart);
		enqueuePartConversion(samplePart.id);
		await drainConversionQueueForTests();

		const part = getPart(samplePart.id);
		expect(part?.conversionStatus).toBe("failed");
		expect(part?.conversionError).toContain("no geometry");
	});
});
