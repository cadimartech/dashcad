// Server-only: uses fs
import type { CadPart, ConversionStatus } from "@/types/part";
import "server-only";
import fs from "fs";
import path from "path";

const CATALOG_DIR = path.join(process.cwd(), "catalog");
const CATALOG_PATH =
	process.env.DASHCAD_CATALOG_PATH ?? path.join(CATALOG_DIR, "parts.json");
const STEP_DIR = path.join(process.cwd(), "catalog", "step");

type CatalogData = {
	parts: CadPart[];
};

export type CatalogErrorCode = "corrupt" | "invalid_schema" | "write_failed";

export class CatalogError extends Error {
	constructor(
		message: string,
		public readonly code: CatalogErrorCode,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "CatalogError";
	}
}

function isCatalogData(value: unknown): value is CatalogData {
	if (!value || typeof value !== "object") return false;
	const parts = (value as CatalogData).parts;
	if (!Array.isArray(parts)) return false;
	for (const part of parts) {
		if (!part || typeof part !== "object") return false;
		const p = part as CadPart;
		if (typeof p.id !== "string" || typeof p.name !== "string") return false;
		if (typeof p.filename !== "string" || typeof p.category !== "string")
			return false;
		if (!Array.isArray(p.tags)) return false;
		if (typeof p.createdAt !== "string" || typeof p.updatedAt !== "string")
			return false;
		if (typeof p.fileSize !== "number") return false;
		if (p.conversionStatus !== undefined) {
			const allowed: ConversionStatus[] = [
				"pending",
				"converting",
				"ready",
				"failed",
			];
			if (!allowed.includes(p.conversionStatus)) return false;
		}
		if (
			p.conversionError !== undefined &&
			typeof p.conversionError !== "string"
		) {
			return false;
		}
	}
	return true;
}

function readCatalog(): CatalogData {
	let raw: string;
	try {
		raw = fs.readFileSync(CATALOG_PATH, "utf-8");
	} catch (err) {
		const code = (err as NodeJS.ErrnoException)?.code;
		if (code === "ENOENT") {
			return { parts: [] };
		}
		throw new CatalogError(
			`Failed to read catalog at ${CATALOG_PATH}`,
			"corrupt",
			err,
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		throw new CatalogError(
			`Catalog JSON is invalid at ${CATALOG_PATH}`,
			"corrupt",
			err,
		);
	}

	if (!isCatalogData(parsed)) {
		throw new CatalogError(
			`Catalog schema is invalid at ${CATALOG_PATH}`,
			"invalid_schema",
		);
	}

	return parsed;
}

function writeCatalog(data: CatalogData): void {
	if (!isCatalogData(data)) {
		throw new CatalogError(
			"Refusing to write invalid catalog data",
			"invalid_schema",
		);
	}

	const dir = path.dirname(CATALOG_PATH);
	fs.mkdirSync(dir, { recursive: true });

	const payload = JSON.stringify(data, null, 2);
	const tmpPath = `${CATALOG_PATH}.${process.pid}.${Date.now()}.tmp`;

	try {
		fs.writeFileSync(tmpPath, payload, "utf-8");
		fs.renameSync(tmpPath, CATALOG_PATH);
	} catch (err) {
		try {
			if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
		} catch {
			// ignore cleanup errors
		}
		throw new CatalogError(
			`Failed to write catalog at ${CATALOG_PATH}`,
			"write_failed",
			err,
		);
	}
}

export function getParts(): CadPart[] {
	return readCatalog().parts;
}

export function getPart(id: string): CadPart | undefined {
	return readCatalog().parts.find((p) => p.id === id);
}

export function addPart(part: CadPart): void {
	const data = readCatalog();
	data.parts.push(part);
	writeCatalog(data);
}

export function deletePart(id: string): boolean {
	const data = readCatalog();
	const index = data.parts.findIndex((p) => p.id === id);
	if (index === -1) return false;
	data.parts.splice(index, 1);
	writeCatalog(data);
	return true;
}

export function updatePart(
	id: string,
	updates: Partial<Omit<CadPart, "id" | "filename" | "createdAt" | "fileSize">>,
): boolean {
	const data = readCatalog();
	const index = data.parts.findIndex((p) => p.id === id);
	if (index === -1) return false;

	const now = new Date().toISOString();
	data.parts[index] = {
		...data.parts[index],
		...updates,
		updatedAt: now,
	};
	writeCatalog(data);
	return true;
}

export function getStepPath(filename: string): string {
	return path.join(STEP_DIR, filename);
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** @internal Test hook: path used for catalog JSON */
export function getCatalogFilePathForTests(): string {
	return CATALOG_PATH;
}
