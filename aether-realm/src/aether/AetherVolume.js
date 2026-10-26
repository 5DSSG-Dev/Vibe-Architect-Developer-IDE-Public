import * as THREE from "three";


export class AetherVolume extends THREE.Object3D {


    constructor(camera) {


        super();


        this.camera = camera;



        const geometry =
            new THREE.BoxGeometry(
                6,
                6,
                6
            );



        this.material =
            new THREE.ShaderMaterial({

                transparent: true,
                toneMapped: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,

                uniforms: {

                    uTime: {
                        value: 0
                    },

                    uCameraPos: {
                        value: new THREE.Vector3()
                    }

                },


                vertexShader: `

                    varying vec3 vWorldPosition;

                    void main(){
                        vec4 worldPos = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPos.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }

                `,


                fragmentShader: `

                    precision highp float;


                    uniform float uTime;
                    uniform vec3 uCameraPos;


                    varying vec3 vWorldPosition;



                    float hash(vec3 p)
                    {

                        p =
                            fract(
                                p * 0.3183099 + 0.1
                            );


                        p *= 17.0;


                        return fract(
                            p.x *
                            p.y *
                            p.z *
                            (
                                p.x +
                                p.y +
                                p.z
                            )
                        );

                    }




                    float noise(vec3 p)
                    {

                        vec3 i =
                            floor(p);


                        vec3 f =
                            fract(p);



                        f =
                            f*f*
                            (
                                3.0 -
                                2.0*f
                            );



                        return mix(

                            mix(

                                mix(
                                    hash(i),
                                    hash(
                                        i +
                                        vec3(
                                            1.0,
                                            0.0,
                                            0.0
                                        )
                                    ),
                                    f.x
                                ),


                                mix(

                                    hash(
                                        i +
                                        vec3(
                                            0.0,
                                            1.0,
                                            0.0
                                        )
                                    ),

                                    hash(
                                        i +
                                        vec3(
                                            1.0,
                                            1.0,
                                            0.0
                                        )
                                    ),

                                    f.x

                                ),

                                f.y

                            ),


                            mix(

                                mix(

                                    hash(
                                        i +
                                        vec3(
                                            0.0,
                                            0.0,
                                            1.0
                                        )
                                    ),


                                    hash(
                                        i +
                                        vec3(
                                            1.0,
                                            0.0,
                                            1.0
                                        )
                                    ),

                                    f.x

                                ),


                                mix(

                                    hash(
                                        i +
                                        vec3(
                                            0.0,
                                            1.0,
                                            1.0
                                        )
                                    ),


                                    hash(
                                        i +
                                        vec3(
                                            1.0,
                                            1.0,
                                            1.0
                                        )
                                    ),

                                    f.x

                                ),

                                f.y

                            ),


                            f.z

                        );

                    }





                    void main()
                    {


                        vec3 localPos = vWorldPosition - uCameraPos;
                        float radius = length(localPos);
                        vec3 rayDir = normalize(-localPos);



                        vec3 rayPos = vWorldPosition;



                        vec3 col =
                            vec3(0.0);



                        float alpha =
                            0.0;




                        for(int i = 0; i < 96; i++)
                        {


                            vec3 p =
                                rayPos;



                            float n = 0.0;



                            n +=
                                noise(
                                    p * 0.65 +
                                    uTime * 0.006
                                )
                                *
                                0.9;



                            n +=
                                noise(
                                    p * 1.5 -
                                    uTime * 0.011
                                )
                                *
                                0.42;



                            n +=
                                noise(
                                    p * 3.4 +
                                    uTime * 0.018
                                )
                                *
                                0.22;



                            n +=
                                noise(
                                    p * 0.004
                                )
                                *
                                0.16;



                            n /=
                                1.7;




                            float shell =
                                smoothstep(
                                    0.82,
                                    1.0,
                                    length(p)
                                );


                            float fineDetail =
                                noise(
                                    p * 8.6 +
                                    uTime * 0.032
                                )
                                *
                                0.16
                            +
                                noise(
                                    p * 12.4 -
                                    uTime * 0.045
                                )
                                *
                                0.10;

                            fineDetail =
                                smoothstep(
                                    0.22,
                                    0.8,
                                    fineDetail
                                );

                            float density =
                                smoothstep(
                                    0.24,
                                    0.82,
                                    smoothstep(
                                        0.18,
                                        0.92,
                                        n
                                    )
                                )
                                *
                                (1.0 - shell * 0.35);

                            density = mix(
                                density,
                                density + fineDetail * 0.42,
                                0.64
                            );




                            float sphereGlow =
                                exp(
                                    -pow(
                                        abs(
                                            length(p) -
                                            0.32
                                        ),
                                        2.0
                                    )
                                    *
                                    14.0
                                );



                            density +=
                                sphereGlow *
                                0.75;

                            float smokeVeil =
                                smoothstep(
                                    0.18,
                                    0.82,
                                    length(p)
                                )
                                *
                                0.48
                                *
                                (1.0 - shell);

                            density +=
                                smokeVeil;

                            density = pow(density, 0.92);

                            density *=
                                1.0 -
                                smoothstep(
                                    0.78,
                                    1.06,
                                    length(p)
                                );


                            density =
                                clamp(
                                    density,
                                    0.0,
                                    1.0
                                );


                            vec3 aetherColor =
                                mix(
                                    vec3(0.1, 0.65, 0.95),
                                    vec3(0.95, 0.18, 0.85),
                                    shell * 0.7
                                )
                                *
                                (0.9 + shell * 0.35);



                            float contribution =
                                density *
                                0.28 *
                                (1.0 - alpha);



                            col +=
                                aetherColor *
                                contribution;



                            alpha +=
                                density *
                                0.12 *
                                (1.0 - alpha);



                            if(alpha > 0.95)
                                break;



                            rayPos +=
                                rayDir *
                                0.05;


                        }



                        gl_FragColor =
                            vec4(
                                col * 2.2,
                                clamp(alpha, 0.0, 1.0)
                            );


                    }

                `


            });



        this.mesh =
            new THREE.Mesh(
                geometry,
                this.material
            );



        this.add(
            this.mesh
        );


    }




    update(time)
    {

        this.material.uniforms.uTime.value =
            time;

        this.position.copy(
            this.camera.position
        );

        this.updateMatrixWorld(true);

        const localCameraPos =
            this.camera.position.clone();

        // Keep the volume centered in world space so it renders as a field around
        // the scene rather than following the camera itself.
        this.material.uniforms.uCameraPos.value.copy(
            localCameraPos
        );

    }


}