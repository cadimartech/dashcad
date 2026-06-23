import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const enqueuePartConversionMock = vi.fn();

vi.mock("@/lib/conversion-queue", () => ({
	enqueuePartConversion: (...args: unknown[]) =>
		enqueuePartConversionMock(...args),
}));

const stepToGlbMock = vi.fn();

vi.mock("@/lib/step-converter", () => ({
	stepToGlb: (...args: unknown[]) => stepToGlbMock(...args),
}));

function makeUploadRequest(
	fields: {
		file?: { name: string; bytes: Uint8Array };
		name?: string;
		description?: string;
		category?: string;
		tags?: string;
	} = {},
): NextRequest {
	const form = new FormData();
	if (fields.file) {
		const buf = Buffer.from(fields.file.bytes);
		form.append(
			"file",
			new Blob([buf], { type: "application/octet-stream" }),
			fields.file.name,
		);
	}
	if (fields.name !== undefined) form.append("name", fields.name);
	if (fields.description !== undefined)
		form.append("description", fields.description);
	if (fields.category !== undefined) form.append("category", fields.category);
	if (fields.tags !== undefined) form.append("tags", fields.tags);

	return new NextRequest("http://localhost/api/upload", {
		method: "POST",
		body: form,
	});
}

describe("POST /api/upload", () => {
	let tmpDir: string;
	let catalogPath: string;
	let previousCatalogEnv: string | undefined;
	let previousFilesEnv: string | undefined;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-upload-"));
		catalogPath = path.join(tmpDir, "parts.json");
		fs.writeFileSync(catalogPath, JSON.stringify({ parts: [] }), "utf-8");

		previousCatalogEnv = process.env.DASHCAD_CATALOG_PATH;
		previousFilesEnv = process.env.DASHCAD_FILES_PATH;
		process.env.DASHCAD_CATALOG_PATH = catalogPath;
		delete process.env.DASHCAD_FILES_PATH;
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);

		enqueuePartConversionMock.mockReset();
		stepToGlbMock.mockReset();
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (previousCatalogEnv === undefined) {
			delete process.env.DASHCAD_CATALOG_PATH;
		} else {
			process.env.DASHCAD_CATALOG_PATH = previousCatalogEnv;
		}
		if (previousFilesEnv === undefined) {
			delete process.env.DASHCAD_FILES_PATH;
		} else {
			process.env.DASHCAD_FILES_PATH = previousFilesEnv;
		}
		fs.rmSync(tmpDir, { recursive: true, force: true });
		vi.resetModules();
	});

	it("persists STEP, catalogs pending, enqueues conversion without blocking on stepToGlb", async () => {
		const stepBytes = new TextEncoder().encode("ISO-10303-21; fake STEP");
		const { POST } = await import("./route");
		const { getPart } = await import("@/lib/parts");

		const res = await POST(
			makeUploadRequest({
				file: { name: "bracket.step", bytes: stepBytes },
				name: "Bracket",
				category: "Fixtures",
				tags: "a, b",
			}),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			id: string;
			filename: string;
			conversionStatus: string;
		};
		expect(body.conversionStatus).toBe("pending");
		expect(body.filename).toMatch(/\.step$/);

		expect(enqueuePartConversionMock).toHaveBeenCalledTimes(1);
		expect(enqueuePartConversionMock).toHaveBeenCalledWith(body.id);
		expect(stepToGlbMock).not.toHaveBeenCalled();

		const part = getPart(body.id);
		expect(part?.name).toBe("Bracket");
		expect(part?.category).toBe("Fixtures");
		expect(part?.tags).toEqual(["a", "b"]);
		expect(part?.conversionStatus).toBe("pending");
		expect(part?.fileSize).toBe(stepBytes.length);

		const stepPath = path.join(tmpDir, "catalog", "step", body.filename);
		expect(fs.existsSync(stepPath)).toBe(true);
		expect(fs.readFileSync(stepPath)).toEqual(Buffer.from(stepBytes));
	});

	it("returns 400 when file is missing and does not enqueue", async () => {
		const { POST } = await import("./route");

		const res = await POST(makeUploadRequest({ name: "No file" }));

		expect(res.status).toBe(400);
		expect(enqueuePartConversionMock).not.toHaveBeenCalled();
	});

	it("returns 400 for non-STEP extension", async () => {
		const { POST } = await import("./route");

		const res = await POST(
			makeUploadRequest({
				file: { name: "model.glb", bytes: new Uint8Array([1, 2, 3]) },
			}),
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toMatch(/STEP/i);
		expect(enqueuePartConversionMock).not.toHaveBeenCalled();
	});

	it("writes STEP to DASHCAD_FILES_PATH when set, leaving the catalog untouched", async () => {
		const filesRoot = path.join(tmpDir, "files");
		process.env.DASHCAD_FILES_PATH = filesRoot;
		vi.resetModules();

		const stepBytes = new TextEncoder().encode("ISO-10303-21; decoupled");
		const { POST } = await import("./route");
		const res = await POST(
			makeUploadRequest({
				file: { name: "decoupled.step", bytes: stepBytes },
				name: "Decoupled",
			}),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { id: string; filename: string };
		const decoupledPath = path.join(filesRoot, "step", body.filename);
		expect(fs.existsSync(decoupledPath)).toBe(true);
		expect(fs.existsSync(path.join(tmpDir, "catalog", "step", body.filename))).toBe(
			false,
		);
	});
});
