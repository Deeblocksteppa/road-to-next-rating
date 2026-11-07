import { LoginScreen } from "@/app/login/LoginScreen";
import { authErrorMessage } from "@/lib/auth-errors";
import { AFTER_AUTH, safeNextPath } from "@/lib/auth-redirect";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; notice?: string };
}) {
  return (
    <LoginScreen
      next={safeNextPath(searchParams.next) ?? AFTER_AUTH}
      // Fixed copy keyed by code; the URL's own text is never shown (lib/auth-errors.ts).
      errorMessage={authErrorMessage(searchParams.error)}
      deleted={searchParams.notice === "deleted"}
    />
  );
}
