"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Flip from "gsap/dist/Flip";
import Image from "next/image";
import React, { type FC, forwardRef, useLayoutEffect, useRef } from "react";
import {
  SwitchTransition,
  Transition,
  TransitionStatus,
} from "react-transition-group";

import addIcon from "@/components/advanced/ps5/add.svg";
import avatarImg from "@/components/advanced/ps5/avatar.jpg";
import optionsIcon from "@/components/advanced/ps5/options.svg";
import brandIcon from "@/components/advanced/ps5/p-brand.svg";
import restartIcon from "@/components/advanced/ps5/restart.svg";

import usePS5Store, { Stage } from "./usePS5Store";

gsap.registerPlugin(useGSAP, Flip);

const PS5UI: FC = () => {
  const stage = usePS5Store((s) => s.stage);
  const container = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
      <SwitchTransition mode="in-out">
        <Transition
          key={stage}
          timeout={{ enter: 0, exit: 1000 }}
          nodeRef={container}
        >
          {(transitionStatus) => {
            if (stage === Stage.BRAND)
              return (
                <PulsingBrand
                  ref={container}
                  transitionStatus={transitionStatus}
                />
              );
            if (stage === Stage.AVATAR)
              return (
                <Avatars ref={container} transitionStatus={transitionStatus} />
              );
            return <div ref={container} />;
          }}
        </Transition>
      </SwitchTransition>
    </div>
  );
};

export default PS5UI;

type Props = {
  transitionStatus: TransitionStatus;
};

const PulsingBrand = forwardRef<HTMLDivElement, Props>(
  ({ transitionStatus }, ref) => {
    const setStage = usePS5Store((s) => s.setStage);
    const circleTweens = useRef<gsap.core.Tween[]>([]);

    useLayoutEffect(() => {
      console.log("BRAND", transitionStatus);

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
        gsap.fromTo(
          "#brand",
          { opacity: 0, scale: 0.6 },
          { opacity: 1, duration: 0.5, scale: 1, ease: "power1.in" }
        );
      }
      if (transitionStatus === "exiting") {
        gsap
          .timeline()
          .to("#brand-button", { opacity: 0, duration: 0.4 })
          .to("#brand", {
            opacity: 0,
            onComplete: () => {
              circleTweens.current.forEach((tween) => tween.kill());
            },
          });
      }
    }, [transitionStatus]);

    return (
      <div
        ref={ref}
        id="brand"
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
      </div>
    );
  }
);

PulsingBrand.displayName = "PulsingBrand";

const Avatars = forwardRef<HTMLDivElement, Props>(
  ({ transitionStatus }, ref) => {
    const setStage = usePS5Store((s) => s.setStage);

    useLayoutEffect(() => {
      if (transitionStatus === "entering") {
        gsap
          .timeline()
          .fromTo(
            "#avatar-circle",
            { opacity: 0, scale: 0.3 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
          )
          .to(
            "#avatar-img",
            { opacity: 1, duration: 0.3, ease: "power2.in" },
            0.4
          )
          .fromTo(
            "#join",
            { opacity: 0, scale: 0.7, xPercent: 16 },
            {
              opacity: 1,
              scale: 1,
              xPercent: 0,
              duration: 0.25,
              ease: "power1.in",
            },
            "<"
          )
          .to(
            "#avatars-header",
            { opacity: 1, duration: 0.25, ease: "power1.in" },
            "<"
          );
      }

      if (transitionStatus === "exiting") {
        gsap.to("#avatars", { opacity: 0, duration: 0.4, ease: "power1.out" });
      }
    }, [transitionStatus]);

    const onRestartPress = () => {
      setStage(Stage.RESTART);
    };

    return (
      <section
        ref={ref}
        id="avatars"
        className="absolute grid place-content-center grid-cols-3 grid-rows-3 h-full gap-x-6 gap-y-3"
      >
        <header
          id="avatars-header"
          className="col-span-3 flex items-center justify-center gap-4 opacity-0"
        >
          <h2 className="text-4xl tracking-tight font-medium">Welcome</h2>
        </header>

        {/* Join the team column */}
        <div id="join" className="grid row-span-2 grid-rows-subgrid">
          <button className="size-48 rounded-full pointer-events-auto cursor-pointer place-self-center flex items-center justify-center bg-white/10">
            <Image src={addIcon} alt="add" className="size-16" />
          </button>
          <h3 className="text-2xl tracking-tight font-light mt-2 text-center">
            Join the team
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
              <button className="flex items-center cursor-pointer pointer-events-auto">
                <Image src={optionsIcon} alt="plus" className="h-6" />
                <span className="text-left text-sm">Contact Options</span>
              </button>
            </div>

            <button
              className="p-3 rounded-full bg-white/10 align-bottom cursor-pointer pointer-events-auto"
              onClick={onRestartPress}
            >
              <Image src={restartIcon} alt="plus" className="size-8" />
            </button>
          </div>
        </div>
      </section>
    );
  }
);

Avatars.displayName = "Avatars";
