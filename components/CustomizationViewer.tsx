"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type Props = {
  model: CarModel;
  modelPath?: string;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
  doorsOpen?: boolean;
  windowsDown?: boolean;
  lightsOn?: boolean;
  wheelFocusNonce?: number;
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
const MODEL_TARGET_SIZE = 9.6;

/**
 * 相机距离系数。
 * 数值越小，车越大。
 */
const CAMERA_PADDING = 0.46;

/**
 * 车在画面里的填充比例。
 * 数值越大，车越撑满画布。
 */
const CAMERA_FILL_RATIO = 1.18;

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
  wheelColor,
  wheelStyle = "classic",
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
  wheelFocusNonce = 0,
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
  const wheelColorRef = useRef<string | undefined>(wheelColor);
  const wheelStyleRef = useRef<WheelStyle>(wheelStyle);
  const doorsOpenRef = useRef(doorsOpen);
  const windowsDownRef = useRef(windowsDown);
  const lightsOnRef = useRef(lightsOn);
  const previousInteriorColorRef = useRef<string | undefined>(interiorColor);
  const previousWheelColorRef = useRef<string | undefined>(wheelColor);
  const previousWheelStyleRef = useRef<WheelStyle>(wheelStyle);
  const previousWheelFocusNonceRef = useRef(wheelFocusNonce);

  useEffect(() => {
    exteriorColorRef.current = exteriorColor;
    interiorColorRef.current = interiorColor;
    wheelColorRef.current = wheelColor;
    wheelStyleRef.current = wheelStyle;
    doorsOpenRef.current = doorsOpen;
    windowsDownRef.current = windowsDown;
    lightsOnRef.current = lightsOn;
  }, [exteriorColor, interiorColor, wheelColor, wheelStyle, doorsOpen, windowsDown, lightsOn]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BACKGROUND);
    sceneRef.current = scene;

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(22, width / height, 0.1, 1000);
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
        applyDoorState(group, doorsOpenRef.current);
        applyWindowState(group, windowsDownRef.current);
        applyWheelCustomization(group, wheelColorRef.current, wheelStyleRef.current);

        /**
         * 把车灯发光效果嵌入真实 m4car_emissive1 车灯 mesh，并用可控光源补强。
         */
        applyEmbeddedCarLights(modelScene, originalBox);
        setEmbeddedLightVisibility(group, lightsOnRef.current);
        applySimulatedHeadlights(group, lightsOnRef.current);

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

    if (interiorColor && previousInteriorColorRef.current !== interiorColor) {
      focusCameraOnInterior(modelRef.current, cameraRef.current, controlsRef.current);
    }

    previousInteriorColorRef.current = interiorColor;
  }, [exteriorColor, interiorColor]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyWheelCustomization(modelRef.current, wheelColor, wheelStyle);

    const shouldFocusWheels =
      previousWheelColorRef.current !== wheelColor ||
      previousWheelStyleRef.current !== wheelStyle ||
      previousWheelFocusNonceRef.current !== wheelFocusNonce;

    if (shouldFocusWheels) {
      focusCameraOnWheels(modelRef.current, cameraRef.current, controlsRef.current);
    }

    previousWheelColorRef.current = wheelColor;
    previousWheelStyleRef.current = wheelStyle;
    previousWheelFocusNonceRef.current = wheelFocusNonce;
  }, [wheelColor, wheelStyle, wheelFocusNonce]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyDoorState(modelRef.current, doorsOpen);

    if (doorsOpen) {
      focusCameraOnDoors(modelRef.current, cameraRef.current, controlsRef.current);
    }
  }, [doorsOpen]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyWindowState(modelRef.current, windowsDown);
  }, [windowsDown]);

  useEffect(() => {
    if (!modelRef.current) return;

    setEmbeddedLightVisibility(modelRef.current, lightsOn);
    applySimulatedHeadlights(modelRef.current, lightsOn);

    if (lightsOn) {
      focusCameraOnLights(modelRef.current, cameraRef.current, controlsRef.current);
    }
  }, [lightsOn]);

  const resolvedPath = modelPath ?? model.modelPath ?? pathMap[model.id] ?? "";

  return (
    <div className="relative h-full min-h-[calc(100vh-96px)] w-full overflow-hidden bg-[#050915]">
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
        3D viewport — customize paint, wheels, cabin, doors, windows, and lights
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

  const box = getCleanWorldBox(object);
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


type CarMetrics = {
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  lengthMin: number;
  lengthMax: number;
  widthMin: number;
  widthMax: number;
};

function getCarMetrics(group: THREE.Group): CarMetrics {
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const lengthAxis: "x" | "z" = size.x >= size.z ? "x" : "z";
  const widthAxis: "x" | "z" = lengthAxis === "x" ? "z" : "x";

  return {
    box,
    size,
    center,
    lengthAxis,
    widthAxis,
    lengthMin: getAxisValue(box.min, lengthAxis),
    lengthMax: getAxisValue(box.max, lengthAxis),
    widthMin: getAxisValue(box.min, widthAxis),
    widthMax: getAxisValue(box.max, widthAxis),
  };
}

function moveCameraTo(
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
  position: THREE.Vector3,
  target: THREE.Vector3,
  minDistance = 0.8,
) {
  if (!camera) return;

  camera.position.copy(position);
  camera.lookAt(target);
  camera.near = 0.01;
  camera.far = Math.max(position.distanceTo(target) * 10, 100);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(target);
    controls.minDistance = minDistance;
    controls.maxDistance = Math.max(position.distanceTo(target) * 2.5, 6);
    controls.update();
  }
}

