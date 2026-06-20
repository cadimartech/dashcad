"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function getThemeSnapshot(): "light" | "dark" {
	if (typeof document === "undefined") return "dark";
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribeToTheme(callback: () => void): () => void {
	if (typeof document === "undefined") return () => {};
	const observer = new MutationObserver(() => callback());
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	return () => observer.disconnect();
}

export function ThemeToggle() {
	const theme = useSyncExternalStore(
		subscribeToTheme,
		getThemeSnapshot,
		() => "dark",
	);

	const toggle = () => {
		const root = document.documentElement;
		const next = theme === "dark" ? "light" : "dark";
		root.classList.toggle("dark", next === "dark");
		root.style.colorScheme = next;
		try {
			localStorage.setItem("dashcad-theme", next);
		} catch {
			// localStorage may be unavailable
		}
	};

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={
				theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
			}
			className="flex h-10 w-10 items-center justify-center border border-border bg-card text-foreground transition hover:bg-secondary hover:text-foreground"
		>
			{theme === "dark" ? (
				<Sun className="size-4" />
			) : (
				<Moon className="size-4" />
			)}
		</button>
	);
}
