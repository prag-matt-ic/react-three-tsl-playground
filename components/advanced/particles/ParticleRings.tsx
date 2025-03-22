"use client";
import { useGSAP } from "@gsap/react";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { colorsFromRange, css } from "@thi.ng/color";
import gsap from "gsap";
import { useControls } from "leva";
import React, { type FC, useEffect, useMemo, useState } from "react";
import { mx_fractal_noise_float } from "three/src/nodes/TSL.js";
import {
  array,
  clamp,
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
  mx_noise_float,
  mx_noise_vec3,
  PI,
  PI2,
  positionWorld,
  select,
  sin,
  smoothstep,
  step,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { AdditiveBlending, WebGPURenderer } from "three/webgpu";

import textImg from "@/assets/matt.png";
// Generate color palette
// https://www.npmjs.com/package/@thi.ng/color

const COLOUR_COUNT = 100;

const PALETTE = [
  ...colorsFromRange("light", {
    base: "white",
    num: COLOUR_COUNT * 0.7,
    variance: 0.0,
  }),
  ...colorsFromRange("neutral", {
    base: "darkslategray",
    num: COLOUR_COUNT * 0.3,
    variance: 0.01,
  }),
];

const colors = array(PALETTE.map((c) => color(css(c))));

const PARTICLE_COUNT = Math.pow(296, 2);
console.log({ PARTICLE_COUNT });
const RING_RADIUS = 2.0;

const TheRing: FC = () => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer;
  const [textPoints, setTextPoints] = useState<Float32Array | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = textImg.src;
    image.onload = () => {
      // Sample the white points on the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0, image.width, image.height);
      const data = ctx.getImageData(0, 0, image.width, image.height).data;

      const textPointsWorldPos = [];

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200) {
          const pixelX = (i / 4) % image.width;
          const pixelY = Math.floor(i / 4 / image.width);

          // Normalize to [-1, 1] (adjust based on your scene setup)
          const normX = (pixelX / image.width) * 2 - 1;
          const normY = -((pixelY / image.height) * 2 - 1); // Invert Y if needed

          const x = normX * RING_RADIUS;
          const y = normY * RING_RADIUS;
          const z = 0;

          textPointsWorldPos.push(x, y, z);
        }
      }
      // Create float 32 array of white points
      const whitePoints = new Float32Array(textPointsWorldPos);
      setTextPoints(whitePoints);
    };
  }, []);

  const {
    key,
    positionNode,
    colorNode,
    scaleNode,
    opacityNode,
    updateParticles,
    spawnParticles,
  } = useMemo(() => {
    if (!textPoints) return {};
    console.log({ textPoints });
    // Create storage buffers for seeds and positions
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      seeds[i] = Math.random();
    }

    const seedBuffer = instancedArray(seeds, "float");
    const positionBuffer = instancedArray(PARTICLE_COUNT, "vec4"); // w stores the life
    const velocityBuffer = instancedArray(PARTICLE_COUNT, "vec4"); // w stores if it's a ring, or text particle (object 0 or 1)
    const colorBuffer = instancedArray(PARTICLE_COUNT, "vec3");
    const textPositionBuffer = instancedArray(textPoints ?? 0, "vec3");

    const ringRadius = float(RING_RADIUS);

    const computeInitialPositions = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const s = seed.mul(2.0).sub(1).toVar();

      const initialPos = positionBuffer.element(instanceIndex);
      // Initate some particles offscreen with a random lifetime.
      const initialLife = mix(0.0, 0.2, hash(instanceIndex.add(2.0)));
      initialPos.assign(vec4(-100.0, -1000.0, 0.0, initialLife));

      const initialVel = velocityBuffer.element(instanceIndex);
      const object = select(seed.lessThan(0.7), float(0.0), float(1.0));
      initialVel.assign(vec4(0.0, 0.0, 0.0, object));
    })().compute(PARTICLE_COUNT);

    const computeColor = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const c = colorBuffer.element(instanceIndex);
      const colorIndex = hash(instanceIndex.add(3)).mul(COLOUR_COUNT).floor();
      const randomColor = colors.element(colorIndex);

      const finalColor = select(hash(seed), randomColor, color("#fff"));
      c.assign(finalColor);
    })().compute(PARTICLE_COUNT);

    renderer.computeAsync([computeColor, computeInitialPositions]);

    // @ts-expect-error missing type in TSL
    const positionNode = positionBuffer.toAttribute().xyz;

    const colorNode = Fn(() => {
      const c = colorBuffer.element(instanceIndex);
      const centeredUv = uv().distance(vec2(0.5));
      const softCircle = smoothstep(0.35, 0.5, centeredUv).oneMinus();
      return vec4(c, softCircle);
    })();

    // @ts-expect-error missing type in TSL
    const opacityNode = positionBuffer.toAttribute().w;

    const scaleNode = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const baseScale = vec2(mix(0.3, 1.2, seed));

      // Add custom size attenuation based on the Z position
      const posZ = positionWorld.z;
      const backAttenuation = smoothstep(-5.0, 0.0, posZ);
      const forwardAttenuation = smoothstep(0.0, 8.0, posZ).oneMinus();
      const attenuation = backAttenuation.mul(forwardAttenuation);

      const scale = baseScale.mul(attenuation);
      return scale;
    })();

    const key = colorNode.uuid;

    const updateParticles = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const pos = positionBuffer.element(instanceIndex).xyz;
      const life = positionBuffer.element(instanceIndex).w;
      const vel = velocityBuffer.element(instanceIndex).xyz;
      const object = velocityBuffer.element(instanceIndex).w;
      const dt = deltaTime.mul(0.08);

      If(life.greaterThan(0.0), () => {
        const noise = mx_noise_vec3(pos.mul(0.5).add(time)).toVar();

        If(object.equal(1.0), () => {
          noise.mulAssign(0.05);
        }).Else(() => {
          noise.mulAssign(0.2);
        });
        // Update velocity with turbulence.
        vel.addAssign(noise);
        // Update position based on velocity and time.
        pos.addAssign(vel.mul(dt.mul(seed)));
        // Subtract lifetime.
        life.subAssign(dt);
      });
    })().compute(PARTICLE_COUNT);

    // Spawn function: only reset particles that are dead.
    const spawnParticles = Fn(() => {
      const idx = instanceIndex.toVar(); //spawnIndex.add(instanceIndex).mod(particleCount).toInt();
      const pos = positionBuffer.element(instanceIndex).xyz;

      const life = positionBuffer.element(instanceIndex).w;
      const vel = velocityBuffer.element(instanceIndex).xyz;
      const object = velocityBuffer.element(instanceIndex).w;
      const seed = seedBuffer.element(instanceIndex);
      const s = seed.mul(2.0).sub(1).toVar();

      // Spawn new particle if the current one is dead
      If(life.lessThanEqual(0.0), () => {
        // Assign a random lifetime
        life.assign(mix(0.02, 0.2, hash(idx.add(2))));

        If(object.equal(1.0), () => {
          // Spawn text particles
          const randomIndex = hash(instanceIndex)
            .mul(textPoints.length)
            .floor();
          const textPos = textPositionBuffer.element(randomIndex);
          pos.assign(textPos);
          const textVel = vec3(0.0, 0.0, -2.0);
          vel.assign(textVel);
        }).Else(() => {
          // Spawn on the ring
          const angleNoise = mx_noise_float(
            vec3(s.mul(20.0), pos.y.mul(2.0), time)
          ).mul(0.5);
          const angle = hash(instanceIndex.add(angleNoise)).mul(PI2);

          const ringNoise = mx_noise_float(
            vec3(
              pos.x.mul(3.0),
              hash(instanceIndex.add(angleNoise)),
              time.mul(0.2)
            )
          ).mul(0.4);

          const newPos = vec3(
            sin(angle).mul(ringRadius).add(ringNoise),
            cos(angle).mul(ringRadius).add(ringNoise),
            0.0
          );
          pos.assign(newPos);
          // Generate an outward velocity based on the angle
          const newVel = vec3(
            sin(angle).mul(seed.mul(2.0)),
            cos(angle).mul(s.mul(2.0)),
            s.mul(40.0)
          );
          vel.assign(newVel);
        });
      });
    })().compute(PARTICLE_COUNT);

    return {
      key,
      positionNode,
      colorNode,
      scaleNode,
      opacityNode,
      updateParticles,
      spawnParticles,
    };
  }, [renderer, textPoints]);

  useFrame(() => {
    if (!textPoints) return;
    if (!renderer) return;
    if (!updateParticles || !spawnParticles) return;
    renderer.compute(updateParticles);
    renderer.compute(spawnParticles);
  });

  if (!textPoints) return null;

  return (
    <>
      <instancedMesh
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[0.04, 0.04]} />
        <spriteNodeMaterial
          key={key}
          positionNode={positionNode}
          colorNode={colorNode}
          scaleNode={scaleNode}
          opacityNode={opacityNode}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent={true}
        />
      </instancedMesh>
    </>
  );
};

export default TheRing;
