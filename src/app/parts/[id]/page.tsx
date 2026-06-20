import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, HardDrive, Tag, Calendar } from "lucide-react";
import { ConversionPreviewNotice } from "@/components/conversion-preview-notice";
import { ConversionDetailPoll } from "./conversion-detail-poll";
import {
	resolveConversionStatus,
	shouldOfferGlbPreview,
} from "@/lib/conversion-status";
import { getPart } from "@/lib/parts";
import { formatFileSize } from "@/lib/format";
import { PartDetailClient } from "./client";
import { PartViewerLoader } from "./part-viewer-loader";

type Props = {
	params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const part = getPart(id);
	if (!part) return { title: "Part Not Found" };
	return {
		title: part.name,
		description: part.description || `${part.name} — STEP CAD part`,
	};
}

export default async function PartDetailPage({ params }: Props) {
	const { id } = await params;
	const part = getPart(id);
	if (!part) notFound();

	const conversionStatus = resolveConversionStatus(part);

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6">
				<Link
					href="/"
					className="mb-6 inline-flex items-center gap-1.5 text-label text-muted-foreground transition hover:text-foreground"
				>
					<ArrowLeft className="size-3" />
					Back to Vault
				</Link>

				<div className="grid gap-6 lg:grid-cols-2">
					{/* 3D Viewer */}
					<div>
						<ConversionDetailPoll partId={part.id} status={conversionStatus} />
						<ConversionPreviewNotice
							status={conversionStatus}
							error={part.conversionError}
						/>
						<PartViewerLoader
							stepUrl={`/api/step/${encodeURIComponent(part.filename)}`}
							glbUrl={
								shouldOfferGlbPreview(part)
									? `/api/glb/${encodeURIComponent(part.id)}.glb`
									: undefined
							}
							name={part.name}
							partId={part.id}
						/>
					</div>

					{/* Part Info */}
					<div className="flex flex-col gap-4">
						<div>
							<h1 className="text-hero text-foreground">{part.name}</h1>
							{part.description && (
								<p className="mt-2 text-ui text-muted-foreground">
									{part.description}
								</p>
							)}
						</div>

						<div className="flex flex-wrap gap-4 border-t border-border pt-4">
							<div className="flex items-center gap-2 text-ui text-muted-foreground">
								<HardDrive className="size-4" />
								{formatFileSize(part.fileSize)}
							</div>
							<div className="flex items-center gap-2 text-ui text-muted-foreground">
								<Calendar className="size-4" />
								{new Date(part.createdAt).toLocaleDateString()}
							</div>
							{part.category && (
								<div className="flex items-center gap-2 text-ui text-muted-foreground">
									<Tag className="size-4" />
									{part.category}
								</div>
							)}
						</div>

						{part.tags && part.tags.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{part.tags.map((tag) => (
									<span
										key={tag}
										className="inline-block border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
									>
										{tag}
									</span>
								))}
							</div>
						)}

						<div className="flex flex-wrap gap-2 border-t border-border pt-4">
							<a
								href={`/api/step/${encodeURIComponent(part.filename)}`}
								download={part.filename}
								className="flex h-10 items-center gap-2 border border-border bg-primary px-4 text-label text-primary-foreground transition hover:bg-primary/80"
							>
								<Download className="size-4" />
								Download STEP
							</a>
							<PartDetailClient part={part} />
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
