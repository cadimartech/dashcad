import {
	BufferAttribute,
	BufferGeometry,
	Color,
	Float32BufferAttribute,
	Mesh,
	MeshStandardMaterial,
} from "three";
import type { OcctMesh } from "occt-import-js";

export type MeshSurfaceStyle = {
	metalness: number;
	roughness: number;
	envMapIntensity: number;
};

export const MESH_STYLE_SERVER: MeshSurfaceStyle = {
	metalness: 0.3,
	roughness: 0.5,
	envMapIntensity: 0.8,
};

export const MESH_STYLE_BROWSER: MeshSurfaceStyle = {
	metalness: 0.25,
	roughness: 0.6,
	envMapIntensity: 0.7,
};

const DEFAULT_MESH_COLOR = 0x80cbc4;

function toFloat32Array(
	value: Float32Array | number[] | undefined,
): Float32Array | null {
	if (!value?.length) return null;
	return value instanceof Float32Array ? value : new Float32Array(value);
}

function toIndexArray(
	value: Uint32Array | number[] | undefined,
): Uint32Array | null {
	if (!value?.length) return null;
	return value instanceof Uint32Array ? value : new Uint32Array(value);
}

/**
 * Builds Three.js meshes from OCCT triangulation output (shared by server GLB export and browser STEP fallback).
 */
export function buildMeshesFromOcct(
	meshes: OcctMesh[],
	style: MeshSurfaceStyle = MESH_STYLE_SERVER,
): Mesh[] {
	const built: Mesh[] = [];

	for (const meshData of meshes) {
		const pos = meshData.attributes?.position;
		if (!pos?.array?.length) continue;

		const geometry = new BufferGeometry();
		const posArray = toFloat32Array(pos.array);
		if (!posArray) continue;
		geometry.setAttribute("position", new Float32BufferAttribute(posArray, 3));

		const norm = meshData.attributes?.normal;
		const normArray = norm ? toFloat32Array(norm.array) : null;
		if (normArray) {
			geometry.setAttribute("normal", new Float32BufferAttribute(normArray, 3));
		} else {
			geometry.computeVertexNormals();
		}

		const idxArray = toIndexArray(meshData.index?.array);
		if (idxArray) {
			geometry.setIndex(new BufferAttribute(idxArray, 1));
		}

		const color = meshData.color
			? new Color(meshData.color[0], meshData.color[1], meshData.color[2])
			: new Color(DEFAULT_MESH_COLOR);

		const material = new MeshStandardMaterial({
			color,
			metalness: style.metalness,
			roughness: style.roughness,
			envMapIntensity: style.envMapIntensity,
		});

		const mesh = new Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		built.push(mesh);
	}

	return built;
}