import "server-only";

import bcrypt from "bcryptjs";
import { AgencyVerificationStatus, TripStatus, type TripType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { conflict, forbidden, invalid, notFound } from "@/services/errors";

/**
 * Agency registration and admin verification transitions (CDC §J.1, §K.2).
 *
 * Every status change writes an AgencyStatusHistory row — §K.2's agency
 * detail view requires "Historique des changements de statut", and a status
 * enum with no history table can't answer "when did this happen and why".
 */

export interface RegisterAgencyInput {
  name: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  description: string;
  zones: string[];
  tripTypes: TripType[];
  password: string;
  verificationDocUrl: string;
  registrationNumber?: string;
  gdprConsent: boolean;
  termsAccepted: boolean;
}

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function validateRegistration(input: RegisterAgencyInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 3) errors.name = "Nom trop court (3 caractères min).";
  if (!input.managerName.trim()) errors.managerName = "Nom du gérant requis.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.contactEmail)) errors.contactEmail = "Email invalide.";
  if (!input.contactPhone.trim()) errors.contactPhone = "Téléphone requis.";
  if (input.description.trim().length < 100) errors.description = "Description trop courte (100 caractères min).";
  if (input.zones.length === 0) errors.zones = "Sélectionnez au moins une zone géographique.";
  if (input.tripTypes.length === 0) errors.tripTypes = "Sélectionnez au moins un type de voyage.";
  if (!PASSWORD_RULE.test(input.password)) {
    errors.password = "8 caractères min., avec au moins 1 majuscule et 1 chiffre.";
  }
  if (!input.verificationDocUrl) errors.verificationDocUrl = "Le document justificatif est obligatoire.";
  if (!input.gdprConsent || !input.termsAccepted) {
    errors.consent = "Vous devez accepter les CGU et le traitement RGPD.";
  }

  return errors;
}

async function uniqueAgencySlug(name: string): Promise<string> {
  const base = toSlug(name) || "agence";
  let candidate = base;
  let n = 2;
  while (n < 50) {
    const taken = await prisma.agency.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
  return `${base}-${Date.now()}`;
}

/** §J.1 — registration. Creates both the login (User) and the Agency, PENDING by default. */
export async function registerAgency(input: RegisterAgencyInput) {
  const errors = validateRegistration(input);
  if (Object.keys(errors).length > 0) {
    throw invalid("Le formulaire contient des erreurs.", errors);
  }

  const email = input.contactEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw invalid("Un compte existe déjà avec cet email.", { contactEmail: "Email déjà utilisé." });
  }

  const [passwordHash, slug] = await Promise.all([
    bcrypt.hash(input.password, 10),
    uniqueAgencySlug(input.name),
  ]);

  const agency = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: input.managerName, role: "AGENCY", passwordHash },
    });

    const created = await tx.agency.create({
      data: {
        slug,
        name: input.name.trim(),
        description: input.description.trim(),
        managerName: input.managerName.trim(),
        contactEmail: email,
        contactPhone: input.contactPhone.trim(),
        country: input.country,
        city: input.city.trim(),
        zones: input.zones,
        tripTypes: input.tripTypes,
        verificationDocUrl: input.verificationDocUrl,
        registrationNumber: input.registrationNumber?.trim() || null,
        userId: user.id,
      },
    });

    await tx.agencyStatusHistory.create({
      data: { agencyId: created.id, from: null, to: AgencyVerificationStatus.PENDING },
    });

    return created;
  });

  return agency;
}

/** §K.2 — admin opens a pending dossier. */
export async function markUnderReview(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus !== AgencyVerificationStatus.PENDING) {
    throw conflict("Seul un dossier en attente peut passer en cours d'examen.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agency.update({
      where: { id: agencyId },
      data: { verificationStatus: AgencyVerificationStatus.UNDER_REVIEW },
    });
    await tx.agencyStatusHistory.create({
      data: { agencyId, from: agency.verificationStatus, to: AgencyVerificationStatus.UNDER_REVIEW },
    });
    return updated;
  });
}

