export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { reconcilePendingConversions } = await import(
			"@/lib/conversion-queue"
		);
		reconcilePendingConversions();
	}
}