function focusCameraOnWheels(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const frontLength = metrics.lengthMin + length * 0.68;
  const sideWidth = metrics.widthMax;
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.24, metrics.center.z);

  setAxisValue(target, metrics.lengthAxis, frontLength);
  setAxisValue(target, metrics.widthAxis, sideWidth);

  const position = target.clone();
  setAxisValue(position, metrics.lengthAxis, frontLength + length * 0.08);
  setAxisValue(position, metrics.widthAxis, sideWidth + width * 1.15);
  position.y += metrics.size.y * 0.1;

  moveCameraTo(camera, controls, position, target, 0.6);
}

function focusCameraOnInterior(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.55, metrics.center.z);
  setAxisValue(target, metrics.lengthAxis, metrics.lengthMin + length * 0.52);

  const position = target.clone();
  setAxisValue(position, metrics.lengthAxis, getAxisValue(target, metrics.lengthAxis) - length * 0.18);
  setAxisValue(position, metrics.widthAxis, getAxisValue(target, metrics.widthAxis) + width * 0.18);
  position.y += metrics.size.y * 0.06;

  moveCameraTo(camera, controls, position, target, 0.25);
}

function focusCameraOnDoors(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.48, metrics.center.z);
  setAxisValue(target, metrics.widthAxis, metrics.widthMax);

  const position = target.clone();
  setAxisValue(position, metrics.widthAxis, metrics.widthMax + width * 1.35);
  position.y += metrics.size.y * 0.15;

  moveCameraTo(camera, controls, position, target, 0.8);
}

function focusCameraOnLights(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.44, metrics.center.z);
  const front = FRONT_SIGN === 1 ? metrics.lengthMax : metrics.lengthMin;
  setAxisValue(target, metrics.lengthAxis, front);

  const position = target.clone();
  setAxisValue(
    position,
    metrics.lengthAxis,
    front + (FRONT_SIGN === 1 ? length * 0.85 : -length * 0.85),
  );
  position.y += metrics.size.y * 0.1;

  moveCameraTo(camera, controls, position, target, 0.7);
}

function applyWheelCustomization(
  group: THREE.Group,
  color = "#cfd6df",
  style: WheelStyle = "classic",
) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
    const isWheel =
      name.includes("wheel") ||
      name.includes("rim") ||
      name.includes("alloy") ||
      name.includes("tyre") ||
      name.includes("tire");

    if (!isWheel) return;

    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (!mat.color) return;

      if (name.includes("tyre") || name.includes("tire")) {
        mat.color.set("#050609");
        mat.roughness = Math.max(mat.roughness ?? 0.7, 0.7);
      } else {
        mat.color.set(color);
        mat.metalness = Math.max(mat.metalness ?? 0.75, 0.75);
        mat.roughness = Math.min(mat.roughness ?? 0.32, 0.38);
      }

      mat.needsUpdate = true;
    });
  });

  removeCustomChildren(group, "__custom_wheel_proxy");
  addSimulatedWheelSet(group, color, style);
}

