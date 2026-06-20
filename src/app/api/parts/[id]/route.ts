import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { enrichPartWithResolvedConversionStatus } from "@/lib/conversion-status";
import { getPart, deletePart, getStepPath, updatePart } from "@/lib/parts";
import {
	isValidPartId,
	parseTagsArray,
	sanitizeText,
	MAX_NAME_LEN,
	MAX_DESCRIPTION_LEN,
	MAX_CATEGORY_LEN,
} from "@/lib/upload-validation";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	if (!isValidPartId(id)) {
		return NextResponse.json({ error: "Invalid part id" }, { status: 400 });
	}
	const part = getPart(id);
	if (!part) {
		return NextResponse.json({ error: "Part not found" }, { status: 404 });
	}
	return NextResponse.json({
		part: enrichPartWithResolvedConversionStatus(part),
	});
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	if (!isValidPartId(id)) {
		return NextResponse.json({ error: "Invalid part id" }, { status: 400 });
	}
	const part = getPart(id);
	if (!part) {
		return NextResponse.json({ error: "Part not found" }, { status: 404 });
	}

	// Delete the STEP file
	const stepPath = getStepPath(part.filename);
	try {
		if (fs.existsSync(stepPath)) {
			fs.unlinkSync(stepPath);
		}
	} catch {}

	// Delete associated GLB preview
	const glbDir = path.join(process.cwd(), "catalog", "glb");
	const glbPath = path.join(glbDir, `${id}.glb`);
	try {
		if (fs.existsSync(glbPath)) {
			fs.unlinkSync(glbPath);
		}
	} catch {}

	// Delete associated thumbnail
	if (part.thumbnailFilename) {
		const thumbDir = path.join(process.cwd(), "catalog", "thumb");
		const thumbPath = path.join(thumbDir, part.thumbnailFilename);
		try {
			if (fs.existsSync(thumbPath)) {
				fs.unlinkSync(thumbPath);
			}
		} catch {}
	}

	// Delete from catalog
	deletePart(id);

	return NextResponse.json({ success: true });
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	if (!isValidPartId(id)) {
		return NextResponse.json({ error: "Invalid part id" }, { status: 400 });
	}
	const part = getPart(id);
	if (!part) {
		return NextResponse.json({ error: "Part not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const { name, description, category, tags } = body;

		const updates: Record<string, string | string[]> = {};
		if (typeof name === "string") {
			const n = sanitizeText(name, MAX_NAME_LEN);
			if (n) updates.name = n;
		}
		if (typeof description === "string") {
			updates.description = sanitizeText(description, MAX_DESCRIPTION_LEN);
		}
		if (typeof category === "string") {
			updates.category =
				sanitizeText(category, MAX_CATEGORY_LEN) || "Uncategorized";
		}
		if (tags !== undefined) {
			if (Array.isArray(tags)) {
				updates.tags = parseTagsArray(tags);
			} else if (typeof tags === "string") {
				updates.tags = parseTagsArray(tags.split(",").map((t) => t.trim()));
			}
		}

		if (Object.keys(updates).length === 0) {
			return NextResponse.json(
				{ error: "No valid fields to update" },
				{ status: 400 },
			);
		}

		const success = updatePart(id, updates);
		if (!success) {
			return NextResponse.json(
				{ error: "Failed to update part" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, part: getPart(id) });
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}
}
