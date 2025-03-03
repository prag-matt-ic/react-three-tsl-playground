"use client";
import { BloomPass } from "@/components/basic/BloomPass";
import InteractiveSphere from "@/components/basic/InteractiveSphere";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function BasicInteractiveSpherePage() {
  return (
    <main>
      <WebGPUCanvas>
        <ambientLight intensity={1} />
        <pointLight intensity={3} position={[0, 2, 2]} />
        <InteractiveSphere />
        {/* <BloomPass /> */}
      </WebGPUCanvas>
    </main>
  );
}
