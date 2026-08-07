import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales | MaghrebVoyage" };

export default function MentionsPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : 1 août 2026</p>

      <h2>Éditeur du site</h2>
      <p>
        MaghrebVoyage SAS
        <br />
        Capital social : 10 000 €
        <br />
        Siège social : 12 rue de l’exemple, 75000 Paris, France
        <br />
        RCS Paris 000 000 000
        <br />
        Directeur de la publication : équipe MaghrebVoyage
      </p>

      <h2>Contact</h2>
      <p>
        Email : contact@maghrebvoyage.com
        <br />
        Support réservations : support@maghrebvoyage.com
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
        <br />
        Base de données hébergée par un fournisseur PostgreSQL managé (Neon ou Railway).
      </p>

      <h2>Paiement</h2>
      <p>
        Les paiements par carte bancaire sont traités par Stripe Payments Europe, Ltd., conformément à la
        réglementation applicable aux prestataires de services de paiement.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des éléments du site MaghrebVoyage (textes, structure, marque) est protégé par le droit de la
        propriété intellectuelle. Les photographies des voyages appartiennent aux agences qui les publient.
      </p>

      <h2>Agences partenaires</h2>
      <p>
        Chaque agence publiée sur MaghrebVoyage reste seule responsable des informations qu’elle publie sur ses
        voyages et de l’exécution des prestations vendues.
      </p>
    </>
  );
}
