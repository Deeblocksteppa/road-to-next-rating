"use client";

import { useState, type Ref } from "react";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3";
const INPUT =
  "h-8 w-full bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none";

/**
 * Email and password as one block, two rows: the save form, the inline
 * log-in and /login. Each row keeps its mono label inside it, so the label is still
 * there once the field is filled: a placeholder-only label disappears exactly
 * when the player goes back to check what they typed. Focus lights the whole
 * block's border, so its rounded corners stay intact.
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
  names,
  describedBy,
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
  /** Field names, for a form that posts to a server action (/login). */
  names?: { email: string; password: string };
  /**
   * The id of an error the page arrived with (after a redirect). Both fields
   * point at it and are marked invalid: a screen reader may not read out an
   * alert that was already on the page.
   */
  describedBy?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col rounded-md border border-line-strong bg-surface transition-colors focus-within:border-optic">
      <div className="flex flex-col gap-0.5 px-4 pb-1.5 pt-2.5">
        <label htmlFor={`${idPrefix}-email`} className={LABEL}>
          Email
        </label>
        <input
          ref={emailRef}
          id={`${idPrefix}-email`}
          name={names?.email}
          type="email"
          autoComplete="email"
          // An address is never a sentence: no capital first letter, no autocorrect.
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={describedBy ? true : undefined}
          aria-describedby={describedBy}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          className={INPUT}
        />
      </div>
      <div className="h-px bg-line" />
      <div className="flex items-end gap-2 pb-1.5 pl-4 pr-1 pt-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={`${idPrefix}-password`} className={LABEL}>
            Password
          </label>
          <input
            ref={passwordRef}
            id={`${idPrefix}-password`}
            name={names?.password}
            aria-invalid={describedBy ? true : undefined}
            aria-describedby={describedBy}
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
