"use client";
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";

import React, { type FC, type PropsWithChildren } from "react";
import { WebGLRenderer } from "three";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

type Props = PropsWithChildren<{
  isMobile?: boolean;
}>;

const WebGPUCanvas: FC<Props> = ({ children }) => {
  return (
    <Canvas
      className="!fixed inset-0"
      performance={{ min: 0.5, debounce: 300 }}
      camera={{ position: [0, 0, 5], far: 20 }}
      gl={async (props) => {
        if (WebGPU.isAvailable()) {
          console.warn("WebGPU is supported");
          const renderer = new THREE.WebGPURenderer(
            props as WebGPURendererParameters
          );
          await renderer.init();
          return renderer;
        } else {
          console.warn("WebGPU is not supported");
          return new WebGLRenderer(props);
        }
      }}
    >
      {/* Your components here */}
      {children}
      <OrbitControls />
      {process.env.NODE_ENV === "development" && <Stats />}
    </Canvas>
  );
};

export default WebGPUCanvas;
