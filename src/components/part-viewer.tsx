"use client";

import { useEffect, useRef, useState } from "react";
import {
	ACESFilmicToneMapping,
	Box3,
	CircleGeometry,
	DirectionalLight,
	HemisphereLight,
	MathUtils,
	Mesh,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	Object3D,
	OrthographicCamera,
	PCFShadowMap,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	ShadowMaterial,
	Sphere,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Pause, Play, RotateCw, LoaderCircle } from "lucide-react";
import { DEFAULT_STEP_TRIANGULATION } from "@/lib/occt-triangulation";
import {
	buildMeshesFromOcct,
	MESH_STYLE_BROWSER,
} from "@/lib/mesh-builder";

const GLB_LOAD_TIMEOUT_MS = 45_000;

type PartViewerProps = {
	stepUrl: string;
	glbUrl?: string;
	name: string;
	partId?: string;
};

function disposeObject(object: Object3D) {
	object.traverse((child) => {
		const mesh = child as Mesh;
		if (mesh.geometry) mesh.geometry.dispose();
		const material = mesh.material;
		if (Array.isArray(material)) {
			material.forEach((entry) => entry.dispose());
		} else if (material) {
			material.dispose();
		}
	});
}

type OcctInstance = {
	ReadStepFile: (
		data: Uint8Array,
		params?: {
			linearDeflection?: number;
			angularDeflection?: number;
			linearDeflectionType?: string;
			linearUnit?: string;
		} | null,
	) => {
		success: boolean;
		meshes?: Array<{
			name?: string;
			color?: [number, number, number];
			attributes: {
				position?: { array: Float32Array };
				normal?: { array: Float32Array };
			};
			index?: { array: Uint32Array };
		}>;
	};
};

// Client STEP fallback: occt WASM runs on the main thread (see research.md / plan.md).
// A Web Worker (occt-import-js-worker.js) is deferred until server GLB conversion is reliable.
// Load occt-import-js as a script tag from public/wasm/ to bypass bundler issues
let occtPromise: Promise<OcctInstance> | null = null;

declare global {
	interface Window {
		occtimportjs?: (opts?: {
			locateFile?: (url: string) => string;
		}) => Promise<OcctInstance>;
	}
}

async function loadOcct(): Promise<OcctInstance> {
	if (occtPromise) return occtPromise;

	occtPromise = new Promise<OcctInstance>((resolve, reject) => {
		if (typeof window !== "undefined" && window.occtimportjs) {
			resolve(
				window.occtimportjs({
					locateFile: (url: string) => `/wasm/${url}`,
				}),
			);
			return;
		}

		const script = document.createElement("script");
		script.src = "/wasm/occt-import-js.js";
		script.async = true;
		script.onload = () => {
			if (!window.occtimportjs) {
				reject(new Error("occt-import-js failed to initialize"));
				return;
			}
			resolve(
				window.occtimportjs({
					locateFile: (url: string) => `/wasm/${url}`,
				}),
			);
		};
		script.onerror = () =>
			reject(new Error("Failed to load occt-import-js script"));
		document.head.appendChild(script);
	});

	return occtPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
			ms,
		);
		promise
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch((err) => {
				clearTimeout(timer);
				reject(err);
			});
	});
}

async function loadStepInBrowser(stepUrl: string, scene: Scene) {
	const resp = await fetch(stepUrl);
	if (!resp.ok) {
		throw new Error(`STEP download failed (${resp.status})`);
	}
	const buffer = await resp.arrayBuffer();
	const occt = await loadOcct();
	const result = occt.ReadStepFile(
		new Uint8Array(buffer),
		DEFAULT_STEP_TRIANGULATION,
	);

	if (!result.success) {
		throw new Error("STEP file could not be parsed in the browser");
	}
	if (!result.meshes?.length) {
		throw new Error("No geometry found in STEP file");
	}

	const meshes = buildMeshesFromOcct(result.meshes, MESH_STYLE_BROWSER);
	if (meshes.length === 0) {
		throw new Error("STEP meshes had no usable position data");
	}
	for (const mesh of meshes) {
		scene.add(mesh);
	}
}

