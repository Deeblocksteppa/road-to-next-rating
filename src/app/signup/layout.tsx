import { SiteFooter } from "@/components/legal/SiteFooter";

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter column="max-w-[432px]" />
    </>
  );
}
