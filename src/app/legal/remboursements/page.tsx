import type { Metadata } from "next";

export const metadata: Metadata = { title: "Remboursements | MaghrebVoyage" };

export default function RemboursementsPage() {
  return (
    <>
      <h1>Politique de remboursement</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : 1 août 2026</p>

      <h2>1. Ce que vous payez en ligne</h2>
      <p>
        Seul l’acompte est payé en ligne au moment de la réservation (au minimum 10% du prix total du voyage). Le
        solde est réglé directement auprès de l’agence, selon les modalités qu’elle communique après confirmation.
      </p>

      <h2>2. Annulation par le client</h2>
      <p>
        Vous pouvez annuler votre réservation à tout moment via le lien d’annulation personnel reçu par email.
        L’annulation libère immédiatement votre place. Le remboursement de l’acompte est ensuite traité{" "}
        <strong>manuellement</strong> par notre équipe support, généralement sous quelques jours ouvrés.
      </p>

      <h2>3. Annulation par l’agence</h2>
      <p>
        Si une agence annule un voyage (effectif insuffisant, cas de force majeure, etc.), toutes les réservations
        confirmées sont automatiquement annulées et un remboursement intégral de l’acompte est initié pour chaque
        client concerné.
      </p>

      <h2>4. Délais de traitement</h2>
      <p>
        Les remboursements sont traités manuellement depuis le tableau de bord Stripe par notre équipe administrative.
        Un email de confirmation vous est envoyé dès que le remboursement est marqué comme effectué.
      </p>

      <h2>5. Solde du voyage</h2>
      <p>
        Le solde réglé directement à l’agence (hors plateforme) n’est pas couvert par cette politique : les
        conditions d’annulation ou de remboursement du solde relèvent des conditions propres de l’agence
        organisatrice, communiquées avant le départ.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question sur un remboursement en cours, contactez notre support via les coordonnées indiquées dans
        nos <a href="/legal/mentions">mentions légales</a>.
      </p>
    </>
  );
}
