import type { Metadata } from "next";

import {
  Lead,
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  SupportEmail,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · Road to Next Rating",
  description: "What Road to Next Rating is, what it costs, and what it does not claim.",
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and Road to Next Rating (&quot;we,&quot;
        &quot;us,&quot; &quot;our&quot;), a Virginia sole proprietorship. They cover your use of
        roadtonextrating.com (the &quot;Service&quot;). By using the Service, you agree to these
        terms and to our <LegalLink href="/privacy">Privacy Policy</LegalLink>. If you don&apos;t
        agree, please don&apos;t use it.
      </p>

      <LegalSection title="1. Who can use the Service">
        <p>
          You must be at least 13 years old. If you are under 18, a parent or guardian must agree
          to these terms for you, and only a parent or guardian may buy a paid plan.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          Some features need a free account. Use an email address you control and keep your
          sign-in secure. You are responsible for what happens in your account. One account per
          person.
        </p>
      </LegalSection>

      <LegalSection title="3. What the Service is, and what it isn't">
        <p>
          Road to Next Rating gives you an assessment, a diagnosis of the skill most likely
          holding you back, a training plan, guided practice sessions, and a re-test.
        </p>
        <LegalList>
          <li>
            Your Readiness score is a score from your answers. It is not a DUPR rating, a DUPR
            estimate, or any official rating.
          </li>
          <li>
            We are not affiliated with DUPR, USA Pickleball, or any rating or governing
            organization.
          </li>
          <li>
            The Service is general training guidance. It is not professional coaching, and it is
            not medical advice.
          </li>
          <li>We don&apos;t promise that you will improve your rating or results.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Health and safety">
        <p>
          Pickleball and the drills in your plan are physical activity, and physical activity
          carries a risk of injury. Check with a doctor before starting if you have any health
          condition or concern. Warm up, stop if you feel pain or dizziness, and make sure your
          court or wall space is safe and clear. You choose whether and how to do each drill, and
          you take on the risks of doing it. To the extent the law allows, we are not responsible
          for injuries that happen while you practice or play.
        </p>
      </LegalSection>

      <LegalSection title="5. Paid plan">
        <p>
          Our paid plan (&quot;Progress&quot;) is a subscription. The price and billing period
          (monthly or yearly) are shown before you buy.
        </p>
        <LegalList>
          <li>
            <Lead>It renews automatically.</Lead> Your plan renews at the end of each billing
            period at the then-current price until you cancel.
          </li>
          <li>
            <Lead>Cancel anytime.</Lead> Cancel in Settings under Manage subscription, or email{" "}
            <SupportEmail />. Cancelling stops the next renewal, and you keep paid features until
            the end of the period you already paid for.
          </li>
          <li>
            <Lead>Price changes.</Lead> If the price changes, we will email you before it applies
            to your next renewal, so you can cancel first.
          </li>
          <li>
            <Lead>Payments.</Lead> Payments are processed by Stripe. We never see or store your
            full card number. Charges appear on your statement as ROADTONEXTRATING.
          </li>
          <li>
            <Lead>Refunds.</Lead> See our Refund Policy at{" "}
            <LegalLink href="/refunds">roadtonextrating.com/refunds</LegalLink>.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Using the Service fairly">
        <p>Please don&apos;t:</p>
        <LegalList>
          <li>access or try to access another person&apos;s account or data,</li>
          <li>
            try to unlock paid features without paying, or tamper with the Service&apos;s
            security,
          </li>
          <li>copy, scrape, or resell the Service or its content,</li>
          <li>use the Service in a way that breaks the law or disrupts it for others.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Our content and your data">
        <p>
          The assessment, diagnoses, stories, plans, drills, and design of the Service belong to
          us. You may use them for your own personal training, not for commercial use.
        </p>
        <p>
          Your answers and practice logs belong to you. You give us permission to store and use
          them to run the Service for you, as described in our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>. If you send us feedback, we may
          use it without owing you anything.
        </p>
      </LegalSection>

      <LegalSection title="8. Deleting your account">
        <p>
          You can delete your account at any time in Settings. Deleting your account cancels any
          paid plan right away, and paid features end immediately. If you delete within 14 days
          of a yearly charge, you can still ask for a refund under our{" "}
          <LegalLink href="/refunds">Refund Policy</LegalLink>. Otherwise, unused time is not
          refunded, so if you only want to stop paying, cancel your plan instead and keep using it
          until the period ends.
        </p>
        <p>
          We may suspend or close an account that breaks these terms. If we close your account
          without a good reason, we will refund any unused part of a paid period.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We may change or stop features of the Service. If we make a material change to these
          terms, we will tell you by email or in the app before it takes effect. Continuing to use
          the Service after that means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the extent
          the law allows, we make no warranties of any kind, including that the Service will be
          error-free or always available, or that it will improve your play.
        </p>
      </LegalSection>

      <LegalSection title="11. Limit of liability">
        <p>
          To the extent the law allows, we are not liable for indirect, incidental, special, or
          consequential damages, or for lost profits or data. Our total liability for any claim
          about the Service is limited to the greater of what you paid us in the 12 months before
          the claim or $50. Nothing in these terms limits any liability that cannot be limited by
          law, or any consumer rights that cannot be waived.
        </p>
      </LegalSection>

      <LegalSection title="12. Law and disputes">
        <p>
          These terms are governed by the laws of the Commonwealth of Virginia, without regard to
          its conflict-of-law rules. Before filing a claim, please email us so we can try to fix
          the problem. Any dispute will be resolved in the state or federal courts located in
          Virginia, and either of us may use small claims court if the claim qualifies.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          <SupportEmail />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
