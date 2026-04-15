"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn w-full" type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="text-sm text-white/70">Name</span>
        <input name="name" className="input mt-1" autoComplete="username" required />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">PIN</span>
        <input
          name="pin"
          className="input mt-1"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          autoComplete="current-password"
          required
        />
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <Submit />
    </form>
  );
}
