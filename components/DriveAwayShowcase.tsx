"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type DriveAwayShowcaseProps = {
  model: CarModel;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
};

const DRIFT_DURATION = 7.4;
const CAMERA_SETTLE_DURATION = 2.4;
const FINAL_REVEAL_TIME = DRIFT_DURATION + CAMERA_SETTLE_DURATION;
const DRIFT_RADIUS = 2.8;

export default function DriveAwayShowcase({
  model,
  exteriorColor = "#1f2937",
  interiorColor = "#0b1220",
  wheelColor = "#cfd6df",
  wheelStyle = "classic",
}: DriveAwayShowcaseProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const handoffStatus = isComplete
    ? "Thanks for booking. Your BMW is staged and ready."
    : "Your customized BMW is ready to drift into the handoff bay.";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setIsComplete(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050608");
    scene.fog = new THREE.Fog("#050608", 12, 36);

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 220);
    camera.position.set(0, 8.6, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight("#c8d6e8", "#15100d", 1.35);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#fff7e8", 4.1);
    key.position.set(-5, 10, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const sideFill = new THREE.DirectionalLight("#ffd39a", 1.7);
    sideFill.position.set(5, 5, -6);
    scene.add(sideFill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 16),
      new THREE.MeshStandardMaterial({
        color: "#2a2824",
        metalness: 0.08,
        roughness: 0.72,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    addGarageDetails(scene);
    addParkingLines(scene);
    const tireMarks = createTireMarks(scene);

    const carRoot = createShowcaseCar(exteriorColor, interiorColor, wheelColor, wheelStyle);
    scene.add(carRoot);

    let animationId = 0;
    let completionAnnounced = false;
    const clock = new THREE.Clock();
    const cameraTarget = new THREE.Vector3();
    const finalTarget = new THREE.Vector3(0.05, 0.75, 0);
    const finalCamera = new THREE.Vector3(-3.05, 1.28, 4.15);
    const overheadCamera = new THREE.Vector3(0, 8.6, 0.1);

    const animate = () => {
      const t = clock.getElapsedTime();
      const driftProgress = Math.min(t / DRIFT_DURATION, 1);
      const transitionProgress = smoothstep(
        THREE.MathUtils.clamp((t - DRIFT_DURATION) / CAMERA_SETTLE_DURATION, 0, 1),
      );
      const orbit = -Math.PI / 2 + driftProgress * Math.PI * 2.08;
      const driftX = Math.cos(orbit) * DRIFT_RADIUS;
      const driftZ = Math.sin(orbit) * DRIFT_RADIUS * 0.78;
      const x = THREE.MathUtils.lerp(driftX, 0, transitionProgress);
      const z = THREE.MathUtils.lerp(driftZ, 0, transitionProgress);
      const driftHeading = -orbit + Math.PI / 2 + 0.72 + Math.sin(t * 3.2) * 0.12;
      const finalHeading = Math.PI * 0.74;

      carRoot.position.set(x, 0, z);
      carRoot.rotation.y = lerpAngle(driftHeading, finalHeading, transitionProgress);
      carRoot.rotation.z = Math.sin(t * 3.5) * 0.035 * (1 - transitionProgress);

      tireMarks.forEach((mark, index) => {
        const material = mark.material as THREE.MeshBasicMaterial;
        material.opacity = 0.1 + Math.min(driftProgress * 1.5, 1) * (index === 0 ? 0.5 : 0.3);
      });

      const dynamicOverhead = overheadCamera.clone().add(new THREE.Vector3(x * 0.08, 0, z * 0.08));
      camera.position.copy(dynamicOverhead.lerp(finalCamera, transitionProgress));
      cameraTarget.copy(new THREE.Vector3(x, 0.32, z).lerp(finalTarget, transitionProgress));
      camera.lookAt(cameraTarget);

      if (!completionAnnounced && t >= FINAL_REVEAL_TIME) {
        completionAnnounced = true;
        setIsComplete(true);
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
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [exteriorColor, interiorColor, wheelColor, wheelStyle]);

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-2xl border border-white/10 bg-[#050608]">
      <div ref={hostRef} className="h-[calc(100vh-96px)] min-h-[680px] w-full" />
      <div className="pointer-events-none absolute left-6 top-6 max-w-xl rounded-2xl border border-white/10 bg-black/55 p-5 shadow-2xl backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.28em] text-[#68a7ff]">Drive Away</p>
        <h1 className="mt-2 text-4xl font-bold text-white">{model.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{handoffStatus}</p>
      </div>
      <div
        className={`pointer-events-none absolute right-6 top-6 max-w-md rounded-3xl border border-white/15 bg-black/60 px-6 py-5 text-right shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur transition duration-700 ${
          isComplete ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.36em] text-[#8cc8ff]">BMW Dealership</p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-white sm:text-4xl">
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

function createShowcaseCar(
  exteriorColor: string,
  interiorColor: string,
  wheelColor: string,
  wheelStyle: WheelStyle,
) {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: exteriorColor,
    metalness: 0.58,
    roughness: 0.24,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: interiorColor,
    metalness: 0.08,
    roughness: 0.18,
  });
  const tire = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.62 });
  const rim = new THREE.MeshStandardMaterial({
    color: wheelColor,
    metalness: wheelStyle === "sport" ? 0.95 : 0.75,
    roughness: wheelStyle === "aero" ? 0.18 : 0.28,
  });
  const light = new THREE.MeshStandardMaterial({ color: "#f8fbff", emissive: "#9dc9ff", emissiveIntensity: 0.7 });
  const tail = new THREE.MeshStandardMaterial({ color: "#c5162e", emissive: "#5c0712", emissiveIntensity: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 3.55), paint);
  body.position.y = 0.48;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 0.82), paint);
  nose.position.set(0, 0.42, 1.85);
  nose.castShadow = true;
  car.add(nose);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.48, 1.1), glass);
  cabin.position.set(0, 0.92, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.76), paint);
  roof.position.set(0, 1.22, -0.28);
  roof.castShadow = true;
  car.add(roof);

  const frontLightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), light);
  frontLightLeft.position.set(-0.39, 0.5, 2.28);
  car.add(frontLightLeft);

  const frontLightRight = frontLightLeft.clone();
  frontLightRight.position.x = 0.39;
  car.add(frontLightRight);

  const tailLightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.06), tail);
  tailLightLeft.position.set(-0.42, 0.5, -1.86);
  car.add(tailLightLeft);

  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.x = 0.42;
  car.add(tailLightRight);

  [
    [-0.82, 0.34, 1.12],
    [0.82, 0.34, 1.12],
    [-0.82, 0.34, -1.15],
    [0.82, 0.34, -1.15],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    const tireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 32), tire);
    tireMesh.rotation.z = Math.PI / 2;
    tireMesh.castShadow = true;
    wheel.add(tireMesh);

    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.235, 24), rim);
    rimMesh.rotation.z = Math.PI / 2;
    rimMesh.castShadow = true;
    wheel.add(rimMesh);

    wheel.position.set(x, y, z);
    car.add(wheel);
  });

  return car;
}

function addGarageDetails(scene: THREE.Scene) {
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 16),
    new THREE.MeshStandardMaterial({ color: "#15110d", roughness: 0.9 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5.6;
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  const columnMaterial = new THREE.MeshStandardMaterial({ color: "#c7c0af", roughness: 0.78 });
  [
    [-5.4, -3.9],
    [5.8, -3.5],
    [-5.9, 4.2],
    [5.5, 4.2],
  ].forEach(([x, z]) => {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 5.6, 28), columnMaterial);
    column.position.set(x, 2.75, z);
    column.castShadow = true;
    column.receiveShadow = true;
    scene.add(column);
  });

  const pipeMaterial = new THREE.MeshStandardMaterial({ color: "#6b3a2c", roughness: 0.58 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 11.5, 16), pipeMaterial);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 5.15, -5.5);
  scene.add(pipe);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 6),
    new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.85 }),
  );
  wall.position.set(0, 2.9, -7.8);
  scene.add(wall);
}

function addParkingLines(scene: THREE.Scene) {
  const lineMaterial = new THREE.MeshBasicMaterial({ color: "#d0a44a", transparent: true, opacity: 0.42 });
  [-5.8, 5.8].forEach((x) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 14), lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.012, 0);
    scene.add(line);
  });
}

function createTireMarks(scene: THREE.Scene) {
  return [
    { radius: DRIFT_RADIUS, thickness: 0.065, opacity: 0.58 },
    { radius: DRIFT_RADIUS - 0.4, thickness: 0.05, opacity: 0.36 },
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
