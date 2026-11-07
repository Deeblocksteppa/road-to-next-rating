import { redirect } from "next/navigation";

/**
 * The old stand-alone sign-up. Accounts are made on the save form at /start,
 * after the assessment, where the plan comes with them and the emailed code
 * is entered. This page could only promise a link and had nothing to save,
 * so it sends anyone who still has the URL to the assessment.
 */
export default function SignupPage() {
  redirect("/start");
}
