"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ConversionStatus } from "@/types/part";

type Props = {
	partId: string;
	status?: ConversionStatus;
	intervalMs?: number;
};

/** Refresh the server page while GLB conversion is in flight. */
export function ConversionDetailPoll({
	partId,
	status,
	intervalMs = 4000,
}: Props) {
	const router = useRouter();

	useEffect(() => {
		if (status !== "pending" && status !== "converting") return;

		let cancelled = false;

		const tick = async () => {
			try {
				const res = await fetch(`/api/parts/${partId}`, {
					cache: "no-store",
				});
				if (!res.ok || cancelled) return;
				const data = (await res.json()) as {
					part?: { conversionStatus?: ConversionStatus };
				};
				const next = data.part?.conversionStatus;
				if (next === "ready" || next === "failed") {
					router.refresh();
				}
			} catch {
				/* ignore transient network errors */
			}
		};

		const id = window.setInterval(() => {
			void tick();
		}, intervalMs);

		void tick();

		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [partId, status, intervalMs, router]);

	return null;
}
