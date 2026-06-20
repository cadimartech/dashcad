"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CadPart } from "@/types/part";
import { formatFileSize } from "@/lib/format";
import { ConversionStatusBadge } from "@/components/conversion-status-badge";
import { StepDownloadLink } from "@/components/step-download-link";
import { Box, HardDrive, Tag, Trash2 } from "lucide-react";

export function PartCard({ part }: { part: CadPart }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm(`Delete "${part.name}" permanently?`)) return;
		setDeleting(true);
		try {
			const res = await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
			if (res.ok) router.refresh();
			else alert("Failed to delete part");
		} catch {
			alert("Failed to delete part");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="group flex flex-col border border-border bg-card transition hover:border-border-hover hover:bg-secondary/60">
			{/* Preview image area */}
			<Link
				href={`/parts/${part.id}`}
				className="flex aspect-square items-center justify-center overflow-hidden border-b border-border bg-background transition"
			>
				{part.thumbnailFilename ? (
					<img
						src={`/api/thumb/${encodeURIComponent(part.thumbnailFilename)}`}
						alt={part.name}
						className="h-full w-full object-contain"
					/>
				) : (
					<Box className="size-16 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
				)}
			</Link>

			{/* Info area */}
			<div className="flex min-w-0 flex-col gap-2 p-3">
				<Link href={`/parts/${part.id}`} className="min-w-0">
					<h3 className="text-ui truncate font-medium text-foreground transition group-hover:text-primary">
						{part.name}
					</h3>
				</Link>

				{part.description && (
					<p className="text-ui line-clamp-2 text-muted-foreground">
						{part.description}
					</p>
				)}

				<div className="flex flex-wrap items-center gap-1.5">
					<ConversionStatusBadge status={part.conversionStatus} />
					<span className="flex items-center gap-1 text-xs text-muted-foreground">
						<HardDrive className="size-3" />
						{formatFileSize(part.fileSize)}
					</span>
					{part.category && (
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<Tag className="size-3" />
							{part.category}
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-1 pt-1">
					{part.tags?.slice(0, 4).map((tag) => (
						<span
							key={tag}
							className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
						>
							{tag}
						</span>
					))}
				</div>

				<div className="flex items-center gap-2 pt-2">
					<Link
						href={`/parts/${part.id}`}
						className="flex h-8 flex-1 items-center justify-center border border-border bg-background px-2 text-xs text-foreground transition hover:bg-secondary"
					>
						View
					</Link>
					<StepDownloadLink filename={part.filename} />
					<button
						type="button"
						onClick={handleDelete}
						disabled={deleting}
						className="flex h-8 w-8 items-center justify-center border border-border bg-background text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
						aria-label="Delete part"
					>
						<Trash2 className="size-3" />
					</button>
				</div>
			</div>
		</div>
	);
}
