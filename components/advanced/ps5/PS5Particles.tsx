"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { colorsFromRange, css } from "@thi.ng/color";
import { useControls } from "leva";
import React, { type FC, useLayoutEffect, useMemo } from "react";
import { mx_noise_vec3, smoothstep } from "three/src/nodes/TSL.js";
import {
  array,
  atan,
  color,
  cos,
  deltaTime,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  mix,
  mod,
  mx_fractal_noise_vec3,
  mx_noise_float,
  PI,
  PI2,
  positionLocal,
  positionWorld,
  select,
  sin,
  storage,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { WebGPURenderer } from "three/webgpu";

// Work on re-creating the PS5 Loading screen: https://www.youtube.com/watch?v=bMxgJbCgPQQ

const colourCount = 100;

const rangeColors = [
  ...colorsFromRange("soft", {
    base: "sienna",
    num: 10,
    variance: 0.01,
  }),
  ...colorsFromRange("neutral", {
    base: "tan",
    num: 70,
    variance: 0.02,
  }),
  ...colorsFromRange("dark", {
    base: "darkgrey",
    num: 20,
    variance: 0.1,
  }),
];

const colors = array(rangeColors.map((c) => color(css(c))));

const particleCount = Math.pow(40, 2);

// Setup buffers
// Set initial positions
// Add colours
// Add fade in and fade out
// Update positions

const PS5Particles: FC = () => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer;

  const {
    key,
    positionNode,
    colorNode,
    scaleNode,
    opacityNode,
    updatePositions,
  } = useMemo(() => {
    // Create storage buffers for positions (w holds random seed) and velocities.
    const seeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      seeds[i] = Math.random();
    }

    const seedBuffer = instancedArray(seeds, "float");
    const positionBuffer = instancedArray(particleCount, "vec3");
    const colorBuffer = instancedArray(particleCount, "vec3");

    // Initialize particle positions
    const xSpacing = 0.01;
    const waveLength = particleCount * xSpacing;
    const xOffset = waveLength / 2;
    const zRange = 12;

    const computeInit = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      // Initiate Position
      const position = positionBuffer.element(instanceIndex);
      // Use the instanceIndex to compute a parameter "t"
      // Multiply by a spacing factor (0.1 here) to spread out the points
      const t = float(instanceIndex.add(3)).mul(xSpacing);

      const noiseInput = hash(instanceIndex.toVar().mul(10));
      const noise = mx_noise_float(noiseInput).mul(4);

      const x = t.sub(noise).sub(xOffset);
      const y = sin(t).add(noise);
      const z = hash(instanceIndex)
        .mul(zRange)
        .sub(zRange / 2)
        .add(noise.div(2));

      // Compute x as the parameter t, and y as the sine of t scaled by the amplitude.
      // You can leave z at 0 if you want a 2D sine wave.
      const wavePos = vec3(x, y, z);
      position.assign(wavePos);

      // Initiate Colour
      const c = colorBuffer.element(instanceIndex);
      const colorIndex = hash(instanceIndex.add(3)).mul(colourCount).floor();
      const randomColor = select(
        seed.greaterThan(0.98),
        color("#BBBCB5"),
        colors.element(colorIndex)
      );

      c.assign(randomColor);

      // Initiate velocity (random)

      // Generate a random spherical direction.
      // const rTheta = hash(instanceIndex).mul(PI2);
      // const rPhi = hash(instanceIndex.add(1)).mul(PI);
      // const rx = sin(rTheta).mul(cos(rPhi));
      // const ry = sin(rTheta).mul(sin(rPhi));
      // const vel = vec3(rx, ry, 0.0);
      // velocityBuffer.element(instanceIndex).assign(vel);
    })().compute(particleCount);

    renderer.computeAsync(computeInit);

    // Nodes for sprite node material
    const positionNode = positionBuffer.toAttribute();

    const colorNode = Fn(() => {
      // Compute the distance from the center of the UV (0.5, 0.5)
      const centeredUv = uv().distance(vec2(0.5)).toVar();
      // const posZ = positionLocal.z;
      const posZ = positionWorld.z;

      // Mimic a "bokeh" effect by softening the edges of the circle at varying distances
      // The Z position of particles ranges from -5 to 5
      // We'll focus circles (sharp edges) at a range of 0 - 1.
      const softness = select(
        posZ.lessThan(0.0),
        // Invert the mapping: at posZ = -5, smoothstep(-5,0,-5) returns 0, so 1 - 0 = 1 (fully soft);
        // at posZ = 0, smoothstep(-5,0,0) returns 1, so 1 - 1 = 0 (sharp)
        smoothstep(-5.0, 0.0, posZ).oneMinus(),
        select(
          posZ.greaterThan(1.0),
          // For Z from 1 (sharp) to 5 (soft)
          smoothstep(1.0, 5.0, posZ),
          // For Z between 0 and 1, no softness (fully sharp)
          0.0
        )
      );
      // Define a sharp circle: a narrow transition (e.g., from 0.45 to 0.5)
      const sharpCircle = smoothstep(0.49, 0.5, centeredUv).oneMinus();
      // Define a soft circle: a wider transition (e.g., from 0.25 to 0.5)
      const softCircle = smoothstep(0.0, 0.5, centeredUv).oneMinus();
      // Blend between the two based on the softness factor
      const circle = mix(sharpCircle, softCircle, softness);

      // Fade out in the background
      const fadeOut = smoothstep(zRange / 2, 0.5, posZ).oneMinus();
      const alpha = circle.mul(fadeOut).mul(0.5);

      const c = colorBuffer.element(instanceIndex);

      return vec4(c, alpha);
    })();

    const opacityNode = Fn(() => {
      // Use the seed to generate a fade-in fade-out effect over time
      const seed = seedBuffer.element(instanceIndex);
      const offset = hash(seed);
      const period = float(mix(1.0, 8.0, seed));
      const tCycle = float(mod(time.add(offset.mul(period)), period));
      const fadeDuration = period.mul(0.3);
      const fadeIn = smoothstep(0.0, fadeDuration, tCycle);
      const fadeOut = smoothstep(
        period.sub(fadeDuration),
        period,
        tCycle
      ).oneMinus();
      const flickerAlpha = fadeIn.mul(fadeOut);
      return flickerAlpha;
    })();

    const scaleNode = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);

      const scale = select(
        seed.greaterThan(0.97),
        vec2(3.0),
        vec2(mix(0.5, 2.0, seed))
      );

      return scale;
    })();

    const key = colorNode.uuid;

    const updatePositions = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const position = positionBuffer.element(instanceIndex);
      const s = seed.toVar().mul(2.0).min(1.0);
      const t = time.mul(0.3);
      const velX = mx_noise_float(s.add(t)).mul(0.003);
      const velY = mx_noise_float(sin(s.mul(t))).mul(0.003);
      const velZ = mx_noise_float(position.add(1)).mul(0.003);
      position.addAssign(vec3(velX, velY, velZ));
    })().compute(particleCount);

    return {
      key,
      positionNode,
      colorNode,
      scaleNode,
      opacityNode,
      updatePositions,
    };
  }, [renderer]);

  useFrame(() => {
    renderer.compute(updatePositions);
  });

  return (
    <instancedMesh
      args={[undefined, undefined, particleCount]}
      frustumCulled={false}
      position={[0, -1.5, 0]}
      rotation={[0, 0.2, Math.PI / 12]}
    >
      <planeGeometry args={[0.1, 0.1]} />
      <spriteNodeMaterial
        key={key}
        positionNode={positionNode}
        colorNode={colorNode}
        scaleNode={scaleNode}
        opacityNode={opacityNode}
        // rotationNode={rotationNode}
        // blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent={true}
      />
    </instancedMesh>
  );
};

export default PS5Particles;
