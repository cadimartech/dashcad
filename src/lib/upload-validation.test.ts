import { describe, expect, it } from "vitest";
import {
	isPngBuffer,
	isSafeGlbFilename,
	isSafeStepFilename,
	isSafeThumbFilename,
	isValidPartId,
	parseTags,
	sanitizeText,
	MAX_NAME_LEN,
	validateThumbnailBytes,
} from "./upload-validation";

describe("upload-validation", () => {
	it("sanitizeText strips control chars and enforces max length", () => {
		expect(sanitizeText("  hello\u0000world  ", 20)).toBe("helloworld");
		expect(sanitizeText("x".repeat(300), MAX_NAME_LEN).length).toBe(
			MAX_NAME_LEN,
		);
	});

	it("parseTags filters invalid characters and dedupes", () => {
		expect(parseTags("a, b, a, <script>")).toEqual(["a", "b"]);
	});

	it("isValidPartId accepts catalog-style ids", () => {
		expect(isValidPartId("mqmti3x4ia816p")).toBe(true);
		expect(isValidPartId("../etc")).toBe(false);
		expect(isValidPartId("short")).toBe(false);
	});

	it("isSafeStepFilename requires id.ext pattern", () => {
		expect(isSafeStepFilename("mqmti3x4ia816p.step")).toBe(true);
		expect(isSafeStepFilename("../../../etc/passwd")).toBe(false);
		expect(isSafeStepFilename("mqmti3x4ia816p.glb")).toBe(false);
	});

	it("isSafeGlbFilename requires id.glb pattern", () => {
		expect(isSafeGlbFilename("mqmti3x4ia816p.glb")).toBe(true);
		expect(isSafeGlbFilename("foo.glb")).toBe(false);
		expect(isSafeGlbFilename("mqmti3x4ia816p.step")).toBe(false);
	});

	it("isSafeThumbFilename requires id.png pattern", () => {
		expect(isSafeThumbFilename("mqmti3x4ia816p.png")).toBe(true);
		expect(isSafeThumbFilename("evil.png")).toBe(false);
		expect(isSafeThumbFilename("mqmti3x4ia816p.jpg")).toBe(false);
	});

	it("isPngBuffer detects PNG signature", () => {
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
		]);
		expect(isPngBuffer(png)).toBe(true);
		expect(isPngBuffer(Buffer.from("not-png"))).toBe(false);
	});

	it("validateThumbnailBytes rejects empty, oversized, and non-PNG", () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(validateThumbnailBytes(Buffer.alloc(0))).toEqual({
			ok: false,
			error: "Thumbnail is empty",
		});
		expect(validateThumbnailBytes(png)).toEqual({ ok: true });
		expect(validateThumbnailBytes(Buffer.from("x"))).toMatchObject({
			ok: false,
			error: "Thumbnail must be a PNG image",
		});
	});
});
