import * as THREE from "three";

export function worldToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
): { x: number; y: number; visible: boolean } {
  const vector = position.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();

  return {
    x: rect.left + ((vector.x + 1) * rect.width) / 2,
    y: rect.top + ((-vector.y + 1) * rect.height) / 2,
    visible: vector.z >= -1 && vector.z <= 1,
  };
}
