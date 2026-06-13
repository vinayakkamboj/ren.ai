"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Trash2, ChevronDown, ChevronUp, RefreshCw,
  AlertTriangle, Zap, TrendingUp, ArrowDownUp, Clock,
  Check, X, ShieldCheck,
} from "lucide-react";

// ── Pending Approvals ────────────────────────────────────────────────────────

interface PendingUser {
  user_id: string;
  email: string;
  requested_at: string;
}

function PendingApprovals({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (!res.ok) return;
      const data = await res.json() as { pending?: PendingUser[] };
      const list = data.pending ?? [];
      setPending(list);
      onCountChange?.(list.length);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { void fetchPending(); }, [fetchPending]);

  async function handleAction(userId: string, action: "approve" | "reject" | "delete") {
    setActioning(userId);
    try {
      if (action === "delete") {
        await fetch(`/api/admin/accounts/${userId}/approval`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/accounts/${userId}/${action}`, { method: "POST" });
      }
      const next = pending.filter((u) => u.user_id !== userId);
      setPending(next);
      onCountChange?.(next.length);
    } finally {
      setActioning(null);
    }
  }

  if (loading) return null;
  if (pending.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: "#c4a882" }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#c4a882" }}
        >
          Pending approval - {pending.length} request{pending.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,168,130,0.2)", background: "rgba(196,168,130,0.04)" }}>
        {pending.map((u, i) => {
          const isActioning = actioning === u.user_id;
          const initials = u.email.slice(0, 2).toUpperCase();
          const diff = Date.now() - new Date(u.requested_at).getTime();
          const mins = Math.floor(diff / 60000);
          const timeLabel = mins < 2 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

          return (
            <div
              key={u.user_id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={i > 0 ? { borderTop: "1px solid rgba(196,168,130,0.1)" } : {}}
            >
              {/* Avatar */}
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(196,168,130,0.1)", color: "#c4a882", border: "1px solid rgba(196,168,130,0.2)" }}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#f4f4f5" }}>{u.email}</p>
                <p className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "#52403f" }}>
                  <Clock size={9} />
                  Requested {timeLabel}
                </p>
              </div>

              {/* Action buttons */}
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
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <X size={10} />
                  Reject
                </button>
                <button
                  onClick={() => void handleAction(u.user_id, "delete")}
                  disabled={isActioning}
                  className="flex items-center justify-center h-7 w-7 rounded-lg transition-all"
                  style={{ color: "#52403f", border: "1px solid #2a2222" }}
                  title="Delete request - user can log in again immediately"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Period = "hour" | "day" | "week" | "month" | "all";

interface AccountUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  workspace_count: number;
  total_tokens: number;
}

interface UsageRow {
  period: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  requests: number;
}

interface UsageSummary {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

const PERIODS: { id: Period; label: string }[] = [
  { id: "hour", label: "Last Hour" },
  { id: "day",  label: "Last 24h" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all",  label: "All Time" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPeriodLabel(period: string, view: Period): string {
  if (view === "hour" || view === "all") return period;
  if (view === "day") {
    // "2024-05-31 14:00" → "14:00"
    const parts = period.split(" ");
    return parts[1] ?? period;
  }
  if (view === "week" || view === "month") {
    // "2024-05-31" → "May 31"
    const d = new Date(period + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  return period;
}

// ── Usage Panel ─────────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-lg flex-1"
      style={{ background: "#1a1414", border: "1px solid #2a2222" }}
    >
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "#52403f" }}>
        {label}
      </span>
      <span
        className="text-lg font-semibold leading-tight"
        style={{ color: accent ? "#c4a882" : "#a1a1aa" }}
      >
        {value}
      </span>
    </div>
  );
}

function CreditLimitControl({ userId, totalTokens }: { userId: string; totalTokens: number }) {
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/accounts/${userId}/credits`)
      .then((r) => r.json())
      .then((d: { creditLimit?: number; error?: string }) => {
        if (d.creditLimit !== undefined) {
          setCreditLimit(d.creditLimit);
          setInputVal(d.creditLimit === 0 ? "" : String(Math.round(d.creditLimit / 1000)));
        }
        if (d.error) setLoadError(d.error);
      })
      .catch(() => setLoadError("Failed to load credit limit"));
  }, [userId]);

  async function handleSave() {
    const tokens = inputVal.trim() === "" ? 0 : Math.round(parseFloat(inputVal) * 1000);
    if (isNaN(tokens) || tokens < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/accounts/${userId}/credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit: tokens }),
      });
      const d = await res.json() as { success?: boolean; error?: string };
      if (d.success) { setCreditLimit(tokens); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  }

  const pct = creditLimit > 0 ? Math.min((totalTokens / creditLimit) * 100, 100) : 0;
  const barColor = pct >= 95 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#c4a882";

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid #2a2222" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#52403f" }}>
          Credit Limit
        </span>
        {loadError && <span className="text-[10px] text-red-400">{loadError}</span>}
      </div>

      {/* Usage vs limit bar */}
      {creditLimit > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: "#52403f" }}>
            <span>{fmt(totalTokens)} used</span>
            <span>{fmt(creditLimit)} limit ({pct.toFixed(0)}%)</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2222" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>
      )}

      {/* Limit input */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-3 py-1.5" style={{ background: "#1a1414", border: "1px solid #2a2222" }}>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 100"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none min-w-0"
            style={{ color: "#f4f4f5" }}
          />
          <span className="text-[10px] shrink-0" style={{ color: "#52403f" }}>K tokens</span>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
          style={{ background: saved ? "#1a3a1a" : "#2a2222", color: saved ? "#4ade80" : "#c4a882", border: `1px solid ${saved ? "#2a4a2a" : "#3a2f2f"}` }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Set limit"}
        </button>
        {creditLimit > 0 && (
          <button
            onClick={() => { setInputVal(""); void (async () => { setSaving(true); await fetch(`/api/admin/accounts/${userId}/credits`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creditLimit: 0 }) }); setCreditLimit(0); setSaving(false); })(); }}
            className="text-[10px] px-2 py-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: "#52403f", border: "1px solid #2a2222" }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: "#3f3535" }}>
        {creditLimit === 0 ? "No limit set - user has unlimited token access." : `User is blocked once they reach ${fmt(creditLimit)} total tokens.`}
      </p>
    </div>
  );
}

