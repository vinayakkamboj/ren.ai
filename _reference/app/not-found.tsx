import Link from "next/link";
import { GridBackground } from "@/components/auth/GridBackground";

export default function NotFound() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden p-8"
      style={{ background: "#1a1414" }}
    >
      <GridBackground />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        {/* Small label */}
        <span
          className="text-xs font-semibold uppercase tracking-[0.2em] mb-6"
          style={{ color: "#52403f" }}
        >
          404
        </span>

        {/* Giant Nucode wordmark */}
        <h1
          style={{
            fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
            fontSize: "clamp(80px, 18vw, 160px)",
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            marginBottom: "1.5rem",
          }}
        >
          Nucode
        </h1>

        {/* Divider */}
        <div className="w-8 h-px mb-6" style={{ background: "#2a2222" }} />

        {/* Message */}
        <p
          className="text-sm leading-relaxed mb-2"
          style={{ color: "#71717a" }}
        >
          Hmm - this page doesn&apos;t exist.
        </p>
        <p
          className="text-xs leading-relaxed mb-10"
          style={{ color: "#3f3535" }}
        >
          You might have followed a broken link or typed something that isn&apos;t here.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
          style={{
            /* background: "#f4f4f5", color: "#1a1414", */ /* old: white */
            background: "#c4a882",
            color: "#1a1414",
          }}
        >
          Back to Nucode
        </Link>

        {/* Subtle brand note */}
        <p className="mt-12 text-[11px]" style={{ color: "#52403f" }}>
          The complete Nutrient demo platform
        </p>
      </div>
    </div>
  );
}
