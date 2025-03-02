"use client";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, type FC } from "react";
import { color } from "three/tsl";
import { WebGPURenderer } from "three/webgpu";

{
  /* // https://sbedit.net/41b16867501f1ae062bd8551cbc01cfbc02d36f2 */
}

const BackgroundNodeShader: FC = () => {
  const gl = useThree((state) => state.gl) as unknown as WebGPURenderer;

  const { colorNode } = useMemo(() => {
    const colorNode = color("orange");
    return { colorNode };
  }, []);

  useLayoutEffect(() => {
    gl.backgroundNode = colorNode;
  }, [gl, colorNode]);

  return <nodeMaterial colorNode={colorNode} attach={"background"} />;
};

export default BackgroundNodeShader;
