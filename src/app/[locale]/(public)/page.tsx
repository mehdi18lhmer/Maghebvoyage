import Image from "next/image";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
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
import { Link } from "@/i18n/navigation";
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
import { localeAlternates } from "@/i18n/alternates";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return {
    title: t("hero.title1"),
    description: t("hero.subtitle"),
    alternates: { canonical: `/${locale}`, languages: localeAlternates("") },
  };
}

// Unsplash is asked for a pre-sized render: handing the optimizer the raw
// originals makes /_next/image fall over with a 500.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?w=2400&q=80&fit=crop";

/**
 * The three countries the CDC targets. `country` stays the canonical French
 * name — it's what agency.zones and the ?destination= filter actually match
 * against — only the *displayed* label is translated, via Home.destinations
 * .countries. `image` is null where we have no honest photograph for that
 * country yet — the tile then falls back to a gradient rather than showing
 * somewhere that isn't the Maghreb.
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

const STEP_ICONS = [Sparkles, Search, CreditCard];
const TRUST_ICONS = [BadgeCheck, Wallet, Headphones];

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
  const t = useTranslations("Home");

  const trust = t.raw("trust") as string[];
  const stats = t.raw("stats") as { value: string; label: string }[];
  const steps = t.raw("howItWorks.steps") as { title: string; detail: string }[];
  const badges = t.raw("trustSection.badges") as { title: string; detail: string }[];
  const testimonials = t.raw("testimonials.items") as {
    quote: string;
    name: string;
    location: string;
  }[];
  const faq = t.raw("faq.items") as { q: string; a: string }[];

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
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.16_0.022_266)]/95 via-[oklch(0.16_0.022_266)]/70 to-[oklch(0.16_0.022_266)]/15 rtl:bg-gradient-to-l" />
            <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.16_0.022_266)]/45 via-transparent to-[oklch(0.16_0.022_266)]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-20 lg:px-8">
            <div className="max-w-2xl">
              <Reveal immediate>
                <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
                  {t("hero.title1")}
                  <br />
                  <span className="text-[oklch(0.72_0.19_290)]">{t("hero.titleHighlight")}</span>
                </h1>
              </Reveal>
              <Reveal immediate delay={0.08}>
                <p className="mt-5 max-w-lg text-lg text-white/75">{t("hero.subtitle")}</p>
              </Reveal>

              {/* Search — plain GET form, hands the destination to the AI planner */}
              <Reveal immediate delay={0.16}>
                <form
                  action="/demande"
                  method="get"
                  className="mt-8 flex w-full max-w-xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-tinted-lg backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
                >
                  <label htmlFor="destination" className="sr-only">
                    {t("hero.searchLabel")}
                  </label>
                  <div className="flex flex-1 items-center gap-2.5 px-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      id="destination"
                      name="destination"
                      type="text"
                      placeholder={t("hero.searchPlaceholder")}
                      className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button type="submit" size="lg" className="rounded-full px-6">
                    {t("hero.searchButton")}
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
                      {t(`destinations.countries.${country}`)}
                    </Link>
                  ))}
                </div>
              </Reveal>

              {/* Trust chips */}
              <Reveal immediate delay={0.32}>
                <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
                  {trust.map((label) => (
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
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {t("destinations.heading")}
            </h2>
            <Link
              href="/voyages"
              className="shrink-0 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {t("destinations.seeAll")}
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
                      <p className="font-heading text-xl font-bold">
                        {t(`destinations.countries.${country}`)}
                      </p>
                      <p className="mt-0.5 text-sm text-white/75">
                        {from !== null
                          ? t("destinations.priceFrom", { price: formatPrice(from) })
                          : t("destinations.comingSoon")}
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
            {stats.map(({ value, label }) => (
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
              {t("howItWorks.heading")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("howItWorks.subtitle")}</p>
          </div>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map(({ title, detail }, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <RevealItem key={title}>
                <div className="relative h-full rounded-2xl border bg-card p-7 shadow-tinted-sm">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-accent">
                    <Icon className="size-5 text-primary" />
                  </span>
                  <p className="mt-5 text-xs font-semibold tracking-widest text-primary uppercase">
                    {t("howItWorks.step", { n: i + 1 })}
                  </p>
                  <h3 className="mt-1.5 font-heading text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* ── Pourquoi nous faire confiance ── */}
      <section className="border-y bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              {t("trustSection.heading")}
            </h2>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
            {badges.map(({ title, detail }, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <RevealItem key={title}>
                  <div className="h-full rounded-2xl border bg-card p-7 shadow-tinted-sm">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-success-muted">
                      <Icon className="size-5 text-success" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ── Témoignages (placeholders en V1, cf. CDC module A) ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t("testimonials.heading")}
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map(({ quote, name, location }) => (
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
              {t("faq.heading")}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="mt-8">
              {faq.map((item) => (
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
                {t("cta.heading")}
              </h2>
              <p className="mx-auto max-w-md text-primary-foreground/80">{t("cta.subtitle")}</p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button size="lg" variant="secondary" className="rounded-lg px-6" asChild>
                  <Link href="/demande">
                    {t("cta.findTrip")}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-lg border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/voyages">{t("cta.seeAll")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
