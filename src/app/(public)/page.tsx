import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Headphones,
  MapPin,
  Search,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getAgencyById, getPublicTrips } from "@/lib/mock-data";
import { formatPrice } from "@/lib/format";

// Unsplash is asked for a pre-sized render: handing the optimizer the raw
// originals makes /_next/image fall over with a 500.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?w=2400&q=80&fit=crop";

/**
 * The three countries the CDC targets. `image` is null where we have no
 * honest photograph for that country yet — the tile then falls back to a
 * gradient rather than showing somewhere that isn't the Maghreb.
 */
const DESTINATIONS: { country: string; image: string | null; alt: string }[] = [
  {
    country: "Maroc",
    image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&h=675&q=80&fit=crop",
    alt: "Paysage désertique du sud marocain",
  },
  {
    country: "Algérie",
    image: null,
    alt: "Algérie",
  },
  {
    country: "Tunisie",
    image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&h=675&q=80&fit=crop",
    alt: "Plage méditerranéenne tunisienne",
  },
];

const STATS = [
  { value: "3", label: "Pays couverts" },
  { value: "100%", label: "Agences vérifiées" },
  { value: "Stripe", label: "Paiement sécurisé" },
  { value: "7j/7", label: "Support réactif" },
];

const HERO_TRUST = ["Agences vérifiées", "Paiement sécurisé", "Support 7j/7"];

const HOW_IT_WORKS = [
  {
    icon: Sparkles,
    title: "Décrivez",
    detail:
      "Dites-nous où vous voulez aller, quand, et avec quel budget. Cinq étapes rapides, deux minutes montre en main.",
  },
  {
    icon: Search,
    title: "L'IA trouve",
    detail:
      "Notre assistant croise votre demande avec les voyages réellement disponibles et vous propose 1 à 3 correspondances.",
  },
  {
    icon: CreditCard,
    title: "Réservez",
    detail:
      "Bloquez votre place avec un acompte sécurisé par carte. Le solde se règle directement avec l'agence, sur place.",
  },
];

const TRUST_BADGES = [
  {
    icon: BadgeCheck,
    title: "Agences vérifiées",
    detail:
      "Chaque agence soumet un registre de commerce examiné par notre équipe avant de pouvoir publier un seul voyage.",
  },
  {
    icon: Wallet,
    title: "Paiement sécurisé Stripe",
    detail:
      "Vous ne payez qu'un acompte en ligne, sur la page hébergée par Stripe. Aucune donnée de carte ne transite par nous.",
  },
  {
    icon: Headphones,
    title: "Support réactif",
    detail:
      "Une question, une annulation, un imprévu : notre équipe répond et fait le lien avec l'agence organisatrice.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Réserver notre trek dans l'Atlas depuis Paris a pris cinq minutes. L'agence nous a contactés le jour même.",
    name: "Yasmine K.",
    location: "France",
  },
  {
    quote:
      "Le formulaire IA nous a proposé exactement ce qu'on cherchait pour un voyage en famille à Djerba, budget compris.",
    name: "Omar T.",
    location: "Canada",
  },
  {
    quote:
      "Rassurant de voir que l'agence est vérifiée avant de payer l'acompte en ligne.",
    name: "Leïla B.",
    location: "Belgique",
  },
];

const FAQ = [
  {
    q: "Comment fonctionne l'acompte ?",
    a: "Vous payez uniquement un acompte en ligne au moment de la réservation (au minimum 10% du prix total). Le solde se règle directement auprès de l'agence, sur place ou avant le départ selon ses conditions.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Chaque email de confirmation contient un lien d'annulation personnel — aucun compte n'est nécessaire. Le remboursement de l'acompte est ensuite traité manuellement par notre équipe.",
  },
  {
    q: "Comment les agences sont-elles vérifiées ?",
    a: "Chaque agence soumet un dossier (registre de commerce, zones d'activité) examiné par notre équipe sous 48h avant de pouvoir publier le moindre voyage.",
  },
  {
    q: "Le formulaire IA crée-t-il une offre sur mesure ?",
    a: "Non. Il recommande des voyages déjà publiés par nos agences qui correspondent à vos critères — dates, budget, type de voyage. Vous réservez une place sur un départ existant.",
  },
  {
    q: "Que se passe-t-il si l'agence annule le voyage ?",
    a: "Vous êtes prévenu par email immédiatement et l'intégralité de votre acompte vous est remboursée dans les meilleurs délais.",
  },
  {
    q: "Dois-je créer un compte pour réserver ?",
    a: "Non. La réservation se fait avec votre nom, votre email et votre téléphone. Seules les agences ont besoin d'un compte sur la plateforme.",
  },
];

