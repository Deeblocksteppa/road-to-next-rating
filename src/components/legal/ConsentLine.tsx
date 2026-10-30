import { FlowLink } from "@/components/legal/FlowLink";

/** Under the button on both sign-up forms. Each sends `consentMetadata()`. */
export function ConsentLine() {
  return (
    <p className="text-[16px] leading-[1.5] text-ink-2">
      By creating an account, you confirm you&apos;re 13 or older and agree to our{" "}
      <FlowLink href="/terms">Terms</FlowLink> and{" "}
      <FlowLink href="/privacy">Privacy Policy</FlowLink>. We&apos;ll email you session reminders
      while your plan is active; turn them off anytime.
    </p>
  );
}
