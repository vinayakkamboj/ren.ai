import type { Metadata } from "next";
import { Playground } from "@/components/site/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "A research-grade interface to Ren Code. Ask questions, plan changes, and inspect the model's reasoning.",
};

export default function PlaygroundPage() {
  return <Playground />;
}
