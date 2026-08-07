import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookingForm } from "@/components/bookings/booking-form";
import { getAgencyById, getTripBySlug } from "@/lib/mock-data";
import { isSoldOut } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/booking/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trip = getTripBySlug(slug);
  return {
    title: trip ? `Réserver — ${trip.title}` : "Réserver",
    robots: { index: false },
  };
}

export default async function BookingPage({ params }: PageProps<"/booking/[slug]">) {
  const { slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) notFound();

  // A trip that can't be booked has no booking form — send them back to the
  // public page, which explains why.
  if (trip.status !== "PUBLISHED" || isSoldOut(trip.totalSpots, trip.bookedSpots)) {
    redirect(`/trip/${trip.slug}`);
  }

  const agency = getAgencyById(trip.agencyId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <BookingForm trip={trip} agencyName={agency?.name} />
    </div>
  );
}
