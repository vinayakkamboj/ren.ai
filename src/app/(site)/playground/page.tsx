import type { Metadata } from "next";
import { Playground } from "@/components/site/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "A research-grade interface to the Ren-3 family. Inspect deliberation, confidence, and sources on every response.",
};

export default function PlaygroundPage() {
  return <Playground />;
}
