"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, TrendingUp, Layers, Code2, Megaphone, HeartHandshake, MoreHorizontal, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DEPARTMENTS = [
  { id: "sales", label: "Sales", icon: TrendingUp, description: "Sales engineers, AEs, SAs" },
  { id: "product", label: "Product", icon: Layers, description: "PMs, designers, researchers" },
  { id: "engineering", label: "Engineering", icon: Code2, description: "Frontend, backend, full-stack" },
  { id: "marketing", label: "Marketing", icon: Megaphone, description: "Demand gen, content, brand" },
  { id: "customer-success", label: "Customer Success", icon: HeartHandshake, description: "CSMs, consultants, TAMs" },
  { id: "other", label: "Other", icon: MoreHorizontal, description: "Leadership, ops, finance" },
];

const ROLES: Record<string, string[]> = {
  sales: ["Sales Engineer", "Account Executive", "Sales Manager", "Solutions Architect", "BDR / SDR"],
  product: ["Product Manager", "Product Designer", "UX Researcher", "Product Lead", "Head of Product"],
  engineering: ["Frontend Engineer", "Backend Engineer", "Full-Stack Engineer", "Engineering Manager", "DevOps Engineer"],
  marketing: ["Demand Generation", "Product Marketing", "Content Marketing", "Brand Manager", "Marketing Manager"],
  "customer-success": ["Customer Success Manager", "Solutions Consultant", "Technical Account Manager", "Support Engineer", "Head of CS"],
  other: ["Leadership / Executive", "Operations", "Finance", "Legal / Compliance", "Other"],
};

export function OnboardingForm() {
  const [step, setStep] = useState<"department" | "role">("department");
  const [department, setDepartment] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDept = DEPARTMENTS.find((d) => d.id === department);

  async function handleSubmit() {
    if (!department || !role) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, role }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      window.location.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1414] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <span
            style={{
              fontSize: 13,
              color: "#52403f",
              display: "block",
              marginBottom: 8,
              letterSpacing: "0.02em",
            }}
          >
            Welcome to
          </span>
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 80,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
              display: "block",
            }}
          >
            Nucode
          </span>
          <span
            style={{
              fontSize: 13,
              color: "#52403f",
              display: "block",
              marginTop: 14,
              letterSpacing: "0.01em",
            }}
          >
            Build. Demo. Ship. The Nutrient platform.
          </span>
        </div>

        <div className="bg-[#1f1818] border border-[#2a2222] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#2a2222]">
            <div className="flex items-center gap-2 mb-1">
              {/* Step indicators */}
              <div className={cn("h-1.5 w-6 rounded-full transition-colors", step === "department" ? "bg-zinc-300" : "bg-zinc-700")} />
              <div className={cn("h-1.5 w-6 rounded-full transition-colors", step === "role" ? "bg-zinc-300" : "bg-zinc-700")} />
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 mt-3">
              {step === "department" ? "What's your department?" : "What's your role?"}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {step === "department"
                ? "This helps us personalise your Nucode experience."
                : `Select your role within ${selectedDept?.label}.`}
            </p>
          </div>

          {/* Step content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === "department" && (
                <motion.div
                  key="department"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {DEPARTMENTS.map((dept) => {
                    const Icon = dept.icon;
                    const selected = department === dept.id;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setDepartment(dept.id)}
                        className={cn(
                          "relative text-left rounded-xl border p-4 transition-all duration-150",
                          selected
                            ? "border-zinc-500 bg-zinc-800/60"
                            : "border-[#332b2b] bg-[#211a1a] hover:border-[#463735] hover:bg-[#261d1d]"
                        )}
                      >
                        {selected && (
                          <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-zinc-200 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-zinc-900" />
                          </div>
                        )}
                        <Icon className={cn("h-4 w-4 mb-2.5", selected ? "text-zinc-200" : "text-zinc-500")} />
                        <p className={cn("text-xs font-semibold leading-snug", selected ? "text-zinc-100" : "text-zinc-300")}>
                          {dept.label}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">{dept.description}</p>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {step === "role" && department && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1.5"
                >
                  {ROLES[department]?.map((r) => {
                    const selected = role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                          "w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-all duration-150",
                          selected
                            ? "border-zinc-500 bg-zinc-800/60 text-zinc-100"
                            : "border-[#332b2b] bg-[#211a1a] text-zinc-400 hover:border-[#463735] hover:text-zinc-200 hover:bg-[#261d1d]"
                        )}
                      >
                        <span className="flex items-center justify-between">
                          {r}
                          {selected && <Check className="h-3.5 w-3.5 text-zinc-300 shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between px-6 pb-6">
            {step === "role" ? (
              <button
                onClick={() => { setStep("department"); setRole(null); }}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === "department" ? (
              <button
                onClick={() => { if (department) setStep("role"); }}
                disabled={!department}
                className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all"
                style={department
                  ? { background: "#c4a882", color: "#1a1414" }
                  : { background: "#2a2222", color: "#52403f", cursor: "not-allowed" }
                }
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!role || loading}
                className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all"
                style={role && !loading
                  ? { background: "#c4a882", color: "#1a1414" }
                  : { background: "#2a2222", color: "#52403f", cursor: "not-allowed" }
                }
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                ) : (
                  <>Get started<ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
