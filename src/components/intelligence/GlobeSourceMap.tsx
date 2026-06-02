"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mesh } from "topojson-client";
import type { GeometryObject, Topology } from "topojson-specification";
import worldCountries from "world-atlas/countries-110m.json";
import type {
  GlobeClusterAnchorMap,
  GlobeLocationCluster,
  Modality,
  SourceDataset,
  SourceNode,
  SourceToClusterMap,
} from "@/types/sourceGraph";
import { DEFAULT_COMPANY_HQ } from "@/utils/intelligence/locationFallback";
import { worldToScreen } from "@/utils/intelligence/worldToScreen";
import styles from "./CompanyIntelligenceView.module.css";

type Marker = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> & {
  userData: { cluster?: GlobeLocationCluster; hq?: boolean };
};

const RADIUS = 44;
const LABEL_CONFIG: Record<string, { dx: number; dy: number }> = {
  "San Francisco": { dx: 14, dy: -28 },
  "Palo Alto": { dx: 14, dy: -28 },
  London: { dx: 14, dy: -28 },
};

export function GlobeSourceMap({
  dataset,
  clusters,
  sourceToCluster,
  activeSourceId,
  activeClusterId,
  selectedModality,
  matchingSourceIds,
  searchActive,
  onActiveClusterId,
  onActiveSourceId,
  onAnchors,
}: {
  dataset: SourceDataset;
  clusters: GlobeLocationCluster[];
  sourceToCluster: SourceToClusterMap;
  activeSourceId: string | null;
  activeClusterId: string | null;
  selectedModality: Modality | null;
  matchingSourceIds: Set<string>;
  searchActive: boolean;
  onActiveClusterId: (clusterId: string | null) => void;
  onActiveSourceId: (sourceId: string | null) => void;
  onAnchors: (anchors: GlobeClusterAnchorMap) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latest = useRef({
    activeSourceId,
    activeClusterId,
    selectedModality,
    matchingSourceIds,
    searchActive,
  });
  const [hoverCard, setHoverCard] = useState<{
    x: number;
    y: number;
    cluster: GlobeLocationCluster;
  } | null>(null);
  const [labels, setLabels] = useState<
    Array<{ id: string; x: number; y: number; cluster: GlobeLocationCluster }>
  >([]);
  const hq = dataset.company.headquarters ?? DEFAULT_COMPANY_HQ;

  useEffect(() => {
    latest.current = {
      activeSourceId,
      activeClusterId,
      selectedModality,
      matchingSourceIds,
      searchActive,
    };
  }, [activeSourceId, activeClusterId, selectedModality, matchingSourceIds, searchActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020303");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
    camera.position.set(0, 0, 270);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor("#020303", 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x9fb4c2, 0.24);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xe6f6ff, 16, 420);
    keyLight.position.set(-80, 90, 150);
    scene.add(keyLight);

    const group = new THREE.Group();
    group.position.x = 0;
    group.rotation.y = -0.68;
    group.rotation.x = -0.18;
    scene.add(group);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let index = 0; index < 220; index += 1) {
      const x = ((index * 73) % 200) - 100;
      const y = ((index * 131) % 150) - 75;
      const z = -80 - ((index * 29) % 180);
      starPositions.push(x * 2.2, y * 1.7, z);
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    const starMaterial = new THREE.PointsMaterial({
      color: "#d9fbff",
      size: 0.42,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const globeGeometry = new THREE.SphereGeometry(RADIUS, 96, 64);
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: "#050809",
      roughness: 0.78,
      metalness: 0.16,
      emissive: "#031216",
      emissiveIntensity: 0.38,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    group.add(globe);

    const rimGeometry = new THREE.SphereGeometry(RADIUS + 0.9, 96, 64);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: "#6af7ff",
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    group.add(rim);

    const countryMaterial = new THREE.LineBasicMaterial({
      color: "#e7e7e7",
      transparent: true,
      opacity: 0.6,
      depthWrite: true,
    });
    const countryLines = createCountryOutlines(RADIUS + 0.55, countryMaterial);
    group.add(countryLines);

    const markerGeometry = new THREE.PlaneGeometry(2.8, 2.8);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: "#ff5a00",
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const hqMarker = new THREE.Mesh(markerGeometry, markerMaterial.clone()) as Marker;
    hqMarker.position.copy(latLngToVector3(hq.lat, hq.lng, RADIUS + 2.2));
    hqMarker.scale.setScalar(1.16);
    hqMarker.userData.hq = true;
    group.add(hqMarker);

    const markers = new Map<string, Marker>();
    for (const cluster of clusters) {
      const material = markerMaterial.clone();
      const marker = new THREE.Mesh(markerGeometry, material) as Marker;
      marker.position.copy(latLngToVector3(cluster.location.lat, cluster.location.lng, RADIUS + 2.6));
      marker.scale.setScalar(cluster.count >= 6 ? 1.2 : cluster.count >= 2 ? 1 : 0.86);
      marker.userData.cluster = cluster;
      markers.set(cluster.id, marker);
      group.add(marker);
    }

    const arcMaterials: THREE.LineBasicMaterial[] = [];
    const arcLines = new Map<string, THREE.Line>();
    const arcGlowLines: THREE.Line[] = [];
    for (const cluster of clusters) {
      const start = latLngToVector3(hq.lat, hq.lng, RADIUS + 1.5);
      const end = latLngToVector3(cluster.location.lat, cluster.location.lng, RADIUS + 1.5);
      const dist = start.distanceTo(end);
      const lift = Math.max(6, Math.min(18, dist * 0.16));
      const arcPoints = createGlobeArcPoints(start, end, RADIUS + 1.5, lift, 52);
      const geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
      const glowMaterial = new THREE.LineBasicMaterial({
        color: "#ff8a1f",
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const material = new THREE.LineBasicMaterial({
        color: "#ff6a00",
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      arcMaterials.push(material, glowMaterial);
      const glowLine = new THREE.Line(geometry.clone(), glowMaterial);
      glowLine.scale.setScalar(1.006);
      const line = new THREE.Line(geometry, material);
      group.add(glowLine);
      arcGlowLines.push(glowLine);
      arcLines.set(cluster.id, line);
      group.add(line);
    }

    const pointer = new THREE.Vector2(10, 10);
    let hovered: GlobeLocationCluster | null = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let frame = 0;
    let disposed = false;
    let lastAnchors: GlobeClusterAnchorMap = {};
    let labelsEnabled = true;
    let settleResizeFrames = 18;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, true);
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width < 760 ? 42 : 34;
      camera.position.z = 340;
      const targetPixels = Math.min(width * 0.42, height * 0.58, 540);
      const visibleHeight =
        2 *
        camera.position.z *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const projectedDiameter = ((RADIUS * 2) / visibleHeight) * height;
      const scale = THREE.MathUtils.clamp(targetPixels / projectedDiameter, 0.5, 0.98);
      group.scale.setScalar(scale);
      group.position.x = 0;
      group.position.y = 0;
      labelsEnabled = width >= 720 && height >= 520;
      if (!labelsEnabled) {
        setLabels([]);
      }
      camera.updateProjectionMatrix();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        group.rotation.y += (event.clientX - lastX) * 0.006;
        group.rotation.x += (event.clientY - lastY) * 0.004;
        group.rotation.x = THREE.MathUtils.clamp(group.rotation.x, -1.1, 1.1);
        lastX = event.clientX;
        lastY = event.clientY;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const handlePointerLeave = () => {
      pointer.set(10, 10);
      hovered = null;
      setHoverCard(null);
      onActiveClusterId(null);
      dragging = false;
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(() => {
      settleResizeFrames = 18;
      resize();
    });
    resizeObserver.observe(container);
    resize();

    const animate = () => {
      if (disposed) return;
      frame += 1;
      if (settleResizeFrames > 0) {
        settleResizeFrames -= 1;
        resize();
      }
      if (!dragging) group.rotation.y += 0.00045;
      stars.rotation.z += 0.00008;
      hqMarker.lookAt(camera.position);

      // Update markers before hit-testing so world matrices are current
      for (const [id, marker] of markers) {
        const cluster = marker.userData.cluster;
        if (!cluster) continue;
        const frontFacing = isFrontFacing(marker, group, camera);
        marker.visible = frontFacing;
        marker.lookAt(camera.position);
        const isActive = isClusterActive(cluster, id, latest.current);
        marker.material.color.lerp(new THREE.Color(isActive ? "#ff9a31" : "#ff5a00"), 0.18);
        marker.material.opacity = isClusterDim(cluster, latest.current) ? 0.3 : 1;
        const base = cluster.count >= 6 ? 1.2 : cluster.count >= 2 ? 1 : 0.86;
        marker.scale.setScalar(base * (isActive ? 1.42 : 1));
        const arc = arcLines.get(id);
        const material = arc?.material as THREE.LineBasicMaterial | undefined;
        if (material) {
          material.opacity = isActive
            ? 1
            : isClusterDim(cluster, latest.current)
              ? 0.12
              : 0.62;
        }
      }

      // Flush world matrices so projections are accurate this frame
      scene.updateMatrixWorld();

      // Screen-space hit testing — robust regardless of marker size or drag speed
      const domRect = renderer.domElement.getBoundingClientRect();
      const pxX = domRect.left + ((pointer.x + 1) * domRect.width) / 2;
      const pxY = domRect.top + ((-pointer.y + 1) * domRect.height) / 2;
      const HIT_R = 28;
      let nextHovered: GlobeLocationCluster | null = null;
      let closestSq = HIT_R * HIT_R;
      for (const [, marker] of markers) {
        if (!marker.visible) continue;
        const worldPos = new THREE.Vector3();
        marker.getWorldPosition(worldPos);
        const screen = worldToScreen(worldPos, camera, renderer);
        if (!screen.visible) continue;
        const dx = screen.x - pxX;
        const dy = screen.y - pxY;
        const dSq = dx * dx + dy * dy;
        if (dSq < closestSq) {
          closestSq = dSq;
          nextHovered = marker.userData.cluster ?? null;
        }
      }

      if (nextHovered !== hovered) {
        hovered = nextHovered;
        if (hovered) {
          setHoverCard({ x: pxX, y: pxY, cluster: hovered });
          onActiveClusterId(hovered.id);
        } else {
          setHoverCard(null);
          onActiveClusterId(null);
        }
      } else if (hovered) {
        setHoverCard((current) => (current ? { ...current, x: pxX, y: pxY } : current));
      }

      if (frame % 4 === 0) {
        const anchors: GlobeClusterAnchorMap = {};
        const nextLabels: Array<{
          id: string;
          x: number;
          y: number;
          cluster: GlobeLocationCluster;
        }> = [];
        for (const [id, marker] of markers) {
          const world = new THREE.Vector3();
          marker.getWorldPosition(world);
          const anchor = { id, ...worldToScreen(world, camera, renderer) };
          const frontFacing = marker.visible && isFrontFacing(marker, group, camera);
          anchors[id] = { ...anchor, visible: anchor.visible && frontFacing };
          const cluster = marker.userData.cluster;
          const labelConfig = cluster?.location.label
            ? LABEL_CONFIG[cluster.location.label]
            : undefined;
          if (labelsEnabled && cluster && anchor.visible && frontFacing && labelConfig) {
            nextLabels.push({
              id,
              x: anchor.x + labelConfig.dx,
              y: anchor.y + labelConfig.dy,
              cluster,
            });
          }
        }
        if (anchorsChanged(lastAnchors, anchors)) {
          lastAnchors = anchors;
          onAnchors(anchors);
        }
        setLabels((current) =>
          labelsChanged(current, nextLabels) ? nextLabels : current,
        );
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      globeGeometry.dispose();
      globeMaterial.dispose();
      rimGeometry.dispose();
      rimMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      countryLines.traverse((child) => {
        const line = child as THREE.Line;
        line.geometry?.dispose();
      });
      countryMaterial.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      hqMarker.material.dispose();
      markers.forEach((marker) => marker.material.dispose());
      arcLines.forEach((line) => line.geometry.dispose());
      arcGlowLines.forEach((line) => line.geometry.dispose());
      arcMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [clusters, dataset.company.headquarters, hq.lat, hq.lng, onActiveClusterId, onAnchors]);

  const groupedSources = useMemo(
    () => (hoverCard ? groupSourcesByModality(hoverCard.cluster.sources) : []),
    [hoverCard],
  );

  return (
    <div ref={containerRef} className={styles.canvasHost}>
      {hoverCard ? (
        <div
          className={styles.hoverCard}
          style={{ left: hoverCard.x + 14, top: hoverCard.y + 14 }}
          onPointerLeave={() => onActiveSourceId(null)}
        >
          <div className={styles.cardTitle}>
            {hoverCard.cluster.location.label ?? hoverCard.cluster.id}
          </div>
          <div className={styles.cardMeta}>
            {hoverCard.cluster.count} clustered sources /{" "}
            {hoverCard.cluster.modalities.join(", ")}
          </div>
          {groupedSources.map(([modality, sources]) => (
            <div className={styles.group} key={modality}>
              <div className={styles.groupTitle}>{modality.replace("_", " ")}</div>
              {sources.map((source) => (
                <button
                  key={source.id}
                  className={styles.sourceButton}
                  onPointerEnter={() => onActiveSourceId(source.id)}
                  onClick={() => {
                    if (source.url) {
                      window.open(source.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {source.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {labels.map((label) => (
        <div
          key={label.id}
          className={styles.globeLabel}
          style={{ left: label.x, top: label.y }}
        >
          <div className={styles.globeLabelName}>{label.cluster.location.label}</div>
          <div className={styles.globeLabelCoords}>
            {formatCoordinate(label.cluster.location.lat, "lat")}
            <br />
            {formatCoordinate(label.cluster.location.lng, "lng")}
          </div>
        </div>
      ))}
    </div>
  );
}

function createGlobeArcPoints(
  from: THREE.Vector3,
  to: THREE.Vector3,
  surfaceRadius: number,
  liftAmount: number,
  steps: number,
): THREE.Vector3[] {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9999) return [from.clone(), to.clone()];
  // Near-antipodal: fall back to two-point line rather than NaN from slerp
  if (dot < -0.9998) return [from.clone(), to.clone()];
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const dir = a
      .clone()
      .multiplyScalar(Math.sin((1 - t) * theta) / sinTheta)
      .add(b.clone().multiplyScalar(Math.sin(t * theta) / sinTheta));
    const lift = Math.sin(t * Math.PI) * liftAmount;
    points.push(dir.multiplyScalar(surfaceRadius + lift));
  }
  return points;
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function isFrontFacing(
  object: THREE.Object3D,
  globeGroup: THREE.Object3D,
  camera: THREE.Camera,
) {
  const world = new THREE.Vector3();
  const center = new THREE.Vector3();
  object.getWorldPosition(world);
  globeGroup.getWorldPosition(center);

  const surfaceNormal = world.clone().sub(center).normalize();
  const cameraDirection = camera.position.clone().sub(world).normalize();
  return surfaceNormal.dot(cameraDirection) > 0.08;
}

function createCountryOutlines(radius: number, material: THREE.LineBasicMaterial) {
  const group = new THREE.Group();
  const topology = worldCountries as unknown as Topology;
  const countries = topology.objects.countries as GeometryObject;
  const boundaries = mesh(topology, countries);

  for (const line of boundaries.coordinates) {
    const points = line
      .filter((_, index) => index % 2 === 0)
      .map(([lng, lat]) => latLngToVector3(lat, lng, radius));
    if (points.length > 1) {
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
  }

  return group;
}

function formatCoordinate(value: number, axis: "lat" | "lng") {
  const direction =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}°${direction}`;
}

function isClusterActive(
  cluster: GlobeLocationCluster,
  clusterId: string,
  state: {
    activeSourceId: string | null;
    activeClusterId: string | null;
    selectedModality: Modality | null;
    matchingSourceIds: Set<string>;
    searchActive: boolean;
  },
) {
  return (
    clusterId === state.activeClusterId ||
    cluster.sources.some((source) => source.id === state.activeSourceId) ||
    (state.selectedModality
      ? cluster.modalities.includes(state.selectedModality)
      : false) ||
    (state.searchActive
      ? cluster.sources.some((source) => state.matchingSourceIds.has(source.id))
      : false)
  );
}

function isClusterDim(
  cluster: GlobeLocationCluster,
  state: {
    selectedModality: Modality | null;
    matchingSourceIds: Set<string>;
    searchActive: boolean;
  },
) {
  if (state.selectedModality && !cluster.modalities.includes(state.selectedModality)) {
    return true;
  }
  if (state.searchActive && !cluster.sources.some((source) => state.matchingSourceIds.has(source.id))) {
    return true;
  }
  return false;
}

function groupSourcesByModality(sources: SourceNode[]): Array<[Modality, SourceNode[]]> {
  const groups = new Map<Modality, SourceNode[]>();
  for (const source of sources) {
    const group = groups.get(source.modality) ?? [];
    group.push(source);
    groups.set(source.modality, group);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function anchorsChanged(
  previous: GlobeClusterAnchorMap,
  next: GlobeClusterAnchorMap,
) {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return true;
  for (const key of nextKeys) {
    const a = previous[key];
    const b = next[key];
    if (!a || a.visible !== b.visible) return true;
    if (Math.abs(a.x - b.x) > 0.75 || Math.abs(a.y - b.y) > 0.75) return true;
  }
  return false;
}

function labelsChanged(
  previous: Array<{ id: string; x: number; y: number; cluster: GlobeLocationCluster }>,
  next: Array<{ id: string; x: number; y: number; cluster: GlobeLocationCluster }>,
) {
  if (previous.length !== next.length) return true;
  for (let index = 0; index < next.length; index += 1) {
    const a = previous[index];
    const b = next[index];
    if (!a || a.id !== b.id) return true;
    if (Math.abs(a.x - b.x) > 0.75 || Math.abs(a.y - b.y) > 0.75) return true;
  }
  return false;
}
