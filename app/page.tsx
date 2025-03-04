import { BloomPass } from "@/components/basic/BloomPass";
import EnvironmentGrainSphere from "@/components/basic/EnvironmentGrainSphere";
import ImageBlending from "@/components/basic/images/ImageBlending";
import ImageFitMode from "@/components/basic/images/ImageFitMode";
import WebGPUCanvas from "@/components/WebGPUCanvas";

export default function Home() {
  return (
    <div>
      <WebGPUCanvas>
        <ImageFitMode />
        {/* <ImageBlending /> */}
        {/* <WebGPUPostProcessing /> */}
      </WebGPUCanvas>
    </div>
  );
}
