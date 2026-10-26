import type {
  ComponentKind,
  OperationEvent,
  PodTopologySnapshot,
} from '../domain/index.ts';
import type {
  OperationalStatus,
  OperationProjection,
  SceneEntityKind,
  TopologyProjection,
} from '../../three/index.ts';

export interface AdminSceneProjection {
  topology: TopologyProjection;
  positions: ReadonlyMap<string, readonly [number, number, number]>;
  componentKinds: ReadonlyMap<string, ComponentKind>;
}

const CORE_POSITION = [0, 0, 0] as const;

function ringPosition(index: number, count: number, radius: number, y = 0): readonly [number, number, number] {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
}

function sceneStatus(status: { health: string; activity: string }): OperationalStatus {
  if (status.health !== 'nominal') return status.health as OperationalStatus;
  if (status.activity === 'queued') return 'queued';
  return 'nominal';
}

export function projectPodTopology(snapshot: PodTopologySnapshot): AdminSceneProjection {
  const nodes: TopologyProjection['nodes'][number][] = [];
  const edges: TopologyProjection['edges'][number][] = [];
  const positions = new Map<string, readonly [number, number, number]>();
  const componentKinds = new Map<string, ComponentKind>();

  positions.set(snapshot.pod.pod_id, CORE_POSITION);
  componentKinds.set(snapshot.pod.pod_id, 'pod');
  nodes.push({
    id: snapshot.pod.pod_id,
    kind: 'core',
    position: CORE_POSITION,
    scale: 1.45,
    focusRadius: 2.2,
    status: sceneStatus(snapshot.pod.status),
    metadata: { domainKind: 'pod', label: snapshot.pod.displayName, canonical: true },
  });

  const sortedOrbs = [...snapshot.orbs].sort((left, right) => left.orb_id.localeCompare(right.orb_id));
  sortedOrbs.forEach((orb, index) => {
    const position = ringPosition(index, sortedOrbs.length, 5.4, index % 2 ? -0.35 : 0.35);
    positions.set(orb.orb_id, position);
    componentKinds.set(orb.orb_id, 'orb');
    nodes.push({
      id: orb.orb_id,
      kind: 'orb',
      position,
      scale: 0.9,
      focusRadius: 1.2,
      status: sceneStatus(orb.status),
      metadata: { domainKind: 'orb', label: orb.abilityName, canonical: true },
    });
  });

  snapshot.umbilicals.forEach((umbilical) => {
    const orbPosition = positions.get(umbilical.orb_id) ?? CORE_POSITION;
    const position = [orbPosition[0] * 0.48, orbPosition[1] * 0.48, orbPosition[2] * 0.48] as const;
    positions.set(umbilical.umbilical_id, position);
    componentKinds.set(umbilical.umbilical_id, 'umbilical');
    nodes.push({
      id: umbilical.umbilical_id,
      kind: 'umbilical',
      position,
      scale: 0.42,
      focusRadius: 0.7,
      status: sceneStatus(umbilical.status),
      metadata: { domainKind: 'umbilical', label: umbilical.attachmentPoint, canonical: true },
    });
    edges.push({
      id: `${umbilical.umbilical_id}:core`,
      fromId: snapshot.pod.pod_id,
      toId: umbilical.umbilical_id,
      status: sceneStatus(umbilical.status),
    }, {
      id: `${umbilical.umbilical_id}:orb`,
      fromId: umbilical.umbilical_id,
      toId: umbilical.orb_id,
      status: sceneStatus(umbilical.status),
    });
  });

  const satellitesByOrb = new Map<string, typeof snapshot.satellites>();
  [...snapshot.satellites].sort((left, right) => left.satellite_id.localeCompare(right.satellite_id)).forEach((satellite) => {
    const siblings = satellitesByOrb.get(satellite.parent_orb_id) ?? [];
    siblings.push(satellite);
    satellitesByOrb.set(satellite.parent_orb_id, siblings);
  });
  satellitesByOrb.forEach((satellites, orbId) => {
    const parent = positions.get(orbId) ?? CORE_POSITION;
    satellites.sort((left, right) => left.satellite_id.localeCompare(right.satellite_id)).forEach((satellite, index) => {
      const offset = ringPosition(index, satellites.length, 1.5, 0.45);
      const worldPosition = [parent[0] + offset[0], parent[1] + offset[1], parent[2] + offset[2]] as const;
      positions.set(satellite.satellite_id, worldPosition);
      componentKinds.set(satellite.satellite_id, 'satellite');
      nodes.push({
        id: satellite.satellite_id,
        kind: 'satellite',
        parentId: orbId,
        // Structural scene roots remain siblings; parentId is logical only.
        position: worldPosition,
        scale: 0.48,
        focusRadius: 0.65,
        status: sceneStatus(satellite.status),
        metadata: {
          domainKind: 'satellite',
          label: satellite.name,
          canonical: false,
          projectionKind: satellite.projectionKind,
        },
      });
      edges.push({
        id: `${orbId}:${satellite.satellite_id}`,
        fromId: orbId,
        toId: satellite.satellite_id,
        status: sceneStatus(satellite.status),
      });
    });
  });

  const sortedPortals = [...snapshot.portals].sort((left, right) => left.portal_id.localeCompare(right.portal_id));
  sortedPortals.forEach((portal, index) => {
    const position = ringPosition(index, sortedPortals.length, 8.2, 1.4);
    positions.set(portal.portal_id, position);
    componentKinds.set(portal.portal_id, 'portal');
    nodes.push({
      id: portal.portal_id,
      kind: 'portal',
      position,
      scale: 0.9,
      focusRadius: 1.35,
      status: sceneStatus(portal.status),
      metadata: {
        domainKind: 'portal',
        label: portal.name,
        canonical: false,
        projectionKind: 'fixture_portal',
        tenderSafeguards: portal.tender?.safeguards ?? [],
      },
    });
    edges.push({
      id: `${snapshot.pod.pod_id}:${portal.portal_id}`,
      fromId: snapshot.pod.pod_id,
      toId: portal.portal_id,
      status: sceneStatus(portal.status),
      metadata: { boundary: portal.boundary },
    });
  });

  return {
    topology: { version: `${snapshot.schemaVersion}:${snapshot.capturedAt}`, nodes, edges },
    positions,
    componentKinds,
  };
}

