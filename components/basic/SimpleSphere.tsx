"use client";
import { useGSAP } from "@gsap/react";
import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import React, { type FC, useMemo, useState } from "react";
import { MathUtils } from "three";
import { color, mix, positionWorld, clamp, uniform, vec3 } from "three/tsl";

export const SimpleSphere: FC = () => {
  const [isPointerOver, setIsPointerOver] = useState(false);

  const { key, colorNode, positionNode, uHovered } = useMemo(() => {
    const uHovered = uniform(0.0);
    const colorNode = mix(
      color("#2B3536"),
      color("#37F3FF"),
      clamp(uHovered, 0.0, 1.0)
    );

    const positionNode = positionWorld.sub(vec3(0, 0, uHovered));
    const key = colorNode.uuid;
    return { key, colorNode, positionNode, uHovered };
  }, []);

  // Dependency free effect
  useFrame((_, delta) => {
    uHovered.value = MathUtils.damp(
      uHovered.value,
      isPointerOver ? 1.0 : 0.0,
      5,
      delta
    );
  });

  // GSAP for easing control
  // useGSAP(
  //   () => {
  //     gsap.to(uHovered, {
  //       value: isPointerOver ? 1.0 : 0.0,
  //       duration: 0.8,
  //       ease: "back.out(3.0)",
  //     });
  //   },
  //   { dependencies: [isPointerOver, uHovered] }
  // );

  return (
    <Sphere
      position={[0, 0, 0]}
      args={[1, 40, 40]}
      onPointerEnter={() => setIsPointerOver(true)}
      onPointerLeave={() => setIsPointerOver(false)}
    >
      <meshLambertNodeMaterial
        key={key}
        colorNode={colorNode}
        positionNode={positionNode}
      />
    </Sphere>
  );
};
