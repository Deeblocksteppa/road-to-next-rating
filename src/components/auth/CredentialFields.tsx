"use client";

import { useState, type Ref } from "react";

const ROW_FOCUS =
  "has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-optic";
const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3";
const INPUT =
  "h-8 w-full bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none";

/**
 * Email and password as one block, two rows: the save form and the inline
 * log-in. Each row keeps its mono label inside it, so the label is still
 * there once the field is filled: a placeholder-only label disappears exactly
 * when the player goes back to check what they typed. The focus ring sits
 * inside the row it belongs to.
 */
export function CredentialFields({
  idPrefix,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  passwordAutoComplete,
  passwordPlaceholder,
  minLength,
  emailRef,
  passwordRef,
}: {
  /** Keeps the ids unique per view: `{idPrefix}-email`, `{idPrefix}-password`. */
  idPrefix: string;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordAutoComplete: "new-password" | "current-password";
  passwordPlaceholder?: string;
  minLength?: number;
  emailRef?: Ref<HTMLInputElement>;
  passwordRef?: Ref<HTMLInputElement>;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col rounded-md border border-line-strong bg-surface">
      <div className={`flex flex-col gap-0.5 rounded-t-md px-4 pb-1.5 pt-2.5 ${ROW_FOCUS}`}>
        <label htmlFor={`${idPrefix}-email`} className={LABEL}>
          Email
        </label>
        <input
          ref={emailRef}
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          className={INPUT}
        />
      </div>
      <div className="h-px bg-line" />
      <div className={`flex items-end gap-2 rounded-b-md pb-1.5 pl-4 pr-1 pt-2.5 ${ROW_FOCUS}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={`${idPrefix}-password`} className={LABEL}>
            Password
          </label>
          <input
            ref={passwordRef}
            id={`${idPrefix}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete={passwordAutoComplete}
            minLength={minLength}
            placeholder={passwordPlaceholder}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            className={INPUT}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-pressed={showPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="flex h-10 shrink-0 items-center rounded-sm px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2 transition-colors hover:text-ink"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
