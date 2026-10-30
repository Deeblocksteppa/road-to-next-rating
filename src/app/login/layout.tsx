import { SiteFooter } from "@/components/legal/SiteFooter";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
