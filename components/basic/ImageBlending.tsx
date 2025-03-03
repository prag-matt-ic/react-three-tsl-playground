"use client";
import { Box, useTexture } from "@react-three/drei";
import { useControls } from "leva";
import React, { type FC, useMemo } from "react";
import {
  uniform,
  vec2,
  texture,
  uv,
  blendOverlay,
  blendScreen,
  blendBurn,
  blendColor,
  blendDodge,
  smoothstep,
  Fn,
  ShaderNodeObject,
  mix,
} from "three/tsl";
import snowImage from "@/assets/images/snow.jpg";
import beachImage from "@/assets/images/beach.jpg";
import { SRGBColorSpace } from "three";
import { TextureNode, UniformNode } from "three/webgpu";

enum BlendMode {
  None = "none",
  Overlay = "overlay",
  Screen = "screen",
  Burn = "burn",
  Color = "color",
  Dodge = "dodge",
}

const ImageBlending: FC = () => {
  // Photo by Simon Berger: https://www.pexels.com/photo/landscape-photography-of-snow-pathway-between-trees-during-winter-688660/
  const imageTextureA = useTexture(snowImage.src);
  // Photo by Fabian Wiktor: https://www.pexels.com/photo/seaside-994605/
  const imageTextureB = useTexture(beachImage.src);

  imageTextureA.colorSpace = SRGBColorSpace;
  imageTextureB.colorSpace = SRGBColorSpace;

  const { blendMode, swapImages } = useControls({
    blendMode: {
      value: BlendMode.None,
      options: Object.values(BlendMode),
    },
    swapImages: {
      value: false,
    },
  });

  const boxSize = 2;
  const srcAspect: number = snowImage.width / snowImage.height;
  const planeAspect: number = 1; // Square box faces

  const { key, colorNode } = useMemo(() => {
    const mode = uniform(blendMode);

    // UV to cover the surface without stretching
    const coverUv = vec2(
      uv()
        .x.sub(0.5)
        .mul(planeAspect / srcAspect)
        .add(0.5),
      uv().y
    );

    const imageColourA = texture(imageTextureA, coverUv);
    const imageColourB = texture(imageTextureB, coverUv);

    const getBlendedColour = Fn(
      ([mode, colA, colB]: [
        mode: UniformNode<BlendMode>,
        colA: ShaderNodeObject<TextureNode>,
        colB: ShaderNodeObject<TextureNode>
      ]) => {
        switch (mode.value) {
          case "overlay":
            return blendOverlay(colA, colB);
          case "screen":
            return blendScreen(colA, colB);
          case "burn":
            return blendBurn(colA, colB);
          case "color":
            return blendColor(colA, colB);
          case "dodge":
            return blendDodge(colA, colB);
          default: // "none"
            return mix(colA, colB, 0.5);
        }
      }
    );

    const colorNode = getBlendedColour(
      mode,
      swapImages ? imageColourB : imageColourA,
      swapImages ? imageColourA : imageColourB
    );
    const key = colorNode.uuid;

    return { key, colorNode };
  }, [srcAspect, imageTextureA, imageTextureB, blendMode, swapImages]);

  return (
    <Box position={[0, 0, 0]} args={[boxSize, boxSize, boxSize]}>
      <meshBasicNodeMaterial key={key} colorNode={colorNode} />
    </Box>
  );
};

export default ImageBlending;
