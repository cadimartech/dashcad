import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { thumbPath } from "@/lib/paths";
import { isSafeThumbFilename } from "@/lib/upload-validation";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ filename: string }> },
) {
	const { filename } = await params;
	const safeName = path.basename(filename);
	if (!isSafeThumbFilename(safeName)) {
		return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
	}
	const filePath = thumbPath(safeName);

	try {
		if (!fs.existsSync(filePath)) {
			return NextResponse.json(
				{ error: "Thumbnail not found" },
				{ status: 404 },
			);
		}
		const buffer = fs.readFileSync(filePath);
		return new NextResponse(buffer, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=86400, immutable",
			},
		});
	} catch {
		return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
	}
}
