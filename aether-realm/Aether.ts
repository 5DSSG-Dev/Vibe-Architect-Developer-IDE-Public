import { AmbientLight, DirectionalLight, Scene, SphericalHarmonics3, Vector3, PlaneGeometry, Mesh, ShaderMaterial, Vector2 } from 'three';

/**
 * Represents the environmental lighting and atmospheric properties of a scene.
 * The Aether controls the ambient and directional lighting, as well as
 * image-based lighting through spherical harmonics.
 */
export class Aether {
    private scene: Scene;
    private ambientLight: AmbientLight;
    private directionalLight: DirectionalLight;
    private environmentLight: SphericalHarmonics3;
    private backgroundMesh: Mesh;
    private backgroundMaterial: ShaderMaterial;


    /**
     * Constructs the Aether for a given scene.
     * @param scene The THREE.Scene to which the Aether's lighting will be applied.
     */
    constructor(scene: Scene) {
        this.scene = scene;

        // A soft, white ambient light to provide base illumination
        this.ambientLight = new AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // A directional light to simulate a primary light source like the sun
        this.directionalLight = new DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 10, 7.5);
        this.scene.add(this.directionalLight);

        // Initialize spherical harmonics for environment lighting.
        // This starts with no light contribution.
        this.environmentLight = new SphericalHarmonics3();
        // SphericalHarmonics3 is not a Texture, so it cannot be assigned directly to scene.environment.
        this.scene.environment = null;

        // Create a background plane that covers the viewport
        const geometry = new PlaneGeometry(2, 2);
        this.backgroundMaterial = new ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_resolution: { value: new Vector2() }
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
                
                // 2D Simplex Noise
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                // Fractional Brownian Motion
                float fbm(vec2 st) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    float frequency = 0.0;
                    for (int i = 0; i < 4; i++) {
                        value += amplitude * snoise(st);
                        st *= 2.0;
                        amplitude *= 0.5;
                    }
                    return value;
                }

                void main() {
                    vec2 st = vUv * 3.0; // Scale UV coordinates
                    vec2 q = vec2(fbm(st + u_time * 0.02), fbm(st + vec2(1.0)));
                    vec2 r = vec2(fbm(st + q * 4.0 + u_time * 0.05), fbm(st + q * 4.0 + vec2(1.0)));
                    float noise = fbm(st + r);
                    
                    vec3 color = vec3(0.02, 0.02, 0.1) + vec3(noise * 0.1, noise * 0.1, noise * 0.3); // Adjusted for a blue/purple palette
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            depthTest: false
        });
        this.backgroundMesh = new Mesh(geometry, this.backgroundMaterial);
        this.backgroundMesh.renderOrder = -1; // Render first
        this.scene.add(this.backgroundMesh);
    }

    /**
     * Sets the color and intensity of the ambient light.
     * @param color The color of the ambient light.
     * @param intensity The intensity of the ambient light.
     */
    setAmbient(color: number, intensity: number): void {
        this.ambientLight.color.set(color);
        this.ambientLight.intensity = intensity;
    }

    /**
     * Sets the color, intensity, and position of the directional light.
     * @param color The color of the directional light.
     * @param intensity The intensity of the directional light.
     * @param position The position of the directional light.
     */
    setDirectional(color: number, intensity: number, position: Vector3): void {
        this.directionalLight.color.set(color);
        this.directionalLight.intensity = intensity;
        this.directionalLight.position.copy(position);
    }

    /**
     * Sets the directional light's position from a horizontal angle, keeping it elevated.
     * @param angleRad The horizontal angle in radians.
     */
    setDirectionalAngle(angleRad: number): void {
        const distance = 10; // Keep the light source at a fixed distance
        const y = 10; // Keep the light source elevated
        const x = Math.sin(angleRad) * distance;
        const z = Math.cos(angleRad) * distance;
        this.directionalLight.position.set(x, y, z);
    }
    /**
     * Updates the environment lighting from spherical harmonics coefficients.
     * @param coefficients An array of 9 Vector3 coefficients for the spherical harmonics.
     */
    setEnvironment(coefficients: Vector3[]): void {
        this.environmentLight.set(coefficients);
    }

    /**
     * Gets the current environment lighting spherical harmonics.
     * @returns The SphericalHarmonics3 instance for the environment.
     */
    getEnvironment(): SphericalHarmonics3 {
        return this.environmentLight;
    }

    /**
     * Updates the background shader's time uniform.
     * @param time The current elapsed time.
     */
    update(time: number): void {
        this.backgroundMaterial.uniforms.u_time.value = time;
    }

    setSize(width: number, height: number): void {
        this.backgroundMaterial.uniforms.u_resolution.value.x = width;
        this.backgroundMaterial.uniforms.u_resolution.value.y = height;
    }
}