import { SiteFooter } from "@/components/legal/SiteFooter";

/** Settings and its sub-routes share the site footer. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
