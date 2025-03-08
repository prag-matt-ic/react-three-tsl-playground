"use client";
import { useFrame, useThree } from "@react-three/fiber";
import React, { type FC, useEffect, useRef } from "react";
import { PCFSoftShadowMap } from "three";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import {
  blendColor,
  depth,
  emissive,
  metalness,
  mrt,
  output,
  pass,
  transformedNormalView,
} from "three/tsl";
import {
  DirectionalLight,
  Mesh,
  Object3D,
  Object3DEventMap,
  PointLight,
  PostProcessing,
  WebGPURenderer,
} from "three/webgpu";

const PS5Lighting: FC = () => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer;

  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const light = useRef<DirectionalLight>(null);
  const lightTarget = useRef<Object3D<Object3DEventMap>>(null);

  const postProcessing = useRef<PostProcessing>(undefined);

  useEffect(() => {
    if (!renderer || !scene || !camera) return;

    const targetObject = new Object3D();
    targetObject.position.set(8, 5, 0);
    scene.add(targetObject);
    light.current!.target = targetObject;
    light.current?.updateMatrixWorld();

    // shadowmaps are needed for this effect
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const processing = new PostProcessing(renderer);

    // Create post-processing setup with specific filters
    const scenePass = pass(scene, camera);

    // Setup Multiple Render Targets (MRT)
    scenePass.setMRT(
      mrt({
        output: output,
        normal: transformedNormalView,
        metalness: metalness,
        depth: depth,
        emissive: emissive,
      })
    );

    // Get texture nodes
    const scenePassColor = scenePass.getTextureNode("output");
    // const scenePassEmissive = scenePass.getTextureNode("emissive");

    // Create bloom pass
    const bloomPass = bloom(scenePassColor, 0.1);

    processing.outputNode = scenePassColor.add(bloomPass);
    postProcessing.current = processing;

    return () => {
      processing.dispose();
    };
  }, [renderer, scene, camera]);

  useFrame(({ gl }) => {
    if (!postProcessing.current) return;
    gl.clear();
    postProcessing.current.render();
  }, 1);

  return (
    <>
      <directionalLight
        ref={light}
        position={[8, 20, 0]}
        intensity={20}
        castShadow={true}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        color={"#AE9F9D"}
      />
    </>
  );
};

export default PS5Lighting;
