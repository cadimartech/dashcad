import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CadPart } from "@/types/part";

vi.mock("server-only", () => ({}));

const legacyPart: CadPart = {
	id: "legacy1abc234",
	name: "Legacy",
	description: "",
	filename: "legacy1abc234.step",
	category: "Test",
	tags: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	fileSize: 10,
};

describe("enrichPartWithResolvedConversionStatus", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-conv-status-"));
		fs.mkdirSync(path.join(tmpDir, "catalog", "glb"), { recursive: true });
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(tmpDir, { recursive: true, force: true });
		vi.resetModules();
	});

	it("infers ready when GLB exists and catalog field is missing", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "catalog", "glb", `${legacyPart.id}.glb`),
			"glb",
		);
		const { enrichPartWithResolvedConversionStatus } = await import(
			"./conversion-status"
		);
		const out = enrichPartWithResolvedConversionStatus(legacyPart);
		expect(out.conversionStatus).toBe("ready");
	});

	it("keeps explicit pending when GLB also exists", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "catalog", "glb", `${legacyPart.id}.glb`),
			"glb",
		);
		const { enrichPartWithResolvedConversionStatus } = await import(
			"./conversion-status"
		);
		const out = enrichPartWithResolvedConversionStatus({
			...legacyPart,
			conversionStatus: "pending",
		});
		expect(out.conversionStatus).toBe("pending");
	});
});

describe("GET /api/parts enrichment", () => {
	let tmpDir: string;
	let catalogPath: string;
	let previousCatalogEnv: string | undefined;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-parts-api-"));
		catalogPath = path.join(tmpDir, "parts.json");
		fs.mkdirSync(path.join(tmpDir, "catalog", "glb"), { recursive: true });
		previousCatalogEnv = process.env.DASHCAD_CATALOG_PATH;
		process.env.DASHCAD_CATALOG_PATH = catalogPath;
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
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

	it("returns parts with conversionStatus ready for legacy row with GLB on disk", async () => {
		fs.writeFileSync(
			catalogPath,
			JSON.stringify({ parts: [legacyPart] }),
			"utf-8",
		);
		fs.writeFileSync(
			path.join(tmpDir, "catalog", "glb", `${legacyPart.id}.glb`),
			"glb",
		);

		const { GET } = await import("@/app/api/parts/route");
		const res = GET(
			new Request(
				"http://localhost/api/parts",
			) as import("next/server").NextRequest,
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			parts: Array<{ id: string; conversionStatus?: string }>;
		};
		expect(body.parts).toHaveLength(1);
		expect(body.parts[0].conversionStatus).toBe("ready");
	});
});
