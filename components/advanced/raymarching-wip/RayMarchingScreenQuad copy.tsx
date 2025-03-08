"use client";

import { ScreenQuad } from "@react-three/drei";
import React, { type FC, useMemo, useRef } from "react";
import {
  abs,
  add,
  bool,
  Break,
  clamp,
  color,
  cross,
  div,
  dot,
  float,
  Fn,
  If,
  int,
  length,
  Loop,
  max,
  min,
  mod,
  normalize,
  positionGeometry,
  positionLocal,
  pow,
  screenSize,
  screenUV,
  ShaderNodeObject,
  struct,
  sub,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  viewportSize,
} from "three/tsl";
import { VarNode } from "three/webgpu";

import { sdBox } from "./raymarching";

const RayMarchingScreenQuadShader: FC = () => {
  const { colorNode } = useMemo(() => {
    const MIN_DISTANCE = float(0.001);
    const MAX_DISTANCE = float(60.0);
    const MAX_ITERATIONS = int(80);
    const ENABLE_SHADOWS = bool(true);

    // Define a struct with an explicit name "DistColourStruct"
    const DistColourStruct = struct(
      {
        dist: "float",
        colour: "vec3",
      },
      "DistColourStruct"
    );

    // Define a function "map" that returns a float (the distance)
    const getSignedDistance = Fn(([p]: [p: ShaderNodeObject<VarNode>]) => {
      const boxSize = vec3(2.0, 2.0, 2.0); // Size of the box
      const boxP = p.sub(vec3(2.0, -4.0, 0.0)); // Position the box
      const distanceToBox = sdBox(boxP, boxSize); // Distance to the box

      // You can later incorporate colour here if needed.
      return distanceToBox;
    }).setLayout({
      name: "getSignedDistance",
      type: "float",
      inputs: [{ name: "p", type: "vec3", qualifier: "in" }],
    });

    const softShadow = Fn(
      ([
        ro_immutable,
        rd_immutable,
        mint_immutable,
        maxt_immutable,
        w_immutable,
      ]: [
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>
      ]) => {
        const w = float(w_immutable).toVar();
        const maxt = float(maxt_immutable).toVar();
        const mint = float(mint_immutable).toVar();
        const rd = vec3(rd_immutable).toVar();
        const ro = vec3(ro_immutable).toVar();
        const res = float(1.0).toVar();
        const t = float(mint).toVar();

        Loop(
          {
            start: int(0),
            end: int(64),
            type: "int",
            condition: "<",
          },
          ({ i }) => {
            const distance = getSignedDistance(ro.add(t.mul(rd))).toVar();
            res.assign(min(res, distance.div(w.mul(t))));
            t.addAssign(clamp(distance, 0.005, 0.5));

            If(res.lessThan(float(-1.0)).or(t.greaterThan(maxt)), () => {
              Break();
            });
          }
        );

        // Clamp to at least -1.0
        res.assign(max(res, float(-1.0)));

        // A polynomial remap to get softer edges (often called "k factor")
        return float(0.25).mul(res.add(1.0)).mul(res.add(1)).mul(sub(2.0, res));
      }
    ).setLayout({
      name: "softShadow",
      type: "float",
      inputs: [
        { name: "rayOrigin", type: "vec3", qualifier: "in" },
        { name: "rayDirection", type: "vec3", qualifier: "in" },
        { name: "mint", type: "float" },
        { name: "maxt", type: "float" },
        { name: "w", type: "float" },
      ],
    });

    const getNormal = Fn(([p]: [p: ShaderNodeObject<VarNode>]) => {
      const pVar = vec3(p).toVar();
      const d = getSignedDistance(pVar).toVar();
      const e = vec2(0.01, 0.0);
      const n = vec3(
        d.sub(
          vec3(
            getSignedDistance(pVar.sub(e.xyy)),
            getSignedDistance(pVar.sub(e.yxy)),
            getSignedDistance(pVar.sub(e.yyx))
          )
        )
      );
      return normalize(n);
    }).setLayout({
      name: "getNormal",
      type: "vec3",
      inputs: [{ name: "p", type: "vec3", qualifier: "in" }],
    });

    const getLight = Fn(
      ([intersectionPoint, camPos, lightPos, intensity]: [
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>,
        ShaderNodeObject<VarNode>
      ]) => {
        // Compute the light direction vector
        // const lightPos = vec3(lightPos_immutable).toVar();
        // const camPos = vec3(camPos_immutable).toVar();
        const p = vec3(intersectionPoint).toVar();
        const l = vec3(normalize(lightPos.sub(p))).toVar();

        // // Compute the normal at the point `p`
        const normal = vec3(getNormal(p)).toVar();
        // Diffuse lighting (Lambertian reflection) I=L⋅N
        const diffuse = float(clamp(dot(l, normal), 0.0, 1.0)).toVar();
        // Compute soft shadowing - Shadow factor
        const shadowFactor = float(0.25).toVar();

        If(ENABLE_SHADOWS, () => {
          // Prevent self-shadowing
          const roOffset = vec3(p.add(normal.mul(0.01))).toVar();
          shadowFactor.assign(
            softShadow(roOffset, l, 0.05, length(lightPos.sub(p)), 8.0)
          );
          // Adjust shadow contrast - controls shadow intensity curve
          const shadowContrast = float(1.2);
          // Apply contrast adjustment to shadow factor
          shadowFactor.assign(pow(shadowFactor, shadowContrast));
          // Apply shadow attenuation to diffuse lighting
          diffuse.mulAssign(shadowFactor);
        });

        // Compute distance attenuation
        // Distance to the light source
        const dist = float(length(lightPos.sub(p))).toVar();
        const attenuation = float(
          clamp(div(1.0, dist.mul(dist)), 0.0, 1.0) // TOOD: could be squared distnace
        ).toVar();

        // Modulate diffuse lighting by attenuation and intensity
        diffuse.mulAssign(attenuation.mul(intensity));

        // Add ambient lighting (baseline illumination)
        // Ambient light intensity
        const ambient = float(0.25).toVar();
        const lightContribution = diffuse.add(ambient).toVar();

        // Specular highlights (Blinn-Phong model)
        const viewDir = normalize(camPos.sub(p));
        const halfDir = normalize(l.add(viewDir));
        // Specular exponent (shininess)
        const spec = float(
          pow(clamp(dot(normal, halfDir), 0.0, 1.0), 2.0)
        ).toVar();
        // Modulate specular with shadowing and attenuation
        spec.mulAssign(shadowFactor.mul(attenuation).mul(intensity));

        // Combine diffuse, ambient, and specular contributions
        lightContribution.addAssign(spec.mul(1.6)); // Scale specular for balance

        return lightContribution;
      }
    ).setLayout({
      name: "getLight",
      type: "float",
      inputs: [
        { name: "intersectionPoint", type: "vec3", qualifier: "in" },
        { name: "camPos", type: "vec3", qualifier: "in" },
        { name: "lightPos", type: "vec3", qualifier: "in" },
        { name: "intensity", type: "float", qualifier: "in" },
      ],
    });

    // Define the rayMarch function that returns a DistColourStruct instance
    const rayMarch = Fn(
      ([rayOrigin, rayDirection]: [
        rayOrigin: ShaderNodeObject<VarNode>,
        rayDirection: ShaderNodeObject<VarNode>
      ]) => {
        const ro = vec3(rayOrigin).toVar();
        const rd = vec3(rayDirection).toVar();

        // Accumulate the total distance
        const td = float(0.0).toVar();
        // Initialize the colour (as a vec3)
        const colour = color("blue").toVar();

        // Loop through iterations for ray marching
        Loop(
          { start: int(0), end: MAX_ITERATIONS, type: "int", condition: "<" },
          ({ i }) => {
            const p = vec3(ro.add(rd.mul(td))).toVar();
            const distance = getSignedDistance(p);

            // If the surface is hit, change colour to object colour and break
            If(abs(distance).lessThanEqual(MIN_DISTANCE), () => {
              colour.assign(color("grey"));
              Break();
            });

            // March the ray forward
            td.addAssign(distance);

            // If we exceed MAX_DISTANCE, change colour to background and break
            If(td.greaterThan(MAX_DISTANCE), () => {
              td.assign(MAX_DISTANCE);
              colour.assign(color("blue"));
              Break();
            });
          }
        );

        // Return an instance of DistColourStruct containing the total distance and final colour
        return DistColourStruct(td, colour);
      }
    ).setLayout({
      name: "rayMarch",
      type: "DistColourStruct",
      inputs: [
        { name: "rayOrigin", type: "vec3", qualifier: "in" },
        { name: "rayDirection", type: "vec3", qualifier: "in" },
      ],
    });

    // Main function where the ray is cast and the struct is used to get the final colour.
    const getColorNode = Fn(() => {
      // Assume screenUV and screenSize are available.
      // 1. Center the UV coordinates to range from -1 to 1.
      const centeredUV = screenUV.sub(0.5).mul(2.0);

      // 2. Calculate the aspect ratio and adjust the x component.
      const aspect = screenSize.x.div(screenSize.y);
      const aspectUV = vec2(centeredUV.x.mul(aspect), centeredUV.y);

      // 3. Setup camera parameters.
      const rayOrigin = vec3(0.0, 0.0, 10.0).toVar();
      const lookAt = vec3(0.0, 0.0, 0.0);
      const forward = normalize(lookAt.sub(rayOrigin));

      // Define an up direction (you might change this depending on your camera).
      const up = vec3(0.0, 1.0, 0.0);
      // Compute the right vector from forward and up.
      const right = normalize(cross(forward, up));

      // 4. Compute the final ray direction by offsetting the forward vector.
      const rayDirection = normalize(
        forward.add(right.mul(aspectUV.x)).add(up.mul(aspectUV.y))
      ).toVar();

      // Raymarch the scene and get the returned struct
      const distanceColour = rayMarch(rayOrigin, rayDirection);

      // Extract the total distance and colour from the struct
      // const totalDistance = distanceColour.get("dist");
      const colour = color(distanceColour.get("colour")).toVar();
      const totalDistance = float(distanceColour.get("dist")).toVar();

      // If distance is max, don't compute lighting

      // This is being called for all fragments, the error... suggesting that the totalDistance is not working...
      // If(totalDistance.greaterThanEqual(MAX_DISTANCE), () => {
      //   return colour;
      // });

      // Intersection point
      const intersectionPoint = add(rayDirection, rayOrigin)
        .mul(totalDistance)
        .toVar();

      const lightPosition = vec3(0.0, 2.0, 5.0).toVar();
      const lightIntensity = float(100.0);
      const light = getLight(
        intersectionPoint,
        rayOrigin,
        lightPosition,
        lightIntensity
      );
      // Apply lighting
      colour.mulAssign(vec3(light));

      // Return the final colour as a vec4 (with alpha set to 1.0)
      return colour;
    });

    // Use the main function's result as the node for fragment output
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
