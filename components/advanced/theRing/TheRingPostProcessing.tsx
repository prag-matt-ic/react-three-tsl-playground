"use client";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import React, { type FC, useEffect, useMemo, useRef, useState } from "react";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { film } from "three/examples/jsm/tsl/display/FilmNode.js";
import { anamorphic } from "three/examples/jsm/tsl/display/AnamorphicNode.js";
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
import { PostProcessing, WebGPURenderer } from "three/webgpu";

export const TheRingPostProcessing: FC = () => {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const renderer = useThree((s) => s.gl);
  const postProcessing = useRef<PostProcessing>(undefined);

  useEffect(() => {
    if (!renderer || !scene || !camera) return;

    const processing = new PostProcessing(
      renderer as unknown as WebGPURenderer
    );

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
    const bloomPass = bloom(scenePassColor, 0.2);
    // const filmPass = anamorphic(scenePassColor, 0.8, 2.0);

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

  return null;
};
