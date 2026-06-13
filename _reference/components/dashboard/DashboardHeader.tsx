"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/email";
import { AdminNotificationBell } from "./AdminNotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const admin = isAdmin(user.email);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <header className="sticky top-0 z-40 border-b border-[#2a2222] bg-[#1a1414]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: "52px" }}>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/nutrient-logo.png"
            alt="Nutrient"
            width={22}
            height={22}
            className="shrink-0"
            style={{ objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Nutrient
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Usage link */}
          <a
            href="/usage"
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#52403f", border: "1px solid transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c4a882"; (e.currentTarget as HTMLElement).style.borderColor = "#2a2222"; (e.currentTarget as HTMLElement).style.background = "#1f1818"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52403f"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Usage
          </a>

          {/* Notification bell - admin only */}
          {admin && <AdminNotificationBell />}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                  style={admin
                    ? { background: "rgba(196,168,130,0.15)", color: "#c4a882", border: "1px solid rgba(196,168,130,0.25)" }
                    : { background: "#27272a", color: "#a1a1aa" }
                  }
                >
                  {initials}
                </div>
                <span className="hidden sm:block text-xs text-zinc-500 max-w-[140px] truncate">
                  {user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs text-foreground font-medium truncate">{user.email}</p>
                  {admin ? (
                    <p className="text-xs flex items-center gap-1" style={{ color: "#c4a882" }}>
                      <ShieldCheck className="h-3 w-3" />
                      Administrator
                    </p>
                  ) : user.user_metadata?.role ? (
                    <p className="text-xs text-muted-foreground">{user.user_metadata.role as string}</p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {admin && (
                <>
                  <DropdownMenuItem asChild>
                    <a href="/admin/accounts" className="cursor-pointer">
                      Admin panel
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}
