import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, Mail, MapPin, Phone } from "lucide-react";
import { TripCard } from "@/components/trips/trip-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAgencyBySlug, getAllAgencies, getTripsByAgency } from "@/lib/mock-data";
import { routing } from "@/i18n/routing";
import { localeAlternates } from "@/i18n/alternates";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getAllAgencies().map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/agence/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const agency = getAgencyBySlug(slug);
  if (!agency) return {};
  const t = await getTranslations({ locale, namespace: "AgencyPage" });
  const description = agency.description || t("descriptionFallback", { name: agency.name });
  return {
    title: agency.name,
    description,
    alternates: {
      canonical: `/${locale}/agence/${agency.slug}`,
      languages: localeAlternates(`/agence/${agency.slug}`),
    },
    openGraph: {
      title: `${agency.name} | MaghrebVoyage`,
      description,
      url: `/${locale}/agence/${agency.slug}`,
      images: agency.logoUrl ? [agency.logoUrl] : undefined,
    },
  };
}

export default async function AgencyPublicPage({ params }: PageProps<"/[locale]/agence/[slug]">) {
  const { locale, slug } = await params;
  const agency = getAgencyBySlug(slug);
  if (!agency) notFound();

  const t = await getTranslations({ locale, namespace: "AgencyPage" });
  const tType = await getTranslations({ locale, namespace: "TripType" });

  const publishedTrips = getTripsByAgency(agency.id).filter(
    (t) => t.status === "PUBLISHED" || t.status === "FULL"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-center">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
          <Image src={agency.logoUrl} alt={agency.name} fill sizes="80px" className="object-cover" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">{agency.name}</h1>
            {agency.verificationStatus === "VERIFIED" && (
              <span className="flex items-center gap-1 text-success" title={t("verifiedAgency")}>
                <BadgeCheck className="size-4" />
                <span className="sr-only">{t("verifiedAgency")}</span>
              </span>
            )}
            <StatusBadge kind="agency" status={agency.verificationStatus} />
          </div>
          <p className="max-w-2xl text-muted-foreground">{agency.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {agency.zones.join(", ")}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-4" />
              {agency.contactEmail}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="size-4" />
              {agency.contactPhone}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {agency.tripTypes.map((type) => (
              <span key={type} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">
                {tType(type)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">
          {t("publishedTrips")} {publishedTrips.length > 0 && `(${publishedTrips.length})`}
        </h2>
        {publishedTrips.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTrips")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publishedTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
