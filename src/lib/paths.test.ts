import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("storage paths", () => {
	let tmpDir: string;
	let previousFilesEnv: string | undefined;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashcad-paths-"));
		previousFilesEnv = process.env.DASHCAD_FILES_PATH;
		delete process.env.DASHCAD_FILES_PATH;
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (previousFilesEnv === undefined) {
			delete process.env.DASHCAD_FILES_PATH;
		} else {
			process.env.DASHCAD_FILES_PATH = previousFilesEnv;
		}
		fs.rmSync(tmpDir, { recursive: true, force: true });
		vi.resetModules();
	});

	it("defaults to <cwd>/catalog/{step,glb,thumb}", async () => {
		const { STEP_DIR, GLB_DIR, THUMB_DIR } = await import("./paths");
		expect(STEP_DIR).toBe(path.join(tmpDir, "catalog", "step"));
		expect(GLB_DIR).toBe(path.join(tmpDir, "catalog", "glb"));
		expect(THUMB_DIR).toBe(path.join(tmpDir, "catalog", "thumb"));
	});

	it("honors DASHCAD_FILES_PATH to decouple from cwd/catalog", async () => {
		const filesRoot = path.join(tmpDir, "files");
		process.env.DASHCAD_FILES_PATH = filesRoot;
		vi.resetModules();

		const { STEP_DIR, GLB_DIR, THUMB_DIR, getFilesRootForTests } =
			await import("./paths");
		expect(getFilesRootForTests()).toBe(filesRoot);
		expect(STEP_DIR).toBe(path.join(filesRoot, "step"));
		expect(GLB_DIR).toBe(path.join(filesRoot, "glb"));
		expect(THUMB_DIR).toBe(path.join(filesRoot, "thumb"));
	});
});
