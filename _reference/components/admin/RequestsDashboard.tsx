"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Check, X, Trash2, RefreshCw, InboxIcon } from "lucide-react";

interface PendingUser {
  user_id: string;
  email: string;
  requested_at: string;
}

export default function RequestsDashboard() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (!res.ok) return;
      const data = await res.json() as { pending?: PendingUser[] };
      setPending(data.pending ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPending(); }, [fetchPending]);

  async function handleAction(userId: string, action: "approve" | "reject" | "delete") {
    setActioning(userId);
    try {
      if (action === "delete") {
        await fetch(`/api/admin/accounts/${userId}/approval`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/accounts/${userId}/${action}`, { method: "POST" });
      }
      setPending((prev) => prev.filter((u) => u.user_id !== userId));
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="p-8 min-h-full">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight mb-1" style={{ color: "#f4f4f5" }}>
          Access Requests
        </h1>
        <p className="text-sm" style={{ color: "#52403f" }}>
          Approve, reject, or delete pending sign-up requests.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "#52403f" }}>
          <RefreshCw size={13} className="animate-spin" />
          Loading…
        </div>
      )}

      {!loading && pending.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl py-16 gap-3"
          style={{ border: "1px solid #2a2222", background: "#1e1717" }}
        >
          <InboxIcon size={28} style={{ color: "#3f3535" }} />
          <p className="text-sm font-medium" style={{ color: "#52403f" }}>
            No pending requests
          </p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#c4a882" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#c4a882" }}>
              {pending.length} pending request{pending.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(196,168,130,0.2)", background: "rgba(196,168,130,0.04)" }}
          >
            {pending.map((u, i) => {
              const isActioning = actioning === u.user_id;
              const initials = u.email.slice(0, 2).toUpperCase();
              const diff = Date.now() - new Date(u.requested_at).getTime();
              const mins = Math.floor(diff / 60000);
              const timeLabel =
                mins < 2 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

              return (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 px-5 py-4"
                  style={i > 0 ? { borderTop: "1px solid rgba(196,168,130,0.1)" } : {}}
                >
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "rgba(196,168,130,0.1)",
                      color: "#c4a882",
                      border: "1px solid rgba(196,168,130,0.2)",
                    }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#f4f4f5" }}>
                      {u.email}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "#52403f" }}>
                      <Clock size={9} />
                      Requested {timeLabel}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleAction(u.user_id, "approve")}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "#c4a882", color: "#1a1414" }}
                    >
                      {isActioning ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                      Approve
                    </button>
                    <button
                      onClick={() => void handleAction(u.user_id, "reject")}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <X size={10} />
                      Reject
                    </button>
                    <button
                      onClick={() => void handleAction(u.user_id, "delete")}
                      disabled={isActioning}
                      className="flex items-center justify-center h-7 w-7 rounded-lg transition-all"
                      style={{ color: "#52403f", border: "1px solid #2a2222" }}
                      title="Delete - user can re-apply with the same email"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
