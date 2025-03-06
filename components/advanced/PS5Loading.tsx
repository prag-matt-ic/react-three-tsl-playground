"use client";
import { useFrame, useThree } from "@react-three/fiber";

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
  mx_fractal_noise_vec3,
  mx_noise_float,
  PI,
  PI2,
  positionLocal,
  positionWorld,
  select,
  sin,
  storage,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

import { colorsFromRange, css } from "@thi.ng/color";

// Work on re-creating the PS5 Loading screen: https://www.youtube.com/watch?v=bMxgJbCgPQQ

const colourCount = 100;

const rangeColors = [
  ...colorsFromRange("neutral", {
    base: "sienna",
    num: 20,
    variance: 0.01,
  }),
  ...colorsFromRange("neutral", {
    base: "tan",
    num: 48,
    variance: 0.02,
  }),
  ...colorsFromRange("soft", {
    base: "darkgrey",
    num: 30,
    variance: 0.02,
  }),
  ...colorsFromRange("cool", {
    base: "white",
    num: 2,
    variance: 0.01,
  }),
];

const colors = array(rangeColors.map((c) => color(css(c))));

const particleCount = Math.pow(40, 2);

const PS5Loading: FC = () => {
  const renderer = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;

  const { key, positionNode, colorNode, scaleNode, updateParticles } =
    useMemo(() => {
      // Create storage buffers for positions (w holds random seed) and velocities.
      const positionBuffer = instancedArray(particleCount, "vec3");
      const velocityBuffer = instancedArray(particleCount, "vec3");
      const colorBuffer = instancedArray(particleCount, "vec3");

      // Initialize particle positions
      const xSpacing = 0.01;
      const waveLength = particleCount * xSpacing;
      const xOffset = waveLength / 2;
      const zRange = 12;

      const computeInit = Fn(() => {
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

        const c = colorBuffer.element(instanceIndex);
        const colorIndex = hash(instanceIndex.add(3)).mul(colourCount).floor();
        const randomColor = colors.element(colorIndex);
        c.assign(randomColor);
      })().compute(particleCount);

      renderer.computeAsync(computeInit);

      // Nodes for sprite node material
      const positionNode = positionBuffer.toAttribute();

      // const rotationNode = atan(
      //   velocityBuffer.toAttribute().y,
      //   velocityBuffer.toAttribute().x
      // );

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

      const scaleNode = Fn(() => {
        const random = hash(instanceIndex.add(2));
        const scale = mix(1.0, 2.0, random);
        return vec2(scale);
      })();

      const key = colorNode.uuid;

      const updateParticles = Fn(() => {
        const pos = positionBuffer.element(instanceIndex);
        const vel = velocityBuffer.element(instanceIndex).xyz;
        const dt = deltaTime.mul(0.1);
        // const localVel = mx_noise_vec3(pos);
        // Update velocity with turbulence.
        // vel.addAssign(localVel);
        // Update position based on velocity and time.
        pos.addAssign(vel.mul(dt));
      })().compute(particleCount);

      return {
        key,
        positionNode,
        colorNode,
        scaleNode,
        updateParticles,
      };
    }, [renderer]);

  useFrame(() => {
    // renderer.compute(updateParticles);
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
        // rotationNode={rotationNode}
        // blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent={true}
      />
    </instancedMesh>
  );
};

export default PS5Loading;
