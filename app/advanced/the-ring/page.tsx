import { Metadata } from "next";
import { Long_Cang } from "next/font/google";
import { use } from "react";

import TheRing from "@/components/advanced/theRing/TheRingClient";

export const metadata: Metadata = {
  title: "The Ring with React Three Fiber & WebGPU",
  description: "The Ring movie poster effect using WebGPU",
};

type PageProps = {
  searchParams: Promise<{ name: string | undefined }>;
};

const longCang = Long_Cang({
  variable: "--long-cang",
  subsets: ["latin"],
  weight: ["400"],
});

export default function TheRingPage(props: PageProps) {
  const { name } = use(props.searchParams);

  return (
    <main className={`${longCang.className} w-full h-lvh`}>
      <TheRing name={name} />
    </main>
  );
}
