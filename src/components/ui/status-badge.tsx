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

const TRIP_STATUS: Record<GroupTripStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PUBLISHED: { label: "Publié", tone: "success" },
  FULL: { label: "Complet", tone: "warning" },
  CLOSED: { label: "Clôturé", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "danger" },
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Paiement en attente", tone: "warning" },
  CONFIRMED: { label: "Confirmée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  REFUNDED: { label: "Remboursée", tone: "info" },
  NO_SHOW: { label: "Absent", tone: "neutral" },
};

const AGENCY_STATUS: Record<AgencyVerificationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "neutral" },
  UNDER_REVIEW: { label: "En cours d'examen", tone: "info" },
  VERIFIED: { label: "Vérifiée", tone: "success" },
  REJECTED: { label: "Rejetée", tone: "danger" },
  SUSPENDED: { label: "Suspendue", tone: "warning" },
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

function resolve(props: StatusBadgeProps): { label: string; tone: Tone } {
  switch (props.kind) {
    case "trip":
      return TRIP_STATUS[props.status];
    case "booking":
      return BOOKING_STATUS[props.status];
    case "agency":
      return AGENCY_STATUS[props.status];
    case "payment":
      return PAYMENT_STATUS[props.status];
    case "travelRequest":
      return TRAVEL_REQUEST_STATUS[props.status];
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } = resolve(props);
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
