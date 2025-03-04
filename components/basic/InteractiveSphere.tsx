"use client";
import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { type FC, useMemo, useState } from "react";
import { MathUtils } from "three";
import { color, mix, positionWorld, uniform, uv, vec3 } from "three/tsl";

// Basic component showing how to add smooth hover interactivity with TSL

const InteractiveSphere: FC = () => {
  const [isPointerOver, setIsPointerOver] = useState(false);

  const { key, colorNode, positionNode, uHovered } = useMemo(() => {
    // Define a uniform for the hover value
    const uHovered = uniform(0.0);

    // Create color gradients on the Y axis (bottom to top of the sphere)
    const defaultColor = mix(color("#3F4A4B"), color("#7A8B8C"), uv().y);
    const hoverColor = mix(color("#14DCE9"), color("#B462D1"), uv().y);

    // Mix between two default and hovered colors based on the hover value
    const colorNode = mix(defaultColor, hoverColor, uHovered);

    // Translate the sphere along the Z axis based on the hover value (between 0 and 1)
    const positionNode = positionWorld.sub(vec3(0, 0, uHovered.oneMinus()));

    // Generate a key for the material so that it updates when this data changes
    // (it won't in this scenario because useMemo has no dependencies)
    const key = colorNode.uuid;
    return { key, colorNode, positionNode, uHovered };
  }, []);

  // When hovered, smoothly transition to 1.0, otherwise back to 0.0
  useFrame((_, delta) => {
    uHovered.value = MathUtils.damp(
      uHovered.value,
      isPointerOver ? 1.0 : 0.0,
      5,
      delta
    );
  });

  return (
    <Sphere
      position={[0, 0, 0]}
      args={[1.5, 40, 40]}
      onPointerEnter={() => {
        document.body.style.cursor = "pointer";
        setIsPointerOver(true);
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "auto";
        setIsPointerOver(false);
      }}
    >
      {/* We're using the Phong Node material for built-in lighting/shadows/shininess */}
      <meshPhongNodeMaterial
        key={key}
        colorNode={colorNode}
        positionNode={positionNode}
        shininess={20}
      />
    </Sphere>
  );
};

export default InteractiveSphere;
