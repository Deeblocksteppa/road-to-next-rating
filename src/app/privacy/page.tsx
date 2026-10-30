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
  title: "Privacy Policy · Road to Next Rating",
  description: "What Road to Next Rating stores and who processes it.",
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what Road to Next Rating (&quot;we,&quot; &quot;us&quot;) collects,
        why, who helps us run the Service, and the choices you have. Questions: <SupportEmail />.
      </p>

      <LegalSection title="The short version">
        <LegalList>
          <li>
            We collect what the app needs to diagnose your game, build your plan, and track your
            practice.
          </li>
          <li>
            We don&apos;t sell your data, share it for advertising, or use ad or analytics
            trackers.
          </li>
          <li>You can delete your account and its data at any time in Settings.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>
          <Lead>Your assessment.</Lead> Your answers, your diagnosis, and your plan. These are
          saved to our database as soon as you finish the assessment, before you create an
          account, so we can show you your plan and keep it if you sign up. Your browser also
          keeps a copy and an ID so it can find your result again.
        </p>
        <p>
          <Lead>Your account.</Lead> Your email address, a password (stored only in hashed form
          by our sign-in provider), your email reminder settings, and when you agreed to these
          terms.
        </p>
        <p>
          <Lead>Your practice.</Lead> The drill results you log and when you logged them, plus
          your re-test answers and results.
        </p>
        <p>
          <Lead>Payments.</Lead> If you buy a paid plan, Stripe collects your payment details. We
          never see your full card number. We store your Stripe customer and subscription IDs,
          your plan type (monthly or yearly), its status, and your renewal date.
        </p>
        <p>
          <Lead>Technical data.</Lead> Cookies that keep you signed in, browser storage that
          keeps your result on your device, and standard server logs (such as IP address, browser
          type, and pages requested) that our hosting providers keep for a limited time for
          security and troubleshooting. We don&apos;t use analytics, advertising, or tracking
          cookies.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <LegalList>
          <li>
            To run the Service: score your assessment, build your plan, record your sessions, and
            show your progress.
          </li>
          <li>
            To send emails you need: sign-up confirmation, password resets, session reminders,
            your re-test reminder, and billing emails.
          </li>
          <li>To process payments and manage your subscription.</li>
          <li>
            To keep the Service secure, prevent abuse, fix problems, and answer support requests.
          </li>
          <li>
            To understand, in aggregate, how the Service is used (for example, which skills come
            up most often) so we can improve it.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>
          We share data only with providers that help us run the Service, and only what each one
          needs:
        </p>
        <LegalList>
          <li>
            <Lead>Supabase</Lead>: database and sign-in
          </li>
          <li>
            <Lead>Vercel</Lead>: website hosting
          </li>
          <li>
            <Lead>Stripe</Lead>: payments and billing emails
          </li>
          <li>
            <Lead>Resend</Lead>: sending emails
          </li>
          <li>
            <Lead>ImprovMX</Lead>: forwarding email sent to our support address
          </li>
        </LegalList>
        <p>
          We may also share information if the law requires it, to protect someone&apos;s safety,
          or as part of a sale or transfer of the business (with notice to you). We do not sell or
          rent your personal information, and we don&apos;t share it for targeted advertising.
        </p>
      </LegalSection>

      <LegalSection title="Emails">
        <LegalList>
          <li>
            Account emails (confirmation, password reset) are always sent because the Service
            needs them.
          </li>
          <li>
            Session reminders are on by default while your plan is active, and they stop after
            your re-test date. We send one re-test reminder when your re-test opens. You can turn
            either off in Settings, and every reminder has an unsubscribe link that works without
            signing in.
          </li>
          <li>Billing emails (receipts and renewal notices) come from Stripe.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalList>
          <li>
            <Lead>Account data</Lead> (answers, diagnoses, plans, practice logs): until you delete
            your account.
          </li>
          <li>
            <Lead>Results never saved to an account</Lead>: deleted after 30 days.
          </li>
          <li>
            <Lead>Sign-ups never confirmed</Lead>: deleted after 30 days.
          </li>
          <li>
            <Lead>Payment records</Lead>: kept by Stripe and by us as long as tax and accounting
            rules require, even after you delete your account.
          </li>
          <li>
            <Lead>Server logs and backups</Lead>: kept by our providers for a limited time, then
            deleted.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          Go to Settings and choose Delete account. This deletes your account, answers, diagnoses,
          plans, and practice logs, signs you out, and clears your result from that browser. It
          also cancels any paid plan right away (see our <LegalLink href="/terms">Terms</LegalLink>
          ). Payment records stay with Stripe as described above, and copies in backups expire on
          their normal schedule.
        </p>
        <p>
          You can also email us to access, correct, or delete your information. We&apos;ll respond
          within 45 days.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The Service is not for children under 13, and we don&apos;t knowingly collect their
          information. If you believe a child under 13 has given us information, email us and
          we&apos;ll delete it.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use reasonable measures to protect your information, including encrypted connections
          and database access rules that keep each player&apos;s data private to them. No system
          is perfectly secure, so we can&apos;t guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="Where your data is stored">
        <p>
          Your data is stored and processed in the United States [CONFIRM: Supabase and Vercel
          regions].
        </p>
      </LegalSection>

      <LegalSection title="Do Not Track">
        <p>
          We don&apos;t track you across other websites, so we don&apos;t change anything in
          response to Do Not Track signals.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we make a material change, we&apos;ll tell you by email or in the app before it takes
          effect. The date at the top shows when this policy last changed.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          <SupportEmail />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
