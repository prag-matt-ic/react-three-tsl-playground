"use client";
import { useGSAP } from "@gsap/react";
import { useFrame, useThree } from "@react-three/fiber";
import { colorsFromRange, css } from "@thi.ng/color";
import gsap from "gsap";
import React, { type FC, useMemo } from "react";
import {
  array,
  clamp,
  color,
  cos,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  mix,
  mod,
  mx_noise_float,
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
import { AdditiveBlending, DoubleSide, WebGPURenderer } from "three/webgpu";

// Generate color palette
// https://www.npmjs.com/package/@thi.ng/color

const CYAN_10 = "#B3F7FF";
const CYAN_20 = "#5AD4E6";
const CYAN_30 = "#00A3B9";
const CYAN_40 = "#016775";

const cyan10Color = color(CYAN_10);
const cyan20Color = color(CYAN_20);
const cyan30Color = color(CYAN_30);
const cyan40Color = color(CYAN_40);

const PARTICLE_COUNT = Math.pow(32, 2);

const GraphNodes: FC = () => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer;

  const {
    key,
    positionNode,
    colorNode,
    scaleNode,
    opacityNode,
    // updatePositions,
    linksPositionNode,
    uEnterValue,
  } = useMemo(() => {
    // Create storage buffers for seeds and positions
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      seeds[i] = Math.random();
    }

    // uEnterValue drives the transition from initial to target positions
    const uEnterValue = uniform(float(1.0));

    const seedBuffer = instancedArray(seeds, "float");
    // w stores the ring index.
    const ringsPositionBuffer = instancedArray(PARTICLE_COUNT, "vec4");

    // const colorBuffer = instancedArray(PARTICLE_COUNT, "vec3");
    const zRange = float(5.0);

    const computePositions = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const s = seed.mul(2.0).sub(1).toVar();

      const ringsPosition = ringsPositionBuffer.element(instanceIndex);

      const noiseInputA = hash(instanceIndex.toVar().mul(10));
      const noiseInputB = hash(s.mul(20));
      const noiseA = mx_noise_float(noiseInputA).toVar();
      const noiseB = mx_noise_float(noiseInputB).toVar();

      // Position on a sphere shape
      const ringPos = vec4(0.0).toVar();
      const ringIndex = select(seed.greaterThan(0.6), 0, 1);

      If(ringIndex.equal(0), () => {
        // 1st ring
        const ringRadius = 1.4;
        const ringOffset = vec3(0.0, -1.0, 0.0);
        const angle = hash(instanceIndex).mul(Math.PI * 2);
        const pos = vec3(
          sin(angle).mul(ringRadius).add(s.mul(0.2)),
          cos(angle).mul(ringRadius).add(noiseA.mul(0.4)),
          noiseA.mul(seed)
        ).add(ringOffset);
        ringPos.assign(vec4(pos, 0.0));
      }).Else(() => {
        // 2nd ring
        const ringRadius = 0.9;
        const ringOffset = vec3(1.2, 1.5, 0.0);
        const angle = hash(instanceIndex).mul(Math.PI * 2);
        const pos = vec3(
          sin(angle).mul(ringRadius).add(s.mul(0.2)),
          cos(angle).mul(ringRadius).add(noiseA.mul(0.4)),
          noiseA.mul(seed)
        ).add(ringOffset);
        ringPos.assign(vec4(pos, 1.0));
      });

      ringsPosition.assign(ringPos);

      // Offset a selection of wave particles along the Y axis
      // const shouldOffsetY = seed.lessThan(0.1);
      // const offsetPos = vec3(0.0, noiseA.sub(noiseB).mul(24), 0.0).add(
      //   spherePos
      // );

      // Randomize the position of some particles within a box
      // const shouldRandomlyPlace = seed.greaterThan(0.6).and(seed.lessThan(0.7));
      // const randomPos = vec3(
      //   hash(instanceIndex.sub(1))
      //     .mul(6)
      //     .sub(6 / 2),
      //   noiseInputA.mul(2).sub(1).mul(10),
      //   hash(seed.add(instanceIndex)).mul(2).sub(1).mul(5)
      // );

      // const finalPos = select(
      //   shouldOffsetY,
      //   offsetPos,
      //   select(shouldRandomlyPlace, randomPos, spherePos)
      // ).toVar();

      // // Compute initial position based on the final position
      // const initialPosition = initialPositionBuffer.element(instanceIndex);
      // const initialPos = finalPos.add(
      //   vec3(s.mul(8), s.mul(6).add(noiseA), seed.mul(32))
      // );
      // initialPosition.assign(initialPos);

      // // Initialize current position to the initial position
      // const currentPosition = currentPositionBuffer.element(instanceIndex);
      // currentPosition.assign(finalPos);
    })().compute(PARTICLE_COUNT);

    const positionNode = ringsPositionBuffer.toAttribute().xyz;

    const colorNode = Fn(() => {
      const ringIndex = ringsPositionBuffer.toAttribute().w;
      const centeredUv = uv().distance(vec2(0.5));
      const sharpCircle = step(0.5, centeredUv).oneMinus();
      const c = select(ringIndex.equal(0.0), cyan30Color, cyan20Color);
      return vec4(c, sharpCircle);
    })();

    const opacityNode = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const opacity = clamp(hash(seed), 0.8, 1.0);
      return float(opacity);
    })();

    const scaleNode = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const scale = vec2(mix(0.5, 1.0, seed));
      return scale;
    })();

    // LINKS
    const nbVertices = PARTICLE_COUNT * 8;
    const linksPositions = instancedArray(nbVertices, "vec4");

    const linksPositionNode = linksPositions.toAttribute().xyz;

    const computeLinkPositions = Fn(() => {})().compute(nbVertices);

    renderer.computeAsync([computePositions, computeLinkPositions]);

    const key = colorNode.uuid;

    // const updatePositions = Fn(() => {
    //   const seed = seedBuffer.element(instanceIndex);
    //   const initialPosition = ringsPositionBuffer.element(instanceIndex);
    //   const finalPosition = finalPositionBuffer.element(instanceIndex);
    //   const currentPosition = currentPositionBuffer.element(instanceIndex);

    //   // Animate the final position to make the particles float around
    //   const t = time.mul(0.3);
    //   const s = seed.mul(2.0).sub(1); // convert seed to a value between -1 and 1
    //   const velX = mx_noise_float(t).mul(s).mul(0.01);
    //   const velY = sin(s.add(t)).mul(0.006);
    //   const velZ = mx_noise_float(currentPosition.add(1)).mul(0.01);
    //   finalPosition.addAssign(vec3(velX, velY, velZ));
    //   initialPosition.addAssign(vec3(velX, velY, velZ));

    //   // Move from initial to final position during enter transition
    //   const position = mix(initialPosition, finalPosition, uEnterValue).toVar();

    //   // Set the current position to the base position plus the noise offset.
    //   currentPosition.assign(position);
    // })().compute(PARTICLE_COUNT);

    return {
      key,
      positionNode,
      colorNode,
      scaleNode,
      opacityNode,
      linksPositionNode,
      // updatePositions,
      uEnterValue,
    };
  }, [renderer]);

  useFrame(() => {
    // renderer.compute(updatePositions);
  });

  return (
    <>
      <color attach="background" args={["#fff"]} />
      <instancedMesh
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[0.032, 0.032]} />
        <spriteNodeMaterial
          key={key}
          positionNode={positionNode}
          colorNode={colorNode}
          scaleNode={scaleNode}
          opacityNode={opacityNode}
          depthWrite={false}
          transparent={true}
        />
      </instancedMesh>

      <instancedMesh
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
        position={[0, 0, 0]}
      >
        <bufferGeometry />
        <meshBasicNodeMaterial
          key={key}
          positionNode={linksPositionNode}
          depthWrite={false}
          vertexColors={true}
          side={DoubleSide}
        />
      </instancedMesh>
    </>
  );
};

export default GraphNodes;
