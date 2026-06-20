"use client";

import dynamic from "next/dynamic";
import { PartViewerErrorBoundary } from "@/components/part-viewer-error-boundary";
import { PartViewerSkeleton } from "@/components/part-viewer-skeleton";

const PartViewer = dynamic(
	() =>
		import("@/components/part-viewer").then((mod) => ({
			default: mod.PartViewer,
		})),
	{
		ssr: false,
		loading: () => <PartViewerSkeleton />,
	},
);

export type PartViewerLoaderProps = {
	stepUrl: string;
	glbUrl?: string;
	name: string;
	partId?: string;
};

export function PartViewerLoader(props: PartViewerLoaderProps) {
	return (
		<PartViewerErrorBoundary partName={props.name}>
			<PartViewer {...props} />
		</PartViewerErrorBoundary>
	);
}