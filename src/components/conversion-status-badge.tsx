import { LoaderCircle, AlertCircle, Clock } from "lucide-react";
import type { ConversionStatus } from "@/types/part";

type Props = {
	status?: ConversionStatus;
	className?: string;
};

export function ConversionStatusBadge({ status, className = "" }: Props) {
	if (!status || status === "ready") return null;

	const base =
		"inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider";

	if (status === "pending") {
		return (
			<span
				className={`${base} border-border bg-secondary/60 text-muted-foreground ${className}`}
			>
				<Clock className="size-2.5" />
				Queued
			</span>
		);
	}

	if (status === "converting") {
		return (
			<span
				className={`${base} border-border bg-secondary/60 text-muted-foreground ${className}`}
			>
				<LoaderCircle className="size-2.5 animate-spin" />
				Converting
			</span>
		);
	}

	if (status === "failed") {
		return (
			<span
				className={`${base} border-destructive/40 bg-destructive/10 text-destructive ${className}`}
			>
				<AlertCircle className="size-2.5" />
				Preview failed
			</span>
		);
	}

	return null;
}
