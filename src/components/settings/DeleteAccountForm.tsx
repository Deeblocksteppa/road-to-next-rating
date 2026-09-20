"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteAccount } from "@/app/settings/actions";

const CONFIRM_WORD = "DELETE";

/**
 * The confirmation step for account deletion. Deleting is permanent and takes
 * the diagnosis, plans, session log and re-test history with it, so the button
 * stays disabled until the word is typed — a second tap is too easy to make by
 * accident on a phone. The server action does its own check of the same word;
 * this form is a courtesy, not the safeguard.
 */
export function DeleteAccountForm() {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const armed = typed.trim().toUpperCase() === CONFIRM_WORD;

  function handleDelete() {
    if (!armed || pending) return;
    setError(null);
    startTransition(async () => {
      // On success the action redirects and this never resolves with a value.
      const result = await deleteAccount(typed);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="confirm-delete" className="text-[14px] leading-[1.5] text-ink-2">
        Type <span className="font-mono text-[13px] text-ink">{CONFIRM_WORD}</span> to confirm.
      </label>
      <input
        id="confirm-delete"
        name="confirm-delete"
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={CONFIRM_WORD}
        className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 font-mono text-[15px] tracking-[0.08em] text-ink placeholder-ink-3 focus:border-line-hover focus:outline-none"
      />

      {error && (
        <p role="alert" className="text-[13px] leading-[1.45] text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={!armed || pending}
        className="mt-1 flex h-[52px] w-full items-center justify-center rounded-lg border border-danger bg-danger/[0.12] text-[15px] font-semibold text-danger transition-colors hover:bg-danger/[0.18] active:scale-[0.98] disabled:pointer-events-none disabled:border-line disabled:bg-surface disabled:text-ink-3"
      >
        {pending ? "Deleting…" : "Delete my account permanently"}
      </button>

      <Link
        href="/settings"
        className="flex h-11 items-center justify-center text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        Keep my account
      </Link>
    </div>
  );
}
