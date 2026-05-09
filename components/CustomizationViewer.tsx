"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CarModel } from "@/data/models";

type Props = {
  model: CarModel;
  modelPath?: string;
  exteriorColor?: string;
  interiorColor?: string;
};

const pathMap: Record<string, string> = {
  "bmw-m3-cs-touring": "/models/2025_bmw_m3_cs_touring.glb",
  "bmw-m4-competition": "/models/2025_bmw_m4_competition.glb",
  "bmw-m4-f82": "/models/bmw_m4_f82.glb",
  "bmw-m3-topaz": "/models/bmw_m3_sedan_topaz_blue_car.glb",
  "bmw-x3": "/models/bmw_x3_m40i.glb",
  "bmw-z8": "/models/bmw_z8__www.vecarz.com.glb",
};

const SCENE_BACKGROUND = 0x050915;

/**
 * 车模型整体大小。
 * 数值越大，模型越大。
 */
const MODEL_TARGET_SIZE = 8.2;

/**
 * 相机距离系数。
 * 数值越小，车越大。
 */
const CAMERA_PADDING = 0.62;

/**
 * 车在画面里的填充比例。
 * 数值越大，车越撑满画布。
 */
const CAMERA_FILL_RATIO = 0.78;

const FLOOR_TOP_Y = -0.42;
const MODEL_FLOOR_GAP = 0.02;

/**
 * 如果白色前灯出现在车尾，把这里改成 -1。
 */
const FRONT_SIGN: 1 | -1 = 1;

/**
 * 模型里真实的灯光材质名。
 */
const REAL_LIGHT_MATERIAL_NAME = "m4car_emissive1";

/**
 * 车灯内嵌发光强度。
 */
const FRONT_LIGHT_POWER = 3.4;
const REAR_LIGHT_POWER = 2.7;

const FRONT_LIGHT_OPACITY = 0.82;
const REAR_LIGHT_OPACITY = 0.78;

/**
 * 从真实灯光 mesh 中切前灯/尾灯三角面的判定范围。
 */
const EDGE_RATIO = 0.2;
const SIDE_RATIO = 0.36;
const MIN_HEIGHT_RATIO = 0.28;
const MAX_HEIGHT_RATIO = 0.72;

type LightPlacement = "front" | "rear";

