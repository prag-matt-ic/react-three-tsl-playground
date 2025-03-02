import { vec3, float, mul, cos, clamp, Fn, ShaderNodeObject } from "three/tsl";
import { Node } from "three/webgpu";

export const cosineGradientColour = /*#__PURE__*/ Fn(
  ([t_immutable, a_immutable, b_immutable, c_immutable, d_immutable]: [
    typeof float | ShaderNodeObject<Node>,
    typeof vec3 | ShaderNodeObject<Node>,
    typeof vec3 | ShaderNodeObject<Node>,
    typeof vec3 | ShaderNodeObject<Node>,
    typeof vec3 | ShaderNodeObject<Node>
  ]) => {
    const d = vec3(d_immutable).toVar();
    const c = vec3(c_immutable).toVar();
    const b = vec3(b_immutable).toVar();
    const a = vec3(a_immutable).toVar();
    const t = float(t_immutable).toVar();

    return clamp(a.add(b.mul(cos(mul(6.28318, c.mul(t).add(d))))), 0.0, 1.0);
  }
).setLayout({
  name: "cosineGradientColour",
  type: "color",
  inputs: [
    { name: "t", type: "float", qualifier: "in" },
    { name: "a", type: "vec3", qualifier: "in" },
    { name: "b", type: "vec3", qualifier: "in" },
    { name: "c", type: "vec3", qualifier: "in" },
    { name: "d", type: "vec3", qualifier: "in" },
  ],
});
