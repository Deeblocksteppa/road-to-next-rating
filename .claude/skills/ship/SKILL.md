---
name: ship
description: Type-check, lint, update docs/STATUS.md, commit the current change with a clear message, push, and list the files changed.
argument-hint: "[optional note for the commit message]"
disable-model-invocation: true
allowed-tools: Bash(npx tsc --noEmit*), Bash(npm run lint*), Bash(git status*), Bash(git diff*), Bash(git add *), Bash(git commit *), Bash(git push*), Bash(git switch -c *), Bash(git show --stat*), Bash(git log*)
---

# Ship

## 1. Checks

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

Stop and report on any type error or lint error. Warnings are listed but don't block.

## 2. What goes in

Run `git status --short` and `git diff --stat`. Stage explicit paths only, never `git add -A` or `git add .`.

Leave out, and say so:
- scratch scripts, test routes (`src/app/dev-*`, `*-tmp`), one-off SQL or `.mjs` helpers at the repo root;
- screenshots outside `audit/`;
- `.env*`, `.vercel/`, `tsconfig.tsbuildinfo`, `.DS_Store`;
- unrelated changes that were already in the tree before this task (ask if unsure).

## 3. Branch or main

If the commit changes copy a player reads and the user hasn't read that copy in this session, create a branch first (`git switch -c <short-topic>`) and say why. Otherwise commit on the current branch.

## 4. Status

Update `docs/STATUS.md`: move what this change finished out of **Outstanding**, refresh **Current state** and the date. Stage it with the change.

## 5. Commit

Match the repo's style (`git log -5`):
- Subject: one plain sentence in the imperative saying what changed for the player, no prefix, no trailing period. Example: "Fix the app's core loop: sessions without an account, the re-test, and an honest readiness score".
- Body: what changed and why, as short bullets in player terms, then any audit ids it closes (for example "From batch 2 of audit/app-critique.md"). Include `$ARGUMENTS` if given.
- End with the attribution trailer from the current session's instructions.

Pass the message with a heredoc so line breaks survive.

## 6. Push

```bash
git push -u origin HEAD
```

If the push is rejected, stop and report; never force-push.

## 7. Report

Run `git show --stat HEAD` and give the user: the branch, the commit subject, every file changed, anything left out in step 2, and whether the push succeeded.
