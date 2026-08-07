import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { BadgeCheck, Mail, MapPin, Phone } from "lucide-react";
import { TripCard } from "@/components/trips/trip-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAgencyBySlug, getAllAgencies, getTripsByAgency } from "@/lib/mock-data";
import { tripTypeLabel } from "@/lib/format";

export function generateStaticParams() {
  return getAllAgencies().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/agence/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const agency = getAgencyBySlug(slug);
  if (!agency) return {};
  return { title: `${agency.name} | MaghrebVoyage` };
}

export default async function AgencyPublicPage({ params }: PageProps<"/agence/[slug]">) {
  const { slug } = await params;
  const agency = getAgencyBySlug(slug);
  if (!agency) notFound();

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
              <span className="flex items-center gap-1 text-success" title="Agence vérifiée">
                <BadgeCheck className="size-4" />
                <span className="sr-only">Agence vérifiée</span>
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
            {agency.tripTypes.map((t) => (
              <span key={t} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">
                {tripTypeLabel(t)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">
          Voyages publiés {publishedTrips.length > 0 && `(${publishedTrips.length})`}
        </h2>
        {publishedTrips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cette agence n’a aucun voyage disponible pour le moment.</p>
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
