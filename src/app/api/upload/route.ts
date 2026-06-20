import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { enqueuePartConversion } from "@/lib/conversion-queue";
import { addPart, generateId } from "@/lib/parts";
import {
	MAX_STEP_BYTES,
	parseTags,
	sanitizeText,
	MAX_NAME_LEN,
	MAX_DESCRIPTION_LEN,
	MAX_CATEGORY_LEN,
} from "@/lib/upload-validation";

const STEP_DIR = path.join(process.cwd(), "catalog", "step");
const GLB_DIR = path.join(process.cwd(), "catalog", "glb");

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const name = formData.get("name") as string | null;
		const description = formData.get("description") as string | null;
		const category = formData.get("category") as string | null;
		const tagsStr = formData.get("tags") as string | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file type by extension
		const ext = path.extname(file.name).toLowerCase();
		if (ext !== ".step" && ext !== ".stp") {
			return NextResponse.json(
				{ error: "Only STEP files (.step, .stp) are supported" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_STEP_BYTES) {
			return NextResponse.json(
				{
					error: `File too large (max ${Math.floor(MAX_STEP_BYTES / (1024 * 1024))} MiB)`,
				},
				{ status: 400 },
			);
		}

		// Generate unique filename
		const id = generateId();
		const safeFilename = `${id}${ext}`;
		const filePath = path.join(STEP_DIR, safeFilename);

		// Ensure directories exist
		if (!fs.existsSync(STEP_DIR)) {
			fs.mkdirSync(STEP_DIR, { recursive: true });
		}
		if (!fs.existsSync(GLB_DIR)) {
			fs.mkdirSync(GLB_DIR, { recursive: true });
		}

		// Write STEP file
		const buffer = Buffer.from(await file.arrayBuffer());
		fs.writeFileSync(filePath, buffer);

		const tags = parseTags(tagsStr);

		// Add to catalog (GLB conversion runs in background)
		const now = new Date().toISOString();
		const partName =
			sanitizeText(name, MAX_NAME_LEN) ||
			sanitizeText(file.name.replace(/\.(step|stp)$/i, ""), MAX_NAME_LEN);
		const partDescription = sanitizeText(description, MAX_DESCRIPTION_LEN);
		const partCategory =
			sanitizeText(category, MAX_CATEGORY_LEN) || "Uncategorized";

		addPart({
			id,
			name: partName,
			description: partDescription,
			filename: safeFilename,
			category: partCategory,
			tags,
			createdAt: now,
			updatedAt: now,
			fileSize: buffer.length,
			conversionStatus: "pending",
		});

		enqueuePartConversion(id);

		return NextResponse.json({
			id,
			filename: safeFilename,
			conversionStatus: "pending",
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json({ error: "Upload failed" }, { status: 500 });
	}
}
