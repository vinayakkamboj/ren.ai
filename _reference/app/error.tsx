"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GridBackground } from "@/components/auth/GridBackground";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          Something went wrong
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
          An unexpected error occurred.
        </p>
        <p
          className="text-xs leading-relaxed mb-10"
          style={{ color: "#3f3535" }}
        >
          This is on us - try refreshing or head back to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
            style={{ /* background: "#f4f4f5", */ background: "#c4a882", color: "#1a1414" }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium px-5 py-2.5 rounded-lg transition-all"
            style={{ background: "transparent", color: "#71717a", border: "1px solid #2a2222" }}
          >
            Back to Nucode
          </Link>
        </div>

        {/* Error detail (subtle) */}
        {error.digest && (
          <p className="mt-8 text-[10px] font-mono" style={{ color: "#3f3535" }}>
            {error.digest}
          </p>
        )}

        <p className="mt-10 text-[11px]" style={{ color: "#52403f" }}>
          The complete Nutrient demo platform
        </p>
      </div>
    </div>
  );
}
