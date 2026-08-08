import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  Headphones,
  Lock,
  MapPin,
  Mountain,
  RefreshCcw,
  Users,
  XCircle,
} from "lucide-react";
import { TripGallery } from "@/components/trips/trip-gallery";
import { TripCard } from "@/components/trips/trip-card";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeatsGauge } from "@/components/ui/seats-gauge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  getAgencyById,
  getPublicTrips,
  getTripBySlug,
  getTripsByAgency,
} from "@/lib/mock-data";
import { formatDateRange, formatPrice, isSoldOut } from "@/lib/format";
import { routing } from "@/i18n/routing";
import { localeAlternates } from "@/i18n/alternates";

const GUARANTEE_ICONS = [RefreshCcw, Headphones, Clock];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getPublicTrips().map((t) => ({ locale, slug: t.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/trip/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) return {};
  const agency = getAgencyById(trip.agencyId);
  const description = `${trip.destination} · ${trip.durationDays} jours · à partir de ${formatPrice(
    trip.totalPrice,
    locale
  )}${agency ? ` — organisé par ${agency.name}` : ""}`;
  return {
    title: trip.title,
    description,
    alternates: {
      canonical: `/${locale}/trip/${trip.slug}`,
      languages: localeAlternates(`/trip/${trip.slug}`),
    },
    openGraph: {
      type: "website",
      title: `${trip.title} | MaghrebVoyage`,
      description,
      url: `/${locale}/trip/${trip.slug}`,
      images: trip.images[0] ? [trip.images[0]] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: trip.title,
      description,
      images: trip.images[0] ? [trip.images[0]] : undefined,
    },
  };
}

/**
 * schema.org Product + Offer — the shape Google's rich-result docs recommend
 * for a bookable, priced item (there's no first-class "group trip" type).
 * `availability` maps straight off the same seat-count the UI already shows,
 * so the two can never silently disagree.
 */
function tripJsonLd(
  trip: NonNullable<ReturnType<typeof getTripBySlug>>,
  agencyName: string | undefined,
  soldOut: boolean,
  locale: string
) {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pageUrl = `${url}/${locale}/trip/${trip.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: trip.title,
    description: trip.description,
    image: trip.images,
    url: pageUrl,
    brand: agencyName ? { "@type": "Organization", name: agencyName } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: trip.totalPrice,
      availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: pageUrl,
    },
  };
}

export default async function TripDetailPage({ params }: PageProps<"/[locale]/trip/[slug]">) {
  const { locale, slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) notFound();

  const t = await getTranslations({ locale, namespace: "TripDetail" });
  const tType = await getTranslations({ locale, namespace: "TripType" });

  const agency = getAgencyById(trip.agencyId);
  const soldOut = isSoldOut(trip.totalSpots, trip.bookedSpots);
  const balance = trip.totalPrice - trip.depositAmount;
  const otherTrips = getTripsByAgency(trip.agencyId).filter(
    (t) => t.id !== trip.id && (t.status === "PUBLISHED" || t.status === "FULL")
  );

  const physicalLevels = t.raw("physicalLevel") as string[];
  const guaranteeLabels = t.raw("guarantees") as string[];
  const guarantees = guaranteeLabels.map((label, i) => ({ icon: GUARANTEE_ICONS[i], label }));

  const facts = [
    { icon: Mountain, label: t("facts.type"), value: tType(trip.tripType) },
    { icon: Gauge, label: t("facts.level"), value: physicalLevels[trip.physicalLevel] },
    { icon: Users, label: t("facts.groupSize"), value: t("facts.groupSizeValue", { n: trip.totalSpots }) },
    { icon: MapPin, label: t("facts.meetingPoint"), value: trip.meetingPoint },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(tripJsonLd(trip, agency?.name, soldOut, locale)),
        }}
      />
      {/* Hero — the photograph carries the title, as in the reference sheet.
          Pulled under the transparent header the same way the landing is. */}
      <section className="relative -mt-16">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          <Image
            src={trip.images[0]}
            alt={trip.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="photo-scrim absolute inset-0" />
        </div>

        <Link
          href="/voyages"
          className="absolute top-20 left-4 inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.16_0.022_266)]/55 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-[oklch(0.16_0.022_266)]/75 sm:left-6 rtl:right-4 rtl:left-auto sm:rtl:right-6"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="trip" status={trip.status} />
            </div>
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl">
              {trip.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatDateRange(trip.startDate, trip.endDate, locale)} ·{" "}
                {t("days", { n: trip.durationDays })}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* At-a-glance facts */}
        <Card className="mb-10 grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="size-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </Card>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-bold">{t("about")}</h2>
              <p className="leading-relaxed text-muted-foreground">{trip.description}</p>
            </section>

            {trip.images.length > 1 && (
              <section className="space-y-3">
                <h2 className="font-heading text-xl font-bold">{t("gallery")}</h2>
                <TripGallery images={trip.images} title={trip.title} />
              </section>
            )}

            <div className="grid gap-8 sm:grid-cols-2">
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
                  <CheckCircle2 className="size-4 text-success" />
                  {t("included")}
                </h2>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {trip.inclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
                  <XCircle className="size-4 text-muted-foreground" />
                  {t("notIncluded")}
                </h2>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {trip.exclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-bold">{t("program")}</h2>
              <ol className="space-y-5 border-l pl-6 rtl:border-r rtl:border-l-0 rtl:pr-6 rtl:pl-0">
                {trip.program.map((step) => (
                  <li key={step.day} className="relative">
                    <span className="absolute -left-[1.8125rem] flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground rtl:-right-[1.8125rem] rtl:left-auto">
                      {step.day}
                    </span>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Booking card — CDC §J.4 wants the three amounts stated plainly */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="gap-0 p-6">
              <div>
                <p className="font-heading text-3xl font-extrabold tabular-nums">
                  {formatPrice(trip.totalPrice, locale)}
                </p>
                <p className="text-sm text-muted-foreground">{t("perPerson")}</p>
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t("depositNow")}</dt>
                  <dd className="font-semibold tabular-nums">{formatPrice(trip.depositAmount, locale)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t("balanceOnSite")}</dt>
                  <dd className="font-semibold tabular-nums">{formatPrice(balance, locale)}</dd>
                </div>
              </dl>

              <Separator className="my-5" />

              <SeatsGauge totalSpots={trip.totalSpots} bookedSpots={trip.bookedSpots} />

              <div className="mt-5">
                {soldOut ? (
                  <Button size="lg" className="w-full" disabled>
                    {t("soldOut")}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" asChild>
                    <Link href={`/booking/${trip.slug}`}>{t("bookNow")}</Link>
                  </Button>
                )}
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" />
                {t("securePayment")}
              </p>

              {soldOut && (
                <p className="mt-3 text-center text-xs text-muted-foreground">{t("soldOutNote")}</p>
              )}

              <Separator className="my-5" />

              <ul className="space-y-2.5">
                {guarantees.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Icon className="size-4 shrink-0 text-success" />
                    {label}
                  </li>
                ))}
              </ul>
            </Card>

            {agency && (
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-sm font-bold text-primary">
                    {agency.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{agency.name}</p>
                    <StatusBadge kind="agency" status={agency.verificationStatus} />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {agency.description}
                </p>
                <Link
                  href={`/agence/${agency.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {t("seeAllTrips")}
                </Link>
              </Card>
            )}
          </div>
        </div>

        {/* Same-agency trips only — cross-agency suggestions are forbidden here
            (CDC module E, "règle d'isolation"). */}
        {otherTrips.length > 0 && (
          <section className="mt-16 space-y-5">
            <h2 className="font-heading text-xl font-bold">
              {t("otherTripsFrom", { name: agency?.name ?? "" })}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherTrips.map((ot) => (
                <TripCard key={ot.id} trip={ot} agencyName={agency?.name} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
