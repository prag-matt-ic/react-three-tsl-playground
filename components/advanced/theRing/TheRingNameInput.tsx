"use client";
import { useRouter } from "next/navigation";
import React, {
  Dispatch,
  type FC,
  type FormEvent,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { RING_RADIUS } from "./TheRingScene";

type Props = {
  name?: string;
  setTextPoints: Dispatch<SetStateAction<Float32Array | null>>;
};

export const TheRingNameInput: FC<Props> = ({ name, setTextPoints }) => {
  const { push } = useRouter();
  const [inputName, setInputName] = useState<string>(name ?? "");

  useLayoutEffect(() => {
    setInputName(name ?? "");
  }, [name]);

  useEffect(() => {
    function generateTextPoints() {
      if (!name) return;
      const lowercaseName = name.toLowerCase();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      // canvas.style.position = "fixed";
      // canvas.style.top = "0";
      // canvas.style.left = "0";
      // canvas.style.zIndex = "2000";
      // document.body.appendChild(canvas);
      if (!ctx) return;
      const size = 640;
      canvas.width = size;
      canvas.height = size;

      // Fill the canvas with a black background.
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, size, size);

      // Start with an initially large font size.
      let fontSize = 120;
      // Set the font using the custom font-family.
      ctx.font = `${fontSize}px "Long Cang", "Long Cang Fallback"`;
      ctx.letterSpacing = "32px";

      // Measure the text width to adjust the font size so that it fills the canvas width.
      const measuredWidth = ctx.measureText(lowercaseName).width;
      fontSize = fontSize * (size / measuredWidth);
      ctx.font = `${fontSize}px "Long Cang", "Long Cang Fallback"`;

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(lowercaseName, size / 2, size / 2);

      const data = ctx.getImageData(0, 0, size, size).data;
      const textPointsWorldPos = [];

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200) {
          const pixelX = (i / 4) % size;
          const pixelY = Math.floor(i / 4 / size);
          // Normalize to [-1, 1]
          const normX = (pixelX / size) * 2 - 1;
          const normY = -((pixelY / size) * 2 - 1); // Invert Y if needed
          const x = normX * RING_RADIUS;
          const y = normY * RING_RADIUS;
          const z = 0;
          textPointsWorldPos.push(x, y, z);
        }
      }

      const points = new Float32Array(textPointsWorldPos);
      setTextPoints(points);
    }

    generateTextPoints();
  }, [name, setTextPoints]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputName) return;
    setTextPoints(null);
    push(`?name=${inputName}`);
  };

  const onResetClick = () => {
    setTextPoints(null);
    push("?");
  };

  const [isCopied, setIsCopied] = useState(false);

  const onCopyUrlClick = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text to clipboard:", err);
    }
  };

  if (!!name)
    return (
      <section className="fixed top-8 left-8 z-50 flex flex-col gap-2">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputName}
            className="border-white tracking-widest bg-black text-left text-white p-2 text-5xl outline-none"
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Enter a name"
          />
        </form>

        <button
          className={`text-2xl tracking-wide uppercase text-left hover:text-cyan-400 p-2 ${
            isCopied ? "text-cyan-600" : ""
          }`}
          onClick={onCopyUrlClick}
        >
          {isCopied ? "It's all yours!" : "Copy URL"}
        </button>
        <button
          className="text-2xl tracking-wide uppercase text-left hover:text-cyan-400 p-2"
          onClick={onResetClick}
        >
          Reset
        </button>
      </section>
    );

  return (
    <section className="relative size-full flex items-center justify-center z-50">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={inputName}
          className="border-white tracking-widest text-center text-white py-2 px-4 text-7xl outline-none"
          onChange={(e) => setInputName(e.target.value)}
          placeholder="Enter a name"
        />
        <button
          formAction="submit"
          className="text-3xl cursor-pointer hover:opacity-60"
          disabled={!inputName}
        >
          ENTER
        </button>
      </form>
    </section>
  );
};
