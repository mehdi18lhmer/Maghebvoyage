import "server-only";

import { Resend } from "resend";

/**
 * Transactional email (CDC §I — E1 through E14).
 *
 * Every send goes through `send()`, which never throws: §5.3 requires a
 * try/catch around each external call, and §6.3 is explicit that email must
 * not block the Stripe webhook's 200 response. A failed email must never cost
 * a confirmed booking.
 *
 * Only E2 is templated so far — it's the one the CDC specifies content for in
 * detail, and the one a traveller actually needs. The rest land with the
 * backend that triggers them.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

const FROM = process.env.RESEND_FROM ?? "MaghrebVoyage <onboarding@resend.dev>";

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function send({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email.service] RESEND_API_KEY missing — skipped", { subject });
    return { ok: false, error: "not-configured" };
  }

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email.service] send failed", { subject, error: error.message });
      return { ok: false, error: error.message };
    }
    console.info("[email.service] sent", { subject, id: data?.id });
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email.service] threw", {
      subject,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "exception" };
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@maghrebvoyage.com";

function layout(body: string): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f7f7fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#131826">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="font-size:18px;font-weight:800;letter-spacing:-.02em;margin:0 0 24px">MaghrebVoyage</p>
    <div style="background:#fff;border:1px solid #e6e4f0;border-radius:16px;padding:28px">${body}</div>
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6">
      <a href="${APP_URL}/legal/cgu" style="color:#5b2bd0">CGU</a> ·
      <a href="${APP_URL}/legal/confidentialite" style="color:#5b2bd0">Confidentialité</a> ·
      <a href="${APP_URL}/legal/remboursements" style="color:#5b2bd0">Remboursements</a>
    </p>
  </div>
</body></html>`;
}

/**
 * E2 (client) + E3 (agency) — fired by the Stripe webhook once a booking is
 * CONFIRMED. Loads the booking itself rather than taking a payload, so the
 * email can never disagree with what was actually committed.
 *
 * Never throws: §H requires the webhook to return 200 regardless of email
 * delivery, and a Resend outage must not trigger a Stripe retry of an
 * already-applied transaction.
 */
export async function sendBookingConfirmed(bookingId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { groupTrip: true, agency: true },
  });
  if (!booking || !booking.confirmationCode) return;

  const trip = booking.groupTrip;
  const money = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: trip.currency }).format(v);
  const dates = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatRange(trip.startDate, trip.endDate);

  const depositPaid = Number(booking.depositPaid ?? 0);
  const balanceDue = Number(booking.totalAmount) - depositPaid;

  const e2 = renderBookingConfirmation({
    clientEmail: booking.clientEmail,
    clientName: booking.clientName,
    confirmationCode: booking.confirmationCode,
    tripTitle: trip.title,
    destination: trip.destination,
    dates,
    meetingPoint: trip.meetingPoint ?? undefined,
    depositPaid: money(depositPaid),
    balanceDue: money(balanceDue),
    agencyName: booking.agency.name,
    agencyEmail: booking.agency.contactEmail,
    agencyPhone: booking.agency.contactPhone,
    cancellationToken: booking.cancellationToken,
  });

  // Sent in parallel and independently: the agency failing to receive E3 must
  // not stop the client receiving E2.
  await Promise.allSettled([
    send({ to: booking.clientEmail, subject: e2.subject, html: e2.html }),
    send({
      to: booking.agency.contactEmail,
      subject: `Nouvelle réservation — ${trip.title}`,
      html: layout(`
        <p style="margin:0 0 16px;font-size:15px">Bonne nouvelle : une nouvelle réservation vient d’être confirmée.</p>
        <p style="margin:0 0 6px;font-weight:700;font-size:16px">${trip.title}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280">${dates}</p>
        <table style="width:100%;border-top:1px solid #e6e4f0;font-size:14px">
          <tr><td style="padding:12px 0;color:#6b7280">Client</td><td style="padding:12px 0;text-align:right;font-weight:600">${booking.clientName}</td></tr>
          <tr><td style="padding:0 0 12px;color:#6b7280">Email</td><td style="padding:0 0 12px;text-align:right">${booking.clientEmail}</td></tr>
          ${booking.clientPhone ? `<tr><td style="padding:0 0 12px;color:#6b7280">Téléphone</td><td style="padding:0 0 12px;text-align:right">${booking.clientPhone}</td></tr>` : ""}
          <tr><td style="padding:0 0 12px;color:#6b7280">Places</td><td style="padding:0 0 12px;text-align:right;font-weight:600">${booking.numberOfSeats}</td></tr>
          <tr><td style="padding:0 0 12px;color:#6b7280">Acompte encaissé</td><td style="padding:0 0 12px;text-align:right;font-weight:700;color:#16a34a">${money(depositPaid)}</td></tr>
          <tr><td style="padding:0 0 12px;color:#6b7280">Solde sur place</td><td style="padding:0 0 12px;text-align:right;font-weight:700">${money(balanceDue)}</td></tr>
          <tr><td style="padding:0 0 12px;color:#6b7280">Code</td><td style="padding:0 0 12px;text-align:right;font-family:monospace;font-weight:700">${booking.confirmationCode}</td></tr>
        </table>
      `),
    }),
  ]);
}

