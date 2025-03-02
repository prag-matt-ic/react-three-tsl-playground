"use client";
import { ScreenQuad } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { type FC, useMemo, useRef } from "react";
import {
  color,
  float,
  mix,
  mul,
  mx_noise_float,
  mx_noise_vec3,
  mx_transform_uv,
  positionGeometry,
  positionLocal,
  positionWorld,
  screenSize,
  screenUV,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
  viewportUV,
} from "three/tsl";

const ScreenQuadTSL: FC = () => {
  const { viewport } = useThree();

  // Full screen quad in TSL - uses the screenUV instead of uv()
  const { key, colorNode } = useMemo(() => {
    // Background colours
    const lightColour = color("#fff");
    const darkColour = color("blue");
    const darkestColour = color("#000");
    const gradientNoise = mx_noise_float(screenUV.mul(8).add(time.mul(1.0)))
      .mul(0.5)
      .sub(0.5);
    const baseColour = mix(lightColour, darkColour, gradientNoise);

    // Grainy noise
    const scaledUv = screenUV
      .add(vec2(time.mul(0.02), 0))
      .mul(800)
      .toVar();
    const noise = mx_noise_float(scaledUv);
    const grainColour = mix(baseColour, lightColour, noise);

    // Vignette (aspect safe)
    const aspect = screenSize.x.div(screenSize.y);
    const centeredUv = screenUV.sub(0.5).toVar();
    const aspectUv = centeredUv.mul(vec2(aspect, 1));
    const distanceToCenter = aspectUv.length();
    const vig = smoothstep(0.1, 0.8, distanceToCenter);
    const colorNode = mix(grainColour, darkestColour, vig);

    const key = colorNode.uuid;
    return { key, colorNode };
  }, []);

  const vertexNode = useMemo(() => vec4(positionGeometry.xy, 0.0, 1.0), []);

  return (
    <ScreenQuad>
      <meshBasicNodeMaterial
        key={key}
        colorNode={colorNode}
        vertexNode={vertexNode}
      />
    </ScreenQuad>
  );
};

export default ScreenQuadTSL;
