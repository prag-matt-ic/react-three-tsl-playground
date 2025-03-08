import {
  abs,
  Break,
  cos,
  float,
  Fn,
  Loop,
  mat2,
  max,
  min,
  ShaderNodeObject,
  sin,
} from "three/tsl";
import { add, clamp, If, int, mul, sub } from "three/tsl";
import { length, vec3 } from "three/tsl";
import { VarNode } from "three/webgpu";

export const smin = /*#__PURE__*/ Fn(
  ([a_immutable, b_immutable, k_immutable]) => {
    const k = float(k_immutable).toVar();
    const b = float(b_immutable).toVar();
    const a = float(a_immutable).toVar();
    const h = float(max(k.sub(abs(a.sub(b))), 0.0).div(k)).toVar();

    return min(a, b).sub(
      h
        .mul(h)
        .mul(h)
        .mul(k)
        .mul(1.0 / 6.0)
    );
  }
).setLayout({
  name: "smin",
  type: "float",
  inputs: [
    { name: "a", type: "float", qualifier: "in" },
    { name: "b", type: "float", qualifier: "in" },
    { name: "k", type: "float", qualifier: "in" },
  ],
});

export const rot2D = /*#__PURE__*/ Fn(([angle_immutable]) => {
  const angle = float(angle_immutable).toVar();
  const s = float(sin(angle)).toVar();
  const c = float(cos(angle)).toVar();

  return mat2(c, s.negate(), s, c);
}).setLayout({
  name: "rot2D",
  type: "mat2",
  inputs: [{ name: "angle", type: "float", qualifier: "in" }],
});

// Three.js Transpiler r174

export const sdBox = /*#__PURE__*/ Fn(([pos, box]) => {
  const b = vec3(box).toVar();
  const p = vec3(pos).toVar();
  const q = vec3(abs(p).sub(b)).toVar();

  return length(max(q, 0.0)).add(min(max(q.x, max(q.y, q.z)), 0.0));
}).setLayout({
  name: "sdBox",
  type: "float",
  inputs: [
    { name: "pos", type: "vec3", qualifier: "in" },
    { name: "box", type: "vec3", qualifier: "in" },
  ],
});

// Three.js Transpiler r174

export const sdRoundBox = /*#__PURE__*/ Fn(
  ([p_immutable, b_immutable, r_immutable]) => {
    const r = float(r_immutable).toVar();
    const b = vec3(b_immutable).toVar();
    const p = vec3(p_immutable).toVar();
    const q = vec3(abs(p).sub(b).add(r)).toVar();

    return length(max(q, 0.0)).add(min(max(q.x, max(q.y, q.z)), 0.0).sub(r));
  }
).setLayout({
  name: "sdRoundBox",
  type: "float",
  inputs: [
    { name: "p", type: "vec3", qualifier: "in" },
    { name: "b", type: "vec3", qualifier: "in" },
    { name: "r", type: "float", qualifier: "in" },
  ],
});

// Three.js Transpiler r174
