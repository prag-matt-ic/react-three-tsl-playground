"use client";
import { BloomPass } from "@/components/basic/BloomPass";
import WebGPUCanvas from "@/components/WebGPUCanvas";
import InteractiveSphere from "@/components/basic/InteractiveSphere";

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
