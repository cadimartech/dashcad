"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { CadPart } from "@/types/part";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PartCard } from "@/components/part-card";

type PartDirectoryProps = {
	parts: CadPart[];
};

export function PartDirectory({ parts }: PartDirectoryProps) {
	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const categories = useMemo(() => {
		const cats = new Set<string>();
		parts.forEach((p) => {
			if (p.category) cats.add(p.category);
		});
		return Array.from(cats).sort();
	}, [parts]);

	const filteredParts = useMemo(() => {
		let result = parts;
		if (query) {
			const q = query.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.description?.toLowerCase().includes(q) ||
					p.tags?.some((t) => t.toLowerCase().includes(q)),
			);
		}
		if (selectedCategory) {
			result = result.filter((p) => p.category === selectedCategory);
		}
		return result;
	}, [parts, query, selectedCategory]);

	const clearFilters = () => {
		setQuery("");
		setSelectedCategory(null);
	};

	const hasFilters = query || selectedCategory;

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6">
				<SiteHeader />

				{/* Search & Filters */}
				<div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search parts by name, description, or tag..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="h-10 w-full border border-border bg-card pl-10 pr-3 text-ui text-foreground placeholder:text-muted-foreground/50"
						/>
					</div>
					{categories.length > 0 && (
						<select
							value={selectedCategory || ""}
							onChange={(e) => setSelectedCategory(e.target.value || null)}
							className="h-10 border border-border bg-card px-3 text-ui text-foreground"
						>
							<option value="">All Categories</option>
							{categories.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
					)}
					{hasFilters && (
						<button
							onClick={clearFilters}
							className="flex h-10 items-center gap-1.5 border border-border bg-card px-3 text-label text-foreground transition hover:bg-secondary"
						>
							<X className="size-3" />
							Clear
						</button>
					)}
				</div>

				{/* Results count */}
				<p className="text-label mb-4 text-muted-foreground">
					{filteredParts.length} part{filteredParts.length !== 1 ? "s" : ""}
				</p>

				{/* Empty state */}
				{parts.length === 0 ? (
					<div className="flex flex-col items-center justify-center border border-border bg-card py-24">
						<p className="text-heading text-muted-foreground">No parts yet</p>
						<p className="mt-2 text-ui text-muted-foreground/60">
							Upload your first STEP file to get started.
						</p>
						<Link
							href="/upload"
							className="mt-6 flex h-10 items-center gap-2 border border-border bg-primary px-4 text-label text-primary-foreground transition hover:bg-primary/80"
						>
							Upload Part
						</Link>
					</div>
				) : filteredParts.length === 0 ? (
					<div className="flex flex-col items-center justify-center border border-border bg-card py-24">
						<p className="text-heading text-muted-foreground">No matches</p>
						<p className="mt-2 text-ui text-muted-foreground/60">
							Try a different search or clear filters.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredParts.map((part) => (
							<PartCard key={part.id} part={part} />
						))}
					</div>
				)}
			</div>

			<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
				<SiteFooter />
			</div>
		</main>
	);
}