export default function CustomizationViewer({
  model,
  modelPath,
  exteriorColor,
  interiorColor,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [hasModelLoaded, setHasModelLoaded] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const modelRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const exteriorColorRef = useRef<string | undefined>(exteriorColor);
  const interiorColorRef = useRef<string | undefined>(interiorColor);

  useEffect(() => {
    exteriorColorRef.current = exteriorColor;
    interiorColorRef.current = interiorColor;
  }, [exteriorColor, interiorColor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BACKGROUND);
    sceneRef.current = scene;

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(SCENE_BACKGROUND, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    if ("physicallyCorrectLights" in renderer) {
      (renderer as any).physicallyCorrectLights = true;
    }

    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    controls.update();

    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight("#9fc6ff", "#08101f", 1.4);
    scene.add(hemi);

    const keyLight = new THREE.SpotLight(
      "#8dbbff",
      430,
      30,
      Math.PI / 5,
      0.35,
      1.1,
    );
    keyLight.position.set(-4.8, 7.2, 6.8);
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(
      "#ffffff",
      240,
      24,
      Math.PI / 6,
      0.4,
      1.2,
    );
    rimLight.position.set(5.5, 5.2, -5.8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.32, 160),
      new THREE.MeshStandardMaterial({
        color: "#071331",
        metalness: 0.84,
        roughness: 0.24,
      }),
    );
    floor.position.y = -0.56;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.95, 0.04, 12, 192),
      new THREE.MeshBasicMaterial({
        color: "#6eb7ff",
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.4;
    scene.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.9, 0.02, 8, 160),
      new THREE.MeshBasicMaterial({
        color: "#245b9d",
        transparent: true,
        opacity: 0.65,
      }),
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = -0.37;
    scene.add(innerRing);

    const clock = new THREE.Clock();
    let rafId: number | null = null;

    const animate = () => {
      const t = clock.getElapsedTime();

      if (modelRef.current) {
        modelRef.current.rotation.y = Math.sin(t * 0.25) * 0.06;
      }

      controls.update();
      renderer.render(scene, camera);

      rafId = requestAnimationFrame(animate);
    };

    const onResize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);

      renderer.setSize(nextWidth, nextHeight, false);

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();

      if (modelRef.current) {
        fitCameraToObject(modelRef.current, camera, controlsRef.current);
      }
    };

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", onResize);
    }

    animate();
    onResize();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", onResize);
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      controls.dispose();

      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }

      disposeObject3D(scene);
      renderer.dispose();

      modelRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;

    const resolvedPath = modelPath ?? model.modelPath ?? pathMap[model.id] ?? "";

    const removeCurrentModel = () => {
      if (!modelRef.current) return;

      threeScene.remove(modelRef.current);
      disposeObject3D(modelRef.current);
      modelRef.current = null;
    };

    removeCurrentModel();

    setHasModelLoaded(false);
    setProgress(0);
    setLoadError(null);

    if (!resolvedPath) {
      console.warn("CustomizationViewer: no GLB for model id", model.id);
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();

    loader.load(
      resolvedPath,
      (gltf) => {
        if (cancelled || !sceneRef.current) {
          disposeObject3D(gltf.scene);
          return;
        }

        const modelScene = gltf.scene;

        modelScene.updateMatrixWorld(true);

        const originalBox = new THREE.Box3().setFromObject(modelScene);
        const originalCenter = originalBox.getCenter(new THREE.Vector3());
        const originalSize = originalBox.getSize(new THREE.Vector3());

        const maxAxis = Math.max(
          originalSize.x,
          originalSize.y,
          originalSize.z,
        );

        const scale = maxAxis > 0 ? MODEL_TARGET_SIZE / maxAxis : 1;

        /**
         * 1. 把 GLB 模型自身中心移到原点
         * 2. 整体缩放
         * 3. 把模型底部放到展示台上
         */
        const centeredGroup = new THREE.Group();
        centeredGroup.add(modelScene);
        centeredGroup.position.set(
          -originalCenter.x,
          -originalCenter.y,
          -originalCenter.z,
        );

        const group = new THREE.Group();
        group.add(centeredGroup);
        group.scale.setScalar(scale);

        group.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(group);
        group.position.y = FLOOR_TOP_Y - scaledBox.min.y + MODEL_FLOOR_GAP;

        group.updateMatrixWorld(true);

        modelRef.current = group;
        sceneRef.current.add(group);

        applyColorsToScene(
          group,
          exteriorColorRef.current,
          interiorColorRef.current,
        );

        /**
         * 把车灯发光效果嵌入真实 m4car_emissive1 车灯 mesh。
         */
        applyEmbeddedCarLights(modelScene, originalBox);

        if (cameraRef.current) {
          fitCameraToObject(group, cameraRef.current, controlsRef.current);
        }

        setHasModelLoaded(true);
        setProgress(100);

        console.info("CustomizationViewer: loaded", {
          path: resolvedPath,
          originalSize,
          originalCenter,
          scale,
        });
      },
      (xhr) => {
        if (cancelled) return;

        if (xhr.loaded && xhr.total) {
          setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        if (cancelled) return;

        console.error("CustomizationViewer load error", err);
        setLoadError("Failed to load 3D model.");
        setHasModelLoaded(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [model.id, model.modelPath, modelPath]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyColorsToScene(modelRef.current, exteriorColor, interiorColor);
  }, [exteriorColor, interiorColor]);

  const resolvedPath = modelPath ?? model.modelPath ?? pathMap[model.id] ?? "";

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-[#050915]">
      <div ref={hostRef} className="h-full w-full" />

      {!resolvedPath && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">
          No 3D model available for this car. Add a <code>modelPath</code> to{" "}
          <code>data/models.json</code> or update the <code>pathMap</code>.
        </div>
      )}

      {resolvedPath && loadError && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-300">
          {loadError}
        </div>
      )}

      {resolvedPath && !loadError && !hasModelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-slate-300">
            Loading 3D model... {progress}%
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/15 bg-black/60 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
        3D viewport — change colors using the panel
      </div>
    </div>
  );
}

function fitCameraToObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls | null,
) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z, 1);

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

  /**
   * 让车真正撑满大 canvas：
   * 去掉原来的 size.z 深度补偿，否则相机会离车太远。
   */
  const fitHeightDistance =
    size.y / (2 * Math.tan(verticalFov / 2) * CAMERA_FILL_RATIO);

  const fitWidthDistance =
    size.x / (2 * Math.tan(horizontalFov / 2) * CAMERA_FILL_RATIO);

  const distance =
    Math.max(fitHeightDistance, fitWidthDistance) * CAMERA_PADDING;

  const target = new THREE.Vector3(
    center.x,
    center.y + size.y * 0.02,
    center.z,
  );

  camera.position.set(
    center.x,
    center.y + size.y * 0.12,
    center.z + distance,
  );

  camera.lookAt(target);

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance + maxSize * 10;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(target);
    controls.minDistance = Math.max(distance * 0.55, 1);
    controls.maxDistance = Math.max(distance * 2.2, maxSize * 2);
    controls.update();
  }
}

