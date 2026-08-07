import type { Metadata } from "next";

export const metadata: Metadata = { title: "CGU | MaghrebVoyage" };

export default function CguPage() {
  return (
    <>
      <h1>Conditions Générales d’Utilisation</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : 1 août 2026</p>

      <h2>1. Objet</h2>
      <p>
        MaghrebVoyage est une marketplace qui met en relation des agences de voyage vérifiées et des voyageurs
        souhaitant réserver des voyages en petit groupe au Maroc, en Tunisie et en Algérie. MaghrebVoyage n’est ni
        organisateur de voyage, ni agence de voyage : chaque voyage publié est conçu, tarifé et opéré exclusivement
        par l’agence qui le publie.
      </p>

      <h2>2. Rôle de la plateforme</h2>
      <p>
        MaghrebVoyage fournit l’outil de publication aux agences, le module de réservation et de paiement de
        l’acompte, ainsi que les communications transactionnelles associées. La relation contractuelle relative au
        voyage lui-même (prestations, solde à payer, conditions sur place) se noue directement entre le voyageur et
        l’agence.
      </p>

      <h2>3. Vérification des agences</h2>
      <p>
        Toute agence doit soumettre un dossier de vérification avant de pouvoir publier un voyage. Cette vérification
        porte sur l’existence légale de l’agence et ses zones d’activité déclarées ; elle ne constitue pas une
        garantie de résultat sur la qualité des prestations fournies pendant le voyage.
      </p>

      <h2>4. Réservation et paiement</h2>
      <p>
        La réservation d’une place est confirmée après paiement en ligne d’un acompte par carte bancaire, via notre
        prestataire de paiement Stripe. Le solde du voyage est réglé directement auprès de l’agence, selon les
        modalités qu’elle communique. MaghrebVoyage n’encaisse jamais le solde du voyage.
      </p>

      <h2>5. Annulation</h2>
      <p>
        Chaque réservation confirmée donne lieu à un lien d’annulation personnel, envoyé par email, permettant
        d’annuler sans création de compte. Voir notre{" "}
        <a href="/legal/remboursements">politique de remboursement</a> pour le détail des modalités de remboursement.
      </p>

      <h2>6. Compte utilisateur</h2>
      <p>
        Les agences et administrateurs disposent d’un compte protégé par mot de passe. Les voyageurs peuvent réserver
        sans créer de compte ; leur seul justificatif est le code de confirmation et le lien d’annulation envoyés par
        email.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        MaghrebVoyage ne saurait être tenue responsable de l’exécution des prestations de voyage elles-mêmes
        (transport, hébergement, activités), qui relèvent de la seule responsabilité de l’agence organisatrice.
      </p>

      <h2>8. Droit applicable</h2>
      <p>Les présentes CGU sont soumises au droit français. Tout litige relève des tribunaux compétents.</p>
    </>
  );
}
