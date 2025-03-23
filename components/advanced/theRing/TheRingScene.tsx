"use client";
import { useGSAP } from "@gsap/react";
import { useVideoTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { colorsFromRange, css } from "@thi.ng/color";
import gsap from "gsap";
import React, { type FC, useLayoutEffect, useMemo } from "react";
import {
  array,
  color,
  cos,
  deltaTime,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  mix,
  mod,
  mx_fractal_noise_vec3,
  mx_noise_float,
  PI2,
  positionWorld,
  screenSize,
  screenUV,
  select,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import {
  AdditiveBlending,
  SRGBColorSpace,
  VideoTexture,
  WebGPURenderer,
} from "three/webgpu";

// Generate color palette
// https://www.npmjs.com/package/@thi.ng/color

const COLOUR_COUNT = 100;

const PALETTE = [
  ...colorsFromRange("bright", {
    base: "silver",
    num: COLOUR_COUNT * 0.7,
    variance: 0.05,
  }),
  ...colorsFromRange("neutral", {
    base: "darkslateblue",
    num: COLOUR_COUNT * 0.3,
    variance: 0.02,
  }),
];

const colors = array(PALETTE.map((c) => color(css(c))));

const PARTICLE_COUNT = Math.pow(280, 2);
const NUMBER_OF_RING_CLUSTERS = 3;
export const RING_RADIUS = 2.0;

const seeds = new Float32Array(PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  seeds[i] = Math.random();
}

type Props = {
  textPoints: Float32Array | null;
};

export const TheRingParticles: FC<Props> = ({ textPoints }) => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer;

  const {
    key,
    positionNode,
    colorNode,
    scaleNode,
    opacityNode,
    updateParticles,
    spawnParticles,
  } = useMemo(() => {
    if (!textPoints) return {};

    const seedBuffer = instancedArray(seeds, "float");
    const positionBuffer = instancedArray(PARTICLE_COUNT, "vec4"); // w stores the life
    const velocityBuffer = instancedArray(PARTICLE_COUNT, "vec4"); // w stores if it's a ring, or text particle (object 0 or 1)
    const colorBuffer = instancedArray(PARTICLE_COUNT, "vec3");
    const textPositionBuffer = instancedArray(textPoints ?? 0, "vec3");

    const ringRadius = float(RING_RADIUS);

    const computeInitialPositions = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const initialPos = positionBuffer.element(instanceIndex);
      // Initate some particles offscreen with a random lifetime.
      const initialLife = mix(0.0, 0.2, hash(instanceIndex.add(2.0)));
      initialPos.assign(vec4(-100.0, -1000.0, 0.0, initialLife));

      const initialVel = velocityBuffer.element(instanceIndex);
      const object = select(seed.lessThan(0.75), float(0.0), float(1.0));
      initialVel.assign(vec4(0.0, 0.0, 0.0, object));
    })().compute(PARTICLE_COUNT);

    const computeColor = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const c = colorBuffer.element(instanceIndex);
      const colorIndex = hash(instanceIndex.add(3)).mul(COLOUR_COUNT).floor();
      const randomColor = colors.element(colorIndex);

      const finalColor = select(hash(seed), randomColor, color("#fff"));
      c.assign(finalColor);
    })().compute(PARTICLE_COUNT);

    renderer.computeAsync([computeColor, computeInitialPositions]);

    // @ts-expect-error missing type in TSL
    const positionNode = positionBuffer.toAttribute().xyz;

    const colorNode = Fn(() => {
      const c = colorBuffer.element(instanceIndex);
      const centeredUv = uv().distance(vec2(0.5));
      const softCircle = smoothstep(0.35, 0.5, centeredUv).oneMinus();
      return vec4(c, softCircle);
    })();

    // @ts-expect-error missing type in TSL
    const opacityNode = positionBuffer.toAttribute().w;

    const scaleNode = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const baseScale = vec2(mix(0.3, 1.2, hash(instanceIndex.add(4.0))));

      // Add custom size attenuation based on the Z position
      const posZ = positionWorld.z;
      const backAttenuation = smoothstep(-5.0, 0.0, posZ);
      const forwardAttenuation = smoothstep(0.0, 8.0, posZ).oneMinus();
      const attenuation = backAttenuation.mul(forwardAttenuation);

      const scale = baseScale.mul(attenuation);
      return scale;
    })();

    const key = colorNode.uuid;

    const updateParticles = Fn(() => {
      const seed = seedBuffer.element(instanceIndex);
      const pos = positionBuffer.element(instanceIndex).xyz;
      const life = positionBuffer.element(instanceIndex).w;
      const vel = velocityBuffer.element(instanceIndex).xyz;
      const object = velocityBuffer.element(instanceIndex).w;
      const dt = deltaTime.mul(0.1);

      If(life.greaterThan(0.0), () => {
        const noise = mx_fractal_noise_vec3(
          pos.add(time.mul(0.25)),
          4.0,
          1.0,
          0.4,
          0.5
        ).mul(life.add(0.25));

        If(object.equal(1.0), () => {
          noise.mulAssign(0.04);
        }).Else(() => {
          noise.mulAssign(0.1);
        });
        // Update velocity with turbulence.
        vel.addAssign(noise);
        // Update position based on velocity and time.
        pos.addAssign(vel.mul(dt.mul(seed)));
        // Subtract lifetime.
        life.subAssign(dt);
      });
    })().compute(PARTICLE_COUNT);

    // Spawn function: only reset particles that are dead.
    const spawnParticles = Fn(() => {
      const idx = instanceIndex.toVar(); //spawnIndex.add(instanceIndex).mod(particleCount).toInt();
      const pos = positionBuffer.element(instanceIndex).xyz;

      const life = positionBuffer.element(instanceIndex).w;
      const vel = velocityBuffer.element(instanceIndex).xyz;
      const object = velocityBuffer.element(instanceIndex).w;
      const seed = seedBuffer.element(instanceIndex);
      const s = seed.mul(2.0).sub(1).toVar();

      // Spawn new particle if the current one is dead
      If(life.lessThanEqual(0.0), () => {
        // Assign a random lifetime
        life.assign(mix(0.03, 0.24, hash(idx.add(2))));

        const isText = object.equal(1.0);

        If(isText, () => {
          // Spawn text particles
          const randomIndex = hash(instanceIndex)
            .mul(textPoints.length / 3)
            .floor();
          const textPos = textPositionBuffer.element(randomIndex);
          pos.assign(textPos);
          const textVel = vec3(0.0, 0.0, -4.0);
          vel.assign(textVel);
        }).Else(() => {
          // Spawn on the ring
          const shouldCluster = seed.lessThan(0.4);

          If(shouldCluster, () => {
            // Instead of using a fully random angle
            const randomValue = hash(instanceIndex.add(2));
            const clusterIndex = randomValue
              .mul(NUMBER_OF_RING_CLUSTERS)
              .floor();
            const clusterCenter = clusterIndex
              .div(NUMBER_OF_RING_CLUSTERS)
              .mul(PI2)
              .sub(randomValue);
            const angleOffset = mx_noise_float(
              vec3(s.mul(12.0), time, instanceIndex)
            );
            const angle = clusterCenter.add(angleOffset);
            const newPos = vec3(
              sin(angle.add(randomValue.mul(0.1))).mul(ringRadius),
              cos(angle.sub(randomValue.mul(0.1))).mul(ringRadius),
              0.05
            );
            pos.assign(newPos);

            // Generate an outward velocity based on the angle
            const newVel = vec3(
              sin(angle).mul(s.mul(1.0)),
              cos(angle).mul(seed.mul(1.0)),
              s.mul(2.0)
            );
            vel.assign(newVel);
          }).Else(() => {
            // Spread around the ring...
            const angle = hash(instanceIndex).mul(PI2);

            const ringNoise = mx_noise_float(
              vec3(pos.x.mul(3.0), hash(instanceIndex.add(1)), time.mul(0.2))
            );

            const newPos = vec3(
              sin(angle.add(ringNoise.mul(0.3)))
                .mul(ringRadius)
                .add(ringNoise.mul(0.2)),
              cos(angle).mul(ringRadius).add(ringNoise.mul(0.2)),
              0.0
            );
            pos.assign(newPos);

            // Generate an outward velocity based on the angle
            const newVel = vec3(
              sin(angle).mul(seed.mul(2.0)),
              cos(angle).mul(s.mul(2.0)),
              s.mul(32.0)
            );
            vel.assign(newVel);
          });
        });
      });
    })().compute(PARTICLE_COUNT);

    return {
      key,
      positionNode,
      colorNode,
      scaleNode,
      opacityNode,
      updateParticles,
      spawnParticles,
    };
  }, [renderer, textPoints]);

  useFrame(() => {
    if (!textPoints) return;
    if (!renderer) return;
    if (!updateParticles || !spawnParticles) return;
    renderer.compute(updateParticles);
    renderer.compute(spawnParticles);
  });

  if (!textPoints) return null;

  return (
    <>
      <instancedMesh
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[0.04, 0.04]} />
        <spriteNodeMaterial
          key={key}
          positionNode={positionNode}
          colorNode={colorNode}
          scaleNode={scaleNode}
          opacityNode={opacityNode}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent={true}
        />
      </instancedMesh>
    </>
  );
};