function applyEmbeddedCarLights(root: THREE.Object3D, rootBox: THREE.Box3) {
  removeExistingEmbeddedLightOverlays(root);

  root.updateMatrixWorld(true);

  const rootSize = rootBox.getSize(new THREE.Vector3());
  if (!isFiniteVector3(rootSize)) return;

  const lengthAxis: "x" | "z" = rootSize.x >= rootSize.z ? "x" : "z";
  const widthAxis: "x" | "z" = lengthAxis === "x" ? "z" : "x";

  const frontEdge =
    FRONT_SIGN === 1
      ? getAxisValue(rootBox.max, lengthAxis)
      : getAxisValue(rootBox.min, lengthAxis);

  const rearEdge =
    FRONT_SIGN === 1
      ? getAxisValue(rootBox.min, lengthAxis)
      : getAxisValue(rootBox.max, lengthAxis);

  const widthCenter =
    (getAxisValue(rootBox.min, widthAxis) +
      getAxisValue(rootBox.max, widthAxis)) /
    2;

  const totalLength = Math.abs(frontEdge - rearEdge);
  const totalWidth = Math.abs(
    getAxisValue(rootBox.max, widthAxis) -
      getAxisValue(rootBox.min, widthAxis),
  );
  const totalHeight = Math.abs(rootBox.max.y - rootBox.min.y);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!meshUsesRealLightMaterial(obj)) return;

    addEmbeddedOverlayToLightMesh({
      mesh: obj,
      root,
      rootBox,
      lengthAxis,
      widthAxis,
      frontEdge,
      rearEdge,
      widthCenter,
      totalLength,
      totalWidth,
      totalHeight,
    });
  });
}

function meshUsesRealLightMaterial(mesh: THREE.Mesh) {
  const meshName = (mesh.name || "").toLowerCase();

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  return materials.some((material) => {
    if (!material) return false;

    const materialName = ((material as any).name || "").toLowerCase();
    const combinedName = `${meshName} ${materialName}`;

    return (
      combinedName.includes(REAL_LIGHT_MATERIAL_NAME) ||
      materialName.includes("emissive1")
    );
  });
}

