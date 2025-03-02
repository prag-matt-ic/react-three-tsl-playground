"use client";
import {
  OrbitControls,
  PerformanceMonitor,
  type PerformanceMonitorApi,
} from "@react-three/drei";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";

import React, { type FC, type PropsWithChildren, useState } from "react";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// @ts-expect-error - extend THREE namespace
extend(THREE);

type Props = PropsWithChildren<{
  isMobile?: boolean;
}>;

const WebGPUCanvas: FC<Props> = ({ children, isMobile }) => {
  const [dpr, setDpr] = useState(1);
  const minDpr = isMobile ? 0.8 : 1;

  const onPerformanceInline = (api: PerformanceMonitorApi) => {
    if (dpr < window.devicePixelRatio) setDpr((prev) => prev + 0.2);
  };

  const onPerformanceDecline = (api: PerformanceMonitorApi) => {
    if (dpr > minDpr) setDpr((prev) => prev - 0.2);
  };

  const onPerformanceFallback = (api: PerformanceMonitorApi) => {
    setDpr(minDpr);
  };

  if (!WebGPU.isAvailable()) {
    console.warn("WebGPU is not supported");
    return null;
  }

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={dpr}
      performance={{ min: 0.5, debounce: 300 }}
      camera={{ position: [0, 0, 5], far: 20 }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(
          props as WebGPURendererParameters
        );
        await renderer.init();
        return renderer;
      }}
    >
      <PerformanceMonitor
        onIncline={onPerformanceInline}
        onDecline={onPerformanceDecline}
        onFallback={onPerformanceFallback}
        flipflops={4}
      >
        {children}
        <OrbitControls />
      </PerformanceMonitor>
    </Canvas>
  );
};

export default WebGPUCanvas;
