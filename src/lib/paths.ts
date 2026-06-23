import "server-only";
import path from "path";

/**
 * Root directory for binary asset files (STEP, GLB, thumbnails).
 *
 * Decoupled from the catalog JSON so that storage can be mounted on a separate
 * volume (e.g. NAS share, different disk, future S3) without moving the
 * metadata. Defaults to `<cwd>/catalog` to preserve existing behavior.
 */
const FILES_ROOT = path.resolve(
	process.env.DASHCAD_FILES_PATH ?? path.join(process.cwd(), "catalog"),
);

export const STEP_DIR = path.join(FILES_ROOT, "step");
export const GLB_DIR = path.join(FILES_ROOT, "glb");
export const THUMB_DIR = path.join(FILES_ROOT, "thumb");

/** Compose an absolute path under STEP_DIR. Caller must validate `filename`. */
export function stepPath(filename: string): string {
	return path.join(STEP_DIR, filename);
}

/** Compose an absolute path under GLB_DIR. Caller must validate `filename`. */
export function glbPath(filename: string): string {
	return path.join(GLB_DIR, filename);
}

/** Compose an absolute path under THUMB_DIR. Caller must validate `filename`. */
export function thumbPath(filename: string): string {
	return path.join(THUMB_DIR, filename);
}

/** @internal Test hook: file root used for binary assets. */
export function getFilesRootForTests(): string {
	return FILES_ROOT;
}
