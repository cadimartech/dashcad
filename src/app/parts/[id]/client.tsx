"use client";

import { useRouter } from "next/navigation";
import { Trash2, Pencil, X } from "lucide-react";
import { useState } from "react";
import type { CadPart } from "@/types/part";

export function PartDetailClient({ part }: { part: CadPart }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [saving, setSaving] = useState(false);

	// Edit form state
	const [name, setName] = useState(part.name);
	const [description, setDescription] = useState(part.description || "");
	const [category, setCategory] = useState(part.category || "");
	const [tags, setTags] = useState((part.tags || []).join(", "));

	const handleDelete = async () => {
		if (!confirm("Delete this part permanently?")) return;
		setDeleting(true);
		try {
			const res = await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
			if (res.ok) router.push("/");
		} catch {
			alert("Failed to delete part");
		} finally {
			setDeleting(false);
		}
	};

	const openEdit = () => {
		// Reset form to current values
		setName(part.name);
		setDescription(part.description || "");
		setCategory(part.category || "");
		setTags((part.tags || []).join(", "));
		setShowEdit(true);
	};

	const closeEdit = () => {
		setShowEdit(false);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await fetch(`/api/parts/${part.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					description,
					category,
					tags,
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Update failed");
			}
			setShowEdit(false);
			router.refresh();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to update part");
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={openEdit}
					className="flex h-10 items-center gap-2 border border-border bg-card px-4 text-label text-foreground transition hover:bg-secondary"
				>
					<Pencil className="size-4" />
					Edit
				</button>
				<button
					type="button"
					onClick={handleDelete}
					disabled={deleting}
					className="flex h-10 items-center gap-2 border border-border bg-card px-4 text-label text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
				>
					<Trash2 className="size-4" />
					{deleting ? "Deleting..." : "Delete"}
				</button>
			</div>

			{/* Edit Modal */}
			{showEdit && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
					<div className="w-full max-w-[520px] rounded border border-border bg-background p-6 shadow-xl">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-xl font-medium">Edit Part</h2>
							<button
								type="button"
								onClick={closeEdit}
								className="text-muted-foreground hover:text-foreground"
								aria-label="Close"
							>
								<X className="size-5" />
							</button>
						</div>

						<form onSubmit={handleSave} className="space-y-4">
							<div>
								<label className="text-label mb-1 block text-muted-foreground">
									Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full border border-border bg-card px-3 py-2 text-ui"
									required
								/>
							</div>

							<div>
								<label className="text-label mb-1 block text-muted-foreground">
									Description
								</label>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full border border-border bg-card px-3 py-2 text-ui"
									rows={3}
								/>
							</div>

							<div>
								<label className="text-label mb-1 block text-muted-foreground">
									Category
								</label>
								<input
									type="text"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									className="w-full border border-border bg-card px-3 py-2 text-ui"
									placeholder="e.g. Mechanical"
								/>
							</div>

							<div>
								<label className="text-label mb-1 block text-muted-foreground">
									Tags (comma separated)
								</label>
								<input
									type="text"
									value={tags}
									onChange={(e) => setTags(e.target.value)}
									className="w-full border border-border bg-card px-3 py-2 text-ui"
									placeholder="bracket, assembly, v2"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={closeEdit}
									className="flex h-10 items-center gap-2 border border-border bg-card px-4 text-label text-foreground transition hover:bg-secondary"
									disabled={saving}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving || !name.trim()}
									className="flex h-10 items-center gap-2 border border-border bg-primary px-4 text-label text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
								>
									{saving ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
