#!/usr/bin/env npx tsx
/**
 * Batch STEP → GLB for catalog/parts.json and sync conversionStatus on each part.
 *
 * Usage:
 *   npm run migrate-glb
 *   npm run migrate-glb -- --force        # rebuild existing GLBs
 *   npm run migrate-glb -- --coarse       # faster tessellation (MIGRATION preset)
 *   npm run migrate-glb -- --id=<partId>  # single part
 *   npm run migrate-glb -- --status-only  # sync catalog from disk only (no OCCT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CadPart } from "../src/types/part";
import {
	applyConversionPatch,
	deriveConversionCatalogPatch,
} from "../src/lib/conversion-catalog-sync";
import { stepToGlb } from "../src/lib/step-to-glb-core";
import {
	DEFAULT_STEP_TRIANGULATION,
	MIGRATION_STEP_TRIANGULATION,
} from "../src/lib/occt-triangulation";
import { getOcctDistDir } from "../src/lib/occt-runtime";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "catalog", "parts.json");
const STEP_DIR = path.join(ROOT, "catalog", "step");
const GLB_DIR = path.join(ROOT, "catalog", "glb");

const args = process.argv.slice(2);
const force = args.includes("--force");
const coarse = args.includes("--coarse");
const statusOnly = args.includes("--status-only");
const idArg = args.find((a) => a.startsWith("--id="));
const onlyId = idArg?.slice("--id=".length);

const tessellation = coarse
	? MIGRATION_STEP_TRIANGULATION
	: DEFAULT_STEP_TRIANGULATION;

type CatalogFile = { parts: CadPart[] };

function readCatalog(): CatalogFile {
	const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
	const parsed = JSON.parse(raw) as CatalogFile;
	if (!Array.isArray(parsed.parts)) {
		throw new Error("Invalid catalog: parts must be an array");
	}
	return parsed;
}

function writeCatalogAtomic(data: CatalogFile): void {
	const payload = JSON.stringify(data, null, 2);
	const tmpPath = `${CATALOG_PATH}.${process.pid}.${Date.now()}.tmp`;
	fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
	fs.writeFileSync(tmpPath, payload, "utf-8");
	fs.renameSync(tmpPath, CATALOG_PATH);
}

function persistPart(catalog: CatalogFile, index: number, part: CadPart): void {
	catalog.parts[index] = part;
	writeCatalogAtomic(catalog);
}

async function main() {
	if (!fs.existsSync(CATALOG_PATH)) {
		console.error(`Missing catalog at ${CATALOG_PATH}`);
		process.exit(1);
	}

	if (!statusOnly) {
		const wasmPath = path.join(getOcctDistDir(), "occt-import-js.wasm");
		if (!fs.existsSync(wasmPath)) {
			console.error(
				`Missing WASM at ${wasmPath}. Run npm install and ensure occt-import-js is installed.`,
			);
			process.exit(1);
		}
	}

	const catalog = readCatalog();
	let parts = catalog.parts;
	if (onlyId) {
		parts = parts.filter((p) => p.id === onlyId);
		if (parts.length === 0) {
			console.error(`No part with id ${onlyId}`);
			process.exit(1);
		}
	}

	if (parts.length === 0) {
		console.log("No parts to migrate.");
		return;
	}

	fs.mkdirSync(GLB_DIR, { recursive: true });

	if (!statusOnly) {
		const wasmPath = path.join(getOcctDistDir(), "occt-import-js.wasm");
		console.log(
			`OCCT WASM: ${wasmPath}\nTessellation: ${coarse ? "coarse (migration)" : "default (preview)"}\nParts: ${parts.length}\n`,
		);
	} else {
		console.log(`Status-only sync for ${parts.length} part(s)\n`);
	}

	let converted = 0;
	let skipped = 0;
	let failed = 0;
	let catalogSynced = 0;

	for (const part of parts) {
		const index = catalog.parts.findIndex((p) => p.id === part.id);
		if (index === -1) continue;

		const stepPath = path.join(STEP_DIR, part.filename);
		const glbPath = path.join(GLB_DIR, `${part.id}.glb`);
		const stepExists = fs.existsSync(stepPath);
		const glbExists = fs.existsSync(glbPath);

		let current = catalog.parts[index];

		if (statusOnly) {
			const patch = deriveConversionCatalogPatch(current, {
				stepExists,
				glbExists,
			});
			const next = applyConversionPatch(current, patch);
			if (patch.action !== "unchanged") {
				persistPart(catalog, index, next);
				current = next;
				catalogSynced++;
				console.log(
					`📝 ${part.name}: ${patch.action} → ${patch.conversionStatus}`,
				);
			}
			continue;
		}

		if (!stepExists) {
			console.warn(`⚠  STEP missing: ${part.filename}`);
			const patch = deriveConversionCatalogPatch(current, {
				stepExists: false,
				glbExists,
			});
			const next = applyConversionPatch(current, patch);
			if (patch.action !== "unchanged") {
				persistPart(catalog, index, next);
				catalogSynced++;
			}
			skipped++;
			continue;
		}

		if (!force && glbExists) {
			console.log(`⏭  GLB exists: ${part.name} (${part.id})`);
			const patch = deriveConversionCatalogPatch(current, {
				stepExists: true,
				glbExists: true,
			});
			const next = applyConversionPatch(current, patch);
			if (patch.action !== "unchanged") {
				persistPart(catalog, index, next);
				catalogSynced++;
			}
			skipped++;
			continue;
		}

		const working: CadPart = {
			...current,
			conversionStatus: "converting",
			conversionError: undefined,
			updatedAt: new Date().toISOString(),
		};
		persistPart(catalog, index, working);
		current = working;

		try {
			console.log(`\n🔄 ${part.name} (${part.id})`);
			await stepToGlb(stepPath, glbPath, tessellation);
			const ready: CadPart = {
				...current,
				conversionStatus: "ready",
				conversionError: undefined,
				updatedAt: new Date().toISOString(),
			};
			persistPart(catalog, index, ready);
			catalogSynced++;
			converted++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`❌ ${part.name}: ${msg}`);
			if (err instanceof Error && err.stack) {
				console.error(err.stack.split("\n").slice(0, 4).join("\n"));
			}
			const failedPart: CadPart = {
				...current,
				conversionStatus: "failed",
				conversionError: msg,
				updatedAt: new Date().toISOString(),
			};
			persistPart(catalog, index, failedPart);
			catalogSynced++;
			failed++;
		}
	}

	console.log("\n── Summary ──");
	console.log(`Converted:      ${converted}`);
	console.log(`Skipped:        ${skipped}`);
	console.log(`Failed:         ${failed}`);
	console.log(`Catalog synced: ${catalogSynced}`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});