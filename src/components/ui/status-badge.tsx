import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  AgencyVerificationStatus,
  BookingStatus,
  GroupTripStatus,
  PaymentStatus,
  TravelRequestStatus,
} from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-muted text-info",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-destructive/10 text-destructive",
};

const TRIP_TONE: Record<GroupTripStatus, Tone> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  FULL: "warning",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

const AGENCY_TONE: Record<AgencyVerificationStatus, Tone> = {
  PENDING: "neutral",
  UNDER_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
  SUSPENDED: "warning",
};

/** Dashboard-only kinds (agency/admin, out of i18n scope) — stay French. */
const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Paiement en attente", tone: "warning" },
  CONFIRMED: { label: "Confirmée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  REFUNDED: { label: "Remboursée", tone: "info" },
  NO_SHOW: { label: "Absent", tone: "neutral" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "neutral" },
  SUCCEEDED: { label: "Réussi", tone: "success" },
  FAILED: { label: "Échoué", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
  REFUNDED: { label: "Remboursé", tone: "info" },
};

const TRAVEL_REQUEST_STATUS: Record<TravelRequestStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: "Soumise", tone: "neutral" },
  AI_PROCESSED: { label: "Analysée", tone: "info" },
  MATCH_SUGGESTED: { label: "Suggestions envoyées", tone: "info" },
  CLIENT_CONFIRMED: { label: "Confirmée par le client", tone: "success" },
  PAYMENT_PENDING: { label: "Paiement en attente", tone: "warning" },
  PAID: { label: "Payée", tone: "success" },
  CLOSED: { label: "Clôturée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};

type StatusBadgeProps =
  | { kind: "trip"; status: GroupTripStatus; className?: string }
  | { kind: "booking"; status: BookingStatus; className?: string }
  | { kind: "agency"; status: AgencyVerificationStatus; className?: string }
  | { kind: "payment"; status: PaymentStatus; className?: string }
  | { kind: "travelRequest"; status: TravelRequestStatus; className?: string };

/**
 * "trip" and "agency" render on public, in-scope pages (trip detail's own
 * lifecycle badge, the agency card) and are translated via the StatusBadge
 * namespace; the other three kinds only ever render inside the out-of-scope
 * agency/admin dashboards and keep their original hardcoded French labels.
 */
export function StatusBadge(props: StatusBadgeProps) {
  const t = useTranslations("StatusBadge");

  let label: string;
  let tone: Tone;
  switch (props.kind) {
    case "trip":
      label = t(`trip.${props.status}`);
      tone = TRIP_TONE[props.status];
      break;
    case "agency":
      label = t(`agency.${props.status}`);
      tone = AGENCY_TONE[props.status];
      break;
    case "booking":
      ({ label, tone } = BOOKING_STATUS[props.status]);
      break;
    case "payment":
      ({ label, tone } = PAYMENT_STATUS[props.status]);
      break;
    case "travelRequest":
      ({ label, tone } = TRAVEL_REQUEST_STATUS[props.status]);
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        props.className
      )}
    >
      {label}
    </span>
  );
}
