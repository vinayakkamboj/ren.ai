"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Mail, UserPlus, X } from "lucide-react";
import { inviteCollaborator } from "@/lib/actions/collaborators";

interface InviteModalProps {
  projectId: string;
  onClose: () => void;
}

export function InviteModal({ projectId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await inviteCollaborator(projectId, email.trim());
      if (res.ok) {
        setInvited((prev) => [...prev, email.trim().toLowerCase()]);
        setEmail("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-carbon/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-carbon-line bg-carbon-raised shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-carbon-line px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-brass" />
            <span className="text-[14px] font-medium text-dusk">Invite collaborator</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-dusk-faint transition-colors hover:bg-carbon-high hover:text-dusk"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-[13px] text-dusk-muted">
            Invite someone to collaborate on this project. They will get access to view and edit
            it in the workspace.
          </p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-dusk-faint" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="colleague@example.com"
                className="w-full rounded-lg border border-carbon-line bg-carbon py-2.5 pl-9 pr-3 text-[13px] text-dusk outline-none placeholder:text-dusk-faint focus:border-carbon-line-strong"
              />
            </div>
            <button
              onClick={submit}
              disabled={!email.trim() || pending}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-brass px-4 text-[13px] font-medium text-carbon transition-colors hover:bg-brass-deep disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Invite"}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-[12px] text-signal-red">{error}</p>
          )}

          {invited.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {invited.map((e) => (
                <li
                  key={e}
                  className="flex items-center gap-2 rounded-lg border border-carbon-line bg-carbon px-3 py-2 text-[12.5px]"
                >
                  <Check className="size-3.5 shrink-0 text-brass" />
                  <span className="flex-1 truncate text-dusk-muted">{e}</span>
                  <span className="text-[11px] text-dusk-faint">Invite sent</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-carbon-line px-5 py-3.5">
          <p className="text-[11.5px] text-dusk-faint">
            Invites are pending until your collaborator signs in with the invited email.
          </p>
        </div>
      </div>
    </div>
  );
}