export function eventStatus(event: OperationEvent): OperationalStatus {
  if (event.status !== 'nominal') return event.status;
  return event.phase === 'queued' ? 'queued' : 'nominal';
}

export function projectOperationEvents(
  events: readonly OperationEvent[],
  scene: AdminSceneProjection,
  visibleOperationIds?: ReadonlySet<string>,
): OperationProjection[] {
  const latestByOperation = new Map<string, OperationEvent>();
  for (const event of events) {
    const current = latestByOperation.get(event.operationId);
    if (!current || Date.parse(event.observedAt) > Date.parse(current.observedAt) || event.sequence > current.sequence) {
      latestByOperation.set(event.operationId, event);
    }
  }
  return [...latestByOperation.values()].sort((left, right) => left.operationId.localeCompare(right.operationId)).flatMap((event) => {
    const route = event.route.orderedRefs
      .map((reference) => scene.positions.get(reference.id))
      .filter((position): position is readonly [number, number, number] => Boolean(position));
    // A malformed route is evidence, not permission to invent a shortcut.
    if (route.length !== event.route.orderedRefs.length || route.length === 0) return [];
    const startedAtMs = Date.parse(event.observedAt);
    return [{
      id: `${event.operationId}:${event.eventId}`,
      startedAtMs,
      durationMs: 8_000,
      route,
      status: eventStatus(event),
      visible: route.length > 0 && (!visibleOperationIds || visibleOperationIds.has(event.operationId)),
    }];
  });
}

export function sceneKindToComponentKind(kind: SceneEntityKind): ComponentKind {
  return kind === 'core' ? 'pod' : kind;
}
