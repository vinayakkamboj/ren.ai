"use client";

import { useEffect, useState } from "react";
import { Bot, Plug, BarChart2, Settings, Users, ShieldCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PipelinesDashboard from "./PipelinesDashboard";
import AccountsDashboard from "./AccountsDashboard";
import RequestsDashboard from "./RequestsDashboard";

type AdminTab = "pipelines" | "accounts" | "requests" | "mcp" | "analytics" | "settings";

interface AdminShellProps {
  activeTab: AdminTab;
}

interface SidebarItem {
  id: AdminTab;
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "pipelines", label: "Nucode",         href: "/admin/pipelines", icon: <Bot size={16} /> },
  { id: "accounts",  label: "Accounts",        href: "/admin/accounts",  icon: <Users size={16} /> },
  { id: "requests",  label: "Requests",        href: "/admin/requests",  icon: <Clock size={16} /> },
  { id: "mcp",       label: "MCP Connections", href: "/admin/mcp",       icon: <Plug size={16} />,     disabled: true },
  { id: "analytics", label: "Analytics",       href: "/admin/analytics", icon: <BarChart2 size={16} />, disabled: true },
  { id: "settings",  label: "Settings",        href: "/admin/settings",  icon: <Settings size={16} />, disabled: true },
];

export default function AdminShell({ activeTab }: AdminShellProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    fetch("/api/admin/pending")
      .then((r) => r.json())
      .then((d: { count?: number }) => setPendingCount(d.count ?? 0))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/admin/pending")
        .then((r) => r.json())
        .then((d: { count?: number }) => setPendingCount(d.count ?? 0))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#1a1414", color: "#f4f4f5" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 shrink-0 backdrop-blur-md"
        style={{ height: 52, borderBottom: "1px solid #2a2222", background: "rgba(26,20,20,0.92)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Nucode
          </span>
          {/* Same badge as DashboardHeader */}
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide"
            style={{ background: "rgba(196,168,130,0.12)", color: "#c4a882", border: "1px solid rgba(196,168,130,0.2)" }}
          >
            <ShieldCheck size={9} />
            Admin
          </span>
        </div>

        {email && (
          <span
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: "#211a1a", color: "#71717a", border: "1px solid #332b2b" }}
          >
            {email}
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-56 shrink-0 flex flex-col py-4 gap-0.5"
          style={{ borderRight: "1px solid #2a2222", background: "#1a1414" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-5 pb-2"
            style={{ color: "#52403f" }}
          >
            Navigation
          </p>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = item.id === activeTab;
            if (item.disabled) {
              return (
                <div key={item.id} className="group relative px-3">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md select-none cursor-not-allowed"
                    style={{ color: "#3f3535" }}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex items-center whitespace-nowrap z-50">
                    <div
                      className="text-xs px-2 py-1 rounded shadow-xl"
                      style={{ background: "#211a1a", border: "1px solid #332b2b", color: "#a1a1aa" }}
                    >
                      Coming soon
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <a
                key={item.id}
                href={item.href}
                className="flex items-center justify-between mx-3 px-3 py-2 rounded-md text-sm transition-colors"
                style={isActive ? { background: "#2a2222", color: "#f4f4f5" } : { color: "#8b7070" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0" style={isActive ? { color: "#c4a882" } : undefined}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {/* Pending badge on Requests tab */}
                {item.id === "requests" && pendingCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: "#c4a882", color: "#1a1414" }}
                  >
                    {pendingCount}
                  </span>
                )}
              </a>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#1a1414" }}>
          {activeTab === "pipelines" && <PipelinesDashboard />}
          {activeTab === "accounts"  && <AccountsDashboard />}
          {activeTab === "requests"  && <RequestsDashboard />}
        </main>
      </div>
    </div>
  );
}
