import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { invalid } from "@/services/errors";

export interface RegisterClientInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Client self-registration (password path only — the magic-link path never
 * needs this, Auth.js's Resend provider creates the User row itself via the
 * Prisma adapter on first verified sign-in).
 */
export async function registerClient(input: RegisterClientInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) {
    throw invalid("Formulaire invalide.", { name: "Nom trop court." });
  }
  if (input.password.length < 8) {
    throw invalid("Formulaire invalide.", { password: "8 caractères minimum." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw invalid("Un compte existe déjà avec cet email.", { email: "Email déjà utilisé." });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: { email, name, role: "CLIENT", passwordHash },
  });
}
