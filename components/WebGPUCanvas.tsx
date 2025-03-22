"use client";
import { OrbitControls, Stats } from "@react-three/drei";
import {
  CameraProps,
  Canvas,
  extend,
  type ThreeToJSXElements,
} from "@react-three/fiber";
import React, {
  type FC,
  type PropsWithChildren,
  useLayoutEffect,
  useState,
} from "react";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

import NotSupported from "@/components/NotSupported";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

type Props = PropsWithChildren<{
  isMobile?: boolean;
  cameraProps?: CameraProps;
}>;

const WebGPUCanvas: FC<Props> = ({
  children,
  cameraProps = { position: [0, 0, 5], far: 20, fov: 70 },
}) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setIsSupported(WebGPU.isAvailable());
  }, []);

  if (isSupported === null) return null;
  if (!isSupported) return <NotSupported />;
  return (
    <Canvas
      className="!fixed inset-0"
      performance={{ min: 0.5, debounce: 300 }}
      camera={cameraProps}
      flat={true}
      gl={async (props) => {
        console.warn("WebGPU is supported");
        const renderer = new THREE.WebGPURenderer(
          props as WebGPURendererParameters
        );
        await renderer.init();
        return renderer;
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
