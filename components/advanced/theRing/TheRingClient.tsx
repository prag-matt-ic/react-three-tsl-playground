"use client";
import { OrbitControls } from "@react-three/drei";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import { type FC, useLayoutEffect, useState } from "react";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
// import { TheRingPostProcessing } from "@/components/advanced/theRing/TheRingPostProcessing";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import { WebGPURenderer } from "three/webgpu";
import * as THREE from "three/webgpu";

import { TheRingNameInput } from "@/components/advanced/theRing/TheRingNameInput";
import {
  backgroundNode,
  TheRingParticles,
  TheRingVideo,
} from "@/components/advanced/theRing/TheRingScene";
import NotSupported from "@/components/NotSupported";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

type Props = {
  name: string | undefined;
};

const TheRing: FC<Props> = ({ name }) => {
  const [textPoints, setTextPoints] = useState<Float32Array | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setIsSupported(WebGPU.isAvailable());
  }, []);

  if (isSupported === null) return null;
  if (!isSupported) return <NotSupported />;

  return (
    <>
      <Canvas
        className="!fixed inset-0"
        performance={{ min: 0.5, debounce: 300 }}
        scene={{ backgroundNode: backgroundNode }}
        camera={{ position: [0, 0, 5], far: 10, fov: 70 }}
        flat={true}
        gl={async (props) => {
          const renderer = new WebGPURenderer(
            props as WebGPURendererParameters
          );
          await renderer.init();
          return renderer;
        }}
      >
        <OrbitControls enableZoom={false} />
        {/* <TheRingVideo shouldPlay={!!textPoints} /> */}
        <TheRingParticles textPoints={textPoints} />
      </Canvas>
      <TheRingNameInput name={name} setTextPoints={setTextPoints} />
    </>
  );
};

export default TheRing;
