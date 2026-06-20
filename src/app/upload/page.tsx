"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [tags, setTags] = useState("");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!file) return;

		setUploading(true);
		setError(null);

		const formData = new FormData();
		formData.append("file", file);
		formData.append("name", name || file.name.replace(/\.(step|stp)$/i, ""));
		formData.append("description", description);
		formData.append("category", category);
		formData.append("tags", tags);

		try {
			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Upload failed");
			}
			const data = await res.json();
			router.push(`/parts/${data.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
		}
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-[600px] px-4 py-4 sm:px-6">
				<Link
					href="/"
					className="mb-6 inline-flex items-center gap-1.5 text-label text-muted-foreground transition hover:text-foreground"
				>
					<ArrowLeft className="size-3" />
					Back to Vault
				</Link>

				<h1 className="text-hero mb-2">Upload STEP Part</h1>
				<p className="text-ui mb-8 text-muted-foreground">
					Add a new STEP file to your CAD project vault.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* File input */}
					<div>
						<label className="text-label mb-1 block text-muted-foreground">
							STEP File *
						</label>
						<div className="flex items-center gap-3">
							<input
								type="file"
								accept=".step,.stp"
								onChange={(e) => setFile(e.target.files?.[0] || null)}
								className="hidden"
								id="file-input"
								required
							/>
							<label
								htmlFor="file-input"
								className="flex h-10 cursor-pointer items-center gap-2 border border-border bg-card px-4 text-ui text-foreground transition hover:bg-secondary"
							>
								<Upload className="size-4" />
								{file ? file.name : "Choose file..."}
							</label>
						</div>
					</div>

					{/* Name */}
					<div>
						<label className="text-label mb-1 block text-muted-foreground">
							Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Part name (defaults to filename)"
							className="h-10 w-full border border-border bg-card px-3 text-ui text-foreground placeholder:text-muted-foreground/50"
						/>
					</div>

					{/* Description */}
					<div>
						<label className="text-label mb-1 block text-muted-foreground">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief description of the part..."
							rows={3}
							className="w-full border border-border bg-card px-3 py-2 text-ui text-foreground placeholder:text-muted-foreground/50"
						/>
					</div>

					{/* Category */}
					<div>
						<label className="text-label mb-1 block text-muted-foreground">
							Category
						</label>
						<input
							type="text"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							placeholder="e.g., Electronics, Mechanical, Structural"
							className="h-10 w-full border border-border bg-card px-3 text-ui text-foreground placeholder:text-muted-foreground/50"
						/>
					</div>

					{/* Tags */}
					<div>
						<label className="text-label mb-1 block text-muted-foreground">
							Tags
						</label>
						<input
							type="text"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="Comma-separated: screw, m3, fastener"
							className="h-10 w-full border border-border bg-card px-3 text-ui text-foreground placeholder:text-muted-foreground/50"
						/>
					</div>

					{error && (
						<div className="border border-destructive bg-destructive/10 px-3 py-2 text-ui text-destructive">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={!file || uploading}
						className="flex h-10 w-full items-center justify-center gap-2 border border-border bg-primary px-4 text-label text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{uploading ? (
							<>
								<LoaderCircle className="size-4 animate-spin" />
								Uploading...
							</>
						) : (
							<>
								<Upload className="size-4" />
								Upload Part
							</>
						)}
					</button>
				</form>
			</div>
		</main>
	);
}
