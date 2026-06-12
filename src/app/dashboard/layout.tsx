import type { Metadata } from "next";
import { PlatformShell } from "@/components/platform/shell";

export const metadata: Metadata = {
  title: {
    default: "Research Platform",
    template: "%s — Ren Research Platform",
  },
  description: "Ren AI internal research platform.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PlatformShell>{children}</PlatformShell>;
}
