"use client";
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend } from "@react-three/fiber";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

import PS5Backdrop from "@/components/advanced/ps5/PS5Backdrop";
import PS5Particles from "@/components/advanced/ps5/PS5Particles";
import PS5Lighting from "@/components/advanced/ps5/PS5Lighting";
import PS5CameraControls from "@/components/advanced/ps5/PS5Camera";
import PS5UI from "@/components/advanced/ps5/PS5UI";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

// References: https://www.youtube.com/watch?v=J5VKsqGAwjk

export default function PS5LoadingPage() {
  return (
    <main className="h-lvh w-full">
      {WebGPU.isAvailable() && (
        <Canvas
          className="!fixed inset-0"
          camera={{ position: [0, 0, 8], fov: 110 }}
          performance={{ min: 0.5, debounce: 300 }}
          gl={async (props) => {
            console.warn("WebGPU is supported");
            const renderer = new THREE.WebGPURenderer(
              props as WebGPURendererParameters
            );
            await renderer.init();
            return renderer;
          }}
        >
          <color attach="background" args={["#000210"]} />
          <ambientLight intensity={6} />

          <PS5Backdrop />
          <PS5Particles />
          {/* <PS5Lighting /> */}
          {/* <OrbitControls /> */}
          <PS5CameraControls />

          {process.env.NODE_ENV === "development" && <Stats />}
        </Canvas>
      )}
      <PS5UI />
    </main>
  );
}
