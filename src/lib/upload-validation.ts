/** Shared limits for catalog metadata and uploads (server + API). */

export const MAX_STEP_BYTES = 50 * 1024 * 1024; // 50 MiB
export const MAX_THUMB_BYTES = 2 * 1024 * 1024; // 2 MiB
export const THUMBNAIL_EXT = ".png" as const;
export const MAX_NAME_LEN = 200;
export const MAX_DESCRIPTION_LEN = 2000;
export const MAX_CATEGORY_LEN = 120;
export const MAX_TAG_LEN = 64;
export const MAX_TAGS = 32;

const TAG_PATTERN = /^[\p{L}\p{N}\s._-]+$/u;

export function stripControlChars(value: string): string {
	return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function sanitizeText(
	value: string | null | undefined,
	maxLen: number,
): string {
	if (!value) return "";
	const stripped = stripControlChars(value);
	return stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;
}

export function parseTags(tagsStr: string | null): string[] {
	if (!tagsStr) return [];
	const raw = tagsStr
		.split(",")
		.map((t) => sanitizeText(t, MAX_TAG_LEN))
		.filter(Boolean);
	const unique: string[] = [];
	for (const tag of raw) {
		if (!TAG_PATTERN.test(tag)) continue;
		if (!unique.includes(tag)) unique.push(tag);
		if (unique.length >= MAX_TAGS) break;
	}
	return unique;
}

export function parseTagsArray(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	const unique: string[] = [];
	for (const item of tags) {
		if (typeof item !== "string") continue;
		const tag = sanitizeText(item, MAX_TAG_LEN);
		if (!tag || !TAG_PATTERN.test(tag)) continue;
		if (!unique.includes(tag)) unique.push(tag);
		if (unique.length >= MAX_TAGS) break;
	}
	return unique;
}

/** Catalog part id: alphanumeric, 8–32 chars (matches generateId output). */
export const PART_ID_PATTERN = /^[a-z0-9]{8,32}$/;

export function isValidPartId(id: string): boolean {
	return PART_ID_PATTERN.test(id);
}

/** STEP filename must be {id}.step or {id}.stp with valid id. */
export function isSafeStepFilename(filename: string): boolean {
	const base = filename.toLowerCase();
	const match = base.match(/^([a-z0-9]{8,32})\.(step|stp)$/);
	return Boolean(match && isValidPartId(match[1]));
}

/** GLB preview filename must be {id}.glb with valid id. */
export function isSafeGlbFilename(filename: string): boolean {
	const base = filename.toLowerCase();
	const match = base.match(/^([a-z0-9]{8,32})\.glb$/);
	return Boolean(match && isValidPartId(match[1]));
}

/** Thumbnail filename must be {id}.png with valid id. */
export function isSafeThumbFilename(filename: string): boolean {
	const base = filename.toLowerCase();
	const match = base.match(/^([a-z0-9]{8,32})\.png$/);
	return Boolean(match && isValidPartId(match[1]));
}

/** PNG file signature (8 bytes). */
export function isPngBuffer(buffer: Buffer | Uint8Array): boolean {
	if (buffer.length < 8) return false;
	return (
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47 &&
		buffer[4] === 0x0d &&
		buffer[5] === 0x0a &&
		buffer[6] === 0x1a &&
		buffer[7] === 0x0a
	);
}

export function validateThumbnailBytes(
	buffer: Buffer,
): { ok: true } | { ok: false; error: string } {
	if (buffer.length === 0) {
		return { ok: false, error: "Thumbnail is empty" };
	}
	if (buffer.length > MAX_THUMB_BYTES) {
		return {
			ok: false,
			error: `Thumbnail too large (max ${Math.floor(MAX_THUMB_BYTES / (1024 * 1024))} MiB)`,
		};
	}
	if (!isPngBuffer(buffer)) {
		return { ok: false, error: "Thumbnail must be a PNG image" };
	}
	return { ok: true };
}
