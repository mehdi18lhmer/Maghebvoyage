"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CalendarDays, Loader2, MapPin, Ticket } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Serializable view of a booking. The page maps Prisma rows into this before
 * handing them over — Decimal and Date don't survive the server/client
 * boundary, so amounts arrive pre-formatted and dates as ISO strings.
 */
export interface AccountBookingView {
  id: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "REFUNDED" | "NO_SHOW";
  confirmationCode: string | null;
  numberOfSeats: number;
  depositPaid: string | null;
  balanceDue: string | null;
  tripSlug: string;
  tripTitle: string;
  destination: string;
  dates: string;
  meetingPoint: string | null;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string | null;
  /** Drives whether the cancel control renders — computed server-side. */
  cancellable: boolean;
}

const STATUS_TONE: Record<AccountBookingView["status"], string> = {
  PENDING_PAYMENT: "bg-warning-muted text-warning",
  CONFIRMED: "bg-success-muted text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-info-muted text-info",
  NO_SHOW: "bg-muted text-muted-foreground",
};

export function AccountBookingsList({ bookings }: { bookings: AccountBookingView[] }) {
  const t = useTranslations("Account");
  const router = useRouter();

  // Keyed by booking id so two cards never share one spinner or one error.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function cancel(bookingId: string) {
    setPendingId(bookingId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [bookingId]: data?.error ?? t("cancelError") }));
        return;
      }

      setConfirmingId(null);
      // The list is server-rendered; refresh re-reads it so the status badge
      // and the freed seat count both reflect the cancellation.
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [bookingId]: t("cancelError") }));
    } finally {
      setPendingId(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <Card className="items-center gap-4 p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent">
          <Ticket className="size-6 text-primary" />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-heading text-lg font-bold">{t("emptyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
        <Button asChild>
          <Link href="/voyages">{t("emptyCta")}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <Card key={b.id} className="gap-0 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold">{b.tripTitle}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {b.destination}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" />
                {b.dates}
              </p>
            </div>

            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_TONE[b.status]
              )}
            >
              {t(`status.${b.status}`)}
            </span>
          </div>

          {b.confirmationCode && (
            <div className="mt-5 rounded-xl border-2 border-dashed border-success/40 bg-success-muted/40 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("confirmationCode")}
              </p>
              <p className="mt-1 font-heading text-xl font-extrabold tracking-wider text-success">
                {b.confirmationCode}
              </p>
            </div>
          )}

          <Separator className="my-5" />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label={t("seats")} value={String(b.numberOfSeats)} />
            {b.depositPaid && <Row label={t("depositPaid")} value={b.depositPaid} />}
            {b.balanceDue && <Row label={t("balanceDue")} value={b.balanceDue} />}
            {b.meetingPoint && <Row label={t("meetingPoint")} value={b.meetingPoint} />}
          </dl>

          <Separator className="my-5" />

          <div className="text-sm">
            <p className="font-semibold">{t("agency")}</p>
            <p className="mt-1 text-muted-foreground">
              {b.agencyName} · <a className="text-primary hover:underline" href={`mailto:${b.agencyEmail}`}>{b.agencyEmail}</a>
              {b.agencyPhone ? ` · ${b.agencyPhone}` : ""}
            </p>
          </div>

          {errors[b.id] && (
            <Alert variant="destructive" className="mt-5">
              <AlertDescription>{errors[b.id]}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href={`/trip/${b.tripSlug}`}>{t("viewTrip")}</Link>
            </Button>

            {b.cancellable &&
              (confirmingId === b.id ? (
                <>
                  {/* Two-step: cancelling forfeits the deposit under §G.1's
                      manual-refund policy, so it never fires on one click. */}
                  <Button
                    variant="destructive"
                    onClick={() => cancel(b.id)}
                    disabled={pendingId === b.id}
                  >
                    {pendingId === b.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      t("cancelConfirm")
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmingId(null)}
                    disabled={pendingId === b.id}
                  >
                    {t("cancelAbort")}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmingId(b.id)}>
                  {t("cancelBooking")}
                </Button>
              ))}
          </div>

          {confirmingId === b.id && (
            <p className="mt-3 text-xs text-muted-foreground">{t("cancelWarning")}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
