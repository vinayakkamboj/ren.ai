import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Privacy Policy — Ren AI",
  description: "How Ren AI collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Legal"
        title="Privacy Policy."
        lede="How Ren AI collects, uses, and protects the information you share with us."
      />

      <Container className="py-20 md:py-28">
        <div className="prose-ren max-w-2xl space-y-10 text-[15px] leading-[1.75] text-graphite">
          <section>
            <p className="font-mono text-[11px] uppercase tracking-eyebrow text-graphite-soft">
              Effective date · June 2026
            </p>
            <p className="mt-4">
              Ren AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the Ren
              Code platform and related services. This policy explains what data
              we collect and how we use it.
            </p>
          </section>

          {[
            {
              title: "What we collect",
              body: "We collect the email address you use to create an account and, if you connect GitHub, the list of repositories you grant access to. We log API requests to enforce rate limits and improve the service. We do not sell your data.",
            },
            {
              title: "How we use it",
              body: "Your email is used to authenticate you and communicate about your account. Repository access is used only to operate Ren Code on the repositories you select. Usage logs are used for rate limiting, debugging, and service improvement.",
            },
            {
              title: "Data retention",
              body: "You may delete your account at any time from Settings. Upon deletion, your profile, conversations, and connected repositories are removed from our systems within 30 days.",
            },
            {
              title: "Third-party services",
              body: "We use Supabase to store account data and sessions. Supabase's privacy policy governs their handling of that data. We use GitHub OAuth to connect repositories — GitHub's privacy policy governs that flow.",
            },
            {
              title: "Cookies and sessions",
              body: "We use secure, HTTP-only cookies to maintain your authenticated session. No advertising or tracking cookies are used.",
            },
            {
              title: "Contact",
              body: "For privacy questions, contact us at privacy@ren.ai.",
            },
          ].map((section) => (
            <section key={section.title} className="border-t border-line pt-8">
              <h2 className="font-serif text-title text-ink">{section.title}</h2>
              <p className="mt-3 text-pretty">{section.body}</p>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
