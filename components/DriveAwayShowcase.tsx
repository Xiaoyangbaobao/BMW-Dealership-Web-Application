"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type DriveAwayShowcaseProps = {
  model: CarModel;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
};

const pathMap: Record<string, string> = {
  "bmw-m3-cs-touring": "/models/2025_bmw_m3_cs_touring.glb",
  "bmw-m4-competition": "/models/2025_bmw_m4_competition.glb",
  "bmw-m4-f82": "/models/bmw_m4_f82.glb",
  "bmw-m3-topaz": "/models/bmw_m3_sedan_topaz_blue_car.glb",
  "bmw-x3": "/models/bmw_x3_m40i.glb",
  "bmw-z8": "/models/bmw_z8__www.vecarz.com.glb",
};

const DRIFT_DURATION = 7.4;
const CAMERA_SETTLE_DURATION = 2.4;
const FINAL_REVEAL_TIME = DRIFT_DURATION + CAMERA_SETTLE_DURATION * 0.66;
const DRIFT_RADIUS = 5.1;

export default function DriveAwayShowcase({
  model,
  exteriorColor,
  interiorColor,
  wheelColor,
  wheelStyle,
}: DriveAwayShowcaseProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const resolvedPath = model.modelPath ?? pathMap[model.id] ?? "";
  const [status, setStatus] = useState("Preparing your BMW drift handoff...");
  const [isComplete, setIsComplete] = useState(false);
  const handoffStatus = resolvedPath ? status : "No 3D model is available for this handoff.";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setIsComplete(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050608");
    scene.fog = new THREE.Fog("#050608", 10, 38);

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 220);
    camera.position.set(0, 15.5, 0.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight("#c8d6e8", "#15100d", 1.45);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#fff7e8", 4.4);
    key.position.set(-6, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const garageFill = new THREE.SpotLight("#ffb15a", 340, 32, Math.PI / 4.8, 0.5, 1.1);
    garageFill.position.set(6, 5, -7);
    scene.add(garageFill);

    const headlightGlow = new THREE.PointLight("#8ecbff", 85, 13, 1.7);
    scene.add(headlightGlow);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshStandardMaterial({
        color: "#2a2824",
        metalness: 0.12,
        roughness: 0.68,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    addGarageDetails(scene);
    addParkingLines(scene);
    const tireMarks = createTireMarks(scene);
    const smoke = createSmokePuffs(scene);

    const carRoot = new THREE.Group();
    scene.add(carRoot);

    let disposed = false;
    let animationId = 0;
    let loadedCar: THREE.Group | null = null;
    let completionAnnounced = false;
    const loader = new GLTFLoader();

    if (resolvedPath) {
      loader.load(
        resolvedPath,
        (gltf) => {
          if (disposed) {
            disposeObject3D(gltf.scene);
            return;
          }

          const modelScene = gltf.scene;
          normalizeCarModel(modelScene, 6.2);
          applyDriveAwayColors(modelScene, exteriorColor, interiorColor, wheelColor, wheelStyle);
          modelScene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          carRoot.add(modelScene);
          loadedCar = modelScene;
          setStatus("Your customized BMW is ready to drift into the handoff bay.");
        },
        undefined,
        () => {
          if (!disposed) setStatus("Unable to load this BMW handoff animation.");
        },
      );
    }

    const clock = new THREE.Clock();
    const cameraTarget = new THREE.Vector3();
    const finalTarget = new THREE.Vector3(0.3, 1.05, 0);
    const finalCamera = new THREE.Vector3(-4.9, 2.15, 6.9);
    const overheadCamera = new THREE.Vector3(0, 15.6, 0.18);

    const animate = () => {
      const t = clock.getElapsedTime();
      const driftProgress = Math.min(t / DRIFT_DURATION, 1);
      const transitionProgress = smoothstep(
        THREE.MathUtils.clamp((t - DRIFT_DURATION) / CAMERA_SETTLE_DURATION, 0, 1),
      );
      const orbit = -Math.PI / 2 + driftProgress * Math.PI * 2.08;
      const driftX = Math.cos(orbit) * DRIFT_RADIUS;
      const driftZ = Math.sin(orbit) * DRIFT_RADIUS * 0.78;
      const finalX = 0;
      const finalZ = 0;
      const x = THREE.MathUtils.lerp(driftX, finalX, transitionProgress);
      const z = THREE.MathUtils.lerp(driftZ, finalZ, transitionProgress);
      const driftHeading = -orbit + Math.PI / 2 + 0.72 + Math.sin(t * 3.2) * 0.12;
      const finalHeading = Math.PI * 0.74;

      carRoot.position.set(x, 0, z);
      carRoot.rotation.y = lerpAngle(driftHeading, finalHeading, transitionProgress);
      carRoot.rotation.z = Math.sin(t * 3.5) * 0.045 * (1 - transitionProgress);

      if (loadedCar) {
        loadedCar.rotation.x = Math.sin(t * 4.2) * 0.012 * (1 - transitionProgress);
      }

      const smokeIntensity = 1 - transitionProgress;
      smoke.forEach((puff, index) => {
        const phase = (puff.userData.phase + t * 0.2) % 1;
        const trailAngle = orbit - phase * 1.65 - index * 0.025;
        puff.position.set(
          Math.cos(trailAngle) * (DRIFT_RADIUS + phase * 1.15),
          0.14 + phase * 1.25,
          Math.sin(trailAngle) * (DRIFT_RADIUS * 0.78 + phase * 0.95),
        );
        const scale = (1.4 + phase * 4.6) * smokeIntensity;
        puff.scale.setScalar(Math.max(scale, 0.001));
        const material = puff.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.34 * (1 - phase) * smokeIntensity);
      });

      tireMarks.forEach((mark, index) => {
        const material = mark.material as THREE.MeshBasicMaterial;
        material.opacity = 0.1 + Math.min(driftProgress * 1.5, 1) * (index === 0 ? 0.52 : 0.34);
      });

      headlightGlow.position.set(
        x + Math.sin(carRoot.rotation.y) * 2.8,
        0.72,
        z + Math.cos(carRoot.rotation.y) * 2.8,
      );
      headlightGlow.intensity = 65 + 45 * transitionProgress;

      const dynamicOverhead = overheadCamera.clone().add(new THREE.Vector3(x * 0.05, 0, z * 0.05));
      camera.position.copy(dynamicOverhead.lerp(finalCamera, transitionProgress));
      cameraTarget.copy(new THREE.Vector3(x, 0.22, z).lerp(finalTarget, transitionProgress));
      camera.lookAt(cameraTarget);

      if (!completionAnnounced && t >= FINAL_REVEAL_TIME) {
        completionAnnounced = true;
        setIsComplete(true);
        setStatus("Thanks for booking. Your BMW is staged and ready.");
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", resize);
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [model, resolvedPath, exteriorColor, interiorColor, wheelColor, wheelStyle]);

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-2xl border border-white/10 bg-[#050608]">
      <div ref={hostRef} className="h-[calc(100vh-96px)] min-h-[680px] w-full" />
      <div className="pointer-events-none absolute left-6 top-6 max-w-xl rounded-2xl border border-white/10 bg-black/55 p-5 shadow-2xl backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.28em] text-[#68a7ff]">Drive Away</p>
        <h1 className="mt-2 text-4xl font-bold text-white">{model.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{handoffStatus}</p>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-4 bottom-12 mx-auto max-w-3xl rounded-3xl border border-white/15 bg-black/55 px-7 py-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur transition duration-700 ${
          isComplete ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.36em] text-[#8cc8ff]">BMW Dealership</p>
        <h2 className="mt-3 text-4xl font-black uppercase tracking-[0.18em] text-white sm:text-6xl">
          Thanks for booking
        </h2>
        <p className="mt-3 text-sm text-slate-300">Your configured BMW is ready for the next step.</p>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 rounded-full border border-[#68a7ff]/40 bg-[#0b2344]/80 px-5 py-2 text-sm uppercase tracking-[0.22em] text-[#d9ecff] shadow-xl backdrop-blur">
        Cinematic drift handoff
      </div>
    </div>
  );
}

function addGarageDetails(scene: THREE.Scene) {
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 20),
    new THREE.MeshStandardMaterial({ color: "#15110d", roughness: 0.9 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5.6;
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  const columnMaterial = new THREE.MeshStandardMaterial({ color: "#c7c0af", roughness: 0.78 });
  [
    [-6.7, -4.9],
    [7.1, -4.4],
    [-7.4, 5.2],
    [6.8, 5.1],
  ].forEach(([x, z]) => {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 5.6, 28), columnMaterial);
    column.position.set(x, 2.75, z);
    column.castShadow = true;
    column.receiveShadow = true;
    scene.add(column);
  });

  const pipeMaterial = new THREE.MeshStandardMaterial({ color: "#6b3a2c", roughness: 0.58 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 15, 16), pipeMaterial);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 5.15, -6.9);
  scene.add(pipe);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 6),
    new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.85 }),
  );
  wall.position.set(0, 2.9, -9.8);
  scene.add(wall);
}

function addParkingLines(scene: THREE.Scene) {
  const lineMaterial = new THREE.MeshBasicMaterial({ color: "#d0a44a", transparent: true, opacity: 0.42 });
  [-7.2, 7.2].forEach((x) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 18), lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.012, 0);
    scene.add(line);
  });
}

