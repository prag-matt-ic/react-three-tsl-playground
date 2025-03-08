"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import React, { type FC, useRef } from "react";
import {
  SwitchTransition,
  Transition,
  TransitionStatus,
} from "react-transition-group";

import arrowOutIcon from "@/components/advanced/ps5/arrow-out.svg";
import avatarImg from "@/components/advanced/ps5/avatar.jpg";
import optionsIcon from "@/components/advanced/ps5/options.svg";
import brandIcon from "@/components/advanced/ps5/p-brand.svg";
import restartIcon from "@/components/advanced/ps5/restart.svg";

import usePS5Store, { Stage } from "./usePS5Store";

gsap.registerPlugin(useGSAP);

const PS5UI: FC = () => {
  const stage = usePS5Store((s) => s.stage);
  const wrapper = useRef<HTMLDivElement>(null);

  return (
    <SwitchTransition mode="in-out">
      <Transition
        key={stage}
        timeout={{ enter: 0, exit: 1000 }}
        nodeRef={wrapper}
      >
        {(transitionStatus) => {
          return (
            <div
              ref={wrapper}
              className="fixed inset-0 pointer-events-none flex items-center justify-center"
            >
              {stage === Stage.BRAND && (
                <PulsingBrand transitionStatus={transitionStatus} />
              )}
              {stage === Stage.AVATAR && (
                <Avatars transitionStatus={transitionStatus} />
              )}
            </div>
          );
        }}
      </Transition>
    </SwitchTransition>
  );
};

export default PS5UI;

type Props = {
  transitionStatus: TransitionStatus;
};

const PulsingBrand: FC<Props> = ({ transitionStatus }) => {
  const setStage = usePS5Store((s) => s.setStage);
  const circleTweens = useRef<gsap.core.Tween[]>([]);
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (transitionStatus === "entered") {
        const circles: HTMLDivElement[] = gsap.utils.toArray(".circle-pulse");
        // Mapped rather than using selector so that the delay and duration can be set per circle.
        circleTweens.current = circles.map((circle, index) => {
          return gsap.to(circle, {
            keyframes: {
              "0%": { opacity: 0, scale: 1, ease: "none" },
              "25%": { opacity: 0.3, scale: 1.25, ease: "none" },
              "75%": { opacity: 1, scale: 1.75, ease: "none" },
              "100%": { opacity: 0, scale: 2, ease: "none" },
            },
            duration: 1.5,
            repeat: -1,
            repeatDelay: 0.5,
            delay: index / 1.5,
          });
        });
        // Fade in the container
        gsap.fromTo(
          container.current,
          { opacity: 0, scale: 0.6 },
          { opacity: 1, duration: 0.5, scale: 1, ease: "power1.in" }
        );
      }
      if (transitionStatus === "exiting") {
        gsap
          .timeline()
          // First fade out the button and label
          .to(["button", "span"], { opacity: 0, duration: 0.3 })
          // Then the container (circles)
          .to(container.current, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
              circleTweens.current.forEach((tween) => tween.kill());
            },
          });
      }
    },
    { dependencies: [transitionStatus], scope: container }
  );

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center opacity-0"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="circle-pulse opacity-0 absolute aspect-square size-24 rounded-full border-white border-[1.5px]"
          style={{
            boxShadow:
              "0 0 6px 2px rgba(255, 255, 255, 0.25), inset 0 0 6px 2px rgba(255, 255, 255, 0.2)",
          }}
        />
      ))}
      <button
        id="brand-button"
        className="relative flex items-center justify-center cursor-pointer pointer-events-auto hover:scale-125 transition-transform duration-300 ease-in-out"
        aria-label="Press to start"
        onClick={() => setStage(Stage.AVATAR)}
      >
        <Image src={brandIcon} alt="Pragmattic" className="size-24" />
      </button>

      <span className="absolute -bottom-24 text-center text-sm font-light text-white/80">
        Press to enter
      </span>
    </div>
  );
};

