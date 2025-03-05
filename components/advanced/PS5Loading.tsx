// "use client";
// import { useFrame, useThree } from "@react-three/fiber";
// import { useControls } from "leva";
// import React, { type FC, useLayoutEffect, useMemo, useRef } from "react";
// import { smoothstep } from "three/src/nodes/TSL.js";
// import {
//   atan,
//   color,
//   cos,
//   deltaTime,
//   Fn,
//   hash,
//   If,
//   instanceIndex,
//   mix,
//   mx_fractal_noise_vec3,
//   oneMinus,
//   PI,
//   PI2,
//   positionLocal,
//   positionWorld,
//   pow,
//   sin,
//   storage,
//   uniform,
//   uv,
//   vec2,
//   vec3,
//   vec4,
// } from "three/tsl";
// import * as THREE from "three/webgpu";

// const PS5Loading: FC = () => {
//   const particleCount = Math.pow(64, 2);
//   const renderer = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;

//   const {
//     key,
//     positionNode,
//     colorNode,
//     rotationNode,
//     // opacityNode,
//     updateParticles,
//     spawnParticles,
//   } = useMemo(() => {
//     // Turbulence parameters that you can tweak.
//     const noiseFrequency = uniform(frequency);
//     const noiseAmplitude = uniform(amplitude);
//     const noiseOctaves = uniform(octaves);
//     const noiseLacunarity = uniform(lacunarity);
//     const noiseDiminish = uniform(diminish);
//     const noiseFriction = uniform(friction);

//     // Create storage buffers for positions (w holds lifetime) and velocities.
//     const particlePositions = storage(
//       new THREE.StorageInstancedBufferAttribute(particleCount, 4),
//       "vec4",
//       particleCount
//     );
//     const particleVelocities = storage(
//       new THREE.StorageInstancedBufferAttribute(particleCount, 4),
//       "vec4",
//       particleCount
//     );

//     // Initialize particles offscreen and mark them as dead (lifetime < 0).
//     renderer.computeAsync(
//       Fn(() => {
//         particlePositions.element(instanceIndex).xyz.assign(vec3(10000.0));
//         particlePositions.element(instanceIndex).w.assign(vec3(-1.0));
//       })().compute(particleCount)
//     );

//     // Nodes for sprite node material
//     const positionNode = particlePositions.toAttribute();
//     const rotationNode = atan(
//       particleVelocities.toAttribute().y,
//       particleVelocities.toAttribute().x
//     );

//     const colorNode = Fn(() => {
//       // Compute the distance from the center of the UV (0.5, 0.5)
//       const centeredUv = uv().distance(vec2(0.5)).toVar();
//       const zAbs = positionWorld.z.abs();
//       const circle = smoothstep(
//         // Blurs the circle based on distance from 0
//         smoothstep(0.5, 0.0, zAbs).mul(0.5),
//         0.5,
//         centeredUv
//       ).oneMinus();
//       // Invert the gradient so that the center is 1.0 (fully opaque) and the edge is 0.0,
//       // then use pow() to accentuate the falloff (2.0 is an example exponent).
//       const life = particlePositions.toAttribute().w;
//       // // life starts at 1 and reduces to 0
//       // const fadeLife = life.oneMinus().abs();
//       // //  float tunnelFactor = smoothstep(0.0, 0.1, flow) * (1.0 - smoothstep(0.9, 1.0, flow));
//       // const lifeFadedIn = smoothstep(0.1, 0.3, fadeLife).mul(
//       //   smoothstep(0.8, 1.0, fadeLife).oneMinus()
//       // );
//       const alpha = circle.mul(life);

//       const dark = color("#626463").rgb;
//       const light = color("#fff").rgb;
//       const finalColor = mix(dark, light, life);

//       return vec4(finalColor, alpha);
//     })();

//     const key = colorNode.uuid;

//     // const opacityNode = particlePositions.toAttribute().w;

//     // Update function: move alive particles and decrease their lifetime.
//     const updateParticles = Fn(() => {
//       const pos = particlePositions.element(instanceIndex).xyz;
//       const life = particlePositions.element(instanceIndex).w;
//       const vel = particleVelocities.element(instanceIndex).xyz;
//       const dt = deltaTime.mul(0.1);

//       If(life.greaterThan(0.0), () => {
//         // Apply turbulence field using fractal noise.
//         const localVel = mx_fractal_noise_vec3(
//           pos.mul(noiseFrequency),
//           noiseOctaves,
//           noiseLacunarity,
//           noiseDiminish,
//           noiseAmplitude
//         ).mul(life.add(0.02));
//         // Update velocity with turbulence.
//         vel.addAssign(localVel);
//         // Apply friction to the velocity.
//         vel.mulAssign(noiseFriction.oneMinus());
//         // Update position based on velocity and time.
//         pos.addAssign(vel.mul(dt));
//         // Subtract lifetime.
//         life.subAssign(dt);
//       });
//     })().compute(particleCount);

//     // Spawn function: only reset particles that are dead.
//     const spawnParticles = Fn(() => {
//       const idx = instanceIndex; //spawnIndex.add(instanceIndex).mod(particleCount).toInt();
//       const pos = particlePositions.element(idx).xyz;
//       const life = particlePositions.element(idx).w;
//       const vel = particleVelocities.element(idx).xyz;

//       // Only spawn if the particle is dead (lifetime <= 0).
//       If(life.lessThanEqual(0.0), () => {
//         // Assign a random lifetime
//         life.assign(mix(0.1, 1.0, hash(idx.add(2))));

//         // Generate a random spherical direction.
//         const rTheta = hash(idx).mul(PI2);
//         const rPhi = hash(idx.add(1)).mul(PI);
//         const rx = sin(rTheta).mul(cos(rPhi));
//         const ry = sin(rTheta).mul(sin(rPhi));
//         const rz = cos(rTheta);
//         const rDir = vec3(rx, ry, rz);

//         // Spawn at the origin and give an outward velocity.
//         pos.assign(vec3(0.0));
//         vel.assign(rDir.mul(5.0));
//       });
//     })().compute(spawnCount);

//     return {
//       key,
//       positionNode,
//       colorNode,
//       rotationNode,
//       // opacityNode,
//       updateParticles,
//       spawnParticles,
//     };
//   }, [
//     amplitude,
//     frequency,
//     friction,
//     diminish,
//     lacunarity,
//     octaves,
//     particleCount,
//     renderer,
//     spawnCount,
//   ]);

//   const {
//     spawnCount,
//     octaves,
//     lacunarity,
//     diminish,
//     frequency,
//     amplitude,
//     friction,
//   } = useControls({
//     spawnCount: { value: particleCount / 2, min: 0, max: particleCount },
//   });

//   useFrame(() => {
//     // Update particle physics and spawn new ones as needed.
//     renderer.compute(updateParticles);
//   });

//   const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

//   useLayoutEffect(() => {
//     if (!instancedMeshRef.current) return;
//     // Ensure the instance matrix updates dynamically.
//     instancedMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
//   }, []);

//   return (
//     <instancedMesh
//       ref={instancedMeshRef}
//       args={[undefined, undefined, particleCount]}
//       frustumCulled={false}
//     >
//       <planeGeometry args={[0.1, 0.1]} />
//       <spriteNodeMaterial
//         key={key}
//         positionNode={positionNode}
//         colorNode={colorNode}
//         rotationNode={rotationNode}
//         blending={THREE.AdditiveBlending}
//         // opacityNode={opacityNode}
//         depthWrite={false}
//         transparent={true}
//       />
//     </instancedMesh>
//   );
// };

// export default PS5Loading;