/** §K.2 — validate → VERIFIED. Only a PENDING/UNDER_REVIEW dossier can be validated. */
export async function verifyAgency(agencyId: string, adminUserId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus === AgencyVerificationStatus.VERIFIED) {
    throw conflict("Cette agence est déjà vérifiée.");
  }
  if (agency.verificationStatus === AgencyVerificationStatus.REJECTED) {
    throw conflict("Un dossier rejeté doit être resoumis avant validation.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agency.update({
      where: { id: agencyId },
      data: {
        verificationStatus: AgencyVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedByUserId: adminUserId,
      },
    });
    await tx.agencyStatusHistory.create({
      data: { agencyId, from: agency.verificationStatus, to: AgencyVerificationStatus.VERIFIED },
    });
    return updated;
  });
}

/** §K.2 — reject with a required reason → REJECTED. */
export async function rejectAgency(agencyId: string, reason: string) {
  if (!reason.trim()) throw invalid("Le motif de rejet est obligatoire.", { reason: "Motif requis." });

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus === AgencyVerificationStatus.VERIFIED) {
    throw conflict("Une agence déjà vérifiée ne peut pas être rejetée — utilisez la suspension.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agency.update({
      where: { id: agencyId },
      data: { verificationStatus: AgencyVerificationStatus.REJECTED, verificationNote: reason.trim() },
    });
    await tx.agencyStatusHistory.create({
      data: { agencyId, from: agency.verificationStatus, to: AgencyVerificationStatus.REJECTED, reason: reason.trim() },
    });
    return updated;
  });
}

/**
 * §K.2 — suspend with a required reason → SUSPENDED, and every PUBLISHED/FULL
 * trip of theirs → CLOSED in the same transaction. A suspended agency whose
 * trips stayed bookable would defeat the entire point of suspending it.
 */
export async function suspendAgency(agencyId: string, reason: string) {
  if (!reason.trim()) throw invalid("Le motif de suspension est obligatoire.", { reason: "Motif requis." });

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus !== AgencyVerificationStatus.VERIFIED) {
    throw conflict("Seule une agence vérifiée peut être suspendue.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agency.update({
      where: { id: agencyId },
      data: { verificationStatus: AgencyVerificationStatus.SUSPENDED, verificationNote: reason.trim() },
    });

    await tx.groupTrip.updateMany({
      where: { agencyId, status: { in: [TripStatus.PUBLISHED, TripStatus.FULL] } },
      data: { status: TripStatus.CLOSED },
    });

    await tx.agencyStatusHistory.create({
      data: { agencyId, from: agency.verificationStatus, to: AgencyVerificationStatus.SUSPENDED, reason: reason.trim() },
    });

    return updated;
  });
}

/** §K.2 — reactivate a suspended agency → VERIFIED. Trips stay CLOSED; the agency republishes deliberately. */
export async function reactivateAgency(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus !== AgencyVerificationStatus.SUSPENDED) {
    throw conflict("Seule une agence suspendue peut être réactivée.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agency.update({
      where: { id: agencyId },
      data: { verificationStatus: AgencyVerificationStatus.VERIFIED, verificationNote: null },
    });
    await tx.agencyStatusHistory.create({
      data: { agencyId, from: agency.verificationStatus, to: AgencyVerificationStatus.VERIFIED },
    });
    return updated;
  });
}

/**
 * §K.1 — "agences en attente depuis > 48h" alert. Not in the CDC's literal
 * text as a guarantee, but K.1 lists it as a required alert, so it needs a
 * real query, not just a badge that never lights up.
 */
export async function findAgenciesPendingOver48h() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return prisma.agency.findMany({
    where: {
      verificationStatus: { in: [AgencyVerificationStatus.PENDING, AgencyVerificationStatus.UNDER_REVIEW] },
      createdAt: { lte: cutoff },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** §J.7 — agency edits its own public-facing profile fields. Email and status are never editable here. */
export async function updateAgencyProfile(
  agencyId: string,
  patch: { name?: string; description?: string; zones?: string[]; tripTypes?: TripType[]; contactPhone?: string; logoUrl?: string | null }
) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound("Agence introuvable.");
  if (agency.verificationStatus === AgencyVerificationStatus.SUSPENDED) {
    throw forbidden("Un compte suspendu ne peut pas modifier son profil.");
  }

  return prisma.agency.update({ where: { id: agencyId }, data: patch });
}