/** Cheapest published departure per country, for the "à partir de" line. */
function minPriceForCountry(country: string): number | null {
  const prices = getPublicTrips()
    .filter((trip) => {
      const agency = getAgencyById(trip.agencyId);
      return agency?.zones.includes(country);
    })
    .map((trip) => trip.totalPrice);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export default function LandingPage() {
  return (
    <div>
      {/* ── Dark block: hero → destinations → stats, one continuous surface ── */}
      <div className="-mt-16 bg-[oklch(0.16_0.022_266)] text-white">
        {/* Hero — full-bleed photograph under the transparent header */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0" aria-hidden>
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Two scrims: one anchors the copy column, one keeps the header
                and the seam into the next section from floating on bare sand. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.16_0.022_266)]/95 via-[oklch(0.16_0.022_266)]/70 to-[oklch(0.16_0.022_266)]/15" />
            <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.16_0.022_266)]/45 via-transparent to-[oklch(0.16_0.022_266)]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-20 lg:px-8">
            <div className="max-w-2xl">
              <Reveal immediate>
                <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
                  Découvrez le Maghreb
                  <br />
                  <span className="text-[oklch(0.72_0.19_290)]">Autrement</span>
                </h1>
              </Reveal>
              <Reveal immediate delay={0.08}>
                <p className="mt-5 max-w-lg text-lg text-white/75">
                  Des expériences authentiques, des agences locales et des voyages inoubliables.
                </p>
              </Reveal>

              {/* Search — plain GET form, hands the destination to the AI planner */}
              <Reveal immediate delay={0.16}>
                <form
                  action="/demande"
                  method="get"
                  className="mt-8 flex w-full max-w-xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-tinted-lg backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
                >
                  <label htmlFor="destination" className="sr-only">
                    Où souhaitez-vous aller ?
                  </label>
                  <div className="flex flex-1 items-center gap-2.5 px-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      id="destination"
                      name="destination"
                      type="text"
                      placeholder="Où souhaitez-vous aller ?"
                      className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button type="submit" size="lg" className="rounded-full px-6">
                    Lancer ma recherche IA
                  </Button>
                </form>
              </Reveal>

              {/* Country shortcuts */}
              <Reveal immediate delay={0.24}>
                <div className="mt-5 flex flex-wrap gap-2">
                  {DESTINATIONS.map(({ country }) => (
                    <Link
                      key={country}
                      href={`/voyages?destination=${encodeURIComponent(country)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/20"
                    >
                      <MapPin className="size-3.5" />
                      {country}
                    </Link>
                  ))}
                </div>
              </Reveal>

              {/* Trust chips */}
              <Reveal immediate delay={0.32}>
                <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
                  {HERO_TRUST.map((label) => (
                    <li key={label} className="flex items-center gap-2 text-sm text-white/80">
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-success">
                        <Check className="size-3 text-white" strokeWidth={3} />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Destinations populaires — photo tiles with the price floor */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-bold tracking-tight">Destinations populaires</h2>
            <Link
              href="/voyages"
              className="shrink-0 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Voir toutes
            </Link>
          </div>

          <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.map(({ country, image, alt }) => {
              const from = minPriceForCountry(country);
              return (
                <RevealItem key={country}>
                  <Link
                    href={`/voyages?destination=${encodeURIComponent(country)}`}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/45 to-[oklch(0.16_0.022_266)]"
                  >
                    {image && (
                      <Image
                        src={image}
                        alt={alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="photo-scrim absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="font-heading text-xl font-bold">{country}</p>
                      <p className="mt-0.5 text-sm text-white/75">
                        {from !== null ? `À partir de ${formatPrice(from)}` : "Bientôt disponible"}
                      </p>
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </section>

        {/* Stats band */}
        <section className="border-t border-white/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="font-heading text-3xl font-extrabold tracking-tight">{value}</p>
                <p className="mt-1 text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Comment ça marche ── */}
      <section id="comment-ca-marche" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Comment ça marche
            </h2>
            <p className="mt-3 text-muted-foreground">
              Trois étapes entre l&apos;envie de partir et la place réservée.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, detail }, i) => (
            <RevealItem key={title}>
              <div className="relative h-full rounded-2xl border bg-card p-7 shadow-tinted-sm">
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent">
                  <Icon className="size-5 text-primary" />
                </span>
                <p className="mt-5 text-xs font-semibold tracking-widest text-primary uppercase">
                  Étape {i + 1}
                </p>
                <h3 className="mt-1.5 font-heading text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── Pourquoi nous faire confiance ── */}
      <section className="border-y bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Réservez en confiance
            </h2>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
            {TRUST_BADGES.map(({ icon: Icon, title, detail }) => (
              <RevealItem key={title}>
                <div className="h-full rounded-2xl border bg-card p-7 shadow-tinted-sm">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-success-muted">
                    <Icon className="size-5 text-success" />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Témoignages (placeholders en V1, cf. CDC module A) ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ce qu&apos;en disent nos voyageurs
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, location }) => (
            <RevealItem key={name}>
              <figure className="h-full rounded-2xl border bg-card p-7 shadow-tinted-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-star text-star" />
                  ))}
                </div>
                <blockquote className="mt-4 text-[0.95rem] leading-relaxed text-balance">
                  “{quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm font-medium text-muted-foreground">
                  {name} · {location}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t bg-secondary/50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="mt-8">
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left font-heading text-base font-semibold hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 15%, white 0%, transparent 50%)",
              }}
              aria-hidden
            />
            <div className="relative space-y-5">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Prêt à préparer votre prochain voyage ?
              </h2>
              <p className="mx-auto max-w-md text-primary-foreground/80">
                Trouvez le voyage qui vous correspond en moins de deux minutes, ou parcourez la
                marketplace directement.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button size="lg" variant="secondary" className="rounded-lg px-6" asChild>
                  <Link href="/demande">
                    Trouver mon voyage
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-lg border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/voyages">Voir tous les voyages</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
