import RayMarchingScreenQuadShader from "@/components/advanced/raymarching-wip/RayMarchingScreenQuad";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function Home() {
  return (
    <div>
      <WebGPUCanvas>
        <RayMarchingScreenQuadShader />
      </WebGPUCanvas>
    </div>
  );
}
