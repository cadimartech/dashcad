import "server-only";
import fs from "fs";
import path from "path";
import { getPart, getParts, updatePart } from "@/lib/parts";
import { GLB_DIR, STEP_DIR } from "@/lib/paths";
import { stepToGlb } from "@/lib/step-converter";

const queue: string[] = [];
const queued = new Set<string>();
let draining = false;

/**
 * Schedule background STEP→GLB for a catalog part. Safe to call multiple times;
 * duplicate ids are coalesced while pending in the queue.
 */
/** Re-queue parts left pending/converting after a process restart. */
export function reconcilePendingConversions(): void {
	for (const part of getParts()) {
		if (
			part.conversionStatus === "pending" ||
			part.conversionStatus === "converting"
		) {
			enqueuePartConversion(part.id);
		}
	}
}

export function enqueuePartConversion(partId: string): void {
	if (queued.has(partId)) return;
	queued.add(partId);
	queue.push(partId);
	void drainConversionQueue();
}

/** @internal Test hook: reset in-memory queue state */
export function resetConversionQueueForTests(): void {
	queue.length = 0;
	queued.clear();
	draining = false;
}

/** @internal Test hook: wait until the queue finishes draining */
export async function drainConversionQueueForTests(): Promise<void> {
	await drainConversionQueue();
	while (draining) {
		await new Promise((r) => setTimeout(r, 10));
	}
	await drainConversionQueue();
}

async function drainConversionQueue(): Promise<void> {
	if (draining) return;
	draining = true;
	try {
		while (queue.length > 0) {
			const partId = queue.shift();
			if (!partId) continue;
			queued.delete(partId);
			await processPartConversion(partId);
		}
	} finally {
		draining = false;
		if (queue.length > 0) {
			void drainConversionQueue();
		}
	}
}

async function processPartConversion(partId: string): Promise<void> {
	const part = getPart(partId);
	if (!part) return;

	if (part.conversionStatus === "ready") return;

	const stepPath = path.join(STEP_DIR, part.filename);
	if (!fs.existsSync(stepPath)) {
		updatePart(partId, {
			conversionStatus: "failed",
			conversionError: "STEP file missing on disk",
		});
		return;
	}

	updatePart(partId, {
		conversionStatus: "converting",
		conversionError: undefined,
	});

	const glbPath = path.join(GLB_DIR, `${partId}.glb`);

	try {
		if (!fs.existsSync(GLB_DIR)) {
			fs.mkdirSync(GLB_DIR, { recursive: true });
		}
		await stepToGlb(stepPath, glbPath);
		updatePart(partId, {
			conversionStatus: "ready",
			conversionError: undefined,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(
			`[conversion-queue] STEP→GLB failed for ${partId} (${part.filename}):`,
			err instanceof Error ? { message: err.message, stack: err.stack } : err,
		);
		updatePart(partId, {
			conversionStatus: "failed",
			conversionError: message,
		});
	}
}
