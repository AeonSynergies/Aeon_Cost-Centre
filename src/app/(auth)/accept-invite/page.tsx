"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { acceptInviteAction } from "./actions";
import { PasswordInput } from "@/components/common/PasswordInput";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-[34px] w-full rounded-[7px] bg-[#3266AD] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#2a558f] disabled:opacity-60"
    >
      {pending ? "Setting password…" : "Set Password & Sign In"}
    </button>
  );
}

function AcceptInviteForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, formAction] = useFormState(acceptInviteAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[360px]">
        <div className="text-[22px] font-bold tracking-tight text-[#0F1629]">Aeon <span className="text-[#7A8FAD]">Control Centre</span></div>
        <h2 className="mt-6 text-[22px] font-bold text-[#0F1629]">Welcome to Aeon Control Centre</h2>
        <p className="mt-1 text-[13px] text-[#64748B]">Set your password to get started.</p>

        {!token ? (
          <div className="mt-6 rounded-[7px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">No invite token in the link. Please use the link from your invite.</div>
        ) : (
          <form action={formAction} className="mt-8 space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">New Password</label>
              <PasswordInput name="password" required autoComplete="new-password" placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Confirm Password</label>
              <PasswordInput name="confirm" required autoComplete="new-password" placeholder="••••••••" />
            </div>
            {error && <div className="rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
            <SubmitButton />
          </form>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <React.Suspense fallback={null}>
      <AcceptInviteForm />
    </React.Suspense>
  );
}
