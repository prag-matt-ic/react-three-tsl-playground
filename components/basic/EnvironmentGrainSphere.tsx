"use client";
import { Sphere } from "@react-three/drei";
import React, { type FC, useMemo } from "react";
import { BackSide } from "three";
import {
  color,
  Fn,
  mix,
  mx_noise_float,
  positionWorld,
  type ShaderNodeObject,
  time,
  uv,
} from "three/tsl";
import { Node, VarNode } from "three/webgpu";

const EnvironmentGrainSphere: FC = () => {
  const { key, colorNode } = useMemo(() => {
    // base colours
    const lightColour = color("#2E2A37");
    const midColour = color("#1E1B23");

    const gradientNoiseUv = positionWorld.mul(0.1).toVar();
    const gradientNoise = mx_noise_float(gradientNoiseUv.sub(time), 1.0)
      .mul(2)
      .sub(1)
      .toVar();

    const finalColour = mix(lightColour, midColour, gradientNoise).toVar();

    const applyGrain = Fn(
      ({
        colour,
        uv,
      }: {
        colour: ShaderNodeObject<VarNode>;
        uv: ShaderNodeObject<Node>;
      }) => {
        const black = color("#000");
        // Loop(
        //   {
        //     start: float(1),
        //     end: float(16),
        //     type: "float",
        //     condition: "<",
        //   },
        //   ({ i }) => {
        //     const noiseUv = uv.mul(i).add(time);
        //     const grainNoise = mx_noise_float(noiseUv).mul(2).sub(1);

        //     const grainColour = mix(colour, black, grainNoise.mul(0.3));

        //     colour.addAssign(grainColour);
        //   }
        // );

        for (let i = 4; i < 12; i++) {
          const noiseUv = uv.mul(i * 100).add(time.mul(i));
          const grainNoise = mx_noise_float(noiseUv).mul(2).sub(1);
          const grainColour = mix(colour, black, grainNoise.mul(0.05));
          colour.assign(grainColour);
        }

        return colour;
      }
    );

    const colorNode = applyGrain({
      colour: finalColour,
      uv: uv(),
    });
    const key = colorNode.uuid;

    return { key, colorNode };
  }, []);

  return (
    <Sphere position={[0, 0, 0]} args={[10, 24, 24]}>
      <meshBasicNodeMaterial key={key} colorNode={colorNode} side={BackSide} />
    </Sphere>
  );
};

export default EnvironmentGrainSphere;
