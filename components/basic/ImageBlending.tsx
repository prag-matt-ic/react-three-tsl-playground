"use client";
import { Plane, useTexture } from "@react-three/drei";
import { useControls } from "leva";
import React, { type FC, useMemo } from "react";
import {
  color,
  mix,
  positionWorld,
  clamp,
  uniform,
  vec3,
  vec2,
  texture,
  uv,
  fract,
  step,
  Fn,
} from "three/tsl";

enum FitMode {
  Cover = "Cover",
  Contain = "Contain",
  Fill = "Fill",
  Tile = "Tile",
}

const ImageFitMode: FC = () => {
  const texture1 = useTexture(
    "https://images.pexels.com/photos/30886959/pexels-photo-30886959/free-photo-of-traditional-japanese-shrine-with-stone-guardian.jpeg"
  );

  const { planeWidth, planeHeight, fit } = useControls({
    fit: {
      value: FitMode.Cover,
      options: Object.values(FitMode),
    },
    planeWidth: {
      value: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
    },
    planeHeight: {
      value: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
    },
    // If tile mode, set the scale
  });

  const srcAspect: number = 661 / 992;
  const planeAspect: number = planeWidth / planeHeight;
  const tileScale = 2;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit#values

  // COVER:
  // Scaled to maintain its aspect ratio while filling the element's entire content box.

  // CONTAIN:
  // Scaled to maintain its aspect ratio while fitting within the element's content box.
  // The object will be "letterboxed" or "pillarboxed" if its aspect ratio does not match the aspect ratio of the box.

  // FILL:
  // The entire object will completely fill the box.
  // If the object's aspect ratio does not match the aspect ratio of its box, the object will be stretched to fit.

  const { key, colorNode } = useMemo(() => {
    // For cover, we want to “zoom” into the image so that the plane is completely covered.
    // Depending on whether the plane is wider than the image or not,
    // we shrink the horizontal or vertical UV range and center it.
    const getCoverColor = Fn(([uv]) => {
      const coverUv =
        planeAspect > srcAspect
          ? // Plane is wider than image: image’s full width is used, scale the height.
            vec2(
              uv.x,
              uv.y
                .sub(0.5)
                .mul(srcAspect / planeAspect)
                .add(0.5)
            )
          : // Plane is taller than image: image’s full height is used, scale the width.
            vec2(
              uv.x
                .sub(0.5)
                .mul(planeAspect / srcAspect)
                .add(0.5),
              uv.y
            );

      return texture(texture1, coverUv);
    });

    // In CONTAIN mode we need to show the entire image.
    // The valid region in UV space is smaller than [0,1] on one axis.
    // Outside that region, we mask to black.
    const getContainColor = Fn(([uv]) => {
      // Compute the adjusted UV coordinates that map [0,1] into the valid image area.
      const containUv =
        planeAspect > srcAspect
          ? // Plane is wider than image: full width is used; adjust height.
            vec2(
              uv.x
                .sub(0.5)
                .div(srcAspect / planeAspect)
                .add(0.5),
              uv.y
            )
          : // Otherwise: full height is used; adjust width.
            vec2(
              uv.x,
              uv.y
                .sub(0.5)
                .div(planeAspect / srcAspect)
                .add(0.5)
            );
      // Sample the texture with the adjusted UV.
      const sampled = texture(texture1, containUv);

      const maskColor = color("#fff");
      const mask =
        planeAspect > srcAspect
          ? step(0.5 - (srcAspect / planeAspect) * 0.5, uv.x).mul(
              step(0.5 + (srcAspect / planeAspect) * 0.5, uv.x).oneMinus()
            )
          : step(0.5 - (planeAspect / srcAspect) * 0.5, uv.y).mul(
              step(0.5 + (planeAspect / srcAspect) * 0.5, uv.y).oneMinus()
            );
      // Where mask==0, the maskColor is used
      return mix(maskColor, sampled, mask);
    });

    // TODO: finish this.
    const getTileColor = Fn(([uv]) => {
      const tileUv = fract(uv.mul(tileScale));
      return texture(texture1, tileUv);
    });

    const getColorNode = Fn(() => {
      if (fit === FitMode.Cover) return getCoverColor(uv());
      if (fit === FitMode.Contain) return getContainColor(uv());
      // For fill, we use the uv coordinates as-is, stretching the image.
      if (fit === FitMode.Fill) return texture(texture1, uv());
      if (fit === FitMode.Tile) return getTileColor(uv());
    });

    const colorNode = getColorNode();
    const key = colorNode.uuid;

    return { key, colorNode };
  }, [fit, planeAspect, srcAspect, texture1]);

  return (
    <Plane position={[0, 0, 0]} args={[planeWidth, planeHeight]}>
      <meshBasicNodeMaterial key={key} colorNode={colorNode} />
    </Plane>
  );
};

export default ImageFitMode;
