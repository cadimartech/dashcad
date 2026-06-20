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
};

describe("parts catalog", () => {
	let tmpDir: string;
	let catalogPath: string;
	let previousEnv: string | undefined;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-catalog-"));
		catalogPath = path.join(tmpDir, "parts.json");
		previousEnv = process.env.DASHCAD_CATALOG_PATH;
		process.env.DASHCAD_CATALOG_PATH = catalogPath;
		vi.resetModules();
	});

	afterEach(() => {
		if (previousEnv === undefined) {
			delete process.env.DASHCAD_CATALOG_PATH;
		} else {
			process.env.DASHCAD_CATALOG_PATH = previousEnv;
		}
		fs.rmSync(tmpDir, { recursive: true, force: true });
		vi.resetModules();
	});

	it("returns empty catalog when file is missing", async () => {
		const { getParts } = await import("./parts");
		expect(getParts()).toEqual([]);
	});

	it("throws CatalogError on invalid JSON", async () => {
		fs.writeFileSync(catalogPath, "{ not-json", "utf-8");
		const { getParts, CatalogError } = await import("./parts");
		expect(() => getParts()).toThrow(CatalogError);
		try {
			getParts();
		} catch (err) {
			expect(err).toMatchObject({ code: "corrupt" });
		}
	});

	it("throws CatalogError on invalid schema", async () => {
		fs.writeFileSync(catalogPath, JSON.stringify({ parts: [{}] }), "utf-8");
		const { getParts, CatalogError } = await import("./parts");
		expect(() => getParts()).toThrow(CatalogError);
		try {
			getParts();
		} catch (err) {
			expect(err).toMatchObject({ code: "invalid_schema" });
		}
	});

	it("writes catalog atomically via temp file + rename", async () => {
		const { addPart, getParts } = await import("./parts");
		addPart(samplePart);
		const raw = fs.readFileSync(catalogPath, "utf-8");
		expect(JSON.parse(raw).parts).toHaveLength(1);
		expect(getParts()[0].id).toBe(samplePart.id);
		const dirEntries = fs.readdirSync(tmpDir);
		expect(dirEntries.filter((n) => n.endsWith(".tmp"))).toHaveLength(0);
	});
});