export function PartViewer({ stepUrl, glbUrl, name, partId }: PartViewerProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frameRef = useRef<HTMLDivElement | null>(null);
	const resetViewRef = useRef<() => void>(() => {});
	const autoRotateRef = useRef(true);
	const [autoRotate, setAutoRotate] = useState(true);
	const [status, setStatus] = useState<
		"loading" | "ready" | "error" | "unsupported"
	>("loading");
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		autoRotateRef.current = autoRotate;
	}, [autoRotate]);

	// Capture thumbnail when 3D view is ready
	useEffect(() => {
		if (status !== "ready" || !canvasRef.current || !partId) return;

		const canvas = canvasRef.current;
		requestAnimationFrame(() => {
			canvas.toBlob(async (blob) => {
				if (!blob) return;
				const fd = new FormData();
				fd.append("thumbnail", blob, `${partId}.png`);
				try {
					await fetch(`/api/parts/${partId}/thumbnail`, {
						method: "POST",
						body: fd,
					});
				} catch {
					// Thumbnail upload is optional — ignore failures
				}
			}, "image/png");
		});
	}, [status, partId]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const frame = frameRef.current;
		if (!canvas || !frame) return;

		let disposed = false;
		let animationFrame = 0;
		const loadedModel: Object3D[] = [];
		let modelBounds: { center: Vector3; radius: number } | null = null;
		let userAdjustedView = false;

		const renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: "high-performance",
		});
		renderer.outputColorSpace = SRGBColorSpace;
		renderer.toneMapping = ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.7;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = PCFShadowMap;

		const scene = new Scene();
		const camera = new PerspectiveCamera(35, 1, 0.01, 100000);
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.autoRotateSpeed = 1.25;

		const pmrem = new PMREMGenerator(renderer);
		const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = environment;

		const key = new DirectionalLight(0xffffff, 1.5);
		key.position.set(-3.5, 6, 4.5);
		key.castShadow = true;
		key.shadow.mapSize.set(2048, 2048);
		key.shadow.bias = -0.00008;
		key.shadow.normalBias = 0.01;
		scene.add(key);
		scene.add(key.target);

		const fill = new HemisphereLight(0xffffff, 0x222222, 0.5);
		scene.add(fill);
		const rim = new DirectionalLight(0xffffff, 0.42);
		rim.position.set(3, 2, -4);
		scene.add(rim);
		scene.add(rim.target);
		const interiorFill = new DirectionalLight(0xffffff, 0.62);
		interiorFill.position.set(2.2, 1.5, 3.2);
		scene.add(interiorFill);
		scene.add(interiorFill.target);

		const floor = new Mesh(
			new CircleGeometry(1, 96),
			new ShadowMaterial({ color: 0x000000, opacity: 0.52 }),
		);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		floor.visible = false;
		scene.add(floor);

		const resize = () => {
			const width = Math.max(frame.clientWidth, 1);
			const height = Math.max(frame.clientHeight, 1);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			if (modelBounds && !userAdjustedView) {
				frameModelBounds(modelBounds.center, modelBounds.radius);
			}
		};

		const frameModelBounds = (center: Vector3, radius: number) => {
			const verticalFov = MathUtils.degToRad(camera.fov);
			const horizontalFov =
				2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
			const fitFov = Math.min(verticalFov, horizontalFov);
			const distance = (radius * 1.18) / Math.sin(fitFov / 2);
			const viewDirection = new Vector3(1.8, 1.05, 1.75).normalize();

			controls.target.copy(center);
			camera.near = Math.max(radius / 100, 0.001);
			camera.far = distance + radius * 100;
			camera.position.copy(center).add(viewDirection.multiplyScalar(distance));
			camera.updateProjectionMatrix();
			controls.update();
		};

		const fitModel = () => {
			const box = new Box3().setFromObject(scene);
			const sphere = box.getBoundingSphere(new Sphere());
			const radius = Math.max(sphere.radius, 1);
			const center = sphere.center;
			modelBounds = { center: center.clone(), radius };

			frameModelBounds(center, radius);

			key.position
				.copy(center)
				.add(new Vector3(-radius * 3.3, radius * 4.8, radius * 3.4));
			key.target.position.copy(center);
			key.target.updateMatrixWorld();
			rim.position
				.copy(center)
				.add(new Vector3(radius * 3, radius * 2, -radius * 4));
			rim.target.position.copy(center);
			rim.target.updateMatrixWorld();
			interiorFill.position
				.copy(center)
				.add(new Vector3(radius * 2.2, radius * 1.5, radius * 3.2));
			interiorFill.target.position.copy(center);
			interiorFill.target.updateMatrixWorld();
			const shadowCamera = key.shadow.camera as OrthographicCamera;
			const shadowSize = radius * 3;
			shadowCamera.left = -shadowSize;
			shadowCamera.right = shadowSize;
			shadowCamera.top = shadowSize;
			shadowCamera.bottom = -shadowSize;
			shadowCamera.near = radius / 20;
			shadowCamera.far = radius * 10;
			shadowCamera.updateProjectionMatrix();

			floor.scale.setScalar(radius * 2.7);
			floor.position.set(center.x, box.min.y - radius * 0.035, center.z);
			floor.visible = true;

			resetViewRef.current = () => {
				userAdjustedView = false;
				frameModelBounds(center, radius);
			};
		};

		const markUserAdjustedView = () => {
			userAdjustedView = true;
		};
		controls.addEventListener("start", markUserAdjustedView);

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(frame);
		resize();

		// Load model: try GLB first, fall back to browser STEP parsing
		(async () => {
			setStatus("loading");
			if (glbUrl) {
				// Try loading pre-converted GLB
				try {
					const { GLTFLoader } = await import(
						"three/examples/jsm/loaders/GLTFLoader.js"
					);
					const loader = new GLTFLoader();
					const loadGlb = new Promise<void>((resolve, reject) => {
						loader.load(
							glbUrl,
							(gltf) => {
								if (disposed) return;
								loadedModel.push(gltf.scene);
								gltf.scene.traverse((child) => {
									const mesh = child as Mesh;
									if (!mesh.isMesh) return;
									mesh.castShadow = true;
									mesh.receiveShadow = true;
									const materials = Array.isArray(mesh.material)
										? mesh.material
										: [mesh.material];
									materials.forEach((material) => {
										if (
											material instanceof MeshStandardMaterial ||
											material instanceof MeshPhysicalMaterial
										) {
											material.envMapIntensity = 0.8;
											material.metalness = Math.min(material.metalness, 0.5);
											material.roughness = Math.max(material.roughness, 0.48);
											material.needsUpdate = true;
										}
									});
								});
								scene.add(gltf.scene);
								fitModel();
								if (!disposed) setStatus("ready");
								resolve();
							},
							undefined,
							() => reject(new Error("GLB preview could not be loaded")),
						);
					});
					await withTimeout(loadGlb, GLB_LOAD_TIMEOUT_MS, "GLB preview");
					return;
				} catch (glbErr) {
					console.warn(
						"[PartViewer] GLB load failed, using STEP fallback:",
						glbErr,
					);
				}
			}

			// Parse STEP directly in the browser
			try {
				await loadStepInBrowser(stepUrl, scene);
				fitModel();
				if (!disposed) setStatus("ready");
			} catch (err) {
				console.error("[PartViewer] STEP load failed:", err);
				if (!disposed) {
					setErrorMessage(err instanceof Error ? err.message : String(err));
					setStatus("error");
				}
			}
		})();

		const animate = () => {
			controls.autoRotate = autoRotateRef.current;
			controls.update();
			renderer.render(scene, camera);
			animationFrame = requestAnimationFrame(animate);
		};
		animate();

		return () => {
			disposed = true;
			cancelAnimationFrame(animationFrame);
			resizeObserver.disconnect();
			controls.removeEventListener("start", markUserAdjustedView);
			controls.dispose();
			loadedModel.forEach((obj) => disposeObject(obj));
			floor.geometry.dispose();
			floor.material.dispose();
			environment.dispose();
			pmrem.dispose();
			renderer.dispose();
		};
	}, [stepUrl, glbUrl]);

	return (
		<div
			ref={frameRef}
			className="relative min-h-[420px] overflow-hidden border border-border bg-card sm:min-h-[560px]"
		>
			<canvas
				ref={canvasRef}
				className={`h-full w-full transition-opacity duration-200 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
				aria-label={`${name} 3D viewer`}
			/>
			{status === "loading" && (
				<div className="absolute inset-0 grid place-items-center bg-background/10">
					<div className="grid h-24 w-24 place-items-center bg-background/35 backdrop-blur-sm">
						<LoaderCircle className="size-7 animate-spin text-foreground/80" />
					</div>
					<span className="sr-only">Loading {name} 3D viewer</span>
				</div>
			)}
			{status === "unsupported" && (
				<div className="absolute inset-0 grid place-items-center">
					<div className="text-center">
						<p className="text-ui text-muted-foreground">
							No 3D preview available
						</p>
						<p className="mt-1 text-xs text-muted-foreground/60">
							Download the STEP file to view in your CAD application
						</p>
					</div>
				</div>
			)}
			{status === "error" && (
				<div className="absolute inset-0 grid place-items-center p-4">
					<div className="max-w-md text-center">
						<p className="text-ui text-destructive">Could not load 3D preview</p>
						<p className="mt-2 break-words text-xs text-muted-foreground/60">
							{errorMessage || "Unknown error"}
						</p>
						<p className="mt-3 text-xs text-muted-foreground/50">
							Try refreshing the page or download the STEP file to open in your CAD
							app.
						</p>
					</div>
				</div>
			)}
			{status === "ready" && (
				<div className="absolute right-3 top-3 flex gap-2">
					<button
						type="button"
						onClick={() => setAutoRotate((v) => !v)}
						className="flex h-9 w-9 items-center justify-center border border-border bg-background/85 text-muted-foreground backdrop-blur-sm transition hover:bg-secondary hover:text-foreground"
						aria-label={autoRotate ? "Pause rotation" : "Start rotation"}
					>
						{autoRotate ? (
							<Pause className="size-4" />
						) : (
							<Play className="size-4" />
						)}
					</button>
					<button
						type="button"
						onClick={() => resetViewRef.current()}
						className="flex h-9 w-9 items-center justify-center border border-border bg-background/85 text-muted-foreground backdrop-blur-sm transition hover:bg-secondary hover:text-foreground"
						aria-label="Reset view"
					>
						<RotateCw className="size-4" />
					</button>
				</div>
			)}
		</div>
	);
}
