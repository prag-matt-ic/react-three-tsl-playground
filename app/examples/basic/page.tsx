import EnvironmentGrainSphere from "@/components/basic/EnvironmentGrainSphere";
import { BloomPass } from "@/components/basic/BloomPass";
import WebGPUCanvas from "@/components/WebGPUCanvas";
import { SimpleSphere } from "@/components/basic/SimpleSphere";
import EnvironmentSphereGradients from "@/components/basic/EnvironmentGradients";
import BackgroundNodeShader from "@/components/basic/BackgroundNodeShader";

export default function Home() {
  return (
    <div>
      <WebGPUCanvas>
        <ambientLight intensity={2} />
        <pointLight intensity={6} position={[-1, 1.5, 1]} />
        <pointLight intensity={2} position={[1, 0, 1]} />

        <BackgroundNodeShader />
        {/* <EnvironmentGrainSphere /> */}
        {/* <EnvironmentSphereGradients /> */}
        <SimpleSphere />

        {/* TODO: background node shdaer... */}
        <BloomPass />
      </WebGPUCanvas>
    </div>
  );
}
