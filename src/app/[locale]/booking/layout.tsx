import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

// Duplicate-content forms (mirrors /trip/[slug]) plus, on /booking/success
// and /booking/cancel, sensitive query params (Stripe session id,
// cancellation token) — none of this belongs in a search index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1 bg-secondary/20">{children}</main>
      <SiteFooter />
    </div>
  );
}
