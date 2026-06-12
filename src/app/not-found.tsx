import Link from "next/link";
import { RenMark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <RenMark className="size-10 text-bronze" />
      <p className="mt-10 font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
        404
      </p>
      <h1 className="mt-5 max-w-[20ch] font-serif text-display font-normal text-ink text-balance">
        This page doesn&apos;t exist — and we&apos;d rather say so than guess.
      </h1>
      <p className="mt-6 max-w-[44ch] text-lede text-graphite">
        Calibration applies to navigation, too.
      </p>
      <div className="mt-10">
        <Button href="/" size="lg">
          Return home
        </Button>
      </div>
      <Link
        href="/research"
        className="mt-6 text-sm text-graphite underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
      >
        Or browse the research
      </Link>
    </div>
  );
}
