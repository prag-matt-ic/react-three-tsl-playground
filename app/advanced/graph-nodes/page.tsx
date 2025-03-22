import GraphNodes from "@/components/advanced/particles/GraphNodes";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function SpriteEmitterPage() {
  return (
    <main>
      <WebGPUCanvas>
        <GraphNodes />
      </WebGPUCanvas>
    </main>
  );
}
