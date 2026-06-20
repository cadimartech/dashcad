import "server-only";
import fs from "fs";
import path from "path";
import type { CadPart, ConversionStatus } from "@/types/part";

const GLB_DIR = path.join(process.cwd(), "catalog", "glb");

/** Resolve status for API/UI; legacy parts without a field infer from GLB on disk. */
export function resolveConversionStatus(
	part: CadPart,
): ConversionStatus | undefined {
	if (part.conversionStatus) return part.conversionStatus;
	const glbPath = path.join(GLB_DIR, `${part.id}.glb`);
	if (fs.existsSync(glbPath)) return "ready";
	return undefined;
}

/** Whether the client should attempt loading the pre-converted GLB URL. */
export function shouldOfferGlbPreview(part: CadPart): boolean {
	const status = resolveConversionStatus(part);
	if (status === "pending" || status === "converting") return false;
	return true;
}

/** Part payload with inferred conversionStatus for API/UI (legacy rows with GLB on disk). */
export function enrichPartWithResolvedConversionStatus(part: CadPart): CadPart {
	const conversionStatus = resolveConversionStatus(part);
	if (conversionStatus === part.conversionStatus) return part;
	return { ...part, conversionStatus };
}

export function enrichPartsWithResolvedConversionStatus(
	parts: CadPart[],
): CadPart[] {
	return parts.map(enrichPartWithResolvedConversionStatus);
}