function addEmbeddedOverlayToLightMesh({
  mesh,
  root,
  rootBox,
  lengthAxis,
  widthAxis,
  frontEdge,
  rearEdge,
  widthCenter,
  totalLength,
  totalWidth,
  totalHeight,
}: {
  mesh: THREE.Mesh;
  root: THREE.Object3D;
  rootBox: THREE.Box3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  frontEdge: number;
  rearEdge: number;
  widthCenter: number;
  totalLength: number;
  totalWidth: number;
  totalHeight: number;
}) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as
    | THREE.BufferAttribute
    | undefined;

  if (!position || position.count < 3) return;

  const index = geometry.getIndex();

  const frontTriangles: number[] = [];
  const rearTriangles: number[] = [];

  const localA = new THREE.Vector3();
  const localB = new THREE.Vector3();
  const localC = new THREE.Vector3();
  const localCenter = new THREE.Vector3();

  const triangleCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const ia = getTriangleVertexIndex(index, triangleIndex, 0);
    const ib = getTriangleVertexIndex(index, triangleIndex, 1);
    const ic = getTriangleVertexIndex(index, triangleIndex, 2);

    if (
      ia < 0 ||
      ib < 0 ||
      ic < 0 ||
      ia >= position.count ||
      ib >= position.count ||
      ic >= position.count
    ) {
      continue;
    }

    localA.set(position.getX(ia), position.getY(ia), position.getZ(ia));
    localB.set(position.getX(ib), position.getY(ib), position.getZ(ib));
    localC.set(position.getX(ic), position.getY(ic), position.getZ(ic));

    if (
      !isFiniteVector3(localA) ||
      !isFiniteVector3(localB) ||
      !isFiniteVector3(localC)
    ) {
      continue;
    }

    localCenter.copy(localA).add(localB).add(localC).multiplyScalar(1 / 3);

    const rootPoint = toRootSpace(localCenter, mesh, root);
    if (!isFiniteVector3(rootPoint)) continue;

    const placement = classifyTrianglePlacement({
      rootPoint,
      rootBox,
      lengthAxis,
      widthAxis,
      frontEdge,
      rearEdge,
      widthCenter,
      totalLength,
      totalWidth,
      totalHeight,
    });

    if (placement === "front") {
      pushTriangle(frontTriangles, localA, localB, localC);
    } else if (placement === "rear") {
      pushTriangle(rearTriangles, localA, localB, localC);
    }
  }

  if (frontTriangles.length > 0) {
    createEmbeddedOverlayMesh({
      parent: mesh,
      name: "__embedded_front_light_overlay",
      positions: frontTriangles,
      color: "#ffffff",
      opacity: FRONT_LIGHT_OPACITY,
      power: FRONT_LIGHT_POWER,
    });
  }

  if (rearTriangles.length > 0) {
    createEmbeddedOverlayMesh({
      parent: mesh,
      name: "__embedded_rear_light_overlay",
      positions: rearTriangles,
      color: "#ff2b2b",
      opacity: REAR_LIGHT_OPACITY,
      power: REAR_LIGHT_POWER,
    });
  }

  enhanceOriginalLightMaterial(mesh);
}

function classifyTrianglePlacement({
  rootPoint,
  rootBox,
  lengthAxis,
  widthAxis,
  frontEdge,
  rearEdge,
  widthCenter,
  totalLength,
  totalWidth,
  totalHeight,
}: {
  rootPoint: THREE.Vector3;
  rootBox: THREE.Box3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  frontEdge: number;
  rearEdge: number;
  widthCenter: number;
  totalLength: number;
  totalWidth: number;
  totalHeight: number;
}): LightPlacement | null {
  const lengthValue = getAxisValue(rootPoint, lengthAxis);
  const widthValue = getAxisValue(rootPoint, widthAxis);

  const distFront = Math.abs(frontEdge - lengthValue);
  const distRear = Math.abs(lengthValue - rearEdge);

  const edgeThreshold = totalLength * EDGE_RATIO;
  const widthHalf = totalWidth / 2;
  const sideOffset = Math.abs(widthValue - widthCenter);
  const sideEnough = sideOffset >= widthHalf * SIDE_RATIO;

  const minY = rootBox.min.y + totalHeight * MIN_HEIGHT_RATIO;
  const maxY = rootBox.min.y + totalHeight * MAX_HEIGHT_RATIO;
  const heightOkay = rootPoint.y >= minY && rootPoint.y <= maxY;

  if (!sideEnough || !heightOkay) return null;

  if (distFront <= edgeThreshold && distFront < distRear) {
    return "front";
  }

  if (distRear <= edgeThreshold && distRear < distFront) {
    return "rear";
  }

  return null;
}

function createEmbeddedOverlayMesh({
  parent,
  name,
  positions,
  color,
  opacity,
  power,
}: {
  parent: THREE.Mesh;
  name: string;
  positions: number[];
  color: string;
  opacity: number;
  power: number;
}) {
  if (parent.children.some((child) => child.name === name)) return;

  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  const overlayMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  overlayMaterial.color.multiplyScalar(power);
  overlayMaterial.toneMapped = false;

  const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
  overlayMesh.name = name;
  overlayMesh.renderOrder = 100;
  overlayMesh.frustumCulled = false;
  overlayMesh.userData.__embeddedLightOverlay = true;

  parent.add(overlayMesh);
}

function enhanceOriginalLightMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.forEach((material) => {
    if (!material) return;

    const mat = material as any;
    const materialName = (mat.name || "").toLowerCase();

    if (
      !materialName.includes(REAL_LIGHT_MATERIAL_NAME) &&
      !materialName.includes("emissive1")
    ) {
      return;
    }

    if (mat.color) {
      try {
        mat.color.set("#f4f8ff");
      } catch {
        // ignore
      }
    }

    if ("emissive" in mat && mat.emissive) {
      try {
        mat.emissive.set("#ffffff");
        mat.emissiveIntensity = 1.8;
      } catch {
        // ignore
      }
    }

    mat.needsUpdate = true;
  });
}

function removeExistingEmbeddedLightOverlays(root: THREE.Object3D) {
  root.traverse((obj) => {
    const childrenToRemove = obj.children.filter(
      (child) => child.userData?.__embeddedLightOverlay,
    );

    childrenToRemove.forEach((child) => {
      obj.remove(child);
      disposeObject3D(child);
    });
  });
}

function toRootSpace(
  localPoint: THREE.Vector3,
  mesh: THREE.Mesh,
  root: THREE.Object3D,
) {
  const worldPoint = mesh.localToWorld(localPoint.clone());
  return root.worldToLocal(worldPoint);
}

function pushTriangle(
  target: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
) {
  target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function getTriangleVertexIndex(
  index: THREE.BufferAttribute | null,
  triangleIndex: number,
  corner: 0 | 1 | 2,
) {
  if (!index) {
    return triangleIndex * 3 + corner;
  }

  const value = index.getX(triangleIndex * 3 + corner);

  if (!Number.isFinite(value)) return -1;

  return Math.floor(value);
}

function getAxisValue(vector: THREE.Vector3, axis: "x" | "z") {
  return axis === "x" ? vector.x : vector.z;
}

function isFiniteVector3(vector: THREE.Vector3) {
  return (
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

function applyColorsToScene(
  group: THREE.Group,
  exterior?: string,
  interior?: string,
) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const meshName = (obj.name || "").toLowerCase();
    const materials = Array.isArray(obj.material)
      ? obj.material
      : [obj.material];

    materials.forEach((material) => {
      if (!material) return;

      const mat = material as any;

      if (!mat.color) return;

      const materialName = (mat.name || "").toLowerCase();
      const name = `${meshName} ${materialName}`;

      /**
       * 不改真实灯光材质颜色。
       */
      if (
        name.includes(REAL_LIGHT_MATERIAL_NAME) ||
        materialName.includes("emissive1")
      ) {
        return;
      }

      const isGlass =
        name.includes("glass") ||
        name.includes("windshield") ||
        name.includes("window") ||
        /transparent|glass/.test(mat.type || "");

      const isWheel =
        name.includes("wheel") ||
        name.includes("tyre") ||
        name.includes("tire") ||
        name.includes("rim");

      if (isGlass || isWheel) return;

      const isInterior =
        name.includes("interior") ||
        name.includes("seat") ||
        name.includes("leather") ||
        name.includes("dashboard") ||
        name.includes("steering");

      const isExterior =
        name.includes("paint") ||
        name.includes("body") ||
        name.includes("carpaint") ||
        name.includes("car_paint") ||
        name.includes("exterior") ||
        name.includes("bodywork") ||
        mat.metalness > 0.2;

      if (interior && isInterior) {
        try {
          mat.color.set(interior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }

        return;
      }

      if (exterior && isExterior) {
        try {
          mat.color.set(exterior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }

        return;
      }

      if (exterior && mat.roughness !== undefined && mat.roughness < 0.8) {
        try {
          mat.color.set(exterior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }
      }
    });
  });
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (child.geometry) {
      child.geometry.dispose();
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      const mat = material as any;

      Object.keys(mat).forEach((key) => {
        const value = mat[key];

        if (value && value.isTexture) {
          value.dispose();
        }
      });

      material.dispose();
    });
  });
}