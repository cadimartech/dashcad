import { NextRequest, NextResponse } from "next/server";
import { enrichPartsWithResolvedConversionStatus } from "@/lib/conversion-status";
import { getParts } from "@/lib/parts";

export function GET(request: NextRequest) {
	const parts = getParts();
	const { searchParams } = new URL(request.url);
	const q = searchParams.get("q")?.toLowerCase();

	let result = parts;
	if (q) {
		result = parts.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.description?.toLowerCase().includes(q) ||
				p.tags?.some((t) => t.toLowerCase().includes(q)),
		);
	}

	return NextResponse.json({
		parts: enrichPartsWithResolvedConversionStatus(result),
	});
}
