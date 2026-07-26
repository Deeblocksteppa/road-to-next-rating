import Link from "next/link";

import { signup, signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; check_email?: string; next?: string };
}) {
  const next = searchParams.next ?? "/home";

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Save your diagnosis and track your plan.
          </p>
        </div>

        {searchParams.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {searchParams.error}
          </p>
        )}

        {searchParams.check_email && (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Check your email for a confirmation link to finish signing up.
          </p>
        )}

        <form action={signup} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Create account
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