function UsagePanel({ userId, totalTokens }: { userId: string; totalTokens: number }) {
  const [period, setPeriod] = useState<Period>("week");
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounts/${userId}/usage?period=${period}`);
      const data = await res.json() as { usage?: UsageRow[]; summary?: UsageSummary; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Failed to load usage"); return; }
      setUsage(data.usage ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => { void fetchUsage(); }, [fetchUsage]);

  return (
    <div style={{ background: "#171212", borderTop: "1px solid #2a2222" }} className="px-5 pt-4 pb-5">

      {/* Period selector */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "#1a1414", border: "1px solid #2a2222" }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-all"
            style={
              period === p.id
                ? { background: "#2a2222", color: "#c4a882", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }
                : { color: "#52403f" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary chips */}
      {summary && !loading && (
        <div className="flex gap-2 mb-4">
          <StatChip label="Total Tokens" value={fmt(summary.total_tokens)} accent />
          <StatChip label="Input" value={fmt(summary.input_tokens)} />
          <StatChip label="Output" value={fmt(summary.output_tokens)} />
          <StatChip label="Requests" value={String(summary.requests)} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-5 text-zinc-700 text-xs">
          <RefreshCw size={12} className="animate-spin" />
          Loading…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-1.5 text-xs py-2" style={{ color: "#f87171" }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* No data */}
      {!loading && !error && usage.length === 0 && (
        <p className="text-xs py-3" style={{ color: "#3f3535" }}>
          No requests in this period.
        </p>
      )}

      {/* Breakdown table */}
      {!loading && !error && usage.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #2a2222" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1a1414", borderBottom: "1px solid #2a2222" }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: "#52403f" }}>Period</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: "#52403f" }}>Requests</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: "#52403f" }}>Input</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: "#52403f" }}>Output</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: "#c4a882" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row, i) => (
                <tr
                  key={row.period}
                  style={i > 0 ? { borderTop: "1px solid #1f1818" } : {}}
                  className="hover:bg-[#1f1818] transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono" style={{ color: "#71717a" }}>
                    {formatPeriodLabel(row.period, period)}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: "#52403f" }}>{row.requests}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: "#52403f" }}>{fmt(row.input_tokens)}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: "#52403f" }}>{fmt(row.output_tokens)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "#c4a882" }}>
                    {fmt(row.total_tokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreditLimitControl userId={userId} totalTokens={totalTokens} />
    </div>
  );
}

// ── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({
  user,
  isExpanded,
  onToggle,
  onDelete,
}: {
  user: AccountUser;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirm(false); }
  }

  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <div style={{ borderTop: "1px solid #2a2222" }}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer group transition-colors"
        style={{ background: isExpanded ? "#1f1818" : "transparent" }}
        onClick={onToggle}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: isExpanded ? "#2a2222" : "#1f1818",
            color: "#c4a882",
            border: "1px solid #2a2222",
            fontFamily: "'Satoshi', sans-serif",
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: "#f4f4f5" }}>
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px]" style={{ color: "#3f3535" }}>
              Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-[11px]" style={{ color: "#3f3535" }}>·</span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "#3f3535" }}>
              <Clock size={9} />
              {timeAgo(user.last_sign_in_at)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 shrink-0 mr-2">
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: "#71717a" }}>{user.workspace_count}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#3f3535" }}>projects</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: "#c4a882" }}>{fmt(user.total_tokens)}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#3f3535" }}>tokens</p>
          </div>
        </div>

        {/* Chevron */}
        <span className="shrink-0 transition-colors" style={{ color: "#3f3535" }}>
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>

        {/* Delete - stop click propagation */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {confirm ? (
            <div className="flex items-center gap-1.5">
              <button
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors"
                style={{ background: "#3a1515", color: "#f87171", border: "1px solid #5a2020" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="text-[11px] px-2 py-1 rounded-md transition-colors"
                style={{ color: "#52403f", border: "1px solid #2a2222" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              style={{ color: "#52403f" }}
              title="Delete account"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded usage */}
      {isExpanded && <UsagePanel userId={user.id} totalTokens={user.total_tokens} />}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function AccountsDashboard() {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/accounts");
      const data = await res.json() as { users?: AccountUser[]; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Failed to load"); return; }
      setUsers(data.users ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function handleDelete(userId: string) {
    const res = await fetch(`/api/admin/accounts/${userId}`, { method: "DELETE" });
    const data = await res.json() as { success?: boolean; error?: string };
    if (!res.ok || data.error) { alert(data.error ?? "Failed to delete"); return; }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (expanded === userId) setExpanded(null);
  }

  const totalTokens = users.reduce((s, u) => s + u.total_tokens, 0);
  const totalWorkspaces = users.reduce((s, u) => s + u.workspace_count, 0);

  return (
    <div className="p-6 min-h-full">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1
              className="text-sm font-semibold tracking-tight"
              style={{ fontFamily: "'Satoshi', sans-serif", color: "#f4f4f5" }}
            >
              Accounts
            </h1>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide"
              style={{ background: "rgba(196,168,130,0.12)", color: "#c4a882", border: "1px solid rgba(196,168,130,0.2)" }}
            >
              <ShieldCheck size={9} />
              You are Admin
            </span>
          </div>
          <p className="text-xs" style={{ color: "#3f3535" }}>
            Manage access requests and monitor token usage across all accounts.
          </p>
        </div>
        <button
          onClick={() => void fetchUsers()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "#1f1818", color: "#52403f", border: "1px solid #2a2222" }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Pending approvals - shown at the top if any */}
      <PendingApprovals />

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-xs mb-5"
          style={{ background: "#1f1414", border: "1px solid #3a2020", color: "#f87171" }}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: <Users size={13} />, label: "Total Accounts", value: String(users.length) },
            { icon: <ArrowDownUp size={13} />, label: "Total Projects", value: String(totalWorkspaces) },
            { icon: <Zap size={13} />, label: "Tokens Consumed", value: fmt(totalTokens) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl px-4 py-3.5"
              style={{ background: "#1f1818", border: "1px solid #2a2222" }}
            >
              <div className="flex items-center gap-1.5 mb-2" style={{ color: "#3f3535" }}>
                {c.icon}
                <span className="text-[10px] uppercase tracking-widest font-semibold">{c.label}</span>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "'Satoshi', sans-serif", color: "#c4a882", letterSpacing: "-0.03em" }}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center text-xs" style={{ color: "#3f3535" }}>
          <RefreshCw size={13} className="animate-spin" />
          Loading accounts…
        </div>
      )}

      {/* Accounts list */}
      {!loading && !error && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2222", background: "#171212" }}>
          {/* List header */}
          <div
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderBottom: "1px solid #2a2222", background: "#1a1414" }}
          >
            <div className="w-8 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#3f3535" }}>
                User
              </span>
            </div>
            <div className="flex items-center gap-5 shrink-0 mr-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold w-14 text-right" style={{ color: "#3f3535" }}>
                Projects
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold w-16 text-right" style={{ color: "#3f3535" }}>
                Tokens
              </span>
            </div>
            <div className="w-5 shrink-0" />
            <div className="w-8 shrink-0" />
          </div>

          {users.length === 0 && (
            <div className="py-12 text-center text-xs" style={{ color: "#3f3535" }}>
              No accounts registered yet.
            </div>
          )}

          {users.map((user) => (
            <AccountRow
              key={user.id}
              user={user}
              isExpanded={expanded === user.id}
              onToggle={() => setExpanded(expanded === user.id ? null : user.id)}
              onDelete={() => handleDelete(user.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && (
        <p className="text-[11px] mt-4" style={{ color: "#2a2222" }}>
          <TrendingUp size={9} className="inline mr-1" />
          Token data accumulates from AI requests. Deleting an account revokes access - the email can re-register.
        </p>
      )}
    </div>
  );
}
