import * as THREE from 'three';

/**
 * Aether is a dedicated lighting manager for the Three.js scene. It handles
 * the creation, configuration, and dynamic updates of ambient and directional
 * lights, centralizing lighting control and simplifying the main scene component.
 */
export class Aether {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private backgroundMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private backgroundMaterial: THREE.ShaderMaterial;
  public ambientIntensity: number;
  public directionalIntensity: number;
  public directionalAngle: number;

  constructor(scene: THREE.Scene, {
    ambientIntensity = 0.8,
    directionalIntensity = 1.0,
    directionalAngle = 0.9
  } = {}) {
    this.scene = scene;
    this.ambientIntensity = ambientIntensity;
    this.directionalIntensity = directionalIntensity;
    this.directionalAngle = directionalAngle;

    this.ambientLight = new THREE.AmbientLight(0xffffff, this.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.directionalIntensity);
    this.scene.add(this.directionalLight);
    this.updateDirectionalAngle();

    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 u_resolution;
        uniform float u_time;
        varying vec2 vUv;

        vec3 permute(vec3 x) {
          return mod(((x * 34.0) + 1.0) * x, 289.0);
        }

        float snoise(vec2 v) {
          const vec4 C = vec4(
            0.211324865405187,
            0.366025403784439,
            -0.577350269189626,
            0.024390243902439
          );
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute(
            permute(i.y + vec3(0.0, i1.y, 1.0))
              + i.x
              + vec3(0.0, i1.x, 1.0)
          );
          vec3 m = max(
            0.5 - vec3(
              dot(x0, x0),
              dot(x12.xy, x12.xy),
              dot(x12.zw, x12.zw)
            ),
            0.0
          );
          m *= m;
          m *= m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159
            - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Wide, gently rotated octaves avoid the narrow folded veins of
        // domain-warped marble while retaining natural atmospheric detail.
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float total = 0.0;
          mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);

          for (int i = 0; i < 4; i++) {
            value += amplitude * snoise(p);
            total += amplitude;
            p = rotation * p * 1.85 + vec2(7.1, 3.7);
            amplitude *= 0.48;
          }

          return value / total;
        }

        void main() {
          vec2 p = vUv - 0.5;
          p.x *= u_resolution.x / max(u_resolution.y, 1.0);
          p *= 1.15;

          float t = u_time * 0.06;
          vec2 farDrift = vec2(-t, t * 0.5);
          vec2 nearDrift = vec2(t * 0.35, -t * 0.18);

          // Mild coordinate warping gives the clouds soft curls rather than
          // the high-contrast folds that read as flowing liquid.
          vec2 warp = 0.20 * vec2(
            fbm(p * 0.55 + farDrift * 0.25),
            fbm(p * 0.55 + vec2(4.7, -2.3) - farDrift * 0.20)
          );

          float farField = fbm((p + warp) * 1.10 + farDrift);
          float nearField = fbm(
            (p - warp * 0.35) * 1.85 + nearDrift + vec2(8.0, 2.0)
          );
          float farSmoke = smoothstep(-0.55, 0.55, farField);
          float nearSmoke = smoothstep(-0.35, 0.60, nearField);

          vec3 baseColor = vec3(0.006, 0.009, 0.025);
          vec3 farColor = vec3(0.030, 0.038, 0.085);
          vec3 nearColor = vec3(0.075, 0.075, 0.150);
          vec3 color = mix(baseColor, farColor, 0.18 + farSmoke * 0.50);
          color = mix(color, nearColor, nearSmoke * 0.22);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    });
    this.backgroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.backgroundMaterial
    );
    this.backgroundMesh.frustumCulled = false;
    this.backgroundMesh.renderOrder = -1;
    this.scene.add(this.backgroundMesh);
  }

  private updateDirectionalAngle() {
    const radius = 10;
    this.directionalLight.position.set(Math.cos(this.directionalAngle) * radius, radius, Math.sin(this.directionalAngle) * radius);
  }

  public setSize(width: number, height: number): void {
    this.backgroundMaterial.uniforms.u_resolution.value.set(width, height);
  }

  public setAmbient(color: THREE.ColorRepresentation, intensity: number): void {
    this.ambientLight.color.set(color);
    this.ambientIntensity = intensity;
    this.ambientLight.intensity = intensity;
  }

  public setDirectional(
    color: THREE.ColorRepresentation,
    intensity: number,
    position: THREE.Vector3
  ): void {
    this.directionalLight.color.set(color);
    this.directionalIntensity = intensity;
    this.directionalLight.intensity = intensity;
    this.directionalLight.position.copy(position);
  }

  public setDirectionalAngle(angle: number): void {
    this.directionalAngle = angle;
    this.updateDirectionalAngle();
  }

  public update(elapsedTime = 0): void {
    this.ambientLight.intensity = this.ambientIntensity;
    this.directionalLight.intensity = this.directionalIntensity;
    this.updateDirectionalAngle();
    this.backgroundMaterial.uniforms.u_time.value = elapsedTime;
  }
}
