import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { listBookingsForUser } from "@/services/bookings.service";
import { formatDateRange, formatPrice } from "@/lib/format";
import {
  AccountBookingsList,
  type AccountBookingView,
} from "@/components/bookings/account-bookings-list";

export const metadata: Metadata = {
  title: "Mes réservations",
  // A personal dashboard behind a session — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

/**
 * The client account dashboard: where the magic-link sign-in lands, and what
 * E2's "manage / cancel my booking" link points at. Both previously pointed
 * at a route that didn't exist, so a magic link delivered the visitor to a
 * 404 immediately after authenticating them.
 *
 * `src/proxy.ts` already gates /account for CLIENT sessions; the check is
 * repeated here because CLAUDE.md §4 requires every protected route to verify
 * its own role rather than trusting middleware alone.
 */
export default async function AccountBookingsPage({
  params,
}: PageProps<"/[locale]/account/bookings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    redirect({ href: "/login?from=/account/bookings", locale });
  }

  const t = await getTranslations("Account");
  const rows = await listBookingsForUser(session!.user.id!);

  const bookings: AccountBookingView[] = rows.map((b) => {
    // Decimal → number at the boundary: Prisma's Decimal doesn't serialize
    // across to a client component, and the display needs a formatted string
    // in the visitor's locale anyway.
    const deposit = b.depositPaid ? Number(b.depositPaid) : null;
    const total = Number(b.totalAmount);

    return {
      id: b.id,
      status: b.status,
      confirmationCode: b.confirmationCode,
      numberOfSeats: b.numberOfSeats,
      depositPaid: deposit === null ? null : formatPrice(deposit, locale),
      // Only meaningful once a deposit has actually been taken — before that
      // "balance due" would just restate the full price as if part were paid.
      balanceDue: deposit === null ? null : formatPrice(total - deposit, locale),
      tripSlug: b.groupTrip.slug,
      tripTitle: b.groupTrip.title,
      destination: b.groupTrip.destination,
      dates: formatDateRange(
        b.groupTrip.startDate.toISOString(),
        b.groupTrip.endDate.toISOString(),
        locale
      ),
      meetingPoint: b.groupTrip.meetingPoint,
      agencyName: b.agency.name,
      agencyEmail: b.agency.contactEmail,
      agencyPhone: b.agency.contactPhone,
      // Mirrors cancelBookingByUser's own precondition — the service is still
      // the authority; this only decides whether to offer the control.
      cancellable: b.status === "CONFIRMED",
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <AccountBookingsList bookings={bookings} />
    </div>
  );
}