PulsingBrand.displayName = "PulsingBrand";

const Avatars: FC<Props> = ({ transitionStatus }) => {
  const setStage = usePS5Store((s) => s.setStage);
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (transitionStatus === "entering") {
        gsap
          .timeline()
          // Transition the avatar circle from the brand logo scale to the full size
          .fromTo(
            "#avatar-circle",
            { opacity: 0, scale: 0.3 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
          )
          // then bring the avatar image in
          .to(
            "#avatar-img",
            { opacity: 1, duration: 0.4, ease: "power2.in" },
            0.4
          )
          // followed by the secondary column and then header
          .fromTo(
            "#see",
            { opacity: 0, scale: 0.7, xPercent: 16 },
            {
              opacity: 1,
              scale: 1,
              xPercent: 0,
              duration: 0.25,
              ease: "power1.in",
            },
            "-=0.15"
          )
          .fromTo(
            "header",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.24, ease: "power1.out" }
          );
      }

      if (transitionStatus === "exiting") {
        gsap.to(container.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power1.out",
        });
      }
    },
    { dependencies: [transitionStatus], scope: container }
  );

  const onRestartPress = () => {
    setStage(Stage.RESTART);
  };

  return (
    <section
      ref={container}
      className="absolute grid place-content-center grid-cols-3 grid-rows-3 h-full gap-x-6 gap-y-3"
    >
      <header className="col-span-3 flex flex-col items-center justify-center gap-4 opacity-0 text-center">
        <h1 className="text-4xl tracking-tight font-medium">
          PS5 Landing Experience
        </h1>
        <p className="max-w-xl text-white/80 font-light leading-relaxed">
          This project was inspired by the PS5 loading screen, and is built
          using React (Next.js), Three.js (R3F), GSAP and TailwindCSS. All of
          the shader/GPU logic is written entirely in Typescript using Three.js
          Shading Language.
        </p>
      </header>

      {/* See how its done column */}
      <div id="see" className="grid row-span-2 grid-rows-subgrid">
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          className="group size-48 rounded-full pointer-events-auto cursor-pointer hover:bg-white/20 backdrop-blur-sm place-self-center flex items-center justify-center bg-white/10"
        >
          <Image
            src={arrowOutIcon}
            alt="add"
            className="size-14 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200"
          />
        </a>
        <h3 className="text-2xl tracking-tight font-light mt-2 text-center">
          See the code
        </h3>
      </div>

      {/* Profile column */}
      <div className="relative grid row-span-2 grid-rows-subgrid">
        <div
          id="avatar-circle"
          className="aspect-square place-self-center size-72 p-2.5 rounded-full border-white border-[1.5px] opacity-0"
          style={{
            boxShadow:
              "0 0 6px 2px rgba(255, 255, 255, 0.25), inset 0 0 6px 2px rgba(255, 255, 255, 0.2)",
          }}
        >
          <Image
            src={avatarImg}
            id="avatar-img"
            alt="Matthew Frawley"
            className="rounded-full opacity-0"
            quality={85}
            priority={true}
          />
        </div>

        <div className="w-full flex flex-col items-center justify-between pb-8">
          <div className="space-y-3">
            <h3 className="text-2xl tracking-tight font-light mt-2 text-center">
              Matthew Frawley
            </h3>
            <button className="group flex items-center gap-2 mx-auto cursor-pointer pointer-events-auto">
              <Image src={optionsIcon} alt="plus" className="h-5 w-fit" />
              <span className="text-left text-sm font-light text-white/80 group-hover:text-white">
                Contact Options
              </span>
            </button>
          </div>

          <button
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 align-bottom cursor-pointer pointer-events-auto"
            onClick={onRestartPress}
          >
            <Image src={restartIcon} alt="plus" className="size-8" />
          </button>
        </div>
      </div>
    </section>
  );
};

Avatars.displayName = "Avatars";
