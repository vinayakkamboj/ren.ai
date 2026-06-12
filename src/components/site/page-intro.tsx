import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export function PageIntro({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line">
      <Container className="pb-16 pt-40 md:pb-20 md:pt-48">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-6 max-w-[18ch] font-serif text-display-xl font-normal text-ink text-balance">
            {title}
          </h1>
          {lede ? (
            <p className="mt-7 max-w-[54ch] text-lede text-graphite text-pretty">{lede}</p>
          ) : null}
          {children}
        </Reveal>
      </Container>
    </header>
  );
}
