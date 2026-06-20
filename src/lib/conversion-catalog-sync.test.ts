import { describe, expect, it } from "vitest";
import {
	applyConversionPatch,
	deriveConversionCatalogPatch,
} from "./conversion-catalog-sync";
import type { CadPart } from "@/types/part";

const base: CadPart = {
	id: "abc123",
	name: "Part",
	description: "",
	filename: "abc123.step",
	category: "Test",
	tags: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	fileSize: 1,
};

describe("deriveConversionCatalogPatch", () => {
	it("marks failed when STEP is missing", () => {
		const patch = deriveConversionCatalogPatch(base, {
			stepExists: false,
			glbExists: false,
		});
		expect(patch.conversionStatus).toBe("failed");
		expect(patch.conversionError).toContain("STEP");
	});

	it("marks ready when GLB exists", () => {
		const patch = deriveConversionCatalogPatch(
			{ ...base, conversionStatus: "pending" },
			{ stepExists: true, glbExists: true },
		);
		expect(patch.conversionStatus).toBe("ready");
		expect(patch.conversionError).toBeUndefined();
		expect(patch.action).toBe("ready");
	});

	it("resets converting to pending when GLB is still missing", () => {
		const patch = deriveConversionCatalogPatch(
			{ ...base, conversionStatus: "converting" },
			{ stepExists: true, glbExists: false },
		);
		expect(patch.conversionStatus).toBe("pending");
		expect(patch.action).toBe("pending");
	});

	it("leaves ready row unchanged when already ready", () => {
		const patch = deriveConversionCatalogPatch(
			{ ...base, conversionStatus: "ready" },
			{ stepExists: true, glbExists: true },
		);
		expect(patch.action).toBe("unchanged");
	});
});

describe("applyConversionPatch", () => {
	it("does not bump updatedAt when unchanged", () => {
		const out = applyConversionPatch(base, {
			conversionStatus: "ready",
			action: "unchanged",
		});
		expect(out.updatedAt).toBe(base.updatedAt);
	});
});
