"use client";
import React, { useLayoutEffect, useMemo, useRef, type FC } from "react";
import * as THREE from "three/webgpu";
import {
  atan,
  cos,
  PI,
  PI2,
  sin,
  vec3,
  color,
  Fn,
  hash,
  If,
  exp2,
  instanceIndex,
  storage,
  deltaTime,
  uniform,
  mx_fractal_noise_vec3,
  mix,
  float,
  Break,
  uv,
  vec4,
  vec2,
  oneMinus,
  pow,
} from "three/tsl";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { smoothstep } from "three/src/nodes/TSL.js";

const SpriteEmitter: FC = () => {
  const particleCount = Math.pow(2, 10);
  const renderer = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const { octaves, lacunarity, gain, frequency, amplitude, friction } =
    useControls({
      octaves: { value: 2, min: 0, max: 10 },
      lacunarity: { value: 2.0, min: 0, max: 4 },
      gain: { value: 0.5, min: 0, max: 1 },
      frequency: { value: 5, min: 0, max: 20 },
      amplitude: { value: 0.5, min: 0, max: 2 },
      friction: { value: 0.01, min: 0, max: 0.1, step: 0.01 },
    });
  const {
    key,
    positionNode,
    colorNode,
    rotationNode,
    // opacityNode,
    updateParticles,
    spawnParticles,
  } = useMemo(() => {
    // Turbulence parameters that you can tweak.
    const turbFrequency = uniform(frequency);
    const turbAmplitude = uniform(amplitude);
    const turbOctaves = uniform(octaves);
    const turbLacunarity = uniform(lacunarity);
    const turbGain = uniform(gain);
    const turbFriction = uniform(friction);

    // Create storage buffers for positions (w holds lifetime) and velocities.
    const particlePositions = storage(
      new THREE.StorageInstancedBufferAttribute(particleCount, 4),
      "vec4",
      particleCount
    );
    const particleVelocities = storage(
      new THREE.StorageInstancedBufferAttribute(particleCount, 4),
      "vec4",
      particleCount
    );

    // Initialize particles offscreen and mark them as dead (lifetime < 0).
    renderer.computeAsync(
      Fn(() => {
        particlePositions.element(instanceIndex).xyz.assign(vec3(10000.0));
        particlePositions.element(instanceIndex).w.assign(vec3(-1.0));
      })().compute(particleCount)
    );

    // Nodes for sprite node material
    const positionNode = particlePositions.toAttribute();
    const rotationNode = atan(
      particleVelocities.toAttribute().y,
      particleVelocities.toAttribute().x
    );

    // Compute the distance from the center of the UV (0.5, 0.5)
    const centeredUv = uv().distance(vec2(0.5)).toVar();
    // Use smoothstep to create a smooth gradient across the radius.
    // Here, the gradient starts near the center and reaches 1.0 at 0.5.
    const edge = smoothstep(0.0, 0.5, centeredUv);
    // Invert the gradient so that the center is 1.0 (fully opaque) and the edge is 0.0,
    // then use pow() to accentuate the falloff (2.0 is an example exponent).
    const alpha = pow(oneMinus(edge), 2.0).mul(
      particlePositions.toAttribute().w
    );
    const colorNode = vec4(0.9, 0.4, 1.0, alpha);
    const key = colorNode.uuid;

    // const opacityNode = particlePositions.toAttribute().w;

    // Update function: move alive particles and decrease their lifetime.
    const updateParticles = Fn(() => {
      const pos = particlePositions.element(instanceIndex).xyz;
      const life = particlePositions.element(instanceIndex).w;
      const vel = particleVelocities.element(instanceIndex).xyz;
      const dt = deltaTime.mul(0.1);

      If(life.greaterThan(0.0), () => {
        // Apply a turbulence field using fractal noise.
        const localVel = mx_fractal_noise_vec3(
          pos.mul(turbFrequency),
          turbOctaves,
          turbLacunarity,
          turbGain,
          turbAmplitude
        ).mul(life.add(0.01));
        // Update velocity with turbulence.
        vel.addAssign(localVel);
        // Apply friction to the velocity.
        vel.mulAssign(turbFriction.oneMinus());
        // Update position based on velocity and time.
        pos.addAssign(vel.mul(dt));
        // Subtract lifetime.
        life.subAssign(dt);
      });
    })().compute(particleCount);

    const spawnCount = 256;

    // Spawn function: only reset particles that are dead.
    const spawnParticles = Fn(() => {
      const idx = instanceIndex; //spawnIndex.add(instanceIndex).mod(particleCount).toInt();
      const pos = particlePositions.element(idx).xyz;
      const life = particlePositions.element(idx).w;
      const vel = particleVelocities.element(idx).xyz;

      // Only spawn if the particle is dead (lifetime <= 0).
      If(life.lessThanEqual(0.0), () => {
        // Assign a random lifetime
        life.assign(mix(0.1, 0.6, hash(idx.add(2))));

        // Generate a random spherical direction.
        const rTheta = hash(idx).mul(PI2);
        const rPhi = hash(idx.add(1)).mul(PI);
        const rx = sin(rTheta).mul(cos(rPhi));
        const ry = sin(rTheta).mul(sin(rPhi));
        const rz = cos(rTheta);
        const rDir = vec3(rx, ry, rz);

        // Spawn at the origin and give an outward velocity.
        pos.assign(vec3(0.0));
        vel.assign(rDir.mul(5.0));
      });
    })().compute(spawnCount);

    return {
      key,
      positionNode,
      colorNode,
      rotationNode,
      // opacityNode,
      updateParticles,
      spawnParticles,
    };
  }, [
    amplitude,
    frequency,
    friction,
    gain,
    lacunarity,
    octaves,
    particleCount,
    renderer,
  ]);

  useFrame(() => {
    // Update particle physics and spawn new ones as needed.
    renderer.compute(updateParticles);
    renderer.compute(spawnParticles);
  });

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!instancedMeshRef.current) return;
    // Ensure the instance matrix updates dynamically.
    instancedMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, particleCount]}
      frustumCulled={false}
    >
      <planeGeometry args={[0.05, 0.05]} />
      <spriteNodeMaterial
        key={key}
        positionNode={positionNode}
        colorNode={colorNode}
        rotationNode={rotationNode}
        // opacityNode={opacityNode}
        depthWrite={false}
        transparent={true}
      />
    </instancedMesh>
  );
};

export default SpriteEmitter;
