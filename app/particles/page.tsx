import SpriteEmitter from "@/components/particles/SpriteEmitter";
import ScreenQuadTSL from "@/components/screenquadTSL/ScreenQuadTSL";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function Home() {
  return (
    <main>
      <WebGPUCanvas>
        <SpriteEmitter />
      </WebGPUCanvas>
    </main>
  );
}
