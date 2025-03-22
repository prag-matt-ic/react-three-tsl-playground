import TheRing from "@/components/advanced/particles/ParticleRings";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function TheRingPage() {
  return (
    <main>
      <WebGPUCanvas>
        <TheRing />
      </WebGPUCanvas>
    </main>
  );
}
