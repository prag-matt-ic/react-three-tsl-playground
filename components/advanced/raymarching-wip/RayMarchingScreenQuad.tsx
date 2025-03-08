"use client";

import { ScreenQuad } from "@react-three/drei";
import React, { type FC, useMemo } from "react";
import {
  abs,
  add,
  Break,
  color,
  dot,
  float,
  Fn,
  If,
  int,
  Loop,
  max,
  min,
  mix,
  mod,
  normalize,
  positionGeometry,
  reflect,
  screenSize,
  screenUV,
  type ShaderNodeObject,
  sub,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { VarNode } from "three/webgpu";

import { sdBox } from "./raymarching";

// https://tympanus.net/codrops/2024/07/15/how-to-create-a-liquid-raymarching-scene-using-three-js-shading-language/

const RayMarchingScreenQuadShader: FC = () => {
  const { colorNode } = useMemo(() => {
    // Ray marching constants
    const MIN_DISTANCE = float(0.001);
    const MAX_DISTANCE = float(50.0);
    const MAX_ITERATIONS = int(120);

    // SDF for a box centered at the origin with size 1 (i.e. half-size of 0.5 in each direction)
    const getSignedDistance = Fn(([p]: [p: ShaderNodeObject<VarNode>]) => {
      const boxSize = vec3(0.5, 0.5, 0.5);

      const boxADistance = sdBox(p, boxSize);

      const boxBPosition = p.sub(vec3(1.0, 1.0, 0.0)).toVar();
      boxBPosition.assign(mod(boxBPosition, 1.0).sub(0.5));
      const boxBDistance = sdBox(boxBPosition, vec3(0.1));

      // Background boxes
      // vec3 boxesP = p - vec3(uTime * 0.025, 0.5, 0.0);
      // boxesP = mod(boxesP, 1.0) - 0.5; // Repeat the pattern
      // vec3 boxes = vec3(0.2); // Box size

      return min(boxADistance, boxBDistance);
    }).setLayout({
      name: "getSignedDistance",
      type: "float",
      inputs: [{ name: "p", type: "vec3", qualifier: "in" }],
    });

    // Ray march function: returns the total distance traveled (t) along the ray.
    const rayMarch = Fn(
      ([rayOrigin, rayDirection]: [
        rayOrigin: ShaderNodeObject<VarNode>,
        rayDirection: ShaderNodeObject<VarNode>
      ]) => {
        const ro = vec3(rayOrigin).toVar();
        const rd = vec3(rayDirection).toVar();
        const t = float(0.0).toVar();

        Loop(
          { start: int(0), end: MAX_ITERATIONS, type: "int", condition: "<" },
          () => {
            const p = ro.add(rd.mul(t)).toVar();
            const d = getSignedDistance(p);
            // If we are close enough to the surface, break (hit)
            If(abs(d).lessThanEqual(MIN_DISTANCE), () => {
              Break();
            });
            t.addAssign(d);
            // If we've marched too far, clamp and break (miss)
            If(t.greaterThan(MAX_DISTANCE), () => {
              t.assign(MAX_DISTANCE);
              Break();
            });
          }
        );
        return t;
      }
    ).setLayout({
      name: "rayMarch",
      type: "float",
      inputs: [
        { name: "rayOrigin", type: "vec3", qualifier: "in" },
        { name: "rayDirection", type: "vec3", qualifier: "in" },
      ],
    });

    // vec3 getNormal(in vec3 p) {
    //   float d = getDistance(p);
    //   vec2 e = vec2(.01, 0);
    //   vec3 n = d - vec3(getDistance(p-e.xyy), getDistance(p-e.yxy), getDistance(p-e.yyx));
    //   return normalize(n);
    // }

    // Compute a normal at point p using central differences.
    const getNormal = Fn(([p]: [p: ShaderNodeObject<VarNode>]) => {
      const eps = float(0.01);
      return normalize(
        vec3(
          getSignedDistance(p.add(vec3(eps, 0, 0))).sub(
            getSignedDistance(p.sub(vec3(eps, 0, 0)))
          ),
          getSignedDistance(p.add(vec3(0, eps, 0))).sub(
            getSignedDistance(p.sub(vec3(0, eps, 0)))
          ),
          getSignedDistance(p.add(vec3(0, 0, eps))).sub(
            getSignedDistance(p.sub(vec3(0, 0, eps)))
          )
        )
      );
    }).setLayout({
      name: "getNormal",
      type: "vec3",
      inputs: [{ name: "p", type: "vec3", qualifier: "in" }],
    });

    // Basic Lambert diffuse lighting.
    const basicLighting = Fn(
      ([p, ro]: [
        p: ShaderNodeObject<VarNode>,
        ro: ShaderNodeObject<VarNode>
      ]) => {
        const normal = getNormal(p);
        const viewDir = normalize(ro.sub(p));

        // Step 1: Ambient light
        const ambient = vec3(0.1);

        // Step 2: Diffuse lighting - gives our shape a 3D look by simulating how light reflects in all directions
        const lightDir = normalize(vec3(0, 0, 1));
        const lightColor = vec3(0.9, 0.8, 0.9);
        const dp = max(0, dot(lightDir, normal));

        const diffuse = dp.mul(lightColor);

        // Steo 3: Hemisphere light - a mix between a sky and ground colour based on normals
        const skyColor = vec3(0.0, 0.3, 0.6);
        const groundColor = vec3(0.6, 0.8, 0.6);

        const hemiMix = normal.y.mul(0.5).add(0.5);
        const hemi = mix(groundColor, skyColor, hemiMix);

        // Step 4: Phong specular - Reflective light and highlights
        const ph = normalize(reflect(lightDir.negate(), normal));
        const phongValue = max(0, dot(viewDir, ph)).pow(32);

        const specular = vec3(phongValue).toVar();

        // Step 5: Fresnel effect - makes our specular highlight more pronounced at different viewing angles
        const fresnel = float(1)
          .sub(max(0, dot(viewDir, normal)))
          .pow(2);

        specular.mulAssign(fresnel);

        // Lighting is a mix of ambient, hemi, diffuse, then specular added at the end
        // We're multiplying these all by different values to control their intensity

        // Step 1
        const lighting = ambient.mul(0.1);

        // Step 2
        lighting.addAssign(diffuse.mul(0.5));

        // Step 3
        lighting.addAssign(hemi.mul(0.2));

        const finalColor = vec3(0.2).mul(lighting).toVar();

        // Step 4 & 5
        finalColor.addAssign(specular);

        return finalColor;
      }
    ).setLayout({
      name: "basicLighting",
      type: "vec3",
      inputs: [
        { name: "p", type: "vec3", qualifier: "in" },
        { name: "ro", type: "vec3", qualifier: "in" },
      ],
    });

    // Main function: sets up the camera, casts the ray, and applies lighting.
    const getColorNode = Fn(() => {
      // Convert screenUV ([0,1]) to centered UV coordinates [-1,1]
      const centeredUV = screenUV.sub(0.5).mul(2.0);
      // Adjust for aspect ratio.
      const aspect = screenSize.x.div(screenSize.y);
      const uv = vec2(centeredUV.x.mul(aspect), centeredUV.y);

      // Camera setup: positioned at (0,0,5) looking toward the origin
      const rayOrigin = vec3(0.0, -2.0, 5.0).toVar();
      // For a simple pinhole camera, construct the ray direction from UV with -1 in z.
      const rayDirection = vec3(uv, -1.0).normalize().toVar();

      // Perform ray marching
      const t = rayMarch(rayOrigin, rayDirection);

      // Otherwise, compute the intersection point.
      const p = rayOrigin.add(rayDirection.mul(t)).toVar();
      // Compute basic diffuse lighting at the intersection.
      const hitColor = basicLighting(p, rayOrigin);
      return hitColor;
    });

    const colorNode = getColorNode();
    return { colorNode };
  }, []);

  const vertexNode = useMemo(() => vec4(positionGeometry.xy, 0.0, 1.0), []);

  return (
    <ScreenQuad>
      <meshBasicNodeMaterial vertexNode={vertexNode} colorNode={colorNode} />
    </ScreenQuad>
  );
};

export default RayMarchingScreenQuadShader;
