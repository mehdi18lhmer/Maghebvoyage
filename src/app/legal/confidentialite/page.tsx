import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité | MaghrebVoyage" };

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : 1 août 2026</p>

      <h2>1. Données collectées</h2>
      <p>
        Nous collectons uniquement les données nécessaires au traitement de votre demande ou de votre réservation :
        nom, email, téléphone, pays, et les informations que vous saisissez dans le formulaire de recherche assistée
        par IA (destination, dates, budget, préférences de voyage).
      </p>

      <h2>2. Finalités</h2>
      <ul>
        <li>Traiter votre réservation et vous transmettre les emails de confirmation, d’annulation ou de rappel.</li>
        <li>Vous proposer, via notre assistant IA, des voyages déjà publiés correspondant à votre recherche.</li>
        <li>Permettre à l’agence organisatrice de vous contacter au sujet de votre voyage.</li>
        <li>Assurer le suivi administratif de la vérification des agences.</li>
      </ul>

      <h2>3. Base légale</h2>
      <p>
        Le traitement repose sur votre consentement explicite, recueilli par case à cocher à chaque étape où des
        données personnelles sont collectées, ainsi que sur l’exécution du contrat de réservation.
      </p>

      <h2>4. Partage des données</h2>
      <p>
        Vos données de réservation (nom, contact, nombre de places) sont partagées avec l’agence organisatrice du
        voyage réservé. Le paiement de l’acompte est traité par Stripe, qui applique sa propre politique de
        confidentialité pour les données bancaires.
      </p>

      <h2>5. Conservation</h2>
      <p>
        Les données sont conservées pendant la durée nécessaire au traitement de votre réservation et aux obligations
        légales de conservation, puis supprimées ou anonymisées.
      </p>

      <h2>6. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement et de portabilité de
        vos données. Pour exercer ces droits, contactez-nous via les coordonnées indiquées dans nos{" "}
        <a href="/legal/mentions">mentions légales</a>.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les échanges avec la plateforme sont chiffrés (HTTPS). Aucune donnée bancaire n’est stockée sur nos serveurs :
        le paiement est entièrement délégué à Stripe.
      </p>
    </>
  );
}
