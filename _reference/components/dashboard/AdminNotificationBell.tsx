"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, X, Clock, RefreshCw, Trash2 } from "lucide-react";

interface PendingUser {
  user_id: string;
  email: string;
  requested_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminNotificationBell() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [open, setOpen] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (!res.ok) return;
      const data = await res.json() as { pending?: PendingUser[] };
      setPending(data.pending ?? []);
    } catch { /* silent */ }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    void fetchPending();
    const id = setInterval(() => void fetchPending(), 30_000);
    return () => clearInterval(id);
  }, [fetchPending]);

  // Close on outside click
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  async function handleAction(userId: string, action: "approve" | "reject" | "delete") {
    setActioning(userId);
    try {
      if (action === "delete") {
        await fetch(`/api/admin/accounts/${userId}/approval`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/accounts/${userId}/${action}`, { method: "POST" });
      }
      setPending((prev) => prev.filter((u) => u.user_id !== userId));
    } catch { /* silent */ } finally {
      setActioning(null);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    await fetchPending();
    setLoading(false);
  }

  const count = pending.length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{
          background: open ? "#2a2222" : "transparent",
          border: "1px solid",
          borderColor: open ? "#3a2f2f" : "transparent",
          color: count > 0 ? "#c4a882" : "#52403f",
        }}
        title={count > 0 ? `${count} pending approval${count > 1 ? "s" : ""}` : "No pending approvals"}
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: "#c4a882", color: "#1a1414" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{ background: "#1a1414", border: "1px solid #2a2222" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #2a2222", background: "#171212" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" style={{ color: "#c4a882" }} />
              <span className="text-xs font-semibold" style={{ color: "#f4f4f5" }}>
                Access requests
              </span>
              {count > 0 && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(196,168,130,0.15)", color: "#c4a882" }}
                >
                  {count}
                </span>
              )}
            </div>
            <button
              onClick={() => void handleRefresh()}
              className="transition-colors"
              style={{ color: "#52403f" }}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Empty state */}
          {count === 0 && (
            <div className="px-4 py-8 text-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full mx-auto mb-3"
                style={{ background: "#171212", border: "1px solid #2a2222" }}
              >
                <Check className="h-4 w-4" style={{ color: "#52403f" }} />
              </div>
              <p className="text-xs font-medium" style={{ color: "#71717a" }}>All caught up</p>
              <p className="text-[11px] mt-1" style={{ color: "#3f3535" }}>No pending access requests.</p>
            </div>
          )}

          {/* Pending list */}
          {count > 0 && (
            <div className="max-h-72 overflow-y-auto">
              {pending.map((u, i) => {
                const initials = u.email.slice(0, 2).toUpperCase();
                const isActioning = actioning === u.user_id;
                return (
                  <div
                    key={u.user_id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={i > 0 ? { borderTop: "1px solid #1f1818" } : {}}
                  >
                    {/* Avatar */}
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "#211a1a", color: "#c4a882", border: "1px solid #2a2222" }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#f4f4f5" }}>
                        {u.email}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: "#52403f" }}>
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(u.requested_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => void handleAction(u.user_id, "approve")}
                        disabled={isActioning}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                        style={{ background: "rgba(196,168,130,0.15)", color: "#c4a882", border: "1px solid rgba(196,168,130,0.2)" }}
                        title="Approve"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => void handleAction(u.user_id, "reject")}
                        disabled={isActioning}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                        title="Reject"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => void handleAction(u.user_id, "delete")}
                        disabled={isActioning}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                        style={{ color: "#52403f", border: "1px solid #2a2222" }}
                        title="Delete request - user can try again immediately"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer link to full admin panel */}
          <div
            className="px-4 py-2.5"
            style={{ borderTop: "1px solid #1f1818", background: "#171212" }}
          >
            <a
              href="/admin/accounts"
              className="text-[11px] transition-colors"
              style={{ color: "#52403f" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c4a882"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52403f"; }}
            >
              View all in Admin panel →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
