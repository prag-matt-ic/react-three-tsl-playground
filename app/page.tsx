import EnvironmentGrainSphere from "@/components/basic/EnvironmentGrainSphere";
import { BloomPass } from "@/components/basic/BloomPass";
import WebGPUCanvas from "@/components/WebGPUCanvas";
import { SimpleSphere } from "@/components/basic/SimpleSphere";
import ImageFitMode from "@/components/basic/ImageFitMode";

export default function Home() {
  return (
    <div>
      <WebGPUCanvas>
        <ImageFitMode />
        {/* <WebGPUPostProcessing /> */}
      </WebGPUCanvas>
    </div>
  );
}
