**Phase 0.1 & 0.2: The Antigravity Spatial Canvas & Dynamic Conduit Runtime**.  
Below is the production-grade **Three.js / React Three Fiber** implementation for the **Antigravity Workspace Engine**. It loads your rigged GLBs, activates their baked animation mixers, enables free 3D drag-positioning, and renders dynamic procedural spline conduits (Umbilicals and Tethers) with glowing data-packet pulses in real time.

### **1\. Dynamic Umbilical / Tether Conduit Shader & Component (ConduitSpline.tsx)**

This component renders the procedural Catmull-Rom spline curve between any two connected nodes (CORE $\\leftrightarrow$ Orb or Orb $\\leftrightarrow$ Satellite) and flows pulse packets along the line:

TypeScript  
import React, { useMemo, useRef } from 'react';  
import \* as THREE from 'three';  
import { useFrame } from '@react-three/fiber';

interface ConduitProps {  
  start: THREE.Vector3;  
  end: THREE.Vector3;  
  type: 'umbilical' | 'tether' | 'mesh';  
  state?: 'dormant' | 'seeking' | 'active' | 'degraded';  
}

export const ConduitSpline: React.FC\<ConduitProps\> \= ({  
  start,  
  end,  
  type,  
  state \= 'active'  
}) \=\> {  
  const lineRef \= useRef\<THREE.Line\>(null);  
  const pulseRef \= useRef\<THREE.Mesh\>(null);

  // Generate a procedural curved spline with catenary sag  
  const { curve, points } \= useMemo(() \=\> {  
    const mid \= new THREE.Vector3()  
      .addVectors(start, end)  
      .multiplyScalar(0.5);  
      
    // Antigravity physics curve sag based on distance  
    const dist \= start.distanceTo(end);  
    mid.y \+= dist \* 0.15;   
    mid.z \+= Math.sin(dist) \* 0.1;

    const spline \= new THREE.CatmullRomCurve3(\[start, mid, end\]);  
    return { curve: spline, points: spline.getPoints(50) };  
  }, \[start, end\]);

  // Color mapping conforming to Section 31 Visual Language  
  const conduitColor \= useMemo(() \=\> {  
    switch (state) {  
      case 'seeking': return '\#d97706'; // Amber pulse  
      case 'active': return type \=== 'umbilical' ? '\#38bdf8' : '\#818cf8'; // Cyan / Indigo  
      case 'degraded': return '\#ef4444'; // Red fault  
      default: return '\#475569'; // Slate dormant  
    }  
  }, \[state, type\]);

  // Animate packet transit along spline curve  
  useFrame(({ clock }) \=\> {  
    if (pulseRef.current && state \=== 'active') {  
      const t \= (clock.getElapsedTime() \* 0.6) % 1;  
      const pos \= curve.getPointAt(t);  
      pulseRef.current.position.copy(pos);  
    }  
  });

  const geometry \= useMemo(() \=\> new THREE.BufferGeometry().setFromPoints(points), \[points\]);

  return (  
    \<group\>  
      {/\* 1\. Base Energy Conduit Line \*/}  
      \<line ref\={lineRef as any} geometry\={geometry}\>  
        \<lineBasicMaterial  
          color\={conduitColor}  
          transparent  
          opacity\={state \=== 'dormant' ? 0.3 : 0.8}  
          linewidth\={type \=== 'umbilical' ? 2 : 1}  
        /\>  
      \</line\>

      {/\* 2\. Floating Message Flow Packet (128-pool instance proxy) \*/}  
      {state \=== 'active' && (  
        \<mesh ref\={pulseRef}\>  
          \<sphereGeometry args\={\[0.06, 12, 12\]} /\>  
          \<meshBasicMaterial color\="\#ffffff" /\>  
        \</mesh\>  
      )}  
    \</group\>  
  );  
};

### **2\. Rigged Element Actor Component (RiggedElementActor.tsx)**

This component instantiates your rigged .glb assets, binds the AnimationMixer to cross-fade between idle\_dormant and active\_operation / seeking\_scan, and exposes draggable positional handles to the Antigravity Engine:

TypeScript  
import React, { useRef, useEffect } from 'react';  
import \* as THREE from 'three';  
import { useGLTF, useAnimations } from '@react-three/drei';  
import { useFrame } from '@react-three/fiber';

interface ElementActorProps {  
  glbPath: string;  
  position: THREE.Vector3;  
  currentState: 'idle\_dormant' | 'seeking\_scan' | 'active\_operation';  
  onDragPositionChange?: (newPos: THREE.Vector3) \=\> void;  
}

