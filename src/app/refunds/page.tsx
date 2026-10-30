import type { Metadata } from "next";

import { LegalPage, LegalSection, SupportEmail } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy · Road to Next Rating",
};

export default function Refunds() {
  return (
    <LegalPage title="Refund Policy">
      <LegalSection title="Yearly plan">
        <p>
          If you&apos;re not happy, email us within 14 days of any yearly charge (your first
          payment or a renewal) and we&apos;ll refund that charge in full. When we refund a
          yearly charge, we also cancel the plan, so it won&apos;t renew and paid features end.
        </p>
      </LegalSection>

      <LegalSection title="Monthly plan">
        <p>
          Monthly payments aren&apos;t refunded, including for a partly used month. You can
          cancel anytime, and you keep paid features until the end of the month you paid for.
        </p>
      </LegalSection>

      <LegalSection title="Mistakes on our side">
        <p>
          If you were charged twice, charged after you cancelled, or charged in error,
          we&apos;ll refund it, whichever plan you&apos;re on.
        </p>
      </LegalSection>

      <LegalSection title="How to cancel">
        <p>
          Go to Settings and choose Manage subscription, then Cancel subscription. Cancelling
          stops the next renewal and keeps your paid features until the period ends. It
          doesn&apos;t refund past payments; use the steps below for that.
        </p>
        <p>
          Deleting your account also cancels your plan, but it ends paid features right away.
          If you only want to stop paying, cancel instead.
        </p>
      </LegalSection>

      <LegalSection title="Before your yearly plan renews">
        <p>
          We&apos;ll email you before your yearly plan renews, so a renewal never comes as a
          surprise. [TRUE ONCE STRIPE&apos;S RENEWAL EMAILS ARE ON IN THE LIVE ACCOUNT]
        </p>
      </LegalSection>

      <LegalSection title="How to ask for a refund">
        <p>
          Email <SupportEmail /> from the email on your account and tell us which charge. We
          usually reply within 2 business days. Refunds go back to your original payment method
          and can take 5 to 10 business days to show up, depending on your bank.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          <SupportEmail />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