export interface BookingConfirmationInput {
  clientEmail: string;
  clientName: string;
  confirmationCode: string;
  tripTitle: string;
  destination: string;
  dates: string;
  meetingPoint?: string;
  depositPaid: string;
  balanceDue: string;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  cancellationToken: string;
}

/**
 * E2 — booking confirmed, to the client.
 * §I lists the mandatory contents: the code shown large, trip title/destination/
 * dates, agency contact, deposit paid + balance due on site, meeting point when
 * set, the cancellation link, and legal links in the footer.
 */
export function renderBookingConfirmation(i: BookingConfirmationInput): {
  subject: string;
  html: string;
} {
  const cancelUrl = `${APP_URL}/booking/cancel?token=${encodeURIComponent(i.cancellationToken)}`;

  return {
    subject: `Réservation confirmée — ${i.tripTitle}`,
    html: layout(`
      <p style="margin:0 0 4px;font-size:15px">Bonjour ${i.clientName},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Votre acompte a bien été reçu, votre place est réservée.</p>

      <div style="text-align:center;background:#f0fdf4;border:2px dashed #86d9ab;border-radius:14px;padding:20px;margin:0 0 24px">
        <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280">Votre code de confirmation</p>
        <p style="margin:8px 0 0;font-size:30px;font-weight:800;letter-spacing:.06em;color:#16a34a">${i.confirmationCode}</p>
      </div>

      <p style="margin:0 0 6px;font-weight:700;font-size:16px">${i.tripTitle}</p>
      <p style="margin:0 0 2px;font-size:14px;color:#6b7280">${i.destination}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280">${i.dates}</p>
      ${i.meetingPoint ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280">Rendez-vous : ${i.meetingPoint}</p>` : ""}

      <table style="width:100%;border-top:1px solid #e6e4f0;margin:0 0 16px;font-size:14px">
        <tr><td style="padding:12px 0;color:#6b7280">Acompte payé</td><td style="padding:12px 0;text-align:right;font-weight:700;color:#16a34a">${i.depositPaid}</td></tr>
        <tr><td style="padding:0 0 12px;color:#6b7280">Reste à régler sur place</td><td style="padding:0 0 12px;text-align:right;font-weight:700">${i.balanceDue}</td></tr>
      </table>

      <div style="border-top:1px solid #e6e4f0;padding-top:16px;margin-bottom:20px">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700">Votre agence</p>
        <p style="margin:0;font-size:14px;color:#6b7280">${i.agencyName}<br>${i.agencyEmail} · ${i.agencyPhone}</p>
      </div>

      <a href="${cancelUrl}" style="display:inline-block;font-size:13px;color:#5b2bd0">Annuler ma réservation</a>
    `),
  };
}

/** E4 (agency) + E5 (admin) — fired right after §J.1's registration form is submitted. */
export async function sendAgencyRegistrationSubmitted(agencyId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return;

  await Promise.allSettled([
    send({
      to: agency.contactEmail,
      subject: "Votre dossier est en cours d'examen",
      html: layout(`
        <p style="margin:0 0 12px;font-size:15px">Bonjour ${agency.managerName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
          Nous avons bien reçu le dossier d'inscription de <strong>${agency.name}</strong>.
          Notre équipe l'examine et revient vers vous sous 48h.
        </p>
      `),
    }),
    send({
      to: ADMIN_EMAIL,
      subject: `Nouvelle inscription agence à valider — ${agency.name}`,
      html: layout(`
        <p style="margin:0 0 16px;font-size:15px">Une nouvelle agence attend une validation.</p>
        <table style="width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Agence</td><td style="padding:6px 0;text-align:right;font-weight:700">${agency.name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Contact</td><td style="padding:6px 0;text-align:right">${agency.contactEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Pays</td><td style="padding:6px 0;text-align:right">${agency.country}</td></tr>
        </table>
        <a href="${APP_URL}/admin/agences/${agency.id}" style="display:inline-block;margin-top:16px;font-size:13px;color:#5b2bd0">Examiner le dossier</a>
      `),
    }),
  ]);
}

/** E6 — agency validated (→ VERIFIED). */
export async function sendAgencyVerified(agencyId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return;

  const { subject, html } = {
    subject: "Votre compte est activé — Bienvenue !",
    html: layout(`
      <p style="margin:0 0 12px;font-size:15px">Bonjour ${agency.managerName},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">
        Bonne nouvelle : <strong>${agency.name}</strong> est maintenant une agence vérifiée sur MaghrebVoyage.
        Vous pouvez publier vos voyages dès maintenant.
      </p>
      <a href="${APP_URL}/agency" style="display:inline-block;background:#5b2bd0;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Accéder à mon espace</a>
    `),
  };
  await send({ to: agency.contactEmail, subject, html });
}

/** E7 — agency rejected, with the admin's reason. */
export async function sendAgencyRejected(agencyId: string, reason: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return;

  await send({
    to: agency.contactEmail,
    subject: "Votre dossier n'a pas pu être validé",
    html: layout(`
      <p style="margin:0 0 12px;font-size:15px">Bonjour ${agency.managerName},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
        Après examen, nous ne pouvons pas valider le dossier de <strong>${agency.name}</strong> pour le moment.
      </p>
      <div style="background:#fef2f2;border-radius:10px;padding:14px;font-size:14px;color:#7f1d1d">${reason}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280">Vous pouvez soumettre un nouveau dossier une fois la situation corrigée.</p>
    `),
  });
}

/** E8 (client) + E9 (agency) + E10 (admin) — client cancels via their token link (§G.1). */
export async function sendClientCancellation(bookingId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { groupTrip: true, agency: true },
  });
  if (!booking) return;
  const trip = booking.groupTrip;

  await Promise.allSettled([
    send({
      to: booking.clientEmail,
      subject: `Annulation confirmée — ${trip.title}`,
      html: layout(`
        <p style="margin:0 0 12px;font-size:15px">Bonjour ${booking.clientName},</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6">
          Votre réservation pour <strong>${trip.title}</strong> a bien été annulée.
        </p>
        <p style="margin:0;font-size:14px;color:#6b7280">Le remboursement de votre acompte sera traité par notre équipe dans les meilleurs délais.</p>
      `),
    }),
    send({
      to: booking.agency.contactEmail,
      subject: `Un client a annulé sa réservation — ${trip.title}`,
      html: layout(`
        <p style="margin:0 0 12px;font-size:15px"><strong>${booking.clientName}</strong> a annulé sa réservation sur <strong>${trip.title}</strong>.</p>
        <p style="margin:0;font-size:14px;color:#6b7280">${booking.numberOfSeats} place(s) ont été remises en disponibilité.</p>
      `),
    }),
    send({
      to: ADMIN_EMAIL,
      subject: `Remboursement à traiter — ${booking.clientName}`,
      html: layout(`
        <p style="margin:0 0 12px;font-size:15px">Un remboursement d'acompte est à traiter.</p>
        <table style="width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Client</td><td style="padding:6px 0;text-align:right;font-weight:700">${booking.clientName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Voyage</td><td style="padding:6px 0;text-align:right">${trip.title}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Montant</td><td style="padding:6px 0;text-align:right;font-weight:700">${new Intl.NumberFormat("fr-FR", { style: "currency", currency: trip.currency }).format(Number(booking.depositPaid ?? 0))}</td></tr>
        </table>
        <a href="${APP_URL}/admin/reservations" style="display:inline-block;margin-top:16px;font-size:13px;color:#5b2bd0">Traiter le remboursement</a>
      `),
    }),
  ]);
}

/** E11 (each affected client) + E12 (admin) — agency cancels an entire trip (§G.2). */
export async function sendTripCancelledByAgency(tripId: string, bookingIds: string[]): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const trip = await prisma.groupTrip.findUnique({ where: { id: tripId }, include: { agency: true } });
  if (!trip || bookingIds.length === 0) {
    // Still tell admin a trip was cancelled even with zero bookings affected —
    // there's nothing to refund, but the cancellation itself is worth a record.
    if (trip) {
      await send({
        to: ADMIN_EMAIL,
        subject: `Voyage annulé — ${trip.title} (0 remboursement)`,
        html: layout(`<p style="font-size:15px">« ${trip.title} » a été annulé par ${trip.agency.name}. Aucune réservation confirmée n'était en cours.</p>`),
      });
    }
    return;
  }

  const bookings = await prisma.booking.findMany({ where: { id: { in: bookingIds } } });

  await Promise.allSettled(
    bookings.map((b) =>
      send({
        to: b.clientEmail,
        subject: `Votre voyage « ${trip.title} » a été annulé`,
        html: layout(`
          <p style="margin:0 0 12px;font-size:15px">Bonjour ${b.clientName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
            Nous sommes désolés de vous informer que <strong>${trip.title}</strong>, organisé par ${trip.agency.name},
            a été annulé par l'agence.
          </p>
          <p style="margin:0;font-size:14px;color:#6b7280">
            ${trip.cancelReason ? `Motif : ${trip.cancelReason}. ` : ""}Vous serez remboursé de votre acompte dans les meilleurs délais.
          </p>
        `),
      })
    )
  );

  await send({
    to: ADMIN_EMAIL,
    subject: `Voyage annulé — ${trip.title} (${bookings.length} remboursement${bookings.length > 1 ? "s" : ""} à traiter)`,
    html: layout(`
      <p style="margin:0 0 16px;font-size:15px">« ${trip.title} » a été annulé par ${trip.agency.name}.</p>
      <p style="margin:0 0 12px;font-size:14px;font-weight:700">${bookings.length} client(s) à rembourser :</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151">
        ${bookings.map((b) => `<li>${b.clientName} — ${b.clientEmail}</li>`).join("")}
      </ul>
    `),
  });
}

/** E13 — admin marks a booking's refund as processed (§G.3). */
export async function sendRefundConfirmed(bookingId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { groupTrip: true } });
  if (!booking) return;

  await send({
    to: booking.clientEmail,
    subject: "Votre remboursement a été effectué",
    html: layout(`
      <p style="margin:0 0 12px;font-size:15px">Bonjour ${booking.clientName},</p>
      <p style="margin:0;font-size:15px;line-height:1.6">
        Le remboursement de votre acompte pour <strong>${booking.groupTrip.title}</strong> a été traité.
        Selon votre banque, il peut prendre quelques jours pour apparaître sur votre compte.
      </p>
    `),
  });
}
