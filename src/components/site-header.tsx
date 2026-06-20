"use client";

import { HardDrive, Upload } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
	return (
		<header className="flex items-start justify-between gap-3 border-b border-border pb-6 sm:gap-4">
			<Link href="/" className="min-w-0 focus:outline-none">
				<p className="text-label text-muted-foreground">CAD Project Vault</p>
				<div className="mt-2 flex min-w-0 items-center gap-2">
					<HardDrive
						className="size-8 shrink-0 text-primary sm:size-10"
						aria-hidden="true"
					/>
					<h1 className="min-w-0 text-3xl font-medium tracking-normal text-foreground transition hover:text-foreground/80 sm:text-5xl">
						DashCAD
					</h1>
				</div>
			</Link>
			<div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
				<Link
					href="/upload"
					className="flex h-10 items-center gap-2 border border-border bg-card px-3 text-label text-foreground transition hover:bg-secondary"
				>
					<Upload className="size-4" aria-hidden="true" />
					Upload
				</Link>
				<ThemeToggle />
			</div>
		</header>
	);
}