type VideoProps = {
  shouldPlay: boolean;
};

export const TheRingVideo: FC<VideoProps> = ({ shouldPlay = false }) => {
  const videoTexture = useVideoTexture("/videos/ring-girl.mp4");
  videoTexture.colorSpace = SRGBColorSpace;
  const planeWidth = 16;
  const planeHeight = 9;
  // const videoAspect = 9 / 16; // videoTexture.image.width / videoTexture.image.height;

  const { colorNode, opacityNode, uOpacity, uVideoTexture } = useMemo(() => {
    const uVideoTexture = uniform(VideoTexture, typeof VideoTexture);
    const uOpacity = uniform(float(0.0)).label("isPlaying");

    const opacityNode = uOpacity;

    const colorNode = Fn(() => {
      const colour = vec4(0.0).toVar();
      // @ts-expect-error use of video texture not TS safe
      const videoColour = texture(uVideoTexture.value).label("videoTexture");

      const aspectUv = uv().toVar();
      const videoAspect = float(16 / 9); // videoTexture.image.width / videoTexture.image.height;
      aspectUv.x.mulAssign(videoAspect);

      const distanceToCenter = aspectUv.distance(
        vec2(float(0.5).mul(videoAspect), 0.5)
      );
      const smoothCircle = smoothstep(0.1, 0.5, distanceToCenter);
      colour.assign(mix(videoColour, vec4(0.0), smoothCircle));
      colour.a.mulAssign(0.3);

      return colour;
    })();

    return { colorNode, opacityNode, uOpacity, uVideoTexture };
  }, []);

  useGSAP(
    () => {
      if (!uOpacity) return;
      gsap.to(uOpacity, { value: shouldPlay ? 1.0 : 0.0, duration: 1.0 });
    },
    { dependencies: [shouldPlay, uOpacity] }
  );

  useFrame(() => {
    if (!texture || !uVideoTexture) return;
    videoTexture.update();
    // @ts-expect-error new ting
    uVideoTexture.value = videoTexture;
  });

  if (!videoTexture) return null;

  return (
    <mesh position={[0, 0, -3]} scale={0.8}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicNodeMaterial
        colorNode={colorNode}
        opacityNode={opacityNode}
        depthTest={false}
        transparent={true}
      />
    </mesh>
  );
};

export const backgroundNode = Fn(() => {
  const baseColour = mix(
    color("#000"),
    color("#0C0D0D"),
    smoothstep(0.0, 1.0, screenUV.y)
  ).toVar();

  const specklyNoise = mx_noise_float(
    vec3(screenUV.x.mul(320), screenUV.y.mul(360), 1.0)
  );
  const noiseStep = mod(time, 0.3).mul(0.4);

  const noiseLines = mx_noise_float(
    vec3(
      screenUV.x.mul(4).add(specklyNoise).add(noiseStep),
      screenUV.y.mul(24).add(specklyNoise).sub(noiseStep),
      time.mul(0.4)
    )
  );

  const noiseColor = color("#fff");
  const finalColor = mix(baseColour, noiseColor, noiseLines.mul(0.012));

  const screenAspect = screenSize.x.div(screenSize.y);

  const aspectUv = screenUV.toVar();
  aspectUv.x.mulAssign(screenAspect);

  const distanceToCenter = aspectUv.distance(
    vec2(float(0.5).mul(screenAspect), 0.5)
  );
  const smoothCircle = smoothstep(0.3, 0.8, distanceToCenter);
  const c = mix(finalColor, color("#000"), smoothCircle);

  return c;
})();