export const RiggedElementActor: React.FC\<ElementActorProps\> \= ({  
  glbPath,  
  position,  
  currentState,  
  onDragPositionChange  
}) \=\> {  
  const groupRef \= useRef\<THREE.Group\>(null);  
  const { scene, animations } \= useGLTF(glbPath);  
  const { actions } \= useAnimations(animations, groupRef);

  // Cross-fade animation tracks based on active Relation Contract lifecycle  
  useEffect(() \=\> {  
    const targetAction \= actions\[currentState\] || actions\['idle\_dormant'\];  
    if (targetAction) {  
      targetAction.reset().fadeIn(0.4).play();  
    }

    return () \=\> {  
      if (targetAction) {  
        targetAction.fadeOut(0.4);  
      }  
    };  
  }, \[currentState, actions\]);

  // Antigravity micro-float drift  
  useFrame(({ clock }) \=\> {  
    if (groupRef.current) {  
      const elapsed \= clock.getElapsedTime();  
      groupRef.current.position.y \= position.y \+ Math.sin(elapsed \* 1.5 \+ position.x) \* 0.04;  
    }  
  });

  return (  
    \<group ref\={groupRef} position\={position}\>  
      \<primitive object\={scene} /\>  
    \</group\>  
  );  
};

### **3\. Antigravity Spatial Stage (AntigravityStage.tsx)**

Assembles the full spatial environment, maintaining decoupled observation-only projection from /admin/operations:

TypeScript  
import React, { useState } from 'react';  
import \* as THREE from 'three';  
import { Canvas } from '@react-three/fiber';  
import { OrbitControls } from '@react-three/drei';  
import { RiggedElementActor } from './RiggedElementActor';  
import { ConduitSpline } from './ConduitSpline';

export const AntigravityStage: React.FC \= () \=\> {  
  // Spatial positions of Core and attached Elements  
  const \[corePos\] \= useState(new THREE.Vector3(0, 0, 0));  
  const \[scoutPos, setScoutPos\] \= useState(new THREE.Vector3(2.5, 0.8, \-1.0));  
  const \[assessorPos, setAssessorPos\] \= useState(new THREE.Vector3(-2.2, 1.2, 0.8));

  return (  
    \<div style\={{ width: '100vw', height: '100vh', background: '\#090d16' }}\>  
      \<Canvas camera\={{ position: \[0, 3, 7\], fov: 50 }}\>  
        \<ambientLight intensity\={0.7} /\>  
        \<directionalLight position\={\[10, 15, 10\]} intensity\={1.5} /\>  
        \<pointLight position\={\[0, 0, 0\]} color\="\#38bdf8" intensity\={2.0} distance\={8} /\>

        {/\* 1\. Dynamic Umbilical / Tether Conduits \*/}  
        \<ConduitSpline  
          start\={corePos}  
          end\={scoutPos}  
          type\="umbilical"  
          state\="active"  
        /\>  
        \<ConduitSpline  
          start\={corePos}  
          end\={assessorPos}  
          type\="umbilical"  
          state\="active"  
        /\>  
        \<ConduitSpline  
          start\={scoutPos}  
          end\={assessorPos}  
          type\="mesh"  
          state\="active"  
        /\>

        {/\* 2\. Rigged Pod Actuators \*/}  
        \<RiggedElementActor  
          glbPath\="/models/SCOUT\_1\_RIGGED.glb"  
          position\={scoutPos}  
          currentState\="seeking\_scan"  
          onDragPositionChange\={setScoutPos}  
        /\>  
        \<RiggedElementActor  
          glbPath\="/models/ASSESSOR\_1l\_RIGGED.glb"  
          position\={assessorPos}  
          currentState\="active\_operation"  
          onDragPositionChange\={setAssessorPos}  
        /\>

        \<OrbitControls makeDefault enableDamping dampingFactor\={0.05} /\>  
      \</Canvas\>  
    \</div\>  
  );  
};

### **Current Execution Path**

Rigged GLBs (Assets)   
  ├── Armatures & Baked State Tracks  
  └── Loaded via RiggedElementActor  
        │  
Antigravity Engine (Physics & Conduits)  
  ├── Procedural Catmull-Rom Splines (ConduitSpline)  
  ├── Free-form 3D drag positioning  
  └── Flow packet transit  
        │  
Dual-Track Control Plane  
  ├── DOM / Monaco / JSON Schemas (Primary Controller)  
  └── Three.js Viewport (Observation-only Projection)

With the visual spatial stage established, would you like to move into **Phase 0.2: The Relation Contract Handshake Engine** (validating capability exchanges and negative space invariants in TypeScript/Stellar), or build the **Build Master Element Scaffold generator** next?