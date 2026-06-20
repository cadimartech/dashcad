import type { CadPart, ConversionStatus } from "@/types/part";

export type DiskPresence = {
	stepExists: boolean;
	glbExists: boolean;
};

export type CatalogSyncAction = "ready" | "failed" | "pending" | "unchanged";

export type CatalogSyncPatch = {
	conversionStatus: ConversionStatus;
	conversionError?: string;
	action: CatalogSyncAction;
};

/**
 * Derive catalog conversion fields from on-disk STEP/GLB and current row.
 * Used by migrate-glb and status-only reconciliation.
 */
export function deriveConversionCatalogPatch(
	part: Pick<CadPart, "conversionStatus" | "conversionError">,
	disk: DiskPresence,
): CatalogSyncPatch {
	if (!disk.stepExists) {
		return {
			conversionStatus: "failed",
			conversionError: "STEP file missing on disk",
			action: "failed",
		};
	}

	if (disk.glbExists) {
		return {
			conversionStatus: "ready",
			conversionError: undefined,
			action:
				part.conversionStatus === "ready" && !part.conversionError
					? "unchanged"
					: "ready",
		};
	}

	// STEP on disk, no GLB yet
	if (part.conversionStatus === "converting") {
		return {
			conversionStatus: "pending",
			conversionError: undefined,
			action: "pending",
		};
	}

	if (part.conversionStatus === "failed") {
		return {
			conversionStatus: "failed",
			conversionError: part.conversionError,
			action: "unchanged",
		};
	}

	return {
		conversionStatus: "pending",
		conversionError: undefined,
		action: part.conversionStatus === "pending" ? "unchanged" : "pending",
	};
}

export function applyConversionPatch(
	part: CadPart,
	patch: CatalogSyncPatch,
): CadPart {
	if (patch.action === "unchanged") return part;
	return {
		...part,
		conversionStatus: patch.conversionStatus,
		conversionError: patch.conversionError,
		updatedAt: new Date().toISOString(),
	};
}
