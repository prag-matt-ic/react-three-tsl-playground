"use client";
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend } from "@react-three/fiber";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

import PS5Backdrop from "@/components/advanced/ps5/PS5Backdrop";
import PS5Particles from "@/components/advanced/ps5/PS5Particles";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

export default function PS5LoadingPage() {
  return (
    <main className="h-lvh w-full">
      {WebGPU.isAvailable() && (
        <Canvas
          className="!fixed inset-0"
          performance={{ min: 0.5, debounce: 300 }}
          camera={{ position: [0, 0, 8], fov: 110 }}
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
          <ambientLight intensity={8} />
          {/* <pointLight position={[-1, -1, 0]} intensity={8} /> */}
          <PS5Backdrop />
          <PS5Particles />
          <OrbitControls />
          {process.env.NODE_ENV === "development" && <Stats />}
        </Canvas>
      )}
    </main>
  );
}
