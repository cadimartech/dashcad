"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	children: ReactNode;
	partName?: string;
};

type State = {
	hasError: boolean;
	message: string;
};

export class PartViewerErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, message: "" };

	static getDerivedStateFromError(error: unknown): State {
		const message =
			error instanceof Error ? error.message : "Unexpected viewer error";
		return { hasError: true, message };
	}

	componentDidCatch(error: unknown, info: ErrorInfo) {
		console.error("[PartViewer] Error boundary:", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					className="flex min-h-[420px] flex-col items-center justify-center border border-border bg-card p-6 text-center sm:min-h-[560px]"
					role="alert"
				>
					<p className="text-ui text-destructive">3D viewer crashed</p>
					<p className="mt-2 max-w-md break-words text-xs text-muted-foreground/60">
						{this.state.message}
					</p>
					<p className="mt-3 text-xs text-muted-foreground/50">
						{this.props.partName
							? `Reload the page to preview ${this.props.partName} again, or download the STEP file.`
							: "Reload the page or download the STEP file."}
					</p>
					<button
						type="button"
						className="mt-4 border border-border px-3 py-1.5 text-label text-foreground transition hover:bg-secondary"
						onClick={() => this.setState({ hasError: false, message: "" })}
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}