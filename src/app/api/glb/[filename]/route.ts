import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isSafeGlbFilename } from "@/lib/upload-validation";

const GLB_DIR = path.join(process.cwd(), "catalog", "glb");

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ filename: string }> },
) {
	const { filename } = await params;

	// Security: prevent path traversal
	const safeName = path.basename(filename);
	if (!isSafeGlbFilename(safeName)) {
		return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
	}

	const filePath = path.join(GLB_DIR, safeName);

	try {
		if (!fs.existsSync(filePath)) {
			return NextResponse.json({ error: "Preview not found" }, { status: 404 });
		}

		const buffer = fs.readFileSync(filePath);
		return new NextResponse(buffer, {
			headers: {
				"Content-Type": "model/gltf-binary",
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch {
		return NextResponse.json({ error: "Preview not found" }, { status: 404 });
	}
}
