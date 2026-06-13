"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpLeft,
  BookText,
  FolderGit2,
  GitPullRequest,
  Github,
  LayoutGrid,
  MessagesSquare,
  Plug,
  Settings,
} from "lucide-react";
import { RenMark } from "@/components/ui/wordmark";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";

const sections: {
  heading: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    heading: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutGrid },
      { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
      { href: "/dashboard/conversations", label: "AI Conversations", icon: MessagesSquare },
    ],
  },
  {
    heading: "Code",
    items: [
      { href: "/dashboard/repositories", label: "Repositories", icon: Github },
      { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
      { href: "/dashboard/pull-requests", label: "Pull Requests", icon: GitPullRequest },
      { href: "/dashboard/documentation", label: "Documentation", icon: BookText },
    ],
  },
  {
    heading: "Account",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = sections
    .flatMap((s) => s.items)
    .find((i) =>
      i.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(i.href),
    );

  return (
    <div className="flex min-h-screen bg-carbon text-dusk">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-carbon-line bg-carbon lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-carbon-line px-5">
          <RenMark className="size-5 text-brass" />
          <span className="font-serif text-[1.05rem] font-medium tracking-tight">Ren Code</span>
        </div>

        <nav className="platform-scroll flex-1 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.heading} className="mb-7">
              <p className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dusk-faint">
                {section.heading}
              </p>
              <ul className="mt-2.5 space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] tracking-tight transition-colors duration-200",
                          active
                            ? "bg-carbon-high text-dusk"
                            : "text-dusk-muted hover:bg-carbon-raised hover:text-dusk",
                        )}
                      >
                        <item.icon
                          className={cn("size-4", active ? "text-brass" : "text-dusk-faint")}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-carbon-line p-3">
          <UserMenu />
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] text-dusk-muted transition-colors duration-200 hover:bg-carbon-raised hover:text-dusk"
          >
            <ArrowUpLeft className="size-4 text-dusk-faint" />
            ren.ai
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-carbon-line bg-carbon/90 px-5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3 font-mono text-[11.5px] text-dusk-muted">
            <Link href="/dashboard" className="text-dusk-faint transition-colors hover:text-dusk lg:hidden">
              <RenMark className="size-4 text-brass" />
            </Link>
            <span className="hidden text-dusk-faint sm:inline">ren-code</span>
            <span className="hidden text-dusk-faint sm:inline">/</span>
            <span className="text-dusk">{current?.label.toLowerCase() ?? "overview"}</span>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brass px-3 text-[12.5px] font-medium text-carbon transition-colors duration-200 hover:bg-brass-deep"
          >
            New project
          </Link>
        </header>

        <main className="platform-scroll flex-1 px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