function addSimulatedWheelSet(group: THREE.Group, color: string, style: WheelStyle) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const radius = Math.max(Math.min(metrics.size.y * 0.18, length * 0.075), 0.32);
  const tube = radius * 0.08;
  const y = metrics.box.min.y + radius * 1.08;
  const lengthPositions = [metrics.lengthMin + length * 0.26, metrics.lengthMin + length * 0.74];
  const widthPositions = [metrics.widthMin - width * 0.012, metrics.widthMax + width * 0.012];

  lengthPositions.forEach((lengthPos) => {
    widthPositions.forEach((widthPos) => {
      const wheel = new THREE.Group();
      wheel.name = "__custom_wheel_proxy";

      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(radius, radius * 0.18, 18, 72),
        new THREE.MeshStandardMaterial({ color: "#050609", roughness: 0.62, metalness: 0.18 }),
      );
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.58, tube, 14, 64),
        new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.86 }),
      );
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.18, radius * 0.22, radius * 0.1, 32),
        new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.9 }),
      );

      orientWheelPart(tire, metrics.widthAxis);
      orientWheelPart(rim, metrics.widthAxis);
      orientWheelPart(hub, metrics.widthAxis);

      wheel.add(tire, rim, hub);
      addWheelSpokes(wheel, radius, color, style, metrics.widthAxis);

      wheel.position.set(metrics.center.x, y, metrics.center.z);
      setAxisValue(wheel.position, metrics.lengthAxis, lengthPos);
      setAxisValue(wheel.position, metrics.widthAxis, widthPos);
      attachWorldObject(group, wheel);
    });
  });
}

function addWheelSpokes(
  wheel: THREE.Group,
  radius: number,
  color: string,
  style: WheelStyle,
  widthAxis: "x" | "z",
) {
  if (style === "aero") {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.48, radius * 0.52, radius * 0.055, 48),
      new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.82 }),
    );
    orientWheelPart(disc, widthAxis);
    wheel.add(disc);
    return;
  }

  const count = style === "sport" ? 10 : 14;
  const spokeWidth = style === "sport" ? radius * 0.045 : radius * 0.028;

  for (let index = 0; index < count; index += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(spokeWidth, radius * 0.82, radius * 0.045),
      new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.9 }),
    );

    spoke.rotation.z = (Math.PI * 2 * index) / count;
    if (widthAxis === "x") {
      spoke.rotation.y = Math.PI / 2;
    }

    wheel.add(spoke);
  }
}

function orientWheelPart(object: THREE.Object3D, widthAxis: "x" | "z") {
  if (widthAxis === "x") {
    object.rotation.y = Math.PI / 2;
  }
}

function applyDoorState(group: THREE.Group, open: boolean) {
  removeCustomChildren(group, "__custom_door_proxy");

  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
    if (!name.includes("door")) return;

    if (!obj.userData.__customOriginalRotation) {
      obj.userData.__customOriginalRotation = obj.rotation.clone();
    }

    const originalRotation = obj.userData.__customOriginalRotation as THREE.Euler;
    obj.rotation.copy(originalRotation);
    if (open) {
      obj.rotation.y += name.includes("right") || name.includes("passenger") ? -0.42 : 0.42;
    }
  });

  if (open) {
    addSimulatedOpenDoors(group);
  }
}

function addSimulatedOpenDoors(group: THREE.Group) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const doorLength = length * 0.28;
  const doorHeight = metrics.size.y * 0.38;
  const doorY = metrics.box.min.y + metrics.size.y * 0.43;
  const doorCenterLength = metrics.lengthMin + length * 0.48;

  [metrics.widthMin, metrics.widthMax].forEach((sideWidth, index) => {
    const direction = index === 0 ? -1 : 1;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorLength, doorHeight, 0.05),
      new THREE.MeshStandardMaterial({
        color: "#10233f",
        metalness: 0.72,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9,
      }),
    );

    door.name = "__custom_door_proxy";
    door.position.set(metrics.center.x, doorY, metrics.center.z);
    setAxisValue(door.position, metrics.lengthAxis, doorCenterLength + length * 0.08 * direction);
    setAxisValue(door.position, metrics.widthAxis, sideWidth + width * 0.22 * direction);

    if (metrics.widthAxis === "x") {
      door.rotation.y = Math.PI / 2 + direction * 0.72;
    } else {
      door.rotation.y = direction * 0.72;
    }

    attachWorldObject(group, door);
  });
}

