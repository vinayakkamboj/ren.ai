import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/platform/widgets";
import { GithubConnect } from "@/components/platform/github-connect";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the services Ren Code works with. GitHub powers the repository workflow."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GithubConnect />

        <Panel title="How repository access works">
          <ol className="space-y-4">
            {[
              { n: "01", t: "Authorize", d: "Sign in through GitHub OAuth. We request the minimum scopes needed and show them up front." },
              { n: "02", t: "Select repositories", d: "Grant access per repository. Ren Code never sees repos you don't choose." },
              { n: "03", t: "Index & analyze", d: "Selected repos are indexed so the model understands structure and dependencies." },
              { n: "04", t: "Revoke anytime", d: "Disconnect or narrow access from here or from your GitHub settings whenever you want." },
            ].map((s) => (
              <li key={s.n} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="font-mono text-[11.5px] text-brass">{s.n}</span>
                <div>
                  <p className="text-[13.5px] font-medium text-dusk">{s.t}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dusk-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
