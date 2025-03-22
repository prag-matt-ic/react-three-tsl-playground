"use client";
import { Sphere } from "@react-three/drei";
import { COSINE_GRADIENTS } from "@thi.ng/color";
import React, { type FC, useMemo } from "react";
import { BackSide, Vector3 } from "three";
import MathNode from "three/src/nodes/math/MathNode.js";
import { positionLocal } from "three/src/nodes/TSL.js";
import {
  abs,
  clamp,
  color,
  float,
  Fn,
  fract,
  Loop,
  mix,
  mx_cell_noise_float,
  mx_fractal_noise_float,
  positionGeometry,
  positionWorld,
  ShaderNodeObject,
  time,
  uv,
  vec2,
  vec3,
} from "three/tsl";

import { cosineGradientColour } from "@/utils/tsl";

const EnvironmentSphereGradients: FC = () => {
  const { key, colorNode } = useMemo(() => {
    // Cell Noise
    const cellNoiseUv = positionLocal.x.mul(4).sub(time);
    // TODO: find out if these noise values range from -1 to 1 or 0 to 1
    const cellNoise = mx_cell_noise_float(cellNoiseUv);

    // const gradientNoise = mx_fractal_noise_float(gradientNoiseUv, 1.0).mul(2).sub(1);

    const palette = COSINE_GRADIENTS["rainbow1"].map((color) => vec3(...color));

    const finalColour = cosineGradientColour(
      cellNoise,
      palette[0],
      palette[1],
      palette[2],
      palette[3]
    ).toWorkingColorSpace();

    const colorNode = finalColour;
    const key = colorNode.uuid;

    return { key, colorNode };
  }, []);

  return (
    <Sphere position={[0, 0, 0]} args={[10, 80, 80]}>
      <meshBasicNodeMaterial key={key} colorNode={colorNode} side={BackSide} />
    </Sphere>
  );
};

export default EnvironmentSphereGradients;
