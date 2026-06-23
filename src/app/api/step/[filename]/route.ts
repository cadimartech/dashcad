import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { stepPath } from "@/lib/paths";
import { isSafeStepFilename } from "@/lib/upload-validation";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ filename: string }> },
) {
	const { filename } = await params;

	const safeName = path.basename(filename);
	if (!isSafeStepFilename(safeName)) {
		return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
	}
	const filePath = stepPath(safeName);

	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	const stat = fs.statSync(filePath);
	const fileBuffer = fs.readFileSync(filePath);

	return new NextResponse(fileBuffer, {
		headers: {
			"Content-Disposition": `attachment; filename="${safeName}"`,
			"Content-Type": "application/octet-stream",
			"Content-Length": String(stat.size),
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
