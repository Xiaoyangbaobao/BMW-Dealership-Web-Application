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
  const handoffStatus = resolvedPath ? status : "No 3D model is available for this handoff.";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020711");
    scene.fog = new THREE.Fog("#020711", 12, 34);

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 200);
    camera.position.set(0, 4.2, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight("#f2f7ff", "#101827", 2.2);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#ffffff", 3.6);
    key.position.set(-5, 8, 8);
    scene.add(key);

    const rim = new THREE.SpotLight("#72b7ff", 260, 38, Math.PI / 5, 0.45, 1.1);
    rim.position.set(8, 5, -8);
    scene.add(rim);

    const road = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 160),
      new THREE.MeshStandardMaterial({
        color: "#071225",
        metalness: 0.55,
        roughness: 0.36,
      }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.06;
    scene.add(road);

    const skidRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.35, 0.035, 8, 180),
      new THREE.MeshBasicMaterial({ color: "#88c7ff", transparent: true, opacity: 0.62 }),
    );
    skidRing.rotation.x = Math.PI / 2;
    skidRing.position.y = 0.02;
    scene.add(skidRing);

    const smoke = Array.from({ length: 18 }, (_, index) => {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 + (index % 4) * 0.035, 18, 12),
        new THREE.MeshBasicMaterial({
          color: "#dce8f6",
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      puff.userData.phase = index / 18;
      scene.add(puff);
      return puff;
    });

    const carRoot = new THREE.Group();
    scene.add(carRoot);

    let disposed = false;
    let animationId = 0;
    let loadedCar: THREE.Group | null = null;
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
          normalizeCarModel(modelScene, 4.4);
          applyDriveAwayColors(modelScene, exteriorColor, interiorColor, wheelColor, wheelStyle);
          carRoot.add(modelScene);
          loadedCar = modelScene;
          setStatus("Your customized BMW is ready to drive away.");
        },
        undefined,
        () => {
          if (!disposed) setStatus("Unable to load this BMW handoff animation.");
        },
      );
    }

    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      const orbit = t * 0.72;
      const driftRadius = 3.55;
      const x = Math.cos(orbit) * driftRadius;
      const z = Math.sin(orbit) * driftRadius * 0.58;
      const heading = -orbit + Math.PI / 2;
      const slipAngle = Math.sin(t * 2.3) * 0.22 + 0.46;

      carRoot.position.set(x, 0, z);
      carRoot.rotation.y = heading + slipAngle;
      carRoot.rotation.z = Math.sin(t * 2.1) * 0.035;

      if (loadedCar) {
        loadedCar.rotation.x = Math.sin(t * 3.1) * 0.01;
      }

      smoke.forEach((puff, index) => {
        const phase = (puff.userData.phase + (t * 0.14)) % 1;
        const angle = orbit - phase * 1.4 - index * 0.04;
        puff.position.set(
          Math.cos(angle) * (driftRadius + phase * 1.8),
          0.18 + phase * 0.7,
          Math.sin(angle) * (driftRadius * 0.58 + phase * 1.2),
        );
        const scale = 0.65 + phase * 2.2;
        puff.scale.setScalar(scale);
        const material = puff.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.22 * (1 - phase));
      });

      skidRing.rotation.z = t * 0.12;
      camera.position.lerp(new THREE.Vector3(x * 0.22, 3.4, 10.2 + z * 0.18), 0.035);
      camera.lookAt(carRoot.position.x, 0.9, carRoot.position.z);
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
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-2xl border border-white/10 bg-[#020711]">
      <div ref={hostRef} className="h-[calc(100vh-96px)] min-h-[680px] w-full" />
      <div className="pointer-events-none absolute left-6 top-6 max-w-xl rounded-2xl border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.28em] text-[#68a7ff]">Drive Away</p>
        <h1 className="mt-2 text-4xl font-bold text-white">{model.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{handoffStatus}</p>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 rounded-full border border-[#68a7ff]/40 bg-[#0b2344]/80 px-5 py-2 text-sm uppercase tracking-[0.22em] text-[#d9ecff] shadow-xl backdrop-blur">
        Drift handoff animation
      </div>
    </div>
  );
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
