"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-[34px] w-full rounded-[7px] bg-[#3266AD] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#2a558f] disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [error, formAction] = useFormState(loginAction, undefined);

  return (
    <div className="flex min-h-screen">
      {/* LEFT 40% */}
      <div className="hidden w-2/5 flex-col justify-between bg-[#0F1629] p-12 text-white md:flex">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Aeon</div>
          <div className="mt-1 text-[12px] text-[#7A8FAD]">Ops Controller</div>
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight">
            Financial operations,
            <br /> under control.
          </h1>
          <p className="mt-3 text-[13px] text-[#7A8FAD]">
            Track client revenue, resource costs, department P&amp;L and
            utilisation — in one place.
          </p>
          <ul className="mt-8 space-y-3 text-[13px] text-[#A9BAD3]">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
              Automated revenue waterfall &amp; billing
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3266AD]" />
              Fully-loaded resource costing
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7F77DD]" />
              Department P&amp;L &amp; utilisation analytics
            </li>
          </ul>
        </div>
        <div className="text-[11px] text-[#3A4A6B]">
          © {new Date().getFullYear()} Aeon Synergies
        </div>
      </div>

      {/* RIGHT 60% */}
      <div className="flex w-full items-center justify-center bg-white px-6 md:w-3/5">
        <div className="w-full max-w-[360px]">
          <h2 className="text-[22px] font-bold text-[#0F1629]">Welcome back</h2>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Sign in to continue to Ops Controller.
          </p>

          <form action={formAction} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-[34px] w-full rounded-[7px] border border-[#E8ECF4] px-3 text-[13px] outline-none focus:border-[#3266AD]"
                placeholder="you@aeonsynergies.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-[34px] w-full rounded-[7px] border border-[#E8ECF4] px-3 text-[13px] outline-none focus:border-[#3266AD]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] font-medium text-[#711B13]">
                {error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
