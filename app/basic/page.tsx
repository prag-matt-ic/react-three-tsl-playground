import EnvironmentGrainSphere from "@/components/basic/EnvironmentGrainSphere";
import { BloomPass } from "@/components/basic/BloomPass";
import WebGPUCanvas from "@/components/WebGPUCanvas";
import { SimpleSphere } from "@/components/basic/SimpleSphere";
import EnvironmentSphereGradients from "@/components/basic/EnvironmentGradients";
import ImageFitMode from "@/components/basic/ImageFitMode";

export default function Home() {
  return (
    <main>
      <WebGPUCanvas>
        <ambientLight intensity={1} />
        <pointLight intensity={3} position={[-1, 0.5, 1]} />
        <pointLight intensity={3} position={[1, 0.5, 1]} />

        <SimpleSphere />

        {/* <ImageFitMode /> */}
        {/* <EnvironmentGrainSphere /> */}
        {/* <EnvironmentSphereGradients /> */}

        {/* <BloomPass /> */}
      </WebGPUCanvas>
    </main>
  );
}
