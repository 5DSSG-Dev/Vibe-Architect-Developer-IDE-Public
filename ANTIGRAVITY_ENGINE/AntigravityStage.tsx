import React, { useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RiggedElementActor } from './RiggedElementActor';
import { ConduitSpline } from './ConduitSpline';

export const AntigravityStage: React.FC = () => {
  // Spatial positions of Core and attached Elements
  const [corePos] = useState(new THREE.Vector3(0, 0, 0));
  const [scoutPos, setScoutPos] = useState(new THREE.Vector3(2.5, 0.8, -1.0));
  const [assessorPos, setAssessorPos] = useState(new THREE.Vector3(-2.2, 1.2, 0.8));

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16' }}>
      <Canvas camera={{ position: [0, 3, 7], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[0, 0, 0]} color="#38bdf8" intensity={2.0} distance={8} />

        {/* 1. Dynamic Umbilical / Tether Conduits */}
        <ConduitSpline
          start={corePos}
          end={scoutPos}
          type="umbilical"
          state="active"
        />
        <ConduitSpline
          start={corePos}
          end={assessorPos}
          type="umbilical"
          state="active"
        />
        <ConduitSpline
          start={scoutPos}
          end={assessorPos}
          type="mesh"
          state="active"
        />

        {/* 2. Rigged Pod Actuators */}
        <RiggedElementActor
          glbPath="/models/SCOUT_1_RIGGED.glb"
          position={scoutPos}
          currentState="seeking_scan"
          onDragPositionChange={setScoutPos}
        />
        <RiggedElementActor
          glbPath="/models/ASSESSOR_1l_RIGGED.glb"
          position={assessorPos}
          currentState="active_operation"
          onDragPositionChange={setAssessorPos}
        />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};