function createTireMarks(scene: THREE.Scene) {
  return [
    { radius: DRIFT_RADIUS, thickness: 0.07, opacity: 0.58 },
    { radius: DRIFT_RADIUS - 0.48, thickness: 0.055, opacity: 0.38 },
    { radius: DRIFT_RADIUS + 0.44, thickness: 0.045, opacity: 0.28 },
  ].map(({ radius, thickness, opacity }) => {
    const mark = new THREE.Mesh(
      new THREE.TorusGeometry(radius, thickness, 10, 220),
      new THREE.MeshBasicMaterial({ color: "#090908", transparent: true, opacity }),
    );
    mark.scale.y = 0.78;
    mark.rotation.x = Math.PI / 2;
    mark.position.y = 0.026;
    scene.add(mark);
    return mark;
  });
}

function createSmokePuffs(scene: THREE.Scene) {
  return Array.from({ length: 36 }, (_, index) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.38 + (index % 5) * 0.07, 20, 14),
      new THREE.MeshBasicMaterial({
        color: "#cfd6dc",
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    puff.userData.phase = index / 36;
    scene.add(puff);
    return puff;
  });
}

function normalizeCarModel(object: THREE.Object3D, targetSize: number) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z, 1);
  const scale = targetSize / maxAxis;

  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  object.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(object);
  object.position.y += -normalizedBox.min.y;
  object.rotation.y = Math.PI / 2;
}

