import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase tracking-eyebrow text-bronze",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-serif text-display font-normal text-ink text-balance">
        {title}
      </h2>
      {lede ? (
        <p className="mt-6 max-w-2xl text-lede text-graphite text-pretty">
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}
