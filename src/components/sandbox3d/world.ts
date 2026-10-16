import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BRIGO_BY_ID } from "../../game/catalog";
import { rotatedSize } from "../../game/geometry";
import type { SandboxPlacement } from "../../game/sandbox";
import type { SandboxWorldProps } from "../SandboxWorld";
import { createBrigoMeshLibrary } from "./brigoMeshes";
import { buildPlacedBatch } from "./batching";
import type { PlacedBatch } from "./batching";
import {
  cellFromWorldPoint,
  isSceneTap,
  placementTransform,
  sandboxCameraFrame,
  SANDBOX_HEIGHT_SCALE,
} from "./picking";

export interface SandboxWorldController {
  update: (props: SandboxWorldProps) => void;
  setNavigation: (mode: "orbit" | "pan") => void;
  frame: () => void;
  top: () => void;
  zoom: (factor: number) => void;
  dispose: () => void;
}

/** No animation loop: GPU work is requested only after an edit or a camera gesture. */
export function createSandboxWorld(
  host: HTMLDivElement,
  initial: SandboxWorldProps,
  unavailable: () => void,
): SandboxWorldController {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", "Vue 3D interactive des Brigos");
  canvas.setAttribute("role", "img");
  canvas.dataset.renderer = "webgl";
  host.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 180);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 4;
  controls.maxDistance = 75;
  controls.minPolarAngle = 0.035;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.75;
  controls.panSpeed = 0.9;
  controls.zoomSpeed = 0.9;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  // Arrow keys remain placement controls, never implicit camera gestures.
  const library = createBrigoMeshLibrary();
  const ownGeometries: THREE.BufferGeometry[] = [];
  const ownMaterials: THREE.Material[] = [];
  const ownGeometry = <T extends THREE.BufferGeometry>(value: T) => {
    ownGeometries.push(value);
    return value;
  };
  const ownMaterial = <T extends THREE.Material>(value: T) => {
    ownMaterials.push(value);
    return value;
  };
  const boardMaterial = ownMaterial(
    new THREE.MeshToonMaterial({ color: 0xeee8d7 }),
  );
  const board = new THREE.Mesh(
    ownGeometry(new THREE.BoxGeometry(24.3, 0.27, 24.3)),
    boardMaterial,
  );
  board.position.set(12, -0.15, 12);
  scene.add(board);
  const floor = new THREE.Mesh(
    ownGeometry(new THREE.PlaneGeometry(24, 24)),
    ownMaterial(
      new THREE.MeshBasicMaterial({ color: 0xebe4d2, side: THREE.DoubleSide }),
    ),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(12, 0, 12);
  scene.add(floor);
  const grid = new THREE.GridHelper(24, 24, 0x9d957e, 0xc4bca5);
  grid.position.set(12, 0.01, 12);
  scene.add(grid);
  ownGeometries.push(grid.geometry);
  const gridMaterials = Array.isArray(grid.material)
    ? grid.material
    : [grid.material];
  ownMaterials.push(...gridMaterials);
  const elevation = grid.clone();
  elevation.material = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0x72bfa6,
      transparent: true,
      opacity: 0.3,
    }),
  );
  elevation.visible = false;
  scene.add(elevation);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a898, 2.5));
  const sun = new THREE.DirectionalLight(0xfff6de, 2.3);
  sun.position.set(10, 24, 10);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc4d9ff, 1.1);
  rim.position.set(-12, 10, -9);
  scene.add(rim);
  const placed = new THREE.Group();
  scene.add(placed);
  const ghostGroup = new THREE.Group();
  scene.add(ghostGroup);
  const selection = new THREE.Box3Helper(new THREE.Box3(), 0xffd254);
  selection.visible = false;
  scene.add(selection);
  ownGeometries.push(selection.geometry);
  ownMaterials.push(
    ...(Array.isArray(selection.material)
      ? selection.material
      : [selection.material]),
  );
  const ghostOutline = new THREE.Box3Helper(new THREE.Box3(), 0x247561);
  ghostOutline.visible = false;
  scene.add(ghostOutline);
  ownGeometries.push(ghostOutline.geometry);
  ownMaterials.push(
    ...(Array.isArray(ghostOutline.material)
      ? ghostOutline.material
      : [ghostOutline.material]),
  );
  const cursorMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x308f76,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const footprint = new THREE.Mesh(
    ownGeometry(new THREE.PlaneGeometry(1, 1)),
    cursorMaterial,
  );
  footprint.rotation.x = -Math.PI / 2;
  scene.add(footprint);
  let props = initial;
  let lastPlacements: readonly SandboxPlacement[] | null = null;
  let lastReset: string | undefined;
  let mode: "orbit" | "pan" = "orbit";
  let disposed = false;
  let scheduled = 0;
  let renderCount = 0;
  let placedBatch: PlacedBatch | null = null;
  const invalidate = () => {
    if (disposed || scheduled) return;
    scheduled = window.requestAnimationFrame(() => {
      scheduled = 0;
      if (disposed) return;
      const started = performance.now();
      renderer.render(scene, camera);
      canvas.dataset.frameMs = (performance.now() - started).toFixed(2);
      canvas.dataset.camera = camera.position
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
      canvas.dataset.target = controls.target
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
      canvas.dataset.frames = String(++renderCount);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
    });
  };
  const frame = () => {
    const framing = sandboxCameraFrame(props.placements);
    controls.target.copy(framing.target);
    camera.position
      .copy(framing.target)
      .add(
        new THREE.Vector3(0.64, 0.65, 0.78)
          .normalize()
          .multiplyScalar(framing.distance),
      );
    controls.update();
    invalidate();
  };
  const top = () => {
    const distance = Math.max(8, camera.position.distanceTo(controls.target));
    camera.position
      .copy(controls.target)
      .add(new THREE.Vector3(0, distance, 0.01));
    controls.update();
    invalidate();
  };
  const zoom = (factor: number) => {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(
      Math.max(
        controls.minDistance,
        Math.min(controls.maxDistance, offset.length() * factor),
      ),
    );
    camera.position.copy(controls.target).add(offset);
    controls.update();
    invalidate();
  };
  controls.addEventListener("change", invalidate);

  function update(next: SandboxWorldProps) {
    if (disposed) return;
    props = next;
    if (lastPlacements !== props.placements) {
      lastPlacements = props.placements;
      placedBatch?.dispose();
      placed.clear();
      placedBatch = buildPlacedBatch(props.placements, library);
      placed.add(placedBatch.group);
      canvas.dataset.placements = String(placedBatch.boundsById.size);
    }
    ghostGroup.clear();
    ghostOutline.visible = false;
    if (props.candidate) {
      const brigo = BRIGO_BY_ID.get(props.candidate.brigoId);
      if (brigo) {
        const ghost = library.create(brigo, {
          ghost: true,
          valid: !!props.candidateValid,
        });
        ghost.applyMatrix4(
          placementTransform({ ...props.candidate, id: "ghost" }),
        );
        ghostGroup.add(ghost);
        ghostOutline.box.setFromObject(ghost);
        ghostOutline.visible = true;
        (ghostOutline.material as THREE.LineBasicMaterial).color.set(
          props.candidateValid ? 0x318c72 : 0xe55d57,
        );
        const size = rotatedSize(brigo.model, props.candidate.rotation);
        footprint.scale.set(size.width, size.depth, 1);
        footprint.position.set(
          props.cursor.x + size.width / 2,
          props.cursor.z * SANDBOX_HEIGHT_SCALE + 0.012,
          props.cursor.y + size.depth / 2,
        );
      }
    }
    footprint.visible = !!props.candidate;
    cursorMaterial.color.set(props.candidateValid ? 0x308f76 : 0xd85c55);
    const selected = props.selectedId
      ? placedBatch?.boundsById.get(props.selectedId)
      : undefined;
    selection.visible = !!selected;
    if (selected) selection.box.copy(selected);
    elevation.visible =
      props.stackAutomatically === false && (props.pickHeight ?? 0) > 0;
    elevation.position.y =
      (props.pickHeight ?? 0) * SANDBOX_HEIGHT_SCALE + 0.006;
    if (lastReset !== props.resetKey || renderCount === 0) {
      lastReset = props.resetKey;
      frame();
    }
    invalidate();
  }
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function aim(event: PointerEvent) {
    if (props.disabled || mode === "pan") return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      placedBatch?.pickMeshes ?? [],
      false,
    );
    const hit = hits[0];
    let support: SandboxPlacement | undefined;
    if (hit) {
      let object: THREE.Object3D | null = hit.object;
      const instanceId = hit.instanceId;
      const instancePlacement =
        instanceId !== undefined
          ? object.userData.placementIds?.[instanceId]
          : undefined;
      while (!instancePlacement && object && !object.userData.placementId)
        object = object.parent;
      support = props.placements.find(
        (item) =>
          item.id === (instancePlacement ?? object?.userData.placementId),
      );
    }
    if (props.interactionMode === "select" && support) {
      props.onSelect(support.id);
      return;
    }
    let cell: { x: number; y: number } | null = null;
    if (props.stackAutomatically !== false && hit && support)
      cell = cellFromWorldPoint(hit.point, support);
    else {
      const point = raycaster.ray.intersectPlane(
        new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -(props.stackAutomatically === false
            ? (props.pickHeight ?? 0) * SANDBOX_HEIGHT_SCALE
            : 0),
        ),
        new THREE.Vector3(),
      );
      if (point) cell = cellFromWorldPoint(point);
    }
    if (cell) {
      props.onCell(cell.x, cell.y);
    }
  }
  const pointers = new Map<
    number,
    { x: number; y: number; multiple: boolean; moved: boolean }
  >();
  const down = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (pointers.size)
      for (const pointer of pointers.values()) pointer.multiple = true;
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      multiple: pointers.size > 0,
      moved: false,
    });
  };
  const move = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    if (pointer) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6)
        pointer.moved = true;
    }
  };
  const up = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (
      pointer &&
      !pointer.moved &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      isSceneTap(
        pointer,
        { x: event.clientX, y: event.clientY },
        pointer.multiple,
      )
    )
      aim(event);
    host.focus({ preventScroll: true });
  };
  const cancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
  };
  // A cancelled gesture must not leave a stale touch that blocks later taps.
  // Defer capture cleanup so a normal pointerup still gets its tap decision.
  const lostCapture = (event: PointerEvent) => {
    queueMicrotask(() => pointers.delete(event.pointerId));
  };
  const clearGesture = () => pointers.clear();
  const visibility = () => {
    if (document.visibilityState === "hidden") clearGesture();
  };
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", lostCapture);
  window.addEventListener("blur", clearGesture);
  document.addEventListener("visibilitychange", visibility);
  const lost = (event: Event) => {
    event.preventDefault();
    unavailable();
  };
  canvas.addEventListener("webglcontextlost", lost);
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const theme = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    scene.background = new THREE.Color(dark ? 0x202630 : 0xf3efe4);
    boardMaterial.color.set(dark ? 0x222b35 : 0xafa28a);
    floor.material.color.set(dark ? 0x2e3846 : 0xebe4d2);
    gridMaterials.forEach((material) => {
      (material as THREE.LineBasicMaterial).color.set(
        dark ? 0x637080 : 0xb4aa92,
      );
    });
    invalidate();
  };
  const themeObserver = new MutationObserver(theme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  theme();
  resize();
  update(initial);
  return {
    update,
    frame,
    top,
    zoom,
    setNavigation(navigation) {
      mode = navigation;
      controls.mouseButtons.LEFT =
        mode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.touches.ONE =
        mode === "pan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
      canvas.dataset.navigation = mode;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (scheduled) cancelAnimationFrame(scheduled);
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      window.removeEventListener("blur", clearGesture);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", lost);
      placedBatch?.dispose();
      library.dispose();
      ownGeometries.forEach((geometry) => geometry.dispose());
      ownMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      canvas.remove();
      scene.clear();
    },
  };
}