function applyDriveAwayColors(
  root: THREE.Object3D,
  exteriorColor = "#1f2937",
  interiorColor = "#0b1220",
  wheelColor = "#cfd6df",
  wheelStyle: WheelStyle = "classic",
) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const meshName = `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (!mat.color) return;

      if (isWheelLike(meshName)) {
        if (meshName.includes("tire") || meshName.includes("tyre")) {
          mat.color.set("#050609");
        } else {
          mat.color.set(wheelColor);
          mat.metalness = wheelStyle === "sport" ? 0.95 : 0.82;
          mat.roughness = wheelStyle === "aero" ? 0.18 : 0.32;
        }
      } else if (isInteriorLike(meshName)) {
        mat.color.set(interiorColor);
      } else if (isExteriorLike(meshName, mat)) {
        mat.color.set(exteriorColor);
      }

      mat.needsUpdate = true;
    });
  });
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function lerpAngle(start: number, end: number, alpha: number) {
  const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  return start + delta * alpha;
}

function getMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getMaterialNames(mesh: THREE.Mesh) {
  return getMaterials(mesh)
    .map((material) => (material as any)?.name || "")
    .join(" ");
}

function isWheelLike(name: string) {
  return name.includes("wheel") || name.includes("rim") || name.includes("tire") || name.includes("tyre");
}

function isInteriorLike(name: string) {
  return name.includes("interior") || name.includes("seat") || name.includes("leather") || name.includes("dashboard");
}

function isExteriorLike(name: string, material: any) {
  return (
    name.includes("paint") ||
    name.includes("body") ||
    name.includes("exterior") ||
    name.includes("bodywork") ||
    (material.metalness !== undefined && material.metalness > 0.2)
  );
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.geometry?.dispose();
    getMaterials(child).forEach((material) => {
      if (!material) return;
      const mat = material as any;
      Object.keys(mat).forEach((key) => {
        const value = mat[key];
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}
