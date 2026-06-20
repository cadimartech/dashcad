import { PartDirectory } from "@/components/part-directory";
import { enrichPartsWithResolvedConversionStatus } from "@/lib/conversion-status";
import { getParts } from "@/lib/parts";

/** Catalog is mutable on disk; render at request time (Next 16 route segment config). */
export const dynamic = "force-dynamic";

export default function Home() {
	const parts = enrichPartsWithResolvedConversionStatus(getParts());
	return <PartDirectory parts={parts} />;
}
