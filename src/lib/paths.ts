import "server-only";
import path from "path";

/**
 * Root directory for binary asset files (STEP, GLB, thumbnails).
 *
 * Decoupled from the catalog JSON so that storage can be mounted on a separate
 * volume (e.g. NAS share, different disk, future S3) without moving the
 * metadata. Defaults to `<cwd>/catalog` to preserve existing behavior.
 */
const FILES_ROOT =
	process.env.DASHCAD_FILES_PATH ?? path.join(process.cwd(), "catalog");

export const STEP_DIR = path.join(FILES_ROOT, "step");
export const GLB_DIR = path.join(FILES_ROOT, "glb");
export const THUMB_DIR = path.join(FILES_ROOT, "thumb");

/** @internal Test hook: file root used for binary assets. */
export function getFilesRootForTests(): string {
	return FILES_ROOT;
}
