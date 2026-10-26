import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface ElementActorProps {
  glbPath: string;
  position: THREE.Vector3;
  currentState: 'idle_dormant' | 'seeking_scan' | 'active_operation';
  onDragPositionChange?: (newPos: THREE.Vector3) => void;
}

export const RiggedElementActor: React.FC<ElementActorProps> = ({
  glbPath,
  position,
  currentState,
  onDragPositionChange
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(glbPath);
  const { actions } = useAnimations(animations, groupRef);

  // Cross-fade animation tracks based on active Relation Contract lifecycle
  useEffect(() => {
    const targetAction = actions[currentState] || actions['idle_dormant'];
    if (targetAction) {
      targetAction.reset().fadeIn(0.4).play();
    }

    return () => {
      if (targetAction) {
        targetAction.fadeOut(0.4);
      }
    };
  }, [currentState, actions]);

  // Antigravity micro-float drift
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const elapsed = clock.getElapsedTime();
      groupRef.current.position.y = position.y + Math.sin(elapsed * 1.5 + position.x) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scene} />
    </group>
  );
};