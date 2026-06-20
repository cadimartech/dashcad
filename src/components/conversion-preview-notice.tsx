import { LoaderCircle, AlertCircle } from "lucide-react";
import type { ConversionStatus } from "@/types/part";

type Props = {
	status?: ConversionStatus;
	error?: string;
};

export function ConversionPreviewNotice({ status, error }: Props) {
	if (!status || status === "ready") return null;

	if (status === "pending" || status === "converting") {
		return (
			<div
				className="mb-3 flex items-start gap-2 border border-border bg-secondary/40 px-3 py-2 text-ui text-muted-foreground"
				role="status"
			>
				<LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />
				<span>
					{status === "converting"
						? "Generating optimized 3D preview on the server…"
						: "Preview conversion queued — showing STEP in the browser until GLB is ready."}
				</span>
			</div>
		);
	}

	if (status === "failed") {
		return (
			<div
				className="mb-3 flex items-start gap-2 border border-destructive/40 bg-destructive/10 px-3 py-2 text-ui text-destructive"
				role="alert"
			>
				<AlertCircle className="mt-0.5 size-4 shrink-0" />
				<span>
					Server preview failed
					{error ? `: ${error}` : ""}. Using browser STEP fallback.
				</span>
			</div>
		);
	}

	return null;
}
