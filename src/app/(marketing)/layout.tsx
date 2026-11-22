import { Cursor, SmoothScroll } from "@/components/marketing/motion";
import { ObscuronSignature } from "@/components/marketing/obscuron-signature";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import "./tm.css";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="tm">
      <SiteHeader />
      <main id="main" className="flexible">
        {children}
      </main>
      <SiteFooter />
      <ObscuronSignature />
      <Cursor />
      <SmoothScroll />
    </div>
  );
}
