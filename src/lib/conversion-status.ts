import "server-only";
import fs from "fs";
import { glbPath } from "@/lib/paths";
import type { CadPart, ConversionStatus } from "@/types/part";

/** Resolve status for API/UI; legacy parts without a field infer from GLB on disk. */
export function resolveConversionStatus(
	part: CadPart,
): ConversionStatus | undefined {
	if (part.conversionStatus) return part.conversionStatus;
	if (fs.existsSync(glbPath(`${part.id}.glb`))) return "ready";
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
