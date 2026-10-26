import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ConduitProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  type: 'umbilical' | 'tether' | 'mesh';
  state?: 'dormant' | 'seeking' | 'active' | 'degraded';
}

export const ConduitSpline: React.FC<ConduitProps> = ({
  start,
  end,
  type,
  state = 'active'
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Generate a procedural curved spline with catenary sag
  const { curve, points } = useMemo(() => {
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    
    // Antigravity physics curve sag based on distance
    const dist = start.distanceTo(end);
    mid.y += dist * 0.15; 
    mid.z += Math.sin(dist) * 0.1;

    const spline = new THREE.CatmullRomCurve3([start, mid, end]);
    return { curve: spline, points: spline.getPoints(50) };
  }, [start, end]);

  // Color mapping conforming to Section 31 Visual Language
  const conduitColor = useMemo(() => {
    switch (state) {
      case 'seeking': return '#d97706'; // Amber pulse
      case 'active': return type === 'umbilical' ? '#38bdf8' : '#818cf8'; // Cyan / Indigo
      case 'degraded': return '#ef4444'; // Red fault
      default: return '#475569'; // Slate dormant
    }
  }, [state, type]);

  // Animate packet transit along spline curve
  useFrame(({ clock }) => {
    if (pulseRef.current && state === 'active') {
      const t = (clock.getElapsedTime() * 0.6) % 1;
      const pos = curve.getPointAt(t);
      pulseRef.current.position.copy(pos);
    }
  });

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group>
      {/* 1. Base Energy Conduit Line */}
      <line ref={lineRef as any} geometry={geometry}>
        <lineBasicMaterial
          color={conduitColor}
          transparent
          opacity={state === 'dormant' ? 0.3 : 0.8}
          linewidth={type === 'umbilical' ? 2 : 1}
        />
      </line>

      {/* 2. Floating Message Flow Packet (128-pool instance proxy) */}
      {state === 'active' && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};