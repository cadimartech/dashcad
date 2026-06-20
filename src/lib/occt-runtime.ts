import path from "path";
import type { OcctModule, OcctOptions } from "occt-import-js";

let occtInstance: OcctModule | null = null;

/** Resolve occt-import-js.wasm next to the published dist/ (works in Node + Next server). */
export function getOcctDistDir(): string {
	return path.join(process.cwd(), "node_modules", "occt-import-js", "dist");
}

export function getOcctInitOptions(): OcctOptions {
	const distDir = getOcctDistDir();
	return {
		locateFile: (file: string) => path.join(distDir, file),
	};
}

export async function loadOcctModule(): Promise<OcctModule> {
	if (!occtInstance) {
		const Occt = (await import("occt-import-js")).default;
		occtInstance = await Occt(getOcctInitOptions());
	}
	return occtInstance;
}