function applyWindowState(group: THREE.Group, down: boolean) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
    const isGlass =
      name.includes("window") ||
      name.includes("glass") ||
      name.includes("windshield") ||
      name.includes("windscreen");

    if (!isGlass) return;

    if (!obj.userData.__customOriginalPosition) {
      obj.userData.__customOriginalPosition = obj.position.clone();
    }

    const originalPosition = obj.userData.__customOriginalPosition as THREE.Vector3;
    obj.position.copy(originalPosition);
    if (down && name.includes("window")) {
      obj.position.y -= 0.28;
    }

    getMaterials(obj).forEach((material) => {
      const mat = material as any;

      if (mat.opacity !== undefined) {
        if (mat.userData && mat.userData.__customOriginalOpacity === undefined) {
          mat.userData.__customOriginalOpacity = mat.opacity;
        }

        mat.transparent = true;
        mat.opacity = down ? 0.16 : (mat.userData?.__customOriginalOpacity ?? mat.opacity);
        mat.depthWrite = !down;
      }

      mat.needsUpdate = true;
    });
  });
}

function applySimulatedHeadlights(group: THREE.Group, on: boolean) {
  removeCustomChildren(group, "__custom_headlight_proxy");
  if (!on) return;

  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const front = FRONT_SIGN === 1 ? metrics.lengthMax : metrics.lengthMin;
  const lightY = metrics.box.min.y + metrics.size.y * 0.43;
  const lightWidths = [metrics.widthMin + width * 0.28, metrics.widthMax - width * 0.28];

  lightWidths.forEach((widthPos) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(width * 0.035, 0.08), 24, 12),
      new THREE.MeshBasicMaterial({ color: "#f4f8ff", transparent: true, opacity: 0.92 }),
    );
    bulb.name = "__custom_headlight_proxy";
    bulb.position.set(metrics.center.x, lightY, metrics.center.z);
    setAxisValue(bulb.position, metrics.lengthAxis, front + (FRONT_SIGN === 1 ? 0.03 : -0.03));
    setAxisValue(bulb.position, metrics.widthAxis, widthPos);
    attachWorldObject(group, bulb);

    const glow = new THREE.PointLight("#eaf6ff", 3.8, width * 1.8, 1.1);
    glow.name = "__custom_headlight_proxy";
    glow.position.copy(bulb.position);
    attachWorldObject(group, glow);

    const beam = new THREE.SpotLight("#dff1ff", 18, length * 2.4, Math.PI / 6, 0.42, 1);
    beam.name = "__custom_headlight_proxy";
    beam.position.copy(bulb.position);
    const target = new THREE.Object3D();
    target.name = "__custom_headlight_proxy";
    target.position.copy(bulb.position);
    setAxisValue(target.position, metrics.lengthAxis, front + (FRONT_SIGN === 1 ? length : -length));
    attachWorldObject(group, beam);
    attachWorldObject(group, target);
    beam.target = target;

    const visibleBeam = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width * 0.16, 0.35), length * 0.9, 36, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#dff1ff",
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    visibleBeam.name = "__custom_headlight_proxy";
    visibleBeam.position.copy(bulb.position);
    setAxisValue(
      visibleBeam.position,
      metrics.lengthAxis,
      front + (FRONT_SIGN === 1 ? length * 0.33 : -length * 0.33),
    );

    if (metrics.lengthAxis === "x") {
      visibleBeam.rotation.z = FRONT_SIGN === 1 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      visibleBeam.rotation.x = FRONT_SIGN === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    attachWorldObject(group, visibleBeam);
  });
}

function setEmbeddedLightVisibility(group: THREE.Group, visible: boolean) {
  group.traverse((obj) => {
    if (obj.userData?.__embeddedLightOverlay) {
      obj.visible = visible;
    }

    if (obj instanceof THREE.Mesh && meshUsesRealLightMaterial(obj)) {
      getMaterials(obj).forEach((material) => {
        const mat = material as any;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = visible ? 1.8 : 0.15;
        }
        mat.needsUpdate = true;
      });
    }
  });
}


function attachWorldObject(parent: THREE.Group, object: THREE.Object3D) {
  const scene = parent.parent;

  if (scene) {
    scene.add(object);
    parent.attach(object);
  } else {
    parent.add(object);
  }
}

function removeCustomChildren(parent: THREE.Object3D, name: string) {
  const toRemove: THREE.Object3D[] = [];

  parent.traverse((obj) => {
    obj.children.forEach((child) => {
      if (child.name === name) {
        toRemove.push(child);
      }
    });
  });

  toRemove.forEach((child) => {
    child.parent?.remove(child);
    disposeObject3D(child);
  });
}

function getMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getMaterialNames(mesh: THREE.Mesh) {
  return getMaterials(mesh)
    .map((material) => (material as any)?.name || "")
    .join(" ");
}

function setAxisValue(vector: THREE.Vector3, axis: "x" | "z", value: number) {
  if (axis === "x") {
    vector.x = value;
  } else {
    vector.z = value;
  }
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