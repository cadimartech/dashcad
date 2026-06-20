import { LoaderCircle } from "lucide-react";

/** Shown while PartViewer chunk (Three.js) loads via next/dynamic. */
export function PartViewerSkeleton() {
	return (
		<div
			className="relative flex min-h-[420px] items-center justify-center border border-border bg-card sm:min-h-[560px]"
			aria-busy="true"
			aria-label="Loading 3D viewer"
		>
			<LoaderCircle className="size-7 animate-spin text-muted-foreground" />
		</div>
	);
}