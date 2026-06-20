import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPart, updatePart } from "@/lib/parts";
import {
	isValidPartId,
	THUMBNAIL_EXT,
	validateThumbnailBytes,
} from "@/lib/upload-validation";

const THUMB_DIR = path.join(process.cwd(), "catalog", "thumb");

export async function POST(
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
		const formData = await request.formData();
		const file = formData.get("thumbnail") as File | null;
		if (!file) {
			return NextResponse.json({ error: "No thumbnail file" }, { status: 400 });
		}

		if (!fs.existsSync(THUMB_DIR)) {
			fs.mkdirSync(THUMB_DIR, { recursive: true });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const validation = validateThumbnailBytes(buffer);
		if (!validation.ok) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const thumbFilename = `${id}${THUMBNAIL_EXT}`;
		fs.writeFileSync(path.join(THUMB_DIR, thumbFilename), buffer);

		const updated = updatePart(id, { thumbnailFilename: thumbFilename });
		if (!updated) {
			return NextResponse.json(
				{ error: "Failed to update catalog" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, thumbFilename });
	} catch (error) {
		console.error("Thumbnail save error:", error);
		return NextResponse.json(
			{ error: "Failed to save thumbnail" },
			{ status: 500 },
		);
	}
}
