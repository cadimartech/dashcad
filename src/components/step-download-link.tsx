"use client";

import { Download } from "lucide-react";

export function StepDownloadLink({ filename }: { filename: string }) {
	return (
		<a
			href={`/api/step/${encodeURIComponent(filename)}`}
			download={filename}
			className="flex h-8 w-8 items-center justify-center border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground"
			aria-label={`Download ${filename}`}
		>
			<Download className="size-4" />
		</a>
	);
}
