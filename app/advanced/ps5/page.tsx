"use client";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";

import PS5Loading from "@/components/advanced/PS5Loading";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function PS5LoadingPage() {
  return (
    <main className="h-lvh w-full">
      {WebGPU.isAvailable() && (
        <WebGPUCanvas cameraProps={{ position: [0, 0, 8], fov: 110 }}>
          <color attach="background" args={["#03030F"]} />
          <PS5Loading />
        </WebGPUCanvas>
      )}
    </main>
  );
}
