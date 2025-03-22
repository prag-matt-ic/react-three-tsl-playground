import SpriteEmitter from "@/components/advanced/particles/SpriteEmitter";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function SpriteEmitterPage() {
  return (
    <main>
      <WebGPUCanvas>
        <SpriteEmitter />
      </WebGPUCanvas>
    </main>
  );
}
