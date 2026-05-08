"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function createBmwTextTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) return null;

  context.fillStyle = "#f4f6f8";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#111827";
  context.font = "700 180px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("BMW", canvas.width / 2, canvas.height / 2 + 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function replaceSharptrnWithBmw(root: THREE.Object3D) {
  const bmwTexture = createBmwTextTexture();
  if (!bmwTexture) return;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const objectName = object.name.toLowerCase();
    const materialList = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materialList.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;

      const materialName = material.name.toLowerCase();
      const targetCandidate =
        /plate|number|license|text|decal|logo/.test(objectName) ||
        /plate|number|license|text|decal|logo|sharptrn/.test(materialName);

      if (!targetCandidate) return;

      material.map = bmwTexture.clone();
      material.map.needsUpdate = true;
      material.needsUpdate = true;
    });
  });
}

export default function HomeModelViewer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountNode = mountRef.current;

    let frameId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#060d1b");

    const camera = new THREE.PerspectiveCamera(
      45,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      2000,
    );
    camera.position.set(4, 1, 5.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearAlpha(1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.8;
    controls.enableRotate = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;

    let hasUserInteracted = false;
    const stopAutoRotateOnInteraction = () => {
      if (hasUserInteracted) return;
      hasUserInteracted = true;
      controls.autoRotate = false;
    };

    const ambient = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambient);
    const hemiLight = new THREE.HemisphereLight(0xbfd9ff, 0x0a1324, 0.85);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(8, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.normalBias = 0.012;
    keyLight.shadow.radius = 2.5;
    scene.add(keyLight);
    scene.add(keyLight.target);
    const coolFill = new THREE.DirectionalLight(0x7db2ff, 0.75);
    coolFill.position.set(-6, 7, -4);
    scene.add(coolFill);
    const rim = new THREE.DirectionalLight(0x8ec5ff, 0.55);
    rim.position.set(1, 8, -9);
    scene.add(rim);
    const frontFill = new THREE.SpotLight(
      0xd9ebff,
      1.25,
      120,
      Math.PI / 4,
      0.5,
      1.2,
    );
    frontFill.position.set(0, 4.8, 10);
    frontFill.target.position.set(0, 0, 0);
    scene.add(frontFill);
    scene.add(frontFill.target);

    const group = new THREE.Group();
    scene.add(group);
    const modelCenter = new THREE.Vector3(0, 0, 0);
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.ShadowMaterial({ opacity: 0.58 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = -1.2;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    function fitShadowCameraToModel() {
      if (!group.children.length) return;

      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 2);
      const extent = maxDim * 1.35;

      keyLight.shadow.camera.left = -extent;
      keyLight.shadow.camera.right = extent;
      keyLight.shadow.camera.top = extent;
      keyLight.shadow.camera.bottom = -extent;
      keyLight.shadow.camera.near = 0.2;
      keyLight.shadow.camera.far = extent * 6;
      keyLight.shadow.camera.updateProjectionMatrix();
    }

    function fitModelToViewport() {
      if (!group.children.length) return;

      const fittedBox = new THREE.Box3().setFromObject(group);
      const size = fittedBox.getSize(new THREE.Vector3());
      const center = fittedBox.getCenter(new THREE.Vector3());

      const fitHeight =
        size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const fitWidth =
        size.x /
        (2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.aspect);
      const fitDepth = size.z * 0.8;
      const cameraDistance = Math.max(fitHeight, fitWidth, fitDepth) * 0.8;

      modelCenter.copy(center);
      controls.target.copy(modelCenter);
      camera.position.set(
        modelCenter.x + cameraDistance * 0.86,
        modelCenter.y + cameraDistance * 0.34,
        modelCenter.z + cameraDistance * 1.06,
      );
      camera.near = Math.max(0.1, cameraDistance / 100);
      camera.far = cameraDistance * 100;
      camera.updateProjectionMatrix();
      controls.update();
      fitShadowCameraToModel();
    }

    const loader = new GLTFLoader();
    loader.load(
      "/models/Home_bmw_m3_sedan_topaz_blue_car.glb",
      (gltf) => {
        gltf.scene.rotation.y = -0.45;
        gltf.scene.scale.setScalar(1.85);
        replaceSharptrnWithBmw(gltf.scene);

        const boundingBox = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        gltf.scene.position.x -= center.x;
        gltf.scene.position.y -= center.y;
        gltf.scene.position.z -= center.z;
        gltf.scene.traverse((object) => {
          if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.SkinnedMesh
          ) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        group.add(gltf.scene);

        const finalBox = new THREE.Box3().setFromObject(group);
        const groundCenter = finalBox.getCenter(new THREE.Vector3());
        shadowCatcher.position.set(
          groundCenter.x,
          finalBox.min.y - 0.02,
          groundCenter.z,
        );
        fitModelToViewport();
      },
      undefined,
      (loadError) => {
        console.error("Could not load 3D model.", loadError);
      },
    );

    function onResize() {
      const w = mountNode.clientWidth;
      const h = mountNode.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer!.setSize(w, h, false);
      fitModelToViewport();
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      stopAutoRotateOnInteraction();
      controls.rotateLeft(event.deltaY * 0.0022);
      controls.update();
    }

    function onPointerDown() {
      stopAutoRotateOnInteraction();
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    onResize();
    function animate() {
      controls.update();
      keyLight.target.position.copy(controls.target);
      keyLight.position
        .copy(camera.position)
        .add(new THREE.Vector3(5, 5.8, 2.6));
      keyLight.target.updateMatrixWorld();
      renderer!.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer?.domElement.removeEventListener("wheel", onWheel);
      controls.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss?.();
        mountNode.removeChild(renderer.domElement);
      }
      while (scene.children.length) {
        scene.remove(scene.children[0]);
      }
    };
  }, []);

  return (
    <div className="relative h-[calc(100vh-72px)] w-full overflow-hidden bg-[radial-gradient(circle_at_18%_22%,#102a4f_0%,#081629_38%,#050d18_72%,#040a14_100%)] text-slate-100">
      <div className="grid h-full w-full grid-cols-1 md:grid-cols-[58%_42%] ">
        <div className="relative h-full min-w-0">
          <div
            ref={mountRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
          />
        </div>

        <aside className="relative z-10 flex h-full flex-col justify-center px-8 pb-16 pt-24 md:px-12  bg-[#060d1b]">
          <h1 className="max-w-[9ch] text-5xl font-semibold uppercase leading-[0.92] tracking-[0.02em] text-white md:text-7xl">
            Unique BMW Presence
          </h1>
          <p className="mt-6 max-w-[42ch] text-sm leading-7 text-slate-300">
            Customize your BMW with precision design, dynamic lighting, and pure
            performance aesthetics crafted for a premium digital showroom.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex w-fit items-center gap-3 rounded-full border border-[#6d9fe8] bg-[#0b1b32]/70 px-6 py-3 text-sm font-medium text-[#d7e8ff] transition hover:bg-[#133059]"
          >
            Start now
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[#6d9fe8] text-xs">
              ↓
            </span>
          </button>
        </aside>
      </div>
      {/* Keep */}
      {/* <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex ">
        <span className="h-2 w-2 rounded-full bg-[#d8e8ff]" />
        <span className="h-2 w-2 rounded-full bg-[#4f6f98]" />
        <span className="h-2 w-2 rounded-full bg-[#4f6f98]" />
      </div> */}

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-center">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#8eaed8]">
          Start scrolling to explore
        </p>
        <p className="mt-1 text-[#b8d2ff]">↓</p>
      </div>
    </div>
  );
}
