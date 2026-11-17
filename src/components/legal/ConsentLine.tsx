import { FlowLink } from "@/components/legal/FlowLink";

/**
 * Under the save form's button; the sign-up sends `consentMetadata()`.
 *
 * 14px: legal fine print under a button is the one place running text goes
 * under 16px (DESIGN.md, Typography). `data-fine-print` marks it for /verify.
 */
export function ConsentLine() {
  return (
    <p data-fine-print className="text-[14px] leading-[1.5] text-ink-2">
      By creating an account, you confirm you&apos;re 13 or older and agree to our{" "}
      <FlowLink href="/terms">Terms</FlowLink> and{" "}
      <FlowLink href="/privacy">Privacy Policy</FlowLink>. We&apos;ll email you session reminders
      while your plan is active; turn them off anytime.
    </p>
  );
}
