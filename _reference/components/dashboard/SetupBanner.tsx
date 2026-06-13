"use client";

export function SetupBanner() {
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3 text-sm">
        <span className="text-amber-400 font-semibold shrink-0">⚠ Setup required</span>
        <div className="text-amber-200/70 space-y-1">
          <p>
            Supabase is not connected. Create a{" "}
            <code className="font-mono text-xs bg-amber-500/10 px-1 py-0.5 rounded">.env.local</code>{" "}
            file in the project root with:
          </p>
          <pre className="font-mono text-xs bg-black/40 border border-amber-500/20 rounded p-2 mt-1 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_NUTRIENT_LICENSE_KEY=your-license-key`}
          </pre>
          <p className="text-xs">
            The direct database connection string can go in{" "}
            <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">DATABASE_URL</code>{" "}
            for database tools, but this app connects through the project URL and publishable key.
          </p>
        </div>
      </div>
    </div>
  );
}
