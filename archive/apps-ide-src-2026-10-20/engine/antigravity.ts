import { SocketBinding, ApothecaryItem } from './relationEngine';

export interface Vector3State {
  x: number;
  y: number;
  z: number;
}

export interface FreeBodyState {
  elementId: string;
  position: Vector3State;
  rotation: Vector3State;
  velocity: Vector3State;
  targetPosition?: Vector3State;
  isDragging: boolean;
  type: 'orb' | 'satellite' | 'portal' | 'core';
}

/**
 * Computes distance between two 3D vectors.
 */
export function distance(a: Vector3State, b: Vector3State): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * ProximityField: Spatial awareness for drag suggestions.
 * Finds the nearest vacant socket to a given position within a threshold radius.
 */
export function getNearestVacantSocket(
  position: Vector3State,
  sockets: SocketBinding[],
  maxDistance: number = 3.0
): SocketBinding | null {
  let nearest: SocketBinding | null = null;
  let minDistance = maxDistance;

  for (const socket of sockets) {
    if (socket.state !== 'Vacant') continue;

    // The nominal position of a socket ring based on its angleDeg and radius.
    const rad = socket.angleDeg * (Math.PI / 180);
    const socketPos = {
      x: Math.cos(rad) * socket.radius,
      y: 0,
      z: -Math.sin(rad) * socket.radius
    };

    const dist = distance(position, socketPos);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = socket;
    }
  }

  return nearest;
}

/**
 * LayoutPresets: Generates target positions for elements based on a preset.
 */
export const LayoutPresets = {
  radial: (elements: FreeBodyState[], radius = 6): FreeBodyState[] => {
    return elements.map((el, i) => {
      const angle = (i / elements.length) * Math.PI * 2;
      return {
        ...el,
        targetPosition: {
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius
        }
      };
    });
  },
  cluster: (elements: FreeBodyState[], spacing = 2): FreeBodyState[] => {
    // A simple grid/cluster layout
    const cols = Math.ceil(Math.sqrt(elements.length));
    return elements.map((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...el,
        targetPosition: {
          x: (col - cols / 2) * spacing,
          y: (Math.random() - 0.5) * spacing, // Slight Y variation
          z: (row - cols / 2) * spacing
        }
      };
    });
  }
};
